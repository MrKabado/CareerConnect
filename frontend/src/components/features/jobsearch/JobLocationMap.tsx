import { useEffect, useState } from "react";
import L from "leaflet";
import { LoaderCircle } from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "careerconnect-map-pin",
  html: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

type MapCoordinates = { latitude: number; longitude: number };
type CoordinatesInput = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

function hasCoordinates(value: CoordinatesInput): value is MapCoordinates {
  return typeof value.latitude === "number"
    && typeof value.longitude === "number"
    && Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && value.longitude >= -180
    && value.longitude <= 180;
}

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
  resolveCoordinates,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address: string;
  resolveCoordinates?: () => Promise<CoordinatesInput | null>;
}) {
  const [lookupResult, setLookupResult] = useState<{
    key: string;
    coordinates?: MapCoordinates;
    error?: string;
  } | null>(null);
  const lookupKey = `${address}:${latitude ?? ""}:${longitude ?? ""}`;

  useEffect(() => {
    if (hasCoordinates({ latitude, longitude }) || !resolveCoordinates) return;

    let active = true;
    void resolveCoordinates()
      .then((coordinates) => {
        if (!active) return;
        if (coordinates && hasCoordinates(coordinates)) {
          setLookupResult({ key: lookupKey, coordinates });
        } else {
          setLookupResult({ key: lookupKey, error: "No map coordinates could be found for this location." });
        }
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setLookupResult({
          key: lookupKey,
          error: caught instanceof Error ? caught.message : "Unable to look up this map location.",
        });
      });

    return () => {
      active = false;
    };
  }, [address, latitude, longitude, lookupKey, resolveCoordinates]);

  const initialCoordinates = { latitude, longitude };
  const coordinates = hasCoordinates(initialCoordinates)
    ? initialCoordinates
    : lookupResult?.key === lookupKey
      ? lookupResult.coordinates ?? null
      : null;

  if (!coordinates) {
    const isLookingUp = Boolean(resolveCoordinates && lookupResult?.key !== lookupKey);
    const message = isLookingUp
      ? "Looking up this location…"
      : lookupResult?.key === lookupKey && lookupResult.error
        ? lookupResult.error
        : "No coordinates are available for this location.";

    return (
      <div
        className="grid h-[280px] place-items-center rounded-xl bg-[#f3f7f6] px-4 text-center text-sm text-[#718184] max-[680px]:h-[230px]"
        role={isLookingUp ? "status" : undefined}
        aria-live={isLookingUp ? "polite" : undefined}
      >
        <span className="flex items-center gap-2">
          {isLookingUp && (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 shrink-0 text-brand-600 motion-safe:animate-spin motion-reduce:animate-none"
            />
          )}
          {message}
        </span>
      </div>
    );
  }

  const center: [number, number] = [coordinates.latitude, coordinates.longitude];
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
