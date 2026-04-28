export type ChargerType = "AC" | "DC";

export type ChargerPowerOutput = "22kW" | "50kW" | "150kW";

export type ChargerConnectorType = "Type 2" | "CCS" | "CHAdeMO";

export type ChargerStatus = "available" | "occupied" | "offline";

export interface Charger {
  id: string;
  stationId: string;
  type: ChargerType;
  powerOutput: ChargerPowerOutput;
  connectorType: ChargerConnectorType;
  pricePerKwh: number;
  status: ChargerStatus;
}
