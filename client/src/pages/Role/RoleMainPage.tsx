import { useCallback, useEffect, useState } from "react";
import AddRoleModal from "./components/AddRoleModal";
import RoleList from "./components/RoleList";
import ToastMessage from "../../components/ToastMessage/ToastMessage";
import { useToastMessage } from "../../hooks/useToastMessage";
import { useRefresh } from "../../hooks/useRefresh";
import { useModal } from "../../hooks/useModal";
import type { RoleColumns } from "../../interfaces/RoleColumns";
import EditRoleModal from "./components/EditRoleModal";
import DeleteRoleModal from "./components/DeleteRoleModal";

const RoleMainPage = () => {
  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);
  const { refresh, handleRefresh } = useRefresh(false);
  const { isOpen, openModal, closeModal } = useModal(false);

  // Edit and delete open while a role is selected
  const [editingRole, setEditingRole] = useState<RoleColumns | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleColumns | null>(null);

  const closeEdit = useCallback(() => setEditingRole(null), []);
  const closeDelete = useCallback(() => setDeletingRole(null), []);

  useEffect(() => {
    document.title = "Role Main Page";
  }, []);

  return (
    <>
      <ToastMessage
        message={message}
        isVisible={isVisible}
        onClose={closeToastMessage}
      />

      <AddRoleModal
        isOpen={isOpen}
        onClose={closeModal}
        onRoleAdded={showToastMessage}
        refreshKey={handleRefresh}
      />

      <EditRoleModal
        role={editingRole}
        onClose={closeEdit}
        onRoleUpdated={showToastMessage}
        refreshKey={handleRefresh}
      />

      <DeleteRoleModal
        role={deletingRole}
        onClose={closeDelete}
        onRoleDeleted={showToastMessage}
        refreshKey={handleRefresh}
      />
      <div className="flex flex-col gap-4">
        <RoleList
          refreshKey={refresh}
          onAdd={openModal}
          onEdit={setEditingRole}
          onDelete={setDeletingRole}
        />
      </div>
    </>
  );
};

export default RoleMainPage;
