import { useEffect, useState } from "react";
import { LocateFixed, MapPin, MapPinned } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };
type Point = [number, number];

const defaultCenter: Point = [12.8797, 121.774];
const markerIcon = L.divIcon({
  className: "careerconnect-map-pin",
  html: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function toPoint(latitude: number | null, longitude: number | null): Point | null {
  if (latitude === null
    || longitude === null
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180) {
    return null;
  }
  return [latitude, longitude];
}

function MapClickHandler({ onPin }: { onPin: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      onPin([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function MapFocus({ center, zoom }: { center: Point | null; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.6 });
  }, [center, map, zoom]);

  return null;
}

export default function LocationPinPicker({
  address,
  fallbackAddress,
  latitude,
  longitude,
  onCoordinatesChange,
  onLocateAddress,
}: {
  address: string;
  fallbackAddress: string;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (coordinates: Coordinates | null) => void;
  onLocateAddress: (address: string, fallbackAddress: string) => Promise<Coordinates | null>;
}) {
  const position = toPoint(latitude, longitude);
  const hasPin = position !== null;
  const [mapOpen, setMapOpen] = useState(hasPin);
  const [focus, setFocus] = useState<Point | null>(null);
  const [focusZoom, setFocusZoom] = useState(15);
  const [isFinding, setIsFinding] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const initialCenter = position ?? defaultCenter;

  async function findAddress() {
    if (!address.trim()) {
      setLookupError("Select a workplace address before searching the map.");
      return;
    }

    setIsFinding(true);
    setLookupError(null);
    try {
      const coordinates = await onLocateAddress(address, fallbackAddress);
      const point = coordinates ? toPoint(coordinates.latitude, coordinates.longitude) : null;
      if (!coordinates || !point) {
        setLookupError("We couldn't find this address. You can still pan the map and drop a pin.");
        return;
      }

      onCoordinatesChange(coordinates);
      setFocus(point);
      setFocusZoom(16);
    } catch (caught) {
      setLookupError(caught instanceof Error ? caught.message : "Unable to find this address on the map.");
    } finally {
      setIsFinding(false);
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-[#dce9e7] bg-[#f7fbfa] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e1f3f1] text-[#078b8d]">
            <MapPinned aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#32494b]">Pin the exact workplace</p>
            <p className="mt-0.5 text-[10px] text-[#7b8d8e]">
              {hasPin ? "A map pin is selected for this listing." : "Optional — place a pin so applicants can find you."}
            </p>
          </div>
        </div>
        <button
          aria-expanded={mapOpen}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#c8dfdc] bg-white px-3 text-[10px] font-semibold text-[#087f83] transition hover:border-[#93c7c1] hover:bg-[#f0faf8] focus-visible:outline-2 focus-visible:outline-[#078b8d]"
          onClick={() => setMapOpen((open) => !open)}
          type="button"
        >
          <MapPin aria-hidden="true" className="size-3.5" />
          {mapOpen ? "Hide map" : hasPin ? "Adjust pin" : "Choose on map"}
        </button>
      </div>

      {mapOpen && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <p className="text-[10px] leading-4 text-[#718586]">
              Find your address, then click the map or drag the pin to the workplace entrance.
            </p>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#078b8d] px-2.5 text-[10px] font-semibold text-white transition hover:bg-[#06787a] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isFinding || !address.trim()}
              onClick={() => void findAddress()}
              type="button"
            >
              <LocateFixed aria-hidden="true" className={`size-3.5 ${isFinding ? "animate-pulse" : ""}`} />
              {isFinding ? "Finding address…" : "Find address"}
            </button>
          </div>

          {lookupError && (
            <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800" role="status">
              {lookupError}
            </p>
          )}

          <div className="h-[280px] overflow-hidden rounded-lg border border-[#dcebea] max-[680px]:h-[230px]">
            <MapContainer
              center={initialCenter}
              zoom={hasPin ? 15 : 6}
              scrollWheelZoom
              className="h-full w-full"
            >
              <MapFocus center={focus} zoom={focusZoom} />
              <MapClickHandler onPin={(point) => onCoordinatesChange({ latitude: point[0], longitude: point[1] })} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {position && (
                <Marker
                  draggable
                  eventHandlers={{
                    dragend(event) {
                      const marker = event.target as L.Marker;
                      const point = marker.getLatLng();
                      onCoordinatesChange({ latitude: point.lat, longitude: point.lng });
                    },
                  }}
                  icon={markerIcon}
                  position={position}
                />
              )}
            </MapContainer>
          </div>
          <div className="mt-2 flex min-h-5 items-center justify-between gap-2 text-[10px] text-[#748687]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3 text-[#078b8d]" />
              {position
                ? `Pinned: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                : "Click the map to place a pin."}
            </span>
            {hasPin && <span className="font-medium text-[#16816f]">Will save with listing</span>}
          </div>
        </div>
      )}
    </section>
  );
}
