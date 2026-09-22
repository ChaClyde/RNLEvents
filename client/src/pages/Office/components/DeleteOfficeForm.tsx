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
    <div className="flex flex-col gap-6">
      {/* Warning Card */}
      <div className="flex items-start gap-4 rounded-xl border border-red-100 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-900">Delete Office</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            This action cannot be undone. Deleting this office may affect users,
            vehicles, events, and other resources assigned to it.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <div className="h-1 bg-red-500" />

        <div className="border-b border-red-50 px-6 py-4">
          <h3 className="text-base font-semibold text-red-900">
            Confirm Office Details
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Review the details below before deleting.
          </p>
        </div>

        <div className="px-6 py-6">
          {loadingGet ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <form onSubmit={handleDestroyOffice}>
              <div className="space-y-5">
                <FloatingLabelInput
                  label="Office"
                  type="text"
                  name="office"
                  value={office}
                  readOnly
                />

                <FloatingLabelInput
                  label="Description"
                  type="text"
                  name="description"
                  value={description}
                  readOnly
                />
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-red-50 pt-5">
                {!loadingDestroy && <BackButton label="Back" path="/offices" />}
                <SubmitButton
                  label="Delete Office"
                  className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-medium border border-red-400 text-red-500 hover:bg-red-500/20 shadow-sm"
                  loading={loadingDestroy}
                  loadingLabel="Deleting Office..."
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteOfficeForm;
