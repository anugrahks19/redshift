import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Maximize2, Minimize2, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import type {
  CameraSyncState,
  DerivedTerrainGrid,
  DifferenceAnalysisResult,
  SpatialLayerId,
  TerrainGridDataset,
  TerrainSampleInspection,
  TransectPreset,
} from '../../types/terrain';
import { renderSpatialMapToCanvas } from '../../services/geospatialService';

interface ViewportErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel: string;
}

class ViewportErrorBoundary extends Component<
  ViewportErrorBoundaryProps,
  { hasError: boolean; message: string }
> {
  constructor(props: ViewportErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            color: '#F2F5F8',
            textAlign: 'center',
          }}
        >
          <div>
            <AlertTriangle size={24} color="#C28B38" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{this.props.fallbackLabel}</div>
            <div style={{ fontSize: 12, color: '#9FB0C1' }}>{this.state.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SCENE_SIZE = 10; // 3840 m -> 10.0 scene units (1 unit = 384 m)

interface TerrainMeshProps {
  dataset: TerrainGridDataset;
  derived: DerivedTerrainGrid;
  activeLayer: SpatialLayerId;
  exaggeration: number;
  reliefSpanOverride?: number | null;
  hillshade?: boolean;
  contours?: boolean;
  differenceGrid?: DifferenceAnalysisResult | null;
  showDifferenceOverlay?: boolean;
  inspectedCell: { row: number; col: number } | null;
  transectPreset: TransectPreset;
  transectFraction: number;
  showTransectOverlay: boolean;
  onSelectCell: (row: number, col: number) => void;
}

const TerrainMesh: React.FC<TerrainMeshProps> = ({
  dataset,
  derived,
  activeLayer,
  exaggeration,
  reliefSpanOverride = null,
  hillshade = true,
  contours = true,
  differenceGrid,
  showDifferenceOverlay,
  inspectedCell,
  transectPreset,
  transectFraction,
  showTransectOverlay,
  onSelectCell,
}) => {
  const { gridWidth: W, gridHeight: H, extentMeters, elevations, stats } = dataset;
  const metersPerSceneUnit = extentMeters[0] / SCENE_SIZE;
  const minElev = stats.minElevation;

  // Load real satellite/HiRISE HTMLImageElement only when imagery layer is active
  const [loadedOrtho, setLoadedOrtho] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const imageryUrl = activeLayer === 'imagery' && !showDifferenceOverlay ? dataset.imagery?.url : undefined;

  useEffect(() => {
    if (!imageryUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) {
        setLoadedOrtho({ url: imageryUrl, img });
      }
    };
    img.onerror = () => {
      // Keep null imagery on load failure without synchronous setState
    };
    img.src = imageryUrl;
    return () => {
      cancelled = true;
    };
  }, [imageryUrl]);

  const orthophoto = imageryUrl && loadedOrtho?.url === imageryUrl ? loadedOrtho.img : null;

  // Synthesize crisp 512x512 hillshaded + contoured spatial map texture from real DEM & imagery
  const mapTexture = useMemo(() => {
    const canvas = renderSpatialMapToCanvas({
      dataset,
      derived,
      activeLayer,
      differenceGrid,
      showDifferenceOverlay,
      reliefSpanOverride,
      hillshade,
      contours,
      contourIntervalMeters: 25,
      orthophoto,
      size: 512,
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [
    dataset,
    derived,
    activeLayer,
    differenceGrid,
    showDifferenceOverlay,
    reliefSpanOverride,
    hillshade,
    contours,
    orthophoto,
  ]);

  useEffect(() => {
    return () => {
      mapTexture.dispose();
    };
  }, [mapTexture]);

  // Build elevation-driven BufferGeometry and dispose on change/unmount
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertexCount = W * H;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    for (let r = 0; r < H; r++) {
      const z = ((r / (H - 1)) - 0.5) * SCENE_SIZE; // row 0 = North (-Z), row H-1 = South (+Z)
      const vCoord = 1 - r / (H - 1);
      for (let c = 0; c < W; c++) {
        const idx = r * W + c;
        const x = ((c / (W - 1)) - 0.5) * SCENE_SIZE; // col 0 = West (-X), col W-1 = East (+X)
        const uCoord = c / (W - 1);
        const elev = elevations[idx];
        const y =
          elev !== null && elev !== undefined
            ? ((elev - minElev) / metersPerSceneUnit) * exaggeration
            : 0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        uvs[idx * 2] = uCoord;
        uvs[idx * 2 + 1] = vCoord;
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < H - 1; r++) {
      for (let c = 0; c < W - 1; c++) {
        const a = r * W + c;
        const b = r * W + c + 1;
        const d = (r + 1) * W + c;
        const e = (r + 1) * W + c + 1;
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [W, H, elevations, minElev, metersPerSceneUnit, exaggeration]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Build solid geological cutaway skirt & crustal plinth (disposed cleanly)
  const skirtGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const baseY = -0.52;
    const verts: number[] = [];
    const cols: number[] = [];
    const topCol: [number, number, number] =
      dataset.planet === 'Mars' ? [0.42, 0.27, 0.22] : [0.36, 0.34, 0.30];
    const botCol: [number, number, number] =
      dataset.planet === 'Mars' ? [0.14, 0.10, 0.11] : [0.10, 0.16, 0.22];

    const pushWallQuad = (
      x0: number,
      y0: number,
      z0: number,
      x1: number,
      y1: number,
      z1: number
    ) => {
      // Triangle 1: top0, bot0, top1
      verts.push(x0, y0, z0, x0, baseY, z0, x1, y1, z1);
      cols.push(...topCol, ...botCol, ...topCol);
      // Triangle 2: top1, bot0, bot1
      verts.push(x1, y1, z1, x0, baseY, z0, x1, baseY, z1);
      cols.push(...topCol, ...botCol, ...botCol);
    };

    const yAt = (r: number, c: number) => {
      const e = elevations[r * W + c];
      return e !== null && e !== undefined ? ((e - minElev) / metersPerSceneUnit) * exaggeration : 0;
    };
    const xAt = (c: number) => ((c / (W - 1)) - 0.5) * SCENE_SIZE;
    const zAt = (r: number) => ((r / (H - 1)) - 0.5) * SCENE_SIZE;

    // North edge (r = 0, c goes W-1 -> 0 for outward facing)
    for (let c = W - 1; c > 0; c--) {
      pushWallQuad(xAt(c), yAt(0, c), zAt(0), xAt(c - 1), yAt(0, c - 1), zAt(0));
    }
    // South edge (r = H-1, c goes 0 -> W-1)
    for (let c = 0; c < W - 1; c++) {
      pushWallQuad(xAt(c), yAt(H - 1, c), zAt(H - 1), xAt(c + 1), yAt(H - 1, c + 1), zAt(H - 1));
    }
    // West edge (c = 0, r goes 0 -> H-1)
    for (let r = 0; r < H - 1; r++) {
      pushWallQuad(xAt(0), yAt(r, 0), zAt(r), xAt(0), yAt(r + 1, 0), zAt(r + 1));
    }
    // East edge (c = W-1, r goes H-1 -> 0)
    for (let r = H - 1; r > 0; r--) {
      pushWallQuad(xAt(W - 1), yAt(r, W - 1), zAt(r), xAt(W - 1), yAt(r - 1, W - 1), zAt(r - 1));
    }

    // Bottom datum cap
    const half = SCENE_SIZE / 2;
    verts.push(
      -half, baseY, -half,
      half, baseY, -half,
      -half, baseY, half,
      half, baseY, -half,
      half, baseY, half,
      -half, baseY, half
    );
    for (let k = 0; k < 6; k++) cols.push(...botCol);

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    return geo;
  }, [W, H, elevations, minElev, metersPerSceneUnit, exaggeration, dataset.planet]);

  useEffect(() => {
    return () => {
      skirtGeometry.dispose();
    };
  }, [skirtGeometry]);

  // Inspected pin height
  const pinPosition = useMemo<[number, number, number] | null>(() => {
    if (!inspectedCell) return null;
    const { row, col } = inspectedCell;
    const idx = row * W + col;
    const elev = elevations[idx];
    const y =
      elev !== null && elev !== undefined
        ? ((elev - minElev) / metersPerSceneUnit) * exaggeration
        : 0;
    const x = ((col / (W - 1)) - 0.5) * SCENE_SIZE;
    const z = ((row / (H - 1)) - 0.5) * SCENE_SIZE;
    return [x, y, z];
  }, [inspectedCell, W, H, elevations, minElev, metersPerSceneUnit, exaggeration]);

  // Transect line object (disposed on change/unmount)
  const transectLineObj = useMemo(() => {
    if (!showTransectOverlay) return null;
    const pts: THREE.Vector3[] = [];
    const fixedRow = Math.min(H - 1, Math.max(0, Math.round(transectFraction * (H - 1))));
    const fixedCol = Math.min(W - 1, Math.max(0, Math.round(transectFraction * (W - 1))));

    for (let i = 0; i < W; i++) {
      let r = fixedRow;
      let c = i;
      if (transectPreset === 'north-south') {
        r = i;
        c = fixedCol;
      } else if (transectPreset === 'nw-se') {
        r = i;
        c = i;
      }
      const elev = elevations[r * W + c];
      const y =
        elev !== null && elev !== undefined
          ? ((elev - minElev) / metersPerSceneUnit) * exaggeration + 0.04
          : 0.04;
      const x = ((c / (W - 1)) - 0.5) * SCENE_SIZE;
      const z = ((r / (H - 1)) - 0.5) * SCENE_SIZE;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: '#F7F8F6' });
    return new THREE.Line(geo, mat);
  }, [showTransectOverlay, transectPreset, transectFraction, W, H, elevations, minElev, metersPerSceneUnit, exaggeration]);

  useEffect(() => {
    return () => {
      if (transectLineObj) {
        transectLineObj.geometry.dispose();
        (transectLineObj.material as THREE.Material).dispose();
      }
    };
  }, [transectLineObj]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pt = e.point;
    const col = Math.max(0, Math.min(W - 1, Math.round(((pt.x / SCENE_SIZE) + 0.5) * (W - 1))));
    const row = Math.max(0, Math.min(H - 1, Math.round(((pt.z / SCENE_SIZE) + 0.5) * (H - 1))));
    onSelectCell(row, col);
  };

  return (
    <group>
      <mesh geometry={geometry} onClick={handleClick} receiveShadow castShadow>
        <meshStandardMaterial
          map={mapTexture}
          roughness={0.86}
          metalness={0.04}
        />
      </mesh>

      {/* Solid stratified geological block skirt down to datum plinth */}
      <mesh geometry={skirtGeometry}>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Base plinth datum frame showing exact 3.84 km x 3.84 km footprint */}
      <gridHelper args={[SCENE_SIZE, 8, '#334E68', '#1F364B']} position={[0, -0.54, 0]} />

      {transectLineObj && <primitive object={transectLineObj} />}

      {pinPosition && (
        <group position={pinPosition}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.7, 10]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshBasicMaterial color="#C28B38" />
          </mesh>
        </group>
      )}
    </group>
  );
};

interface CameraRigProps {
  viewportId: 'earth' | 'mars';
  linkedCamera: boolean;
  cameraSync: CameraSyncState;
  resetSignal: number;
  onCameraBroadcast: (state: Omit<CameraSyncState, 'revision'>) => void;
}

const CameraRig: React.FC<CameraRigProps> = ({
  viewportId,
  linkedCamera,
  cameraSync,
  resetSignal,
  onCameraBroadcast,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isApplyingSync = useRef(false);
  const lastRevisionRef = useRef(0);
  const { camera } = useThree();

  // Reset camera cleanly
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    isApplyingSync.current = true;
    camera.position.set(0, 6.8, 9.2);
    ctrl.target.set(0, 0.35, 0);
    ctrl.update();
    isApplyingSync.current = false;
  }, [resetSignal, camera]);

  // Apply external camera updates when linked
  useFrame(() => {
    if (!linkedCamera || !controlsRef.current) return;
    if (cameraSync.sourceViewport === viewportId || cameraSync.revision === lastRevisionRef.current) {
      return;
    }
    lastRevisionRef.current = cameraSync.revision;
    isApplyingSync.current = true;

    const ctrl = controlsRef.current;
    const target = ctrl.target;
    const dist = Math.max(4.2, Math.min(22, cameraSync.distanceRatio * 12));
    const sinPhi = Math.sin(cameraSync.polar);
    const nx = target.x + dist * sinPhi * Math.sin(cameraSync.azimuth);
    const ny = target.y + dist * Math.cos(cameraSync.polar);
    const nz = target.z + dist * sinPhi * Math.cos(cameraSync.azimuth);
    camera.position.set(nx, ny, nz);
    ctrl.update();
    isApplyingSync.current = false;
  });

  const handleControlChange = () => {
    if (!linkedCamera || isApplyingSync.current || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const offset = camera.position.clone().sub(ctrl.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    onCameraBroadcast({
      azimuth: spherical.theta,
      polar: Math.max(0.18, Math.min(Math.PI / 2 - 0.04, spherical.phi)),
      distanceRatio: spherical.radius / 12,
      sourceViewport: viewportId,
    });
  };

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={4.2}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2 - 0.04}
      target={[0, 0.35, 0]}
      onChange={handleControlChange}
    />
  );
};

interface TerrainViewportProps {
  viewportId: 'earth' | 'mars';
  dataset: TerrainGridDataset | null;
  derived: DerivedTerrainGrid | null;
  loading: boolean;
  error: string | null;
  activeLayer: SpatialLayerId;
  exaggeration: number;
  onExaggerationChange: (v: number) => void;
  reliefSpanOverride?: number | null;
  hillshade?: boolean;
  contours?: boolean;
  linkedCamera: boolean;
  cameraSync: CameraSyncState;
  onCameraBroadcast: (state: Omit<CameraSyncState, 'revision'>) => void;
  resetSignal: number;
  onResetLocalCamera: () => void;
  inspectedSample: TerrainSampleInspection | null;
  onSelectCell: (row: number, col: number) => void;
  differenceGrid?: DifferenceAnalysisResult | null;
  showDifferenceOverlay?: boolean;
  transectPreset: TransectPreset;
  transectFraction: number;
  showTransectOverlay: boolean;
  onRetry: () => void;
}

export const TerrainViewport: React.FC<TerrainViewportProps> = ({
  viewportId,
  dataset,
  derived,
  loading,
  error,
  activeLayer,
  exaggeration,
  onExaggerationChange,
  reliefSpanOverride = null,
  hillshade = true,
  contours = true,
  linkedCamera,
  cameraSync,
  onCameraBroadcast,
  resetSignal,
  onResetLocalCamera,
  inspectedSample,
  onSelectCell,
  differenceGrid,
  showDifferenceOverlay,
  transectPreset,
  transectFraction,
  showTransectOverlay,
  onRetry,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const badgeClass =
    dataset?.dataState === 'REAL_DATA'
      ? 'badge--real'
      : dataset?.dataState === 'DEMONSTRATION_DATA'
        ? 'badge--demo'
        : 'badge--unavailable';

  const badgeLabel =
    dataset?.dataState === 'REAL_DATA'
      ? 'REAL DATA'
      : dataset?.dataState === 'DEMONSTRATION_DATA'
        ? 'DEMONSTRATION DATA'
        : 'UNAVAILABLE';

  const layerLegend = useMemo(() => {
    if (showDifferenceOverlay && differenceGrid?.valid && differenceGrid.stats) {
      return {
        title: `${differenceGrid.metricLabel} (${differenceGrid.units})`,
        minLabel: `${differenceGrid.stats.min.toFixed(1)} ${differenceGrid.units}`,
        maxLabel: `+${differenceGrid.stats.max.toFixed(1)} ${differenceGrid.units}`,
        gradient: 'linear-gradient(90deg, #286A91 0%, #E8ECEF 50%, #C28B38 100%)',
      };
    }
    if (!dataset || !derived) return null;
    if (activeLayer === 'elevation' || activeLayer === 'geology') {
      if (reliefSpanOverride && reliefSpanOverride > 0) {
        return {
          title: `Matched Local Relief (${dataset.verticalDatum.split(' ')[0]} base)`,
          minLabel: `0 m (${dataset.stats.minElevation.toFixed(0)} m)`,
          maxLabel: `+${Math.round(reliefSpanOverride)} m relief`,
          gradient:
            dataset.planet === 'Mars'
              ? 'linear-gradient(90deg, #54342A, #884C36, #BA6C44, #DA9A68, #EECEA8)'
              : 'linear-gradient(90deg, #B89F7E, #D4BC94, #C4986C, #9E7252, #765C4E)',
        };
      }
      return {
        title: `Elevation (${dataset.verticalDatum.split(' ')[0]})`,
        minLabel: `${dataset.stats.minElevation.toFixed(1)} m`,
        maxLabel: `${dataset.stats.maxElevation.toFixed(1)} m`,
        gradient:
          dataset.planet === 'Mars'
            ? 'linear-gradient(90deg, #54342A, #884C36, #BA6C44, #DA9A68, #EECEA8)'
            : 'linear-gradient(90deg, #B89F7E, #D4BC94, #C4986C, #9E7252, #765C4E)',
      };
    }
    if (activeLayer === 'slope') {
      return {
        title: 'Slope (Horn 3×3)',
        minLabel: '0°',
        maxLabel: '30°+',
        gradient: 'linear-gradient(90deg, #286A91, #327F79, #C28B38, #B64A34)',
      };
    }
    if (activeLayer === 'aspect') {
      return {
        title: 'Aspect Azimuth',
        minLabel: '0° N → 90° E → 180° S → 270° W',
        maxLabel: '360° N',
        gradient: 'linear-gradient(90deg, #286A91, #327F79, #C28B38, #7666A5, #286A91)',
      };
    }
    if (activeLayer === 'roughness') {
      return {
        title: 'Roughness (TRI 3×3)',
        minLabel: '0 m',
        maxLabel: '12+ m',
        gradient: 'linear-gradient(90deg, #1E3A52, #327F79, #C28B38, #ECE0C6)',
      };
    }
    if (activeLayer === 'coverage') {
      return {
        title: 'Raster Coverage',
        minLabel: 'Teal: Valid 30m | Amber: Boundary',
        maxLabel: 'Red: NoData',
        gradient: 'linear-gradient(90deg, #327F79 0%, #327F79 70%, #C28B38 70%, #C28B38 85%, #B64A34 85%)',
      };
    }
    return {
      title: dataset.imagery ? dataset.imagery.source : 'Imagery Unavailable',
      minLabel: 'Georeferenced RGB',
      maxLabel: '3.84 km × 3.84 km',
      gradient: 'linear-gradient(90deg, #4B433B, #9A7D65, #C7B29B)',
    };
  }, [activeLayer, dataset, derived, showDifferenceOverlay, differenceGrid, reliefSpanOverride]);

  return (
    <section
      className={`viewport-card ${isFullscreen ? 'viewport-card--fullscreen' : ''}`}
      aria-label={`${viewportId === 'earth' ? 'Earth' : 'Planetary'} 3D Terrain Viewport`}
    >
      <div className="viewport-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: viewportId === 'earth' ? '#7CC4E8' : '#E7A95A',
            }}
          >
            {viewportId === 'earth' ? 'LEFT · EARTH ANALOG' : `RIGHT · ${dataset?.planet.toUpperCase() ?? 'PLANETARY'} REFERENCE`}
          </span>
          <strong style={{ fontSize: 13.5, fontWeight: 600 }}>
            {dataset?.siteName ?? 'Loading dataset...'}
          </strong>
          {dataset && <span className={`badge ${badgeClass}`}>{badgeLabel}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#C6D3DF' }}
            title="Vertical elevation exaggeration"
          >
            <span>Exag.</span>
            <input
              type="range"
              min={1}
              max={6}
              step={0.5}
              value={exaggeration}
              onChange={(e) => onExaggerationChange(parseFloat(e.target.value))}
              style={{ width: 68, accentColor: '#C28B38' }}
              aria-label={`${viewportId} vertical exaggeration`}
            />
            <span className="mono" style={{ width: 28 }}>
              {exaggeration.toFixed(1)}×
            </span>
          </label>

          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px', fontSize: 11.5, background: '#1D3346', color: '#E8ECEF', borderColor: 'rgba(255,255,255,0.18)' }}
            onClick={onResetLocalCamera}
            title="Reset camera view"
          >
            <RotateCcw size={13} />
            Reset
          </button>

          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px', fontSize: 11.5, background: '#1D3346', color: '#E8ECEF', borderColor: 'rgba(255,255,255,0.18)' }}
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Exit fullscreen viewport' : 'Expand viewport fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      <div className="viewport-canvas-wrap">
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(13, 25, 36, 0.85)',
              color: '#F2F5F8',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: 13 }}>
              <div className="mono" style={{ marginBottom: 4 }}>
                LOADING 30.0 M ELEVATION GRID...
              </div>
              <div style={{ fontSize: 11.5, color: '#9FB0C1' }}>
                Validating bounds, vertical datum, and coverage mask
              </div>
            </div>
          </div>
        )}

        {(error || dataset?.dataState === 'UNAVAILABLE') && !loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'grid',
              placeItems: 'center',
              padding: 24,
              background: '#0F1C28',
              color: '#F2F5F8',
            }}
          >
            <div style={{ maxWidth: 460, textAlign: 'left', border: '1px solid rgba(255,255,255,0.16)', padding: 18, borderRadius: 6, background: '#172A3A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={18} color="#C28B38" />
                <strong style={{ fontSize: 14 }}>
                  {dataset?.dataState === 'UNAVAILABLE' ? 'Dataset Unavailable in Local Workspace' : 'Dataset Load Error'}
                </strong>
              </div>
              <p style={{ fontSize: 13, color: '#CBD6E2', marginBottom: 12 }}>
                {error ?? dataset?.unavailableReason}
              </p>
              {dataset?.provenance.originalUrl && (
                <div style={{ fontSize: 12, marginBottom: 12 }}>
                  Official Source:{' '}
                  <a
                    href={dataset.provenance.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#7CC4E8', textDecoration: 'underline' }}
                  >
                    {dataset.provenance.datasetName}
                  </a>
                </div>
              )}
              <button type="button" className="btn btn--primary" onClick={onRetry}>
                <RefreshCw size={13} />
                Retry Dataset Load
              </button>
            </div>
          </div>
        )}

        {dataset && derived && dataset.dataState !== 'UNAVAILABLE' && !loading && !error && (
          <ViewportErrorBoundary fallbackLabel="WebGL 3D terrain context could not initialize">
            <Canvas dpr={[1, 2]} camera={{ position: [0, 6.8, 9.2], fov: 42 }}>
              <color attach="background" args={['#0D1924']} />
              <ambientLight intensity={0.78} />
              <directionalLight position={[-7, 11, -7]} intensity={0.95} />
              <directionalLight position={[6, 5, 7]} intensity={0.35} color="#7CC4E8" />
              <TerrainMesh
                dataset={dataset}
                derived={derived}
                activeLayer={activeLayer}
                exaggeration={exaggeration}
                reliefSpanOverride={reliefSpanOverride}
                hillshade={hillshade}
                contours={contours}
                differenceGrid={differenceGrid}
                showDifferenceOverlay={showDifferenceOverlay}
                inspectedCell={inspectedSample ? { row: inspectedSample.row, col: inspectedSample.col } : null}
                transectPreset={transectPreset}
                transectFraction={transectFraction}
                showTransectOverlay={showTransectOverlay}
                onSelectCell={onSelectCell}
              />
              <CameraRig
                viewportId={viewportId}
                linkedCamera={linkedCamera}
                cameraSync={cameraSync}
                resetSignal={resetSignal}
                onCameraBroadcast={onCameraBroadcast}
              />
            </Canvas>
          </ViewportErrorBoundary>
        )}

        {/* Scale Bar & North Arrow */}
        {dataset && dataset.dataState !== 'UNAVAILABLE' && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              zIndex: 5,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                background: 'rgba(16, 30, 43, 0.88)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 4,
                padding: '5px 8px',
                fontSize: 11,
                color: '#E8ECEF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono">N ↑</span>
                <div>
                  <div style={{ width: 64, height: 3, background: '#F7F8F6', marginBottom: 2 }} />
                  <span className="mono" style={{ fontSize: 10, color: '#9FB0C1' }}>
                    3.84 km tile · 30 m grid
                  </span>
                </div>
              </div>
            </div>

            {layerLegend && (
              <div
                style={{
                  background: 'rgba(16, 30, 43, 0.88)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 4,
                  padding: '6px 9px',
                  minWidth: 190,
                }}
              >
                <div style={{ fontSize: 10.5, color: '#CBD6E2', marginBottom: 4 }}>{layerLegend.title}</div>
                <div style={{ height: 6, borderRadius: 2, background: layerLegend.gradient, marginBottom: 3 }} />
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9FB0C1' }}>
                  <span>{layerLegend.minLabel}</span>
                  <span>{layerLegend.maxLabel}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Click Hint */}
        {dataset && dataset.dataState !== 'UNAVAILABLE' && (
          <div
            className="mono"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 5,
              pointerEvents: 'none',
              background: 'rgba(16, 30, 43, 0.82)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 10.5,
              color: '#9FB0C1',
            }}
          >
            Drag: Orbit · Scroll: Zoom · Click mesh: Inspect
          </div>
        )}
      </div>

      {/* Compact Viewport Metadata Strip */}
      {dataset && (
        <div className="viewport-meta-strip">
          <span>
            <strong style={{ color: '#F2F5F8' }}>Native:</strong> {dataset.nativeResolutionLabel}
          </span>
          <span>
            <strong style={{ color: '#F2F5F8' }}>Analysis:</strong> {dataset.analysisResolutionLabel}
          </span>
          <span>
            <strong style={{ color: '#F2F5F8' }}>Coverage:</strong>{' '}
            <span className="mono">{dataset.stats.coveragePercent}%</span> ({dataset.stats.validCells.toLocaleString()} cells)
          </span>
          <span>
            <strong style={{ color: '#F2F5F8' }}>Datum:</strong> {dataset.verticalDatum.split('(')[0]}
          </span>
        </div>
      )}
    </section>
  );
};
