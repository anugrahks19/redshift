import proj4 from 'proj4';

const SINUSOIDAL = '+proj=sinu +lon_0=0 +R=6371007.181 +units=m +no_defs';
const MODIS_TILE_METERS = Math.PI * 6371007.181 / 18;
const MODIS_PIXEL_METERS = MODIS_TILE_METERS / 1200;
const sourceCenters = {
  'yungay-atacama': [-69.9151, -24.0848],
  'death-valley': [-116.82, 36.23],
  'rio-tinto': [-6.56, 37.70],
  'iceland-askja': [-16.75, 65.03],
  'mauna-kea-apollo': [-155.47, 19.82],
  'mcmurdo-dry-valleys': [161.67, -77.55],
};

export function modisWindow(profile) {
  if (profile?.nativeWindow) return profile.nativeWindow;
  const tile = profile?.granuleId?.match(/\.h(\d{2})v(\d{2})\./);
  const center = sourceCenters[profile?.siteId];
  if (!tile || !center) return null;
  const tileLeft = (+tile[1] - 18) * MODIS_TILE_METERS;
  const tileTop = (9 - +tile[2]) * MODIS_TILE_METERS;
  const [x, y] = proj4('EPSG:4326', SINUSOIDAL, center);
  const col = Math.floor((x - tileLeft) / MODIS_PIXEL_METERS);
  const row = Math.floor((tileTop - y) / MODIS_PIXEL_METERS);
  const polar = profile.siteId === 'mcmurdo-dry-valleys';
  const x0 = Math.max(0, polar ? col - 16 : Math.min(1168, col - 16));
  const y0 = Math.max(0, polar ? row - 16 : Math.min(1168, row - 16));
  return {
    left: tileLeft + x0 * MODIS_PIXEL_METERS,
    top: tileTop - y0 * MODIS_PIXEL_METERS,
    pixelWidth: MODIS_PIXEL_METERS,
    pixelHeight: MODIS_PIXEL_METERS,
  };
}

export function createTemperatureSampler(dem, modis, diviner, mode = 'day') {
  const bounds = dem?.bounds?.projected;
  if (!bounds?.every(Number.isFinite)) return () => null;
  const [left, bottom, right, top] = bounds;
  const { gridWidth: width, gridHeight: height } = dem;
  const validCell = (row, col) => Number.isInteger(row) && Number.isInteger(col)
    && row >= 0 && row < height && col >= 0 && col < width;
  const xAt = (col) => left + (col + 0.5) * (right - left) / width;
  const yAt = (row) => top - (row + 0.5) * (top - bottom) / height;
  const read = (grid, w, h, row, col) => {
    if (grid?.length !== w * h || row < 0 || row >= h || col < 0 || col >= w) return null;
    const value = grid[row * w + col];
    return Number.isFinite(value) ? value : null;
  };

  if (dem.planet === 'Earth' && modis) {
    const utm = dem.crs.match(/EPSG:(32[67])(\d{2})/);
    const window = modisWindow(modis);
    if (!utm || !window) return () => null;
    const south = utm[1] === '327' ? '+south' : '';
    const project = proj4(`+proj=utm +zone=${+utm[2]} ${south} +datum=WGS84 +units=m +no_defs`, SINUSOIDAL);
    const grid = mode === 'night' ? modis.nightLstCelsiusGrid : modis.dayLstCelsiusGrid;
    return (row, col) => {
      if (!validCell(row, col)) return null;
      const [x, y] = project.forward([xAt(col), yAt(row)]);
      const value = read(grid, modis.gridWidth, modis.gridHeight,
        Math.floor((window.top - y) / window.pixelHeight), Math.floor((x - window.left) / window.pixelWidth));
      return value === null ? null : { celsius: value, kelvin: value + 273.15 };
    };
  }

  if (dem.id === 'moon-shackleton-lola' && diviner) {
    const size = diviner.cellSizeMeters;
    return (row, col) => {
      if (!validCell(row, col)) return null;
      // The stored PCP bin centers use the same X/east and Y/north convention as LOLA.
      const value = read(diviner.tbolKelvinGrid, diviner.gridWidth, diviner.gridHeight,
        diviner.gridHeight / 2 - Math.round(yAt(row) / size),
        diviner.gridWidth / 2 + Math.round(xAt(col) / size));
      return value === null ? null : { kelvin: value, celsius: value - 273.15 };
    };
  }
  return () => null;
}
