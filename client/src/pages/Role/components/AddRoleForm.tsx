import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const AddRoleForm = () => {
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
            name="description"
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton label="Save Role" />
        </div>
      </form>
    </>
  );
};

export default AddRoleForm;
