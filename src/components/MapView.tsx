import { useEffect, useRef, useCallback } from 'react';
import { Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Location } from '../types';

// ------------------------------------------------------------------
// Marker sizing — sqrt scale for diminishing returns on large counts
// Range: ~26px (1 intern) → 48px (50+ interns)
// Tune MIN_SIZE / MAX_SIZE / SCALE_REF to adjust the spread
// ------------------------------------------------------------------
const MIN_SIZE = 26;
const MAX_SIZE = 48;
const SCALE_REF = 50; // intern count that maps to MAX_SIZE

function markerSize(count: number): number {
  const scale = Math.sqrt(Math.min(count, SCALE_REF) / SCALE_REF);
  return Math.round(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * scale);
}

// ------------------------------------------------------------------
// Marker content helpers
// ------------------------------------------------------------------

function makeMarkerEl(count: number, selected: boolean): HTMLElement {
  const size = markerSize(count);
  const fontSize = size <= 30 ? 10 : size <= 38 ? 11 : 12;
  const bg = selected ? '#978D4F' : '#00356B';
  // White border + shadow ensure readability even when bubbles are close together
  const border = selected ? '2.5px solid #fff' : '2.5px solid rgba(255,255,255,0.95)';
  const shadow = selected
    ? '0 0 0 3px rgba(151,141,79,0.35), 0 3px 10px rgba(0,0,0,0.3)'
    : '0 2px 6px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,53,107,0.15)';

  const div = document.createElement('div');
  div.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `background:${bg}`,
    'color:#fff',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    `font-size:${fontSize}px`,
    'font-weight:700',
    'font-family:Inter,system-ui,sans-serif',
    `border:${border}`,
    `box-shadow:${shadow}`,
    'cursor:pointer',
    'transition:transform 0.15s ease,box-shadow 0.15s ease',
    selected ? 'transform:scale(1.2)' : '',
  ]
    .filter(Boolean)
    .join(';');
  div.textContent = String(count);
  // Store intern count so the cluster renderer can sum across cities
  div.dataset.internCount = String(count);

  if (!selected) {
    div.addEventListener('mouseenter', () => {
      div.style.transform = 'scale(1.1)';
    });
    div.addEventListener('mouseleave', () => {
      div.style.transform = '';
    });
  }

  return div;
}

function makeClusterEl(count: number): HTMLElement {
  // sqrt scale for clusters too — keeps large cluster bubbles from dominating
  const size = Math.round(Math.min(66, 38 + 28 * Math.sqrt(Math.min(count, 160) / 160)));
  const fontSize = size >= 58 ? 16 : size >= 50 ? 15 : 13;
  const div = document.createElement('div');
  div.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'background:#00356B',
    'color:#fff',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    `font-size:${fontSize}px`,
    'font-weight:700',
    'font-family:Inter,system-ui,sans-serif',
    'border:3px solid rgba(255,255,255,0.9)',
    'box-shadow:0 3px 14px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,53,107,0.2)',
    'cursor:pointer',
  ].join(';');
  div.textContent = String(count);
  return div;
}

// ------------------------------------------------------------------
// Inner component — lives inside <Map> so useMap() works
// ------------------------------------------------------------------

interface MarkersProps {
  locations: Location[];
  selectedId: string | null;
  onSelectCity: (id: string | null) => void;
}

function ClusterMarkers({ locations, selectedId, onSelectCity }: MarkersProps) {
  const map = useMap();

  // Stable ref for the callback so we don't recreate markers on every re-render
  const onSelectRef = useRef(onSelectCity);
  useEffect(() => {
    onSelectRef.current = onSelectCity;
  });

  // Refs for imperative objects
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markerMapRef = useRef<globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>>(new globalThis.Map());
  // Keep locations in a ref so the selection-update effect can read current counts
  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  });

  // ----------------------------------------------------------------
  // Re-create all markers when the location list changes
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!map) return;

    // Clean up previous markers
    markerMapRef.current.forEach((m) => {
      m.map = null;
    });
    markerMapRef.current.clear();
    clustererRef.current?.clearMarkers();

    if (locations.length === 0) return;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    for (const loc of locations) {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: loc.lat, lng: loc.lng },
        content: makeMarkerEl(loc.count, loc.id === selectedId),
        title: loc.displayName,
        zIndex: loc.count,
      });

      marker.addListener('click', () => {
        onSelectRef.current(loc.id);
      });

      markerMapRef.current.set(loc.id, marker);
      markers.push(marker);
    }

    // Always recreate the clusterer so the renderer closure is fresh
    clustererRef.current?.clearMarkers();
    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      algorithmOptions: {
        // Increase radius (default 60px) so nearby cities stay clustered longer
        // before breaking into individual overlapping bubbles.
        // Raise this value (e.g. 140) for even tighter clustering.
        radius: 120,
      },
      renderer: {
        render({ position, markers: clusterMarkers }) {
          // Sum the actual intern counts stored on each marker's content element
          const totalInterns = (clusterMarkers ?? []).reduce((sum, m) => {
            const el = (m as google.maps.marker.AdvancedMarkerElement).content as HTMLElement | null;
            return sum + parseInt(el?.dataset?.internCount ?? '0', 10);
          }, 0);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: makeClusterEl(totalInterns),
            zIndex: 1000 + totalInterns,
          });
        },
      },
    });

    // Fit map to show all markers
    const bounds = new google.maps.LatLngBounds();
    locations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));

    if (locations.length > 1) {
      // Extra padding gives more breathing room around the edges
      map.fitBounds(bounds, { top: 80, right: 60, bottom: 80, left: 60 });

      // For dense views (many cities), zoom out one extra level so clusters
      // have room to form instead of immediately breaking into overlapping dots.
      // Increase the threshold (e.g. > 20) if you want this to apply less often.
      if (locations.length > 10) {
        google.maps.event.addListenerOnce(map, 'idle', () => {
          const z = map.getZoom();
          if (z != null) map.setZoom(Math.max(2, z - 1));
        });
      }
    } else if (locations.length === 1) {
      map.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
      map.setZoom(10);
    }

    return () => {
      markerMapRef.current.forEach((m) => {
        m.map = null;
      });
      markerMapRef.current.clear();
      clustererRef.current?.clearMarkers();
    };
    // selectedId intentionally excluded — we update markers separately below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, locations]);

  // ----------------------------------------------------------------
  // Update only the visual appearance when selection changes
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!map) return;
    markerMapRef.current.forEach((marker, id) => {
      const loc = locationsRef.current.find((l) => l.id === id);
      if (loc) {
        marker.content = makeMarkerEl(loc.count, id === selectedId);
        marker.zIndex = id === selectedId ? 9999 : loc.count;
      }
    });
  }, [map, selectedId]);

  // ----------------------------------------------------------------
  // Pan to selected city
  // ----------------------------------------------------------------
  const panToSelected = useCallback(() => {
    if (!map || !selectedId) return;
    const marker = markerMapRef.current.get(selectedId);
    if (!marker?.position) return;
    const pos = marker.position as google.maps.LatLngLiteral | google.maps.LatLng;
    map.panTo(pos);
    const zoom = map.getZoom() ?? 0;
    if (zoom < 9) map.setZoom(9);
  }, [map, selectedId]);

  useEffect(() => {
    panToSelected();
  }, [panToSelected]);

  return null;
}

// ------------------------------------------------------------------
// Public component
// ------------------------------------------------------------------

interface Props {
  locations: Location[];
  selectedId: string | null;
  mapId: string;
  onSelectCity: (id: string | null) => void;
}

export default function MapView({ locations, selectedId, mapId, onSelectCity }: Props) {
  return (
    <div className="flex-1 relative overflow-hidden">
      <GoogleMap
        defaultCenter={{ lat: 30, lng: -20 }}
        defaultZoom={2}
        mapId={mapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={true}
        zoomControl={true}
        className="w-full h-full"
        onClick={() => onSelectCity(null)}
      >
        <ClusterMarkers
          locations={locations}
          selectedId={selectedId}
          onSelectCity={onSelectCity}
        />
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-8 left-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-card px-3 py-2 text-xs text-gray-600 space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-yale-blue border-2 border-white shadow-sm flex items-center justify-center text-white text-[9px] font-bold">n</div>
          <span>Interns at city</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-yale-blue border-[3px] border-white/80 shadow flex items-center justify-center text-white text-[9px] font-bold">+</div>
          <span>Clustered cities</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-yale-gold border-2 border-white shadow-sm" />
          <span>Selected city</span>
        </div>
      </div>
    </div>
  );
}
