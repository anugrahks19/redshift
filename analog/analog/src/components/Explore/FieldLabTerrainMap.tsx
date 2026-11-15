import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanetaryRegionTarget } from '../../types/dataset';
import type { DerivedTerrainGrid, SpatialLayerId, TerrainGridDataset } from '../../types/terrain';
import { inspectGridCell, renderSpatialMapToCanvas } from '../../services/geospatialService';

const LAYERS: { id: SpatialLayerId; label: string; meaning: string }[] = [
  { id: 'imagery', label: 'Orbital image', meaning: 'Surface texture helps locate visible landforms. Appearance alone cannot establish geological equivalence.' },
  { id: 'elevation', label: 'Elevation', meaning: 'Elevation describes surface height relative to the planet’s reference datum. Compare relief and landforms, not absolute height across planets.' },
  { id: 'slope', label: 'Slope', meaning: 'Derived slope describes local grade. Steeper ground can constrain rover mobility and instrument deployment.' },
  { id: 'roughness', label: 'Roughness', meaning: 'Derived terrain ruggedness shows elevation variation across neighboring cells. Grid spacing determines the smallest terrain features the map can show.' },
];

interface Props {
  planet: 'Mars' | 'Moon';
  onPlanetChange: (planet: 'Mars' | 'Moon') => void;
  regions: PlanetaryRegionTarget[];
  region: PlanetaryRegionTarget;
  onRegionChange: (id: string) => void;
  dataset: TerrainGridDataset | null;
  derived: DerivedTerrainGrid | null;
  layer: SpatialLayerId;
  onLayerChange: (layer: SpatialLayerId) => void;
  onContinue?: () => void;
}

export const FieldLabTerrainMap: React.FC<Props> = ({ planet, onPlanetChange, regions, region, onRegionChange, dataset, derived, layer, onLayerChange, onContinue }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [orthophoto, setOrthophoto] = useState<HTMLImageElement | null>(null);
  const [cell, setCell] = useState({ row: 64, col: 64 });
  const [zoom, setZoom] = useState(1);
  const availableRegions = regions.filter((item) => item.planet === planet);
  const activeLayer = LAYERS.find((item) => item.id === layer) ?? LAYERS[1]!;
  const sample = useMemo(() => dataset && derived ? inspectGridCell(dataset, derived, cell.row, cell.col) : null, [dataset, derived, cell]);
  const localDataAvailable = region.hasLocalDem && !!dataset && !!derived && dataset.id === region.terrainDatasetId;

  useEffect(() => {
    if (!region.imageUrl) { setOrthophoto(null); return; }
    let cancelled = false;
    const image = new Image();
    image.onload = () => { if (!cancelled) setOrthophoto(image); };
    image.onerror = () => { if (!cancelled) setOrthophoto(null); };
    image.src = region.imageUrl;
    return () => { cancelled = true; };
  }, [region.imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !localDataAvailable || !dataset || !derived) return;
    renderSpatialMapToCanvas({ dataset, derived, activeLayer: layer, orthophoto, hillshade: true, contours: layer === 'elevation', size: 680 }, canvasRef.current);
  }, [dataset, derived, layer, orthophoto, localDataAvailable]);

  const inspect = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dataset) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const col = Math.min(dataset.gridWidth - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * dataset.gridWidth)));
    const row = Math.min(dataset.gridHeight - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * dataset.gridHeight)));
    setCell({ row, col });
  };

  return <section className="lab-terrain" aria-label="Planetary terrain investigation">
    <div className="lab-terrain-controls"><div className="atlas-planet-switch" role="group" aria-label="Planetary target">{(['Mars', 'Moon'] as const).map((body) => <button key={body} type="button" className={planet === body ? 'is-active' : ''} aria-pressed={planet === body} onClick={() => onPlanetChange(body)}>{body}</button>)}</div><div className="lab-region-controls" role="group" aria-label="Target region">{availableRegions.map((item) => <button key={item.id} type="button" className={item.id === region.id ? 'is-active' : ''} aria-pressed={item.id === region.id} onClick={() => { onRegionChange(item.id); setCell({ row: 64, col: 64 }); setZoom(1); }}>{item.shortName}</button>)}</div></div>
    <div className="lab-terrain-grid">
      <div className="lab-map-card"><div className="lab-map-toolbar"><span>{planet.toUpperCase()} / {region.shortName}</span><span>{localDataAvailable ? `${dataset.cellSizeMeters.toLocaleString()} M GRID · LOCAL DATA` : 'REFERENCE ONLY · NO LOCAL DEM'}</span></div><div className="lab-map-viewport">{localDataAvailable ? <canvas ref={canvasRef} onPointerDown={inspect} style={{ transform: `scale(${zoom})` }} aria-label={`${region.shortName} ${activeLayer.label} map. Click to inspect a cell.`} /> : <div className="lab-map-unavailable"><img src="/data/terrains/moon-map.jpg" alt="Global lunar surface reference; not a mapped image of this region" /><span>Local terrain grid unavailable. Global lunar reference image shown.</span></div>}</div><div className="lab-map-foot"><span>{region.coordinatesDisplay}</span><div><button type="button" disabled={!localDataAvailable} onClick={() => setZoom((value) => Math.max(1, value - .25))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" disabled={!localDataAvailable} onClick={() => setZoom((value) => Math.min(2.5, value + .25))} aria-label="Zoom in">+</button></div></div></div>
      <aside className="lab-terrain-aside"><div className="lab-aside-section"><p className="atlas-kicker">MAP LAYER</p><div className="lab-layer-list">{LAYERS.map((item) => <button key={item.id} type="button" disabled={!localDataAvailable && item.id !== 'imagery'} className={layer === item.id ? 'is-active' : ''} onClick={() => onLayerChange(item.id)}>{item.label}<span>{item.id === 'imagery' ? 'OBSERVED' : item.id === 'elevation' ? 'MEASURED' : 'DERIVED'}</span></button>)}</div><p className="lab-interpretation">{activeLayer.meaning}</p></div><div className="lab-aside-section"><p className="atlas-kicker">POINT INSPECTION</p>{localDataAvailable && sample ? <div className="lab-sample"><strong>{sample.geographicLabel}</strong><div><span>Elevation</span><b>{sample.elevationMeters?.toFixed(1) ?? 'Unavailable'} m</b></div><div><span>Slope</span><b>{sample.slopeDegrees?.toFixed(1) ?? 'Unavailable'}°</b></div><div><span>Roughness</span><b>{sample.roughnessTriMeters?.toFixed(2) ?? 'Unavailable'} m</b></div><small>Click a location on the map to inspect its grid cell.</small></div> : <p className="lab-no-data">No local {planet} elevation grid is bundled for this region. Quantitative point measurements are unavailable.</p>}</div><details className="lab-provenance"><summary>Source and limitations</summary><div><p>{dataset && localDataAvailable ? `${dataset.provenance.datasetName} · ${dataset.provenance.provider} · ${dataset.analysisResolutionLabel}` : 'Orbital reference metadata; local terrain measurements unavailable.'}</p><p>{region.limitations[0]}</p></div></details>{onContinue && <button type="button" className="field-lab-primary" onClick={onContinue}>Examine Earth analogs <span aria-hidden="true">↗</span></button>}</aside>
    </div>
  </section>;
};
