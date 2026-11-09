import { type FC, type FormEvent, useState } from "react";
import Modal from "../../../components/Modal";
import UserService from "../../../services/UserService";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";

import {
  Trash2,
  User as UserIcon,
  Shield,
  AlertTriangle,
  CircleCheck,
  CircleX,
  Calendar,
  AtSign,
  Briefcase,
  Phone,
} from "lucide-react";

import type { UserColumns } from "../../../interfaces/UserColumns";

interface DeleteUserFormModalProps {
  user: UserColumns | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteUser: (message: string) => void;
}

const DeleteUserFormModal: FC<DeleteUserFormModalProps> = ({
  user,
  isOpen,
  onClose,
  onDeleteUser,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDestroyUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || loadingDestroy) return;

    try {
      setLoadingDestroy(true);
      setErrorMessage("");

      const response = await UserService.destroyUser(user.user_id);

      if (response.status === 200) {
        // The parent handles closing the modal and refreshing the user list.
        onDeleteUser(
          response.data.message || "User moved to Trash Bin successfully.",
        );
      }
    } catch (error: unknown) {
      console.error("Delete user error:", error);

      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
        message?: string;
      };

      const validationErrors = axiosError.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors)[0]?.[0]
        : null;

      setErrorMessage(
        firstValidationError ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          "Unable to delete this user. Please try again.",
      );
    } finally {
      setLoadingDestroy(false);
    }
  };

  if (!isOpen || !user) return null;

  const getInitials = () =>
    `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  const getFullName = () => {
    let fullName = user.middle_name
      ? `${user.last_name}, ${user.first_name} ${user.middle_name.charAt(0)}.`
      : `${user.last_name}, ${user.first_name}`;

    if (user.suffix_name) {
      fullName += ` ${user.suffix_name}`;
    }

    return fullName;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleDestroyUser} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delete User</h1>

              <p className="mt-1 text-sm text-gray-500">
                This user will be moved to Trash and can be restored later.
              </p>
            </div>
          </div>
        </div>

        {/* Backend Error */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />

            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Profile */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-center">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={getFullName()}
                className="h-28 w-28 rounded-full border-4 border-red-400 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-400 text-3xl font-bold text-white">
                {getInitials()}
              </div>
            )}

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              {getFullName()}
            </h2>

            <p className="text-gray-500">@{user.username}</p>

            <div className="mt-3">
              {user.account_status === "Active" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0095D9]/20 bg-[#0095D9]/10 px-4 py-1 text-xs font-medium text-[#0095D9]">
                  <CircleCheck size={14} />
                  ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-medium text-red-500">
                  <CircleX size={14} />
                  INACTIVE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account + Organization */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <AtSign className="text-[#0095D9]" size={18} />

              <h3 className="font-semibold text-gray-900">
                Account Information
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Username</p>
                <p className="font-medium text-gray-900">{user.username}</p>
              </div>

              <div>
                <p className="text-gray-500">Email Address</p>
                <p className="break-all font-medium text-gray-900">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="text-[#003B5C]" size={18} />

              <h3 className="font-semibold text-gray-900">Organization</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Role</p>
                <p className="font-medium text-gray-900">
                  {user.role?.name ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Office</p>
                <p className="font-medium text-gray-900">
                  {user.office?.office_name ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <UserIcon size={18} className="text-[#0095D9]" />

            <h3 className="font-semibold text-gray-900">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-400">First Name</p>
              <p className="mt-1 font-medium text-gray-900">
                {user.first_name}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400">Middle Name</p>
              <p className="mt-1 font-medium text-gray-900">
                {user.middle_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400">Last Name</p>
              <p className="mt-1 font-medium text-gray-900">{user.last_name}</p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400">Suffix</p>
              <p className="mt-1 font-medium text-gray-900">
                {user.suffix_name || "—"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Briefcase size={13} className="text-gray-400" />
                <p className="text-xs uppercase text-gray-400">Position</p>
              </div>

              <p className="mt-1 font-medium text-gray-900">
                {user.position || "—"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <Phone size={13} className="text-gray-400" />
                <p className="text-xs uppercase text-gray-400">
                  Contact Number
                </p>
              </div>

              <p className="mt-1 font-medium text-gray-900">
                {user.contact_number || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Created / Updated */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-[#0095D9]" />
              <h3 className="font-semibold text-gray-900">Created</h3>
            </div>

            <p className="text-gray-600">{formatDate(user.created_at)}</p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-[#003B5C]" />
              <h3 className="font-semibold text-gray-900">Updated</h3>
            </div>

            <p className="text-gray-600">{formatDate(user.updated_at)}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />

          <p className="text-sm text-red-700">
            This action moves the user to the Trash Bin. They will lose access
            to the system, but the account can still be restored or permanently
            deleted from the Trash Bin.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <CloseButton label="Cancel" onClose={onClose} />

          <SubmitButton
            label="Move to Trash"
            loading={loadingDestroy}
            loadingLabel="Deleting..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default DeleteUserFormModal;
