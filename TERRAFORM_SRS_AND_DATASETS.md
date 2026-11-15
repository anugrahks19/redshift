# Software Requirements Specification (SRS) & Dataset Selection Architecture
## Project: AstraTerra — TERRAFORM (Planetary Analog Mapping & Discovery)
**Challenge:** NASA Space Apps Challenge 2026 — *Identifying Earth Locations that Resemble Specific Environments on the Moon and Mars*  
**Document Version:** 1.0  
**Scope:** Transformation of `/analog/learn` into **TERRAFORM — Planetary Analog Mapping & Discovery**, plus full-platform NASA & International Space Agency Partner dataset allocation under hackathon time constraints.

---

## 1. Executive Summary & System Purpose

### 1.1 Purpose
**TERRAFORM** transforms the existing `/analog/learn` page from a static textbook/quiz page into an interactive **Planetary Analog Mapping & Discovery Workstation** while strictly preserving the existing AstraTerra dark-observatory design system, routing architecture, and sibling pages (`Overview`, `Explore`, `Research`).

### 1.2 Core User Workflow
```
[01 Select Moon/Mars Target Region]
        ↓
[02 Map 9 Scientific Surface Layers & Adjust Solar Geometry]
        ↓
[03 Filter & Locate Candidate Earth Analogs on Multi-Basemap GIS / 30m DEM]
        ↓
[04 Compare Measurable Parameters, Transects & Non-Equivalence Boundaries]
        ↓
[05 Generate & Download Annotated Comparison Map Plate (.PNG) & Dossier (.MD)]
```

### 1.3 Strict Architectural Guardrails
- **Single-Page Scope:** Only `analog/analog/src/pages/LearnPage.tsx` and the navigation label in `analog/analog/src/components/Layout/TopNav.tsx` (`Learn` → `TERRAFORM`) are modified.
- **Zero Fabricated Data:** Where 30 m digital elevation models (DEMs) are bundled locally (`earth-yungay-copernicus-30m`, `mars-gale-murray-30m`, `mars-gale-bradbury-30m`), quantitative pixel/cell measurements and Horn (1981) / Riley et al. (1999) derivatives are computed directly in the browser. Where local 30 m DEMs are not bundled (`jezero-delta`, Lunar regions, and the 6 non-Yungay Earth sites), the UI explicitly labels the view as `ORBITAL REFERENCE / LITERATURE PROFILE` and never fabricates synthetic grid numbers.
- **Physical Non-Equivalence Principle:** Every comparison table, callout, and exported map plate explicitly states why Earth is **never** an exact environmental equivalent of the Moon or Mars (differences in surface gravity, atmospheric pressure/composition, galactic cosmic radiation, and cryogenic vacuum).

---

## 2. Functional Requirements Specification (TERRAFORM `/analog/learn`)

### FR-01: Interactive Planetary Surface Map (Moon & Mars)
- **FR-01.1 Target Body Selector:** Toggle between **Mars** and **Moon** targets, synchronized with global `PlatformContext`.
- **FR-01.2 Regional Target Selector:**
  - **Mars:** *Gale Crater — Murray Buttes & Vera Rubin Ridge* (`30 m USGS DEM`), *Gale Crater — Bradbury Landing & Aeolis Palus* (`30 m USGS DEM`), *Jezero Crater — Western Fan Delta & Rim* (`Orbital Reference`).
  - **Moon:** *Lunar South Pole — Shackleton Rim & Connecting Ridge* (`Orbital Reference`), *Marius Hills / Aristarchus — Skylights & Sinuous Rilles* (`Orbital Reference`), *Mare Tranquillitatis — Ilmenite Basalt Regolith Plain* (`Orbital Reference`).
- **FR-01.3 Viewport Navigation:** Interactive zoom (`100%` to `275%`), click-and-drag panning when zoomed, coordinate graticule overlay, and metric scale bar (`1.0 km`).
- **FR-01.4 Point & Feature Inspection:**
  - Clicking any cell on a bundled 30 m DEM reports exact `Row/Col`, `Lat/Lon`, `MOLA Elevation (m)`, `Horn 3×3 Slope (°)`, `TRI 3×3 Roughness (m)`, and `% Shadowed Cells` at the current solar angle.
  - Clicking mapped geological waypoints (`F1–F3`, e.g., *Vera Rubin Ridge*, *Glen Torridon*, *Bradbury Landing*, *Shackleton PSR Floor*, *Marius Hills Pit Skylight*) displays peer-reviewed mineralogical, thermal, and structural observations.

### FR-02: Interactive Earth Analog Map & Candidate Discovery
- **FR-02.1 Dual Visualization Modes:**
  1. **Global Interactive GIS Map (Leaflet):** Supports pan/zoom across all 7 verified terrestrial analog sites (*Yungay Station Atacama*, *Death Valley*, *Askja & Krafla Highlands*, *Haughton Impact Structure*, *McMurdo Dry Valleys*, *Río Tinto Basin*, *Mauna Kea Tephra Slopes*) with switchable satellite and topographic tile layers:
     - *Esri / Maxar World Imagery* (high-resolution optical satellite)
     - *NASA GIBS / Worldview Blue Marble Next Generation* (WMTS orbital reflectance)
     - *OpenTopoMap (NASA SRTM Contours)*
  2. **Local 30 m DEM Grid Canvas (Copernicus GLO-30):** Renders the 128×128 (`3.84 km × 3.84 km`) Yungay Station DEM using the exact same 9 scientific layer algorithms as the planetary map for 1:1 scale comparison.
- **FR-02.2 Measurable Characteristic Filtering:** Interactive filter toggles (`Mineralogy >=80`, `Slope/Rover >=80`, `Arid/Cryo >=75`, `Subsurface >=75`, `Logistics >=80`) dynamically highlight matching candidate markers with teal rings on the Leaflet map and rank candidates in the selection strip.

### FR-03: 9 Selectable Scientific Mapping Layers
Each layer updates both the Planetary and Earth DEM canvases, the dynamic color-scale legend, units, and scientific interpretation panel:

| Layer ID | Layer Name | Units | Mathematical / Scientific Derivation | Primary NASA / Partner Sources |
| :--- | :--- | :--- | :--- | :--- |
| `elevation` | **Elevation** | `m` (datum-relative) | Hypsometric relief + 25 m minor / 100 m index isoline contours | ESA Copernicus GLO-30, USGS Gale 1m→30m DEM, NASA MGS MOLA, LRO LOLA |
| `slope` | **Slope** | `°` (degrees) | Horn (1981) 3×3 finite-difference surface gradient | Copernicus GLO-30, USGS Gale DEM, LRO LOLA Slope |
| `roughness` | **Surface Roughness** | `m` (TRI 90×90 m) | Riley et al. (1999) 8-neighbor mean elevation difference | Copernicus GLO-30 TRI, CSA RADARSAT-1 / Sentinel-1 SAR, LOLA RMS |
| `morphology` | **Terrain Morphology** | Landform Class | Slope + relative relief classification (*Basin Floor*, *Pediment*, *Fan Slope*, *Scarp/Rim*) | LROC WAC/NAC, MRO CTX/HiRISE, Sentinel-2 |
| `craters` | **Crater Distribution** | Rim / Depression Index | Laplacian local curvature (`z - z̄₄`) + cataloged impact/pit rim waypoints | LROC NAC/WAC, HiRISE Crater Catalog, CSA RADARSAT Haughton SAR |
| `temperature` | **Surface Temperature** | `°C` / `K` | Diurnal skin thermal model modulated by solar incidence & elevation lapse | NASA LRO Diviner, Mars Odyssey THEMIS, MSL REMS, NASA MODIS/ECOSTRESS |
| `solar` | **Solar Exposure** | `W/m²` | Cosine incidence irradiance (`S₀ · cos θᵢ`) from adjustable Sun Elevation & Azimuth | LRO LOLA Polar Illumination, MSL REMS UV, NASA POWER / CERES |
| `shadows` | **Shadow Patterns** | Cast / Grazing Mask | 28-step directional horizon ray-marching across the DEM grid at `1.5°–75°` sun elevation | LRO Diviner/LOLA PSR Atlas, USGS Gale DEM Ray-Caster |
| `surface` | **Surface Characteristics** | Lithology / Hydration | Stratigraphic & slope-linked mineral zones (smectite clays, sulfates, hematite, basalt) | MRO CRISM, MSL CheMin, ESA Sentinel-2 SWIR, Azua-Bustos et al. (2020) |

### FR-04: Earth-to-Planet Scientific Comparison & Transect Profiler
- **FR-04.1 Side-by-Side Parameter Matrix:** Compares Elevation & Datum, Horn Slope (`°`), TRI Roughness (`m`), Terrain Morphology, Surface Mineralogy, Diurnal Temperature (`°C / K`), Solar Exposure (`W/m²`), and Gravity/Pressure (`m/s²`, `mbar`) with explicit status badges (`MEASURED 30M PARITY`, `CRITICAL DATUM DIFFERENCE`, `NON-EQUIVALENT BOUNDARY`).
- **FR-04.2 Datum Hygiene:** Explicitly blocks raw elevation subtraction between Earth (`EGM2008 Geoid`) and Mars (`MOLA Areoid`) or the Moon (`1,737.4 km Radius`), restricting cross-body delta profiles to relative local relief (`Δm` above minimum) and datum-invariant slope (`°`).
- **FR-04.3 Synchronized 3.84 km Transect:** Interactive `W–E`, `N–S`, and `NW–SE` cross-section profiler with adjustable slice position (`10%–90%`).

### FR-05: Annotated Analog Comparison Map Generator
- **FR-05.1 Live 1600×1020 Canvas Plate:** Renders a publication-ready side-by-side comparison plate combining the active Planetary Map, active Earth Analog Map, custom title and investigator annotation, active layer color legend, 7-row parameter table, non-equivalence warning, and dataset citations.
- **FR-05.2 One-Click Exports:**
  - Download high-resolution PNG (`TERRAFORM-<region>-<earthSite>-<layer>.png`).
  - Download structured Markdown dossier (`TERRAFORM-Dossier-<region>-<earthSite>.md`).

---

## 3. Evaluation of Provided NASA & Partner Space Agency Resources (What to Use vs. Defer Under Time Constraints)

Given hackathon time constraints and browser-only static hosting (Render static site, zero backend), we evaluated every provided NASA, CSA, ESA, and JAXA portal and assigned each to a concrete integration tier:

### 3.1 Resource-by-Resource Triage

| Agency & Resource | Portal / Dataset | Decision | Why & How It Is Used in AstraTerra |
| :--- | :--- | :--- | :--- |
| **NASA Earthdata Search** | `search.earthdata.nasa.gov` | **USE (Tier 1 Reference & SRTM/MODIS Provenance)** | Primary citation source for SRTM 30 m topography (Death Valley, Mauna Kea) and MODIS/ECOSTRESS land surface temperature ranges. |
| **NASA Worldview / GIBS** | `worldview.earthdata.nasa.gov` | **USE LIVE (Tier 1 Tile Layer)** | Integrated directly into **TERRAFORM** as a live switchable Leaflet WMTS tile layer (`BlueMarble_NextGeneration` via `gibs.earthdata.nasa.gov`) — zero API key or backend required. |
| **NASA Planetary Data System (PDS)** | `pds.nasa.gov` | **USE (Tier 1 Core Archive)** | Authoritative archive backing our bundled Gale Crater MSL Curiosity records (`CheMin`, `SAM`, `REMS`), Mars 2020 Jezero profiles, and MGS MOLA datum definitions. |
| **NASA Lunar Reconnaissance Orbiter (LRO)** | `pds-geosciences.wustl.edu/missions/lro/` | **USE (Tier 1 Lunar Baseline)** | Provides the bundled global LROC WAC / LOLA lunar basemap (`moon-map.jpg`) and topographic/morphological parameters for Shackleton Rim, Marius Hills Skylights, and Mare Tranquillitatis. |
| **NASA LRO Diviner Lunar Radiometer** | `pds-geosciences.wustl.edu/missions/lro/diviner.htm` | **USE (Tier 1 Thermal & PSR Layer)** | Powers the **Surface Temperature** and **Shadow Patterns** layers for Lunar South Pole (Shackleton 40 K / -233 °C permanently shadowed cold traps vs. 220 K sunlit ridges). |
| **ESA Copernicus Data Space Ecosystem** | `dataspace.copernicus.eu` | **USE (Tier 1 Local 30m DEM & Spectral)** | Source of our bundled **Copernicus DEM GLO-30** (`yungay-atacama-30m.json`, 128×128 at 30 m spacing) and Sentinel-2 SWIR mineralogical context. |
| **CSA RADARSAT-1 & RCM Open Data** | `donnees-data.asc-csa.gc.ca` | **USE METADATA (Tier 2 Haughton Crater SAR)** | Haughton Impact Structure (Devon Island, Nunavut, Canada) is one of our core polar/impact analog sites. We integrate RADARSAT-1 / RCM C-band SAR backscatter context for Haughton crater-rim roughness and ice-rich breccia mapping without requiring heavy Python/QGIS SAR processing in the browser. |
| **CSA SAR Python Tutorial** | `github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial` | **DEFER (Offline Reference Only)** | Python/QGIS desktop workflow; not needed at runtime in a React/TypeScript browser app, though cited for offline SAR pre-processing methodology. |
| **ESA Open Science Catalog** | `opensciencedata.esa.int` | **USE METADATA (Tier 2 Citation)** | Referenced for European analog geochemistry (Río Tinto / Askja) and Copernicus GLO-30 provenance. |
| **JAXA G-Portal** | `gportal.jaxa.jp` | **DEFER / OPTIONAL CITATION (Tier 3)** | Useful for ALOS PRISM (AW3D30) and SELENE/Kaguya lunar lava-tube confirmation (Marius Hills skylight), cited in Marius Hills provenance; full G-Portal raster ingestion skipped due to time constraints. |

---

## 4. Page-by-Page Dataset Allocation Across the Entire Website

To avoid duplication and keep every page fast, scientifically rigorous, and distinct:

### Page 1: Animated Landing Experience (`/` — `frontend_two copy/`)
- **Purpose:** Visual storytelling, 3D orbital Earth/Moon/Mars reveal, and mission transit scrubbing.
- **Datasets Used:**
  - **Earth:** NASA DSCOVR EPIC full-disk image, NASA SVS Blue Marble (`earth-day.jpg`, `earth-clouds.jpg`), NASA Black Marble (`earth-night.jpg`).
  - **Moon:** NASA SVS CGI Moon Kit (LRO LOLA + LROC WAC global mosaic `moon-map.jpg`).
  - **Mars:** NASA/JPL Viking/MRO global color mosaic (`mars-map.jpg`).

### Page 2: Analog Lab Overview (`/analog/` — `HomePage.tsx`)
- **Purpose:** Entry hub orienting users between **Explore**, **Research**, and **TERRAFORM**.
- **Datasets Used:**
  - Bundled USGS Astrogeology Gale Crater HiRISE orthophoto (`gale-hirise.jpg`) and Yungay Station optical mosaic (`yungay-imagery.jpg`).

### Page 3: Guided Field Investigation (`/analog/explore` — `ExplorePage.tsx`)
- **Purpose:** 5-step guided mission brief (`Brief` → `Planetary target` → `Earth analogs` → `Compare` → `Decision`).
- **Datasets Used:**
  - **Mars:** Bundled 30 m USGS Gale Crater Merged DEMs (`gale-murray-30m.json`, `gale-bradbury-30m.json`) + HiRISE orthophotos.
  - **Moon:** LRO LROC WAC reference image (`moon-map.jpg`) + LRO LOLA / Diviner qualitative mission profiles.
  - **Earth:** Bundled 30 m ESA Copernicus GLO-30 DEM (`yungay-atacama-30m.json`) + live Esri/Maxar World Imagery Leaflet tiles.

### Page 4: TERRAFORM — Planetary Analog Mapping & Discovery (`/analog/learn` — `LearnPage.tsx`)
- **Purpose:** Interactive 9-layer scientific mapping, solar/shadow modeling, multi-basemap Earth discovery, and 1600×1020 annotated map plate generation.
- **Datasets Used:**
  - **Earth:**
    - *Local 30 m Raster:* ESA Copernicus DEM GLO-30 (`yungay-atacama-30m.json`).
    - *Live Global Basemaps:* NASA Earthdata GIBS / Worldview (`BlueMarble_NextGeneration` WMTS), Esri/Maxar World Imagery, OpenTopoMap (NASA SRTM contours).
    - *SAR & Spectral Metadata:* CSA RADARSAT-1 / RCM (Haughton Crater, Nunavut C-band SAR roughness), ESA Sentinel-2 SWIR & Azua-Bustos et al. (2020) XRD clay assays.
  - **Moon:**
    - *Topography & Craters:* NASA PDS LRO LOLA & LROC WAC/NAC (`shackleton-rim`, `aristarchus-marius`, `mare-tranquillitatis`) + JAXA SELENE/Kaguya skylight reference.
    - *Thermal & Shadows:* NASA LRO Diviner Lunar Radiometer (40 K PSR cold traps & polar illumination).
  - **Mars:**
    - *Local 30 m Rasters:* USGS Astrogeology Mars MSL Gale Merged DEM 1m v3 resampled to 30 m (`gale-murray-30m.json`, `gale-bradbury-30m.json`).
    - *Thermal, Spectral & Rover In-Situ:* Mars Odyssey THEMIS, MRO HiRISE/CTX/CRISM, and NASA PDS MSL Curiosity (`CheMin`, `REMS`) + Mars 2020 Perseverance (`jezero-delta`).

### Page 5: Scientific Research Studio (`/analog/research` — `ResearchWorkspace.tsx`)
- **Purpose:** Deep quantitative 2D/3D DEM workstation, statistical histograms, datum-validated difference grids, evidence grading, and formal Markdown report generation.
- **Datasets Used:**
  - **Earth vs. Mars Quantitative 30 m Grids:** ESA Copernicus GLO-30 (`yungay-atacama-30m.json`) vs. USGS Gale Merged DEM (`gale-murray-30m.json`, `gale-bradbury-30m.json`).
  - **Peer-Reviewed Evidence Registry:** Azua-Bustos et al. (2020) *Nature Scientific Reports*, NASA PDS MSL volumes, and NSSDCA bulk planetary fact sheets.

