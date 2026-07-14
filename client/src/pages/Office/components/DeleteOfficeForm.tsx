import { useEffect, useState, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import { useNavigate, useParams } from "react-router-dom";
import OfficeService from "../../../services/OfficeService";
import Spinner from "../../../components/Spinner/Spinner";

const DeleteOfficeForm = () => {
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingDestroy, setLoadingDestroy] = useState(false);
  const [office, setOffice] = useState("");
  const [description, setDescription] = useState("");

  const { office_id } = useParams();
  const navigate = useNavigate();

  const handleGetOffice = async (office_id: string | number) => {
    try {
      setLoadingGet(true);

      const res = await OfficeService.getOffice(office_id);

      if (res.status === 200) {
        setOffice(res.data.office.office);
        setDescription(res.data.office.description || "");
      } else {
        console.error(
          "Unexpected status error occurred during deleting office: ",
          res.status,
        );
      }
    } catch (error) {
      {
        console.error(
          "Unexpected server error occurred during deleting office: ",
          error,
        );
      }
    } finally {
      setLoadingGet(false);
    }
  };

  const handleDestroyOffice = async (e: FormEvent) => {
    try {
      e.preventDefault();

      setLoadingDestroy(true);

      const res = await OfficeService.destroyOffice(office_id!);

      if (res.status === 200) {
        navigate("/offices", { state: { message: res.data.message } });
      } else {
        console.error(
          "Unexpected status error occurred during deleting office: ",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected server error occurred during deleting office : ",
        error,
      );
    } finally {
      setLoadingDestroy(false);
    }
  };

  useEffect(() => {
    if (office_id) {
      const parsedOfficeId = parseInt(office_id);
      handleGetOffice(parsedOfficeId);
    } else {
      console.error(
        "Unexpected parameter error occurred during getting: ",
        office_id,
      );
    }
  }, [office_id]);

  return (
    <>
      {loadingGet ? (
        <div className="flex justify-center items-center mt-52">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleDestroyOffice}>
          <div className="mb-4">
            <FloatingLabelInput
              label="Office"
              type="text"
              name="office"
              value={office}
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
            {!loadingDestroy && <BackButton label="Back" path="/offices" />}
            <SubmitButton
              label="Delete Office"
              className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium border border-red-400 text-red-400 hover:bg-red-500/20 shadow-lg"
              loading={loadingDestroy}
              loadingLabel="Deleting Office..."
            />
          </div>
        </form>
      )}
    </>
  );
};

export default DeleteOfficeForm;
