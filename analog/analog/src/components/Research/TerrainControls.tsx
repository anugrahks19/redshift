import React from 'react';
import {
  Link2,
  Unlink,
  RotateCcw,
  Columns2,
  GitCompare,
  SlidersHorizontal,
  Mountain,
  Eye,
  Scale,
} from 'lucide-react';
import type { ComparisonMode, DifferenceMetricId } from '../../types/terrain';

interface TerrainControlsProps {
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  linkedCamera: boolean;
  onToggleLinkedCamera: () => void;
  onResetBothCameras: () => void;
  differenceMetric: DifferenceMetricId;
  onDifferenceMetricChange: (m: DifferenceMetricId) => void;
  showTransectOverlay: boolean;
  onToggleTransectOverlay: () => void;
  syncScale: boolean;
  onToggleSyncScale: () => void;
  hillshade: boolean;
  onToggleHillshade: () => void;
  contours: boolean;
  onToggleContours: () => void;
}

export const TerrainControls: React.FC<TerrainControlsProps> = ({
  comparisonMode,
  onComparisonModeChange,
  linkedCamera,
  onToggleLinkedCamera,
  onResetBothCameras,
  differenceMetric,
  onDifferenceMetricChange,
  showTransectOverlay,
  onToggleTransectOverlay,
  syncScale,
  onToggleSyncScale,
  hillshade,
  onToggleHillshade,
  contours,
  onToggleContours,
}) => {
  return (
    <div
      className="panel"
      style={{
        padding: '10px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
          COMPARISON MODE
        </span>
        <button
          type="button"
          className={`btn ${comparisonMode === 'side-by-side' ? 'btn--active' : ''}`}
          onClick={() => onComparisonModeChange('side-by-side')}
        >
          <Columns2 size={14} />
          Side-by-Side 3D
        </button>
        <button
          type="button"
          className={`btn ${comparisonMode === 'synchronized' ? 'btn--active' : ''}`}
          onClick={() => onComparisonModeChange('synchronized')}
        >
          <Link2 size={14} />
          Synchronized 3D
        </button>
        <button
          type="button"
          className={`btn ${comparisonMode === 'curtain' ? 'btn--active' : ''}`}
          onClick={() => onComparisonModeChange('curtain')}
          title="NASA-style interactive horizontal/vertical curtain wipe over satellite imagery and spatial layers"
        >
          <SlidersHorizontal size={14} />
          Curtain Swipe
        </button>
        <button
          type="button"
          className={`btn ${comparisonMode === 'difference' ? 'btn--active' : ''}`}
          onClick={() => onComparisonModeChange('difference')}
        >
          <GitCompare size={14} />
          Difference Analysis
        </button>

        {comparisonMode === 'difference' && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8, fontSize: 12.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Metric:</span>
            <select
              value={differenceMetric}
              onChange={(e) => onDifferenceMetricChange(e.target.value as DifferenceMetricId)}
              style={{
                padding: '5px 8px',
                borderRadius: 4,
                border: '1px solid var(--border-light)',
                fontSize: 12.5,
                background: 'var(--bg-white)',
              }}
            >
              <option value="slope">Slope Difference (Δ°, Horn 3×3)</option>
              <option value="roughness">Roughness TRI Difference (Δm, 90m window)</option>
              <option value="elevation">Elevation Difference (Datum Check)</option>
              <option value="aspect">Aspect Difference (Circular Check)</option>
            </select>
          </label>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          className={`btn ${syncScale ? 'btn--primary' : ''}`}
          onClick={onToggleSyncScale}
          title="Lock Earth and Mars vertical exaggeration 1:1 and match elevation color relief meters"
        >
          <Scale size={14} />
          {syncScale ? 'Scale Locked 1:1' : 'Match Scale'}
        </button>

        <button
          type="button"
          className={`btn ${hillshade ? 'btn--active' : ''}`}
          onClick={onToggleHillshade}
          title="Toggle directional Horn NW solar hillshade relief"
        >
          <Eye size={14} />
          Hillshade
        </button>

        <button
          type="button"
          className={`btn ${contours ? 'btn--active' : ''}`}
          onClick={onToggleContours}
          title="Toggle 25 m / 100 m topographic contour isolines"
        >
          <Mountain size={14} />
          Contours
        </button>

        {comparisonMode !== 'curtain' && (
          <>
            <button
              type="button"
              className={`btn ${linkedCamera ? 'btn--primary' : ''}`}
              onClick={onToggleLinkedCamera}
              title="Synchronize camera azimuth, polar angle, and relative zoom across both viewports"
            >
              {linkedCamera ? <Link2 size={14} /> : <Unlink size={14} />}
              {linkedCamera ? 'Cameras Linked' : 'Link Cameras'}
            </button>

            <button
              type="button"
              className={`btn ${showTransectOverlay ? 'btn--active' : ''}`}
              onClick={onToggleTransectOverlay}
              title="Show active elevation profile transect line on both 3D terrain meshes"
            >
              Transect Line
            </button>

            <button type="button" className="btn" onClick={onResetBothCameras}>
              <RotateCcw size={14} />
              Reset Both Views
            </button>
          </>
        )}
      </div>
    </div>
  );
};

