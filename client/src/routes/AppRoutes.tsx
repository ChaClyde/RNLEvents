import { Route, Routes } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import FloatingLabelInput from "../components/Input/FloatingLabelInput";

const SampleComponent = () => {
  return (
    <>
      <h1 className="text-red-600">Hello World</h1>
      <FloatingLabelInput label="First Name" type="text" name="firstName" />
    </>
  );
};

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<SampleComponent />} />
        </Route>
      </Routes>
    </>
  );
};

export default AppRoutes;
