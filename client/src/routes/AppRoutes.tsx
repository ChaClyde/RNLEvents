import { Route, Routes } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import RoleMainPage from "../pages/Role/RoleMainPage";
import EditRolePage from "../pages/Role/EditRolePage";
import DeleteRolePage from "../pages/Role/DeleteRolePage";
import DeleteOfficePage from "../pages/Office/DeleteOfficePage";
import EditOfficePage from "../pages/Office/EditOfficePage";
import OfficeMainPage from "../pages/Office/OfficeMainPage";
import UserMainPage from "../pages/User/UserMainPage";

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
        </Route>
      </Routes>
    </>
  );
};

export default AppRoutes;
