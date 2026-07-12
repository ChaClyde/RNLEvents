import { useState, type FC, type FormEvent } from "react";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import RoleService from "../../../services/RoleService";
import type { RoleFieldErrors } from "../../../components/Interfaces/RoleFieldInterfaces";

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
        refreshKey();
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
    <>
      <form onSubmit={handleStoreRole}>
        <div className="mb-4">
          <FloatingLabelInput
            label="Role Name"
            type="text"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            autofocus
            errors={errors.role}
          />
        </div>
        <div className="mb-4">
          <FloatingLabelInput
            label="Role Description"
            type="text"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            errors={errors.description}
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton
            label="Save Role"
            loading={loadingStore}
            loadingLabel="Saving Role"
          />
        </div>
      </form>
    </>
  );
};

export default AddRoleForm;
