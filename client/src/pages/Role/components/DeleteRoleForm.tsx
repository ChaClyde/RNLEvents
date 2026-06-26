import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const DeleteRole = () => {
  return (
    <>
      <form>
        <div className="mb-4">
          <FloatingLabelInput label="Role Name" type="text" name="role" />
        </div>
        <div className="flex justify-end gap-2">
          <BackButton label="Back" path="/roles" />
          <SubmitButton
            label="Delete Role"
            className="bg-red-100 hover:bg-red-200 text-red-400 border border-red-400"
          />
        </div>
      </form>
    </>
  );
};

export default DeleteRole;
