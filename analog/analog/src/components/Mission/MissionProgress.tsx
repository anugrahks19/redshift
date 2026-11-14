import React from 'react';
import { Check, ChevronRight, RotateCcw } from 'lucide-react';
import type { MissionConfigState, MissionStage } from '../../types/mission';
import { MISSION_STAGE_ORDER } from '../../data/missionData';

interface MissionProgressProps {
  config: MissionConfigState;
  onNavigateStage: (stage: MissionStage) => void;
  onResetMission: () => void;
}

export const MissionProgress: React.FC<MissionProgressProps> = ({
  config,
  onNavigateStage,
  onResetMission,
}) => {
  const currentIndex = MISSION_STAGE_ORDER.findIndex((s) => s.id === config.stage);

  return (
    <nav
      className="panel"
      aria-label="Mission Planning Progress"
      style={{
        background: '#101E2B',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        color: '#F2F5F8',
        padding: '8px 12px',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: 780,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {MISSION_STAGE_ORDER.map((stage, idx) => {
            const isCurrent = stage.id === config.stage;
            const isCompleted = idx < currentIndex;
            const isReachable = idx <= config.highestReachedIndex;

            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  disabled={!isReachable}
                  onClick={() => onNavigateStage(stage.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: isCurrent
                      ? '1px solid #7CC4E8'
                      : isCompleted
                        ? '1px solid #327F79'
                        : '1px solid transparent',
                    background: isCurrent
                      ? 'rgba(40, 106, 145, 0.45)'
                      : isCompleted
                        ? 'rgba(50, 127, 121, 0.22)'
                        : 'transparent',
                    color: isCurrent
                      ? '#FFFFFF'
                      : isCompleted
                        ? '#9BE0DA'
                        : isReachable
                          ? '#C6D3DF'
                          : '#64748B',
                    cursor: isReachable ? 'pointer' : 'not-allowed',
                    fontSize: 11.5,
                    fontWeight: isCurrent ? 600 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      opacity: 0.85,
                      color: isCurrent ? '#C28B38' : isCompleted ? '#327F79' : 'inherit',
                    }}
                  >
                    {isCompleted ? <Check size={11} strokeWidth={2.5} /> : stage.step}
                  </span>
                  <span>{stage.short}</span>
                </button>
                {idx < MISSION_STAGE_ORDER.length - 1 && (
                  <ChevronRight size={12} color="#334E68" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetMission}
          className="btn"
          style={{
            padding: '4px 9px',
            fontSize: 11.5,
            background: '#172A3A',
            color: '#CBD6E2',
            borderColor: 'rgba(255,255,255,0.16)',
            flexShrink: 0,
          }}
          title="Reset mission parameters and restart design"
        >
          <RotateCcw size={12} />
          Reset Mission
        </button>
      </div>
    </nav>
  );
};

