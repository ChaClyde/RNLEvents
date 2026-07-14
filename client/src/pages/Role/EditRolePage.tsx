import { useEffect } from "react";
import EditRoleForm from "./components/EditRoleForm";
import ToastMessage from "../../components/ToastMessage/ToastMessage";
import { useToastMessage } from "../../hooks/useToastMessage";

const EditRolePage = () => {
  useEffect(() => {
    document.title = "Edit Role Page";
  }, []);

  const {
    message: toastMessage,
    isVisible: toastMessageIsVisible,
    showToastMessage,
    closeToastMessage,
  } = useToastMessage("", false);

  return (
    <>
      <ToastMessage
        message={toastMessage}
        isVisible={toastMessageIsVisible}
        onClose={closeToastMessage}
      />
      <EditRoleForm onRoleUpdated={showToastMessage} />
    </>
  );
};

export default EditRolePage;
