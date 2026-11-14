export type TransitMissionId = 'moon' | 'mars'

export interface TransitStage {
  index: string
  code: string
  title: string
  windowLabel: string
  cumulativeTime: string
  stageDuration: string
  deltaV: string
  cumulativeDeltaV: string
  propellant: string
  crewO2Kg: string
  crewWaterL: string
  crewFoodKg: string
  constraintNote: string
  analogTie: string
  curveFraction: number
}

export interface TransitMissionProfile {
  id: TransitMissionId
  tabLabel: string
  headline: string
  subtitle: string
  targetLabel: string
  distanceLabel: string
  crewBaseline: string
  totalTimeLabel: string
  totalDeltaV: string
  totalPropellant: string
  totalConsumables: string
  commDelay: string
  stages: TransitStage[]
}

export const TRANSIT_MISSIONS: Record<TransitMissionId, TransitMissionProfile> = {
  moon: {
    id: 'moon',
    tabLabel: '01 // EARTH → MOON (6 STAGES)',
    headline: 'Three days across vacuum before a single boot prints regolith.',
    subtitle:
      'Every kilogram lifted to the Lunar South Pole multiplies launch propellant exponentially. Scrub through six split flight stages to trace time, delta-V, and life-support burn for four astronauts.',
    targetLabel: 'MOON · SHACKLETON RIM',
    distanceLabel: '384,400 KM AVG',
    crewBaseline: '4 ASTRONAUTS · ARTEMIS REFERENCE',
    totalTimeLabel: '90 HRS TRANSIT · 10.0 DAYS MISSION',
    totalDeltaV: '15.38 KM/S TOTAL',
    totalPropellant: '~2,308 T PROPELLANT',
    totalConsumables: '37 KG O₂ · 110 L H₂O · 28 KG FOOD',
    commDelay: '1.28 SEC ONE-WAY',
    stages: [
      {
        index: '01',
        code: 'LEO-ASCENT',
        title: 'Liftoff & Low-Earth Parking',
        windowLabel: 'T+00H → T+02H',
        cumulativeTime: '2.0 HRS',
        stageDuration: '2 hrs',
        deltaV: '9.40 km/s',
        cumulativeDeltaV: '9.40 km/s',
        propellant: '2,180 t LOX/LH₂ + SRB',
        crewO2Kg: '3.4 kg',
        crewWaterL: '10 L',
        crewFoodKg: '2.5 kg',
        constraintNote: '3.2g peak axial load & acoustic shock validate every structural seam before orbit.',
        analogTie: 'Pre-launch avionics & helmet-display human factors rehearsed prior to climb.',
        curveFraction: 0.14,
      },
      {
        index: '02',
        code: 'TLI-BURN',
        title: 'Trans-Lunar Injection Burn',
        windowLabel: 'T+02H → T+03H',
        cumulativeTime: '3.0 HRS',
        stageDuration: '1 hr',
        deltaV: '+3.15 km/s',
        cumulativeDeltaV: '12.55 km/s',
        propellant: '92 t Upper Stage',
        crewO2Kg: '3.8 kg',
        crewWaterL: '11 L',
        crewFoodKg: '2.8 kg',
        constraintNote: 'Single perigee engine burn commits crew onto a 384,400 km free-return trajectory.',
        analogTie: 'Exact burn timing leaves no margin for unverified autonomous guidance code.',
        curveFraction: 0.32,
      },
      {
        index: '03',
        code: 'CISLUNAR-COAST',
        title: 'Van Allen Belt & Deep Coast',
        windowLabel: 'T+03H → T+74H',
        cumulativeTime: '3.1 DAYS',
        stageDuration: '71 hrs',
        deltaV: '+0.08 km/s',
        cumulativeDeltaV: '12.63 km/s',
        propellant: '0.8 t RCS Trim',
        crewO2Kg: '13.7 kg',
        crewWaterL: '41 L',
        crewFoodKg: '10.2 kg',
        constraintNote: 'Charged particle transit + continuous closed-loop CO₂ scrubbing across 3 days.',
        analogTie: 'Radiation & isolation fatigue modeled inside confined cave/tube field campaigns.',
        curveFraction: 0.56,
      },
      {
        index: '04',
        code: 'LOI-NRHO',
        title: 'Lunar Orbit Insertion',
        windowLabel: 'T+74H → T+86H',
        cumulativeTime: '3.6 DAYS',
        stageDuration: '12 hrs',
        deltaV: '+0.88 km/s',
        cumulativeDeltaV: '13.51 km/s',
        propellant: '14 t Service Module',
        crewO2Kg: '15.4 kg',
        crewWaterL: '46 L',
        crewFoodKg: '11.5 kg',
        constraintNote: 'Capture burn behind the lunar limb during complete Earth radio occultation.',
        analogTie: 'Delayed telemetry drills echo remote autonomous operations in Haughton Crater.',
        curveFraction: 0.74,
      },
      {
        index: '05',
        code: 'POWERED-EDL',
        title: 'Powered Descent to Rim',
        windowLabel: 'T+86H → T+90H',
        cumulativeTime: '3.75 DAYS',
        stageDuration: '4 hrs',
        deltaV: '+1.87 km/s',
        cumulativeDeltaV: '15.38 km/s',
        propellant: '21.2 t Descent Stage',
        crewO2Kg: '16.0 kg',
        crewWaterL: '48 L',
        crewFoodKg: '12.0 kg',
        constraintNote: 'Zero atmosphere means 100% propulsive braking while avoiding low-angle rim boulders.',
        analogTie: 'Terrain Relative Navigation tuned over sharp crater scarps at Tswaing.',
        curveFraction: 0.90,
      },
      {
        index: '06',
        code: 'SOUTH-POLE-EVA',
        title: 'Shackleton Touchdown & Ice Survey',
        windowLabel: 'T+90H → T+240H',
        cumulativeTime: '10.0 DAYS',
        stageDuration: '6.25 days surface',
        deltaV: '0.00 km/s',
        cumulativeDeltaV: '15.38 km/s',
        propellant: 'Surface Reserve',
        crewO2Kg: '37.0 kg',
        crewWaterL: '110 L',
        crewFoodKg: '27.6 kg',
        constraintNote: 'Grazing 1.5° solar grazing angles cast razor-long shadows across cryogenic ice traps.',
        analogTie: 'Rover slope limits (<20°) & illumination pacing benchmarked directly in AstraTerra.',
        curveFraction: 1.0,
      },
    ],
  },
  mars: {
    id: 'mars',
    tabLabel: '02 // EARTH → MARS (7 STAGES)',
    headline: 'Two hundred days of solar wind before supersonic entry.',
    subtitle:
      'A Mars conjunction mission cannot abort back to Earth overnight. Scroll seven split phases to inspect cryogenic staging, crew consumables, radiation load, and why terrestrial testbeds come first.',
    targetLabel: 'MARS · JEZERO DELTA',
    distanceLabel: '~225M KM TRANSIT ARC',
    crewBaseline: '4 ASTRONAUTS · DRA 5.0 CONJUNCTION',
    totalTimeLabel: '210 DAYS ONE-WAY · 500D+ WINDOW',
    totalDeltaV: '16.89 KM/S TOTAL',
    totalPropellant: '~1,868 T METHALOX / CRYOS',
    totalConsumables: '705 KG O₂ · 2,100 L H₂O · 525 KG FOOD',
    commDelay: '14–22 MIN ONE-WAY',
    stages: [
      {
        index: '01',
        code: 'LEO-STAGING',
        title: 'Orbital Assembly & Cryo Refuel',
        windowLabel: 'DAY 00 → DAY 14',
        cumulativeTime: '14 DAYS',
        stageDuration: '14 days',
        deltaV: '9.40 km/s (lifts)',
        cumulativeDeltaV: '9.40 km/s',
        propellant: '1,200 t LEO Depot',
        crewO2Kg: '47 kg',
        crewWaterL: '140 L',
        crewFoodKg: '35 kg',
        constraintNote: 'Requires multiple tanker flights & zero-boil-off cryo transfer prior to crew departure.',
        analogTie: 'Leak-check robotics & modular habitat docking tested on terrestrial test stands.',
        curveFraction: 0.12,
      },
      {
        index: '02',
        code: 'TMI-DEPART',
        title: 'Trans-Mars Injection Burn',
        windowLabel: 'DAY 14 → DAY 15',
        cumulativeTime: '15 DAYS',
        stageDuration: '1 day',
        deltaV: '+3.90 km/s',
        cumulativeDeltaV: '13.30 km/s',
        propellant: '620 t CH₄/LOX',
        crewO2Kg: '50 kg',
        crewWaterL: '150 L',
        crewFoodKg: '38 kg',
        constraintNote: '26-month orbital window locks the crew into an elliptical ~480M km solar transfer.',
        analogTie: 'Hardware committed here cannot return quickly—every failure mode must be pre-solved.',
        curveFraction: 0.27,
      },
      {
        index: '03',
        code: 'CRUISE-LEG-1',
        title: 'Heliocentric Cruise & Deconditioning',
        windowLabel: 'DAY 15 → DAY 110',
        cumulativeTime: '110 DAYS',
        stageDuration: '95 days',
        deltaV: '+0.05 km/s',
        cumulativeDeltaV: '13.35 km/s',
        propellant: '1.4 t Trim',
        crewO2Kg: '369 kg',
        crewWaterL: '1,100 L',
        crewFoodKg: '276 kg',
        constraintNote: 'Galactic cosmic rays (~175 mSv accumulated) + microgravity musculoskeletal decline.',
        analogTie: 'Closed-loop water recovery (≥98%) & crew autonomy tested under isolated conditions.',
        curveFraction: 0.44,
      },
      {
        index: '04',
        code: 'CRUISE-LEG-2',
        title: 'Deep-Space Comm Lag & Storm Watch',
        windowLabel: 'DAY 110 → DAY 205',
        cumulativeTime: '205 DAYS',
        stageDuration: '95 days',
        deltaV: '+0.04 km/s',
        cumulativeDeltaV: '13.39 km/s',
        propellant: '1.2 t Trim',
        crewO2Kg: '688 kg',
        crewWaterL: '2,050 L',
        crewFoodKg: '513 kg',
        constraintNote: '40-minute round-trip radio delay eliminates real-time Earth troubleshooting.',
        analogTie: 'Lanzarote lava-tube drills teach astronauts & rovers to diagnose anomalies locally.',
        curveFraction: 0.62,
      },
      {
        index: '05',
        code: 'MARS-CAPTURE',
        title: 'Aerocapture & Elliptical Hold',
        windowLabel: 'DAY 205 → DAY 209',
        cumulativeTime: '209 DAYS',
        stageDuration: '4 days',
        deltaV: '+2.10 km/s',
        cumulativeDeltaV: '15.49 km/s',
        propellant: 'Heatshield + 14 t',
        crewO2Kg: '702 kg',
        crewWaterL: '2,090 L',
        crewFoodKg: '523 kg',
        constraintNote: '2,100 °C plasma braking through thin 6 mbar CO₂ atmosphere within a ±1.5° corridor.',
        analogTie: 'Dust-laden atmospheric opacity requires pre-mapped orbital landing ellipses.',
        curveFraction: 0.77,
      },
      {
        index: '06',
        code: 'SUPERSONIC-EDL',
        title: 'Supersonic EDL & Retropropulsion',
        windowLabel: 'DAY 209 → DAY 210',
        cumulativeTime: '210 DAYS',
        stageDuration: '12 min terminal',
        deltaV: '+1.40 km/s',
        cumulativeDeltaV: '16.89 km/s',
        propellant: '46 t Terminal Burn',
        crewO2Kg: '705 kg',
        crewWaterL: '2,100 L',
        crewFoodKg: '525 kg',
        constraintNote: 'Mach 22 entry decelerates 40+ metric tons via supersonic retro-thrusters above Jezero.',
        analogTie: 'Slope hazard maps below 12° prevent tip-over on ancient Martian delta fans.',
        curveFraction: 0.91,
      },
      {
        index: '07',
        code: 'JEZERO-ISRU',
        title: 'Surface Habitat & ISRU Sabatier',
        windowLabel: 'DAY 210 → DAY 500+',
        cumulativeTime: '500D WINDOW',
        stageDuration: '290+ days surface',
        deltaV: 'Ascent Ready',
        cumulativeDeltaV: '16.89 km/s',
        propellant: 'ISRU CH₄/O₂ Harvest',
        crewO2Kg: 'Closed Loop + ISRU',
        crewWaterL: 'Ice / Regolith Brine',
        crewFoodKg: '525+ kg Transit Net',
        constraintNote: 'Must manufacture return methane/oxygen from CO₂ + subsurface ice prior to launch home.',
        analogTie: 'Sulfates, clays, & salt-crust extraction practiced at Dalangtan & Salar de Pajonales.',
        curveFraction: 1.0,
      },
    ],
  },
}

