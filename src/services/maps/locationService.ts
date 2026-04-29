export interface UserCoordinates {
  lat: number;
  lng: number;
}

export type LocationPermissionState =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "error";

export interface LocationResult {
  coords: UserCoordinates | null;
  permissionState: LocationPermissionState;
  message: string;
}

export function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        coords: null,
        permissionState: "error",
        message: "Tarayiciniz konum ozelligini desteklemiyor.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          permissionState: "granted",
          message: "Konum izni verildi. Harita guncel konumunuza odaklandi.",
        });
      },
      () => {
        resolve({
          coords: null,
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
