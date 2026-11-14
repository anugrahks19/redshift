import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import type { AnalogSiteProfile } from '../../types/dataset';
import type { DerivedTerrainGrid, TerrainGridDataset } from '../../types/terrain';
import { renderSpatialMapToCanvas } from '../../services/geospatialService';

interface Props {
  sites: AnalogSiteProfile[];
  selectedSite: AnalogSiteProfile;
  onSelectSite: (id: string) => void;
  earthDataset: TerrainGridDataset | null;
  earthDerived: DerivedTerrainGrid | null;
  onContinue: () => void;
}

export const FieldLabEarthMap: React.FC<Props> = ({ sites, selectedSite, onSelectSite, earthDataset, earthDerived, onContinue }) => {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onSelectRef = useRef(onSelectSite);
  onSelectRef.current = onSelectSite;
  const [view, setView] = useState<'satellite' | 'terrain'>('satellite');
  const [terrainLayer, setTerrainLayer] = useState<'elevation' | 'slope' | 'roughness'>('elevation');
  const canInspectTerrain = selectedSite.hasLocalDem && !!earthDataset && !!earthDerived;
  const selectedIndex = useMemo(() => sites.findIndex((site) => site.id === selectedSite.id), [sites, selectedSite.id]);

  useEffect(() => {
    if (!mapElement.current) return;
    const map = L.map(mapElement.current, { center: [selectedSite.coordinates.lat, selectedSite.coordinates.lon], zoom: 3, minZoom: 2, maxZoom: 16, zoomControl: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxZoom: 17 }).addTo(map);
    const markers = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersRef.current = markers;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; markersRef.current = null; };
    // Selection changes are handled by the marker effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;
    markers.clearLayers();
    sites.forEach((site) => {
      const active = site.id === selectedSite.id;
      L.circleMarker([site.coordinates.lat, site.coordinates.lon], { radius: active ? 9 : 6, weight: 2, color: '#fff', fillColor: active ? '#fff' : '#111', fillOpacity: 1 })
        .bindTooltip(site.name, { direction: 'top' })
        .on('click', () => onSelectRef.current(site.id))
        .addTo(markers);
    });
    map.flyTo([selectedSite.coordinates.lat, selectedSite.coordinates.lon], Math.max(map.getZoom(), 4), { animate: true, duration: .7 });
  }, [sites, selectedSite.id, selectedSite.coordinates.lat, selectedSite.coordinates.lon]);

  useEffect(() => {
    if (view !== 'terrain' || !canInspectTerrain || !earthDataset || !earthDerived || !canvasRef.current) return;
    renderSpatialMapToCanvas({ dataset: earthDataset, derived: earthDerived, activeLayer: terrainLayer, hillshade: true, contours: terrainLayer === 'elevation', size: 680 }, canvasRef.current);
  }, [view, canInspectTerrain, earthDataset, earthDerived, terrainLayer]);

  useEffect(() => {
    if (view !== 'satellite') return;
    const frame = window.requestAnimationFrame(() => mapRef.current?.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  const selectSite = (site: AnalogSiteProfile) => {
    onSelectSite(site.id);
    if (!site.hasLocalDem) setView('satellite');
  };

  return <section className="lab-earth" aria-label="Earth analog site investigation">
    <div className="lab-earth-toolbar"><div className="lab-earth-view-switch" role="group" aria-label="Earth map view"><button type="button" className={view === 'satellite' ? 'is-active' : ''} onClick={() => setView('satellite')}>Satellite map</button><button type="button" disabled={!canInspectTerrain} className={view === 'terrain' ? 'is-active' : ''} onClick={() => setView('terrain')}>30 m terrain grid</button></div><span>{selectedSite.coordinates.display}</span></div>
    <div className="lab-earth-grid"><div className="lab-earth-map"><div ref={mapElement} className="lab-earth-leaflet" style={{ display: view === 'satellite' ? 'block' : 'none' }} />{view === 'terrain' && <div className="lab-earth-dem"><div className="lab-earth-dem-controls" role="group" aria-label="Earth terrain layer">{(['elevation', 'slope', 'roughness'] as const).map((item) => <button key={item} type="button" className={terrainLayer === item ? 'is-active' : ''} onClick={() => setTerrainLayer(item)}>{item}</button>)}</div><canvas ref={canvasRef} aria-label={`Yungay ${terrainLayer} map from Copernicus GLO-30`} /><span>Yungay 3.84 km study area · 30 m analysis grid</span></div>}</div><div className="lab-earth-side"><div className="lab-earth-list"><p className="atlas-kicker">FIELD CANDIDATES / {sites.length}</p>{sites.map((site, index) => <button key={site.id} type="button" className={site.id === selectedSite.id ? 'is-active' : ''} onClick={() => selectSite(site)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{site.name.split(',')[0]}</strong><small>{site.country}</small></button>)}</div><div className="lab-earth-profile"><p className="atlas-kicker">SELECTED SITE / {String(selectedIndex + 1).padStart(2, '0')}</p><h2>{selectedSite.name}</h2><p className="lab-earth-location">{selectedSite.region}, {selectedSite.country}</p><dl><div><dt>Terrain</dt><dd>{selectedSite.terrainCharacteristics[0]}</dd></div><div><dt>Research use</dt><dd>{selectedSite.planetaryApplication}</dd></div><div><dt>Data</dt><dd>{selectedSite.hasLocalDem ? '30 m local elevation grid available' : 'Location and literature profile; local elevation grid unavailable'}</dd></div><div><dt>Limit</dt><dd>{selectedSite.limitations[0]}</dd></div></dl><button type="button" className="field-lab-primary" onClick={onContinue}>Compare this site <span aria-hidden="true">↗</span></button></div></div></div>
  </section>;
};
