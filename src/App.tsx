import { BrowserRouter, Routes, Route } from "react-router-dom";
import VehicleRegistrationScreen from "./screens/user/VehicleRegistrationScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VehicleRegistrationScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
