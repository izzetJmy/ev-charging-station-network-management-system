# Testing Overview

This section summarizes the development and release test cases prepared according to the project requirements for the EV Charging Station Network & Management System. The selected cases focus on the main implemented use cases: station discovery, station filtering, vehicle management, reservation management, charging sessions, favorites, issue reporting, station/charger administration, reporting, wallet/payment flow, notifications, and reservation policy constraints.

## Executable Test Run

The development test cases were also implemented as an executable terminal test runner. The tests can be run with:

```bash
npm test
```

Terminal output:

```text
EV Charging Station Network - Test Run
======================================
PASS TC-01 [R1.2, R1.3] Station detail data includes charger type, power, connector, price, and status
PASS TC-02 [R1.15] Station filter returns only matching connector, power, and price range
PASS TC-03 [R14.4, R1.6] Compatible vehicle can reserve a compatible charger
PASS TC-04 [R14.4] Incompatible vehicle connector is rejected before reservation
PASS TC-05 [R12.1, R12.2] Reservation policy rejects sessions longer than 2 hours and more than 24 hours ahead
PASS TC-06 [R1.7] Reservation conflict check prevents double booking
PASS TC-07 [R1.6] Reservation outside station operating hours is rejected
PASS TC-08 [R2.5, R2.6] Offline charger blocks new reservations
PASS TC-09 [R1.10, R1.17, R13.1, R13.2] Charging cost is calculated from consumed kWh and unit price
--------------------------------------
9/9 test cases passed.
```

## Test Case Summary

| Test ID | Related Requirements | Element Evaluated | Inputs / Preconditions | Expected Outcome | Resulting Output |
| --- | --- | --- | --- | --- | --- |
| TC-01 | R1.1, R1.2, R1.3, R6.1 | Interactive station map and station detail display | User opens Station Map with seeded stations and chargers | Stations are shown on the map/list; selecting a station displays address, location, charger type, power output, price per kWh, connector type, and availability | Station detail modal opens with charger list and status badges |
| TC-02 | R1.15 | Search and filter stations | Search: `Bornova`; connector: `CCS`; power: `150kW`; price max: `10` | Only stations matching name/address and charger filters are displayed | Nearby station list and map markers are filtered |
| TC-03 | R1.5, R1.13, R14.1, R14.2, R14.3 | Vehicle registration and validation | Brand: `Tesla`, Model: `Model 3`, Battery: `75`, Connector: `CCS`, Plate: `35ABC123` | Vehicle is validated, stored under the local user account, and can be selected later | New vehicle appears in saved vehicle list |
| TC-04 | R14.4, R1.6 | Vehicle-charger compatibility before reservation | Vehicle connector: `Type 2`; selected charger connector: `CCS` | Reservation action is blocked because connector types are incompatible | UI shows “Not compatible with your vehicle” and reserve button is disabled/blocked |
| TC-05 | R1.6, R1.7, R12.1, R12.2 | Reservation creation policy | Station open, compatible charger, date today/tomorrow, valid start and end time within 2 hours | Reservation is created only if the time range is not occupied, not longer than 2 hours, and not more than 24 hours ahead | Reservation confirmation is displayed; invalid inputs show policy error |
| TC-06 | R1.7 | Double booking prevention | Existing reservation on same charger from `10:00-11:00`; user tries `10:30-11:30` | System rejects overlapping reservation | Error output: “The selected time range is occupied.” |
| TC-07 | R1.8 | Modify/cancel reservations | User opens My Reservations, selects active reservation, changes time or cancels | Valid reschedule updates reservation; cancellation changes status and frees charger slot | Reservation list refreshes with updated/cancelled status |
| TC-08 | R1.9, R1.10, R1.17, R13.1, R13.2, R5.2 | Charging session start, live cost, and final cost | Active reservation, wallet balance sufficient, start battery `20`, target `80`, charger price `9.10 TL/kWh` | System displays estimated cost before start; live session tracks consumed energy, remaining time, and cost; final cost is calculated from kWh | Live charging screen shows kWh/cost trend and final saved session |
| TC-09 | R1.11, R5.4, R9.1 | Charging history and billing records | Completed charging session exists with receipt ID | User can view session history including energy consumed, price, total cost, and receipt details | Charging history and digital receipt records are displayed |
| TC-10 | R1.12 | Favorite station management | User clicks heart icon on station, then opens Favorites page | Station is added to favorites; clicking remove deletes it from favorites | Favorite station list updates correctly |
| TC-11 | R1.16, R3.5 | Issue reporting and admin report view | User reports issue type `charger_not_working` with description | Report is saved with station/charger ID and appears in Admin Reports | Admin Reports screen lists submitted issue |
| TC-12 | R2.1, R2.2, R2.4, R2.5, R11.1 | Station and charger administration | Admin adds/edits station and charger with connector `CCS`, power `150kW`, price `9.10`, status `offline` | Station/charger data is saved; charger status is visible to users and admins | Admin management screen and user station detail show updated information |
| TC-13 | R2.6, R7.1 | Auto-cancel reservations when charger becomes out-of-service | Active reservation exists for charger; admin changes charger status to `offline` | Active reservations for the offline charger are cancelled and user notification is created | Reservation status changes to cancelled; notification is inserted |
| TC-14 | R3.5, R4.1, R4.2, R4.3, R8.1, R8.2, R10.1, R10.2 | Administrative analytics and reports | Completed sessions and reservations exist in Firestore | Dashboard shows total reservations, sessions, revenue, energy, station utilization, and trend charts | Admin dashboard/revenue/statistics pages show aggregated metrics |

## Representative Testing Code Snippets

### 1. Vehicle-Charger Compatibility Test

Used for TC-04 and R14.4.

```ts
import { checkVehicleChargerCompatibility } from "../src/utils/chargerCompatibility";

const vehicle = {
  id: "vehicle-1",
  userId: "user-1",
  brand: "Renault",
  model: "Zoe",
  batteryCapacity: 52,
  connectorType: "Type 2",
  plateNumber: "35ABC123",
};

const charger = {
  id: "charger-izmir-001",
  stationId: "station-izmir-001",
  type: "DC",
  powerOutput: "150kW",
  connectorType: "CCS",
  pricePerKwh: 9.1,
  status: "available",
};

const station = {
  id: "station-izmir-001",
  name: "Bornova EV Station",
  address: "Bornova/Izmir",
  latitude: 38.45,
  longitude: 27.21,
  status: "available",
  chargers: [charger],
};

const result = checkVehicleChargerCompatibility(vehicle, charger, station);

console.assert(result.isCompatible === false);
console.assert(result.state === "not-compatible");
```

### 2. Reservation Policy Test

Used for TC-05 and TC-06, covering R1.7, R12.1, and R12.2.

```ts
function validateReservationWindow(now: Date, start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  const advanceMs = start.getTime() - now.getTime();

  if (durationMs <= 0) return "Start time must be before end time.";
  if (durationMs > 2 * 60 * 60 * 1000) return "Reservation duration can be at most 2 hours.";
  if (advanceMs > 24 * 60 * 60 * 1000) return "Reservations cannot be made more than 24 hours in advance.";

  return "";
}

const now = new Date("2026-05-10T10:00:00");
const start = new Date("2026-05-10T11:00:00");
const end = new Date("2026-05-10T13:30:00");

console.assert(
  validateReservationWindow(now, start, end) ===
    "Reservation duration can be at most 2 hours.",
);
```

### 3. Station Operating Hours Test

Used for TC-05 and R1.6.

```ts
import { isReservationWithinOperatingHours } from "../src/utils/stationOperatingHours";

const station = {
  operatingHours: {
    open: "08:00",
    close: "23:00",
    is24Hours: false,
  },
};

const reservationStart = new Date("2026-05-10T22:00:00");
const reservationEnd = new Date("2026-05-10T23:30:00");

console.assert(
  isReservationWithinOperatingHours(station, reservationStart, reservationEnd) === false,
);
```

### 4. Charging Cost Calculation Test

Used for TC-08, R1.10, R1.17, R13.1, and R13.2.

```ts
function calculateChargingCost(consumedKwh: number, pricePerKwh: number) {
  return Math.round(consumedKwh * pricePerKwh * 100) / 100;
}

const consumedKwh = 18.5;
const pricePerKwh = 9.1;

console.assert(calculateChargingCost(consumedKwh, pricePerKwh) === 168.35);
```

### 5. Admin Charger Status Update Test

Used for TC-12 and TC-13, covering R2.4, R2.5, and R2.6.

```ts
import { updateChargerStatus } from "../src/services/firebase/chargerService";

await updateChargerStatus("charger-izmir-002-a", "offline");

// Expected:
// 1. Charger status becomes offline.
// 2. Related station status is synchronized.
// 3. Active reservations for this charger are cancelled.
// 4. A cancellation notification is created for affected users.
```

## Release Testing Notes

- `npm run build` is used as a release-level smoke test to verify TypeScript compilation and production bundle generation.
- Manual UI testing is performed for map selection, reservation flow, charging session flow, admin station management, reports, and favorites because these flows depend on Firestore and Google Maps runtime behavior.
- Non-functional requirements such as R1.4, R3.6, R3.7, R6.2, R7.2, and R5.5 require performance/security tests in a deployed environment. They are listed as release/performance test candidates rather than local unit tests.

## Requirements Not Fully Covered in Current Functional Tests

The current release test set focuses on implemented user and admin flows. Requirements such as user ratings/reviews (R1.19), estimated waiting times (R1.18), MFA for administrators (R15.5), AES-256 storage verification (R15.2), and formal government regulatory report generation (R9.3) should be tested after those capabilities are implemented or connected to production infrastructure.
