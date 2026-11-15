import React from 'react';
import { Layers, Sliders, Sun, Moon } from 'lucide-react';
import type { SimilarityWeights, SpatialLayerId } from '../../types/terrain';

interface LayerOption {
  id: SpatialLayerId;
  heatmapNum?: number;
  label: string;
  availability: string;
  note: string;
  formula?: string;
}

const SPATIAL_LAYERS: LayerOption[] = [
  {
    id: 'elevation',
    heatmapNum: 1,
    label: '1. Elevation Heatmap',
    availability: 'Measured NASA Raster',
    note: 'NASADEM_HGT V001 (Earth 30m), LRO LOLA LDEM (Moon 30m/474m), MGS MOLA MEGDR / HiRISE (Mars)',
    formula: 'Orthometric / Aeroid / Selenoid height (meters)',
  },
  {
    id: 'slope',
    heatmapNum: 2,
    label: '2. Slope Heatmap (°)',
    availability: 'Derived (Horn 3×3)',
    note: 'Classified: Flat (<3°), Gentle (3°–8°), Moderate (8°–15°), Steep (>15°). Note: Flat slope alone never certifies landing safety.',
    formula: 'arctan(√((dz/dx)² + (dz/dy)²)) · 180/π',
  },
  {
    id: 'roughness',
    heatmapNum: 3,
    label: '3. Terrain Roughness (TRI)',
    availability: 'Derived (3×3 Window)',
    note: 'TRI depends on grid spacing. A coarse cell cannot resolve small landing hazards.',
    formula: 'Riley TRI = √Σ(z_center − z_neighbor)² across 8 neighbors (m)',
  },
  {
    id: 'temperature',
    heatmapNum: 4,
    label: '4. Surface Temperature',
    availability: 'MODIS LST and Diviner PCP',
    note: 'Earth 1 km 8-day day/night LST and Shackleton 240 m southern-summer PCP (00:00–00:15 local time).',
    formula: 'MODIS T(°C) = DN × 0.02 − 273.15. Diviner T(°C) = T(K) − 273.15.',
  },
  {
    id: 'similarity',
    heatmapNum: 5,
    label: '5. Planetary Analog Similarity',
    availability: 'Exploratory Analog Similarity Index',
    note: 'Weighted comparison at corresponding offsets within the two regional grids. Temperature is excluded because the observation contexts differ.',
    formula: 'Σ w_i · (1 − |x_Earth,i − x_Target,i| / Range_i) × 100',
  },
  {
    id: 'aspect',
    label: 'Aspect (Azimuth)',
    availability: 'Derived (Horn 3×3)',
    note: 'Compass downslope orientation (0°–360°; flat <0.05° undefined)',
  },
  {
    id: 'imagery',
    label: 'Terrain Imagery',
    availability: 'Georeferenced Basemap',
    note: 'Esri World Imagery & USGS HiRISE / LROCbasemap',
  },
  {
    id: 'coverage',
    label: 'Valid Data Mask',
    availability: 'Validated NoData Mask',
    note: 'Highlights valid interior pixels vs boundary/NoData cells',
  },
];

interface SpatialLayerPanelProps {
  activeLayer: SpatialLayerId;
  onSelectLayer: (id: SpatialLayerId) => void;
  recommendedLayers: string[];
  heatmapOpacity?: number;
  onHeatmapOpacityChange?: (opacity: number) => void;
  modisTimeMode?: 'day' | 'night';
  onModisTimeModeChange?: (mode: 'day' | 'night') => void;
  similarityWeights?: SimilarityWeights;
  effectiveWeights?: SimilarityWeights;
  onSimilarityWeightsChange?: (weights: SimilarityWeights) => void;
  temperatureIncluded?: boolean;
  missingParameterDisclosure?: string;
  targetPlanet?: 'Mars' | 'Moon';
  targetRegionId?: string;
}

export const SpatialLayerPanel: React.FC<SpatialLayerPanelProps> = ({
  activeLayer,
  onSelectLayer,
  recommendedLayers,
  heatmapOpacity = 1.0,
  onHeatmapOpacityChange,
  modisTimeMode = 'day',
  onModisTimeModeChange,
  similarityWeights = { elevation: 0.2, slope: 0.25, roughness: 0.25, temperature: 0.3 },
  effectiveWeights = { elevation: 0.2, slope: 0.25, roughness: 0.25, temperature: 0.3 },
  onSimilarityWeightsChange,
  temperatureIncluded = false,
  missingParameterDisclosure = '',
  targetPlanet = 'Mars',
  targetRegionId = '',
}) => {
  const activeMeta = SPATIAL_LAYERS.find((l) => l.id === activeLayer);

  const handleWeightSlider = (key: keyof SimilarityWeights, valuePercent: number) => {
    if (!onSimilarityWeightsChange) return;
    onSimilarityWeightsChange({
      ...similarityWeights,
      [key]: Math.round(valuePercent) / 100,
    });
  };

  return (
    <div className="panel" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginRight: 4,
              fontWeight: 600,
            }}
          >
            <Layers size={13} />
            5 SCIENTIFIC HEATMAPS &amp; LAYERS
          </span>
          {SPATIAL_LAYERS.map((layer) => {
            const isActive = layer.id === activeLayer;
            const isRecommended = recommendedLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                className={`btn ${isActive ? 'btn--navy' : ''}`}
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  borderColor: layer.heatmapNum ? 'rgba(40, 106, 145, 0.45)' : undefined,
                }}
                onClick={() => onSelectLayer(layer.id)}
                title={`${layer.availability}: ${layer.note}`}
              >
                <span>{layer.label}</span>
                {isRecommended && !isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent-teal)',
                    }}
                    title="Recommended for active research objective"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Heatmap Opacity Control */}
        {onHeatmapOpacityChange && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--text-secondary)',
              background: 'var(--bg-cool-neutral)',
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Sliders size={12} />
            <span>Heatmap Opacity</span>
            <input
              type="range"
              min={15}
              max={100}
              step={5}
              value={Math.round(heatmapOpacity * 100)}
              onChange={(e) => onHeatmapOpacityChange(Number(e.target.value) / 100)}
              style={{ width: 80, accentColor: '#286A91' }}
              aria-label="Heatmap opacity percentage"
            />
            <span className="mono" style={{ width: 34, textAlign: 'right' }}>
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </label>
        )}
      </div>

      {/* Active Layer Scientific Metadata & Formula Bar */}
      {activeMeta && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <div>
            <span className="badge badge--blue" style={{ marginRight: 8 }}>
              {activeMeta.availability}
            </span>
            <span>{activeMeta.note}</span>
          </div>
          {activeMeta.formula && (
            <span className="mono" style={{ fontSize: 11, color: '#286A91', background: 'rgba(40,106,145,0.08)', padding: '2px 8px', borderRadius: 4 }}>
              Formula: {activeMeta.formula}
            </span>
          )}
        </div>
      )}

      {/* Heatmap 4: Surface Temperature Controls (MODIS Day/Night + Planetary Availability Warning) */}
      {activeLayer === 'temperature' && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 4,
            background: 'var(--bg-cool-neutral)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 12.5 }}>Earth MODIS MOD11A2 v061 Band:</strong>
            <button
              type="button"
              className={`btn ${modisTimeMode === 'day' ? 'btn--navy' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => onModisTimeModeChange?.('day')}
            >
              <Sun size={13} />
              Daytime LST (1 km)
            </button>
            <button
              type="button"
              className={`btn ${modisTimeMode === 'night' ? 'btn--navy' : ''}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => onModisTimeModeChange?.('night')}
            >
              <Moon size={13} />
              Nighttime LST (1 km)
            </button>
          </div>

          <div style={{ fontSize: 12 }}>
            {targetPlanet === 'Moon' && targetRegionId === 'shackleton-rim' ? (
              <span className="badge badge--real">
                Shackleton: Diviner PCP at 240 m, southern summer, 00:00–00:15 local time
              </span>
            ) : targetPlanet === 'Moon' ? (
              <span className="badge badge--real">
                Lunar target: verified local temperature unavailable
              </span>
            ) : (
              <span className="badge badge--real">
                Mars target: verified local temperature unavailable
              </span>
            )}
          </div>
        </div>
      )}

      {/* Heatmap 5: Exploratory Analog Similarity Index Interactive Weights */}
      {activeLayer === 'similarity' && onSimilarityWeightsChange && (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 4,
            background: 'var(--bg-cool-neutral)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div>
              <strong style={{ fontSize: 12.5 }}>Exploratory Analog Similarity Index — Parameter Weights</strong>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 8 }}>
                (Atmospheric O₂/pressure are strictly excluded from terrain similarity; evaluated separately in habitat safety.)
              </span>
            </div>
            <button
              type="button"
              className="btn"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={() =>
                onSimilarityWeightsChange({ elevation: 0.2, slope: 0.25, roughness: 0.25, temperature: 0.3 })
              }
            >
              Reset Default (20 / 25 / 25 / 30%)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(
              [
                { key: 'elevation', label: 'Elevation Relief', defaultPct: 20, enabled: true },
                { key: 'slope', label: 'Slope (Horn 3×3)', defaultPct: 25, enabled: true },
                { key: 'roughness', label: 'Roughness (TRI)', defaultPct: 25, enabled: true },
                { key: 'temperature', label: 'Surface Temperature', defaultPct: 30, enabled: temperatureIncluded },
              ] as const
            ).map((item) => {
              const rawPct = Math.round(similarityWeights[item.key] * 100);
              const effPct = Math.round(effectiveWeights[item.key] * 100);
              return (
                <div
                  key={item.key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    opacity: item.enabled ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <strong>{item.label}</strong>
                    <span className="mono">
                      Input {rawPct}% → <strong>Effective {effPct}%</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!item.enabled}
                    value={rawPct}
                    onChange={(e) => handleWeightSlider(item.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#286A91' }}
                    aria-label={`${item.label} weight slider`}
                  />
                </div>
              );
            })}
          </div>

          {missingParameterDisclosure && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-secondary)' }}>
              <strong>Weight Normalization Notice:</strong> {missingParameterDisclosure}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
