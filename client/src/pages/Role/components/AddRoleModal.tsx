import { useEffect, useState, type FC, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Shield, FileText, ToggleRight } from "lucide-react";
import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import RoleService from "../../../services/RoleService";
import RoleStatusSelect from "./RoleStatusSelect";
import type {
  RoleFieldErrors,
  RoleStatus,
} from "../../../interfaces/RoleColumns";
import { slugify } from "../../../interfaces/Slugify";

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleAdded: (message: string) => void;
  refreshKey?: () => void;
}

const AddRoleModal: FC<AddRoleModalProps> = ({
  isOpen,
  onClose,
  onRoleAdded,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoleStatus>("active");
  const [errors, setErrors] = useState<RoleFieldErrors>({});
  const [formError, setFormError] = useState("");

  const slugPreview = slugify(name);

  // Start with a clean form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setStatus("active");
      setErrors({});
      setFormError("");
    }
  }, [isOpen]);

  const handleStoreRole = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoadingStore(true);
      setErrors({});
      setFormError("");

      const res = await RoleService.storeRole({ name, description, status });

      onRoleAdded(res.data.message);
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
        setFormError("Unable to save the role. Please try again.");
      }
      console.error("Unexpected error occurred during store role: ", error);
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loadingStore ? () => {} : onClose}
      showCloseButton
    >
      <form onSubmit={handleStoreRole} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <div className="rounded-xl bg-primary-soft p-3 text-primary">
            <Shield className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-ink">Add Role</h1>
            <p className="mt-1 text-sm text-muted">
              Roles determine the access granted to users. Fields marked with an
              asterisk are required.
            </p>
          </div>
        </div>

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
                autoFocus
                errors={errors.name ?? errors.slug}
              />
              {slugPreview && (
                <p className="mt-1.5 text-xs text-muted">
                  Slug: <span className="font-mono">{slugPreview}</span>{" "}
                  (generated automatically)
                </p>
              )}
            </div>

            <FloatingLabelInput
              label="Role Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Save Role"
            loading={loadingStore}
            loadingLabel="Saving Role..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddRoleModal;
