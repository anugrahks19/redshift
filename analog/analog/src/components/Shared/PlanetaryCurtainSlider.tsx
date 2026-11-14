import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Crosshair,
  Eye,
  Layers,
  Mountain,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  DerivedTerrainGrid,
  SpatialLayerId,
  TerrainGridDataset,
} from '../../types/terrain';
import { inspectGridCell, renderSpatialMapToCanvas } from '../../services/geospatialService';

export type CurtainOrientation = 'vertical' | 'horizontal';

export interface PlanetaryCurtainSliderProps {
  earthDataset?: TerrainGridDataset | null;
  earthDerived?: DerivedTerrainGrid | null;
  marsDataset?: TerrainGridDataset | null;
  marsDerived?: DerivedTerrainGrid | null;
  earthImageUrl?: string;
  marsImageUrl?: string;
  marsSiteId?: 'gale_murray' | 'gale_bradbury';
  onMarsSiteChange?: (site: 'gale_murray' | 'gale_bradbury') => void;
  activeLayer?: SpatialLayerId;
  onActiveLayerChange?: (layer: SpatialLayerId) => void;
  hillshade?: boolean;
  contours?: boolean;
  matchedRelief?: boolean;
  onToggleHillshade?: () => void;
  onToggleContours?: () => void;
  onToggleMatchedRelief?: () => void;
  initialOrientation?: CurtainOrientation;
  compactHeader?: boolean;
}

const CURTAIN_LAYERS: { id: SpatialLayerId; label: string; short: string }[] = [
  { id: 'imagery', label: 'Satellite vs. HiRISE', short: 'Orbital Photo' },
  { id: 'elevation', label: 'Elevation + Contours', short: 'Elevation' },
  { id: 'slope', label: 'Slope (Horn 3×3)', short: 'Slope (°)' },
  { id: 'roughness', label: 'Roughness (TRI)', short: 'Roughness' },
];

export const PlanetaryCurtainSlider: React.FC<PlanetaryCurtainSliderProps> = ({
  earthDataset,
  earthDerived,
  marsDataset,
  marsDerived,
  earthImageUrl = '/data/terrains/yungay-imagery.jpg',
  marsImageUrl,
  marsSiteId = 'gale_murray',
  onMarsSiteChange,
  activeLayer: controlledLayer,
  onActiveLayerChange,
  hillshade: controlledHillshade,
  contours: controlledContours,
  matchedRelief: controlledMatchedRelief,
  onToggleHillshade,
  onToggleContours,
  onToggleMatchedRelief,
  initialOrientation = 'vertical',
  compactHeader = false,
}) => {
  const [orientation, setOrientation] = useState<CurtainOrientation>(initialOrientation);
  const [splitPct, setSplitPct] = useState(50);
  const [internalLayer, setInternalLayer] = useState<SpatialLayerId>('imagery');
  const [internalHillshade, setInternalHillshade] = useState(true);
  const [internalContours, setInternalContours] = useState(true);
  const [internalMatchedRelief, setInternalMatchedRelief] = useState(true);
  const [hoverFrac, setHoverFrac] = useState<{ x: number; y: number } | null>({ x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const earthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const marsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const layer: SpatialLayerId = controlledLayer ?? internalLayer;
  const hillshade = controlledHillshade ?? internalHillshade;
  const contours = controlledContours ?? internalContours;
  const matchedRelief = controlledMatchedRelief ?? internalMatchedRelief;

  const resolvedEarthUrl = earthDataset?.imagery?.url ?? earthImageUrl;
  const resolvedMarsUrl =
    marsDataset?.imagery?.url ??
    marsImageUrl ??
    (marsSiteId === 'gale_bradbury'
      ? '/data/terrains/gale-bradbury-hirise.jpg'
      : '/data/terrains/gale-hirise.jpg');

  // Async image elements for crisp DEM+imagery canvas fusion
  const [earthPhotoState, setEarthPhotoState] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [marsPhotoState, setMarsPhotoState] = useState<{ url: string; img: HTMLImageElement } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setEarthPhotoState({ url: resolvedEarthUrl, img });
    };
    img.src = resolvedEarthUrl;
    return () => {
      cancelled = true;
    };
  }, [resolvedEarthUrl]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setMarsPhotoState({ url: resolvedMarsUrl, img });
    };
    img.src = resolvedMarsUrl;
    return () => {
      cancelled = true;
    };
  }, [resolvedMarsUrl]);

  const earthPhoto = earthPhotoState?.url === resolvedEarthUrl ? earthPhotoState.img : null;
  const marsPhoto = marsPhotoState?.url === resolvedMarsUrl ? marsPhotoState.img : null;

  // Shared relief span in meters so hypsometry matches vertical meters across worlds
  const sharedReliefSpan = useMemo(() => {
    if (!matchedRelief || !earthDataset || !marsDataset) return null;
    const eSpan = earthDataset.stats.maxElevation - earthDataset.stats.minElevation;
    const mSpan = marsDataset.stats.maxElevation - marsDataset.stats.minElevation;
    return Math.max(eSpan, mSpan, 1);
  }, [matchedRelief, earthDataset, marsDataset]);

  const hasDemData = Boolean(
    earthDataset && earthDerived && marsDataset && marsDerived && marsDataset.dataState !== 'UNAVAILABLE'
  );

  // Render high-resolution shaded-relief & contour spatial maps onto Earth and Mars canvases
  useEffect(() => {
    if (!earthDataset || !earthDerived || !earthCanvasRef.current) return;
    renderSpatialMapToCanvas(
      {
        dataset: earthDataset,
        derived: earthDerived,
        activeLayer: layer,
        reliefSpanOverride: sharedReliefSpan,
        hillshade,
        contours,
        contourIntervalMeters: 25,
        orthophoto: earthPhoto,
        size: 512,
      },
      earthCanvasRef.current
    );
  }, [earthDataset, earthDerived, layer, sharedReliefSpan, hillshade, contours, earthPhoto]);

  useEffect(() => {
    if (!marsDataset || !marsDerived || marsDataset.dataState === 'UNAVAILABLE' || !marsCanvasRef.current) {
      return;
    }
    renderSpatialMapToCanvas(
      {
        dataset: marsDataset,
        derived: marsDerived,
        activeLayer: layer,
        reliefSpanOverride: sharedReliefSpan,
        hillshade,
        contours,
        contourIntervalMeters: 25,
        orthophoto: marsPhoto,
        size: 512,
      },
      marsCanvasRef.current
    );
  }, [marsDataset, marsDerived, layer, sharedReliefSpan, hillshade, contours, marsPhoto]);

  // Sample exact co-registered metric offset (3.84 km x 3.84 km) across Earth and Mars
  const probeSample = useMemo(() => {
    if (!hoverFrac || !earthDataset || !earthDerived || !marsDataset || !marsDerived) return null;
    if (marsDataset.dataState === 'UNAVAILABLE') return null;

    const eCol = Math.min(earthDataset.gridWidth - 1, Math.max(0, Math.round(hoverFrac.x * (earthDataset.gridWidth - 1))));
    const eRow = Math.min(earthDataset.gridHeight - 1, Math.max(0, Math.round(hoverFrac.y * (earthDataset.gridHeight - 1))));
    const mCol = Math.min(marsDataset.gridWidth - 1, Math.max(0, Math.round(hoverFrac.x * (marsDataset.gridWidth - 1))));
    const mRow = Math.min(marsDataset.gridHeight - 1, Math.max(0, Math.round(hoverFrac.y * (marsDataset.gridHeight - 1))));

    const earth = inspectGridCell(earthDataset, earthDerived, eRow, eCol);
    const mars = inspectGridCell(marsDataset, marsDerived, mRow, mCol);

    const earthRelief =
      earth.elevationMeters !== null ? earth.elevationMeters - earthDataset.stats.minElevation : null;
    const marsRelief =
      mars.elevationMeters !== null ? mars.elevationMeters - marsDataset.stats.minElevation : null;

    const eastKm = (hoverFrac.x * 3.84).toFixed(2);
    const southKm = (hoverFrac.y * 3.84).toFixed(2);
    return { earth, mars, earthRelief, marsRelief, eastKm, southKm };
  }, [hoverFrac, earthDataset, earthDerived, marsDataset, marsDerived]);

  const updateFromPointer = (clientX: number, clientY: number, updateSplit: boolean) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const fx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHoverFrac({ x: fx, y: fy });
    if (updateSplit) {
      const pct = orientation === 'vertical' ? fy * 100 : fx * 100;
      setSplitPct(Math.max(4, Math.min(96, Math.round(pct * 10) / 10)));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateFromPointer(e.clientX, e.clientY, isDragging);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleLayerSelect = (next: SpatialLayerId) => {
    if (onActiveLayerChange) onActiveLayerChange(next);
    else setInternalLayer(next);
  };

  const handleToggleHillshade = () => {
    if (onToggleHillshade) onToggleHillshade();
    else setInternalHillshade((v) => !v);
  };

  const handleToggleContours = () => {
    if (onToggleContours) onToggleContours();
    else setInternalContours((v) => !v);
  };

  const handleToggleMatchedRelief = () => {
    if (onToggleMatchedRelief) onToggleMatchedRelief();
    else setInternalMatchedRelief((v) => !v);
  };

  // Clip-path ensures Earth stays cleanly revealed on Top (vertical) or Left (horizontal)
  const earthClipPath =
    orientation === 'vertical'
      ? `inset(0 0 ${100 - splitPct}% 0)`
      : `inset(0 ${100 - splitPct}% 0 0)`;

  const splitKm = ((splitPct / 100) * 3.84).toFixed(2);
  const marsSiteShort =
    marsSiteId === 'gale_bradbury'
      ? 'Bradbury Landing · Aeolis Palus'
      : 'Gale Crater · Murray Buttes / VRR';

  return (
    <div
      style={{
        background: '#0F1C28',
        border: '1px solid #263E52',
        borderRadius: 8,
        overflow: 'hidden',
        color: '#E8ECEF',
      }}
    >
      {/* NASA-style Curtain Control Header */}
      <div
        style={{
          padding: compactHeader ? '10px 14px' : '12px 16px',
          background: '#132434',
          borderBottom: '1px solid #243A4E',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#7CC4E8',
              background: 'rgba(124, 196, 232, 0.12)',
              border: '1px solid rgba(124, 196, 232, 0.3)',
              padding: '3px 7px',
              borderRadius: 4,
            }}
          >
            CURTAIN COMPARISON · 3.84 KM × 3.84 KM (1:1 METRIC SCALE)
          </span>
          {onMarsSiteChange && (
            <div style={{ display: 'inline-flex', borderRadius: 4, overflow: 'hidden', border: '1px solid #2F4961' }}>
              <button
                type="button"
                onClick={() => onMarsSiteChange('gale_murray')}
                style={{
                  border: 0,
                  cursor: 'pointer',
                  padding: '4px 9px',
                  fontSize: 11.5,
                  fontWeight: 500,
                  background: marsSiteId === 'gale_murray' ? '#286A91' : '#182C3E',
                  color: marsSiteId === 'gale_murray' ? '#FFFFFF' : '#AFC0D1',
                }}
              >
                Murray Buttes / VRR
              </button>
              <button
                type="button"
                onClick={() => onMarsSiteChange('gale_bradbury')}
                style={{
                  border: 0,
                  borderLeft: '1px solid #2F4961',
                  cursor: 'pointer',
                  padding: '4px 9px',
                  fontSize: 11.5,
                  fontWeight: 500,
                  background: marsSiteId === 'gale_bradbury' ? '#286A91' : '#182C3E',
                  color: marsSiteId === 'gale_bradbury' ? '#FFFFFF' : '#AFC0D1',
                }}
              >
                Bradbury Landing
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setOrientation('vertical')}
            className="btn"
            style={{
              padding: '5px 10px',
              fontSize: 11.5,
              background: orientation === 'vertical' ? '#C28B38' : '#1B3043',
              borderColor: orientation === 'vertical' ? '#C28B38' : '#314C63',
              color: orientation === 'vertical' ? '#0D1924' : '#E8ECEF',
              fontWeight: 600,
            }}
            aria-pressed={orientation === 'vertical'}
          >
            <ArrowDownUp size={13} />
            Slide Down (↕)
          </button>
          <button
            type="button"
            onClick={() => setOrientation('horizontal')}
            className="btn"
            style={{
              padding: '5px 10px',
              fontSize: 11.5,
              background: orientation === 'horizontal' ? '#C28B38' : '#1B3043',
              borderColor: orientation === 'horizontal' ? '#C28B38' : '#314C63',
              color: orientation === 'horizontal' ? '#0D1924' : '#E8ECEF',
              fontWeight: 600,
            }}
            aria-pressed={orientation === 'horizontal'}
          >
            <ArrowLeftRight size={13} />
            Side Wipe (↔)
          </button>
        </div>
      </div>

      {/* Spatial Layer & Cartographic Realism Toolbar */}
      <div
        style={{
          padding: '8px 14px',
          background: '#0D1924',
          borderBottom: '1px solid #203446',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#9FB0C1', marginRight: 2 }}>
            <Layers size={13} />
            Layer:
          </span>
          {CURTAIN_LAYERS.map((item) => {
            const disabled = item.id !== 'imagery' && !hasDemData;
            const active = layer === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => handleLayerSelect(item.id)}
                style={{
                  padding: '4px 9px',
                  fontSize: 11.5,
                  borderRadius: 4,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                  border: active ? '1px solid #7CC4E8' : '1px solid #294156',
                  background: active ? 'rgba(40, 106, 145, 0.35)' : '#152534',
                  color: active ? '#F2F5F8' : '#AFC0D1',
                }}
              >
                {item.short}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleToggleHillshade}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: hillshade ? '1px solid #327F79' : '1px solid #294156',
              background: hillshade ? 'rgba(50, 127, 121, 0.25)' : '#152534',
              color: hillshade ? '#9BE0DA' : '#9FB0C1',
            }}
          >
            <Eye size={12} />
            Hillshade
          </button>
          <button
            type="button"
            onClick={handleToggleContours}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: contours ? '1px solid #327F79' : '1px solid #294156',
              background: contours ? 'rgba(50, 127, 121, 0.25)' : '#152534',
              color: contours ? '#9BE0DA' : '#9FB0C1',
            }}
          >
            <Mountain size={12} />
            25 m Contours
          </button>
          {hasDemData && (
            <button
              type="button"
              onClick={handleToggleMatchedRelief}
              title="Normalize Earth and Mars local relief colors to the same meter range"
              style={{
                padding: '4px 8px',
                fontSize: 11,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: matchedRelief ? '1px solid #C28B38' : '1px solid #294156',
                background: matchedRelief ? 'rgba(194, 139, 56, 0.2)' : '#152534',
                color: matchedRelief ? '#F0C77B' : '#9FB0C1',
              }}
            >
              <SlidersHorizontal size={12} />
              Matched Relief {sharedReliefSpan ? `(0–${Math.round(sharedReliefSpan)} m)` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Main Split Stage + Co-Registered Telemetry Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          alignItems: 'stretch',
        }}
      >
        {/* Interactive Curtain Viewport */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="region"
            aria-label="Interactive Earth versus Mars terrain curtain comparison"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 620,
              margin: '0 auto',
              aspectRatio: '1 / 1',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid #2F4961',
              cursor: orientation === 'vertical' ? 'ns-resize' : 'ew-resize',
              touchAction: 'none',
              userSelect: 'none',
              background: '#081119',
            }}
          >
            {/* Bottom/Right base layer: Mars */}
            {hasDemData ? (
              <canvas
                ref={marsCanvasRef}
                width={512}
                height={512}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={resolvedMarsUrl}
                alt={`Mars orbital view of ${marsSiteShort}`}
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              />
            )}

            {/* Top/Left clipped layer: Earth */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: earthClipPath,
              }}
            >
              {hasDemData ? (
                <canvas
                  ref={earthCanvasRef}
                  width={512}
                  height={512}
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                />
              ) : (
                <img
                  src={resolvedEarthUrl}
                  alt="Earth satellite view of Yungay, Atacama Desert, Chile"
                  draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Co-registered probe crosshair marker */}
            {hoverFrac && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${hoverFrac.x * 100}%`,
                  top: `${hoverFrac.y * 100}%`,
                  width: 18,
                  height: 18,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  border: '1.5px solid rgba(255, 255, 255, 0.9)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 1px rgba(13, 25, 36, 0.85)',
                }}
              />
            )}

            {/* Planet Watermarks */}
            <div
              className="mono"
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 10.5,
                background: 'rgba(13, 25, 36, 0.84)',
                border: '1px solid rgba(124, 196, 232, 0.45)',
                color: '#E8F4FA',
                pointerEvents: 'none',
              }}
            >
              EARTH · YUNGAY, ATACAMA (WGS84 / 30M)
            </div>

            <div
              className="mono"
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 10.5,
                background: 'rgba(13, 25, 36, 0.84)',
                border: '1px solid rgba(231, 169, 90, 0.45)',
                color: '#FBE8CC',
                pointerEvents: 'none',
              }}
            >
              MARS · {marsSiteShort.toUpperCase()}
            </div>

            {/* Scale bar in bottom-left */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                padding: '4px 8px',
                borderRadius: 4,
                background: 'rgba(13, 25, 36, 0.82)',
                border: '1px solid rgba(255,255,255,0.16)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ width: '26%', minWidth: 58, height: 3, background: '#F7F8F6', marginBottom: 2 }} />
              <div className="mono" style={{ fontSize: 10, color: '#CBD6E2' }}>
                N ↑ · 1.00 km (tile 3.84 km)
              </div>
            </div>

            {/* Draggable Curtain Divider Line + NASA Pill Handle */}
            {orientation === 'vertical' ? (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${splitPct}%`,
                  height: 2,
                  transform: 'translateY(-1px)',
                  background: '#F7F8F6',
                  boxShadow: '0 0 12px rgba(0, 0, 0, 0.85), 0 0 2px #7CC4E8',
                  pointerEvents: 'none',
                }}
              >
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#101E2B',
                    color: '#F7F8F6',
                    border: '1.5px solid #F7F8F6',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.65)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ArrowDownUp size={12} color="#C28B38" />
                  <span>EARTH ▲ | ▼ MARS · {splitKm} km</span>
                </div>
              </div>
            ) : (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${splitPct}%`,
                  width: 2,
                  transform: 'translateX(-1px)',
                  background: '#F7F8F6',
                  boxShadow: '0 0 12px rgba(0, 0, 0, 0.85), 0 0 2px #7CC4E8',
                  pointerEvents: 'none',
                }}
              >
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#101E2B',
                    color: '#F7F8F6',
                    border: '1.5px solid #F7F8F6',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.65)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ArrowLeftRight size={12} color="#C28B38" />
                  <span>E | M · {splitKm} km</span>
                </div>
              </div>
            )}
          </div>

          {/* Accessible Keyboard + Range Scrub Control */}
          <div style={{ maxWidth: 620, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: '#7CC4E8', minWidth: 52 }}>
              {orientation === 'vertical' ? 'TOP (E)' : 'LEFT (E)'}
            </span>
            <input
              type="range"
              min={4}
              max={96}
              step={0.5}
              value={splitPct}
              onChange={(e) => setSplitPct(parseFloat(e.target.value))}
              aria-label="Curtain split position percentage"
              style={{ flex: 1, accentColor: '#C28B38' }}
            />
            <span className="mono" style={{ fontSize: 11, color: '#E7A95A', minWidth: 62, textAlign: 'right' }}>
              {orientation === 'vertical' ? 'BOT (M)' : 'RIGHT (M)'}
            </span>
          </div>
        </div>

        {/* Scientific Telemetry & Comparability Sidebar */}
        <div
          style={{
            padding: 16,
            background: '#122130',
            borderLeft: '1px solid #22384B',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Crosshair size={14} color="#C28B38" />
              <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#C28B38' }}>
                CO-REGISTERED FOOTPRINT PROBE
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: '#B8C7D6', margin: '0 0 12px', lineHeight: 1.5 }}>
              Both panels cover the exact same <strong>3.84 km × 3.84 km</strong> surface area at{' '}
              <strong>30.0 m</strong> DEM grid spacing. Drag directly on the line or move your cursor to inspect
              both worlds at matching metric offsets.
            </p>

            {probeSample ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: '#9FB0C1',
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: '#0D1924',
                    border: '1px solid #22384B',
                  }}
                >
                  Offset from NW corner: {probeSample.eastKm} km E · {probeSample.southKm} km S
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: '#0F1C28',
                      border: '1px solid rgba(124, 196, 232, 0.35)',
                    }}
                  >
                    <div className="mono" style={{ fontSize: 10.5, color: '#7CC4E8', marginBottom: 4 }}>
                      EARTH · ATACAMA
                    </div>
                    <div style={{ fontSize: 12, color: '#E8ECEF', display: 'grid', gap: 3 }}>
                      <div>
                        Elev: <strong className="mono">{probeSample.earth.elevationMeters?.toFixed(1) ?? 'N/A'} m</strong>
                      </div>
                      <div>
                        Relief: <strong className="mono">{probeSample.earthRelief?.toFixed(1) ?? 'N/A'} m</strong>
                      </div>
                      <div>
                        Slope: <strong className="mono">{probeSample.earth.slopeDegrees?.toFixed(1) ?? 'N/A'}°</strong>
                      </div>
                      <div>
                        Roughness: <strong className="mono">{probeSample.earth.roughnessTriMeters?.toFixed(2) ?? 'N/A'} m</strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: '#0F1C28',
                      border: '1px solid rgba(231, 169, 90, 0.35)',
                    }}
                  >
                    <div className="mono" style={{ fontSize: 10.5, color: '#E7A95A', marginBottom: 4 }}>
                      MARS · GALE
                    </div>
                    <div style={{ fontSize: 12, color: '#E8ECEF', display: 'grid', gap: 3 }}>
                      <div>
                        Elev: <strong className="mono">{probeSample.mars.elevationMeters?.toFixed(1) ?? 'N/A'} m</strong>
                      </div>
                      <div>
                        Relief: <strong className="mono">{probeSample.marsRelief?.toFixed(1) ?? 'N/A'} m</strong>
                      </div>
                      <div>
                        Slope: <strong className="mono">{probeSample.mars.slopeDegrees?.toFixed(1) ?? 'N/A'}°</strong>
                      </div>
                      <div>
                        Roughness: <strong className="mono">{probeSample.mars.roughnessTriMeters?.toFixed(2) ?? 'N/A'} m</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: '#0F1C28',
                  border: '1px solid #22384B',
                  fontSize: 12,
                  color: '#9FB0C1',
                }}
              >
                Displaying co-registered 512×512 Esri World Imagery (Earth) and USGS HiRISE LRGB (Mars).
              </div>
            )}
          </div>

          {/* Provenance & Datum Honesty Note */}
          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: '#0D1924',
              border: '1px solid #243A4E',
              fontSize: 11.5,
              color: '#9FB0C1',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#CBD6E2', display: 'block', marginBottom: 3 }}>
              Cartographic & Datum Integrity
            </strong>
            Earth heights are referenced to <strong>EGM2008 Geoid</strong> (Copernicus GLO-30 DSM); Mars heights use{' '}
            <strong>MOLA Areoid</strong> (USGS MSL Gale 1 m resampled to 30 m). Use <em>Local Relief</em>,{' '}
            <em>Slope</em>, and <em>Roughness (TRI)</em> for cross-planet morphometric comparison rather than raw
            absolute elevation subtraction.
          </div>
        </div>
      </div>
    </div>
  );
};
