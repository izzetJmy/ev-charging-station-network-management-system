import type { Charger } from "./Charger";

export type StationStatus = "available" | "occupied" | "offline";

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  chargers: Charger[];
}
