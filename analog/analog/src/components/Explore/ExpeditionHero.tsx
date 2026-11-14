import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowDown, Compass, Layers } from 'lucide-react';
import { PLANETARY_TARGETS } from '../../data/planetaryTargets';
import type { TerrainGridDataset } from '../../types/terrain';

gsap.registerPlugin(useGSAP);

interface ExpeditionHeroProps {
  earthDataset: TerrainGridDataset | null;
  marsDataset: TerrainGridDataset | null;
  activeSiteName: string;
  onStartExpedition: () => void;
  onOpenMapObservatory: () => void;
}

export const ExpeditionHero: React.FC<ExpeditionHeroProps> = ({
  earthDataset,
  marsDataset,
  activeSiteName,
  onStartExpedition,
  onOpenMapObservatory,
}) => {
  const heroRef = useRef<HTMLElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const quickXRef = useRef<gsap.QuickToFunc | null>(null);
  const quickYRef = useRef<gsap.QuickToFunc | null>(null);

  useGSAP(
    () => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      gsap.from('.exp-hero-reveal', {
        y: 18,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      if (bgLayerRef.current && window.matchMedia('(pointer: fine)').matches) {
        quickXRef.current = gsap.quickTo(bgLayerRef.current, 'x', { duration: 0.65, ease: 'power3.out' });
        quickYRef.current = gsap.quickTo(bgLayerRef.current, 'y', { duration: 0.65, ease: 'power3.out' });
      }
    },
    { scope: heroRef }
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!quickXRef.current || !quickYRef.current || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    quickXRef.current(-nx * 16);
    quickYRef.current(-ny * 12);
  };

  const handlePointerLeave = () => {
    quickXRef.current?.(0);
    quickYRef.current?.(0);
  };

  const marsGravity = PLANETARY_TARGETS.mars.characteristics[0]?.value ?? '3.721';
  const moonGravity = PLANETARY_TARGETS.moon.characteristics[0]?.value ?? '1.622';
  const earthGravity = PLANETARY_TARGETS.earth.characteristics[0]?.value ?? '9.807';

  return (
    <section
      ref={heroRef}
      id="expedition-overview"
      className="exp-hero"
      aria-labelledby="exp-hero-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={bgLayerRef} className="exp-hero-backdrop" aria-hidden="true" />
      <div className="exp-hero-scrim" aria-hidden="true" />

      <div className="container">
        <div className="exp-hero-grid">
          {/* Left Command Column */}
          <div className="exp-hero-copy">
            <div className="exp-kicker-bar exp-hero-reveal">
              <Compass size={13} />
              <span>EXPLORE / PLANETARY ANALOGS</span>
            </div>

            <h1 id="exp-hero-title" className="exp-h1 exp-hero-reveal">
              Explore planetary analogs.
            </h1>

            <p className="exp-hero-lead exp-hero-reveal">
              Select the Moon or Mars, inspect its terrain, and discover Earth locations that help researchers investigate similar conditions.
            </p>

            <div className="exp-hero-actions exp-hero-reveal">
              <button
                type="button"
                className="exp-btn-primary"
                onClick={onStartExpedition}
              >
                Explore destinations
                <ArrowDown size={15} />
              </button>

              <button
                type="button"
                className="exp-btn-ghost"
                onClick={onOpenMapObservatory}
              >
                <Layers size={14} />
                View Earth analog map
              </button>
            </div>

            <div className="exp-telemetry-strip exp-hero-reveal">
              <div className="exp-telemetry-cell">
                <span className="exp-label-mono">Active Terrestrial Corridor</span>
                <strong>{activeSiteName}</strong>
                <small>Copernicus GLO-30 · 24.085°S, 69.915°W</small>
              </div>
              <div className="exp-telemetry-cell">
                <span className="exp-label-mono">Orbital Mars Window</span>
                <strong>Gale Crater · Murray Buttes</strong>
                <small>
                  USGS 30 m Subset ·{' '}
                  {marsDataset ? `${marsDataset.stats.reliefMeters.toFixed(1)} m relief` : '4.589°S, 137.441°E'}
                </small>
              </div>
              <div className="exp-telemetry-cell">
                <span className="exp-label-mono">Measured Gravity Baseline</span>
                <strong>
                  {earthGravity} / {moonGravity} / {marsGravity} m/s²
                </strong>
                <small>Earth · Moon · Mars (NASA NSSDCA)</small>
              </div>
            </div>
          </div>

          {/* Right Asymmetric Optical Reconnaissance Plate */}
          <div className="exp-hero-visual exp-hero-reveal">
            <div className="exp-plate">
              <div className="exp-plate-topbar">
                <span className="exp-mono-cyan">RECON PLATE // COREPAIR-30M</span>
                <span className="exp-mono-amber">3.84 × 3.84 KM</span>
              </div>

              <div className="exp-plate-split">
                <div className="exp-plate-half">
                  <img
                    src="/data/terrains/gale-hirise.jpg"
                    alt="Gale Crater Murray Buttes orbital HiRISE reference mosaic on Mars"
                  />
                  <div className="exp-plate-tag">
                    <span>MARS · GALE CRATER</span>
                    <small>HiRISE / USGS</small>
                  </div>
                </div>
                <div className="exp-plate-half">
                  <img
                    src="/data/terrains/yungay-imagery.jpg"
                    alt="Yungay Station hyperarid core in the Atacama Desert, Chile"
                  />
                  <div className="exp-plate-tag">
                    <span>EARTH · YUNGAY CORE</span>
                    <small>Esri / Copernicus</small>
                  </div>
                </div>
              </div>

              <div className="exp-plate-footer">
                <div>
                  <span className="exp-label-mono">EARTH SUBSET RELIEF</span>
                  <strong>
                    {earthDataset ? `${earthDataset.stats.reliefMeters.toFixed(1)} m` : '264.1 m'}
                  </strong>
                </div>
                <div>
                  <span className="exp-label-mono">MARS SUBSET RELIEF</span>
                  <strong>
                    {marsDataset ? `${marsDataset.stats.reliefMeters.toFixed(1)} m` : '638.7 m'}
                  </strong>
                </div>
                <div>
                  <span className="exp-label-mono">SPACING</span>
                  <strong>30.0 m / cell</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

