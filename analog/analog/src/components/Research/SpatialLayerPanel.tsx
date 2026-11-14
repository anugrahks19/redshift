import React from 'react';
import { Layers } from 'lucide-react';
import type { SpatialLayerId } from '../../types/terrain';

interface LayerOption {
  id: SpatialLayerId;
  label: string;
  availability: string;
  note: string;
}

const SPATIAL_LAYERS: LayerOption[] = [
  {
    id: 'elevation',
    label: 'Elevation',
    availability: 'Measured / Resampled',
    note: 'Copernicus GLO-30 (EGM2008) & USGS Gale 1m → 30m (MOLA Areoid)',
  },
  {
    id: 'slope',
    label: 'Slope (°)',
    availability: 'Derived (Horn 3×3)',
    note: 'Computed at 30.0 m cell spacing in degrees',
  },
  {
    id: 'aspect',
    label: 'Aspect (Azimuth)',
    availability: 'Derived (Horn 3×3)',
    note: 'Compass downslope orientation (0°–360°; flat <0.05° undefined)',
  },
  {
    id: 'roughness',
    label: 'Surface Roughness (TRI)',
    availability: 'Derived (90m window)',
    note: 'Mean absolute 8-neighbor elevation difference in meters',
  },
  {
    id: 'imagery',
    label: 'Terrain Imagery',
    availability: 'Real Georeferenced',
    note: 'Esri World Imagery (Yungay) & USGS HiRISE LRGB COG (Gale)',
  },
  {
    id: 'geology',
    label: 'Geological Context',
    availability: 'No 30m Raster · Evidence Panel',
    note: 'No registered 30m geological map raster; see Evidence panel below',
  },
  {
    id: 'coverage',
    label: 'Data Coverage / Quality',
    availability: 'Validated Mask',
    note: '100% valid interior pixels; 3.84 km bounded subset footprint',
  },
];

interface SpatialLayerPanelProps {
  activeLayer: SpatialLayerId;
  onSelectLayer: (id: SpatialLayerId) => void;
  recommendedLayers: string[];
}

export const SpatialLayerPanel: React.FC<SpatialLayerPanelProps> = ({
  activeLayer,
  onSelectLayer,
  recommendedLayers,
}) => {
  const activeMeta = SPATIAL_LAYERS.find((l) => l.id === activeLayer);

  return (
    <div className="panel" style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 4 }}>
            <Layers size={13} />
            SPATIAL LAYER
          </span>
          {SPATIAL_LAYERS.map((layer) => {
            const isActive = layer.id === activeLayer;
            const isRecommended = recommendedLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                className={`btn ${isActive ? 'btn--navy' : ''}`}
                style={{ padding: '5px 10px', fontSize: 12.5 }}
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

        {activeMeta && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span className="badge badge--blue" style={{ marginRight: 6 }}>
              {activeMeta.availability}
            </span>
            <span>{activeMeta.note}</span>
          </div>
        )}
      </div>

      {activeLayer === 'geology' && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: '#FBF1DF',
            border: '1px solid #E6C488',
            borderRadius: 4,
            fontSize: 12.5,
            color: '#5C3D0E',
          }}
        >
          <strong>Geological Raster Unavailable at 30 m:</strong> No spatially registered 30 m geological unit raster is packaged for Yungay. Both viewports show elevation-shaded relief for structural context while documented clay/mineralogical records are presented in the <strong>Evidence & Field Feasibility</strong> tab below.
        </div>
      )}
    </div>
  );
};

