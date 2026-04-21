import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface DeadDropMapProps {
  mode: "select" | "view";
  latitude?: number;
  longitude?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

function LocationSelector({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function DeadDropMap({ mode, latitude, longitude, onLocationSelect }: DeadDropMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );

  useEffect(() => {
    if (latitude && longitude) setPosition([latitude, longitude]);
  }, [latitude, longitude]);

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect?.(lat, lng);
  };

  const center: [number, number] = position || [41.0082, 28.9784]; // Istanbul default

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <MapContainer center={center} zoom={position ? 15 : 10} style={{ height: "250px", width: "100%" }} className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {mode === "select" && <LocationSelector onSelect={handleSelect} />}
        {position && <Marker position={position} />}
      </MapContainer>
      {mode === "select" && !position && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-white/80">
            <MapPin className="w-4 h-4" /> Haritaya tıklayarak konum seçin
          </div>
        </div>
      )}
    </div>
  );
}
