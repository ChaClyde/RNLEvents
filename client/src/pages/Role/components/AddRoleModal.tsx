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
      <form onSubmit={handleStoreRole}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6 mb-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Shield className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Role</h1>
              <p className="text-sm text-gray-500 mt-1">
                Roles determine the access granted to users. Fields marked with
                an asterisk are required.
              </p>
            </div>
          </div>
        </div>

        {/* Role Information */}
        <div className="mb-6 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <FileText size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">Role Information</h2>
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
                <p className="mt-1.5 text-xs text-gray-400">
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
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <ToggleRight size={18} className="text-[#003B5C]" />
            <h2 className="font-semibold text-[#003B5C]">Role Status</h2>
          </div>

          <RoleStatusSelect
            value={status}
            onChange={setStatus}
            errors={errors.status}
          />
        </div>

        {formError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {formError}
          </p>
        )}

        {/* Footer */}
        <div className="mt-8 flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
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
