import { fromUrl } from 'geotiff';
import proj4 from 'proj4';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('public/data/terrains');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Define UTM Zone 19S (EPSG:32719) for Yungay, Atacama Desert, Chile
proj4.defs('EPSG:32719', '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs');

const GRID_SIZE = 128;
const CELL_SIZE_M = 30;
const EXTENT_M = GRID_SIZE * CELL_SIZE_M; // 3840 m x 3840 m

// ============================================================================
// 1. EARTH: Yungay, Atacama Desert, Chile (Copernicus DEM GLO-30)
// ============================================================================
async function buildYungayEarth() {
  const url = 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S25_00_W070_00_DEM/Copernicus_DSM_COG_10_S25_00_W070_00_DEM.tif';
  console.log('1. Fetching Copernicus GLO-30 COG for Yungay, Atacama...');
  const tiff = await fromUrl(url);
  const img = await tiff.getImage(0);
  const [ox, oy] = img.getOrigin(); // [-70, -24]
  const [rx, ry] = img.getResolution(); // [+1/3600, -1/3600]

  const centerLon = -69.91506944; // 69°54'54.25"W
  const centerLat = -24.0848;     // 24°05'05.28"S
  const [centerEasting, centerNorthing] = proj4('EPSG:4326', 'EPSG:32719', [centerLon, centerLat]);

  const halfExtent = EXTENT_M / 2;
  const utmMinX = Math.round(centerEasting - halfExtent);
  const utmMaxX = utmMinX + EXTENT_M;
  const utmMinY = Math.round(centerNorthing - halfExtent);
  const utmMaxY = utmMinY + EXTENT_M;

  // Compute WGS84 bbox covering all 4 UTM corners (with 2-pixel padding)
  const cornersWgs = [
    proj4('EPSG:32719', 'EPSG:4326', [utmMinX, utmMinY]),
    proj4('EPSG:32719', 'EPSG:4326', [utmMaxX, utmMinY]),
    proj4('EPSG:32719', 'EPSG:4326', [utmMinX, utmMaxY]),
    proj4('EPSG:32719', 'EPSG:4326', [utmMaxX, utmMaxY]),
  ];
  const lonMin = Math.min(...cornersWgs.map(c => c[0]));
  const lonMax = Math.max(...cornersWgs.map(c => c[0]));
  const latMin = Math.min(...cornersWgs.map(c => c[1]));
  const latMax = Math.max(...cornersWgs.map(c => c[1]));

  const colStart = Math.max(0, Math.floor((lonMin - ox) / rx) - 2);
  const colEnd = Math.min(img.getWidth(), Math.ceil((lonMax - ox) / rx) + 2);
  const rowStart = Math.max(0, Math.floor((latMax - oy) / ry) - 2);
  const rowEnd = Math.min(img.getHeight(), Math.ceil((latMin - oy) / ry) + 2);

  const wWidth = colEnd - colStart;
  const wHeight = rowEnd - rowStart;
  console.log(`  Reading native window [${colStart}, ${rowStart}, ${colEnd}, ${rowEnd}] (${wWidth}x${wHeight})...`);
  const rasters = await img.readRasters({ window: [colStart, rowStart, colEnd, rowEnd] });
  const srcData = rasters[0];

  // Bilinearly project onto 128x128 30.0m EPSG:32719 grid (row 0 = North/top, col 0 = West/left)
  const elevations = new Array(GRID_SIZE * GRID_SIZE);
  let validCount = 0;
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let r = 0; r < GRID_SIZE; r++) {
    const north = utmMaxY - (r + 0.5) * CELL_SIZE_M;
    for (let c = 0; c < GRID_SIZE; c++) {
      const east = utmMinX + (c + 0.5) * CELL_SIZE_M;
      const [lon, lat] = proj4('EPSG:32719', 'EPSG:4326', [east, north]);
      const px = (lon - ox) / rx - colStart;
      const py = (lat - oy) / ry - rowStart;

      const x0 = Math.floor(px);
      const y0 = Math.floor(py);
      const x1 = Math.min(wWidth - 1, Math.max(0, x0 + 1));
      const y1 = Math.min(wHeight - 1, Math.max(0, y0 + 1));
      const cx0 = Math.min(wWidth - 1, Math.max(0, x0));
      const cy0 = Math.min(wHeight - 1, Math.max(0, y0));
      const fx = Math.max(0, Math.min(1, px - x0));
      const fy = Math.max(0, Math.min(1, py - y0));

      const v00 = srcData[cy0 * wWidth + cx0];
      const v10 = srcData[cy0 * wWidth + x1];
      const v01 = srcData[y1 * wWidth + cx0];
      const v11 = srcData[y1 * wWidth + x1];

      if ([v00, v10, v01, v11].every(v => Number.isFinite(v) && v > -500 && v < 9000)) {
        const val =
          v00 * (1 - fx) * (1 - fy) +
          v10 * fx * (1 - fy) +
          v01 * (1 - fx) * fy +
          v11 * fx * fy;
        const rounded = Math.round(val * 100) / 100;
        elevations[r * GRID_SIZE + c] = rounded;
        validCount++;
        if (rounded < minElev) minElev = rounded;
        if (rounded > maxElev) maxElev = rounded;
      } else {
        elevations[r * GRID_SIZE + c] = null;
      }
    }
  }

  console.log(`  Yungay grid complete: ${validCount}/${GRID_SIZE * GRID_SIZE} valid, min=${minElev}m, max=${maxElev}m`);

  // Fetch matching georeferenced satellite imagery from Esri World Imagery (EPSG:4326 bbox)
  let imageryFile = null;
  try {
    const esriUrl = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${lonMin},${latMin},${lonMax},${latMax}&bboxSR=4326&imageSR=4326&size=512,512&format=jpg&f=image`;
    const imgResp = await fetch(esriUrl);
    if (imgResp.ok && imgResp.headers.get('content-type')?.includes('image')) {
      const buf = Buffer.from(await imgResp.arrayBuffer());
      fs.writeFileSync(path.join(OUT_DIR, 'yungay-imagery.jpg'), buf);
      imageryFile = '/data/terrains/yungay-imagery.jpg';
      console.log(`  Saved Yungay satellite imagery (${buf.length} bytes)`);
    } else {
      console.log('  Esri World Imagery response:', imgResp.status, imgResp.headers.get('content-type'));
    }
  } catch (e) {
    console.log('  Could not fetch Esri imagery:', e.message);
  }

  const dataset = {
    id: 'earth-yungay-copernicus-30m',
    planet: 'Earth',
    siteName: 'Yungay Station, Atacama Desert, Chile',
    shortName: 'Yungay (Atacama)',
    dataState: 'REAL_DATA',
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    cellSizeMeters: CELL_SIZE_M,
    extentMeters: [EXTENT_M, EXTENT_M],
    nativeResolutionLabel: '1 arc-second (~30.9 m N-S x 28.2 m E-W)',
    analysisResolutionLabel: '30.0 m x 30.0 m (EPSG:32719 UTM 19S)',
    crs: 'EPSG:32719 (resampled from native EPSG:4326)',
    nativeCrs: 'EPSG:4326 (WGS 84)',
    verticalDatum: 'EGM2008 orthometric height (Digital Surface Model)',
    isSurfaceModel: true,
    units: 'meters',
    bounds: {
      projected: [utmMinX, utmMinY, utmMaxX, utmMaxY],
      geographic: [lonMin, latMin, lonMax, latMax],
      center: { lat: centerLat, lon: centerLon, label: "24°05'05.28\"S, 69°54'54.25\"W" },
    },
    stats: {
      validCells: validCount,
      totalCells: GRID_SIZE * GRID_SIZE,
      coveragePercent: Math.round((validCount / (GRID_SIZE * GRID_SIZE)) * 1000) / 10,
      minElevation: minElev,
      maxElevation: maxElev,
      reliefMeters: Math.round((maxElev - minElev) * 100) / 100,
    },
    imagery: imageryFile
      ? {
          url: imageryFile,
          source: 'Esri World Imagery (Maxar / Earthstar Geographics)',
          attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          bboxGeographic: [lonMin, latMin, lonMax, latMax],
          note: 'Georeferenced RGB optical overlay matched to geographic extent; acquisition date varies by mosaic tile.',
        }
      : null,
    provenance: {
      datasetName: 'Copernicus DEM GLO-30 (DGED / COG)',
      provider: 'European Space Agency (ESA) / Copernicus Programme',
      instrumentOrMission: 'TanDEM-X / TerraSAR-X radar interferometry',
      originalUrl: 'https://doi.org/10.5270/esa-c5d3d65',
      cogUrl: url,
      productId: 'Copernicus_DSM_COG_10_S25_00_W070_00_DEM',
      acquisitionRange: '2011–2015 (TanDEM-X mission); 2022 COG release',
      processingPerformed: 'Bounded subset extraction via HTTP range read and bilinear reprojection from EPSG:4326 (1 arcsec) to 30.0 m EPSG:32719 UTM Zone 19S grid.',
      resamplingMethod: 'Bilinear interpolation onto 30.0 m metric grid',
      limitations: 'Digital Surface Model (DSM) including surface structures/vegetation where present rather than bare-earth DTM; ~30 m horizontal resolution resolves macro-landforms but not sub-meter rover obstacles.',
    },
    elevations,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'yungay-atacama-30m.json'), JSON.stringify(dataset));
  console.log('  Wrote public/data/terrains/yungay-atacama-30m.json');
}

// ============================================================================
// 2. MARS: Gale Crater — Murray Buttes / Vera Rubin Ridge (USGS MSL 1m DEM)
// ============================================================================
async function buildGaleMars() {
  const demUrl = 'https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif';
  const hiriseUrl = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif';
  console.log('\n2. Fetching USGS MSL Gale Merged DEM 1m v3 (30m resampled subset)...');

  const tiff = await fromUrl(demUrl);
  const img = await tiff.getImage(0);
  const [ox, oy] = img.getOrigin(); // [8127993.992786024, -244781.575189438]
  const nodata = img.getGDALNoData();

  const xMin = 8141500;
  const xMax = xMin + EXTENT_M; // 8145340
  const yMax = -278500;
  const yMin = yMax - EXTENT_M; // -282340

  const col0 = Math.round(xMin - ox);
  const row0 = Math.round(oy - yMax);

  // Mars Equirectangular R = 3396190 m -> convert bounds to planetocentric lat/lon
  const R_MARS = 3396190.0;
  const mPerDeg = (Math.PI / 180) * R_MARS;
  const lonMin = xMin / mPerDeg;
  const lonMax = xMax / mPerDeg;
  const latMin = yMin / mPerDeg;
  const latMax = yMax / mPerDeg;
  const centerLat = (latMin + latMax) / 2;
  const centerLon = (lonMin + lonMax) / 2;

  const rowIndices = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const baseRow = row0 + r * CELL_SIZE_M;
    rowIndices.push(
      { gridRow: r, srcRow: baseRow + 7 },
      { gridRow: r, srcRow: baseRow + 22 }
    );
  }

  const rowAccum = Array.from({ length: GRID_SIZE }, () => new Float64Array(GRID_SIZE));
  const rowCounts = Array.from({ length: GRID_SIZE }, () => new Uint16Array(GRID_SIZE));

  async function readStripWithRetry(srcRow, retries = 4) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await img.readRasters({ window: [col0, srcRow, col0 + EXTENT_M, srcRow + 1] });
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(res => setTimeout(res, 300 * attempt));
      }
    }
  }

  const BATCH = 4;
  for (let i = 0; i < rowIndices.length; i += BATCH) {
    const slice = rowIndices.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async ({ gridRow, srcRow }) => {
        const rasters = await readStripWithRetry(srcRow);
        const f32 = rasters[0];
        for (let c = 0; c < GRID_SIZE; c++) {
          const cStart = c * CELL_SIZE_M;
          for (let dx = 0; dx < CELL_SIZE_M; dx++) {
            const v = f32[cStart + dx];
            if (Number.isFinite(v) && v !== nodata && v > -10000 && v < 10000) {
              rowAccum[gridRow][c] += v;
              rowCounts[gridRow][c] += 1;
            }
          }
        }
      })
    );
    if ((i / BATCH) % 8 === 0) {
      console.log(`  Mars DEM progress: ${Math.min(i + BATCH, rowIndices.length)}/${rowIndices.length} strips`);
    }
  }

  const elevations = new Array(GRID_SIZE * GRID_SIZE);
  let validCount = 0;
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cnt = rowCounts[r][c];
      if (cnt > 0) {
        const val = Math.round((rowAccum[r][c] / cnt) * 100) / 100;
        elevations[r * GRID_SIZE + c] = val;
        validCount++;
        if (val < minElev) minElev = val;
        if (val > maxElev) maxElev = val;
      } else {
        elevations[r * GRID_SIZE + c] = null;
      }
    }
  }

  console.log(`  Gale DEM grid complete: ${validCount}/${GRID_SIZE * GRID_SIZE} valid, min=${minElev}m, max=${maxElev}m`);

  // Extract matching HiRISE LRGB orthophoto subset from COG overview!
  let imageryFile = null;
  try {
    console.log('  Fetching matching HiRISE LRGB COG subset...');
    const hTiff = await fromUrl(hiriseUrl);
    const hImg0 = await hTiff.getImage(0);
    const [hx0, hy0] = hImg0.getOrigin(); // [8140000, -270000]
    const [hrx, hry] = hImg0.getResolution(); // [0.25, -0.25]
    const hW0 = hImg0.getWidth();
    const hH0 = hImg0.getHeight();

    // Find an RGB overview (samples === 3) close to ~4-8 m/px (avoiding 1-bit transparency mask IFDs!)
    const hCount = await hTiff.getImageCount();
    let chosenIdx = 0;
    for (let i = 0; i < hCount; i++) {
      const hi = await hTiff.getImage(i);
      if (hi.getSamplesPerPixel() !== 3) continue;
      const scale = hW0 / hi.getWidth();
      if (scale <= 16) chosenIdx = i;
    }
    const hImg = await hTiff.getImage(chosenIdx);
    const scaleX = hImg.getWidth() / hW0;
    const scaleY = hImg.getHeight() / hH0;

    const pxLeft = Math.max(0, Math.round(((xMin - hx0) / hrx) * scaleX));
    const pxRight = Math.min(hImg.getWidth(), Math.round(((xMax - hx0) / hrx) * scaleX));
    const pxTop = Math.max(0, Math.round(((yMax - hy0) / hry) * scaleY));
    const pxBottom = Math.min(hImg.getHeight(), Math.round(((yMin - hy0) / hry) * scaleY));

    console.log(`  Reading HiRISE overview[${chosenIdx}] (${hImg.getWidth()}x${hImg.getHeight()}) window [${pxLeft}, ${pxTop}, ${pxRight}, ${pxBottom}]`);
    const hRasters = await hImg.readRGB({
      window: [pxLeft, pxTop, pxRight, pxBottom],
      width: 512,
      height: 512,
      interleave: true,
    });
    // Write raw PPM and convert or write PNG via pure JS? Let's write a small raw RGBA JSON or PPM->PNG using Python PIL!
    const w = 512, h = 512;
    const ppmPath = path.join(OUT_DIR, 'gale-hirise.ppm');
    const header = Buffer.from(`P6\n${w} ${h}\n255\n`);
    const rgb = Buffer.alloc(w * h * 3);
    for (let p = 0; p < w * h; p++) {
      rgb[p * 3] = hRasters[p * 3];
      rgb[p * 3 + 1] = hRasters[p * 3 + 1];
      rgb[p * 3 + 2] = hRasters[p * 3 + 2];
    }
    fs.writeFileSync(ppmPath, Buffer.concat([header, rgb]));
    imageryFile = '/data/terrains/gale-hirise.jpg';
    console.log('  Wrote temporary gale-hirise.ppm for JPEG conversion');
  } catch (e) {
    console.log('  Could not extract HiRISE COG subset:', e.message);
  }

  const dataset = {
    id: 'mars-gale-murray-30m',
    planet: 'Mars',
    siteName: 'Gale Crater — Murray Buttes & Vera Rubin Ridge',
    shortName: 'Gale Crater (Murray / VRR)',
    dataState: 'REAL_DATA',
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    cellSizeMeters: CELL_SIZE_M,
    extentMeters: [EXTENT_M, EXTENT_M],
    nativeResolutionLabel: '1.0 m/pixel (merged HRSC/CTX/HiRISE)',
    analysisResolutionLabel: '30.0 m x 30.0 m (Mars Equirectangular clon=0)',
    crs: 'Mars_Equirectangular_clon0 (IAU Mars 2000 Sphere, R = 3,396,190 m)',
    nativeCrs: 'Mars_Equirectangular_clon0 (Planetocentric Lat, Positive East Lon)',
    verticalDatum: 'MOLA Areoid reference equipotential surface (meters)',
    isSurfaceModel: true,
    units: 'meters',
    bounds: {
      projected: [xMin, yMin, xMax, yMax],
      geographic: [
        Math.round(lonMin * 100000) / 100000,
        Math.round(latMin * 100000) / 100000,
        Math.round(lonMax * 100000) / 100000,
        Math.round(latMax * 100000) / 100000,
      ],
      center: {
        lat: Math.round(centerLat * 10000) / 10000,
        lon: Math.round(centerLon * 10000) / 10000,
        label: `${Math.abs(centerLat).toFixed(4)}°S, ${centerLon.toFixed(4)}°E (Planetocentric)`,
      },
      fullMosaicProjected: [8127993.99, -302221.58, 8160973.99, -244781.58],
    },
    stats: {
      validCells: validCount,
      totalCells: GRID_SIZE * GRID_SIZE,
      coveragePercent: Math.round((validCount / (GRID_SIZE * GRID_SIZE)) * 1000) / 10,
      minElevation: minElev,
      maxElevation: maxElev,
      reliefMeters: Math.round((maxElev - minElev) * 100) / 100,
    },
    imagery: imageryFile
      ? {
          url: imageryFile,
          source: 'USGS Astrogeology — MSL Gale HiRISE LRGB 25 cm Mosaic COG',
          attribution: 'NASA / JPL-Caltech / University of Arizona (HiRISE) / USGS Astrogeology Science Center',
          bboxProjected: [xMin, yMin, xMax, yMax],
          note: 'Georeferenced HiRISE LRGB orthophoto subset extracted from COG overview matched to exact DEM bounds.',
        }
      : null,
    provenance: {
      datasetName: 'Mars MSL Gale Merged DEM 1m v3',
      provider: 'USGS Astrogeology Science Center / NASA PDS',
      instrumentOrMission: 'MRO HiRISE + CTX + Mars Express HRSC + MGS MOLA reference',
      originalUrl: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m',
      cogUrl: demUrl,
      productId: 'MSL_Gale_DEM_Mosaic_1m_v3',
      acquisitionRange: 'Multi-mission MRO/MEX/MGS compilation (v3 release Nov 2022)',
      processingPerformed: 'Bounded 3.84 km x 3.84 km subset (x: 8141500..8145340, y: -282340..-278500) downsampled from 1.0 m native grid to 30.0 m common analysis grid.',
      resamplingMethod: 'Stratified block-mean aggregation (2 x 30 = 60 native 1 m samples averaged per 30 m cell)',
      limitations: 'Downsampling from 1 m to 30 m removes meter-scale rover hazards and boulders while aligning spatial support with Copernicus GLO-30; vertical heights are relative to MOLA Areoid, not Earth EGM2008.',
    },
    elevations,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'gale-murray-30m.json'), JSON.stringify(dataset));
  console.log('  Wrote public/data/terrains/gale-murray-30m.json');
}

await buildYungayEarth();
await buildGaleMars();

