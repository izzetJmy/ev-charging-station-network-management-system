import type { Location } from "../../models/vehicle";

export interface UserCoordinates {
  lat: number;
  lng: number;
}

interface DistanceTarget {
  latitude: number;
  longitude: number;
}

export type LocationPermissionState =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "error";

export interface LocationResult {
  coords: UserCoordinates | null;
  currentLocation: Location | null;
  permissionState: LocationPermissionState;
  message: string;
}

export function createCurrentLocation(
  latitude: number,
  longitude: number,
  updatedAt: Date = new Date(),
): Location {
  return {
    latitude,
    longitude,
    updatedAt,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceInKilometers(
  currentLocation: UserCoordinates,
  target: DistanceTarget,
) {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(target.latitude - currentLocation.lat);
  const deltaLongitude = toRadians(target.longitude - currentLocation.lng);
  const startLatitude = toRadians(currentLocation.lat);
  const endLatitude = toRadians(target.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * angularDistance;
}

export function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        coords: null,
        currentLocation: null,
        permissionState: "error",
        message: "Tarayiciniz konum ozelligini desteklemiyor.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = createCurrentLocation(
          position.coords.latitude,
          position.coords.longitude,
        );

        resolve({
          coords: {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          },
          currentLocation,
          permissionState: "granted",
          message: "Konum izni verildi. Harita guncel konumunuza odaklandi.",
        });
      },
      () => {
        resolve({
          coords: null,
          currentLocation: null,
          permissionState: "denied",
          message: "Konum izni verilmeden harita gosterilemez.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
