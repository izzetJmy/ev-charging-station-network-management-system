// Vehicle model interfaces
import { Timestamp } from "firebase/firestore";

export interface Location {
  latitude: number;
  longitude: number;
  updatedAt: Timestamp | Date;
}

export interface Vehicle {
  id: string;
  userId?: string;
  ownerName?: string;
  brand: string;
  model: string;
  batteryCapacity: number; // in kWh
  connectorType: string;
  plateNumber: string;
  stationRatings?: Record<string, number>;
  currentLocation?: Location | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
