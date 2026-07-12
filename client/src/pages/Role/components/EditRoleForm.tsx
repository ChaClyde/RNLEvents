import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const EditRoleForm = () => {
  return (
    <>
      <form>
        <div className="mb-4">
          <FloatingLabelInput label="Role Name" type="text" name="role" />
        </div>
        <div className="mb-4">
          <FloatingLabelInput
            label="Role Description"
            type="text"
            name="role"
          />
        </div>
        <div className="flex justify-end gap-2">
          <BackButton label="Back" path="/roles" />
          <SubmitButton label="Update Role" />
        </div>
      </form>
    </>
  );
};

export default EditRoleForm;
