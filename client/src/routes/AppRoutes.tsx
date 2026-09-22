import { Route, Routes } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import RoleMainPage from "../pages/Role/RoleMainPage";
import EditRolePage from "../pages/Role/EditRolePage";
import DeleteRolePage from "../pages/Role/DeleteRolePage";
import DeleteOfficePage from "../pages/Office/DeleteOfficePage";
import EditOfficePage from "../pages/Office/EditOfficePage";
import OfficeMainPage from "../pages/Office/OfficeMainPage";
import UserMainPage from "../pages/User/UserMainPage";
import VenueMainPage from "../pages/Venue/VenueMainPage";
import EventMainPage from "../pages/Event/EventMainPage";
import VehicleMainPage from "../pages/Vehicle/VehicleMainPage";
import DriverMainPage from "../pages/Driver/DriverMainPage";

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/roles" element={<RoleMainPage />} />
          <Route path="/roles/edit/:role_id" element={<EditRolePage />} />
          <Route path="/roles/delete/:role_id" element={<DeleteRolePage />} />

          <Route path="/offices" element={<OfficeMainPage />} />
          <Route path="/offices/edit/:office_id" element={<EditOfficePage />} />
          <Route
            path="/offices/delete/:office_id"
            element={<DeleteOfficePage />}
          />

          <Route path="/users" element={<UserMainPage />} />

          <Route path="/venues" element={<VenueMainPage />} />

          <Route path="/events" element={<EventMainPage />} />

          <Route path="/vehicles" element={<VehicleMainPage />} />
          <Route path="/drivers" element={<DriverMainPage />} />
        </Route>
      </Routes>
    </>
  );
};

export default AppRoutes;
