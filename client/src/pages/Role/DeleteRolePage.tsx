import { useEffect } from "react";
import DeleteRoleForm from "./components/DeleteRoleForm";

const DeleteRolePage = () => {
  useEffect(() => {
    document.title = "Delete Role Page";
  }, []);

  return (
    <>
      <DeleteRoleForm />
    </>
  );
};

export default DeleteRolePage;
