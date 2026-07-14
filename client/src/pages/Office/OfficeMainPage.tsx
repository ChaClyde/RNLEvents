import { useEffect } from "react";
import AddOfficeForm from "./components/AddOfficeForm";
import OfficeList from "./components/OfficeList";
import ToastMessage from "../../components/ToastMessage/ToastMessage";
import { useRefresh } from "../../hooks/useRefresh";
import { useLocation } from "react-router-dom";
import { useToastMessage } from "../../hooks/useToastMessage";

const OfficeMainPage = () => {
  const location = useLocation();

  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);

  useEffect(() => {
    document.title = "Role Main Page";
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      showToastMessage(location.state.message);
      handleRefresh();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, showToastMessage]);

  const { refresh, handleRefresh } = useRefresh(false);

  return (
    <>
      <ToastMessage
        message={message}
        isVisible={isVisible}
        onClose={closeToastMessage}
      />

      <div className="grid gap-4">
        <div className="col-span-2 md:col-span-1">
          <AddOfficeForm
            onOfficeAdded={showToastMessage}
            refreshKey={handleRefresh}
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <OfficeList refreshKey={refresh} />
        </div>
      </div>
    </>
  );
};

export default OfficeMainPage;
