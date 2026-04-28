// Vehicle model interfaces
import { Timestamp } from "firebase/firestore";

export interface Location {
  latitude: number;
  longitude: number;
  updatedAt: Timestamp | Date;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  batteryCapacity: number; // in kWh
  connectorType: string;
  plateNumber: string;
  currentLocation?: Location | null; // Optional, can be null if location permission not granted
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
