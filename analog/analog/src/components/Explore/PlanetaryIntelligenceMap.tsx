import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  Eye,
  Globe2,
  Grid,
  Layers,
  LocateFixed,
  MapPin,
  Navigation,
} from 'lucide-react';
import type { AnalogSiteProfile } from '../../types/dataset';
import type { DerivedTerrainGrid, SpatialLayerId, TerrainGridDataset } from '../../types/terrain';
import { inspectGridCell, renderSpatialMapToCanvas } from '../../services/geospatialService';
import { SOURCE_REGISTRY } from '../../data/sourceRegistry';

gsap.registerPlugin(useGSAP);

type ObservatoryMode = 'earth-satellite' | 'dem-workbench';
type DemTargetKey = 'yungay-earth' | 'gale-murray-mars' | 'gale-bradbury-mars';

const WORLD_COAST_POLYGONS: [number, number][][] = [
  // North & Central America
  [
    [70, -162], [71, -135], [68, -95], [62, -78], [52, -56], [44, -66], [30, -81],
    [25, -80], [29, -95], [21, -97], [15, -88], [9, -80], [14, -92], [23, -106],
    [32, -117], [48, -125], [60, -148], [64, -165],
  ],
  // South America
  [
    [11, -74], [10, -62], [2, -50], [-6, -35], [-23, -43], [-38, -57], [-54, -69],
    [-50, -75], [-33, -72], [-18, -71], [-5, -81], [7, -78],
  ],
  // Greenland
  [[78, -70], [82, -32], [74, -19], [60, -44], [69, -53]],
  // Europe & Eurasia
  [
    [36, -9], [43, -9], [48, -4], [54, 8], [60, 5], [70, 26], [69, 60], [74, 95],
    [72, 138], [66, 178], [55, 162], [44, 144], [35, 136], [31, 122], [22, 114],
    [12, 109], [8, 98], [21, 91], [8, 77], [23, 68], [26, 56], [13, 44],
    [30, 32], [37, 27], [41, 28], [41, 16], [38, 13], [43, 3],
  ],
  // Africa
  [
    [35, -6], [37, 10], [31, 32], [12, 44], [10, 51], [-2, 41], [-16, 40],
    [-28, 32], [-34, 19], [-22, 14], [-6, 12], [5, 8], [5, -10], [15, -17], [26, -15],
  ],
  // Australia & New Zealand
  [
    [-12, 131], [-12, 142], [-25, 153], [-38, 149], [-35, 136], [-34, 115], [-21, 115],
  ],
  [[-35, 173], [-41, 176], [-46, 168], [-42, 171]],
  // Antarctica Shelf
  [
    [-66, -180], [-72, -120], [-65, -60], [-70, 0], [-68, 60], [-66, 130], [-74, 180],
    [-85, 180], [-85, -180],
  ],
];

const DEM_LAYER_MODES: { id: SpatialLayerId; label: string }[] = [
  { id: 'imagery', label: 'Orbital / Satellite' },
  { id: 'elevation', label: 'Elevation (m)' },
  { id: 'slope', label: 'Horn Slope (°)' },
  { id: 'roughness', label: 'Roughness (TRI)' },
];

interface PlanetaryIntelligenceMapProps {
  sites: AnalogSiteProfile[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  earthDataset: TerrainGridDataset | null;
  earthDerived: DerivedTerrainGrid | null;
  marsMurrayDataset: TerrainGridDataset | null;
  marsMurrayDerived: DerivedTerrainGrid | null;
  marsBradburyDataset: TerrainGridDataset | null;
  marsBradburyDerived: DerivedTerrainGrid | null;
  activeLayer: SpatialLayerId;
  onLayerChange: (layer: SpatialLayerId) => void;
  onProceedToComparison: () => void;
}

export const PlanetaryIntelligenceMap: React.FC<PlanetaryIntelligenceMapProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  earthDataset,
  earthDerived,
  marsMurrayDataset,
  marsMurrayDerived,
  marsBradburyDataset,
  marsBradburyDerived,
  activeLayer,
  onLayerChange,
  onProceedToComparison,
}) => {
  const [mode, setMode] = useState<ObservatoryMode>('earth-satellite');
  const [targetFilter, setTargetFilter] = useState<'All' | 'Mars' | 'Moon'>('All');
  const [basemap, setBasemap] = useState<'satellite' | 'osm'>('satellite');
  const [demTarget, setDemTarget] = useState<DemTargetKey>('yungay-earth');
  const [hillshade, setHillshade] = useState(true);
  const [contours, setContours] = useState(true);
  const [cursorGrid, setCursorGrid] = useState<{ row: number; col: number }>({ row: 64, col: 64 });
  const [hoverGeo, setHoverGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [orthoImg, setOrthoImg] = useState<HTMLImageElement | null>(null);

  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dossierRef = useRef<HTMLDivElement | null>(null);

  const visibleSites = useMemo(() => {
    if (targetFilter === 'All') return sites;
    return sites.filter((s) => s.targetPlanets.includes(targetFilter));
  }, [sites, targetFilter]);

  const activeSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) ?? sites[0]!,
    [sites, selectedSiteId]
  );

  const initialSiteRef = useRef(activeSite);
  useEffect(() => {
    initialSiteRef.current = activeSite;
  }, [activeSite]);

  const activeDemBundle = useMemo(() => {
    if (demTarget === 'gale-murray-mars') {
      return {
        dataset: marsMurrayDataset,
        derived: marsMurrayDerived,
        imageUrl: '/data/terrains/gale-hirise.jpg',
        label: 'Mars · Gale Crater (Murray Buttes / VRR)',
      };
    }
    if (demTarget === 'gale-bradbury-mars') {
      return {
        dataset: marsBradburyDataset,
        derived: marsBradburyDerived,
        imageUrl: '/data/terrains/gale-bradbury-hirise.jpg',
        label: 'Mars · Gale Crater (Bradbury Landing)',
      };
    }
    return {
      dataset: earthDataset,
      derived: earthDerived,
      imageUrl: '/data/terrains/yungay-imagery.jpg',
      label: 'Earth · Yungay Station, Atacama Core',
    };
  }, [
    demTarget,
    earthDataset,
    earthDerived,
    marsMurrayDataset,
    marsMurrayDerived,
    marsBradburyDataset,
    marsBradburyDerived,
  ]);

  // GSAP subtle entrance when switching inspected site dossier
  useGSAP(
    () => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      gsap.fromTo(
        '.exp-intel-animate',
        { opacity: 0.45, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { scope: dossierRef, dependencies: [activeSite.id] }
  );

  // GSAP crossfade when changing 30m DEM target or layer
  useGSAP(
    () => {
      if (mode !== 'dem-workbench' || !canvasRef.current) return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      gsap.fromTo(canvasRef.current, { opacity: 0.72 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    },
    { dependencies: [mode, demTarget, activeLayer] }
  );

  // Initialize Leaflet Satellite Map
  useEffect(() => {
    if (mode !== 'earth-satellite') {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        tileLayerRef.current = null;
        markersRef.current.clear();
      }
      return;
    }
    if (!mapBoxRef.current || leafletRef.current) return;

    const seed = initialSiteRef.current;
    const map = L.map(mapBoxRef.current, {
      center: [seed.coordinates.lat, seed.coordinates.lon],
      zoom: seed.hasLocalDem ? 5 : 4,
      minZoom: 2,
      worldCopyJump: true,
      scrollWheelZoom: false,
    });
    leafletRef.current = map;

    // Built-in vector landmass & calibrated 30-degree graticule on a custom lower pane so
    // live satellite tiles render on top when online, while offline/slow loads show crisp cartography.
    const fallbackPane = map.createPane('vectorFallbackPane');
    fallbackPane.style.zIndex = '150';
    fallbackPane.style.pointerEvents = 'none';

    const cartoBase = L.layerGroup().addTo(map);
    for (let lat = -60; lat <= 60; lat += 30) {
      L.polyline(
        [
          [lat, -180],
          [lat, 180],
        ],
        {
          pane: 'vectorFallbackPane',
          color: lat === 0 ? 'rgba(34, 211, 238, 0.28)' : 'rgba(56, 86, 122, 0.24)',
          weight: lat === 0 ? 1.2 : 0.8,
          dashArray: lat === 0 ? undefined : '4 6',
          interactive: false,
        }
      ).addTo(cartoBase);
    }
    for (let lon = -150; lon <= 180; lon += 30) {
      L.polyline(
        [
          [-82, lon],
          [82, lon],
        ],
        {
          pane: 'vectorFallbackPane',
          color: 'rgba(56, 86, 122, 0.22)',
          weight: 0.8,
          dashArray: '4 6',
          interactive: false,
        }
      ).addTo(cartoBase);
    }
    WORLD_COAST_POLYGONS.forEach((poly) => {
      L.polygon(poly, {
        pane: 'vectorFallbackPane',
        color: '#2e5178',
        weight: 1.15,
        fillColor: '#122033',
        fillOpacity: 0.94,
        interactive: false,
      }).addTo(cartoBase);
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setHoverGeo({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    const markers = markersRef.current;
    sites.forEach((site) => {
      const marker = L.circleMarker([site.coordinates.lat, site.coordinates.lon], {
        radius: site.id === seed.id ? 9 : 6.5,
        color: site.id === seed.id ? '#22D3EE' : '#E69F35',
        weight: site.id === seed.id ? 2.5 : 1.75,
        fillColor: site.id === seed.id ? 'rgba(34, 211, 238, 0.26)' : '#090f1a',
        fillOpacity: 0.9,
      }).addTo(map);
      marker.bindTooltip(`${site.name} (${site.country})`, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => {
        onSelectSite(site.id);
      });
      markers.set(site.id, marker);
    });

    return () => {
      map.remove();
      leafletRef.current = null;
      tileLayerRef.current = null;
      markers.clear();
    };
  }, [mode, sites, onSelectSite]);

  // Update Basemap Tile Layer
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || mode !== 'earth-satellite') return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const url =
      basemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution =
      basemap === 'satellite'
        ? 'Esri, Maxar, Earthstar Geographics'
        : '&copy; OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(url, { attribution, maxZoom: 17 }).addTo(map);
  }, [basemap, mode]);

  // Fly map & update marker styles when activeSite changes
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || mode !== 'earth-satellite') return;

    markersRef.current.forEach((marker, id) => {
      const isSelected = id === activeSite.id;
      marker.setStyle({
        radius: isSelected ? 9 : 6.5,
        color: isSelected ? '#22D3EE' : '#E69F35',
        weight: isSelected ? 2.5 : 1.75,
        fillColor: isSelected ? 'rgba(34, 211, 238, 0.26)' : '#090f1a',
      });
      if (isSelected) marker.bringToFront();
    });

    map.flyTo(
      [activeSite.coordinates.lat, activeSite.coordinates.lon],
      activeSite.hasLocalDem ? 6 : 5,
      { duration: 0.95, easeLinearity: 0.25 }
    );
  }, [activeSite, mode]);

  // Load orthophoto for active 30m DEM dataset
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setOrthoImg(img);
    };
    img.onerror = () => {
      if (!cancelled) setOrthoImg(null);
    };
    img.src = activeDemBundle.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [activeDemBundle.imageUrl]);

  // Render 30m raster to canvas
  useEffect(() => {
    if (mode !== 'dem-workbench' || !canvasRef.current || !activeDemBundle.dataset || !activeDemBundle.derived) {
      return;
    }
    renderSpatialMapToCanvas(
      {
        dataset: activeDemBundle.dataset,
        derived: activeDemBundle.derived,
        activeLayer,
        hillshade,
        contours,
        orthophoto: orthoImg,
        size: 460,
      },
      canvasRef.current
    );
  }, [mode, activeDemBundle, activeLayer, hillshade, contours, orthoImg]);

  const probedCell = useMemo(() => {
    if (!activeDemBundle.dataset || !activeDemBundle.derived) return null;
    return inspectGridCell(activeDemBundle.dataset, activeDemBundle.derived, cursorGrid.row, cursorGrid.col);
  }, [activeDemBundle, cursorGrid]);

  const handleCanvasPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeDemBundle.dataset) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCursorGrid({
      col: Math.min(activeDemBundle.dataset.gridWidth - 1, Math.round(fx * (activeDemBundle.dataset.gridWidth - 1))),
      row: Math.min(activeDemBundle.dataset.gridHeight - 1, Math.round(fy * (activeDemBundle.dataset.gridHeight - 1))),
    });
  };

  const displayCoords = hoverGeo
    ? `${hoverGeo.lat.toFixed(4)}°, ${hoverGeo.lon.toFixed(4)}°`
    : activeSite.coordinates.display;

  return (
    <section
      id="planetary-observatory"
      className="exp-section exp-section--bordered"
      aria-labelledby="exp-map-heading"
    >
      <div className="container">
        <div className="exp-section-head">
          <div>
            <span className="exp-kicker">02 · Geospatial Intelligence Observatory</span>
            <h2 id="exp-map-heading" className="exp-h2">
              Analog Telemetry &amp; Orbital DEM Observatory
            </h2>
          </div>

          <div className="exp-segmented" role="group" aria-label="Observatory spatial mode">
            <button
              type="button"
              className={mode === 'earth-satellite' ? 'is-active' : ''}
              onClick={() => setMode('earth-satellite')}
            >
              <Globe2 size={14} />
              Earth Analog Satellite Map
            </button>
            <button
              type="button"
              className={mode === 'dem-workbench' ? 'is-active' : ''}
              onClick={() => setMode('dem-workbench')}
            >
              <Layers size={14} />
              30 m DEM Layer Inspector
            </button>
          </div>
        </div>

        {/* Widescreen 62/38 Map + Intelligence Dossier Layout */}
        <div className="exp-observatory-grid">
          {/* Left Widescreen Interactive Map Canvas */}
          <div className="exp-map-stage">
            <div className="exp-map-toolbar">
              {mode === 'earth-satellite' ? (
                <>
                  <div className="exp-segmented" role="group" aria-label="Target world filter">
                    {(['All', 'Mars', 'Moon'] as const).map((body) => (
                      <button
                        key={body}
                        type="button"
                        className={targetFilter === body ? 'is-active' : ''}
                        onClick={() => setTargetFilter(body)}
                      >
                        {body === 'All' ? 'All Analogs' : `${body} Analogs`}
                      </button>
                    ))}
                  </div>
                  <div className="exp-segmented" role="group" aria-label="Satellite basemap">
                    <button
                      type="button"
                      className={basemap === 'satellite' ? 'is-active' : ''}
                      onClick={() => setBasemap('satellite')}
                    >
                      Satellite (Esri)
                    </button>
                    <button
                      type="button"
                      className={basemap === 'osm' ? 'is-active' : ''}
                      onClick={() => setBasemap('osm')}
                    >
                      Topographic Grid
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="exp-segmented" role="group" aria-label="30m DEM dataset">
                    <button
                      type="button"
                      className={demTarget === 'yungay-earth' ? 'is-active' : ''}
                      onClick={() => setDemTarget('yungay-earth')}
                    >
                      Atacama (Earth)
                    </button>
                    <button
                      type="button"
                      className={demTarget === 'gale-murray-mars' ? 'is-active' : ''}
                      onClick={() => setDemTarget('gale-murray-mars')}
                    >
                      Murray Buttes (Mars)
                    </button>
                    <button
                      type="button"
                      className={demTarget === 'gale-bradbury-mars' ? 'is-active' : ''}
                      onClick={() => setDemTarget('gale-bradbury-mars')}
                    >
                      Bradbury (Mars)
                    </button>
                  </div>
                  <div className="exp-toggle-group">
                    <button
                      type="button"
                      className={`exp-chip ${hillshade ? 'is-active' : ''}`}
                      onClick={() => setHillshade((v) => !v)}
                    >
                      <Eye size={13} />
                      Hillshade
                    </button>
                    <button
                      type="button"
                      className={`exp-chip ${contours ? 'is-active' : ''}`}
                      onClick={() => setContours((v) => !v)}
                    >
                      <Grid size={13} />
                      Contours
                    </button>
                  </div>
                </>
              )}
            </div>

            {mode === 'earth-satellite' ? (
              <div className="exp-leaflet-wrap">
                <div
                  ref={mapBoxRef}
                  className="exp-leaflet-canvas"
                  aria-label="Interactive global Earth analog satellite map"
                />
                <div className="exp-map-readout">
                  <span>
                    <LocateFixed size={12} style={{ marginRight: 6, verticalAlign: '-1px' }} />
                    Coords: <strong>{displayCoords}</strong>
                  </span>
                  <span>
                    Layer: <strong>{basemap === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap'}</strong>
                  </span>
                  <span key={activeSite.id} className="exp-telemetry-lock">
                    Telemetry Locked
                  </span>
                </div>
              </div>
            ) : (
              <div className="exp-dem-wrap">
                <div className="exp-dem-layer-bar">
                  {DEM_LAYER_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`exp-chip ${activeLayer === m.id ? 'is-active' : ''}`}
                      onClick={() => onLayerChange(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="exp-dem-canvas-stage">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={460}
                    onMouseMove={handleCanvasPointer}
                    onClick={handleCanvasPointer}
                    className="exp-dem-canvas"
                    aria-label="30 m orbital DEM terrain layer inspector"
                  />
                </div>

                {probedCell && (
                  <div className="exp-map-readout">
                    <span>
                      Geo: <strong>{probedCell.geographicLabel}</strong>
                    </span>
                    <span>
                      Elev (MEASURED):{' '}
                      <strong>
                        {probedCell.elevationMeters !== null
                          ? `${probedCell.elevationMeters.toFixed(1)} m`
                          : 'N/A'}
                      </strong>
                    </span>
                    <span>
                      Slope (DERIVED):{' '}
                      <strong>
                        {probedCell.slopeDegrees !== null
                          ? `${probedCell.slopeDegrees.toFixed(1)}° ${probedCell.aspectCompass ?? ''}`
                          : 'N/A'}
                      </strong>
                    </span>
                    <span>
                      TRI:{' '}
                      <strong>
                        {probedCell.roughnessTriMeters !== null
                          ? `${probedCell.roughnessTriMeters.toFixed(2)} m`
                          : 'N/A'}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Horizontal Site Quick-Selector Rail */}
            <div className="exp-site-selector" role="list" aria-label="Catalog terrestrial analog locations">
              {visibleSites.map((site) => {
                const selected = site.id === activeSite.id;
                return (
                  <button
                    key={site.id}
                    type="button"
                    role="listitem"
                    className={`exp-site-pill ${selected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onSelectSite(site.id);
                      if (mode !== 'earth-satellite') setMode('earth-satellite');
                    }}
                  >
                    <MapPin size={12} />
                    <span>{site.name.split(',')[0]}</span>
                    <small>{site.country}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Target Intelligence Dossier */}
          <aside ref={dossierRef} className="exp-intel-dossier" aria-label="Selected analog site intelligence">
            <div className="exp-intel-head exp-intel-animate">
              <div className="exp-intel-badges">
                <span
                  className={
                    activeSite.establishmentStatus === 'Established Analog Site'
                      ? 'exp-tag-cyan'
                      : 'exp-tag-amber'
                  }
                >
                  {activeSite.establishmentStatus}
                </span>
                <span className="exp-tag-neutral">
                  {activeSite.hasLocalDem ? '30 m DEM Ready' : 'Satellite Catalog'}
                </span>
              </div>
              <h3 className="exp-h3" style={{ marginTop: 10 }}>
                {activeSite.name}
              </h3>
              <div className="exp-mono-muted">
                <Navigation size={12} style={{ marginRight: 5, verticalAlign: '-1px' }} />
                {activeSite.region}, {activeSite.country} · {activeSite.coordinates.display}
              </div>
            </div>

            <div className="exp-intel-metrics exp-intel-animate">
              <div className="exp-metric-box">
                <span>Elevation Range</span>
                <strong>{activeSite.elevationRange}</strong>
              </div>
              <div className="exp-metric-box">
                <span>Target Preparation</span>
                <strong>{activeSite.targetPlanets.join(' & ')} Missions</strong>
              </div>
            </div>

            <div className="exp-intel-block exp-intel-animate">
              <div className="exp-label-mono">Exploration Role</div>
              <p>{activeSite.planetaryApplication}</p>
            </div>

            <div className="exp-intel-block exp-intel-animate">
              <div className="exp-label-mono">Geological Context</div>
              <p>{activeSite.geologicalContext}</p>
            </div>

            <div className="exp-intel-block exp-intel-animate">
              <div className="exp-label-mono">Field Constraints &amp; Limitations</div>
              <ul>
                {activeSite.limitations.map((lim) => (
                  <li key={lim}>{lim}</li>
                ))}
              </ul>
            </div>

            <div className="exp-intel-sources exp-intel-animate">
              {activeSite.sourceIds.map((sid) => {
                const src = SOURCE_REGISTRY[sid];
                if (!src) return null;
                return (
                  <a key={src.id} href={src.url} target="_blank" rel="noreferrer" className="exp-source-chip">
                    {src.institution}
                  </a>
                );
              })}
            </div>

            <div className="exp-intel-footer exp-intel-animate">
              <button
                type="button"
                className="exp-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onProceedToComparison}
              >
                Compare {activeSite.name.split(',')[0]} vs. Mars
                <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

