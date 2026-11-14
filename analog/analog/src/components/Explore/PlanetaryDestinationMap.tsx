import React, { useMemo, useState } from 'react';
import { Compass, Layers, MapPin, AlertTriangle, ArrowRight } from 'lucide-react';
import type { PlanetaryRegionTarget } from '../../types/dataset';
import { PLANETARY_TARGETS } from '../../data/planetaryTargets';

export type PlanetaryOverlayLayer = 'elevation' | 'slope' | 'illumination' | 'volatiles';

const LAYER_OPTIONS: { id: PlanetaryOverlayLayer; label: string; badge: string }[] = [
  { id: 'elevation', label: 'Elevation Datum', badge: 'MOLA / LOLA' },
  { id: 'slope', label: 'Slope Hazard', badge: 'Traverse °' },
  { id: 'illumination', label: 'Solar / Thermal', badge: 'W/m² & K' },
  { id: 'volatiles', label: 'Minerals & Volatiles', badge: 'Hydration' },
];

interface PlanetaryDestinationMapProps {
  targetPlanet: 'Mars' | 'Moon';
  onTargetPlanetChange: (planet: 'Mars' | 'Moon') => void;
  regions: PlanetaryRegionTarget[];
  selectedRegionId: string;
  onSelectRegion: (regionId: string) => void;
  onProceedToEarthDiscovery: () => void;
}

export const PlanetaryDestinationMap: React.FC<PlanetaryDestinationMapProps> = ({
  targetPlanet,
  onTargetPlanetChange,
  regions,
  selectedRegionId,
  onSelectRegion,
  onProceedToEarthDiscovery,
}) => {
  const [activeLayer, setActiveLayer] = useState<PlanetaryOverlayLayer>('elevation');

  const planetRegions = useMemo(
    () => regions.filter((r) => r.planet === targetPlanet),
    [regions, targetPlanet]
  );

  const activeRegion = useMemo(
    () => planetRegions.find((r) => r.id === selectedRegionId) ?? planetRegions[0]!,
    [planetRegions, selectedRegionId]
  );

  const targetProfile = targetPlanet === 'Mars' ? PLANETARY_TARGETS.mars : PLANETARY_TARGETS.moon;

  const getLayerReading = (region: PlanetaryRegionTarget): string => {
    switch (activeLayer) {
      case 'elevation':
        return region.elevationSummary;
      case 'slope':
        return region.slopeSummary;
      case 'illumination':
        return region.illuminationSummary;
      case 'volatiles':
        return region.volatileSummary;
    }
  };

  // Restrained, scientific planetary map tones matched to body & layer (zero violet)
  const mapSurfaceBg =
    targetPlanet === 'Mars'
      ? activeLayer === 'elevation'
        ? '#1F1815'
        : activeLayer === 'slope'
          ? '#1A1C20'
          : activeLayer === 'illumination'
            ? '#221C16'
            : '#142024'
      : activeLayer === 'elevation'
        ? '#141920'
        : activeLayer === 'slope'
          ? '#181C22'
          : activeLayer === 'illumination'
            ? '#121820'
            : '#101E24';

  const layerTintColor =
    activeLayer === 'elevation'
      ? targetPlanet === 'Mars'
        ? '#C28B38'
        : '#9FB0C1'
      : activeLayer === 'slope'
        ? '#D97757'
        : activeLayer === 'illumination'
          ? '#E7A95A'
          : '#327F79';

  return (
    <section
      id="planetary-destination"
      className="exp-section"
      aria-labelledby="exp-dest-heading"
    >
      <div className="container">
        <div className="exp-section-head">
          <div>
            <span className="exp-kicker">01 · Destination &amp; Planetary Reconnaissance (EX-01 — EX-04)</span>
            <h2 id="exp-dest-heading" className="exp-h2">
              Select Planetary Target &amp; Inspect Orbital Layers
            </h2>
          </div>

          <div className="exp-dest-switch" role="tablist" aria-label="Planetary destination selector">
            {(['Mars', 'Moon'] as const).map((planet) => {
              const active = targetPlanet === planet;
              return (
                <button
                  key={planet}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`exp-dest-btn ${active ? 'is-active' : ''}`}
                  onClick={() => onTargetPlanetChange(planet)}
                >
                  <Compass size={14} />
                  <span>{planet === 'Mars' ? 'Mars Targets' : 'Moon Targets'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="exp-planet-workspace">
          {/* Left Interactive Planetary Map Canvas */}
          <div className="exp-planet-map-card">
            <div className="exp-planet-map-toolbar">
              <div className="exp-layer-pills" role="group" aria-label="Planetary scientific layers">
                <span className="mono exp-toolbar-label">
                  <Layers size={12} /> LAYER:
                </span>
                {LAYER_OPTIONS.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    className={`exp-layer-pill ${activeLayer === layer.id ? 'is-active' : ''}`}
                    onClick={() => setActiveLayer(layer.id)}
                  >
                    <span>{layer.label}</span>
                  </button>
                ))}
              </div>
              <span className="mono exp-layer-badge">
                {LAYER_OPTIONS.find((l) => l.id === activeLayer)?.badge}
              </span>
            </div>

            <div className="exp-planet-svg-stage" style={{ background: mapSurfaceBg }}>
              <svg
                viewBox="0 0 800 420"
                className="exp-planet-svg"
                role="img"
                aria-label={`${targetPlanet} interactive planetary coordinate map`}
              >
                <defs>
                  <pattern id="planetary-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                <rect width="800" height="420" fill="url(#planetary-grid)" />

                {/* Topographic contour bands representing planetary macro-provinces */}
                {targetPlanet === 'Mars' ? (
                  <g fill="none" stroke={layerTintColor} strokeOpacity="0.28" strokeWidth="1.2">
                    <path d="M 40 215 Q 200 185, 360 225 T 760 205" />
                    <path d="M 40 165 Q 240 120, 440 155 T 760 140" />
                    <path d="M 40 280 Q 290 325, 520 270 T 760 295" />
                    <ellipse cx="565" cy="220" rx="115" ry="62" strokeOpacity="0.35" />
                    <ellipse cx="368" cy="151" rx="76" ry="44" strokeOpacity="0.28" />
                    <circle cx="565" cy="220" r="34" strokeDasharray="4 4" />
                  </g>
                ) : (
                  <g fill="none" stroke={layerTintColor} strokeOpacity="0.28" strokeWidth="1.2">
                    <circle cx="416" cy="332" r="56" strokeOpacity="0.4" />
                    <circle cx="416" cy="332" r="108" strokeDasharray="4 4" />
                    <ellipse cx="272" cy="180" rx="88" ry="54" />
                    <ellipse cx="512" cy="197" rx="95" ry="62" />
                    <path d="M 60 210 Q 400 245, 740 200" strokeOpacity="0.22" />
                  </g>
                )}

                {/* Equator / Polar reference hairlines */}
                <line x1="0" y1="210" x2="800" y2="210" stroke="rgba(255,255,255,0.14)" strokeDasharray="6 6" />
                <text x="16" y="203" fill="#9FB0C1" fontSize="10" fontFamily="IBM Plex Mono, monospace">
                  {targetPlanet === 'Mars' ? 'EQUATOR 0° LAT' : 'EQUATORIAL MARE BELT · POLAR CAPS SOUTH'}
                </text>

                {/* Clickable Target Region Markers */}
                {planetRegions.map((region) => {
                  const cx = (region.mapX / 100) * 800;
                  const cy = (region.mapY / 100) * 420;
                  const selected = region.id === activeRegion.id;
                  return (
                    <g
                      key={region.id}
                      className="exp-planet-marker-group"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectRegion(region.id)}
                    >
                      {selected && (
                        <>
                          <circle
                            cx={cx}
                            cy={cy}
                            r="24"
                            fill="none"
                            stroke={layerTintColor}
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r="14"
                            fill={layerTintColor}
                            fillOpacity="0.18"
                          />
                        </>
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={selected ? 7.5 : 5.5}
                        fill={selected ? '#E7A95A' : '#FFFFFF'}
                        stroke="#0F172A"
                        strokeWidth="2"
                      />
                      <g transform={`translate(${cx + 12}, ${cy - 8})`}>
                        <rect
                          x="-2"
                          y="-11"
                          width={region.shortName.length * 7.2 + 16}
                          height="22"
                          rx="3"
                          fill={selected ? 'rgba(16, 30, 43, 0.94)' : 'rgba(16, 30, 43, 0.78)'}
                          stroke={selected ? '#E7A95A' : 'rgba(255,255,255,0.2)'}
                        />
                        <text
                          x="6"
                          y="3"
                          fill={selected ? '#FFFFFF' : '#CBD6E2'}
                          fontSize="11"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight={selected ? 600 : 400}
                        >
                          {region.shortName}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              <div className="exp-planet-map-caption mono">
                <span>
                  BODY: {targetProfile.name.toUpperCase()} ({targetProfile.bodyType})
                </span>
                <span>
                  SELECTED TARGET: {activeRegion.coordinatesDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Right Scientific Information Panel */}
          <aside className="exp-planet-info-card">
            <div className="exp-planet-info-head">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span className="badge badge--blue">
                  <MapPin size={11} />
                  {activeRegion.planet.toUpperCase()} TARGET REGION
                </span>
                <span className={`badge ${activeRegion.hasLocalDem ? 'badge--real' : 'badge--demo'}`}>
                  {activeRegion.hasLocalDem ? '30m Local DEM Bundled' : 'Metadata & Literature Only'}
                </span>
              </div>

              <h3 className="exp-planet-region-title">{activeRegion.name}</h3>
              <div className="mono exp-planet-coords">{activeRegion.coordinatesDisplay}</div>
            </div>

            <div className="exp-planet-layer-readout">
              <span className="mono exp-label-xs">
                ACTIVE LAYER READOUT · {LAYER_OPTIONS.find((l) => l.id === activeLayer)?.label.toUpperCase()}
              </span>
              <p>{getLayerReading(activeRegion)}</p>
            </div>

            <div className="exp-planet-metrics-grid">
              <div>
                <span className="mono exp-label-xs">MINERALOGY &amp; GEOLOGY</span>
                <p>{activeRegion.mineralogySummary}</p>
              </div>
              <div>
                <span className="mono exp-label-xs">SCIENTIFIC FOCUS</span>
                <p>{activeRegion.scientificFocus}</p>
              </div>
            </div>

            <div className="exp-planet-limitations">
              <div className="mono exp-limit-title">
                <AlertTriangle size={13} />
                <span>OBSERVATION &amp; COVERAGE LIMITS</span>
              </div>
              <ul>
                {activeRegion.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>

            <div className="exp-planet-actions">
              <div className="mono" style={{ fontSize: 11, color: '#9fb0c1' }}>
                Target region list ({planetRegions.length}):{' '}
                {planetRegions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`exp-inline-region-btn ${r.id === activeRegion.id ? 'is-active' : ''}`}
                    onClick={() => onSelectRegion(r.id)}
                  >
                    {r.shortName}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn--primary"
                style={{ width: '100%', padding: '10px 14px' }}
                onClick={onProceedToEarthDiscovery}
              >
                <span>Discover &amp; Rank Earth Analogs for {activeRegion.shortName}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
