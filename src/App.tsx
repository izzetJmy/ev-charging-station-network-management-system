import { BrowserRouter, Route, Routes } from "react-router-dom";
import StationMapScreen from "./screens/user/StationMapScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StationMapScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
