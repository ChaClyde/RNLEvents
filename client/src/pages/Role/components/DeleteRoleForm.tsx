import { useEffect, useState, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import { useNavigate, useParams } from "react-router-dom";
import RoleService from "../../../services/RoleService";
import Spinner from "../../../components/Spinner/Spinner";

const DeleteRoleForm = () => {
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");

  const { role_id } = useParams();
  const navigate = useNavigate();

  const handleGetRole = async (role_id: string | number) => {
    try {
      setLoadingGet(true);

      const res = await RoleService.getRole(role_id);

      if (res.status === 200) {
        setRole(res.data.role.role);
        setDescription(res.data.role.description || "");
      } else {
        console.error(
          "Unexpected status error occurred during deleting role: ",
          res.status,
        );
      }
    } catch (error) {
      {
        console.error(
          "Unexpected server error occurred during deleting role: ",
          error,
        );
      }
    } finally {
      setLoadingGet(false);
    }
  };

  const handleDestroyRole = async (e: FormEvent) => {
    try {
      e.preventDefault();

      setLoadingDestroy(true);

      const res = await RoleService.destroyRole(role_id!);

      if (res.status === 200) {
        navigate("/roles", { state: { message: res.data.message } });
      } else {
        console.error(
          "Unexpected status error occurred during deleting role: ",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected server error occurred during deleting role : ",
        error,
      );
    } finally {
      setLoadingDestroy(false);
    }
  };

  useEffect(() => {
    if (role_id) {
      const parsedRoleId = parseInt(role_id);
      handleGetRole(parsedRoleId);
    } else {
      console.error(
        "Unexpected parameter error occurred during getting: ",
        role_id,
      );
    }
  }, [role_id]);

  return (
    <>
      {loadingGet ? (
        <div className="flex justify-center items-center mt-52">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleDestroyRole}>
          <div className="mb-4">
            <FloatingLabelInput
              label="Role"
              type="text"
              name="role"
              value={role}
              readOnly
            />
          </div>
          <div className="mb-4">
            <FloatingLabelInput
              label="Description"
              type="text"
              name="description"
              value={description}
              readOnly
            />
          </div>
          <div className="flex justify-end gap-4">
            {!loadingDestroy && <BackButton label="Back" path="/roles" />}
            <SubmitButton
              label="Delete Role"
              className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium border border-red-400 text-red-400 hover:bg-red-500/20 shadow-lg"
              loading={loadingDestroy}
              loadingLabel="Deleting Role..."
            />
          </div>
        </form>
      )}
    </>
  );
};

export default DeleteRoleForm;
