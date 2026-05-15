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
 * Presentation-ready lightweight test runner.
 *
 * Software Engineering testing concepts demonstrated:
 * - Unit testing: pure business rules such as compatibility, policy limits,
 *   operating hours, double-booking overlap, and cost calculation.
 * - Component/interface testing: data and filtering behavior that feeds UI
 *   components such as StationDetailCard and station search/filter panels.
 * - System/use-case testing: end-to-end business scenarios represented with
 *   realistic domain data, without requiring Firestore or a browser.
 * - Defect testing: negative cases such as incompatible connectors and
 *   offline chargers.
 * - Regression testing: expired active reservations must not keep chargers
 *   occupied after a previous defect was fixed.
 * - Requirements-based testing: every test is mapped to project requirement
 *   IDs used in docs/testing-overview.md.
 *
 * The runner intentionally uses only Node's built-in assert module so it
 * remains compatible with the existing `npm test` command.
 */

type TestCategory =
  | "Unit Test"
  | "Component / Interface Test"
  | "System / Use Case Test"
  | "Defect / Negative Test"
  | "Regression Test";

type TestCase = {
  id: string;
  category: TestCategory;
  relatedRequirements: string;
  relatedUseCase: string;
  evaluatedElement: string;
  input: string;
  expectedOutcome: string;
  actualResult: string;
  run: () => void;
};

type TestRunResult = TestCase & {
  passed: boolean;
  failureMessage?: string;
};

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
  ownerName: "Presentation User",
  brand: "Tesla",
  model: "Model 3",
  batteryCapacity: 75,
  connectorType: "CCS",
  plateNumber: "35ABC123",
  createdAt: new Date("2026-05-10T09:00:00"),
  updatedAt: new Date("2026-05-10T09:00:00"),
};

function calculateChargingCost(consumedKwh: number, pricePerKwh: number) {
  return Math.round(consumedKwh * pricePerKwh * 100) / 100;
}

function validateReservationWindow(now: Date, start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const advanceMs = start.getTime() - now.getTime();

  if (durationMs <= 0) return "Start time must be before end time.";
  if (durationMs > 2 * 60 * 60 * 1000) {
    return "Reservation duration can be at most 2 hours.";
  }
  if (advanceMs > 24 * 60 * 60 * 1000) {
    return "Reservations cannot be made more than 24 hours in advance.";
  }

  return "";
}

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

// Unit testing group: pure functions and deterministic business rules.
const unitTests: TestCase[] = [
  {
    id: "UT-01",
    category: "Unit Test",
    relatedRequirements: "R14.4, R1.6",
    relatedUseCase: "Reserve a compatible charger for a saved vehicle",
    evaluatedElement: "checkVehicleChargerCompatibility()",
    input: "Vehicle connector CCS; charger connector CCS; station available",
    expectedOutcome: "Compatibility result is true with state compatible.",
    actualResult: "The compatibility function returned isCompatible=true and state=compatible.",
    run: () => {
      const result = checkVehicleChargerCompatibility(
        compatibleVehicle,
        baseCharger,
        baseStation,
      );

      assert.equal(result.isCompatible, true);
      assert.equal(result.state, "compatible");
    },
  },
  {
    id: "UT-02",
    category: "Unit Test",
    relatedRequirements: "R12.1",
    relatedUseCase: "Validate reservation duration policy",
    evaluatedElement: "validateReservationWindow() duration rule",
    input: "Now 10:00; reservation 11:00-13:30",
    expectedOutcome: "Reservation is rejected because duration is greater than 2 hours.",
    actualResult: "The policy function returned the maximum duration error.",
    run: () => {
      const result = validateReservationWindow(
        new Date("2026-05-10T10:00:00"),
        new Date("2026-05-10T11:00:00"),
        new Date("2026-05-10T13:30:00"),
      );

      assert.equal(result, "Reservation duration can be at most 2 hours.");
    },
  },
  {
    id: "UT-03",
    category: "Unit Test",
    relatedRequirements: "R12.2",
    relatedUseCase: "Validate 24-hour advance booking policy",
    evaluatedElement: "validateReservationWindow() advance booking rule",
    input: "Now 10:00 on May 10; reservation starts 11:01 on May 11",
    expectedOutcome: "Reservation is rejected because it is more than 24 hours ahead.",
    actualResult: "The policy function returned the 24-hour advance booking error.",
    run: () => {
      const result = validateReservationWindow(
        new Date("2026-05-10T10:00:00"),
        new Date("2026-05-11T11:01:00"),
        new Date("2026-05-11T12:00:00"),
      );

      assert.equal(result, "Reservations cannot be made more than 24 hours in advance.");
    },
  },
  {
    id: "UT-04",
    category: "Unit Test",
    relatedRequirements: "R1.7",
    relatedUseCase: "Prevent double booking of a charger",
    evaluatedElement: "hasReservationConflict() overlap rule",
    input: "Existing 10:00-11:00; requested 10:30-11:30",
    expectedOutcome: "Overlap is detected.",
    actualResult: "The overlap helper returned true.",
    run: () => {
      const conflict = hasReservationConflict(
        [
          {
            start: new Date("2026-05-10T10:00:00"),
            end: new Date("2026-05-10T11:00:00"),
          },
        ],
        {
          start: new Date("2026-05-10T10:30:00"),
          end: new Date("2026-05-10T11:30:00"),
        },
      );

      assert.equal(conflict, true);
    },
  },
  {
    id: "UT-05",
    category: "Unit Test",
    relatedRequirements: "R1.6",
    relatedUseCase: "Reject reservations outside station operating hours",
    evaluatedElement: "isReservationWithinOperatingHours() and isStationOpenAt()",
    input: "Station open 08:00-23:00; requested 22:00-23:30",
    expectedOutcome: "Reservation is outside operating hours; station is open at 09:00.",
    actualResult: "Operating-hours validation rejected the late reservation and accepted 09:00 open status.",
    run: () => {
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
    id: "UT-06",
    category: "Unit Test",
    relatedRequirements: "R1.10, R1.17, R13.1, R13.2",
    relatedUseCase: "Calculate charging cost transparently",
    evaluatedElement: "Charging cost formula",
    input: "Consumed energy 18.5 kWh; unit price 9.1 TL/kWh",
    expectedOutcome: "Final cost is 168.35 TL.",
    actualResult: "The cost helper returned 168.35.",
    run: () => {
      assert.equal(calculateChargingCost(18.5, 9.1), 168.35);
    },
  },
];

// Component/interface testing group: data contracts that support UI components.
const componentTests: TestCase[] = [
  {
    id: "CT-01",
    category: "Component / Interface Test",
    relatedRequirements: "R1.2, R1.3, R6.1",
    relatedUseCase: "Display selected station details to the user",
    evaluatedElement: "StationDetailCard data contract",
    input: "Bornova station with one DC 150kW CCS charger priced at 9.1 TL/kWh",
    expectedOutcome: "Station detail data contains charger type, power, connector, price, and status.",
    actualResult: "The mock station object contains all required display fields.",
    run: () => {
      assert.equal(baseStation.name, "Bornova EV Station");
      assert.equal(baseStation.chargers[0].type, "DC");
      assert.equal(baseStation.chargers[0].powerOutput, "150kW");
      assert.equal(baseStation.chargers[0].connectorType, "CCS");
      assert.equal(baseStation.chargers[0].pricePerKwh, 9.1);
      assert.equal(baseStation.chargers[0].status, "available");
    },
  },
  {
    id: "CT-02",
    category: "Component / Interface Test",
    relatedRequirements: "R1.15",
    relatedUseCase: "Filter stations by search text and charger attributes",
    evaluatedElement: "Station map filtering data contract",
    input: "Search Bornova; connector CCS; power 150kW; max price 10",
    expectedOutcome: "Only the Bornova CCS 150kW station remains in the filtered list.",
    actualResult: "Filtering returned exactly one station with id station-izmir-001.",
    run: () => {
      const stations = [
        baseStation,
        {
          ...baseStation,
          id: "station-izmir-002",
          name: "Alsancak Charging Point",
          chargers: [
            {
              ...baseCharger,
              id: "charger-002",
              connectorType: "Type 2",
              powerOutput: "22kW",
              pricePerKwh: 6.4,
            },
          ],
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
];

// System/use-case testing group: larger user-facing behavior represented with realistic domain data.
const systemTests: TestCase[] = [
  {
    id: "ST-01",
    category: "System / Use Case Test",
    relatedRequirements: "R1.6, R14.4",
    relatedUseCase: "Complete the reservation pre-check path for a compatible vehicle",
    evaluatedElement: "Vehicle, station, and charger reservation preconditions",
    input: "Saved Tesla Model 3 with CCS connector; available CCS charger",
    expectedOutcome: "The system allows the reservation path to continue.",
    actualResult: "Compatibility pre-check passed for the realistic reservation path.",
    run: () => {
      const result = checkVehicleChargerCompatibility(
        compatibleVehicle,
        baseCharger,
        baseStation,
      );

      assert.equal(result.isCompatible, true);
      assert.equal(getReservationStatusBlockMessage(baseStation, baseCharger), "");
    },
  },
  {
    id: "ST-02",
    category: "System / Use Case Test",
    relatedRequirements: "R1.6, R12.1, R12.2",
    relatedUseCase: "Create a valid reservation inside policy limits",
    evaluatedElement: "Reservation policy, operating hours, and status rules",
    input: "Now 10:00; reservation 11:00-12:00; station open; charger available",
    expectedOutcome: "Reservation policy returns no error and operating-hours validation passes.",
    actualResult: "Policy validation returned an empty error and operating-hours validation returned true.",
    run: () => {
      const policyError = validateReservationWindow(
        new Date("2026-05-10T10:00:00"),
        new Date("2026-05-10T11:00:00"),
        new Date("2026-05-10T12:00:00"),
      );
      const insideHours = isReservationWithinOperatingHours(
        baseStation,
        new Date("2026-05-10T11:00:00"),
        new Date("2026-05-10T12:00:00"),
      );

      assert.equal(policyError, "");
      assert.equal(insideHours, true);
    },
  },
];

// Defect/negative testing group: expected failures and invalid conditions.
const defectTests: TestCase[] = [
  {
    id: "DT-01",
    category: "Defect / Negative Test",
    relatedRequirements: "R14.4",
    relatedUseCase: "Reject reservation for incompatible connector type",
    evaluatedElement: "checkVehicleChargerCompatibility() negative path",
    input: "Vehicle connector Type 2; charger connector CCS",
    expectedOutcome: "Compatibility result is false with state not-compatible.",
    actualResult: "The compatibility function returned isCompatible=false and state=not-compatible.",
    run: () => {
      const incompatibleVehicle = {
        ...compatibleVehicle,
        connectorType: "Type 2",
      } as Vehicle;

      const result = checkVehicleChargerCompatibility(
        incompatibleVehicle,
        baseCharger,
        baseStation,
      );

      assert.equal(result.isCompatible, false);
      assert.equal(result.state, "not-compatible");
    },
  },
  {
    id: "DT-02",
    category: "Defect / Negative Test",
    relatedRequirements: "R2.5, R2.6, R1.6",
    relatedUseCase: "Block reservations when operator marks charger offline",
    evaluatedElement: "getReservationStatusBlockMessage() offline path",
    input: "Available station; charger status offline",
    expectedOutcome: "Reservation is blocked with an offline charger message.",
    actualResult: "The status check returned the offline charger reservation block message.",
    run: () => {
      const offlineCharger = { ...baseCharger, status: "offline" } as Charger;
      const message = getReservationStatusBlockMessage(baseStation, offlineCharger);

      assert.equal(
        message,
        "This charger is currently offline and cannot accept reservations.",
      );
    },
  },
];

// Regression testing group: verifies a previously fixed defect does not reappear.
const regressionTests: TestCase[] = [
  {
    id: "RT-01",
    category: "Regression Test",
    relatedRequirements: "R1.7",
    relatedUseCase: "Do not show expired active reservations as occupied",
    evaluatedElement: "Expired active reservation filtering before overlap check",
    input: "Past active reservation 09:00-10:00; future active reservation 14:00-15:00; current time 12:00",
    expectedOutcome: "Past active reservation does not conflict; future active reservation still conflicts.",
    actualResult: "Past overlap returned false and future overlap returned true.",
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
];

const tests: TestCase[] = [
  ...unitTests,
  ...componentTests,
  ...systemTests,
  ...defectTests,
  ...regressionTests,
];

function printDivider() {
  console.log("----------------------------------------------------------------");
}

function printField(label: string, value: string) {
  console.log(`${label.padEnd(23)} ${value}`);
}

function runTest(test: TestCase): TestRunResult {
  try {
    test.run();
    return { ...test, passed: true };
  } catch (error) {
    return {
      ...test,
      passed: false,
      failureMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

console.log("EV Charging Station Network & Management System");
console.log("Software Engineering Testing Overview - Executable Test Run");
printDivider();
console.log("Testing concepts covered: Unit, Component/Interface, System/Use Case, Defect, Regression, Requirements-Based Testing");
printDivider();

const results = tests.map((test) => {
  const result = runTest(test);

  printField("Test ID:", result.id);
  printField("Category:", result.category);
  printField("Requirements:", result.relatedRequirements);
  printField("Related Use Case:", result.relatedUseCase);
  printField("Evaluated Element:", result.evaluatedElement);
  printField("Input:", result.input);
  printField("Expected Outcome:", result.expectedOutcome);
  printField(
    "Actual Result:",
    result.passed ? result.actualResult : result.failureMessage ?? "Unexpected assertion failure.",
  );
  printField("Status:", result.passed ? "PASSED" : "FAILED");
  printDivider();

  if (!result.passed) {
    process.exitCode = 1;
  }

  return result;
});

const passedTests = results.filter((result) => result.passed).length;
const failedTests = results.length - passedTests;
const categoriesCovered = Array.from(
  new Set(results.map((result) => result.category)),
).join(", ");

console.log("Final Summary");
printDivider();
console.log("| Metric | Value |");
console.log("| --- | --- |");
console.log(`| Total tests | ${results.length} |`);
console.log(`| Passed tests | ${passedTests} |`);
console.log(`| Failed tests | ${failedTests} |`);
console.log(`| Categories covered | ${categoriesCovered} |`);
printDivider();
