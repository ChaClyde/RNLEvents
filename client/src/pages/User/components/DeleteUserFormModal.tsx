import { type FC, type FormEvent, useState } from "react";
import Modal from "../../../components/Modal";
import type { User } from "../../../interfaces/User";
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
} from "lucide-react";

interface DeleteUserFormModalProps {
  user: User | null;
  onDeleteUser: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteUserFormModal: FC<DeleteUserFormModalProps> = ({
  user,
  onDeleteUser,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);

  const handleDestroyUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoadingDestroy(true);
      const res = await UserService.destroyUser(user.user_id);
      if (res.status === 200) {
        onDeleteUser(res.data.message);
        refreshKey();
        onClose();
      } else {
        console.error("Unexpected error:", res.status);
      }
    } catch (error) {
      console.error("Delete error:", error);
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
    if (user.suffix_name) fullName += ` ${user.suffix_name}`;
    return fullName;
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
              <p className="text-sm text-gray-500 mt-1">
                This user will be moved to Trash and can be restored later.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-center">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={getInitials()}
                className="h-28 w-28 rounded-full object-cover border-4 border-red-400 shadow-lg"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="font-medium text-gray-900">{user.email}</p>
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
                  {user.role?.role ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Office</p>
                <p className="font-medium text-gray-900">
                  {user.office?.office ?? "-"}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-gray-400 uppercase">First Name</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.first_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Middle Name</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.middle_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Last Name</p>
              <p className="mt-1 text-gray-900 font-medium">{user.last_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Suffix</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.suffix_name || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Created / Updated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#0095D9]" />
              <h3 className="font-semibold text-gray-900">Created</h3>
            </div>
            <p className="text-gray-600">
              {new Date(user.created_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#003B5C]" />
              <h3 className="font-semibold text-gray-900">Updated</h3>
            </div>
            <p className="text-gray-600">
              {new Date(user.updated_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This moves the user to Trash Bin — they'll lose access immediately,
            but you can restore or permanently delete them from there.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          {!loadingDestroy && <CloseButton label="Cancel" onClose={onClose} />}
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
