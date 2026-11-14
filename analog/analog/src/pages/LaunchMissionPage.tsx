import React, { useEffect, useState } from 'react';
import { usePlatformContext } from '../context/PlatformContext';
import type {
  MissionConfigState,
  MissionStage,
} from '../types/mission';
import {
  EARTH_TARGETS,
  MARS_TARGETS,
  MISSION_STAGE_ORDER,
} from '../data/missionData';
import { MissionSimulatorCanvas } from '../components/Mission/3D/MissionSimulatorCanvas';
import { MissionFlightDeck } from '../components/Mission/HUD/MissionFlightDeck';

const INITIAL_CONFIG: MissionConfigState = {
  stage: 'landing',
  highestReachedIndex: 0,
  templateId: 'rock-explorer',
  earthEnvId: 'atacama',
  vehicle: 'rover',
  terrain: 'rocky',
  objective: 'geological-survey',
  energyAllocation: 65,
  destination: 'mars',
  decisionId: 'safer-route',
};

export const LaunchMissionPage: React.FC = () => {
  const { setTargetPlanet, setSelectedEarthSiteId } = usePlatformContext();
  const [config, setConfig] = useState<MissionConfigState>(INITIAL_CONFIG);
  const [roverStepIndex, setRoverStepIndex] = useState<number>(0);
  const [transferProgress, setTransferProgress] = useState<number>(0.5);
  const [activeTargetId, setActiveTargetId] = useState<string>(EARTH_TARGETS[0]!.id);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Sync target planet with context
  useEffect(() => {
    if (config.stage === 'planet-sim' || config.stage === 'challenge' || config.stage === 'debrief') {
      setTargetPlanet('Mars');
    } else {
      setSelectedEarthSiteId('yungay-atacama');
    }
  }, [config.stage, setTargetPlanet, setSelectedEarthSiteId]);

  const goToStage = (targetStage: MissionStage) => {
    const targetIdx = MISSION_STAGE_ORDER.findIndex((s) => s.id === targetStage);
    setConfig((prev) => ({
      ...prev,
      stage: targetStage,
      highestReachedIndex: Math.max(prev.highestReachedIndex, targetIdx >= 0 ? targetIdx : 0),
    }));

    // Reset surface step when switching environments
    if (targetStage === 'earth-sim') {
      setRoverStepIndex(0);
      setActiveTargetId(EARTH_TARGETS[0]!.id);
    } else if (targetStage === 'planet-sim') {
      setRoverStepIndex(0);
      setActiveTargetId(MARS_TARGETS[0]!.id);
    } else if (targetStage === 'transfer') {
      setTransferProgress(0.15);
    }
  };

  const handleUpdateConfig = (partial: Partial<MissionConfigState>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleAdvanceRoverStep = () => {
    setRoverStepIndex((prev) => {
      const next = Math.min(prev + 1, 5);
      if (config.stage === 'earth-sim') {
        if (next === 1 || next === 2) setActiveTargetId('e-target-1');
        else if (next === 3) setActiveTargetId('e-target-2');
        else if (next >= 4) setActiveTargetId('e-target-3');
      } else if (config.stage === 'planet-sim') {
        if (next === 1 || next === 2) setActiveTargetId('m-target-1');
        else if (next === 3) setActiveTargetId('m-target-2');
        else if (next >= 4) setActiveTargetId('m-target-3');
      }
      return next;
    });
  };

  const handleResetRoverStep = () => {
    setRoverStepIndex(0);
    if (config.stage === 'earth-sim') {
      setActiveTargetId(EARTH_TARGETS[0]!.id);
    } else if (config.stage === 'planet-sim') {
      setActiveTargetId(MARS_TARGETS[0]!.id);
    }
  };

  const handleResetMission = () => {
    setConfig(INITIAL_CONFIG);
    setRoverStepIndex(0);
    setTransferProgress(0.15);
    setActiveTargetId(EARTH_TARGETS[0]!.id);
  };

  return (
    <main
      id="main-content"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 64px)',
        minHeight: '680px',
        background: '#06090E',
        overflow: 'hidden',
      }}
    >
      {/* Central 3D Planetary Simulation Canvas */}
      <MissionSimulatorCanvas
        config={config}
        roverStepIndex={roverStepIndex}
        transferProgress={transferProgress}
        activeTargetId={activeTargetId}
        onSelectTarget={(id) => setActiveTargetId(id)}
        reducedMotion={reducedMotion}
      />

      {/* Non-intrusive Aerospace Flight Operations HUD */}
      <MissionFlightDeck
        config={config}
        currentStepIndex={roverStepIndex}
        transferProgress={transferProgress}
        activeTargetId={activeTargetId}
        reducedMotion={reducedMotion}
        onNavigateStage={goToStage}
        onUpdateConfig={handleUpdateConfig}
        onAdvanceRoverStep={handleAdvanceRoverStep}
        onResetRoverStep={handleResetRoverStep}
        onSelectTarget={(id) => setActiveTargetId(id)}
        onSetTransferProgress={setTransferProgress}
        onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        onResetMission={handleResetMission}
      />
    </main>
  );
};
