import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2, Search, Navigation } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const lastSearchRequestAt = useRef(0);

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

  const updateLocation = async (newPos: L.LatLng) => {
    hasInteracted.current = true;
    setPosition(newPos);
    const newAddress = await fetchAddress(newPos.lat, newPos.lng);
    onLocationSelect(newPos.lat, newPos.lng, newAddress);
  };

  const handleDragEnd = async (newPos: L.LatLng) => {
    await updateLocation(newPos);
  };

  const handleMapClick = (newPos: L.LatLng) => {
    void updateLocation(newPos);
  };

  const handleSearchLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const query = searchQuery.trim();
    if (!query || isSearching) return;

    const now = Date.now();
    if (now - lastSearchRequestAt.current < 1500) {
      setStatusMessage('Tunggu sebentar sebelum mencari lagi');
      setStatusIsError(true);
      return;
    }
    lastSearchRequestAt.current = now;

    setIsSearching(true);
    setStatusMessage(null);
    setStatusIsError(false);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setStatusMessage('Lokasi tidak ditemukan');
        setStatusIsError(true);
        return;
      }

      const match = data[0];
      const lat = parseFloat(match.lat);
      const lng = parseFloat(match.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setStatusMessage('Lokasi tidak ditemukan');
        setStatusIsError(true);
        return;
      }

      await updateLocation(new L.LatLng(lat, lng));
      setStatusMessage(null);
      setStatusIsError(false);
    } catch (error) {
      console.error('Failed to search location', error);
      setStatusMessage('Lokasi tidak ditemukan');
      setStatusIsError(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (isUsingLocation) return;
    if (!navigator.geolocation) {
      setStatusMessage('Lokasi tidak tersedia');
      setStatusIsError(true);
      return;
    }

    setIsUsingLocation(true);
    setStatusMessage(null);
    setStatusIsError(false);

    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        void updateLocation(new L.LatLng(geoPosition.coords.latitude, geoPosition.coords.longitude));
        setIsUsingLocation(false);
      },
      (error) => {
        console.error('Failed to get user location', error);
        if (error.code === error.PERMISSION_DENIED) {
          setStatusMessage('Izin lokasi ditolak');
        } else {
          setStatusMessage('Lokasi tidak tersedia');
        }
        setStatusIsError(true);
        setIsUsingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 z-[1000] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
              {loading ? 'Locating...' : address || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
              </span>
          </div>
          {loading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchLocation} className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lokasi..."
              className="flex-1 min-w-0 bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="submit"
              disabled={isSearching || isUsingLocation || !searchQuery.trim()}
              className="px-2.5 py-2 rounded-lg bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
              aria-label="Cari lokasi"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isSearching || isUsingLocation}
            className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 bg-white/90 dark:bg-slate-900/70 disabled:opacity-50 disabled:cursor-not-allowed hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
            title="Use my location"
          >
            {isUsingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">Use my location</span>
          </button>
        </div>

        {(isSearching || isUsingLocation || statusMessage) && (
          <p className={`text-[11px] font-medium ${statusIsError ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {isSearching ? 'Mencari lokasi...' : isUsingLocation ? 'Mengambil lokasi saat ini...' : statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};
