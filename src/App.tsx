import { BrowserRouter, Route, Routes } from "react-router-dom";
import VehicleProfileScreen from "./screens/user/VehicleProfileScreen";
import VehicleRegistrationScreen from "./screens/user/VehicleRegistrationScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VehicleProfileScreen />} />
        <Route path="/register-vehicle" element={<VehicleRegistrationScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
