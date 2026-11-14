import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { ScienceTopic } from '../../data/fieldLabData';

gsap.registerPlugin(useGSAP);

interface ExpeditionScienceBriefsProps {
  topics: ScienceTopic[];
}

export const ExpeditionScienceBriefs: React.FC<ExpeditionScienceBriefsProps> = ({ topics }) => {
  const [openTopicId, setOpenTopicId] = useState<string>(topics[0]?.id ?? 'what-are-analogs');
  const listRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!openTopicId) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const panel = listRef.current?.querySelector('.exp-science-row.is-open .exp-science-body');
      if (panel) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
      }
    },
    { scope: listRef, dependencies: [openTopicId] }
  );

  return (
    <section
      id="why-analogs-matter"
      className="exp-section exp-section--bordered"
      aria-labelledby="exp-science-heading"
    >
      <div className="container">
        <div className="exp-science-layout">
          <div className="exp-science-intro">
            <span className="exp-kicker">04 · Why Analog Sites Matter</span>
            <h2 id="exp-science-heading" className="exp-h2">
              Preparing Permanent Moon Bases &amp; Mars Expeditions on Earth
            </h2>
            <p className="exp-lead" style={{ marginTop: 14 }}>
              No single terrestrial basin matches Mars gravity, vacuum lunar regolith, or unattenuated solar radiation. Instead, scientists isolate discrete processes—hyperarid salt crusts, volcanic hazard trafficability, and polar ice stability—to validate flight hardware before launch.
            </p>
            <div className="exp-science-Callout">
              <div className="exp-label-mono">Methodological Boundary</div>
              <p>
                Measured elevation datums differ across worlds (Earth EGM2008 geoid vs. Mars MOLA areoid). Quantitative alignment relies on matched grid spacing and elevation relief rather than absolute altitude.
              </p>
            </div>
          </div>

          <div ref={listRef} className="exp-science-accordion">
            {topics.map((topic) => {
              const isOpen = openTopicId === topic.id;
              return (
                <div key={topic.id} className={`exp-science-row ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="exp-science-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenTopicId(isOpen ? '' : topic.id)}
                  >
                    <span className="exp-mono-cyan">{topic.index}</span>
                    <span className="exp-science-q">{topic.question}</span>
                    <ChevronDown
                      size={16}
                      className={`exp-science-chevron ${isOpen ? 'is-rotated' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="exp-science-body">
                      <p className="exp-science-summary">{topic.summary}</p>
                      <ul>
                        {topic.details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                      <div className="exp-science-ref">
                        <BookOpen size={12} />
                        <span>{topic.referenceNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

