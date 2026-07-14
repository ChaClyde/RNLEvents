// import { useState, type FC, type FormEvent } from "react";
// import SubmitButton from "../../../components/Button/SubmitButton";
// import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
// import OfficeService from "../../../services/OfficeService";
// import type { OfficeFieldErrors } from "../../../components/Interfaces/OfficeFieldInterfaces";

// interface AddOfficeFormProps {
//   onOfficeAdded: (message: string) => void;
//   refreshKey?: () => void;
// }

// const AddOfficeForm: FC<AddOfficeFormProps> = ({
//   onOfficeAdded,
//   refreshKey,
// }) => {
//   const [loadingStore, setLoadingStore] = useState(false);
//   const [office, setOffice] = useState("");
//   const [description, setDescription] = useState("");
//   const [errors, setErrors] = useState<OfficeFieldErrors>({});

//   const handleStoreOffice = async (e: FormEvent) => {
//     e.preventDefault();

//     setErrors({});
//     setLoadingStore(true);

//     try {
//       const res = await OfficeService.storeOffice({
//         office,
//         description,
//       });

//       if (res.status === 201) {
//         setOffice("");
//         setDescription("");
//         setErrors({});
//         onOfficeAdded(res.data.message);
//         refreshKey();
//       }
//     } catch (error: any) {
//       if (error.response?.status === 422) {
//         setErrors(error.response.data.errors);
//       } else {
//         console.error("Unexpected error occurred during store office:", error);
//       }
//     } finally {
//       setLoadingStore(false);
//     }
//   };

//   return (
//     <form onSubmit={handleStoreOffice}>
//       <div className="mb-4">
//         <FloatingLabelInput
//           label="Office Name"
//           type="text"
//           name="office"
//           value={office}
//           onChange={(e) => setOffice(e.target.value)}
//           required
//           autofocus
//           errors={errors.office}
//         />
//       </div>

//       <div className="mb-4">
//         <FloatingLabelInput
//           label="Office Description"
//           type="text"
//           name="description"
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           errors={errors.description}
//         />
//       </div>

//       <div className="flex justify-end">
//         <SubmitButton
//           label="Save Office"
//           loading={loadingStore}
//           loadingLabel="Saving Office"
//         />
//       </div>
//     </form>
//   );
// };

// export default AddOfficeForm;

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
    try {
      e.preventDefault();

      setLoadingStore(true);

      const res = await OfficeService.storeOffice({
        office,
        description,
      });

      if (res.status === 201) {
        setOffice("");
        setDescription("");
        setErrors({});

        onOfficeAdded(res.data.message);
        refreshKey?.();
      } else {
        console.error(
          "Unexpected status error occurred during storing office:",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error(
          "Unexpected server error occurred during storing office:",
          error,
        );
      }
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Info Card */}
      <div className="flex items-start gap-4 rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-100">
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
          <h3 className="text-lg font-semibold text-emerald-900">
            Office Management
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Create and manage offices within your organization. Offices can be
            assigned users, vehicles, events, and other system resources.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
        <div className="l-1 bg-emerald-500 border border-emerald-300" />

        <div className="border border-emerald-50 px-6 py-4">
          <h3 className="text-base font-semibold text-emerald-900">
            Enter Office Information
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Fields marked with an asterisk are required.
          </p>
        </div>

        <form onSubmit={handleStoreOffice} className="px-6 py-6">
          <div className="space-y-5">
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

            <FloatingLabelInput
              label="Office Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={errors.description}
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-emerald-50 pt-5">
            <SubmitButton
              label="Save Office"
              loading={loadingStore}
              loadingLabel="Saving Office..."
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOfficeForm;
