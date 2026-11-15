import React, { useState } from 'react';
import { AlertTriangle, Columns2, Scale } from 'lucide-react';
import type {
  CameraSyncState,
  ComparisonMode,
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  SpatialLayerId,
  TerrainGridDataset,
  TerrainSampleInspection,
  TransectPreset,
} from '../../types/terrain';
import { PlanetaryCurtainSlider } from '../Shared/PlanetaryCurtainSlider';
import { TerrainViewport } from './TerrainViewport';

interface DualTerrainStudioProps {
  earthDataset: TerrainGridDataset | null;
  earthDerived: DerivedTerrainGrid | null;
  earthLoading: boolean;
  earthError: string | null;
  marsDataset: TerrainGridDataset | null;
  marsDerived: DerivedTerrainGrid | null;
  marsLoading: boolean;
  marsError: string | null;
  activeLayer: SpatialLayerId;
  onActiveLayerChange: (layer: SpatialLayerId) => void;
  heatmapOpacity?: number;
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  linkedCamera: boolean;
  cameraSync: CameraSyncState;
  onCameraBroadcast: (s: Omit<CameraSyncState, 'revision'>) => void;
  globalResetSignal: number;
  earthSample: TerrainSampleInspection | null;
  marsSample: TerrainSampleInspection | null;
  onSelectEarthCell: (row: number, col: number) => void;
  onSelectMarsCell: (row: number, col: number) => void;
  differenceAnalysis: DifferenceAnalysisResult | null;
  transectPreset: TransectPreset;
  transectFraction: number;
  showTransectOverlay: boolean;
  syncScale: boolean;
  onToggleSyncScale: () => void;
  hillshade: boolean;
  onToggleHillshade: () => void;
  contours: boolean;
  onToggleContours: () => void;
  selectedMarsSiteId: 'gale_murray' | 'gale_bradbury';
  onSelectMarsSite: (site: 'gale_murray' | 'gale_bradbury') => void;
  onRetryEarth: () => void;
  onRetryMars: () => void;
}

export const DualTerrainStudio: React.FC<DualTerrainStudioProps> = ({
  earthDataset,
  earthDerived,
  earthLoading,
  earthError,
  marsDataset,
  marsDerived,
  marsLoading,
  marsError,
  activeLayer,
  onActiveLayerChange,
  heatmapOpacity = 1.0,
  comparisonMode,
  onComparisonModeChange,
  linkedCamera,
  cameraSync,
  onCameraBroadcast,
  globalResetSignal,
  earthSample,
  marsSample,
  onSelectEarthCell,
  onSelectMarsCell,
  differenceAnalysis,
  transectPreset,
  transectFraction,
  showTransectOverlay,
  syncScale,
  onToggleSyncScale,
  hillshade,
  onToggleHillshade,
  contours,
  onToggleContours,
  selectedMarsSiteId,
  onSelectMarsSite,
  onRetryEarth,
  onRetryMars,
}) => {
  const [earthExag, setEarthExag] = useState(2.0);
  const [marsExag, setMarsExag] = useState(2.0);
  const [syncedExag, setSyncedExag] = useState(2.0);
  const [earthResetCount, setEarthResetCount] = useState(0);
  const [marsResetCount, setMarsResetCount] = useState(0);

  const showDiff = comparisonMode === 'difference' && Boolean(differenceAnalysis?.valid);

  const effectiveEarthExag = syncScale ? syncedExag : earthExag;
  const effectiveMarsExag = syncScale ? syncedExag : marsExag;

  const handleEarthExagChange = (v: number) => {
    if (syncScale) setSyncedExag(v);
    else setEarthExag(v);
  };

  const handleMarsExagChange = (v: number) => {
    if (syncScale) setSyncedExag(v);
    else setMarsExag(v);
  };

  const sharedReliefSpan =
    syncScale &&
    earthDataset &&
    marsDataset &&
    earthDataset.dataState !== 'UNAVAILABLE' &&
    marsDataset.dataState !== 'UNAVAILABLE'
      ? Math.max(earthDataset.stats.reliefMeters, marsDataset.stats.reliefMeters, 1)
      : null;

  if (comparisonMode === 'curtain') {
    const targetUnavailable =
      marsDataset?.dataState === 'UNAVAILABLE' || Boolean(marsError) || Boolean(earthError);

    if (targetUnavailable) {
      return (
        <div
          className="panel"
          style={{
            padding: 20,
            background: '#0F1C28',
            borderColor: '#263E52',
            color: '#E8ECEF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="#C28B38" />
            <strong>Curtain Comparison Unavailable for {marsDataset?.planet ?? 'Target'}</strong>
          </div>
          <p style={{ fontSize: 13, color: '#CBD6E2', marginBottom: 12 }}>
            {marsDataset?.unavailableReason ??
              marsError ??
              earthError ??
              'Co-registered Earth and planetary imagery + DEM grids are required for curtain swipe.'}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onComparisonModeChange('side-by-side')}
          >
            <Columns2 size={14} />
            Return to 3D Twin Studio
          </button>
        </div>
      );
    }

    return (
      <PlanetaryCurtainSlider
        earthDataset={earthDataset}
        earthDerived={earthDerived}
        marsDataset={marsDataset}
        marsDerived={marsDerived}
        marsSiteId={selectedMarsSiteId}
        onMarsSiteChange={onSelectMarsSite}
        activeLayer={activeLayer}
        onActiveLayerChange={onActiveLayerChange}
        hillshade={hillshade}
        contours={contours}
        matchedRelief={syncScale}
        onToggleHillshade={onToggleHillshade}
        onToggleContours={onToggleContours}
        onToggleMatchedRelief={onToggleSyncScale}
        initialOrientation="vertical"
        compactHeader
      />
    );
  }

  return (
    <div>
      {syncScale && sharedReliefSpan && !showDiff && (
        <div className="research-scale-note">
          <Scale size={13} />
          <span>Matched scale · 3.84 km footprint · {syncedExag.toFixed(1)}× vertical exaggeration</span>
        </div>
      )}

      {comparisonMode === 'difference' && differenceAnalysis && !differenceAnalysis.valid && (
        <div
          style={{
            marginBottom: 10,
            padding: '10px 14px',
            background: 'rgba(248, 113, 113, 0.12)',
            border: '1px solid rgba(248, 113, 113, 0.40)',
            borderRadius: 4,
            color: '#FCA5A5',
            fontSize: 13,
          }}
        >
          <strong>Difference Analysis Disabled for {differenceAnalysis.metricLabel}:</strong>{' '}
          {differenceAnalysis.disabledReason}
        </div>
      )}

      {comparisonMode === 'difference' && differenceAnalysis?.valid && (
        <div
          style={{
            marginBottom: 10,
            padding: '9px 14px',
            background: 'rgba(56, 189, 248, 0.10)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 4,
            color: '#FFFFFF',
            fontSize: 12.5,
          }}
        >
          <strong>Difference Overlay Active ({differenceAnalysis.metricLabel}):</strong> Both viewports display the validated{' '}
          <span className="mono">Earth − Mars ({differenceAnalysis.units})</span> common 30.0 m grid differential over their own 3D relief. Blue = Mars higher; Amber = Earth higher.
        </div>
      )}

      <div className="studio-grid">
        <TerrainViewport
          viewportId="earth"
          dataset={earthDataset}
          derived={earthDerived}
          loading={earthLoading}
          error={earthError}
          activeLayer={activeLayer}
          heatmapOpacity={heatmapOpacity}
          exaggeration={effectiveEarthExag}
          onExaggerationChange={handleEarthExagChange}
          reliefSpanOverride={sharedReliefSpan}
          hillshade={hillshade}
          contours={contours}
          linkedCamera={linkedCamera}
          cameraSync={cameraSync}
          onCameraBroadcast={onCameraBroadcast}
          resetSignal={globalResetSignal + earthResetCount}
          onResetLocalCamera={() => setEarthResetCount((n) => n + 1)}
          inspectedSample={earthSample}
          onSelectCell={onSelectEarthCell}
          differenceGrid={differenceAnalysis}
          showDifferenceOverlay={showDiff}
          transectPreset={transectPreset}
          transectFraction={transectFraction}
          showTransectOverlay={showTransectOverlay}
          onRetry={onRetryEarth}
        />

        <TerrainViewport
          viewportId="mars"
          dataset={marsDataset}
          derived={marsDerived}
          loading={marsLoading}
          error={marsError}
          activeLayer={activeLayer}
          heatmapOpacity={heatmapOpacity}
          exaggeration={effectiveMarsExag}
          onExaggerationChange={handleMarsExagChange}
          reliefSpanOverride={sharedReliefSpan}
          hillshade={hillshade}
          contours={contours}
          linkedCamera={linkedCamera}
          cameraSync={cameraSync}
          onCameraBroadcast={onCameraBroadcast}
          resetSignal={globalResetSignal + marsResetCount}
          onResetLocalCamera={() => setMarsResetCount((n) => n + 1)}
          inspectedSample={marsSample}
          onSelectCell={onSelectMarsCell}
          differenceGrid={differenceAnalysis}
          showDifferenceOverlay={showDiff}
          transectPreset={transectPreset}
          transectFraction={transectFraction}
          showTransectOverlay={showTransectOverlay}
          onRetry={onRetryMars}
        />
      </div>
    </div>
  );
};
