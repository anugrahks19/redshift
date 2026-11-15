import { rankEarthAnalogues } from '../src/services/analogRanking.mjs';
import { deriveTerrainMetrics } from '../src/services/terrainMetrics.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromArrayBuffer, fromUrl } from 'geotiff';
import proj4 from 'proj4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const ANALOG_PUBLIC_DATA = path.resolve(__dirname, '../public/data');
const TERRAINS_DIR = path.join(ANALOG_PUBLIC_DATA, 'terrains');
const DATA_ROOT = path.join(REPO_ROOT, 'data');
const PLANETARY_ENV_DIR = path.join(REPO_ROOT, 'planetary_environment');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function bilinearSample(ras, width, height, fx, fy, noData = -32768) {
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
  if (v00 === noData || v10 === noData || v01 === noData || v11 === noData) {
    const valid = [v00, v10, v01, v11].filter((v) => v !== noData && Number.isFinite(v));
    if (valid.length === 0) return null;
    return round2(valid.reduce((a, b) => a + b, 0) / valid.length);
  }
  const top = v00 * (1 - dx) + v10 * dx;
  const bot = v01 * (1 - dx) + v11 * dx;
  return round2(top * (1 - dy) + bot * dy);
}

function computeElevationStats(elevations) {
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
    coveragePercent: round2((valid / elevations.length) * 100),
    minElevation: valid > 0 ? round2(min) : 0,
    maxElevation: valid > 0 ? round2(max) : 0,
    reliefMeters: valid > 0 ? round2(max - min) : 0,
  };
}

function computeArraySummary(values) {
  const valid = values.filter((v) => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  const n = valid.length;
  if (n === 0) {
    return { validCount: 0, min: 0, p10: 0, median: 0, mean: 0, p90: 0, max: 0, stdDev: 0 };
  }
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const q = (p) => valid[Math.min(n - 1, Math.max(0, Math.floor(p * (n - 1))))];
  return {
    validCount: n,
    min: round2(valid[0]),
    p10: round2(q(0.1)),
    median: round2(q(0.5)),
    mean: round2(mean),
    p90: round2(q(0.9)),
    max: round2(valid[n - 1]),
    stdDev: round2(Math.sqrt(variance)),
  };
}

function computeDerivedRasters(dataset) {
  const { elevations } = dataset;
  const { slopeDegrees, aspectDegrees, roughnessTriMeters: roughnessMeters, localReliefMeters } = deriveTerrainMetrics(dataset);

  // Classify slope (Part 3.2 Heatmap 2: Flat, Gentle, Moderate, Steep)
  let flatCount = 0, gentleCount = 0, moderateCount = 0, steepCount = 0, validSlope = 0;
  for (const s of slopeDegrees) {
    if (s === null) continue;
    validSlope++;
    if (s < 3) flatCount++;
    else if (s < 8) gentleCount++;
    else if (s < 15) moderateCount++;
    else steepCount++;
  }

  // Classify roughness (Part 3.2 Heatmap 3: Smooth, Moderately rough, Highly rugged)
  let smoothCount = 0, modRoughCount = 0, ruggedCount = 0, validRough = 0;
  for (const r of roughnessMeters) {
    if (r === null) continue;
    validRough++;
    if (r < 1.5) smoothCount++;
    else if (r < 5.0) modRoughCount++;
    else ruggedCount++;
  }

  return {
    elevationStats: computeArraySummary(elevations),
    slopeStats: computeArraySummary(slopeDegrees),
    roughnessStats: computeArraySummary(roughnessMeters),
    reliefStats: computeArraySummary(localReliefMeters),
    slopeClasses: {
      flatUnder3DegPercent: validSlope ? round2((flatCount / validSlope) * 100) : 0,
      gentle3To8DegPercent: validSlope ? round2((gentleCount / validSlope) * 100) : 0,
      moderate8To15DegPercent: validSlope ? round2((moderateCount / validSlope) * 100) : 0,
      steepOver15DegPercent: validSlope ? round2((steepCount / validSlope) * 100) : 0,
    },
    roughnessClasses: {
      smoothUnder1_5mPercent: validRough ? round2((smoothCount / validRough) * 100) : 0,
      moderate1_5To5mPercent: validRough ? round2((modRoughCount / validRough) * 100) : 0,
      ruggedOver5mPercent: validRough ? round2((ruggedCount / validRough) * 100) : 0,
    },
    slopeDegrees,
    aspectDegrees,
    roughnessMeters,
    localReliefMeters,
  };
}

// ============================================================================
// Step 1: Download additional Earth candidate DEMs (NASADEM & Copernicus GLO-30)
// ============================================================================
const expandedSites = JSON.parse(await fs.readFile(new URL('../src/data/terraformAnalogSites.json', import.meta.url), 'utf8'));
const expandedSpecs = expandedSites.map((site) => {
  const latitude = `${site.lat < 0 ? 'S' : 'N'}${String(Math.abs(Math.floor(site.lat))).padStart(2, '0')}`;
  const longitude = `${site.lon < 0 ? 'W' : 'E'}${String(Math.abs(Math.floor(site.lon))).padStart(3, '0')}`;
  const productId = `Copernicus_DSM_COG_10_${latitude}_00_${longitude}_00_DEM`;
  const zone = Math.floor((site.lon + 180) / 6) + 1;
  return {
    file: `earth-${site.id}-glo30.json`, id: `earth-${site.id}-glo30`, siteId: site.id,
    shortName: site.name, siteName: site.name, centerLat: site.lat, centerLon: site.lon,
    centerLabel: `${site.lat}°, ${site.lon}°`, epsgCode: `EPSG:${32600 + zone}`,
    utmProj: `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`, sourceType: 'COPERNICUS',
    cogUrl: `https://copernicus-dem-30m.s3.amazonaws.com/${productId}/${productId}.tif`,
    productId, nasademCoverageStatus: 'Copernicus surface model. Vegetation and structures may affect heights.',
  };
});

async function downloadAdditionalEarthCandidateDems() {
  console.log('Checking/downloading Earth candidate DEMs (Death Valley, Mauna Kea, Rio Tinto, McMurdo, Askja)...');
  const nasademTokenRes = process.argv.includes('--expand-terraform') ? null : await fetch('https://planetarycomputer.microsoft.com/api/sas/v1/token/nasadem').then((r) => r.json());

  const candidateSpecs = [
    {
      file: 'death-valley-nasadem-30m.json',
      id: 'earth-death-valley-nasadem-30m',
      siteId: 'death-valley',
      siteName: 'Death Valley (Badwater / Mars Hill), California, USA (NASADEM_HGT V001)',
      shortName: 'Death Valley (NASADEM 30m)',
      centerLat: 36.23,
      centerLon: -116.82,
      centerLabel: '36°13\'48"N, 116°49\'12"W',
      utmProj: '+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs',
      epsgCode: 'EPSG:32611 (UTM Zone 11N)',
      sourceType: 'NASADEM',
      cogUrl: 'https://nasademeuwest.blob.core.windows.net/nasadem-cog/v001/NASADEM_HGT_n36w117.tif',
      productId: 'NASADEM_HGT_n36w117 (V001)',
      nasademCoverageStatus: 'COVERED (Within 60°N–56°S SRTM/NASADEM orbital bounds)',
    },
    {
      file: 'mauna-kea-nasadem-30m.json',
      id: 'earth-mauna-kea-nasadem-30m',
      siteId: 'mauna-kea-apollo',
      siteName: 'Mauna Kea Apollo Valley Slope, Hawaii, USA (NASADEM_HGT V001)',
      shortName: 'Mauna Kea (NASADEM 30m)',
      centerLat: 19.82,
      centerLon: -155.47,
      centerLabel: '19°49\'12"N, 155°28\'12"W',
      utmProj: '+proj=utm +zone=5 +datum=WGS84 +units=m +no_defs',
      epsgCode: 'EPSG:32605 (UTM Zone 5N)',
      sourceType: 'NASADEM',
      cogUrl: 'https://nasademeuwest.blob.core.windows.net/nasadem-cog/v001/NASADEM_HGT_n19w156.tif',
      productId: 'NASADEM_HGT_n19w156 (V001)',
      nasademCoverageStatus: 'COVERED (Within 60°N–56°S SRTM/NASADEM orbital bounds)',
    },
    {
      file: 'rio-tinto-nasadem-30m.json',
      id: 'earth-rio-tinto-nasadem-30m',
      siteId: 'rio-tinto',
      siteName: 'Río Tinto Acid Sulfate Basin, Spain (NASADEM_HGT V001)',
      shortName: 'Río Tinto (NASADEM 30m)',
      centerLat: 37.70,
      centerLon: -6.56,
      centerLabel: '37°42\'00"N, 6°33\'36"W',
      utmProj: '+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs',
      epsgCode: 'EPSG:32629 (UTM Zone 29N)',
      sourceType: 'NASADEM',
      cogUrl: 'https://nasademeuwest.blob.core.windows.net/nasadem-cog/v001/NASADEM_HGT_n37w007.tif',
      productId: 'NASADEM_HGT_n37w007 (V001)',
      nasademCoverageStatus: 'COVERED (Within 60°N–56°S SRTM/NASADEM orbital bounds)',
    },
    {
      file: 'mcmurdo-dry-valleys-30m.json',
      id: 'earth-mcmurdo-dem-30m',
      siteId: 'mcmurdo-dry-valleys',
      siteName: 'McMurdo Dry Valleys (Wright Valley), Antarctica (Copernicus GLO-30 Polar Supplement)',
      shortName: 'McMurdo Dry Valleys (30m Polar DEM)',
      centerLat: -77.55,
      centerLon: 161.67,
      centerLabel: '77°33\'00"S, 161°40\'12"E',
      utmProj: '+proj=utm +zone=57 +south +datum=WGS84 +units=m +no_defs',
      epsgCode: 'EPSG:32757 (UTM Zone 57S)',
      sourceType: 'COPERNICUS_POLAR',
      cogUrl: 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S78_00_E161_00_DEM/Copernicus_DSM_COG_10_S78_00_E161_00_DEM.tif',
      productId: 'Copernicus_DSM_COG_10_S78_00_E161_00_DEM (NASADEM out-of-bounds south of 56°S)',
      nasademCoverageStatus: 'OUT_OF_BOUNDS (NASADEM_HGT V001 ends at 56°S due to SRTM shuttle inclination; supplemented by real 30 m Copernicus GLO-30 tile S78E161)',
    },
    {
      file: 'askja-iceland-30m.json',
      id: 'earth-askja-dem-30m',
      siteId: 'iceland-askja',
      siteName: 'Askja & Holuhraun Volcanic Highlands, Iceland (Copernicus GLO-30 High-Latitude Supplement)',
      shortName: 'Askja Highlands (30m High-Lat DEM)',
      centerLat: 65.03,
      centerLon: -16.75,
      centerLabel: '65°01\'48"N, 16°45\'00"W',
      utmProj: '+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs',
      epsgCode: 'EPSG:32628 (UTM Zone 28N)',
      sourceType: 'COPERNICUS_POLAR',
      cogUrl: 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N65_00_W017_00_DEM/Copernicus_DSM_COG_10_N65_00_W017_00_DEM.tif',
      productId: 'Copernicus_DSM_COG_10_N65_00_W017_00_DEM (NASADEM out-of-bounds north of 60°N)',
      nasademCoverageStatus: 'OUT_OF_BOUNDS (NASADEM_HGT V001 ends at 60°N due to SRTM shuttle inclination; supplemented by real 30 m Copernicus GLO-30 tile N65W017)',
    },
  ];

  for (const spec of (process.argv.includes('--expand-terraform') ? expandedSpecs : [...candidateSpecs, ...expandedSpecs])) {
    const outPath = path.join(TERRAINS_DIR, spec.file);
    try {
      await fs.access(outPath);
      console.log(`  -> Already exists: ${spec.file}`);
      continue;
    } catch {
      // Download it
    }

    console.log(`  -> Downloading 30 m DEM for ${spec.siteId} from ${spec.productId}...`);
    const url = spec.sourceType === 'NASADEM' ? `${spec.cogUrl}?${nasademTokenRes.token}` : spec.cogUrl;
    const tiff = await fromUrl(url);
    const image = await tiff.getImage();
    const [originX, originY] = image.getOrigin();
    const [resX, resY] = image.getResolution();
    const imgW = image.getWidth();
    const imgH = image.getHeight();

    const W = 128;
    const H = 128;
    const cell = 30;
    const halfSpan = (W * cell) / 2; // 1920 m
    const [centerX, centerY] = proj4('EPSG:4326', spec.utmProj, [spec.centerLon, spec.centerLat]);
    const minX = Math.round(centerX - halfSpan);
    const maxX = minX + W * cell;
    const minY = Math.round(centerY - halfSpan);
    const maxY = minY + H * cell;

    const corners = [
      proj4(spec.utmProj, 'EPSG:4326', [minX, minY]),
      proj4(spec.utmProj, 'EPSG:4326', [maxX, minY]),
      proj4(spec.utmProj, 'EPSG:4326', [minX, maxY]),
      proj4(spec.utmProj, 'EPSG:4326', [maxX, maxY]),
    ];
    const lons = corners.map((c) => c[0]);
    const lats = corners.map((c) => c[1]);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);

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
        const [lon, lat] = proj4(spec.utmProj, 'EPSG:4326', [easting, northing]);
        const fx = (lon - originX) / resX - pxLeft - (spec.sourceType === 'COPERNICUS' ? 0.5 : 0);
        const fy = (lat - originY) / resY - pxTop - (spec.sourceType === 'COPERNICUS' ? 0.5 : 0);
        elevations[r * W + c] = bilinearSample(raw, winW, winH, fx, fy, image.getGDALNoData() ?? -32768);
      }
    }

    if (spec.sourceType === 'COPERNICUS' && computeElevationStats(elevations).coveragePercent < 99) {
      console.warn(`Skipping ${spec.siteId}: incomplete source tile coverage`);
      continue;
    }

    const dataset = {
      id: spec.id,
      planet: 'Earth',
      siteName: spec.siteName,
      shortName: spec.shortName,
      dataState: 'REAL_DATA',
      gridWidth: W,
      gridHeight: H,
      cellSizeMeters: cell,
      extentMeters: [W * cell, H * cell],
      nativeResolutionLabel: spec.sourceType === 'NASADEM' ? '1 arc-second (~30 m NASADEM_HGT V001)' : '1 arc-second (~30 m Copernicus GLO-30)',
      analysisResolutionLabel: `30.0 m × 30.0 m (${spec.epsgCode})`,
      crs: `${spec.epsgCode} (resampled from native EPSG:4326)`,
      nativeCrs: 'EPSG:4326 (WGS 84)',
      verticalDatum: spec.sourceType === 'NASADEM' ? 'EGM96 geoid orthometric height (NASADEM_HGT V001)' : 'EGM2008 orthometric height (Copernicus GLO-30)',
      isSurfaceModel: spec.sourceType !== 'NASADEM',
      units: 'meters',
      bounds: {
        projected: [minX, minY, maxX, maxY],
        geographic: [round2(lonMin * 1000) / 1000, round2(latMin * 1000) / 1000, round2(lonMax * 1000) / 1000, round2(latMax * 1000) / 1000],
        center: {
          lat: spec.centerLat,
          lon: spec.centerLon,
          label: spec.centerLabel,
        },
      },
      stats: computeElevationStats(elevations),
      imagery: null,
      provenance: {
        datasetName: spec.sourceType === 'NASADEM'
          ? 'NASADEM Merged DEM Global 1 arc second V001 (NASADEM_HGT)'
          : 'Copernicus DEM GLO-30',
        provider: spec.sourceType === 'NASADEM'
          ? 'NASA JPL / LP DAAC (C2763264762-LPCLOUD)'
          : 'ESA / Copernicus Open Data Registry',
        instrumentOrMission: spec.sourceType === 'NASADEM'
          ? 'Shuttle Radar Topography Mission (SRTM) + ASTER GDEM v3 + ICESat GLAS'
          : 'TanDEM-X / WorldDEM SAR Interferometry',
        originalUrl: spec.sourceType === 'NASADEM'
          ? 'https://search.earthdata.nasa.gov/search/granules?p=C2763264762-LPCLOUD'
          : spec.cogUrl,
        cogUrl: spec.cogUrl,
        productId: spec.productId,
        acquisitionRange: spec.sourceType === 'NASADEM' ? '2000-02-11 to 2000-02-22 (V001 2020)' : '2011–2015 (GLO-30 release)',
        processingPerformed: `Extracted 3840 m × 3840 m window via HTTP Range read from ${spec.productId} and bilinearly resampled onto 30.0 m ${spec.epsgCode} grid. NASADEM coverage check: ${spec.nasademCoverageStatus}.`,
        resamplingMethod: 'Bilinear interpolation onto 30.0 m metric grid',
        limitations: spec.nasademCoverageStatus,
      },
      elevations,
    };

    await fs.writeFile(outPath, JSON.stringify(dataset));
    console.log(`  -> Saved ${spec.file} (min=${dataset.stats.minElevation}m, max=${dataset.stats.maxElevation}m)`);
  }
}

// ============================================================================
// Step 2: Ensure McMurdo Dry Valleys & Haughton Crater are in MODIS MOD11A2
// ============================================================================
async function updateModisWithPolarSites() {
  const modisPath = path.join(TERRAINS_DIR, 'modis-mod11a2-lst.json');
  const modisJson = JSON.parse(await fs.readFile(modisPath, 'utf8'));

  const mcmurdoEntry = modisJson.sites['mcmurdo-dry-valleys'];
  if (!mcmurdoEntry || !mcmurdoEntry.dayStatsCelsius) {
    console.log('Querying MODIS MOD11A2 v061 for McMurdo Dry Valleys (77.55°S, 161.67°E)...');
    const modisSinProj = '+proj=sinu +lon_0=0 +x_0=0 +y_0=0 +R=6371007.181 +units=m +no_defs';
    const stacRes = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collections: ['modis-11A2-061'],
        intersects: { type: 'Point', coordinates: [161.67, -77.55] },
        limit: 5,
      }),
    }).then((r) => r.json());

    let added = false;
    for (const item of stacRes.features || []) {
      const dayHref = item.assets.LST_Day_1km.href;
      const nightHref = item.assets.LST_Night_1km.href;
      const [signDay, signNight] = await Promise.all([
        fetch(`https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(dayHref)}`).then((r) => r.json()),
        fetch(`https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(nightHref)}`).then((r) => r.json()),
      ]);
      const [dayBuf, nightBuf] = await Promise.all([
        fetch(signDay.href).then((r) => r.arrayBuffer()),
        fetch(signNight.href).then((r) => r.arrayBuffer()),
      ]);
      const dayTiff = await fromArrayBuffer(dayBuf);
      const nightTiff = await fromArrayBuffer(nightBuf);
      const dayImg = await dayTiff.getImage();
      const nightImg = await nightTiff.getImage();
      const [ox, oy] = dayImg.getOrigin();
      const [rx, ry] = dayImg.getResolution();
      const [sinX, sinY] = proj4('EPSG:4326', modisSinProj, [161.67, -77.55]);
      const cx = Math.floor((sinX - ox) / rx);
      const cy = Math.floor((sinY - oy) / ry);
      const half = 16;
      const win = [
        Math.max(0, cx - half),
        Math.max(0, cy - half),
        Math.min(dayImg.getWidth(), cx + half),
        Math.min(dayImg.getHeight(), cy + half),
      ];
      const dayRaw = (await dayImg.readRasters({ window: win }))[0];
      const nightRaw = (await nightImg.readRasters({ window: win }))[0];

      const toC = (arr) => {
        const out = [];
        let valid = 0, min = Infinity, max = -Infinity, sum = 0;
        for (let i = 0; i < arr.length; i++) {
          const dn = arr[i];
          if (dn === 0 || dn < 7500) {
            out.push(null);
          } else {
            const c = round2(dn * 0.02 - 273.15);
            out.push(c);
            valid++;
            sum += c;
            if (c < min) min = c;
            if (c > max) max = c;
          }
        }
        return {
          valuesCelsius: out,
          validCells: valid,
          totalCells: arr.length,
          min: valid > 0 ? round2(min) : null,
          max: valid > 0 ? round2(max) : null,
          mean: valid > 0 ? round2(sum / valid) : null,
        };
      };

      const dayStats = toC(dayRaw);
      const nightStats = toC(nightRaw);
      if (dayStats.validCells > 0 || nightStats.validCells > 0) {
        modisJson.sites['mcmurdo-dry-valleys'] = {
          siteId: 'mcmurdo-dry-valleys',
          siteName: 'McMurdo Dry Valleys (Wright Valley), Antarctica',
          granuleId: item.id,
          acquisitionDate: item.properties.datetime || item.properties.start_datetime,
          dayLstCogUrl: dayHref,
          nightLstCogUrl: nightHref,
          nativeWindow: { left: ox + win[0] * rx, top: oy + win[1] * ry, pixelWidth: Math.abs(rx), pixelHeight: Math.abs(ry) },
          gridWidth: win[2] - win[0],
          gridHeight: win[3] - win[1],
          cellSizeMeters: 926.625,
          scaleFactorKelvin: 0.02,
          dayStatsCelsius: {
            validCells: dayStats.validCells,
            min: dayStats.min,
            max: dayStats.max,
            mean: dayStats.mean,
          },
          nightStatsCelsius: {
            validCells: nightStats.validCells,
            min: nightStats.min,
            max: nightStats.max,
            mean: nightStats.mean,
          },
          diurnalAmplitudeCelsius:
            dayStats.mean !== null && nightStats.mean !== null
              ? round2(dayStats.mean - nightStats.mean)
              : null,
          dayLstCelsiusGrid: dayStats.valuesCelsius,
          nightLstCelsiusGrid: nightStats.valuesCelsius,
          coverageNote: 'Antarctic polar retrieval from MODIS MOD11A2 v061.',
        };
        added = true;
        console.log(`  -> Added McMurdo MODIS granule ${item.id} (dayMean=${dayStats.mean}°C, nightMean=${nightStats.mean}°C)`);
        break;
      }
    }
    await fs.writeFile(modisPath, JSON.stringify(modisJson, null, 2));
  }
}

// ============================================================================
// Step 3: Build Planetary Environment Reference Files (Part 7)
// ============================================================================
async function copyPlanetaryEnvironmentReferenceFiles() {
  const directory = path.join(ANALOG_PUBLIC_DATA, 'planetary_environment');
  await fs.mkdir(directory, { recursive: true });
  for (const body of ['earth', 'mars', 'moon']) {
    const name = `${body}.json`;
    await fs.copyFile(path.join(PLANETARY_ENV_DIR, name), path.join(directory, name));
  }
}

async function processAllDatasets() {
  console.log('Running geospatial processing pipeline across all Earth, Moon, and Mars rasters...');

  const dirs = [
    path.join(DATA_ROOT, 'raw/earth'),
    path.join(DATA_ROOT, 'raw/moon'),
    path.join(DATA_ROOT, 'raw/mars'),
    path.join(DATA_ROOT, 'processed/earth/elevation'),
    path.join(DATA_ROOT, 'processed/earth/slope'),
    path.join(DATA_ROOT, 'processed/earth/roughness'),
    path.join(DATA_ROOT, 'processed/earth/temperature'),
    path.join(DATA_ROOT, 'processed/moon/elevation'),
    path.join(DATA_ROOT, 'processed/moon/slope'),
    path.join(DATA_ROOT, 'processed/moon/roughness'),
    path.join(DATA_ROOT, 'processed/moon/temperature'),
    path.join(DATA_ROOT, 'processed/moon/certification'),
    path.join(DATA_ROOT, 'processed/mars/elevation'),
    path.join(DATA_ROOT, 'processed/mars/slope'),
    path.join(DATA_ROOT, 'processed/mars/roughness'),
    path.join(DATA_ROOT, 'processed/mars/temperature'),
    path.join(DATA_ROOT, 'processed/mars/certification'),
    path.join(DATA_ROOT, 'analytics/heatmaps'),
    path.join(DATA_ROOT, 'analytics/comparisons'),
    path.join(DATA_ROOT, 'analytics/site_scores'),
    path.join(ANALOG_PUBLIC_DATA, 'processed'),
  ];
  for (const d of dirs) await fs.mkdir(d, { recursive: true });

  const terrainFiles = [
    { file: 'yungay-nasadem-30m.json', body: 'earth', siteId: 'yungay-atacama', priorityDataset: 'NASADEM_HGT V001' },
    { file: 'death-valley-nasadem-30m.json', body: 'earth', siteId: 'death-valley', priorityDataset: 'NASADEM_HGT V001' },
    { file: 'mauna-kea-nasadem-30m.json', body: 'earth', siteId: 'mauna-kea-apollo', priorityDataset: 'NASADEM_HGT V001' },
    { file: 'rio-tinto-nasadem-30m.json', body: 'earth', siteId: 'rio-tinto', priorityDataset: 'NASADEM_HGT V001' },
    { file: 'mcmurdo-dry-valleys-30m.json', body: 'earth', siteId: 'mcmurdo-dry-valleys', priorityDataset: 'Copernicus GLO-30 (NASADEM <56°S Supplement)' },
    { file: 'askja-iceland-30m.json', body: 'earth', siteId: 'iceland-askja', priorityDataset: 'Copernicus GLO-30 (NASADEM >60°N Supplement)' },
    { file: 'moon-shackleton-lola.json', body: 'moon', siteId: 'shackleton-rim', priorityDataset: 'LRO LOLA LDEM_75S_30M' },
    { file: 'moon-marius-lola.json', body: 'moon', siteId: 'marius-hills', priorityDataset: 'LRO LOLA LDEM_64' },
    { file: 'moon-tranquillitatis-lola.json', body: 'moon', siteId: 'mare-tranquillitatis', priorityDataset: 'LRO LOLA LDEM_64' },
    { file: 'mars-jezero-mola-megdr.json', body: 'mars', siteId: 'jezero-delta', priorityDataset: 'MGS MOLA MEGDR MEGT90N000EB' },
    { file: 'gale-murray-30m.json', body: 'mars', siteId: 'gale-murray', priorityDataset: 'HiRISE / MOLA Blended DEM' },
    { file: 'gale-bradbury-30m.json', body: 'mars', siteId: 'gale-bradbury', priorityDataset: 'HiRISE / MOLA Blended DEM' },
  ];

  for (const spec of expandedSpecs) {
    try {
      await fs.access(path.join(TERRAINS_DIR, spec.file));
      terrainFiles.push({ file: spec.file, body: 'earth', siteId: spec.siteId, priorityDataset: 'Copernicus GLO-30' });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const modisJson = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, 'modis-mod11a2-lst.json'), 'utf8'));
  const divinerJson = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, 'diviner-pcp-southpole.json'), 'utf8'));
  const moonGlobalThermalJson = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, 'moon-diviner-global-thermal.json'), 'utf8'));
  const marsThermalJson = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, 'mars-thermal-tes-themis.json'), 'utf8'));
  const certificationJson = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, 'base-certification-criteria.json'), 'utf8'));

  // Save processed temperature & certification files
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/earth/temperature/modis-mod11a2-lst.json'),
    JSON.stringify(modisJson, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/moon/temperature/diviner-pcp-southpole.json'),
    JSON.stringify(divinerJson, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/moon/temperature/moon-diviner-global-thermal.json'),
    JSON.stringify(moonGlobalThermalJson, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/mars/temperature/mars-thermal-tes-themis.json'),
    JSON.stringify(marsThermalJson, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/moon/certification/base-certification-criteria.json'),
    JSON.stringify(certificationJson, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_ROOT, 'processed/mars/certification/base-certification-criteria.json'),
    JSON.stringify(certificationJson, null, 2)
  );

  const processedCatalog = {};

  for (const item of terrainFiles) {
    const rawDataset = JSON.parse(await fs.readFile(path.join(TERRAINS_DIR, item.file), 'utf8'));
    const derived = computeDerivedRasters(rawDataset);

    // Save raw metadata header
    await fs.writeFile(
      path.join(DATA_ROOT, `raw/${item.body}/${rawDataset.id}.meta.json`),
      JSON.stringify({
        id: rawDataset.id,
        siteId: item.siteId,
        planet: rawDataset.planet,
        siteName: rawDataset.siteName,
        crs: rawDataset.crs,
        nativeCrs: rawDataset.nativeCrs,
        verticalDatum: rawDataset.verticalDatum,
        units: rawDataset.units,
        gridWidth: rawDataset.gridWidth,
        gridHeight: rawDataset.gridHeight,
        cellSizeMeters: rawDataset.cellSizeMeters,
        bounds: rawDataset.bounds,
        stats: rawDataset.stats,
        provenance: rawDataset.provenance,
        ingestionStatus: 'INGESTED_AND_VALIDATED',
        processingStatus: 'DERIVED_PRODUCTS_GENERATED',
      }, null, 2)
    );

    // Save processed elevation, slope, roughness
    await fs.writeFile(
      path.join(DATA_ROOT, `processed/${item.body}/elevation/${rawDataset.id}.json`),
      JSON.stringify({
        id: rawDataset.id,
        siteId: item.siteId,
        planet: rawDataset.planet,
        units: 'meters',
        gridWidth: rawDataset.gridWidth,
        gridHeight: rawDataset.gridHeight,
        cellSizeMeters: rawDataset.cellSizeMeters,
        stats: derived.elevationStats,
        values: rawDataset.elevations,
      })
    );

    await fs.writeFile(
      path.join(DATA_ROOT, `processed/${item.body}/slope/${rawDataset.id}.slope.json`),
      JSON.stringify({
        id: `${rawDataset.id}-slope`,
        sourceDatasetId: rawDataset.id,
        siteId: item.siteId,
        planet: rawDataset.planet,
        algorithm: 'Horn (1981) 3×3 finite-difference elevation gradient',
        units: 'degrees',
        gridWidth: rawDataset.gridWidth,
        gridHeight: rawDataset.gridHeight,
        cellSizeMeters: rawDataset.cellSizeMeters,
        stats: derived.slopeStats,
        classes: derived.slopeClasses,
        values: derived.slopeDegrees,
      })
    );

    await fs.writeFile(
      path.join(DATA_ROOT, `processed/${item.body}/roughness/${rawDataset.id}.roughness.json`),
      JSON.stringify({
        id: `${rawDataset.id}-roughness`,
        sourceDatasetId: rawDataset.id,
        siteId: item.siteId,
        planet: rawDataset.planet,
        algorithm: 'Riley et al. (1999) 3×3 square root of summed squared elevation differences',
        units: 'meters',
        gridWidth: rawDataset.gridWidth,
        gridHeight: rawDataset.gridHeight,
        cellSizeMeters: rawDataset.cellSizeMeters,
        stats: derived.roughnessStats,
        classes: derived.roughnessClasses,
        values: derived.roughnessMeters,
      })
    );

    // Attach temperature availability & summary
    let temperatureSummary = {
      available: false,
      datasetId: null,
      datasetName: null,
      units: 'Celsius / Kelvin',
      reasonUnavailable:
        item.body === 'mars'
          ? 'MOLA MEGDR and HiRISE DEMs are topographic altimetry/stereo datasets only and do not contain thermal infrared bands. Mars surface temperature is not fabricated from elevation.'
          : 'LRO Diviner Polar Cumulative Products (PCP) cover the lunar polar regions (70°S–90°S) only; equatorial/mid-latitude maria do not have bundled Diviner PCP grids.',
      dayMeanCelsius: null,
      nightMeanCelsius: null,
      minCelsius: null,
      maxCelsius: null,
      meanKelvin: null,
    };

    if (item.body === 'earth' && modisJson.sites[item.siteId]) {
      const m = modisJson.sites[item.siteId];
      const dayStats = m.dayStatsCelsius || m.daytimeLst;
      const nightStats = m.nightStatsCelsius || m.nighttimeLst;
      const dayMean = dayStats?.mean ?? dayStats?.meanCelsius ?? null;
      const nightMean = nightStats?.mean ?? nightStats?.meanCelsius ?? null;
      const minC = nightStats?.min ?? nightStats?.minCelsius ?? dayStats?.min ?? null;
      const maxC = dayStats?.max ?? dayStats?.maxCelsius ?? nightStats?.max ?? null;
      const hasValid = (dayStats?.validCells ?? 0) > 0 || (nightStats?.validCells ?? 0) > 0;
      temperatureSummary = {
        available: hasValid,
        datasetId: 'earth-modis-mod11a2-lst',
        datasetName: `MODIS/Terra MOD11A2 v061 (${m.granuleId})`,
        units: '°C (converted from Kelvin × 0.02 scale factor)',
        reasonUnavailable: hasValid ? null : (m.coverageNote || 'Polar cloud/darkness mask in queried 8-day window.'),
        dayMeanCelsius: dayMean,
        nightMeanCelsius: nightMean,
        minCelsius: minC,
        maxCelsius: maxC,
        meanKelvin:
          dayMean !== null
            ? round2(dayMean + 273.15)
            : nightMean !== null
              ? round2(nightMean + 273.15)
              : null,
      };
    } else if (item.body === 'moon' && item.siteId === 'shackleton-rim') {
      temperatureSummary = {
        available: true,
        datasetId: 'moon-diviner-pcp-southpole',
        datasetName: 'LRO Diviner Polar Cumulative Product (PCP_AVG_TBOL_POLS_SUM_LTIM01_240)',
        units: 'Kelvin (K) and Celsius (°C)',
        reasonUnavailable: null,
        dayMeanCelsius: null,
        nightMeanCelsius: null,
        minCelsius: divinerJson.stats.minCelsius,
        maxCelsius: divinerJson.stats.maxCelsius,
        meanKelvin: divinerJson.stats.meanKelvin,
      };
    }

    const certificationSummary = null;

    processedCatalog[rawDataset.id] = {
      datasetId: rawDataset.id,
      siteId: item.siteId,
      planet: rawDataset.planet,
      siteName: rawDataset.siteName,
      shortName: rawDataset.shortName,
      priorityDataset: item.priorityDataset,
      crs: rawDataset.crs,
      nativeCrs: rawDataset.nativeCrs,
      verticalDatum: rawDataset.verticalDatum,
      cellSizeMeters: rawDataset.cellSizeMeters,
      gridWidth: rawDataset.gridWidth,
      gridHeight: rawDataset.gridHeight,
      bounds: rawDataset.bounds,
      coveragePercent: rawDataset.stats.coveragePercent,
      reliefMeters: rawDataset.stats.reliefMeters,
      elevationStats: derived.elevationStats,
      slopeStats: derived.slopeStats,
      roughnessStats: derived.roughnessStats,
      reliefStats: derived.reliefStats,
      slopeClasses: derived.slopeClasses,
      roughnessClasses: derived.roughnessClasses,
      temperatureSummary,
      certificationSummary,
      provenance: rawDataset.provenance,
    };
  }

  // Compute baseline similarity scores between every Planetary Target and every Earth Candidate
  const planetaryEntries = Object.values(processedCatalog).filter((e) => e.planet !== 'Earth');
  const siteScores = {};

  for (const target of planetaryEntries) {
    siteScores[target.siteId] = rankEarthAnalogues(processedCatalog, target);
  }

  const catalogBundle = {
    generatedAt: new Date().toISOString(),
    pipelineVersion: '2.0.0-spaceapps-2026',
    fivePriorityDatasetsStatus: [
      {
        priority: 1,
        id: 'NASADEM_HGT_V001',
        name: 'NASADEM Merged DEM Global 1 arc second V001',
        body: 'Earth',
        parameter: 'Elevation & Derived Terrain (Slope, Roughness, Aspect)',
        resolution: '30 m (1 arc-second)',
        units: 'meters (EGM96 orthometric)',
        crs: 'EPSG:4326 native -> resampled to local UTM 30 m grids',
        noDataValue: -32768,
        ingestionStatus: 'INGESTED_AND_PROCESSED',
        coverageLimitation: 'Covers 60°N to 56°S (SRTM shuttle orbit limit). High-latitude sites McMurdo (77.55°S) and Askja (65.03°N) explicitly flag NASADEM out-of-bounds and use Copernicus GLO-30 30 m supplement.',
      },
      {
        priority: 2,
        id: 'MODIS_MOD11A2_V061',
        name: 'MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1 km SIN Grid V061',
        body: 'Earth',
        parameter: 'Daytime & Nighttime Land Surface Temperature (LST)',
        resolution: '1 km (926.625 m Sinusoidal)',
        units: 'Kelvin (raw DN * 0.02) -> converted to °C and K',
        crs: 'MODIS Sinusoidal -> WGS84 site windows',
        noDataValue: 0,
        ingestionStatus: 'INGESTED_AND_PROCESSED',
        coverageLimitation: 'Clear-sky thermal infrared retrieval only; polar winter darkness or cloud cover masks daytime pixels in Antarctic winter windows.',
      },
      {
        priority: 3,
        id: 'LRO_LOLA_LDEM',
        name: 'LRO LOLA Gridded Data Record (LDEM_75S_30M & LDEM_64)',
        body: 'Moon',
        parameter: 'Lunar Elevation & Derived Terrain (Slope, Roughness, Aspect)',
        resolution: '30 m/pixel (South Pole LDEM_75S_30M) & 473.8 m/pixel (LDEM_64)',
        units: 'meters above 1,737.4 km reference sphere (DN * 0.5)',
        crs: 'IAU Moon 2000 South Polar Stereographic / Simple Cylindrical',
        noDataValue: -32768,
        ingestionStatus: 'INGESTED_AND_PROCESSED',
        coverageLimitation: 'Topographic laser altimetry only; contains no surface temperature or subsurface ice abundance measurements.',
      },
      {
        priority: 4,
        id: 'LRO_DIVINER_PCP_AND_GDR',
        name: 'LRO Diviner Polar Cumulative Products (PCP) & Global Cylindrical GDR (LRO-L-DLRE-5-GDR-V1.0)',
        body: 'Moon',
        parameter: 'Lunar Polar & Equatorial Bolometric Surface Temperature + Rock Abundance',
        resolution: '240 m/pixel (South Polar Stereographic) & 32–128 ppd (Global Cylindrical GDR)',
        units: 'Kelvin (K), Celsius (°C), and Areal Rock Fraction (%)',
        crs: 'IAU Moon South Polar Stereographic & Simple Cylindrical',
        noDataValue: -32768,
        ingestionStatus: 'INGESTED_AND_PROCESSED',
        coverageLimitation: 'Polar regions covered by Diviner PCP; equatorial maria (Marius Hills, Mare Tranquillitatis) supplemented via Section 9 LRO Diviner Global Cylindrical GDR (DGDR_ST_AVG / DGDR_RA_AVG / DGDR_TBOL_AVG).',
      },
      {
        priority: 5,
        id: 'MGS_MOLA_MEGDR_AND_TES',
        name: 'MGS MOLA MEGDR (MEGT90N000EB) + MGS TES Thermal Inertia (MGS-M-TES-5-TIMAP-V1.0)',
        body: 'Mars',
        parameter: 'Martian Elevation, Derived Terrain & TES Thermal Inertia / Surface Temperature',
        resolution: '16 ppd MOLA + 30 m Gale HiRISE-MOLA blend + 20 ppd MGS TES Thermal Inertia',
        units: 'meters above Mars aeroid (DEM) & J m⁻² K⁻¹ s⁻¹/² / Kelvin (Thermal)',
        crs: 'IAU Mars 2000 Equirectangular',
        noDataValue: -32768,
        ingestionStatus: 'INGESTED_AND_PROCESSED',
        coverageLimitation: 'MOLA MEGDR elevation supplemented in Section 9 with real MGS TES Global Thermal Inertia Day/Night (GLOBAL_TI_NIGHT_2007 / DAY_2007) + REMS/MEDA calibration for Jezero and Gale Crater.',
      },
    ],
    section9CertificationDatasetsStatus: [],
    datasets: processedCatalog,
    siteScores,
  };

  await fs.writeFile(path.join(DATA_ROOT, 'analytics/site_scores/similarity_catalog.json'), JSON.stringify(catalogBundle, null, 2));
  await fs.writeFile(path.join(ANALOG_PUBLIC_DATA, 'processed/scientific-catalog.json'), JSON.stringify(catalogBundle, null, 2));
  console.log('  -> Saved data/analytics/site_scores/similarity_catalog.json and public/data/processed/scientific-catalog.json');
}

async function main() {
  if (process.argv.includes('--expand-terraform')) await downloadAdditionalEarthCandidateDems();
  if (process.argv.includes('--refresh-sources')) {
    await downloadAdditionalEarthCandidateDems();
    await updateModisWithPolarSites();
  }
  await copyPlanetaryEnvironmentReferenceFiles();
  await processAllDatasets();
  console.log('\nScientific Data Processing Pipeline complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
