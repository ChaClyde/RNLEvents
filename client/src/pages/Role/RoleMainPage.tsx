import { useEffect } from "react";
import AddRoleForm from "./components/AddRoleForm";
import RoleList from "./components/RoleList";
import ToastMessage from "../../components/ToastMessage/ToastMessage";
import { useToastMessage } from "../../hooks/useToastMessage";
import { useRefresh } from "../../hooks/useRefresh";

const RoleMainPage = () => {
  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);

  useEffect(() => {
    document.title = "Role Main Page";
  }, []);

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
          <AddRoleForm
            onRoleAdded={showToastMessage}
            refreshKey={handleRefresh}
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <RoleList refreshKey={refresh} />
        </div>
      </div>
    </>
  );
};

export default RoleMainPage;
