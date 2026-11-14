import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, CheckCircle2, Clock, Compass, Map as MapIcon, X } from 'lucide-react';
import type { FieldChallenge } from '../../data/fieldLabData';

gsap.registerPlugin(useGSAP);

interface MissionArchiveDossierProps {
  missions: FieldChallenge[];
  activeMissionId: string | null;
  completedMissionIds: string[];
  onStartMission: (mission: FieldChallenge) => void;
  onDeployToMap: (mission: FieldChallenge) => void;
}

export const MissionArchiveDossier: React.FC<MissionArchiveDossierProps> = ({
  missions,
  activeMissionId,
  completedMissionIds,
  onStartMission,
  onDeployToMap,
}) => {
  const [focusedId, setFocusedId] = useState<string>(missions[0]?.id ?? 'find-martian-landscape');
  const [modalMission, setModalMission] = useState<FieldChallenge | null>(null);

  const dossierRef = useRef<HTMLDivElement | null>(null);
  const modalBackdropRef = useRef<HTMLDivElement | null>(null);
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  const focusedMission = missions.find((m) => m.id === focusedId) ?? missions[0]!;

  useGSAP(
    () => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      gsap.fromTo(
        '.exp-dossier-stage',
        { opacity: 0.4, y: 8 },
        { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { scope: dossierRef, dependencies: [focusedMission.id] }
  );

  useGSAP(
    () => {
      if (!modalMission) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      if (modalBackdropRef.current) {
        gsap.fromTo(modalBackdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 });
      }
      if (modalCardRef.current) {
        gsap.fromTo(
          modalCardRef.current,
          { opacity: 0, y: 18, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out', clearProps: 'transform' }
        );
      }
    },
    { dependencies: [modalMission] }
  );

  const closeModal = (afterClose?: () => void) => {
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !modalBackdropRef.current || !modalCardRef.current) {
      setModalMission(null);
      afterClose?.();
      return;
    }
    gsap.to(modalCardRef.current, { opacity: 0, y: 10, duration: 0.18, ease: 'power2.in' });
    gsap.to(modalBackdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setModalMission(null);
        afterClose?.();
      },
    });
  };

  return (
    <section
      id="expedition-missions"
      className="exp-section"
      aria-labelledby="exp-missions-heading"
    >
      <div className="container">
        <div className="exp-section-head">
          <div>
            <span className="exp-kicker">01 · Active Reconnaissance Briefings</span>
            <h2 id="exp-missions-heading" className="exp-h2">
              Investigate Planetary Environments
            </h2>
          </div>
          <p className="exp-lead">
            Select a mission profile to examine orbital target imagery, inspect terrestrial hypotheses, and load calibrated 30 m datasets into the workspace.
          </p>
        </div>

        <div className="exp-missions-split">
          {/* Left Investigation Queue */}
          <div className="exp-mission-rail" role="listbox" aria-label="Planetary exploration missions">
            {missions.map((mission, idx) => {
              const isFocused = mission.id === focusedMission.id;
              const isActive = mission.id === activeMissionId;
              const isCompleted = completedMissionIds.includes(mission.id);
              return (
                <button
                  key={mission.id}
                  type="button"
                  role="option"
                  aria-selected={isFocused}
                  data-challenge-id={mission.id}
                  className={`exp-mission-row ${isFocused ? 'is-focused' : ''} ${isActive ? 'is-active' : ''}`}
                  onClick={() => setFocusedId(mission.id)}
                >
                  <div className="exp-mission-row-top">
                    <span className="exp-mono-cyan">INV-0{idx + 1} · {mission.targetBody}</span>
                    <span className="exp-mission-badges">
                      {isCompleted && <span className="exp-badge-done">Debriefed</span>}
                      <span className="exp-mono-muted">
                        <Clock size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                        {mission.estimatedTime}
                      </span>
                    </span>
                  </div>
                  <strong className="exp-mission-row-title">{mission.title}</strong>
                  <span className="exp-mission-row-obj">{mission.objective}</span>
                </button>
              );
            })}
          </div>

          {/* Right Panoramic Investigation Dossier */}
          <div ref={dossierRef} className="exp-dossier-panel">
            <div className="exp-dossier-stage">
              <div className="exp-dossier-media">
                <img src={focusedMission.imageUrl} alt={focusedMission.imageCaption} />
                <div className="exp-dossier-media-scrim" />
              </div>

              <div className="exp-dossier-body">
                <div className="exp-dossier-pills">
                  <span className="exp-tag-cyan">{focusedMission.targetBody}</span>
                  <span className="exp-tag-amber">{focusedMission.difficulty}</span>
                  <span className="exp-tag-neutral">{focusedMission.sourceLabel}</span>
                </div>

                <div className="exp-dossier-head-row">
                  <h3 className="exp-h3">{focusedMission.title}</h3>
                  <span className="exp-mono-muted">Est. {focusedMission.estimatedTime}</span>
                </div>

                <p className="exp-dossier-brief">{focusedMission.briefing}</p>

                <div className="exp-dossier-checklist">
                  <div className="exp-label-mono">Investigation Objectives</div>
                  <ul>
                    {focusedMission.checklist.map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={14} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="exp-dossier-actions">
                  <button
                    type="button"
                    className="exp-btn-primary"
                    onClick={() => setModalMission(focusedMission)}
                  >
                    <Compass size={15} />
                    {activeMissionId === focusedMission.id ? 'Re-open Briefing' : 'Start Mission Briefing'}
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    className="exp-btn-secondary"
                    onClick={() => onDeployToMap(focusedMission)}
                  >
                    <MapIcon size={14} />
                    Inspect in Observatory Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalMission && (
        <div
          ref={modalBackdropRef}
          className="exp-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exp-modal-title"
          onClick={() => closeModal()}
        >
          <div
            ref={modalCardRef}
            className="exp-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exp-modal-header">
              <div>
                <span className="exp-mono-cyan">
                  MISSION BRIEFING // {modalMission.targetBody.toUpperCase()} · {modalMission.difficulty.toUpperCase()}
                </span>
                <h3 id="exp-modal-title" className="exp-h3" style={{ marginTop: 4 }}>
                  {modalMission.title}
                </h3>
              </div>
              <button
                type="button"
                className="exp-icon-btn"
                aria-label="Close mission briefing"
                onClick={() => closeModal()}
              >
                <X size={16} />
              </button>
            </div>

            <div className="exp-modal-media">
              <img src={modalMission.imageUrl} alt={modalMission.imageCaption} />
              <div className="exp-modal-media-meta">
                <span>{modalMission.imageCaption}</span>
                <span className="exp-mono-amber">{modalMission.estimatedTime}</span>
              </div>
            </div>

            <div className="exp-modal-body">
              <div>
                <div className="exp-label-mono">Scientific Objective</div>
                <p>{modalMission.objective}</p>
              </div>
              <div>
                <div className="exp-label-mono">Field Protocol</div>
                <p>{modalMission.briefing}</p>
              </div>
              <div className="exp-dossier-checklist">
                <div className="exp-label-mono">Execution Sequence</div>
                <ul>
                  {modalMission.checklist.map((step) => (
                    <li key={step}>
                      <CheckCircle2 size={14} />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="exp-modal-footer">
              <button type="button" className="exp-btn-ghost" onClick={() => closeModal()}>
                Cancel
              </button>
              <button
                type="button"
                className="exp-btn-primary"
                onClick={() => closeModal(() => onStartMission(modalMission))}
              >
                Deploy Into Terrain Protocol
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

