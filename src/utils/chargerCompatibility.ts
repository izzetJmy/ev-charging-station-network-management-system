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
      reason: "Offline",
    };
  }

  if (charger.status === "occupied") {
    return {
      isCompatible: false,
      state: "occupied",
      reason: "Occupied",
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
