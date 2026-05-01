import type { CSSProperties } from "react";
import type { Libraries } from "@react-google-maps/api";
import type { StationStatus } from "../models/station";

export const DEFAULT_MAP_CENTER = {
  lat: 38.423734,
  lng: 27.142826,
};

export const DEFAULT_MAP_ZOOM = 13;
export const FOCUSED_MAP_ZOOM = 15;
export const GOOGLE_MAPS_LIBRARIES: Libraries = [];

export const MAP_CONTAINER_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
};

export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
};

export const STATION_STATUS_COLORS: Record<StationStatus, string> = {
  available: "#2C9B52",
  occupied: "#D7A928",
  offline: "#C94A3B",
};

export const USER_MARKER_COLOR = "#2F6FED";
