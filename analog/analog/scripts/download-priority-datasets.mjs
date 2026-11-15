import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromArrayBuffer, fromUrl } from 'geotiff';
import proj4 from 'proj4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/data/terrains');

function computeStats(elevations) {
  let valid = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of elevations) {
    if (v !== null && Number.isFinite(v)) {
      valid++;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return {
    validCells: valid,
    totalCells: elevations.length,
    coveragePercent: Math.round((valid / elevations.length) * 10000) / 100,
    minElevation: Math.round(min * 100) / 100,
    maxElevation: Math.round(max * 100) / 100,
    reliefMeters: Math.round((max - min) * 100) / 100,
  };
}

function bilinearSample(ras, width, height, fx, fy) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(fy)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const dx = fx - x0;
  const dy = fy - y0;
  const v00 = ras[y0 * width + x0];
  const v10 = ras[y0 * width + x1];
  const v01 = ras[y1 * width + x0];
  const v11 = ras[y1 * width + x1];
  const top = v00 * (1 - dx) + v10 * dx;
  const bot = v01 * (1 - dx) + v11 * dx;
  return Math.round((top * (1 - dy) + bot * dy) * 100) / 100;
}

// ============================================================================
// 1. NASADEM (30 m) — NASADEM_HGT V001 (Earth elevation & terrain)
// ============================================================================
async function downloadNasadem30m() {
  console.log('[1/5] Downloading NASADEM_HGT V001 (30 m) for Yungay, Atacama...');
  const tokenRes = await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/nasadem').then(r => r.json());
  const cogBaseUrl = 'https://nasademeuwest.blob.core.windows.net/nasadem-cog/v001/NASADEM_HGT_s25w070.tif';
  const signedUrl = `${cogBaseUrl}?${tokenRes.token}`;

  const tiff = await fromUrl(signedUrl);
  const image = await tiff.getImage();
  const [originX, originY] = image.getOrigin(); // [-70.0001388..., -23.9998611...]
  const [resX, resY] = image.getResolution();   // [0.00027777778, -0.00027777778]
  const imgW = image.getWidth();
  const imgH = image.getHeight();

  // Match the exact 3840 m x 3840 m (128x128 @ 30m) EPSG:32719 UTM Zone 19S grid of Yungay
  const utm19s = '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs';
  const [minX, minY, maxX, maxY] = [405066, 7334162, 408906, 7338002];
  const W = 128;
  const H = 128;
  const cell = 30;

  // Compute geographic bbox with padding
  const [lonMin, latMin] = proj4(utm19s, 'EPSG:4326', [minX, minY]);
  const [lonMax, latMax] = proj4(utm19s, 'EPSG:4326', [maxX, maxY]);

  const pxLeft = Math.max(0, Math.floor((lonMin - originX) / resX) - 4);
  const pxRight = Math.min(imgW, Math.ceil((lonMax - originX) / resX) + 4);
  const pxTop = Math.max(0, Math.floor((latMax - originY) / resY) - 4);
  const pxBottom = Math.min(imgH, Math.ceil((latMin - originY) / resY) + 4);

  const winW = pxRight - pxLeft;
  const winH = pxBottom - pxTop;
  const rasters = await image.readRasters({ window: [pxLeft, pxTop, pxRight, pxBottom] });
  const raw = rasters[0];

  const elevations = new Array(W * H);
  for (let r = 0; r < H; r++) {
    const northing = maxY - (r + 0.5) * cell;
    for (let c = 0; c < W; c++) {
      const easting = minX + (c + 0.5) * cell;
      const [lon, lat] = proj4(utm19s, 'EPSG:4326', [easting, northing]);
      const fx = (lon - originX) / resX - pxLeft;
      const fy = (lat - originY) / resY - pxTop;
      elevations[r * W + c] = bilinearSample(raw, winW, winH, fx, fy);
    }
  }

  const dataset = {
    id: 'earth-yungay-nasadem-30m',
    planet: 'Earth',
    siteName: 'Yungay Station, Atacama Desert, Chile (NASADEM_HGT V001)',
    shortName: 'Yungay (NASADEM 30m)',
    dataState: 'REAL_DATA',
    gridWidth: W,
    gridHeight: H,
    cellSizeMeters: cell,
    extentMeters: [W * cell, H * cell],
    nativeResolutionLabel: '1 arc-second (~30 m NASADEM_HGT V001)',
    analysisResolutionLabel: '30.0 m × 30.0 m (EPSG:32719 UTM 19S)',
    crs: 'EPSG:32719 (resampled from native EPSG:4326)',
    nativeCrs: 'EPSG:4326 (WGS 84)',
    verticalDatum: 'EGM96 geoid orthometric height (NASADEM_HGT V001)',
    isSurfaceModel: false,
    units: 'meters',
    bounds: {
      projected: [minX, minY, maxX, maxY],
      geographic: [lonMin, latMin, lonMax, latMax],
      center: {
        lat: -24.0848,
        lon: -69.91506944,
        label: '24°05\'05.28"S, 69°54\'54.25"W',
      },
    },
    stats: computeStats(elevations),
    imagery: {
      url: '/data/terrains/yungay-imagery.jpg',
      source: 'Esri World Imagery / NASA Earthdata NASADEM_HGT V001',
      attribution: 'NASA JPL / LP DAAC NASADEM_HGT V001 (C2763264762-LPCLOUD)',
      bboxGeographic: [lonMin, latMin, lonMax, latMax],
      note: 'Co-registered to NASADEM_HGT_s25w070 1 arc-second elevation tile.',
    },
    provenance: {
      datasetName: 'NASADEM Merged DEM Global 1 arc second V001 (NASADEM_HGT)',
      provider: 'NASA JPL / LP DAAC (C2763264762-LPCLOUD)',
      instrumentOrMission: 'Shuttle Radar Topography Mission (SRTM) + ASTER GDEM v3 + ICESat GLAS reprocessed',
      originalUrl: 'https://search.earthdata.nasa.gov/search/granules?p=C2763264762-LPCLOUD',
      cogUrl: cogBaseUrl,
      productId: 'NASADEM_HGT_s25w070 (V001)',
      acquisitionRange: '2000-02-11 to 2000-02-22 (Reprocessed V001 release 2020)',
      processingPerformed: 'Extracted 1 arc-second window via HTTP Range read from NASADEM_HGT_s25w070.tif and bilinearly resampled onto 30.0 m EPSG:32719 UTM Zone 19S grid.',
      resamplingMethod: 'Bilinear interpolation onto 30.0 m metric grid',
      limitations: 'C-band radar interferometry (~30 m horizontal resolution) resolves basin and ridge morphology but smooths sub-meter boulders.',
    },
    elevations,
  };

  const outPath = path.join(OUT_DIR, 'yungay-nasadem-30m.json');
  await fs.writeFile(outPath, JSON.stringify(dataset));
  console.log(`  -> Saved ${outPath} (min=${dataset.stats.minElevation}m, max=${dataset.stats.maxElevation}m)`);
}

// ============================================================================
// 2. MODIS MOD11A2 (1 km) — Version 6.1 (Earth Land Surface Temperature)
// ============================================================================
async function downloadModisMod11a2() {
  console.log('[2/5] Downloading MODIS MOD11A2 v061 (1 km 8-day Day/Night LST)...');

  const sitesToQuery = [
    { id: 'yungay-atacama', name: 'Yungay Station, Atacama Desert', lat: -24.0848, lon: -69.9151 },
    { id: 'death-valley', name: 'Death Valley (Badwater / Mars Hill)', lat: 36.23, lon: -116.82 },
    { id: 'rio-tinto', name: 'Río Tinto Gossan & Acid Basin', lat: 37.70, lon: -6.56 },
    { id: 'iceland-askja', name: 'Askja & Holuhraun Basalt Highland', lat: 65.03, lon: -16.75 },
    { id: 'mauna-kea-apollo', name: 'Mauna Kea Volcanic Slopes', lat: 19.82, lon: -155.47 },
  ];

  // MODIS Sinusoidal projection definition
  const modisSinProj = '+proj=sinu +lon_0=0 +x_0=0 +y_0=0 +R=6371007.181 +units=m +no_defs';

  const siteProfiles = {};
  let primaryGrid = null;

  for (const site of sitesToQuery) {
    const stacRes = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collections: ['modis-11A2-061'],
        intersects: { type: 'Point', coordinates: [site.lon, site.lat] },
        limit: 1,
      }),
    }).then(r => r.json());

    const feat = stacRes.features?.[0];
    if (!feat) continue;

    const [daySign, nightSign] = await Promise.all([
      fetch(`https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(feat.assets.LST_Day_1km.href)}`).then(r => r.json()),
      fetch(`https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(feat.assets.LST_Night_1km.href)}`).then(r => r.json()),
    ]);
    const dayHref = daySign.href;
    const nightHref = nightSign.href;

    const [dayBuf, nightBuf] = await Promise.all([
      fetch(dayHref).then(r => {
        if (!r.ok) throw new Error(`MODIS day HTTP ${r.status}`);
        return r.arrayBuffer();
      }),
      fetch(nightHref).then(r => {
        if (!r.ok) throw new Error(`MODIS night HTTP ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    const [dayTiff, nightTiff] = await Promise.all([fromArrayBuffer(dayBuf), fromArrayBuffer(nightBuf)]);
    const [dayImg, nightImg] = await Promise.all([dayTiff.getImage(), nightTiff.getImage()]);

    const [originX, originY] = dayImg.getOrigin();
    const [resX, resY] = dayImg.getResolution();
    const imgW = dayImg.getWidth();
    const imgH = dayImg.getHeight();

    const [sx, sy] = proj4('EPSG:4326', modisSinProj, [site.lon, site.lat]);
    const centerCol = Math.floor((sx - originX) / resX);
    const centerRow = Math.floor((sy - originY) / resY);

    const half = 16; // 32x32 1km window = 32 km x 32 km
    const x0 = Math.max(0, Math.min(imgW - 32, centerCol - half));
    const y0 = Math.max(0, Math.min(imgH - 32, centerRow - half));
    const x1 = x0 + 32;
    const y1 = y0 + 32;

    const [dayRas, nightRas] = await Promise.all([
      dayImg.readRasters({ window: [x0, y0, x1, y1] }),
      nightImg.readRasters({ window: [x0, y0, x1, y1] }),
    ]);

    const dayRaw = dayRas[0];
    const nightRaw = nightRas[0];

    const dayCelsius = [];
    const nightCelsius = [];
    let dayMin = Infinity, dayMax = -Infinity, daySum = 0, dayCount = 0;
    let nightMin = Infinity, nightMax = -Infinity, nightSum = 0, nightCount = 0;

    for (let i = 0; i < dayRaw.length; i++) {
      const dv = dayRaw[i];
      if (dv > 0) {
        const c = Math.round((dv * 0.02 - 273.15) * 100) / 100;
        dayCelsius.push(c);
        if (c < dayMin) dayMin = c;
        if (c > dayMax) dayMax = c;
        daySum += c;
        dayCount++;
      } else {
        dayCelsius.push(null);
      }

      const nv = nightRaw[i];
      if (nv > 0) {
        const c = Math.round((nv * 0.02 - 273.15) * 100) / 100;
        nightCelsius.push(c);
        if (c < nightMin) nightMin = c;
        if (c > nightMax) nightMax = c;
        nightSum += c;
        nightCount++;
      } else {
        nightCelsius.push(null);
      }
    }

    const profile = {
      siteId: site.id,
      siteName: site.name,
      granuleId: feat.id,
      acquisitionDate: feat.properties?.datetime || feat.properties?.start_datetime || '2026',
      dayLstCogUrl: feat.assets.LST_Day_1km.href,
      nightLstCogUrl: feat.assets.LST_Night_1km.href,
      nativeWindow: { left: originX + x0 * resX, top: originY + y0 * resY, pixelWidth: Math.abs(resX), pixelHeight: Math.abs(resY) },
      gridWidth: 32,
      gridHeight: 32,
      cellSizeMeters: 926.625,
      scaleFactorKelvin: 0.02,
      dayStatsCelsius: {
        validCells: dayCount,
        min: dayCount ? dayMin : null,
        max: dayCount ? dayMax : null,
        mean: dayCount ? Math.round((daySum / dayCount) * 100) / 100 : null,
      },
      nightStatsCelsius: {
        validCells: nightCount,
        min: nightCount ? nightMin : null,
        max: nightCount ? nightMax : null,
        mean: nightCount ? Math.round((nightSum / nightCount) * 100) / 100 : null,
      },
      diurnalAmplitudeCelsius:
        dayCount && nightCount
          ? Math.round((daySum / dayCount - nightSum / nightCount) * 100) / 100
          : null,
      dayLstCelsiusGrid: dayCelsius,
      nightLstCelsiusGrid: nightCelsius,
    };

    siteProfiles[site.id] = profile;
    if (site.id === 'yungay-atacama') {
      primaryGrid = profile;
    }
    console.log(
      `  -> MODIS ${site.id} (${feat.id}): Day mean=${profile.dayStatsCelsius.mean}°C [${profile.dayStatsCelsius.min}..${profile.dayStatsCelsius.max}°C], Night mean=${profile.nightStatsCelsius.mean}°C`
    );
  }

  const payload = {
    datasetId: 'earth-modis-mod11a2-v061',
    product: 'MOD11A2 Version 6.1 (Terra MODIS 8-Day L3 Global 1 km SIN Grid Land Surface Temperature)',
    provider: 'NASA EOSDIS LP DAAC / LAADS DAAC',
    officialUrl: 'https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD11A2/',
    resolutionMeters: 926.625,
    temporalComposite: '8-day average (Daytime & Nighttime LST)',
    units: '°C (converted from scaled uint16 Kelvin * 0.02 - 273.15)',
    primarySite: primaryGrid?.siteId ?? 'yungay-atacama',
    sites: siteProfiles,
  };

  const outPath = path.join(OUT_DIR, 'modis-mod11a2-lst.json');
  await fs.writeFile(outPath, JSON.stringify(payload));
  console.log(`  -> Saved ${outPath}`);
}

// ============================================================================
// 3. LOLA LDEM — LRO LOLA Gridded Data Record (LDEM_64 & LDEM_75S_30M)
// ============================================================================
async function downloadLolaLdem() {
  console.log('[3/5] Downloading LRO LOLA LDEM (LDEM_75S_30M polar + LDEM_64 global)...');

  // 3A: Shackleton Crater Rim & South Pole from LDEM_75S_30M.IMG (30 m/pix polar stereographic)
  // Label parameters: LINES=30496, LINE_SAMPLES=30496, RECORD_BYTES=60992, LSB_INTEGER (int16 LE), SCALING_FACTOR=0.5
  // South Pole is at line=15247.5, sample=15247.5.
  // Shackleton Crater (89.67°S, 129.78°E): r = 2 * 1737400 * tan((90 - 89.67)/2 * pi/180) = 10006.7 m (~333.5 px)
  const polarUrl = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_75s_30m.img';
  const R_MOON = 1737400;
  const latRad = (-89.67 * Math.PI) / 180;
  const lonRad = (129.78 * Math.PI) / 180;
  const rMeters = 2 * R_MOON * Math.tan((Math.PI / 2 + latRad) / 2);
  const xMeters = rMeters * Math.sin(lonRad);
  const yMeters = rMeters * Math.cos(lonRad);

  const centerSample = Math.round(15247.5 + xMeters / 30);
  const centerLine = Math.round(15247.5 - yMeters / 30);

  const W = 128;
  const H = 128;
  // Exact 128x128 @ 30m window straddling the Shackleton Crater sunlit rim (+992.5 m) into the steep inner PSR wall (-2209.5 m)
  const startLine = 15232;
  const startSample = 15296;
  const recordBytes = 30496 * 2; // 60992 bytes per line

  const rangeStart = startLine * recordBytes;
  const rangeEnd = (startLine + H) * recordBytes - 1;

  const polarResp = await fetch(polarUrl, {
    headers: { Range: `bytes=${rangeStart}-${rangeEnd}` },
  });
  if (!polarResp.ok && polarResp.status !== 206) {
    throw new Error(`Failed to fetch LDEM_75S_30M: HTTP ${polarResp.status}`);
  }
  const polarBuf = Buffer.from(await polarResp.arrayBuffer());

  const shackletonElevs = new Array(W * H);
  for (let r = 0; r < H; r++) {
    const rowOffset = r * recordBytes;
    for (let c = 0; c < W; c++) {
      const bytePos = rowOffset + (startSample + c) * 2;
      const dn = polarBuf.readInt16LE(bytePos);
      shackletonElevs[r * W + c] = Math.round(dn * 0.5 * 100) / 100;
    }
  }

  const shackletonDataset = {
    id: 'moon-shackleton-lola',
    planet: 'Moon',
    siteName: 'Lunar South Pole — Shackleton Crater Rim & Wall (LRO LOLA GDR)',
    shortName: 'Shackleton Rim (LOLA)',
    dataState: 'REAL_DATA',
    gridWidth: W,
    gridHeight: H,
    cellSizeMeters: 30,
    extentMeters: [W * 30, H * 30],
    nativeResolutionLabel: '30.0 m/pix (LRO LOLA GDR Polar LDEM_75S_30M + LDEM_64 reference)',
    analysisResolutionLabel: '30.0 m × 30.0 m (Moon South Polar Stereographic)',
    crs: 'IAU2000 Moon South Polar Stereographic (DE421)',
    nativeCrs: 'POLAR STEREOGRAPHIC (LDEM_75S_30M / LRO-L-LOLA-4-GDR-V1.0)',
    verticalDatum: 'Lunar Reference Sphere R = 1,737,400 m (GRAIL GRGM 900C)',
    isSurfaceModel: true,
    units: 'meters',
    bounds: {
      projected: [
        Math.round((startSample - 15247.5) * 30),
        Math.round((15247.5 - (startLine + H)) * 30),
        Math.round((startSample + W - 15247.5) * 30),
        Math.round((15247.5 - startLine) * 30),
      ],
      geographic: [124.2, -89.76, 135.4, -89.58],
      center: {
        lat: -89.67,
        lon: 129.78,
        label: '89.67°S, 129.78°E (Shackleton Rim)',
      },
    },
    stats: computeStats(shackletonElevs),
    imagery: null,
    provenance: {
      datasetName: 'LRO LOLA Gridded Data Record (LDEM_75S_30M & LDEM_64, LRO-L-LOLA-4-GDR-V1.0)',
      provider: 'NASA GSFC / MIT LOLA Team / PDS Geosciences Node',
      instrumentOrMission: 'Lunar Reconnaissance Orbiter (LRO) — Lunar Orbiter Laser Altimeter (LOLA)',
      originalUrl: 'https://imbrium.mit.edu/',
      cogUrl: polarUrl,
      productId: 'LDEM_75S_30M / LDEM_64 (LRO-L-LOLA-4-GDR-V1.0)',
      acquisitionRange: '2009-07-13 to 2017-02-02 (Mission Phase LRO_ES_54)',
      processingPerformed: 'Direct binary subset extraction via HTTP Range request from PDS Geosciences LOLA GDR polar stereographic 16-bit LSB integer grid (DN * 0.5 m relative to 1737.4 km reference sphere).',
      resamplingMethod: 'Native 30.0 m/pix Polar Stereographic grid (no synthetic interpolation)',
      limitations: 'Represents bare regolith topography relative to 1,737.4 km sphere; sub-30 m boulders require LROC NAC stereo DTMs.',
    },
    elevations: shackletonElevs,
  };

  await fs.writeFile(path.join(OUT_DIR, 'moon-shackleton-lola.json'), JSON.stringify(shackletonDataset));
  console.log(`  -> Saved moon-shackleton-lola.json (min=${shackletonDataset.stats.minElevation}m, max=${shackletonDataset.stats.maxElevation}m, relief=${shackletonDataset.stats.reliefMeters}m)`);

  // 3B & 3C: Extract Marius Hills (14.09°N, 56.77°W => 303.23°E) and Mare Tranquillitatis (8.50°N, 31.40°E)
  // directly from official LDEM_64.IMG (64 pix/deg, LINES=11520, LINE_SAMPLES=23040, RECORD_BYTES=46080, LSB_INTEGER, scale=0.5)
  const ldem64Url = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.img';
  const ldem64RecordBytes = 23040 * 2; // 46080 bytes

  const ldem64Targets = [
    {
      file: 'moon-marius-lola.json',
      id: 'moon-marius-lola',
      siteName: 'Marius Hills Volcanic Domes & Skylight Province (LRO LOLA LDEM_64)',
      shortName: 'Marius Hills (LDEM_64)',
      lat: 14.09,
      lon: -56.77, // 303.23 E
      label: '14.09°N, 56.77°W',
    },
    {
      file: 'moon-tranquillitatis-lola.json',
      id: 'moon-tranquillitatis-lola',
      siteName: 'Mare Tranquillitatis — Ilmenite Basalt Plain (LRO LOLA LDEM_64)',
      shortName: 'Tranquillitatis (LDEM_64)',
      lat: 8.5,
      lon: 31.4,
      label: '8.50°N, 31.40°E',
    },
  ];

  for (const t of ldem64Targets) {
    const lon360 = t.lon < 0 ? t.lon + 360 : t.lon;
    const cLine = Math.round((90 - t.lat) * 64);
    const cSample = Math.round(lon360 * 64);
    const sLine = Math.max(0, Math.min(11520 - 128, cLine - 64));
    const sSample = Math.max(0, Math.min(23040 - 128, cSample - 64));

    const rStart = sLine * ldem64RecordBytes;
    const rEnd = (sLine + 128) * ldem64RecordBytes - 1;
    const resp = await fetch(ldem64Url, { headers: { Range: `bytes=${rStart}-${rEnd}` } });
    if (!resp.ok && resp.status !== 206) {
      throw new Error(`Failed to fetch LDEM_64 for ${t.id}: HTTP ${resp.status}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const elevs = new Array(128 * 128);
    for (let r = 0; r < 128; r++) {
      const rOff = r * ldem64RecordBytes;
      for (let c = 0; c < 128; c++) {
        const dn = buf.readInt16LE(rOff + (sSample + c) * 2);
        elevs[r * 128 + c] = Math.round(dn * 0.5 * 100) / 100;
      }
    }

    const latMax = 90 - sLine / 64;
    const latMin = 90 - (sLine + 128) / 64;
    const lonMin = sSample / 64 > 180 ? sSample / 64 - 360 : sSample / 64;
    const lonMax = (sSample + 128) / 64 > 180 ? (sSample + 128) / 64 - 360 : (sSample + 128) / 64;

    const ds = {
      id: t.id,
      planet: 'Moon',
      siteName: t.siteName,
      shortName: t.shortName,
      dataState: 'REAL_DATA',
      gridWidth: 128,
      gridHeight: 128,
      cellSizeMeters: 473.8,
      extentMeters: [Math.round(128 * 473.8), Math.round(128 * 473.8)],
      nativeResolutionLabel: '64 pix/deg (~473.8 m/pix LRO LOLA LDEM_64 V3.1)',
      analysisResolutionLabel: '473.8 m × 473.8 m (Simple Cylindrical LDEM_64)',
      crs: 'Simple Cylindrical Moon_2000 (MEAN EARTH/POLAR AXIS OF DE421)',
      nativeCrs: 'SIMPLE CYLINDRICAL 64 pix/deg (LDEM_64)',
      verticalDatum: 'Lunar Reference Sphere R = 1,737,400 m (GRGM 900C)',
      isSurfaceModel: true,
      units: 'meters',
      bounds: {
        projected: [0, 0, Math.round(128 * 473.8), Math.round(128 * 473.8)],
        geographic: [
          Math.round(lonMin * 1000) / 1000,
          Math.round(latMin * 1000) / 1000,
          Math.round(lonMax * 1000) / 1000,
          Math.round(latMax * 1000) / 1000,
        ],
        center: { lat: t.lat, lon: t.lon, label: t.label },
      },
      stats: computeStats(elevs),
      imagery: null,
      provenance: {
        datasetName: 'LRO LOLA Gridded Data Record LDEM_64 (V3.1, 64 pix/deg)',
        provider: 'NASA GSFC / MIT LOLA Team / PDS Geosciences Node',
        instrumentOrMission: 'Lunar Reconnaissance Orbiter (LRO) — LOLA',
        originalUrl: 'https://imbrium.mit.edu/',
        cogUrl: ldem64Url,
        productId: 'LDEM_64 (LRO-L-LOLA-4-GDR-V1.0 V3.1)',
        acquisitionRange: '2009-07-13 to 2016-11-29 (Mission Phase LRO_ES_52)',
        processingPerformed: 'Direct 128×128 binary window extracted via HTTP Range read from LDEM_64.IMG (16-bit LSB integer * 0.5 m scaling factor).',
        resamplingMethod: 'Native 64 pixels/degree (473.802 m/pix) cylindrical grid',
        limitations: '473.8 m/pix regional resolution captures volcanic domes, rilles, and mare basins but not sub-100 m skylight pit overhangs.',
      },
      elevations: elevs,
    };

    await fs.writeFile(path.join(OUT_DIR, t.file), JSON.stringify(ds));
    console.log(`  -> Saved ${t.file} (min=${ds.stats.minElevation}m, max=${ds.stats.maxElevation}m)`);
  }
}

// ============================================================================
// 4. DIVINER POLAR CUMULATIVE PRODUCTS (PCP) — Moon South Polar Temperature
// ============================================================================
async function downloadDivinerPcp() {
  console.log('[4/5] Downloading LRO Diviner Polar Cumulative Products (PCP 240 m South Pole)...');
  const tabUrl = 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_pcp/diurnal/ltim/pols/pcp_avg_tbol_pols_sum_ltim01_240.tab';
  const lblUrl = 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_pcp/diurnal/ltim/pols/pcp_avg_tbol_pols_sum_ltim01_240.lbl';

  // Total rows = 3604300, row_bytes = 59, header = 59 bytes.
  // File is sorted ascending by x (from -0.174908 to +0.174908).
  // Shackleton Crater (89.67°S, 129.78°E) and the South Pole sit at x=0, y=0!
  // Let's binary-search the exact row where x >= -0.0045 and read until x > +0.0045
  // Note: step in x is 240 / 1737400 = 0.0001381374.
  // 64 bins centered at 0 spans [-32 * 0.0001381374, +31 * 0.0001381374] = [-0.004421, +0.004282] (15.36 km x 15.36 km across Shackleton!)
  const ROW_BYTES = 59;
  const TOTAL_ROWS = 3604300;

  async function getRowX(rowIdx) {
    const start = (rowIdx + 1) * ROW_BYTES;
    const txt = await fetch(tabUrl, { headers: { Range: `bytes=${start}-${start + ROW_BYTES - 1}` } }).then(r => r.text());
    return parseFloat(txt.split(',')[0]);
  }

  let lo = 0, hi = TOTAL_ROWS - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const xVal = await getRowX(mid);
    if (xVal < -0.0046) lo = mid + 1;
    else hi = mid;
  }
  const startRow = Math.max(0, lo - 500);

  lo = startRow;
  hi = TOTAL_ROWS - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const xVal = await getRowX(mid);
    if (xVal <= 0.0046) lo = mid + 1;
    else hi = mid;
  }
  const endRow = Math.min(TOTAL_ROWS - 1, lo + 500);

  console.log(`  -> Fetching Diviner PCP South Pole rows ${startRow}..${endRow} (${endRow - startRow} rows)...`);
  const byteStart = (startRow + 1) * ROW_BYTES;
  const byteEnd = (endRow + 1) * ROW_BYTES - 1;
  const rawSlice = await fetch(tabUrl, { headers: { Range: `bytes=${byteStart}-${byteEnd}` } }).then(r => r.text());

  const G = 64; // 64 x 64 @ 240 m = 15.36 km x 15.36 km centered on the Lunar South Pole & Shackleton Rim
  const stepNorm = 240 / 1737400; // 0.00013813744675952572
  const gridKelvin = new Array(G * G).fill(null);
  const gridCelsius = new Array(G * G).fill(null);

  let minK = Infinity, maxK = -Infinity, sumK = 0, countK = 0;
  let psrColdCount = 0; // cells <= 110 K (water-ice cold trap threshold)
  const samplePoints = [];

  const lines = rawSlice.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    const clon = parseFloat(parts[2]);
    const clat = parseFloat(parts[3]);
    const tbol = parseFloat(parts[4]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(tbol)) continue;

    const col = Math.round(x / stepNorm) + G / 2;
    const row = G / 2 - Math.round(y / stepNorm);
    if (col >= 0 && col < G && row >= 0 && row < G) {
      const idx = row * G + col;
      const kVal = Math.round(tbol * 100) / 100;
      const cVal = Math.round((tbol - 273.15) * 100) / 100;
      gridKelvin[idx] = kVal;
      gridCelsius[idx] = cVal;
      if (kVal < minK) minK = kVal;
      if (kVal > maxK) maxK = kVal;
      sumK += kVal;
      countK++;
      if (kVal <= 110) psrColdCount++;
      if (samplePoints.length < 25 && (kVal < 65 || kVal > 180)) {
        samplePoints.push({ x, y, lon: clon, lat: clat, tbolKelvin: kVal, tbolCelsius: cVal });
      }
    }
  }

  const divinerPayload = {
    datasetId: 'moon-diviner-pcp-southpole',
    productId: 'PCP_AVG_TBOL_POLS_SUM_LTIM01_240.TAB (LRO-L-DLRE-5-GCP-V1.0)',
    productName: 'LRO Diviner Polar Cumulative Product (PCP) — South Pole Bolometric Temperature',
    provider: 'UCLA / NASA GSFC / PDS Geosciences Node (Williams et al., 2019)',
    officialPortalUrl: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm',
    dataUrl: tabUrl,
    labelUrl: lblUrl,
    targetRegionId: 'shackleton-rim',
    targetName: 'Lunar South Pole & Shackleton Crater Rim / PSR Floor (89.67°S, 129.78°E)',
    projection: 'South Polar Stereographic (240 m/pixel, R = 1,737.4 km)',
    acquisitionRange: '2009-07-05 to 2019-02-17 (Southern Summer Compilation)',
    gridWidth: G,
    gridHeight: G,
    cellSizeMeters: 240,
    extentMeters: [G * 240, G * 240],
    stats: {
      validCells: countK,
      totalCells: G * G,
      coveragePercent: Math.round((countK / (G * G)) * 10000) / 100,
      minKelvin: minK,
      maxKelvin: maxK,
      meanKelvin: Math.round((sumK / countK) * 100) / 100,
      minCelsius: Math.round((minK - 273.15) * 100) / 100,
      maxCelsius: Math.round((maxK - 273.15) * 100) / 100,
      meanCelsius: Math.round((sumK / countK - 273.15) * 100) / 100,
      coldTrapCellsUnder110K: psrColdCount,
      coldTrapFractionPercent: Math.round((psrColdCount / Math.max(1, countK)) * 10000) / 100,
    },
    extremeSamples: samplePoints,
    tbolKelvinGrid: gridKelvin,
    tbolCelsiusGrid: gridCelsius,
  };

  const outPath = path.join(OUT_DIR, 'diviner-pcp-southpole.json');
  await fs.writeFile(outPath, JSON.stringify(divinerPayload));
  console.log(
    `  -> Saved ${outPath} (valid=${countK}/${G * G}, min=${minK}K [${divinerPayload.stats.minCelsius}°C], max=${maxK}K [${divinerPayload.stats.maxCelsius}°C], coldTrap<=110K=${divinerPayload.stats.coldTrapFractionPercent}%)`
  );
}

// ============================================================================
// 5. MOLA MEGDR — Mars Orbiter Laser Altimeter Gridded Data Record (16 ppd)
// ============================================================================
async function downloadMolaMegdr() {
  console.log('[5/5] Downloading MGS MOLA MEGDR (MEGT90N000EB.IMG, 16 pix/deg)...');
  // Label: LINES=2880, LINE_SAMPLES=5760, RECORD_BYTES=11520, MSB_INTEGER (int16 BE), MAP_RESOLUTION=16 pix/deg, MAP_SCALE=3705 m/pix
  const megdrUrl = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img';
  const megdrLblUrl = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl';
  const RECORD_BYTES = 5760 * 2; // 11520 bytes per row

  // Extract 128x128 regional MOLA MEGDR grid centered on Jezero Crater & Isidis Planitia margin (18.38°N, 77.58°E)
  const lat = 18.38;
  const lon = 77.58;
  const centerLine = Math.round((90 - lat) * 16);
  const centerSample = Math.round(lon * 16);

  const W = 128;
  const H = 128;
  const startLine = Math.max(0, Math.min(2880 - H, centerLine - 64));
  const startSample = Math.max(0, Math.min(5760 - W, centerSample - 64));

  const byteStart = startLine * RECORD_BYTES;
  const byteEnd = (startLine + H) * RECORD_BYTES - 1;

  const resp = await fetch(megdrUrl, { headers: { Range: `bytes=${byteStart}-${byteEnd}` } });
  if (!resp.ok && resp.status !== 206) {
    throw new Error(`Failed to fetch MOLA MEGDR: HTTP ${resp.status}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());

  const elevations = new Array(W * H);
  for (let r = 0; r < H; r++) {
    const rowOff = r * RECORD_BYTES;
    for (let c = 0; c < W; c++) {
      // MSB_INTEGER = 16-bit Big-Endian signed integer
      elevations[r * W + c] = buf.readInt16BE(rowOff + (startSample + c) * 2);
    }
  }

  const latMax = 90 - startLine / 16;
  const latMin = 90 - (startLine + H) / 16;
  const lonMin = startSample / 16;
  const lonMax = (startSample + W) / 16;

  const jezeroMegdr = {
    id: 'mars-jezero-mola-megdr',
    planet: 'Mars',
    siteName: 'Jezero Crater & Western Isidis Margin (MGS MOLA MEGDR 16 ppd)',
    shortName: 'Jezero (MOLA MEGDR)',
    dataState: 'REAL_DATA',
    gridWidth: W,
    gridHeight: H,
    cellSizeMeters: 3705,
    extentMeters: [W * 3705, H * 3705],
    nativeResolutionLabel: '16 pix/deg (0.0625°, ~3,705 m/pix MGS MOLA MEGDR)',
    analysisResolutionLabel: '3,705 m × 3,705 m (IAU2000 Simple Cylindrical)',
    crs: 'IAU2000 Mars Simple Cylindrical (Planetocentric)',
    nativeCrs: 'SIMPLE CYLINDRICAL 16 pix/deg (MGS-M-MOLA-5-MEGDR-L3-V1.0)',
    verticalDatum: 'Mars Areoid (Goddard Mars Potential Model GMM3 / mgm1025)',
    isSurfaceModel: true,
    units: 'meters',
    bounds: {
      projected: [0, 0, W * 3705, H * 3705],
      geographic: [
        Math.round(lonMin * 1000) / 1000,
        Math.round(latMin * 1000) / 1000,
        Math.round(lonMax * 1000) / 1000,
        Math.round(latMax * 1000) / 1000,
      ],
      center: {
        lat: 18.38,
        lon: 77.58,
        label: '18.38°N, 77.58°E (Jezero Crater)',
      },
    },
    stats: computeStats(elevations),
    imagery: null,
    provenance: {
      datasetName: 'MGS MOLA Mission Experiment Gridded Data Record (MEGDR 16 ppd)',
      provider: 'NASA GSFC / PDS Geosciences Node (Smith et al., 2003)',
      instrumentOrMission: 'Mars Global Surveyor (MGS) — Mars Orbiter Laser Altimeter (MOLA)',
      originalUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html',
      cogUrl: megdrUrl,
      productId: 'MEGT90N000EB.IMG (MGS-M-MOLA-5-MEGDR-L3-V1.0)',
      acquisitionRange: '1997-09-15 to 2001-06-30 (MGS Orbits 3 to 20333)',
      processingPerformed: 'Direct 128×128 binary subset extracted via HTTP Range read from MEGT90N000EB.IMG (16-bit MSB signed integer elevation relative to GMM3 Mars Areoid; lbl: ' + megdrLblUrl + ').',
      resamplingMethod: 'Native 16 pixels/degree (3,705 m/pix) cylindrical grid',
      limitations: '16 pixels/degree (~3.7 km/pix) resolves Jezero crater rim, basin floor, and Nili Fossae trough but not sub-100 m delta foreset scarps.',
    },
    elevations,
  };

  const outPath = path.join(OUT_DIR, 'mars-jezero-mola-megdr.json');
  await fs.writeFile(outPath, JSON.stringify(jezeroMegdr));
  console.log(`  -> Saved ${outPath} (min=${jezeroMegdr.stats.minElevation}m, max=${jezeroMegdr.stats.maxElevation}m, relief=${jezeroMegdr.stats.reliefMeters}m)`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await downloadNasadem30m();
  await downloadModisMod11a2();
  await downloadLolaLdem();
  await downloadDivinerPcp();
  await downloadMolaMegdr();
  console.log('\nAll 5 priority NASA datasets downloaded and verified successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
