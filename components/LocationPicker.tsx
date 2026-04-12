import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2 } from 'lucide-react';

// Fix Leaflet default icon issue
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  radius?: number; // in km
}

function DraggableMarker({ position, setPosition, onDragEnd }: { position: L.LatLng, setPosition: (pos: L.LatLng) => void, onDragEnd: (pos: L.LatLng) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition(newPos);
          onDragEnd(newPos);
        }
      },
    }),
    [onDragEnd, setPosition],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

// Component to update map center when position changes
function MapUpdater({ center }: { center: L.LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Use setView with animate: true to ensure it centers and stays visible
      // We use a small timeout to ensure the marker has finished its internal state updates
      const timer = setTimeout(() => {
        map.setView(center, map.getZoom(), { animate: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [center.lat, center.lng, map]);
  return null;
}

// Component to handle map clicks
function MapEvents({ onMapClick }: { onMapClick: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ initialLat, initialLng, onLocationSelect, radius = 1 }) => {
  const [position, setPosition] = useState<L.LatLng>(new L.LatLng(initialLat, initialLng));
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Sync props to state ONLY if the user hasn't manually moved the pin yet
  // or if the initial coordinates change significantly (e.g. first load)
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!hasInteracted.current) {
      const newPos = new L.LatLng(initialLat, initialLng);
      setPosition(newPos);
    }
  }, [initialLat, initialLng]);

  // Fetch address when position changes (debounced or on drag end)
  const fetchAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      // Use OpenStreetMap Nominatim for reverse geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      if (data && (data.address || data.display_name)) {
        const addr = data.address;
        // Prioritize specific neighborhood/suburb names
        const shortName = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.city_district || addr.town || addr.city || data.display_name.split(',')[0];
        setAddress(shortName);
        return shortName;
      }
    } catch (error) {
      console.error("Failed to reverse geocode", error);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  const handleDragEnd = async (newPos: L.LatLng) => {
    hasInteracted.current = true;
    setPosition(newPos);
    const newAddress = await fetchAddress(newPos.lat, newPos.lng);
    onLocationSelect(newPos.lat, newPos.lng, newAddress);
  };

  const handleMapClick = (newPos: L.LatLng) => {
    hasInteracted.current = true;
    setPosition(newPos);
    handleDragEnd(newPos);
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchAddress(initialLat, initialLng).then(addr => {
        if (addr) onLocationSelect(initialLat, initialLng, addr);
    });
  }, []); // Only on mount

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden z-0">
      <MapContainer center={[initialLat, initialLng]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapClick={handleMapClick} />
        <DraggableMarker position={position} setPosition={setPosition} onDragEnd={handleDragEnd} />
        
        {/* Radius Circle Visualization */}
        {radius && (
             <Circle 
                center={position}
                radius={radius * 1000} // convert km to meters
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
             />
        )}
        
        <MapUpdater center={position} />
      </MapContainer>
      
      {/* Address Overlay */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 z-[1000] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
            {loading ? 'Locating...' : address || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
            </span>
        </div>
        {loading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
      </div>
    </div>
  );
};
