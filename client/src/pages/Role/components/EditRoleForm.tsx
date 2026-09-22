import { useEffect, useState, type FC, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import RoleService from "../../../services/RoleService";
import { useParams } from "react-router-dom";
import Spinner from "../../../components/Spinner/Spinner";
import type { RoleFieldErrors } from "../../../interfaces/RoleColumns";

interface EditRoleFormProps {
  onRoleUpdated: (message: string) => void;
}

const EditRoleForm: FC<EditRoleFormProps> = ({ onRoleUpdated }) => {
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<RoleFieldErrors>({});

  const { role_id } = useParams();

  const handleGetRole = async (role_id: string | number) => {
    try {
      setLoadingGet(true);

      const res = await RoleService.getRole(role_id);

      if (res.status === 200) {
        setRole(res.data.role.role);
        setDescription(res.data.role.description ?? "");
      } else {
        console.error(
          "Unexpected error status occurred during getting role:",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected error occurred during getting role finally :",
        error,
      );
    } finally {
      setLoadingGet(false);
    }
  };

  const handleUpdateRole = async (e: FormEvent) => {
    try {
      e.preventDefault();

      setLoadingUpdate(true);

      const res = await RoleService.updateRole(role_id!, {
        role,
        description,
      });

      if (res.status === 200) {
        setError({});
        setRole(res.data.role.role);
        onRoleUpdated(res.data.message);
      } else {
        console.error(
          "Unexpected status error occurred during updating role: ",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        setError(error.response.data.errors);
      } else {
        console.error(
          "Unexpected server error occurred during updating role: ",
          error,
        );
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  useEffect(() => {
    if (role_id) {
      const parsedRoleId = parseInt(role_id);
      handleGetRole(parsedRoleId);
    } else {
      console.error(
        "Unexpected parameter error occurred during getting role: ",
        role_id,
      );
    }
  }, []);

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
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#003B5C]">Edit Role</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Update the role's name and description below.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#003B5C] to-[#0095D9]" />

        <div className="border-b border-[#0095D9]/10 px-6 py-4">
          <h3 className="text-base font-semibold text-[#003B5C]">
            Role Information
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Fields marked with an asterisk are required.
          </p>
        </div>

        <div className="px-6 py-6">
          {loadingGet ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <form onSubmit={handleUpdateRole}>
              <div className="space-y-5">
                <FloatingLabelInput
                  label="Role Name"
                  type="text"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  autoFocus
                  errors={error.role}
                />

                <FloatingLabelInput
                  label="Role Description"
                  type="text"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  errors={error.description}
                />
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#0095D9]/10 pt-5">
                {!loadingUpdate && <BackButton label="Back" path="/roles" />}
                <SubmitButton
                  label="Update Role"
                  loading={loadingUpdate}
                  loadingLabel="Updating Role..."
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditRoleForm;
