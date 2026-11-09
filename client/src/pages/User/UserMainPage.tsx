import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { useModal } from "../../hooks/useModal";
import { useToast } from "../../contexts/ToastContext";

import UserService from "../../services/UserService";

import AddUserFormModal from "./components/AddUserFormModal";
import EditUserFormModal from "./components/EditUserFormModal";
import DeleteUserFormModal from "./components/DeleteUserFormModal";
import ViewUserFormModal from "./components/ViewUserFormModal";
import UserList from "./components/UserList";
import type { UserColumns } from "../../interfaces/UserColumns";

const UserMainPage = () => {
  // Modal controls
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

  // User data
  const [users, setUsers] = useState<UserColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedUser, setSelectedUser] = useState<UserColumns | null>(null);

  const { showToast } = useToast();

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await UserService.loadUsers();

      const userData = response.data?.users;

      if (!Array.isArray(userData)) {
        throw new Error("Invalid user data received from the server.");
      }

      setUsers(userData);
    } catch (error) {
      console.error("Error loading users:", error);

      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      setLoadError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "Unable to load users. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Add user success
  const handleUserAdded = () => {
    showToast("User account created successfully.");
    void loadUsers();
  };

  // Edit user success
  const handleUserUpdated = (message: string) => {
    showToast(message);
    closeEditModal();
    setSelectedUser(null);
    void loadUsers();
  };

  // Delete user success
  const handleUserDeleted = (message: string) => {
    showToast(message);
    closeDeleteModal();
    setSelectedUser(null);
    void loadUsers();
  };

  // View user
  const handleViewUser = (user: UserColumns) => {
    setSelectedUser(user);
    openViewModal();
  };

  // Edit user
  const handleEditUser = (user: UserColumns) => {
    setSelectedUser(user);
    openEditModal();
  };

  // Delete user
  const handleDeleteUser = (user: UserColumns) => {
    setSelectedUser(user);
    openDeleteModal();
  };

  // Close handlers
  const handleCloseView = () => {
    closeViewModal();
    setSelectedUser(null);
  };

  const handleCloseEdit = () => {
    closeEditModal();
    setSelectedUser(null);
  };

  const handleCloseDelete = () => {
    closeDeleteModal();
    setSelectedUser(null);
  };

  return (
    <>
      {/* Add User Modal */}
      <AddUserFormModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        onSuccess={handleUserAdded}
      />

      {/* View User Modal */}
      <ViewUserFormModal
        user={selectedUser}
        isOpen={isViewOpen}
        onClose={handleCloseView}
      />

      {/* Edit User Modal */}
      <EditUserFormModal
        user={selectedUser}
        isOpen={isEditOpen}
        onClose={handleCloseEdit}
        onUserUpdated={handleUserUpdated}
      />

      {/* Delete User Modal */}
      <DeleteUserFormModal
        user={selectedUser}
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onDeleteUser={handleUserDeleted}
      />

      {/* User List */}
      <div className="space-y-5">
        {loadError && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              />

              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Unable to load users
                </p>

                <p className="text-sm text-red-600 dark:text-red-400">
                  {loadError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Retry
            </button>
          </div>
        )}

        <UserList
          users={users}
          loading={loading}
          onAddUser={openAddModal}
          onViewUser={handleViewUser}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onRefresh={loadUsers}
        />
      </div>
    </>
  );
};

export default UserMainPage;
