import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io, type Socket } from "socket.io-client";
import { authStore } from "@/lib/auth-store";

// Store/dispatch origin (Banswara). In production this would come from settings.
const STORE_LOCATION: [number, number] = [23.5461, 74.4349];
const SOCKET_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function dot(emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch {
    return null;
  }
}

export function LiveOrderMap({
  orderId,
  address,
  initialRider,
  height = 280,
}: {
  orderId: number;
  address: string;
  initialRider?: { lat: number; lng: number } | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const [hasRider, setHasRider] = useState(!!initialRider);

  // Init map with store + destination markers.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(STORE_LOCATION, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    L.marker(STORE_LOCATION, { icon: dot("🏪") }).addTo(map).bindPopup("Store");

    const bounds: L.LatLngExpression[] = [STORE_LOCATION];

    if (initialRider) {
      riderMarkerRef.current = L.marker([initialRider.lat, initialRider.lng], { icon: dot("🛵") })
        .addTo(map).bindPopup("Your order");
      bounds.push([initialRider.lat, initialRider.lng]);
    }

    // Forward-geocode the delivery address to place the destination pin.
    void geocodeAddress(address).then((dest) => {
      if (dest && mapRef.current) {
        L.marker(dest, { icon: dot("🏠") }).addTo(mapRef.current).bindPopup("Delivery address");
        mapRef.current.fitBounds([...bounds, dest] as L.LatLngBoundsExpression, { padding: [40, 40] });
      } else if (mapRef.current) {
        mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
      }
    });

    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; riderMarkerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live rider updates over Socket.io.
  useEffect(() => {
    const token = authStore.getToken();
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("order_location", (data: { orderId: number; lat: number; lng: number }) => {
      if (data.orderId !== orderId || !mapRef.current) return;
      setHasRider(true);
      const pos: [number, number] = [data.lat, data.lng];
      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng(pos);
      } else {
        riderMarkerRef.current = L.marker(pos, { icon: dot("🛵") }).addTo(mapRef.current).bindPopup("Your order");
      }
      mapRef.current.panTo(pos);
    });
    return () => { socket.disconnect(); };
  }, [orderId]);

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
      {!hasRider && (
        <p className="text-xs text-muted-foreground text-center">
          🛵 Live location will appear here once your rider is on the way.
        </p>
      )}
    </div>
  );
}
