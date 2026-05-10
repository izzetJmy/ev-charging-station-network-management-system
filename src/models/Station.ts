import type { Charger } from "./Charger";

export type StationStatus = "available" | "occupied" | "offline";

export interface OperatingHours {
  open: string;
  close: string;
  is24Hours: boolean;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  operatingHours?: OperatingHours;
  manualOffline?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  chargers: Charger[];
}
