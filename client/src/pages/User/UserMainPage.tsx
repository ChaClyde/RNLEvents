import { useState, useEffect, useCallback } from "react";
import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";
import UserService from "../../services/UserService";
import type { User } from "../../interfaces/User";
import AddUserFormModal from "./components/AddUserFormModal";
import EditUserFormModal from "./components/EditUserFormModal";
import DeleteUserFormModal from "./components/DeleteUserFormModal";
import ViewUserFormModal from "./components/ViewUserFormModal";
import UserList from "./components/UserList";

const UserMainPage = () => {
  const {
    isOpen: isAddOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal(false);
  const {
    isOpen: isEditOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal(false);
  const {
    isOpen: isDeleteOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal(false);
  const {
    isOpen: isViewOpen,
    openModal: openViewModal,
    closeModal: closeViewModal,
  } = useModal(false);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { showToast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await UserService.loadUsers();
      setUsers(response.data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    openViewModal();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    openEditModal();
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    openDeleteModal();
  };

  return (
    <>
      <AddUserFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onUserAdded={(message) => showToast(message)}
        refreshKey={loadUsers}
      />

      <ViewUserFormModal
        user={selectedUser}
        isOpen={isViewOpen}
        onClose={closeViewModal}
      />

      <EditUserFormModal
        user={selectedUser}
        isOpen={isEditOpen}
        onClose={closeEditModal}
        onUserUpdated={(message) => showToast(message)}
        refreshKey={loadUsers}
      />

      <DeleteUserFormModal
        user={selectedUser}
        isOpen={isDeleteOpen}
        onClose={closeDeleteModal}
        onDeleteUser={(message) => showToast(message)}
        refreshKey={loadUsers}
      />

      <UserList
        users={users}
        loading={loading}
        onAddUser={openAddModal}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onRefresh={loadUsers}
      />
    </>
  );
};

export default UserMainPage;
