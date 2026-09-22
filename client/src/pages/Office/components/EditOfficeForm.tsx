import { useEffect, useState, type FormEvent } from "react";
import BackButton from "../../../components/Button/BackButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import { useParams } from "react-router-dom";
import OfficeService from "../../../services/OfficeService";
import Spinner from "../../../components/Spinner/Spinner";
import type { OfficeFieldErrors } from "../../../interfaces/OfficeColumns";

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
    <div className="flex flex-col gap-6">
      {/* Info Card */}
      <div className="flex items-start gap-4 rounded-xl border border-[#0095D9]/20 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0095D9]/10 text-[#0095D9] ring-1 ring-[#0095D9]/20">
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
              d="M3 21V7a1 1 0 0 1 1-1h6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2h6a1 1 0 0 1 1 1v14M3 21h18M9 9h1m3 0h1m-5 4h1m3 0h1m-5 4h1m3 0h1"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#003B5C]">Edit Office</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Update the office's name and description below.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-[#003B5C] to-[#0095D9]" />

        <div className="border-b border-[#0095D9]/10 px-6 py-4">
          <h3 className="text-base font-semibold text-[#003B5C]">
            Office Information
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Fields marked with an asterisk are required.
          </p>
        </div>

        <div className="px-6 py-6">
          {loadingGet ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <form onSubmit={handleUpdateOffice}>
              <div className="space-y-5">
                <FloatingLabelInput
                  label="Office Name"
                  type="text"
                  name="office"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                  required
                  autoFocus
                  errors={error.office}
                />

                <FloatingLabelInput
                  label="Office Description"
                  type="text"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  errors={error.description}
                />
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#0095D9]/10 pt-5">
                {!loadingUpdate && <BackButton label="Back" path="/offices" />}
                <SubmitButton
                  label="Update Office"
                  loading={loadingUpdate}
                  loadingLabel="Updating Office..."
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditOfficeForm;
