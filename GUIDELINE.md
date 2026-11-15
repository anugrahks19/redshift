# AstraTerra — Judge's Evaluation & Walkthrough Guide
**NASA Space Apps 2026 · Planetary Analog Mapping, Comparative 3D Science Lab & Research Platform**

Welcome, Judges! This guide provides a fast, structured walkthrough to run **AstraTerra** locally and evaluate every scientific workflow, dataset integration, and interactive 3D simulation.

---

## 1. Quick Start (Local Launch)

### Prerequisites
- **Node.js 18+** and **npm**

### Start the Combined Platform
From the repository root:

```bash
npm install
npm run site:dev
```

Once running, open your browser to:
- **Main Landing Experience:** `http://localhost:5173/`
- **AstraTerra Science Platform:** `http://localhost:5173/analog/`

*(Optional)* Run the scientific verification test suite:
```bash
npm --prefix analog/analog run typecheck
node scripts/scientific.test.mjs
```

---

## 2. Recommended 5-Minute Judge Walkthrough

### Step 1: Landing & Mission Transit (`http://localhost:5173/`)
- Explore the 3D Earth-to-Mars/Moon visual introduction and scroll-driven mission briefing.
- Click into the **AstraTerra Platform** (`/analog/`) to enter the scientific workbench.

---

### Step 2: TERRAFORM — Planetary Analog Mapping & Discovery (`/analog/learn`)
**Challenge Focus:** *Identifying Earth locations that resemble specific environments on the Moon and Mars without pretending Earth is an exact equivalent.*

1. **Select a Planetary Target:** Choose a region on the **Moon** (e.g., Shackleton Crater, Mare Tranquillitatis, Marius Hills) or **Mars** (e.g., Jezero Crater, Gale Crater).
2. **Toggle Scientific Mapping Layers:** Switch between **Elevation**, **Slope** (Horn 1981), **Surface Roughness** (Riley TRI), **Terrain Morphology**, **Surface Temperature**, and **Solar Exposure / Shadow Patterns**.
3. **Compare Earth Analogs:** Inspect candidate Earth analog sites (e.g., **Yungay / Atacama Desert**, **McMurdo Dry Valleys**, **Rio Tinto**, **Mauna Kea**, **Askja**) side-by-side with measurable units, similarities, **critical differences** (gravity, pressure, radiation), and dataset citations.
4. **Generate Annotated Analog Comparison Map:** Export/review the structured analog comparison summary containing target coordinates, Earth analog, parameters, scientific observations, and dataset references.

---

### Step 3: EXPLORE — 3D Comparative Scientific Simulation Lab (`/analog/explore` → `/analog/explore/launch-mission`)
**Challenge Focus:** *Conducting controlled, side-by-side scientific experiments across Earth and Mars/Moon using identical parameters.*

1. Open **Explore** (`/analog/explore`), review the **Data-Driven Missions Hub**, and click **Open 3D Comparative Science Lab** (or navigate directly to `/analog/explore/launch-mission`).
2. Follow the **Comparative Scientific Protocol**:
   > **Select Experiment → Run on Earth → Observe Results → Switch Planet → Run Same Experiment → Compare Results**

#### Mission 1: The Red Planet Survival Challenge (`Atacama Desert, Earth` ↔ `Jezero / Gale Crater, Mars`)
- **Experiment 1 — Gravity Comparison:**
  1. Choose a test object (`Basalt Regolith Core 2.5 kg`, `Titanium Instrument Probe 5.0 kg`, or `Aerogel Dust Collector 0.45 kg`) and set a drop height (`2–30 m`).
  2. Press **START** on Earth (`9.80665 m/s²`), observe the 3D free-fall, then click **Switch to Mars** (`3.72076 m/s²`) and press **START** again.
  3. Inspect the **Side-by-Side Comparative Results** (`1.62×` longer fall time on Mars, lower touchdown velocity, and `Replay Earth` / `Replay Mars`).
- **Experiment 2 — Atmospheric Pressure & Human Survival:**
  1. Toggle **WITHOUT EVA SUIT** vs **WITH PRESSURIZED EVA SUIT** (`29.6 kPa` or `57.2 kPa`).
  2. Compare Earth (`905 mbar`, `20.95% O₂`) against Mars (`6.1 mbar`, `0.13% O₂` — far below the `62.8 mbar` Armstrong limit).
- **Experiment 3 — Temperature Exposure:**
  1. Click anywhere on the 3D terrain mesh to plant the thermal sensor probe and press **START**.
  2. Compare measured **MODIS MOD11A2 v061** daytime LST in Atacama against **MGS TES Thermal Inertia / MSL REMS** on Mars.

#### Mission 2: The Lunar South Pole Expedition (`McMurdo Dry Valleys, Earth` ↔ `Shackleton Crater, Moon`)
- **Experiment 1 — Gravity Comparison:** Compare `9.80665 m/s²` (McMurdo) vs `1.622 m/s²` (Moon).
- **Experiment 2 — Temperature Exposure:** Compare **MODIS MOD11A2** (McMurdo) against **LRO Diviner Polar Cumulative Products (PCP)** (`41.7 K` PSR cold traps to `223.9 K` sunlit rim).
- **Experiment 3 — Lunar Base-Site Inspection:**
  1. Select candidate pins (**Alpha Ridge**, **Beta Scarp**, **Gamma PSR**, **Delta Bench**) or **click anywhere directly on the 3D LRO LOLA crater mesh**.
  2. Inspect **LOLA Elevation**, **Horn Slope**, **Riley TRI Roughness**, **Diviner PCP Temperature**, **LOLA Illumination %**, **DTE Comms %**, **LEND Water Ice (wt%)**, **Radiation (mSv/yr)**, **Diviner Rock Abundance %**, and **Regolith Bearing Capacity (kPa)**.
  3. Review the explicit engineering notice explaining why the 5 core datasets alone never certify a permanent lunar base as safe.

---

### Step 4: RESEARCH — Dual Terrain Studio (`/analog/research`)
- Compare any Earth and planetary DEM side-by-side with real-time terrain analytics, elevation histograms, slope/roughness distributions, and cross-body similarity scoring.

---

## 3. Scientific Datasets & Provenance Standards

Every measurement in AstraTerra is tagged with its exact provenance tier so judges can distinguish raw observations from models and references:

| Provenance Tag | Meaning |
| :--- | :--- |
| **`MEASURED`** | Read directly from bundled NASA / ESA / USGS raster products (`NASADEM`, `MODIS MOD11A2`, `LRO LOLA`, `LRO Diviner PCP`, `MGS TES`). |
| **`CALCULATED`** | Deterministic geospatial or physics derivations (Horn 1981 slope, Riley TRI roughness, $t = \sqrt{2h/g}$ kinematics, Newton thermal equilibration). |
| **`PUBLISHED REF`** | Official NASA NSSDCA Planetary Fact Sheets & mission instrument baselines (surface gravity, atmospheric pressure, O₂ composition). |
| **`ASSUMPTION`** | User-configurable engineering test parameters (e.g., EVA suit internal pressure `29.6 kPa` / `57.2 kPa`). |

### Core & Extended Datasets Bundled
1. **NASADEM_HGT v001 (30 m)** — Earth elevation & derived slope/roughness (`Yungay/Atacama`, `McMurdo`, `Death Valley`, `Mauna Kea`, `Rio Tinto`, etc.)
2. **MODIS/Terra MOD11A2 v061 (1 km, 8-day)** — Earth daytime/nighttime Land Surface Temperature
3. **LRO LOLA LDEM** — Lunar elevation & South Pole (`Shackleton Crater`, `Mare Tranquillitatis`, `Marius Hills`)
4. **LRO Diviner Polar Cumulative Products (PCP)** — Lunar South Pole bolometric temperature (`41.7 K – 223.9 K`)
5. **MOLA MEGDR** — Mars global elevation & crater topography (`Jezero`, `Gale`)
6. **Extended Base-Certification & Thermal Products** — `MGS TES Thermal Inertia`, `LRO LOLA Illumination & DTE Comms`, `LRO LEND Neutron Water-Ice WEH`, and `Diviner Rock Abundance`.

---

## 4. Direct Route Reference

| Route | Experience |
| :--- | :--- |
| `/` | 3D Earth-to-Planet Landing & Mission Transit |
| `/analog/` | AstraTerra Platform Home |
| `/analog/learn` | **TERRAFORM** — Planetary Analog Mapping & Discovery |
| `/analog/explore` | **EXPLORE** — Data-Driven Missions Hub & 5-Step Field Lab |
| `/analog/explore/launch-mission` | **3D Comparative Scientific Simulation Lab** |
| `/analog/research` | **RESEARCH** — Dual Terrain Studio & Scientific Analytics |
