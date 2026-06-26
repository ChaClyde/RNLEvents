import { useEffect } from "react";
import EditRoleForm from "./components/EditRoleForm";

const EditRolePage = () => {
  useEffect(() => {
    document.title = "Edit Role Page";
  }, []);

  return (
    <>
      <EditRoleForm />
    </>
  );
};

export default EditRolePage;
