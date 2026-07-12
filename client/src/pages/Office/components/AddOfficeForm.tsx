import { useState, type FC, type FormEvent } from "react";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import OfficeService from "../../../services/OfficeService";
import type { OfficeFieldErrors } from "../../../components/Interfaces/OfficeFieldInterfaces";

interface AddOfficeFormProps {
  onOfficeAdded: (message: string) => void;
  refreshKey?: () => void;
}

const AddOfficeForm: FC<AddOfficeFormProps> = ({
  onOfficeAdded,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [office, setOffice] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<OfficeFieldErrors>({});

  const handleStoreOffice = async (e: FormEvent) => {
    e.preventDefault();

    setErrors({});
    setLoadingStore(true);

    try {
      const res = await OfficeService.storeOffice({
        office,
        description,
      });

      if (res.status === 201) {
        setOffice("");
        setDescription("");
        setErrors({});
        onOfficeAdded(res.data.message);
        refreshKey();
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error("Unexpected error occurred during store office:", error);
      }
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <form onSubmit={handleStoreOffice}>
      <div className="mb-4">
        <FloatingLabelInput
          label="Office Name"
          type="text"
          name="office"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          required
          autofocus
          errors={errors.office}
        />
      </div>

      <div className="mb-4">
        <FloatingLabelInput
          label="Office Description"
          type="text"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          errors={errors.description}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton
          label="Save Office"
          loading={loadingStore}
          loadingLabel="Saving Office"
        />
      </div>
    </form>
  );
};

export default AddOfficeForm;
