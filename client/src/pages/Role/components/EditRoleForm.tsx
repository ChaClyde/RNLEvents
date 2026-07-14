import { useEffect, useState, type FC, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import type { RoleFieldErrors } from "../../../components/Interfaces/RoleFieldInterfaces";
import RoleService from "../../../services/RoleService";
import { useParams } from "react-router-dom";
import Spinner from "../../../components/Spinner/Spinner";

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
        setDescription(res.data.role.description);
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
    <>
      {loadingGet ? (
        <div className="flex justify-center items-center mt-52">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleUpdateRole}>
          <div className="mb-4">
            <FloatingLabelInput
              label="Role Name"
              type="text"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              autofocus
              errors={error.role}
            />
          </div>
          <div className="mb-4">
            <FloatingLabelInput
              label="Role Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={error.description}
            />
          </div>
          <div className="flex justify-end gap-2">
            {!loadingUpdate && <BackButton label="Back" path="/roles" />}
            <SubmitButton
              label="Update Role"
              loading={loadingUpdate}
              loadingLabel="Updating Role..."
            />
          </div>
        </form>
      )}
    </>
  );
};

export default EditRoleForm;
