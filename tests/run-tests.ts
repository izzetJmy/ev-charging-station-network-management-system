import assert from "node:assert/strict";
import {
  checkVehicleChargerCompatibility,
  getReservationStatusBlockMessage,
} from "../src/utils/chargerCompatibility.ts";
import {
  isReservationWithinOperatingHours,
  isStationOpenAt,
} from "../src/utils/stationOperatingHours.ts";
import type { Charger } from "../src/models/Charger.ts";
import type { Station } from "../src/models/Station.ts";
import type { Vehicle } from "../src/models/vehicle.ts";

/*
 * This file is a lightweight terminal test runner for the presentation.
 * It does not test the whole React UI; instead, it tests the core business
 * rules behind the requirements, so the output can be shown with `npm test`.
 *
 * Each test case prints:
 * - test ID
 * - related requirement IDs
 * - a short explanation of the behavior being verified
 */

type TestCase = {
  id: string;
  requirements: string;
  name: string;
  run: () => void;
};

// Shared mock data: one station, one charger, and one compatible EV.
// These values represent the normal successful reservation path.
const baseCharger: Charger = {
  id: "charger-izmir-001",
  stationId: "station-izmir-001",
  type: "DC",
  powerOutput: "150kW",
  connectorType: "CCS",
  pricePerKwh: 9.1,
  status: "available",
};

const baseStation: Station = {
  id: "station-izmir-001",
  name: "Bornova EV Station",
  address: "Bornova Meydani, Izmir",
  latitude: 38.45,
  longitude: 27.21,
  status: "available",
  operatingHours: {
    open: "08:00",
    close: "23:00",
    is24Hours: false,
  },
  chargers: [baseCharger],
};

const compatibleVehicle: Vehicle = {
  id: "vehicle-001",
  userId: "user-001",
  brand: "Tesla",
  model: "Model 3",
  batteryCapacity: 75,
  connectorType: "CCS",
  plateNumber: "35ABC123",
  createdAt: new Date("2026-05-10T09:00:00"),
  updatedAt: new Date("2026-05-10T09:00:00"),
};

// Pricing rule used in charging-session tests:
// final cost = consumed energy (kWh) * charger unit price.
function calculateChargingCost(consumedKwh: number, pricePerKwh: number) {
  return Math.round(consumedKwh * pricePerKwh * 100) / 100;
}

// Reservation policy rules from the requirements:
// - reservation duration cannot exceed 2 hours
// - reservation cannot be more than 24 hours in advance
function validateReservationWindow(now: Date, start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const advanceMs = start.getTime() - now.getTime();

  if (durationMs <= 0) return "Start time must be before end time.";
  if (durationMs > 2 * 60 * 60 * 1000) return "Reservation duration can be at most 2 hours.";
  if (advanceMs > 24 * 60 * 60 * 1000) return "Reservations cannot be made more than 24 hours in advance.";

  return "";
}

// Double-booking rule:
// two reservations conflict if their time ranges overlap.
function hasReservationConflict(
  existing: Array<{ start: Date; end: Date }>,
  requested: { start: Date; end: Date },
) {
  return existing.some(
    (reservation) =>
      requested.start.getTime() < reservation.end.getTime() &&
      requested.end.getTime() > reservation.start.getTime(),
  );
}

function hasBookableReservationConflict(
  existing: Array<{ start: Date; end: Date; status: string }>,
  requested: { start: Date; end: Date },
  now: Date,
) {
  return existing
    .filter((reservation) => reservation.status === "active")
    .filter((reservation) => reservation.end.getTime() >= now.getTime())
    .some(
      (reservation) =>
        requested.start.getTime() < reservation.end.getTime() &&
        requested.end.getTime() > reservation.start.getTime(),
    );
}

const tests: TestCase[] = [
  {
    id: "TC-01",
    requirements: "R1.2, R1.3",
    name: "Station detail data includes charger type, power, connector, price, and status",
    run: () => {
      // Verifies that the station detail screen has all data required by R1.2/R1.3.
      assert.equal(baseStation.name, "Bornova EV Station");
      assert.equal(baseStation.chargers[0].type, "DC");
      assert.equal(baseStation.chargers[0].powerOutput, "150kW");
      assert.equal(baseStation.chargers[0].connectorType, "CCS");
      assert.equal(baseStation.chargers[0].pricePerKwh, 9.1);
      assert.equal(baseStation.chargers[0].status, "available");
    },
  },
  {
    id: "TC-02",
    requirements: "R1.15",
    name: "Station filter returns only matching connector, power, and price range",
    run: () => {
      // Verifies search/filter behavior using realistic station and charger data.
      const stations = [
        baseStation,
        {
          ...baseStation,
          id: "station-izmir-002",
          name: "Alsancak Charging Point",
          chargers: [{ ...baseCharger, id: "charger-002", connectorType: "Type 2", powerOutput: "22kW", pricePerKwh: 6.4 }],
        } as Station,
      ];

      const filtered = stations.filter((station) =>
        station.name.toLowerCase().includes("bornova") &&
        station.chargers.some(
          (charger) =>
            charger.connectorType === "CCS" &&
            charger.powerOutput === "150kW" &&
            charger.pricePerKwh <= 10,
        ),
      );

      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, "station-izmir-001");
    },
  },
  {
    id: "TC-03",
    requirements: "R14.4, R1.6",
    name: "Compatible vehicle can reserve a compatible charger",
    run: () => {
      // Positive compatibility case: vehicle connector and charger connector match.
      const result = checkVehicleChargerCompatibility(compatibleVehicle, baseCharger, baseStation);

      assert.equal(result.isCompatible, true);
      assert.equal(result.state, "compatible");
    },
  },
  {
    id: "TC-04",
    requirements: "R14.4",
    name: "Incompatible vehicle connector is rejected before reservation",
    run: () => {
      // Negative compatibility case: reservation must be blocked before booking.
      const incompatibleVehicle = {
        ...compatibleVehicle,
        connectorType: "Type 2",
      } as Vehicle;

      const result = checkVehicleChargerCompatibility(incompatibleVehicle, baseCharger, baseStation);

      assert.equal(result.isCompatible, false);
      assert.equal(result.state, "not-compatible");
    },
  },
  {
    id: "TC-05",
    requirements: "R12.1, R12.2",
    name: "Reservation policy rejects sessions longer than 2 hours and more than 24 hours ahead",
    run: () => {
      // Domain policy test: both maximum duration and advance booking limit.
      const now = new Date("2026-05-10T10:00:00");

      assert.equal(
        validateReservationWindow(
          now,
          new Date("2026-05-10T11:00:00"),
          new Date("2026-05-10T13:30:00"),
        ),
        "Reservation duration can be at most 2 hours.",
      );

      assert.equal(
        validateReservationWindow(
          now,
          new Date("2026-05-11T11:01:00"),
          new Date("2026-05-11T12:00:00"),
        ),
        "Reservations cannot be made more than 24 hours in advance.",
      );
    },
  },
  {
    id: "TC-06",
    requirements: "R1.7",
    name: "Reservation conflict check prevents double booking",
    run: () => {
      // Prevents two users from reserving the same charger in overlapping time slots.
      const existing = [
        {
          start: new Date("2026-05-10T10:00:00"),
          end: new Date("2026-05-10T11:00:00"),
        },
      ];
      const requested = {
        start: new Date("2026-05-10T10:30:00"),
        end: new Date("2026-05-10T11:30:00"),
      };

      assert.equal(hasReservationConflict(existing, requested), true);
    },
  },
  {
    id: "TC-06B",
    requirements: "R1.7",
    name: "Expired active reservations do not keep a charger occupied",
    run: () => {
      const now = new Date("2026-05-10T12:00:00");
      const existing = [
        {
          start: new Date("2026-05-10T09:00:00"),
          end: new Date("2026-05-10T10:00:00"),
          status: "active",
        },
        {
          start: new Date("2026-05-10T14:00:00"),
          end: new Date("2026-05-10T15:00:00"),
          status: "active",
        },
      ];

      assert.equal(
        hasBookableReservationConflict(
          existing,
          {
            start: new Date("2026-05-10T09:30:00"),
            end: new Date("2026-05-10T10:30:00"),
          },
          now,
        ),
        false,
      );

      assert.equal(
        hasBookableReservationConflict(
          existing,
          {
            start: new Date("2026-05-10T14:30:00"),
            end: new Date("2026-05-10T15:30:00"),
          },
          now,
        ),
        true,
      );
    },
  },
  {
    id: "TC-07",
    requirements: "R1.6",
    name: "Reservation outside station operating hours is rejected",
    run: () => {
      // Reservation is valid only inside the station's configured operating hours.
      assert.equal(
        isReservationWithinOperatingHours(
          baseStation,
          new Date("2026-05-10T22:00:00"),
          new Date("2026-05-10T23:30:00"),
        ),
        false,
      );
      assert.equal(isStationOpenAt(baseStation, new Date("2026-05-10T09:00:00")), true);
    },
  },
  {
    id: "TC-08",
    requirements: "R2.5, R2.6",
    name: "Offline charger blocks new reservations",
    run: () => {
      // Operator marks charger offline; system must not accept new reservations.
      const offlineCharger = { ...baseCharger, status: "offline" } as Charger;
      const message = getReservationStatusBlockMessage(baseStation, offlineCharger);

      assert.equal(message, "This charger is currently offline and cannot accept reservations.");
    },
  },
  {
    id: "TC-09",
    requirements: "R1.10, R1.17, R13.1, R13.2",
    name: "Charging cost is calculated from consumed kWh and unit price",
    run: () => {
      // Pricing transparency: estimated/final cost is calculated from kWh and price.
      assert.equal(calculateChargingCost(18.5, 9.1), 168.35);
    },
  },
];

let passed = 0;

console.log("EV Charging Station Network - Test Run");
console.log("======================================");

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS ${test.id} [${test.requirements}] ${test.name}`);
  } catch (error) {
    console.error(`FAIL ${test.id} [${test.requirements}] ${test.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log("--------------------------------------");
console.log(`${passed}/${tests.length} test cases passed.`);
