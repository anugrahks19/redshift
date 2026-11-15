import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { createScientificApiMiddleware } from './scientific-api-middleware.mjs';
import { deriveTerrainMetrics } from '../analog/analog/src/services/terrainMetrics.mjs';
import { createTemperatureSampler } from '../analog/analog/src/services/thermalSampling.mjs';
import { rankEarthAnalogues } from '../analog/analog/src/services/analogRanking.mjs';

const fromRoot = (name) => new URL('../' + name, import.meta.url);
const fixture = (name) => JSON.parse(readFileSync(fromRoot('analog/analog/public/data/' + name), 'utf8'));
const engineUrl = fromRoot('analog/analog/src/services/comparativeSimulationEngine.ts');
const engineSource = (await readFile(engineUrl, 'utf8')).replace(
  './thermalSampling.mjs', new URL('./thermalSampling.mjs', engineUrl).href
);
const outputText = stripTypeScriptTypes(engineSource);
const engine = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('free fall uses full precision and reaches impact across the three environments', () => {
  for (const [side, mission, g] of [
    ['earth', 'mission-1-mars', 9.80665],
    ['planet', 'mission-1-mars', 3.72076],
    ['planet', 'mission-2-moon', 1.622],
  ]) {
    const r = engine.calculateGravityDrop(side, mission, 'basalt-sphere', 12);
    assert.equal(r.fallTimeSeconds, Math.sqrt(24 / g));
    assert.ok(Math.abs(r.finalVelocityMs - Math.sqrt(24 * g)) < 1e-12);
    assert.ok(Math.abs(r.impactEnergyJoules - 2.5 * g * 12) < 1e-10);
    assert.equal(engine.evaluateFreeFallAtTime(12, g, r.fallTimeSeconds).currentHeightMeters, 0);
    assert.equal(engine.evaluateFreeFallAtTime(12, g, r.fallTimeSeconds / 2).impacted, false);
  }
  for (const height of [0, -1, 51, NaN, null, undefined]) {
    assert.throws(() => engine.calculateGravityDrop('earth', 'mission-1-mars', 'basalt-sphere', height), RangeError);
  }
});

test('pressure conversion, partial pressure, Armstrong limit and suit assumptions', () => {
  const atmosphere = (side, active, pressure) => engine.evaluateAtmosphereExperiment(side, 'mission-1-mars', active, pressure);
  assert.ok(Math.abs(atmosphere('earth', false, 29.6).outsideOxygenPartialPressureKpa - 18.95975) < 1e-10);
  const mars = atmosphere('planet', false, 29.6);
  assert.equal(mars.aboveArmstrongLimit, false);
  assert.ok(Math.abs(mars.outsideOxygenPartialPressureKpa - 0.0010176) < 1e-10);
  assert.equal(atmosphere('planet', true, 29.6).suitOxygenPartialPressureKpa, 29.6);
  assert.match(atmosphere('planet', true, 0).lifeSupportStatus, /^CRITICAL/);
});

test('Horn slope and Riley TRI use a complete metric neighborhood', () => {
  const dem = { gridWidth: 3, gridHeight: 3, cellSizeMeters: 2, elevations: [0, 2, 4, 0, 2, 4, 0, 2, 4] };
  const metrics = deriveTerrainMetrics(dem);
  assert.equal(metrics.slopeDegrees[4], 45);
  assert.equal(metrics.aspectDegrees[4], 270);
  assert.equal(metrics.roughnessTriMeters[4], 4.9);
  assert.equal(metrics.slopeDegrees[0], null);
  dem.elevations[0] = null;
  assert.equal(deriveTerrainMetrics(dem).roughnessTriMeters[4], null);
});

test('grids in the catalog match bundled data and source-aligned temperatures preserve no-data', () => {
  const catalog = fixture('processed/scientific-catalog.json');
  for (const entry of Object.values(catalog.datasets)) {
    const dem = JSON.parse(readFileSync(fromRoot(`data/processed/${entry.planet.toLowerCase()}/elevation/${entry.datasetId}.json`)));
    assert.equal(dem.values.length, entry.gridWidth * entry.gridHeight);
    assert.ok(dem.values.every((value) => value === null || Number.isFinite(value)));
    assert.ok(entry.cellSizeMeters > 0 && entry.crs);
  }
  const modis = fixture('terrains/modis-mod11a2-lst.json');
  for (const [earth, site] of [['yungay-nasadem-30m', 'yungay-atacama'], ['mcmurdo-dry-valleys-30m', 'mcmurdo-dry-valleys']]) {
    const dem = fixture(`terrains/${earth}.json`);
    const sample = createTemperatureSampler(dem, modis.sites[site], null);
    assert.equal(sample(-1, 64), null);
    const value = Array.from({ length: 128 * 128 }, (_, i) => sample(Math.floor(i / 128), i % 128)).find(Boolean);
    if (site === 'mcmurdo-dry-valleys') assert.equal(sample(64, 64), null);
    assert.ok(value && modis.sites[site].dayLstCelsiusGrid.includes(value.celsius));
    assert.equal(value.kelvin, 273.15 + value.celsius);
  }
  const moon = fixture('terrains/moon-shackleton-lola.json');
  const diviner = fixture('terrains/diviner-pcp-southpole.json');
  const site = engine.inspectLunarBaseSite('alpha', 'Alpha', 64, 64, moon, deriveTerrainMetrics(moon), diviner, null);
  assert.equal(site.elevationMeters, moon.elevations[64 * 128 + 64]);
  assert.equal(site.waterIceWehPct, null);
  assert.equal(site.bearingCapacityKpa, null);
  assert.match(site.certificationVerdict, /cannot independently certify/);
});

test('ranking is reproducible, responds to weights and leaves temperature-only results unscored', () => {
  const { datasets } = fixture('processed/scientific-catalog.json');
  const target = datasets['moon-shackleton-lola'];
  const rank = (elevation, slope, roughness, temperature) => rankEarthAnalogues(datasets, target, { elevation, slope, roughness, temperature });
  assert.notDeepEqual(rank(1, 0, 0, 0).map(r => r.overallSimilarityScore), rank(0, 1, 0, 0).map(r => r.overallSimilarityScore));
  assert.ok(rank(1, 1, 1, 1).every((r) => Object.values(r.effectiveWeights).reduce((a,b) => a+b,0) === 1));
  assert.ok(rank(0, 0, 0, 1).every((r) => r.overallSimilarityScore === null));
});

test('scientific endpoints return finite data or explicit HTTP errors', async (t) => {
  const middleware = createScientificApiMiddleware();
  const server = createServer((req, res) => void middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}/api/`;
  const get = (path) => fetch(origin + path);
  const post = (path, body) => fetch(origin + 'research/' + path, { method: 'POST', body });
  for (const path of ['planetary-environment/earth', 'planetary-environment/mars', 'planetary-environment/moon',
    'research/sites', 'research/datasets', 'research/statistics', 'research/layers',
    'research/point-query?row=64&col=64', 'research/layers/elevation/tiles/0/0/0',
    'research/layers/slope/tiles/0/0/0', 'research/layers/roughness/tiles/0/0/0',
    'research/layers/temperature/tiles/0/0/0']) {
    const result = await get(path);
    assert.equal(result.status, 200, path);
    assert.ok(await result.json());
  }
  assert.equal((await get('research/point-query')).status, 400);
  assert.equal((await get('research/point-query?row=1.5&col=0')).status, 400);
  assert.equal((await get('research/point-query?row=0&col=0&datasetId=constructor')).status, 404);
  const edge = await (await get('research/point-query?row=0&col=0')).json();
  assert.equal(edge.slopeDegrees, null);
  assert.equal((await get('research/layers/temperature/tiles/0/0/0?datasetId=mars-jezero-mola-megdr')).status, 404);
  assert.equal((await get('research/certification')).status, 404);
  assert.equal((await post('similarity', '{"weights":{"slope":"x"}}')).status, 400);
  assert.equal((await post('similarity', '{')).status, 400);
  assert.equal((await post('similarity', '{}')).status, 200);
  assert.equal((await post('compare', '{}')).status, 200);
  assert.equal((await post('export', '{}')).status, 200);
});
