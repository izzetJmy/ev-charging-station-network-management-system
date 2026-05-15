# Testing Presentation Test Cases

This table summarizes the executable presentation tests in `tests/run-tests.ts`. The same cases run with:

```bash
npm test
```

| Test ID | Test Type | Related Requirement | Related Use Case | Evaluated Element | Input | Expected Outcome | Actual Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UT-01 | Unit Test | R14.4, R1.6 | Reserve a compatible charger for a saved vehicle | `checkVehicleChargerCompatibility()` | Vehicle connector CCS; charger connector CCS; station available | Compatibility result is true with state compatible. | The compatibility function returned `isCompatible=true` and `state=compatible`. |
| UT-02 | Unit Test | R12.1 | Validate reservation duration policy | `validateReservationWindow()` duration rule | Now 10:00; reservation 11:00-13:30 | Reservation is rejected because duration is greater than 2 hours. | The policy function returned the maximum duration error. |
| UT-03 | Unit Test | R12.2 | Validate 24-hour advance booking policy | `validateReservationWindow()` advance booking rule | Now 10:00 on May 10; reservation starts 11:01 on May 11 | Reservation is rejected because it is more than 24 hours ahead. | The policy function returned the 24-hour advance booking error. |
| UT-04 | Unit Test | R1.7 | Prevent double booking of a charger | `hasReservationConflict()` overlap rule | Existing 10:00-11:00; requested 10:30-11:30 | Overlap is detected. | The overlap helper returned true. |
| UT-05 | Unit Test | R1.6 | Reject reservations outside station operating hours | `isReservationWithinOperatingHours()` and `isStationOpenAt()` | Station open 08:00-23:00; requested 22:00-23:30 | Reservation is outside operating hours; station is open at 09:00. | Operating-hours validation rejected the late reservation and accepted 09:00 open status. |
| UT-06 | Unit Test | R1.10, R1.17, R13.1, R13.2 | Calculate charging cost transparently | Charging cost formula | Consumed energy 18.5 kWh; unit price 9.1 TL/kWh | Final cost is 168.35 TL. | The cost helper returned 168.35. |
| CT-01 | Component / Interface Test | R1.2, R1.3, R6.1 | Display selected station details to the user | StationDetailCard data contract | Bornova station with one DC 150kW CCS charger priced at 9.1 TL/kWh | Station detail data contains charger type, power, connector, price, and status. | The mock station object contains all required display fields. |
| CT-02 | Component / Interface Test | R1.15 | Filter stations by search text and charger attributes | Station map filtering data contract | Search Bornova; connector CCS; power 150kW; max price 10 | Only the Bornova CCS 150kW station remains in the filtered list. | Filtering returned exactly one station with id `station-izmir-001`. |
| ST-01 | System / Use Case Test | R1.6, R14.4 | Complete the reservation pre-check path for a compatible vehicle | Vehicle, station, and charger reservation preconditions | Saved Tesla Model 3 with CCS connector; available CCS charger | The system allows the reservation path to continue. | Compatibility pre-check passed for the realistic reservation path. |
| ST-02 | System / Use Case Test | R1.6, R12.1, R12.2 | Create a valid reservation inside policy limits | Reservation policy, operating hours, and status rules | Now 10:00; reservation 11:00-12:00; station open; charger available | Reservation policy returns no error and operating-hours validation passes. | Policy validation returned an empty error and operating-hours validation returned true. |
| DT-01 | Defect / Negative Test | R14.4 | Reject reservation for incompatible connector type | `checkVehicleChargerCompatibility()` negative path | Vehicle connector Type 2; charger connector CCS | Compatibility result is false with state not-compatible. | The compatibility function returned `isCompatible=false` and `state=not-compatible`. |
| DT-02 | Defect / Negative Test | R2.5, R2.6, R1.6 | Block reservations when operator marks charger offline | `getReservationStatusBlockMessage()` offline path | Available station; charger status offline | Reservation is blocked with an offline charger message. | The status check returned the offline charger reservation block message. |
| RT-01 | Regression Test | R1.7 | Do not show expired active reservations as occupied | Expired active reservation filtering before overlap check | Past active reservation 09:00-10:00; future active reservation 14:00-15:00; current time 12:00 | Past active reservation does not conflict; future active reservation still conflicts. | Past overlap returned false and future overlap returned true. |
