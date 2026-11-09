import { Route, Routes } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import RoleMainPage from "../pages/Role/RoleMainPage";
import OfficeMainPage from "../pages/Office/OfficeMainPage";
import VenueMainPage from "../pages/Venue/VenueMainPage";
import EventMainPage from "../pages/Event/EventMainPage";
import EventBookingMainPage from "../pages/EventBooking/EventBookingMainPage";
import ScheduleCalendarPage from "../pages/Calendar/ScheduleCalendarPage";
import VehicleBookingMainPage from "../pages/VehicleBooking/VehicleBookingMainPage";
import VehicleMainPage from "../pages/Vehicle/VehicleMainPage";
import DriverMainPage from "../pages/Driver/DriverMainPage";
import TrashBinMainPage from "../pages/TrashBin/TrashBinMainPage";
import UserMainPage from "../pages/User/UserMainPage";
import LoginPage from "../pages/Login/LoginPage";
import PlaceholderPage from "../pages/Placeholder/PlaceholderPage";
import DashboardMainPage from "../pages/Dashboard/DashboardMainPage";
import EventReportsPage from "../pages/Reports/EventReportsPage";
import VehicleReportsPage from "../pages/Reports/VehicleReportsPage";
import ReportsHubPage from "../pages/Reports/ReportsHubPage";
import RequirePermission from "./RequirePermission";
import { GuestRoute, RequireAuth } from "./RequireAuth";

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route element={<RequirePermission />}>
            <Route path="/" element={<DashboardMainPage />} />
            <Route path="/calendar" element={<ScheduleCalendarPage />} />
            <Route path="/profile" element={<PlaceholderPage />} />

            <Route path="/roles" element={<RoleMainPage />} />
            <Route path="/offices" element={<OfficeMainPage />} />
            <Route path="/users" element={<UserMainPage />} />

            <Route path="/venues" element={<VenueMainPage />} />
            <Route path="/events" element={<EventMainPage />} />

            <Route path="/vehicles" element={<VehicleMainPage />} />
            <Route path="/vehicle-list" element={<VehicleMainPage />} />
            <Route path="/drivers" element={<DriverMainPage />} />

            <Route path="/event-bookings" element={<EventBookingMainPage />} />
            <Route path="/vehicle-bookings" element={<VehicleBookingMainPage />} />

            <Route path="/approvals/venues" element={<PlaceholderPage />} />
            <Route path="/approvals/vehicles" element={<VehicleBookingMainPage />} />

            <Route path="/reports" element={<ReportsHubPage />} />
            <Route path="/reports/events" element={<EventReportsPage />} />
            <Route path="/reports/vehicles" element={<VehicleReportsPage />} />
            <Route path="/system-history" element={<PlaceholderPage />} />
            <Route path="/audit-logs" element={<PlaceholderPage />} />
            <Route path="/messenger" element={<PlaceholderPage />} />
            <Route path="/announcements" element={<PlaceholderPage />} />
            <Route path="/settings" element={<PlaceholderPage />} />

            <Route path="/trash-bin" element={<TrashBinMainPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
