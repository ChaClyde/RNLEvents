import { useState, type FC, type FormEvent } from "react";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import RoleService from "../../../services/RoleService";
import type { RoleFieldErrors } from "../../../interfaces/RoleColumns";

interface AddRoleFormProps {
  onRoleAdded: (message: string) => void;
  refreshKey?: () => void;
}

const AddRoleForm: FC<AddRoleFormProps> = ({ onRoleAdded, refreshKey }) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<RoleFieldErrors>({});

  const handleStoreRole = async (e: FormEvent) => {
    try {
      e.preventDefault();

      setLoadingStore(true);

      const res = await RoleService.storeRole({ role, description });

      if (res.status === 201) {
        setRole("");
        setDescription("");
        setErrors({});
        onRoleAdded(res.data.message);
        refreshKey?.();
      } else {
        console.error(
          "Unexpected error occurred during store role: ",
          res.data,
        );
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error("Unexpected error occurred during store role: ", error);
      }
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Info Card */}
      <div className="flex items-start gap-4 rounded-xl border border-[#0095D9]/20 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0095D9]/10 text-[#0095D9] ring-1 ring-[#0095D9]/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3l7 3v6c0 5-3.4 7.6-7 9-3.6-1.4-7-4-7-9V6l7-3Z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#003B5C]">
            Role Management
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Create and manage roles within your organization. Roles determine
            the permissions and system access granted to users.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#003B5C] to-[#0095D9]" />

        <div className="border-b border-[#0095D9]/10 px-6 py-4">
          <h3 className="text-base font-semibold text-[#003B5C]">
            Enter Role Information
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Fields marked with an asterisk are required.
          </p>
        </div>

        <form onSubmit={handleStoreRole} className="px-6 py-6">
          <div className="space-y-5">
            <FloatingLabelInput
              label="Role Name"
              type="text"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              autoFocus
              errors={errors.role}
            />

            <FloatingLabelInput
              label="Role Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={errors.description}
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#0095D9]/10 pt-5">
            <SubmitButton
              label="Save Role"
              loading={loadingStore}
              loadingLabel="Saving Role..."
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoleForm;
