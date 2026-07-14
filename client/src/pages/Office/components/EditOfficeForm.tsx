import { useEffect, useState, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import type { OfficeFieldErrors } from "../../../components/Interfaces/OfficeFieldInterfaces";
import { useParams } from "react-router-dom";
import OfficeService from "../../../services/OfficeService";
import Spinner from "../../../components/Spinner/Spinner";

interface EditOfficeFormProps {
  onOfficeUpdated: (message: string) => void;
}

const EditOfficeForm = ({ onOfficeUpdated }: EditOfficeFormProps) => {
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [office, setOffice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<OfficeFieldErrors>({});

  const { office_id } = useParams();

  const handleGetOffice = async (office_id: string | number) => {
    try {
      setLoadingGet(true);

      const res = await OfficeService.getOffice(office_id);

      if (res.status === 200) {
        setOffice(res.data.office.office);
        setDescription(res.data.office.description ?? "");
      } else {
        console.error(
          "Unexpected error status occurred during getting office:",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected error occurred during getting office finally :",
        error,
      );
    } finally {
      setLoadingGet(false);
    }
  };

  const handleUpdateOffice = async (e: FormEvent) => {
    try {
      e.preventDefault();

      setLoadingUpdate(true);

      const res = await OfficeService.updateOffice(office_id!, {
        office,
        description,
      });

      if (res.status === 200) {
        setError({});
        setOffice(res.data.office.office);
        onOfficeUpdated(res.data.message);
      } else {
        console.error(
          "Unexpected status error occurred during updating office: ",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        setError(error.response.data.errors);
      } else {
        console.error(
          "Unexpected server error occurred during updating office: ",
          error,
        );
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  useEffect(() => {
    if (office_id) {
      const parsedOfficeId = parseInt(office_id);
      handleGetOffice(parsedOfficeId);
    } else {
      console.error(
        "Unexpected parameter error occurred during getting office: ",
        office_id,
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
        <form onSubmit={handleUpdateOffice}>
          <div className="mb-4">
            <FloatingLabelInput
              label="Office Name"
              type="text"
              name="office"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              required
              autofocus
              errors={error.office}
            />
          </div>
          <div className="mb-4">
            <FloatingLabelInput
              label="Office Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={error.description}
            />
          </div>
          <div className="flex justify-end gap-2">
            {!loadingUpdate && <BackButton label="Back" path="/offices" />}
            <SubmitButton
              label="Update Office"
              loading={loadingUpdate}
              loadingLabel="Updating Office..."
            />
          </div>
        </form>
      )}
    </>
  );
};

export default EditOfficeForm;
