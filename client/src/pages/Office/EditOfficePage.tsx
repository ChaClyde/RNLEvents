import { useEffect } from "react";
import EditOfficeForm from "./components/EditOfficeForm";

const EditOfficePage = () => {
  useEffect(() => {
    document.title = "Edit Office Page";
  }, []);
  return (
    <>
      <EditOfficeForm />
    </>
  );
};

export default EditOfficePage;
