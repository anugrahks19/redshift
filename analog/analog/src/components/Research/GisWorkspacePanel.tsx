import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Globe2, Layers, MapPin, AlertTriangle } from 'lucide-react';
import type { AnalogSiteProfile, PlanetaryRegionTarget } from '../../types/dataset';
import type { SpatialLayerId } from '../../types/terrain';

interface GisWorkspacePanelProps {
  activeRegion: PlanetaryRegionTarget;
  allSites: AnalogSiteProfile[];
  selectedEarthSiteId: string;
  comparisonSiteIds: string[];
  onSelectEarthSite: (id: string) => void;
  activeLayer: SpatialLayerId;
}

const WORLD_COAST_SIMPLIFIED: [number, number][][] = [
  [[70, -162], [71, -135], [62, -78], [44, -66], [25, -80], [15, -88], [23, -106], [48, -125], [64, -165]],
  [[11, -74], [2, -50], [-23, -43], [-54, -69], [-18, -71], [7, -78]],
  [[36, -9], [54, 8], [70, 26], [72, 138], [55, 162], [35, 136], [22, 114], [8, 77], [30, 32]],
  [[35, -6], [31, 32], [-2, 41], [-34, 19], [-6, 12], [15, -17]],
  [[-12, 131], [-25, 153], [-38, 149], [-34, 115]],
  [[-66, -180], [-72, -120], [-68, 60], [-74, 180], [-85, 180], [-85, -180]],
];

export const GisWorkspacePanel: React.FC<GisWorkspacePanelProps> = ({
  activeRegion,
  allSites,
  selectedEarthSiteId,
  comparisonSiteIds,
  onSelectEarthSite,
  activeLayer,
}) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const primaryEarth = allSites.find((s) => s.id === selectedEarthSiteId) ?? allSites[0]!;

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      center: [primaryEarth.coordinates.lat, primaryEarth.coordinates.lon],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      attributionControl: true,
      worldCopyJump: true,
    });

    [-60, -30, 0, 30, 60].forEach((lat) => {
      L.polyline([[lat, -180], [lat, 180]], {
        color: 'rgba(255,255,255,0.06)',
        weight: 1,
        dashArray: lat === 0 ? undefined : '3 4',
        interactive: false,
      }).addTo(map);
    });
    [-120, -60, 0, 60, 120].forEach((lon) => {
      L.polyline([[-85, lon], [85, lon]], {
        color: 'rgba(255,255,255,0.06)',
        weight: 1,
        dashArray: lon === 0 ? undefined : '3 4',
        interactive: false,
      }).addTo(map);
    });

    WORLD_COAST_SIMPLIFIED.forEach((poly) => {
      L.polygon(poly, {
        color: 'rgba(255,255,255,0.32)',
        weight: 1,
        fillColor: '#121822',
        fillOpacity: 0.92,
      }).addTo(map);
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxZoom: 17 }
    ).addTo(map);

    const markers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = markers;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    allSites.forEach((site) => {
      const isPrimary = site.id === selectedEarthSiteId;
      const inCompare = comparisonSiteIds.includes(site.id);
      const marker = L.circleMarker([site.coordinates.lat, site.coordinates.lon], {
        radius: isPrimary ? 9 : inCompare ? 7 : 5,
        color: isPrimary ? '#E7A95A' : inCompare ? '#38BDF8' : '#CBD5E1',
        weight: isPrimary ? 2.5 : 1.5,
        fillColor: isPrimary ? '#286A91' : inCompare ? '#327F79' : '#64748B',
        fillOpacity: 0.9,
      });
      marker.bindTooltip(`${site.name} (${site.category})`, { direction: 'top' });
      marker.on('click', () => onSelectEarthSite(site.id));
      marker.addTo(group);
    });

    map.panTo([primaryEarth.coordinates.lat, primaryEarth.coordinates.lon], { animate: true });
  }, [allSites, selectedEarthSiteId, comparisonSiteIds, onSelectEarthSite, primaryEarth.coordinates.lat, primaryEarth.coordinates.lon]);

  const layerStatusText = (): string => {
    const demAvailable = activeRegion.hasLocalDem && primaryEarth.hasLocalDem;
    if (activeLayer === 'geology') return 'Literature & published point-sample geochemistry (no 30 m mineral raster)';
    if (!demAvailable) return `GIS metadata & published orbital survey layer (30 m DEM unavailable for ${activeRegion.shortName} / ${primaryEarth.name.split(',')[0]})`;
    return `Active 30 m DEM spatial layer (${activeLayer.toUpperCase()}) validated for Yungay ↔ ${activeRegion.shortName}`;
  };

  return (
    <section className="panel" aria-label="GIS Spatial Workspace">
      <div className="panel-header">
        <div className="panel-title">
          <Globe2 size={15} color="#286A91" />
          <span>Spatial investigation</span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Layers size={12} />
          {layerStatusText()}
        </span>
      </div>

      <div className="rs-gis-grid">
        {/* Interactive Earth Analog GIS Map */}
        <div className="rs-gis-map-wrap">
          <div ref={mapElRef} className="rs-gis-leaflet" />
          <div className="rs-gis-legend mono">
            <span><i style={{ background: '#286A91', borderColor: '#E7A95A' }} /> Primary Earth Site</span>
            <span><i style={{ background: '#327F79', borderColor: '#38BDF8' }} /> In Comparison</span>
            <span><i style={{ background: '#64748B', borderColor: '#CBD5E1' }} /> Available Candidate</span>
          </div>
        </div>

        {/* Technical Location Metadata Cards (RS-05) */}
        <div className="rs-meta-column">
          <div className="rs-meta-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
                <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                PLANETARY TARGET · {activeRegion.planet.toUpperCase()}
              </span>
              <span className={`badge ${activeRegion.hasLocalDem ? 'badge--real' : 'badge--demo'}`}>
                {activeRegion.hasLocalDem ? '30m DEM' : 'No Local DEM'}
              </span>
            </div>
            <h3 style={{ fontSize: 15, marginTop: 4 }}>{activeRegion.name}</h3>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              COORDS: {activeRegion.coordinatesDisplay} · ELEVATION: {activeRegion.elevationSummary}
            </div>
            <p style={{ fontSize: 12.5, marginTop: 6 }}>{activeRegion.scientificFocus}</p>
          </div>

          <div className="rs-meta-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent-teal)', fontWeight: 600 }}>
                <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                PRIMARY EARTH ANALOG SITE
              </span>
              <span className={`badge ${primaryEarth.hasLocalDem ? 'badge--real' : 'badge--demo'}`}>
                {primaryEarth.hasLocalDem ? '30m DEM' : 'Literature Profile'}
              </span>
            </div>
            <h3 style={{ fontSize: 15, marginTop: 4 }}>{primaryEarth.name}</h3>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              COORDS: {primaryEarth.coordinates.display} · {primaryEarth.elevationRange}
            </div>
            <p style={{ fontSize: 12.5, marginTop: 6 }}>{primaryEarth.geologicalContext}</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, fontSize: 11.5, color: '#7D5416' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{primaryEarth.coordinates.generalizedNote}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

