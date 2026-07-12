import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

const DeleteOfficeForm = () => {
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
            name="office"
          />
        </div>
        <div className="flex justify-end gap-2">
          <BackButton label="Back" path="/offices" />
          <SubmitButton
            label="Delete Office"
            className="bg-red-100 hover:bg-red-200 text-red-400 border border-red-400"
          />
        </div>
      </form>
    </>
  );
};

export default DeleteOfficeForm;
