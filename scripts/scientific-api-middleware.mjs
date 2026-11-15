import { DEFAULT_WEIGHTS, rankEarthAnalogues } from '../analog/analog/src/services/analogRanking.mjs';
import { createTemperatureSampler } from '../analog/analog/src/services/thermalSampling.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(REPO_ROOT, 'data');
const PLANETARY_ENV_DIR = path.join(REPO_ROOT, 'planetary_environment');
const TERRAINS_DIR = path.join(REPO_ROOT, 'analog/analog/public/data/terrains');
const PROCESSED_CATALOG_PATH = path.join(REPO_ROOT, 'analog/analog/public/data/processed/scientific-catalog.json');

function round2(n) {
  return Math.round(n * 100) / 100;
}

const jsonCache = new Map();
function readJsonSafe(filePath) {
  try {
    const { mtimeMs, size } = fs.statSync(filePath);
    const cached = jsonCache.get(filePath);
    if (cached?.mtimeMs === mtimeMs && cached.size === size) return cached.value;
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    jsonCache.set(filePath, { mtimeMs, size, value });
    return value;
  } catch {
    jsonCache.delete(filePath);
    return null;
  }
}

async function parseJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= 128 * 1024) chunks.push(chunk);
  }
  if (size > 128 * 1024) throw Object.assign(new Error('Request body exceeds 128 KiB.'), { statusCode: 413 });
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw Object.assign(new Error('Expected a JSON object in the request body.'), { statusCode: 400 });
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function createScientificApiMiddleware() {
  const handle = async (req, res, next) => {
    const rawUrl = req.url ?? '/';
    const urlObj = new URL(rawUrl, 'http://localhost');
    const pathname = urlObj.pathname;

    if (!pathname.startsWith('/api/research') && !pathname.startsWith('/api/planetary-environment')) {
      return next();
    }

    // GET /api/planetary-environment/:body
    if (pathname.startsWith('/api/planetary-environment/') && req.method === 'GET') {
      const body = pathname.split('/').pop()?.replace('.json', '')?.toLowerCase() || 'earth';
      if (!['earth', 'moon', 'mars'].includes(body)) return sendJson(res, 404, { error: 'Unknown planetary body.' });
      const envData = readJsonSafe(path.join(PLANETARY_ENV_DIR, `${body}.json`));
      if (!envData) {
        return sendJson(res, 404, { error: `Unknown planetary body: ${body}` });
      }
      return sendJson(res, 200, envData);
    }

    const catalog = readJsonSafe(PROCESSED_CATALOG_PATH);
    if (!catalog?.datasets) return sendJson(res, 503, { error: 'Scientific catalog missing or unreadable.' });
    const findDataset = (id) => Object.hasOwn(catalog.datasets, id) ? catalog.datasets[id] : null;

    // 1. GET /api/research/sites
    if (pathname === '/api/research/sites' && req.method === 'GET') {
      const datasets = Object.values(catalog.datasets || {});
      const earthSites = datasets.filter((d) => d.planet === 'Earth');
      const planetaryRegions = datasets.filter((d) => d.planet !== 'Earth');
      return sendJson(res, 200, {
        status: 'ok',
        earthCandidateSites: earthSites,
        planetaryTargetRegions: planetaryRegions,
      });
    }

    // 2. GET /api/research/datasets
    if (pathname === '/api/research/datasets' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        pipelineVersion: catalog.pipelineVersion,
        generatedAt: catalog.generatedAt,
        fivePriorityDatasets: catalog.fivePriorityDatasetsStatus,
        processedDatasets: catalog.datasets,
      });
    }

    // 3. GET /api/research/layers
    if (pathname === '/api/research/layers' && req.method === 'GET') {
      const body = (urlObj.searchParams.get('planet') || 'Earth').toLowerCase();
      const siteId = urlObj.searchParams.get('siteId') || '';
      const dsEntry = Object.values(catalog.datasets || {}).find(
        (d) => d.siteId === siteId || d.datasetId === siteId
      );
      if (!['earth', 'moon', 'mars'].includes(body)) return sendJson(res, 400, { error: 'Unknown planetary body.' });
      if (siteId && !dsEntry) return sendJson(res, 404, { error: 'Unknown site.' });
      const tempAvail = dsEntry ? dsEntry.temperatureSummary?.available : body === 'earth';

      return sendJson(res, 200, {
        status: 'ok',
        layers: [
          {
            id: 'elevation',
            heatmapNumber: 1,
            name: 'Elevation Heatmap',
            units: 'meters (m)',
            available: true,
            sourceDataset: dsEntry?.priorityDataset || 'NASADEM / LOLA / MOLA',
            description: 'Cleaned topographic elevation raster resampled to metric analysis grid.',
          },
          {
            id: 'slope',
            heatmapNumber: 2,
            name: 'Slope Heatmap',
            units: 'degrees (°)',
            available: true,
            sourceDataset: `Derived via Horn (1981) 3×3 gradient from ${dsEntry?.priorityDataset || 'DEM'}`,
            classes: ['Flat (<3°)', 'Gentle (3°–8°)', 'Moderate (8°–15°)', 'Steep (>15°)'],
            safetyNote: 'Flat slope (<3°–8°) reduces mechanical tip-over risk but does not guarantee a safe landing site without boulder, bearing-capacity, and radiation verification.',
          },
          {
            id: 'roughness',
            heatmapNumber: 3,
            name: 'Terrain Roughness (TRI) Heatmap',
            units: 'meters (m)',
            available: true,
            sourceDataset: `Derived via Riley TRI from a complete 3×3 window from ${dsEntry?.priorityDataset || 'DEM'}`,
            classes: ['Smooth (<1.5 m)', 'Moderately rough (1.5–5.0 m)', 'Highly rugged (>5.0 m)'],
          },
          {
            id: 'temperature',
            heatmapNumber: 4,
            name: 'Surface Temperature Heatmap',
            units: '°C / K',
            available: Boolean(tempAvail),
            sourceDataset: dsEntry?.temperatureSummary?.datasetName || null,
            reasonUnavailable: dsEntry?.temperatureSummary?.reasonUnavailable || null,
          },
          {
            id: 'similarity',
            heatmapNumber: 5,
            name: 'Planetary Analog Similarity Heatmap',
            units: 'Index (0–100)',
            available: false,
            description: 'Computed in Research for the selected Earth and planetary grids.',
            indexLabel: 'Exploratory Analog Similarity Index',
            defaultWeights: { elevation: 0.20, slope: 0.25, roughness: 0.25, temperature: 0.30 },
          },
        ],
      });
    }

    // 4. GET /api/research/layers/:layerId/tiles/:z/:x/:y
    if (pathname.startsWith('/api/research/layers/') && pathname.includes('/tiles/') && req.method === 'GET') {
      const parts = pathname.split('/');
      const layerId = parts[4];
      if (parts.slice(6).join('/') !== '0/0/0') return sendJson(res, 404, { error: 'Only the full region raster at 0/0/0 is available.' });
      const datasetId = urlObj.searchParams.get('datasetId') || 'earth-yungay-nasadem-30m';
      const dsMeta = findDataset(datasetId);
      if (!dsMeta) {
        return sendJson(res, 404, { error: `Dataset ${datasetId} not found` });
      }
      const bodyDir = dsMeta.planet.toLowerCase();
      let rasterPayload = null;
      if (layerId === 'elevation') {
        rasterPayload = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/elevation/${datasetId}.json`));
      } else if (layerId === 'slope') {
        rasterPayload = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/slope/${datasetId}.slope.json`));
      } else if (layerId === 'roughness') {
        rasterPayload = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/roughness/${datasetId}.roughness.json`));
      } else if (layerId === 'temperature') {
        const modis = bodyDir === 'earth' ? readJsonSafe(path.join(TERRAINS_DIR, 'modis-mod11a2-lst.json'))?.sites?.[dsMeta.siteId] : null;
        const diviner = dsMeta.siteId === 'shackleton-rim' ? readJsonSafe(path.join(TERRAINS_DIR, 'diviner-pcp-southpole.json')) : null;
        const sample = createTemperatureSampler({ ...dsMeta, id: datasetId }, modis, diviner);
        const { gridWidth, gridHeight } = dsMeta;
        const values = Array.from({ length: gridWidth * gridHeight }, (_, i) =>
          sample(Math.floor(i / gridWidth), i % gridWidth)?.celsius ?? null
        );
        if (values.some(Number.isFinite)) rasterPayload = { gridWidth, gridHeight, units: '°C', values, source: dsMeta.temperatureSummary.datasetName };
      }

      if (rasterPayload === null) return sendJson(res, 404, { error: 'Layer unavailable for this dataset.', datasetId, layerId });
      return sendJson(res, 200, {
        status: 'ok',
        layerId,
        datasetId,
        raster: rasterPayload,
      });
    }

    // 5. GET /api/research/statistics
    if (pathname === '/api/research/statistics' && req.method === 'GET') {
      const datasetId = urlObj.searchParams.get('datasetId') || '';
      const siteId = urlObj.searchParams.get('siteId') || '';
      const entry = Object.values(catalog.datasets || {}).find(
        (d) => d.datasetId === datasetId || d.siteId === siteId
      );
      if (!entry) {
        if (datasetId || siteId) return sendJson(res, 404, { error: 'Unknown dataset or site.' });
        return sendJson(res, 200, { status: 'ok', datasets: catalog.datasets });
      }
      return sendJson(res, 200, { status: 'ok', statistics: entry });
    }

    // 6. POST /api/research/compare
    if (pathname === '/api/research/compare' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const earthSiteId = body.earthSiteId || 'yungay-atacama';
      const targetRegionId = body.targetRegionId || 'jezero-delta';
      const earthEntry = Object.values(catalog.datasets || {}).find((d) => d.siteId === earthSiteId || d.datasetId === earthSiteId);
      const targetEntry = Object.values(catalog.datasets || {}).find((d) => d.siteId === targetRegionId || d.datasetId === targetRegionId);
      if (!earthEntry || !targetEntry) {
        return sendJson(res, 404, { error: 'Requested Earth site or Planetary region not found in processed catalog.' });
      }
      if (earthEntry.planet !== 'Earth' || targetEntry.planet === 'Earth') {
        return sendJson(res, 400, { error: 'Select one Earth site and one planetary target.' });
      }
      return sendJson(res, 200, {
        status: 'ok',
        earth: earthEntry,
        target: targetEntry,
        deltas: {
          elevationMeanDeltaMeters: round2(earthEntry.elevationStats.mean - targetEntry.elevationStats.mean),
          reliefDeltaMeters: round2(earthEntry.reliefMeters - targetEntry.reliefMeters),
          slopeMeanDeltaDegrees: round2(earthEntry.slopeStats.mean - targetEntry.slopeStats.mean),
          roughnessMeanDeltaMeters: round2(earthEntry.roughnessStats.mean - targetEntry.roughnessStats.mean),
          temperatureMeanDeltaKelvin: null,
        },
      });
    }

    // 7. POST /api/research/similarity
    if (pathname === '/api/research/similarity' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const targetRegionId = body.targetRegionId || 'shackleton-rim';
      const weightsReq = body.weights || { elevation: 0.20, slope: 0.25, roughness: 0.25, temperature: 0.30 };
      const targetEntry = Object.values(catalog.datasets || {}).find(
        (d) => d.siteId === targetRegionId || d.datasetId === targetRegionId
      );
      if (!targetEntry) {
        return sendJson(res, 404, { error: `Unknown target region: ${targetRegionId}` });
      }

      if (typeof weightsReq !== 'object' || Array.isArray(weightsReq) || Object.entries(weightsReq).some(
        ([key, value]) => !Object.hasOwn(DEFAULT_WEIGHTS, key) || !Number.isFinite(value) || value < 0 || value > 100
      )) {
        return sendJson(res, 400, { error: 'Weights must be finite numbers between 0 and 100.' });
      }
      if (targetEntry.planet === 'Earth') return sendJson(res, 400, { error: 'Select a Mars or Moon target.' });
      const rankedCandidates = rankEarthAnalogues(catalog.datasets, targetEntry, weightsReq);

      return sendJson(res, 200, {
        status: 'ok',
        indexLabel: 'Exploratory Analog Similarity Index',
        targetRegionId: targetEntry.siteId,
        targetDatasetId: targetEntry.datasetId,
        rankedCandidates,
      });
    }

    // 8. GET /api/research/point-query
    if (pathname === '/api/research/point-query' && req.method === 'GET') {
      const datasetId = urlObj.searchParams.get('datasetId') || 'earth-yungay-nasadem-30m';
      const row = Number(urlObj.searchParams.get('row') || NaN);
      const col = Number(urlObj.searchParams.get('col') || NaN);
      const entry = findDataset(datasetId);
      if (!entry) {
        return sendJson(res, 404, { error: `Dataset ${datasetId} not found` });
      }
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= entry.gridHeight || col >= entry.gridWidth) {
        return sendJson(res, 400, { error: 'Row and column must identify a cell within this grid.' });
      }
      const bodyDir = entry.planet.toLowerCase();
      const elevJson = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/elevation/${datasetId}.json`));
      const slopeJson = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/slope/${datasetId}.slope.json`));
      const roughJson = readJsonSafe(path.join(DATA_ROOT, `processed/${bodyDir}/roughness/${datasetId}.roughness.json`));
      const idx = row * entry.gridWidth + col;

      if (!elevJson || !slopeJson || !roughJson) return sendJson(res, 503, { error: 'Processed terrain is missing or unreadable.' });
      const dem = { ...entry, id: datasetId };
      const modis = bodyDir === 'earth' ? readJsonSafe(path.join(TERRAINS_DIR, 'modis-mod11a2-lst.json'))?.sites?.[entry.siteId] : null;
      const diviner = entry.siteId === 'shackleton-rim' ? readJsonSafe(path.join(TERRAINS_DIR, 'diviner-pcp-southpole.json')) : null;
      const sample = createTemperatureSampler(dem, modis, diviner)(row, col);

      return sendJson(res, 200, {
        status: 'ok',
        datasetId,
        siteId: entry.siteId,
        row,
        col,
        elevationMeters: elevJson?.values?.[idx] ?? null,
        slopeDegrees: slopeJson?.values?.[idx] ?? null,
        roughnessMeters: roughJson?.values?.[idx] ?? null,
        temperatureCelsius: sample?.celsius ?? null,
        temperatureKelvin: sample?.kelvin ?? null,
        temperatureAvailable: sample !== null,
        temperatureNote: entry.temperatureSummary.reasonUnavailable || entry.temperatureSummary.datasetName,
        certificationTelemetry: null,
      });
    }

    // 8b. GET /api/research/certification
    if (pathname === '/api/research/certification' && req.method === 'GET') {
      const datasetId = urlObj.searchParams.get('datasetId') || '';
      return sendJson(res, 404, { error: 'Validated base certification rasters are unavailable.', datasetId });
    }

    // 9. POST /api/research/export
    if (pathname === '/api/research/export' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, {
        status: 'ok',
        exportId: `NASA-ANALOG-${Date.now()}`,
        exportedAt: new Date().toISOString(),
        disclaimer: 'Exploratory Analog Similarity Index — Earth analogs share specific geomorphological or thermal traits with lunar/Martian targets but never replicate atmospheric vacuum/CO₂, radiation, or reduced gravity.',
        payload: body,
      });
    }

    return sendJson(res, 404, { error: 'Unknown scientific endpoint.' });
  };
  return async (req, res, next) => {
    try {
      await handle(req, res, next);
    } catch (error) {
      const status = error.statusCode ?? 500;
      sendJson(res, status, { error: status === 500 ? 'Scientific analysis failed.' : error.message });
    }
  };
}
