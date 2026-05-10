import type { Charger } from "../models/Charger";
import type { Station } from "../models/Station";
import type { Vehicle } from "../models/vehicle";

export type ChargerCompatibilityState =
  | "compatible"
  | "not-compatible"
  | "offline"
  | "occupied";

export interface ChargerCompatibilityResult {
  isCompatible: boolean;
  state: ChargerCompatibilityState;
  reason: string;
}

export function getChargerStatusBlockMessage(
  station: Station,
  charger: Charger,
) {
  if (station.status === "offline") {
    return "This station is currently unavailable.";
  }

  if (charger.status === "occupied") {
    return "This charger is currently in use.";
  }

  if (charger.status === "offline") {
    return "This charger is currently offline.";
  }

  return "";
}

export function getReservationStatusBlockMessage(
  station: Station,
  charger: Charger,
) {
  if (station.status === "offline" || charger.status === "offline") {
    return "This station is currently unavailable.";
  }

  return "";
}

export function canUseChargerForCharging(station: Station, charger: Charger) {
  return !getChargerStatusBlockMessage(station, charger);
}

export function checkVehicleChargerCompatibility(
  vehicle: Vehicle | null,
  charger: Charger,
  station: Station,
): ChargerCompatibilityResult {
  if (!vehicle) {
    return {
      isCompatible: false,
      state: "not-compatible",
      reason: "Not compatible with your vehicle",
    };
  }

  if (station.status === "offline" || charger.status === "offline") {
    return {
      isCompatible: false,
      state: "offline",
      reason: getChargerStatusBlockMessage(station, charger),
    };
  }

  if (vehicle.connectorType !== charger.connectorType) {
    return {
      isCompatible: false,
      state: "not-compatible",
      reason: "Not compatible with your vehicle",
    };
  }

  return {
    isCompatible: true,
    state: "compatible",
    reason: "Compatible",
  };
}
