import { useEffect } from "react";
import EditOfficeForm from "./components/EditOfficeForm";
import { useToastMessage } from "../../hooks/useToastMessage";
import ToastMessage from "../../components/ToastMessage/ToastMessage";

const EditOfficePage = () => {
  useEffect(() => {
    document.title = "Edit Office Page";
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
      <EditOfficeForm onOfficeUpdated={showToastMessage} />
    </>
  );
};

export default EditOfficePage;
