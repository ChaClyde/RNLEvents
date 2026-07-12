import { useEffect, useState } from "react";
import AddOfficeForm from "./components/AddOfficeForm";
import OfficeList from "./components/OfficeList";
import ToastMessage from "../../components/ToastMessage/ToastMessage";
import { useRefresh } from "../../hooks/useRefresh";

const OfficeMainPage = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [toastMessageIsVisible, setToastMessageIsVisible] = useState(false);

  const handleShowToastMessage = (message: string) => {
    setToastMessage(message);
    setToastMessageIsVisible(true);
  };

  const handleCloseToastMessage = () => {
    setToastMessage("");
    setToastMessageIsVisible(false);
  };

  const { refresh, handleRefresh } = useRefresh(false);

  useEffect(() => {
    document.title = "Office Main Page";
  }, []);

  return (
    <>
      <ToastMessage
        message={toastMessage}
        isVisible={toastMessageIsVisible}
        onClose={handleCloseToastMessage}
      />

      <div className="grid gap-4">
        <div className="col-span-2 md:col-span-1">
          <AddOfficeForm
            onOfficeAdded={(message) => {
              handleShowToastMessage(message);
            }}
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
