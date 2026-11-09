import { useEffect, useState, type FC, type FormEvent } from "react";
import { UserRound } from "lucide-react";

import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import DriverService from "../../../services/DriverService";
import type { DriverFieldErrors } from "../../../interfaces/DriverColumns";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import { parseApiErrors } from "../../../interfaces/ApiErrorHelpers";
import {
  buildDriverPayload,
  emptyDriverForm,
  validateDriverForm,
  type DriverFormValues,
} from "../../../interfaces/DriverHelpers";
import DriverFormFields, { DriverFormError } from "./DriverFormFields";

interface AddDriverFormModalProps {
  vehicles: VehicleColumns[];
  onDriverAdded: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: () => void;
}

const AddDriverFormModal: FC<AddDriverFormModalProps> = ({
  vehicles,
  onDriverAdded,
  isOpen,
  onClose,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [form, setForm] = useState<DriverFormValues>(emptyDriverForm);
  const [errors, setErrors] = useState<DriverFieldErrors>({});
  const [serverError, setServerError] = useState("");

  // Start from a clean form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(emptyDriverForm);
      setErrors({});
      setServerError("");
    }
  }, [isOpen]);

  const handleChange = <K extends keyof DriverFormValues>(
    field: K,
    value: DriverFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleStoreDriver = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");

    const validation = validateDriverForm(form);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setLoadingStore(true);
      setErrors({});

      const res = await DriverService.storeDriver(buildDriverPayload(form));

      if (res.status === 201) {
        onDriverAdded(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      const { status, message, fieldErrors } =
        parseApiErrors<DriverFieldErrors>(error, "Failed to save the driver.");

      if (status === 422) {
        setErrors(fieldErrors);
      } else {
        setServerError(message);
      }
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleStoreDriver} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <UserRound className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Driver</h1>
              <p className="mt-1 text-sm text-gray-500">
                Register a driver with their license, usual vehicle and current
                availability.
              </p>
            </div>
          </div>
        </div>

        <DriverFormError message={serverError} />

        <DriverFormFields
          values={form}
          errors={errors}
          vehicles={vehicles}
          onChange={handleChange}
          autoFocus
        />

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}
          <SubmitButton
            label="Save Driver"
            loading={loadingStore}
            loadingLabel="Saving Driver..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddDriverFormModal;
