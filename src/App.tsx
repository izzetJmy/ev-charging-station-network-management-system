import { BrowserRouter, Route, Routes } from "react-router-dom";
import StationMapScreen from "./screens/user/StationMapScreen";
import VehicleHomeScreen from "./screens/user/VehicleHomeScreen";
import VehicleProfileScreen from "./screens/user/VehicleProfileScreen";
import VehicleRegistrationScreen from "./screens/user/VehicleRegistrationScreen";
import ReservationScreen from "./screens/user/ReservationScreen";
import UserReservationsScreen from "./screens/user/UserReservationsScreen";
import ChargingSessionScreen from "./screens/user/ChargingSessionScreen";
import ChargingHistoryScreen from "./screens/user/ChargingHistoryScreen";
import FavoritesScreen from "./screens/user/FavoritesScreen";
import LandingPageScreen from "./screens/LandingPageScreen";
import AboutScreen from "./screens/AboutScreen";
import ContactScreen from "./screens/ContactScreen";
import AdminLoginScreen from "./screens/admin/AdminLoginScreen";
import SnackbarHost from "./components/SnackbarHost";
import ActiveSessionCard from "./components/ActiveSessionCard";
import NotificationCenter from "./components/NotificationCenter";
import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./screens/admin/AdminLayout";
import AdminDashboardScreen from "./screens/admin/AdminDashboardScreen";
import RevenueReportScreen from "./screens/admin/RevenueReportScreen";
import StationStatisticsScreen from "./screens/admin/StationStatisticsScreen";
import AdminReportsScreen from "./screens/admin/AdminReportsScreen";
import StationChargerManagementScreen from "./screens/admin/StationChargerManagementScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPageScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/contact" element={<ContactScreen />} />
        <Route path="/app" element={<VehicleHomeScreen />} />
        <Route path="/vehicles/new" element={<VehicleRegistrationScreen />} />
        <Route path="/vehicles/:vehicleId/edit" element={<VehicleProfileScreen />} />
        <Route path="/register-vehicle" element={<VehicleRegistrationScreen />} />
        <Route path="/station-map" element={<StationMapScreen />} />
        <Route path="/reservation" element={<ReservationScreen />} />
        <Route path="/my-reservations" element={<UserReservationsScreen />} />
        <Route path="/charging-session" element={<ChargingSessionScreen />} />
        <Route path="/charging-history" element={<ChargingHistoryScreen />} />
        <Route path="/favorites" element={<FavoritesScreen />} />
        <Route path="/admin" element={<AdminLoginScreen />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardScreen />} />
            <Route path="/admin/reports" element={<AdminReportsScreen />} />
            <Route path="/admin/revenue" element={<RevenueReportScreen />} />
            <Route path="/admin/stations" element={<StationStatisticsScreen />} />
            <Route path="/admin/manage" element={<StationChargerManagementScreen />} />
          </Route>
        </Route>
      </Routes>
      <NotificationCenter />
      <SnackbarHost />
      <ActiveSessionCard />
    </BrowserRouter>
  );
}

export default App;
