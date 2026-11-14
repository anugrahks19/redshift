import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface WayfinderStage {
  id: string;
  index: string;
  label: string;
}

const WAYFINDER_STAGES: WayfinderStage[] = [
  { id: 'planetary-destination', index: '01', label: 'Moon / Mars Map' },
  { id: 'planetary-observatory', index: '02', label: 'Earth Analogs' },
  { id: 'analog-ranking', index: '03', label: 'Compare & Rank' },
  { id: 'terrain-protocol', index: '04', label: 'DEM & Missions' },
  { id: 'expedition-decision', index: '05', label: 'Decision & Report' },
];

interface ExpeditionWayfinderProps {
  activeSectionId: string;
  activeMissionTitle: string | null;
  selectedSiteName: string;
  completedCount: number;
  totalMissions: number;
  onJump: (sectionId: string) => void;
}

export const ExpeditionWayfinder: React.FC<ExpeditionWayfinderProps> = ({
  activeSectionId,
  activeMissionTitle,
  selectedSiteName,
  completedCount,
  totalMissions,
  onJump,
}) => {
  return (
    <nav className="exp-wayfinder" aria-label="Expedition chapters">
      <div className="container">
        <div className="exp-wayfinder-inner">
          <div className="exp-wayfinder-steps">
            {WAYFINDER_STAGES.map((stage) => {
              const active = activeSectionId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`exp-wayfinder-btn ${active ? 'is-active' : ''}`}
                  onClick={() => onJump(stage.id)}
                >
                  <span className="exp-wayfinder-idx">{stage.index}</span>
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>

          <div className="exp-wayfinder-status">
            <span className="exp-wayfinder-pill">
              <span className="exp-dot-cyan" aria-hidden="true" />
              Site: <strong>{selectedSiteName}</strong>
            </span>
            {activeMissionTitle && (
              <span className="exp-wayfinder-pill exp-wayfinder-pill--amber">
                Mission: <strong>{activeMissionTitle}</strong>
              </span>
            )}
            <span className="exp-wayfinder-pill">
              <CheckCircle2 size={12} />
              <span>
                {completedCount}/{totalMissions} Debriefed
              </span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

