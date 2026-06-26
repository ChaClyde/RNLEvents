import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const EditOfficeForm = () => {
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
        <div className="flex justify-end gap-2">
          <BackButton label="Back" path="/offices" />
          <SubmitButton label="Update Office" />
        </div>
      </form>
    </>
  );
};

export default EditOfficeForm;
