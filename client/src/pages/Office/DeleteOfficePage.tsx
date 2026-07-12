import { useEffect } from "react";
import DeleteOfficeForm from "./components/DeleteOfficeForm";

const DeleteOfficePage = () => {
  useEffect(() => {
    document.title = "Delete Office Page";
  }, []);
  return (
    <>
      <DeleteOfficeForm />
    </>
  );
};

export default DeleteOfficePage;
