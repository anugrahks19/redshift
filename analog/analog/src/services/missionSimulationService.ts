import type {
  MissionAssessmentResult,
  MissionConfigState,
} from '../types/mission';
import {
  EARTH_ENVIRONMENTS,
  MISSION_EVENT_001_OPTIONS,
  MISSION_TEMPLATES,
  PLANETARY_DESTINATIONS,
} from '../data/missionData';

export function computeMissionAssessment(config: MissionConfigState): MissionAssessmentResult {
  const { vehicle, terrain, objective, energyAllocation, destination, decisionId } = config;

  // Baseline vehicle + terrain energy drain model (illustrative planning estimate)
  let terrainDraw = 18;
  if (terrain === 'sandy') terrainDraw = 24;
  else if (terrain === 'steep') terrainDraw = 28;
  else if (terrain === 'mixed') terrainDraw = 21;

  let vehicleFactor = 1.0;
  if (vehicle === 'drone') {
    vehicleFactor = destination === 'mars' ? 2.1 : 1.25;
  } else if (vehicle === 'lander') {
    vehicleFactor = 0.55;
  }

  let objectiveCost = 14;
  if (objective === 'sample-collection') objectiveCost = 22;
  else if (objective === 'terrain-mapping') objectiveCost = 16;
  else if (objective === 'environmental-monitoring') objectiveCost = 10;

  let decisionCost = 15;
  const decisionOpt = MISSION_EVENT_001_OPTIONS.find((o) => o.id === decisionId);
  if (decisionOpt) {
    decisionCost = Math.abs(decisionOpt.illustrativeEnergyDelta);
  }

  const destinationMultiplier = destination === 'mars' ? 1.25 : 1.15;
  const estimatedDrain = Math.round((terrainDraw + objectiveCost) * vehicleFactor * destinationMultiplier + decisionCost);
  const remainingReserve = Math.max(0, Math.min(100, Math.round(energyAllocation - estimatedDrain)));

  let energyMarginLabel: MissionAssessmentResult['energyMarginLabel'];
  if (remainingReserve >= 35) energyMarginLabel = 'Comfortable';
  else if (remainingReserve >= 20) energyMarginLabel = 'Balanced';
  else if (remainingReserve >= 10) energyMarginLabel = 'Tight';
  else energyMarginLabel = 'Critical';

  // Aerodynamic feasibility
  let aerodynamicBlocked = false;
  let aerodynamicNote = 'Nominal surface locomotion supported by wheel-ground traction.';
  if (vehicle === 'drone') {
    if (destination === 'moon') {
      aerodynamicBlocked = true;
      aerodynamicNote = 'Aerodynamic lift is physically impossible in the Moon’s ultra-high vacuum (< 10⁻¹¹ mbar).';
    } else if (destination === 'mars') {
      aerodynamicNote = 'Mars’ 6.1 mbar atmosphere requires ultra-lightweight rotors spinning at ~2,500+ RPM with strict flight-window limits.';
    } else {
      aerodynamicNote = 'Terrestrial ~900 mbar air provides high aerodynamic blade lift with standard motor duty cycles.';
    }
  }

  // Mobility
  let mobilityAssessment = 'Rocker-bogie chassis absorbs angular rock steps with stable weight distribution.';
  if (vehicle === 'lander') {
    mobilityAssessment = 'Stationary tripod footing anchored at single coordinates; zero traverse slip risk.';
  } else if (vehicle === 'drone') {
    mobilityAssessment = destination === 'moon'
      ? 'Non-functional without aerodynamic atmosphere.'
      : 'Aerial scouting overflies boulders and crevasse obstacles without surface wheel friction.';
  } else if (terrain === 'sandy') {
    mobilityAssessment = destination === 'mars'
      ? '0.38 g gravity significantly reduces normal force, risking wheel sinkage in loose aeolian ripples.'
      : 'Standard desert tire sinkage requiring controlled throttle to prevent digging.';
  } else if (terrain === 'steep') {
    mobilityAssessment = destination === 'mars'
      ? 'Reduced gravity requires autonomous slip-checking algorithm to halt if slip exceeds 40% on scree.'
      : 'High gravity assists wheel purchase on hard bedrock ledges.';
  }

  // Communications
  const commsModeLabel =
    destination === 'mars'
      ? 'Batched Daily Sol Uplink (3–22 min One-Way Light Lag)'
      : destination === 'moon'
        ? 'Supervised Remote Driving (~2.6 s Round-Trip Lag)'
        : 'Real-time Terrestrial Telemetry (< 10 ms Lag)';

  // Primary operational challenge
  let primaryOperationalChallenge =
    destination === 'mars'
      ? 'Managing multi-minute command latency while traversing unbonded ferric regolith on reduced power.'
      : destination === 'moon'
        ? 'Thermal survival across 14-day cold darkness and sharp abrasive impact dust adhesion.'
        : 'High terrestrial dust and heat with minimal cross-planetary communications lag.';

  if (aerodynamicBlocked) {
    primaryOperationalChallenge = 'Aerodynamic rotor flight failure in vacuum environment.';
  }

  // Decision outcome
  let decisionOutcomeHeadline = 'Standoff Science Achieved';
  let decisionExplanation = 'Decision resolved nominal mission objectives with standard telemetry margin.';
  let missionStatus: MissionAssessmentResult['missionStatus'] = 'Mission Objectives Achieved';

  if (decisionId === 'safer-route') {
    decisionOutcomeHeadline = 'Safe Bypass Executed: Zero Wheel Damage';
    decisionExplanation =
      'The rover completed a 420 m detour around the rocky scree. While consuming more traverse energy, the chassis preserved wheel structural integrity and successfully reached the target outcrop safely.';
    missionStatus = remainingReserve < 12 ? 'Completed with Trade-offs' : 'Mission Objectives Achieved';
  } else if (decisionId === 'standoff-inspect') {
    decisionOutcomeHeadline = 'Remote Stand-off Campaign: Energy Conserved';
    decisionExplanation =
      'The vehicle halted at the slope base, executing high-resolution telephoto imaging and remote spectroscopy without risking chassis slip. Outcrop mineralogy was verified while conserving electrical reserves.';
    missionStatus = 'Completed with Trade-offs';
  } else if (decisionId === 'direct-traverse') {
    if (remainingReserve < 15 || terrain === 'steep') {
      decisionOutcomeHeadline = 'High-Slip Traverse: Slip Fault Triggered';
      decisionExplanation =
        'Direct ascent up the loose rocky gradient triggered autonomous slip-protection stops. The rover reached the upper bench after multiple torque retries, drawing significant battery reserve.';
      missionStatus = 'Constrained / Partial Survey';
    } else {
      decisionOutcomeHeadline = 'Direct Ascent Completed Ahead of Schedule';
      decisionExplanation =
        'The vehicle successfully climbed the slope without exceeding slip thresholds, positioning contact instruments on pristine bedrock in record time.';
      missionStatus = 'Mission Objectives Achieved';
    }
  }

  if (aerodynamicBlocked) {
    missionStatus = 'Constrained / Partial Survey';
    decisionOutcomeHeadline = 'Physical Environment Mismatch Detected';
    decisionExplanation =
      'A rotorcraft drone cannot generate aerodynamic lift in a lunar vacuum. Demonstrates why mission planners must match vehicle physics to destination atmospheres.';
  }

  return {
    energyMarginLabel,
    illustrativeReserveAfterOps: remainingReserve,
    aerodynamicNote,
    aerodynamicBlocked,
    mobilityAssessment,
    commsModeLabel,
    primaryOperationalChallenge,
    decisionOutcomeHeadline,
    decisionExplanation,
    missionStatus,
  };
}

export function buildMissionDebriefSummary(config: MissionConfigState) {
  const tpl = MISSION_TEMPLATES.find((t) => t.id === config.templateId) ?? MISSION_TEMPLATES[0]!;
  const earth = EARTH_ENVIRONMENTS[config.earthEnvId];
  const planet = PLANETARY_DESTINATIONS[config.destination];
  const assessment = computeMissionAssessment(config);

  return {
    missionCode: `MISSION-EX-${tpl.code.split('-')[1] ?? '01'}`,
    templateTitle: tpl.title,
    earthSiteName: earth.name,
    destinationName: `${planet.name} (${planet.siteName.split('—')[0]?.trim() ?? planet.siteName})`,
    vehicle: config.vehicle.toUpperCase(),
    terrain: config.terrain.toUpperCase(),
    objective: config.objective.replace('-', ' ').toUpperCase(),
    energyAllocation: config.energyAllocation,
    assessment,
    earth,
    planet,
  };
}
