import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2 } from "lucide-react";

export interface PickedLocation {
  lat: number;
  lng: number;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Default center: Banswara, Rajasthan.
const DEFAULT_CENTER: [number, number] = [23.5461, 74.4349];

// A simple pin marker via divIcon (avoids Leaflet's bundler image issues).
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:30px;line-height:1">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

async function reverseGeocode(lat: number, lng: number): Promise<Partial<PickedLocation>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const a = data.address ?? {};
    const street = [a.house_number, a.road, a.neighbourhood, a.suburb].filter(Boolean).join(", ");
    return {
      street: street || data.display_name?.split(",").slice(0, 2).join(",") || undefined,
      city: a.city || a.town || a.village || a.county || undefined,
      state: a.state || undefined,
      pincode: a.postcode || undefined,
    };
  } catch {
    return {};
  }
}

export function MapPicker({
  value,
  onChange,
  height = 240,
}: {
  value?: { lat: number; lng: number } | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [locating, setLocating] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function emit(lat: number, lng: number) {
    const addr = await reverseGeocode(lat, lng);
    onChangeRef.current({ lat, lng, ...addr });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView(start, value ? 16 : 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(start, { draggable: true, icon: pinIcon }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      void emit(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      void emit(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    // Leaflet needs a size recalculation once the container is laid out.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
        markerRef.current?.setLatLng([latitude, longitude]);
        void emit(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0 z-0" />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute top-2 right-2 z-[400] gap-1 shadow-md bg-white text-foreground hover:bg-white/90"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Use my location
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Drag the pin or tap the map to set your exact delivery spot.</p>
    </div>
  );
}
