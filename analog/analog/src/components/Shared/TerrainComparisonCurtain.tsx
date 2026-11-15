import { useEffect, useRef, useState } from 'react';
import type { DerivedTerrainGrid, TerrainGridDataset } from '../../types/terrain';
import { renderSpatialMapToCanvas } from '../../services/geospatialService';

interface Props {
  earth: TerrainGridDataset;
  earthDerived: DerivedTerrainGrid;
  target: TerrainGridDataset;
  targetDerived: DerivedTerrainGrid;
}

export function TerrainComparisonCurtain({ earth, earthDerived, target, targetDerived }: Props) {
  const [split, setSplit] = useState(50);
  const [layer, setLayer] = useState<'elevation' | 'slope' | 'roughness'>('elevation');
  const earthCanvas = useRef<HTMLCanvasElement>(null);
  const targetCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!earthCanvas.current || !targetCanvas.current) return;
    const reliefSpanMeters = Math.max(earth.stats.reliefMeters, target.stats.reliefMeters, 1);
    const options = { activeLayer: layer, hillshade: true, size: 512, reliefSpanOverride: reliefSpanMeters };
    renderSpatialMapToCanvas({ ...options, dataset: earth, derived: earthDerived }, earthCanvas.current);
    renderSpatialMapToCanvas({ ...options, dataset: target, derived: targetDerived }, targetCanvas.current);
  }, [earth, earthDerived, target, targetDerived, layer]);

  const footprint = (dataset: TerrainGridDataset) => (dataset.gridWidth * dataset.cellSizeMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return <section className="terraform-curtain" aria-label="Earth and destination terrain comparison">
    <h3>Slide between Earth and {target.planet}</h3>
    <div className="terraform-curtain-controls">
      <span><strong>Earth</strong> · {earth.shortName} · {footprint(earth)} km wide</span>
      <label>Map layer <select value={layer} onChange={(event) => {
        const value = event.target.value;
        if (value === 'elevation' || value === 'slope' || value === 'roughness') setLayer(value);
      }}>
        <option value="elevation">Elevation</option>
        <option value="slope">Slope</option>
        <option value="roughness">Roughness</option>
      </select></label>
      <span><strong>{target.planet}</strong> · {target.shortName} · {footprint(target)} km wide</span>
    </div>
    <div className="terraform-curtain-stage">
      <canvas ref={targetCanvas} aria-label={`${target.shortName} ${layer} map`} />
      <canvas ref={earthCanvas} aria-label={`${earth.shortName} ${layer} map`}
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
      <div className="terraform-curtain-divider" style={{ left: `${split}%` }} aria-hidden="true"><span>↔</span></div>
      <input type="range" min={0} max={100} value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label={`Slide between Earth and ${target.planet}`}
        aria-valuetext={`${split}% Earth visible`} />
    </div>
    <small>Drag the divider or use the arrow keys. Each side shows its own terrain window, and the map footprints can differ.</small>
    <div className="terraform-curtain-controls">
      <a href={earth.provenance.originalUrl} target="_blank" rel="noreferrer">Earth map source · {earth.provenance.datasetName}</a>
      <a href={target.provenance.originalUrl} target="_blank" rel="noreferrer">{target.planet} map source · {target.provenance.datasetName}</a>
    </div>
  </section>;
}
