import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const AddOfficeForm = () => {
  return (
    <>
      <form>
        <div className="mb-4">
          <FloatingLabelInput label="Office Name" type="text" name="office" />
        </div>
        <div className="mb-4">
          <FloatingLabelInput
            label="Office Description"
            type="text"
            name="description"
          />
        </div>
        <div className="flex justify-end">
          <SubmitButton label="Save Office" />
        </div>
      </form>
    </>
  );
};

export default AddOfficeForm;
