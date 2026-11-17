import { useEffect, useState, type FC, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  Trash2,
  Shield,
  FileText,
  Users,
  AlertTriangle,
  Lock,
} from "lucide-react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import RoleService from "../../../services/RoleService";
import RoleStatusBadge from "./RoleStatusBadge";
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

  return (
    <Modal
      isOpen={role !== null}
      // don't allow closing while the delete request is in flight
      onClose={loadingDestroy ? () => {} : onClose}
      showCloseButton
    >
      <form onSubmit={handleDestroyRole} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <div className="rounded-xl bg-danger-soft p-3 text-danger">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Delete Role</h1>
            <p className="mt-1 text-sm text-muted">
              This role will be moved to Trash and can be restored later.
            </p>
          </div>
        </div>

        {/* Role Summary */}
        <div className="rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Shield size={32} />
            </div>

            <h2 className="mt-4 text-xl font-bold text-ink">{role.name}</h2>
            <p className="text-muted">{role.description || "No description"}</p>

            <div className="mt-3">
              <RoleStatusBadge status={role.status} />
            </div>
          </div>
        </div>

        {/* Role Information + Usage */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="text-primary" size={18} />
              <h3 className="font-semibold text-ink">Role Information</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted">Role Name</p>
                <p className="font-medium text-ink">{role.name}</p>
              </div>
              <div>
                <p className="text-muted">Description</p>
                <p className="font-medium text-ink">
                  {role.description || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-primary" size={18} />
              <h3 className="font-semibold text-ink">Usage</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted">Assigned Users</p>
                <p className="font-medium text-ink">{role.users_count}</p>
              </div>
              <div>
                <p className="text-muted">Role Type</p>
                <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                  {role.is_system_role ? (
                    <>
                      <Lock size={14} className="text-muted" />
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

        {/* Blocked / Error (red) or Trash notice (yellow) */}
        {blockedReason || deleteError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm text-danger">
              {blockedReason || deleteError}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-[#6b4e00]"
            />
            <p className="text-sm text-[#6b4e00]">
              This moves the role to Trash Bin — you can restore or permanently
              delete it from there.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
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
