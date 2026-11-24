import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapResizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export default function JobLocationMap({
  latitude,
  longitude,
  address,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address: string;
}) {
  if (
    latitude === null
    || latitude === undefined
    || longitude === null
    || longitude === undefined
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return (
      <div className="grid h-[280px] place-items-center rounded-xl bg-[#f3f7f6] px-4 text-center text-sm text-[#718184] max-[680px]:h-[230px]">
        Map location is unavailable.
      </div>
    );
  }

  const center: [number, number] = [latitude, longitude];
  const markerLabel = address.trim() || "Job location";

  return (
    <div className="h-[280px] overflow-hidden rounded-xl border border-[#dcebea] max-[680px]:h-[230px]">
      <MapContainer
        key={`${center[0]}:${center[1]}`}
        center={center}
        zoom={15}
        zoomControl
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <MapResizeInvalidator />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={markerIcon}>
          <Popup>{markerLabel}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
