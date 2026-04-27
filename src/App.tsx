import { useEffect } from "react";
import {
  getVehicles,
  getStations,
  getChargers,
  getReservations,
  getChargingSessions,
  getAdminReports,
} from "./services/firebase/userService";

function App() {
  useEffect(() => {
    const init = async () => {
      // Get and log data
      const vehicles = await getVehicles();
      console.log("Vehicles:", vehicles);

      const stations = await getStations();
      console.log("Stations:", stations);

      const chargers = await getChargers();
      console.log("Chargers:", chargers);

      const reservations = await getReservations();
      console.log("Reservations:", reservations);

      const chargingSessions = await getChargingSessions();
      console.log("ChargingSessions:", chargingSessions);

      const adminReports = await getAdminReports();
      console.log("AdminReports:", adminReports);
    };

    init();
  }, []);

  return <div>EV Charging App</div>;
}

export default App;
