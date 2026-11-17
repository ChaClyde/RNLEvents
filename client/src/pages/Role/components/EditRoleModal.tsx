import { useEffect, useState, type FC, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Pencil, FileText, ToggleRight, Lock } from "lucide-react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import RoleService from "../../../services/RoleService";
import RoleStatusSelect from "./RoleStatusSelect";
import { slugify } from "../../../interfaces/Slugify";
import type {
  RoleColumns,
  RoleFieldErrors,
  RoleStatus,
} from "../../../interfaces/RoleColumns";

interface EditRoleModalProps {
  role: RoleColumns | null; // the modal is open while a role is selected
  onClose: () => void;
  onRoleUpdated: (message: string) => void;
  refreshKey?: () => void;
}

const EditRoleModal: FC<EditRoleModalProps> = ({
  role,
  onClose,
  onRoleUpdated,
  refreshKey,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoleStatus>("active");
  const [errors, setErrors] = useState<RoleFieldErrors>({});
  const [formError, setFormError] = useState("");

  const isSystemRole = role?.is_system_role ?? false;

  // System role slugs never change; other slugs follow the name
  const slugPreview = isSystemRole ? (role?.slug ?? "") : slugify(name);

  // Load the selected role into the form each time a different role is opened
  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      setStatus(role.status);
      setErrors({});
      setFormError("");
    }
  }, [role]);

  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;

    try {
      setLoadingUpdate(true);
      setErrors({});
      setFormError("");

      const res = await RoleService.updateRole(role.role_id, {
        name,
        description,
        status,
      });

      onRoleUpdated(res.data.message);
      refreshKey?.();
      onClose();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        const fieldErrors: RoleFieldErrors = error.response.data.errors ?? {};
        setErrors(fieldErrors);

        const shown =
          fieldErrors.name ||
          fieldErrors.slug ||
          fieldErrors.description ||
          fieldErrors.status;
        if (!shown) {
          setFormError(
            error.response.data.message ??
              "Please check the form and try again.",
          );
        }
      } else if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError("Unable to update the role. Please try again.");
      }
      console.error("Unexpected error occurred during updating role: ", error);
    } finally {
      setLoadingUpdate(false);
    }
  };

  if (!role) return null;

  return (
    <Modal
      isOpen={role !== null}
      // don't allow closing while the update request is in flight
      onClose={loadingUpdate ? () => {} : onClose}
      showCloseButton
    >
      <form onSubmit={handleUpdateRole} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <div className="rounded-xl bg-primary-soft p-3 text-primary">
            <Pencil className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Edit Role</h1>
            <p className="mt-1 text-sm text-muted">
              Update the role's name, description, and status.
            </p>
          </div>
        </div>

        {/* System role notice */}
        {isSystemRole && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft p-4">
            <Lock size={18} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-ink">
              This is a system role. Only its description can be changed.
            </p>
          </div>
        )}

        {/* Role Information */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h2 className="font-semibold text-ink">Role Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <FloatingLabelInput
                label="Role Name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus={!isSystemRole}
                readOnly={isSystemRole}
                errors={errors.name ?? errors.slug}
              />
              <p className="mt-1.5 text-xs text-muted">
                Slug: <span className="font-mono">{slugPreview}</span>
              </p>
            </div>

            <FloatingLabelInput
              label="Role Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus={isSystemRole}
              errors={errors.description}
            />
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <ToggleRight size={18} className="text-primary" />
            <h2 className="font-semibold text-ink">Role Status</h2>
          </div>

          <RoleStatusSelect
            value={status}
            onChange={setStatus}
            disabled={isSystemRole}
            errors={errors.status}
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
          {!loadingUpdate && <CloseButton label="Close" onClose={onClose} />}
          <SubmitButton
            label="Update Role"
            loading={loadingUpdate}
            loadingLabel="Updating Role..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditRoleModal;
