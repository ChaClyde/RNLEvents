import { useEffect, useState, type FC, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  Trash2,
  Shield,
  FileText,
  Users,
  AlertTriangle,
  CircleCheck,
  CircleX,
  Lock,
} from "lucide-react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import RoleService from "../../../services/RoleService";
import type { RoleColumns } from "../../../interfaces/RoleColumns";

interface DeleteRoleModalProps {
  role: RoleColumns | null; // the modal is open while a role is selected
  onClose: () => void;
  onRoleDeleted: (message: string) => void;
  refreshKey?: () => void;
}

const DeleteRoleModal: FC<DeleteRoleModalProps> = ({
  role,
  onClose,
  onRoleDeleted,
  refreshKey,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const blockedReason = !role
    ? ""
    : role.is_system_role
      ? "System roles cannot be deleted."
      : role.users_count > 0
        ? `This role is assigned to ${role.users_count} user${role.users_count === 1 ? "" : "s"}. Reassign them before deleting it.`
        : "";

  useEffect(() => {
    if (role) setDeleteError("");
  }, [role]);

  const handleDestroyRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!role || blockedReason) return;

    try {
      setLoadingDestroy(true);
      setDeleteError("");

      const res = await RoleService.destroyRole(role.role_id);

      onRoleDeleted(res.data.message);
      refreshKey?.();
      onClose();
    } catch (error) {
      setDeleteError(
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Unable to delete the role. Please try again.",
      );
      console.error("Unexpected error occurred during deleting role: ", error);
    } finally {
      setLoadingDestroy(false);
    }
  };

  if (!role) return null;

  const isActive = String(role.status).toLowerCase() === "active";

  return (
    <Modal
      isOpen={role !== null}
      // don't allow closing while the delete request is in flight
      onClose={loadingDestroy ? () => {} : onClose}
      showCloseButton
    >
      <form onSubmit={handleDestroyRole} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delete Role</h1>
              <p className="text-sm text-gray-500 mt-1">
                This role will be moved to Trash and can be restored later.
              </p>
            </div>
          </div>
        </div>

        {/* Role Summary */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-400 text-white shadow-lg">
              <Shield size={44} />
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              {role.name}
            </h2>
            <p className="text-gray-500">
              {role.description || "No description"}
            </p>

            <div className="mt-3">
              {isActive ? (
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

        {/* Role Information + Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="text-[#0095D9]" size={18} />
              <h3 className="font-semibold text-gray-900">Role Information</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Role Name</p>
                <p className="font-medium text-gray-900">{role.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Description</p>
                <p className="font-medium text-gray-900">
                  {role.description || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-[#003B5C]" size={18} />
              <h3 className="font-semibold text-gray-900">Usage</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Assigned Users</p>
                <p className="font-medium text-gray-900">{role.users_count}</p>
              </div>
              <div>
                <p className="text-gray-500">Role Type</p>
                <p className="font-medium text-gray-900 inline-flex items-center gap-1.5">
                  {role.is_system_role ? (
                    <>
                      <Lock size={14} className="text-gray-500" />
                      System role
                    </>
                  ) : (
                    "Custom role"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning / Blocked / Error */}
        {blockedReason || deleteError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              {blockedReason || deleteError}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              This moves the role to Trash Bin — you can restore or permanently
              delete it from there.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          {!loadingDestroy && (
            <CloseButton
              label={blockedReason ? "Close" : "Cancel"}
              onClose={onClose}
            />
          )}
          {!blockedReason && (
            <SubmitButton
              label="Move to Trash"
              loading={loadingDestroy}
              loadingLabel="Deleting..."
            />
          )}
        </div>
      </form>
    </Modal>
  );
};

export default DeleteRoleModal;
