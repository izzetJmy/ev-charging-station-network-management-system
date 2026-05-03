import { BrowserRouter, Route, Routes } from "react-router-dom";
import StationMapScreen from "./screens/user/StationMapScreen";
import VehicleProfileScreen from "./screens/user/VehicleProfileScreen";
import VehicleRegistrationScreen from "./screens/user/VehicleRegistrationScreen";
import ReservationScreen from "./screens/user/ReservationScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VehicleProfileScreen />} />
        <Route
          path="/register-vehicle"
          element={<VehicleRegistrationScreen />}
        />
        <Route path="/station-map" element={<StationMapScreen />} />
        <Route path="/reservation" element={<ReservationScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
