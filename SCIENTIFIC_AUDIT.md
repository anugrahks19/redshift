# Redshift scientific engineering audit

## Repository and execution

The deployable site combines the Vite landing app in `frontend_two copy` and the React Router lab in `analog/analog`. The root Vite project is a standalone prototype. The lab routes are `/analog/`, `/analog/explore`, `/analog/explore/launch-mission`, `/analog/mission` (redirect), `/analog/learn` (Terraform), and `/analog/research`.

The Node scientific API lives in `scripts/scientific-api-middleware.mjs` and runs through the local Vite development or combined preview server. Render is configured as static hosting. The deployed browser can load its bundled catalog and execute the same ranking module locally. The static host has no Node API runtime. The supplied folder has no Git metadata.

## Data provenance and limits

| Product and provider | Bundled evidence | Resolution, conversion and use |
| --- | --- | --- |
| NASADEM_HGT V001, NASA JPL / LP DAAC | `analog/analog/public/data/terrains/*nasadem*.json`, source tiles in each provenance record | 1 arc-second source resampled to 30 m UTM. Yungay, Death Valley, Mauna Kea, Río Tinto. Elevation in m, derived slope in degrees, terrain ruggedness in m. Outside coverage at McMurdo and Askja. |
| Copernicus GLO-30, ESA / Copernicus | `mcmurdo-dry-valleys-30m.json`, `askja-iceland-30m.json`, optional Yungay DSM | 1 arc-second surface heights, resampled to 30 m in local UTM. EGM2008 vertical datum. McMurdo is the S78 E161 tile. |
| MOD11A2 / MYD11A2 v061, NASA Terra / Aqua MODIS | `modis-mod11a2-lst.json` | 8-day day/night surface temperature on ~926.6 m sinusoidal cells. Celsius = DN × 0.02 − 273.15. Fill/invalid values become null. Granule and dates are per site. Legacy window positions reconstructed from the original extraction coordinates and granule tile indices. McMurdo has daytime coverage in part of the DEM footprint. Its default center cell is masked. |
| LRO LOLA LDEM_75S_30M and LDEM_64, NASA GSFC / PDS | `moon-*-lola.json` and PDS labels in `datasets/raw-nasa-archives` | Shackleton 30 m south polar stereographic subset, Marius and Tranquillitatis 473.8 m nominal cylindrical grids. Signed DN × 0.5 m height relative to a 1,737,400 m reference sphere. LOLA acquisition range recorded in the bundled provenance. |
| LRO Diviner PCP, UCLA / NASA PDS | `diviner-pcp-southpole.json`, `PCP_AVG_TBOL_POLS_SUM_LTIM01_240.LBL` | 240 m bolometric brightness temperature bins, southern summer, 00:00–00:15 local time, observations from July 2009 to February 2019. Values in kelvin, omitted bins preserved as null. 41.72–223.86 K are extrema of the bundled crop. They do not establish which candidate is permanently shadowed. |
| MGS MOLA MEGDR MEGT90N000EB, NASA PDS | `mars-jezero-mola-megdr.json` and corresponding PDS label | Signed 16-bit m relative to Mars areoid, 3.705 km/px nominal equatorial spacing, 128×128 regional sample. Jezero-scale overlays cannot resolve landing hazards. |
| Gale merged DEM, USGS Astrogeology | `gale-murray-30m.json` and `gale-bradbury-30m.json` | Regional 3.84 km cuts from the 1 m Gale DEM mosaic downsampled to 30 m. Separate RGB images are context imagery. |

Terrain input metadata including bounds, CRS, vertical datum, source product, resampling, and coverage is in `data/raw/*/*.meta.json`. The checked-in source snapshots are windowed JSON products and selected labels/binary excerpts. This audit checks the bundled artifacts and extraction logic. It does not independently reproduce every upstream download, checksum, or source quality mask.

### Supplementary products

- The TES archive contains thermal inertia windows. Local Mars temperature and equatorial lunar temperature bundles use modeled extrapolations and reference values. They are unavailable in the measurement and ranking paths. Mars Explore offers a separate −65 °C planetary reference from NASA Science.
- The LOLA archive includes Sun/Earth visibility and sky-view excerpts. The old generation script altered the raw fractions using elevation and temperature. Those adjusted values are excluded. Earth visibility alone would still need link/relay assumptions to represent communications coverage.
- LEND and MSL DAN excerpts do not support the per-cell WEH values in the old output. The generator uses temperature, height and regional assumptions. Radiation is a scaled reference dose model. Polar rock abundance and bearing capacity were derived from terrain heuristics. The active API and UI present those quantities as unavailable. The archived scripts and bundles remain available for provenance review.
- The five core datasets cannot independently certify a permanent lunar base as safe.

## Scientific and implementation changes

- `terrainMetrics.mjs` computes Horn slope, downslope aspect and Riley TRI for both the browser and batch pipeline. A complete 3×3 neighborhood is required. Previous code used different mean-absolute and RMS roughness formulas and the pipeline filled missing neighbors. Existing coarse-grid derivatives still use nominal metric spacing and depend on source resolution.
- `thermalSampling.mjs` maps terrain cell centers into MODIS sinusoidal windows and Diviner polar bins, preserving missing pixels. Previously Explore, Terraform, Research and point-query could stretch arrays, use site means to fill gaps or generate temperatures from terrain. The API returns the same cell sampler values.
- `comparativeSimulationEngine.ts` and the mission page use exact free-fall timing for the 3D motion and round results for display. Ratio output requires identical drop objects and heights. Earth/Mars/Moon gravity constants are representative. The renderer exaggerates terrain vertically for readability.
- Mars reference pressure is 6.36 mbar at mean radius, oxygen is 0.16% by volume, and ambient oxygen partial pressure is about 0.001018 kPa. Yungay's 905 mbar is a scenario estimate. EVA pressure and gas fractions are educational assumptions with explicit seal, oxygen and carbon-dioxide removal conditions. The 4-second thermal constant belongs to the accelerated demonstration clock.
- Terraform ranks the supported Earth catalog from regional relief/elevation variability, Horn slope and Riley TRI. It renormalizes selected supported weights and leaves temperature-only results unscored. No matched thermal observation context is bundled. Research similarity is a separate cell-offset comparison within a selected region pair. Its pixels are not a global discovery map or geographically corresponding points.
- The API validates JSON, weights and terrain coordinates, reports unavailable layers and missing required catalog files, and caches JSON by size and modification time. Raster requests expose a whole region at 0/0/0. Research generates similarity in the browser.

Sources: [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html), [NASA Solar System Temperatures](https://science.nasa.gov/resource/solar-system-temperatures/), [NASA MODIS product](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD11A2/), [PDS Diviner archive](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm), [PDS LOLA visibility archive](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/extras/illumination/img/).

## Run locally

From PowerShell with Node 22.20:

```powershell
Set-Location D:\redshift-main
npm ci --prefix analog/analog
npm ci --prefix "frontend_two copy"
npm run site:dev
```

Open `http://localhost:5173/analog/`. For the lab and local scientific API with hot reload, run `npm run dev --prefix analog/analog -- --port 4178` and open `http://localhost:4178/`.

```powershell
node analog/analog/scripts/build-scientific-pipeline.mjs
node --test scripts/scientific.test.mjs
npm run typecheck --prefix analog/analog
npm run site:build
npm run preview --prefix "frontend_two copy" -- --port 4179
```

The pipeline defaults to the bundled data. `--refresh-sources` enables the supplemental Earth downloads. Production artifacts are generated under `frontend_two copy/dist/`, with the lab copied to `frontend_two copy/public/analog/` and data to `frontend_two copy/public/data/`.

## Verification and acceptance status

- PASS: The Node scientific suite covers ideal gravity, invalid heights, pressure and oxygen conversion, terrain edge/no-data behavior, MODIS and Diviner sampling, certification gaps, weights, and local API success and error cases.
- PASS: The processing pipeline regenerated the elevation, slope, roughness and catalog products from the bundled inputs. The root prototype and both deployable Vite applications built. Bundle-size warnings remain.
- PASS: Chrome exercised both gravity runs in each mission, the Mars protection controls, the Mars temperature reference, and all four Shackleton pins. These checks observed Earth-to-Mars and Earth-to-Moon fall-time ratios of 1.62× and 2.46× respectively.
- PASS: Chrome exercised Terraform discovery for Mars and Moon. An additional run forced the API requests to return 404 and verified the bundled catalog fallback and browser history. Automated calculations verified that changing weights changes the scores.
- PASS: Chrome exercised Research layer controls. Individual raster values and missing data are covered by the API and grid tests.
- PASS: Direct route loads at desktop, tablet and mobile sizes after fixing the WebGL overlay error and Terraform overflow. The successful Chrome smoke run reported no page errors.
- NOT TESTED: Every route interaction, both thermal experiments through completion on each side, every Research layer/opacity/site combination, a live hosting deployment, malformed files injected into the production checkout, and an independent upstream data re-download. These remain outside the verified acceptance scope.
- PASS: Research Save Analysis downloaded a populated JSON file in Chrome. The Markdown report modal opened.

## Expanded Terraform catalog

Terraform ranks all 18 bundled Earth windows. The 12 additions are sourced 3.84 km × 3.84 km Copernicus GLO-30 windows resampled to a 30 m UTM grid. Each entry links to its source DEM and the additions also link to NASA, USGS, ESA or the field study that documents the analog context. Source coordinates and citations are in `analog/analog/src/data/terraformAnalogSites.json`. Run `node analog/analog/scripts/build-scientific-pipeline.mjs --expand-terraform` to fetch missing copies and regenerate the catalog.

The curtain compares terrain windows visually. It reports each window's width because target grids can cover different areas. Similarity scores describe terrain statistics from the bundled windows and depend on their extent and resolution.
