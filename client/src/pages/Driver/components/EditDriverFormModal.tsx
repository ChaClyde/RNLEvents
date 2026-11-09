import { useEffect, useState, type FC, type FormEvent } from "react";
import { Pencil } from "lucide-react";

import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import DriverService from "../../../services/DriverService";
import type {
  DriverColumns,
  DriverFieldErrors,
} from "../../../interfaces/DriverColumns";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import { parseApiErrors } from "../../../interfaces/ApiErrorHelpers";
import {
  buildDriverPayload,
  driverToForm,
  emptyDriverForm,
  validateDriverForm,
  type DriverFormValues,
} from "../../../interfaces/DriverHelpers";
import DriverFormFields, { DriverFormError } from "./DriverFormFields";

interface EditDriverFormModalProps {
  driver: DriverColumns | null;
  vehicles: VehicleColumns[];
  onDriverUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const EditDriverFormModal: FC<EditDriverFormModalProps> = ({
  driver,
  vehicles,
  onDriverUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [form, setForm] = useState<DriverFormValues>(emptyDriverForm);
  const [errors, setErrors] = useState<DriverFieldErrors>({});
  const [serverError, setServerError] = useState("");

  // Load the selected driver into the form each time the modal opens
  useEffect(() => {
    if (isOpen && driver) {
      setForm(driverToForm(driver, vehicles));
      setErrors({});
      setServerError("");
    }
  }, [isOpen, driver, vehicles]);

  const handleChange = <K extends keyof DriverFormValues>(
    field: K,
    value: DriverFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleUpdateDriver = async (e: FormEvent) => {
    e.preventDefault();
    if (!driver) return;

    setServerError("");

    const validation = validateDriverForm(form);

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setLoadingUpdate(true);
      setErrors({});

      const res = await DriverService.updateDriver(
        driver.driver_id,
        buildDriverPayload(form),
      );

      if (res.status === 200) {
        onDriverUpdated(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      const { status, message, fieldErrors } =
        parseApiErrors<DriverFieldErrors>(
          error,
          "Failed to update the driver.",
        );

      if (status === 422) {
        setErrors(fieldErrors);
      } else {
        setServerError(message);
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  if (!driver) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleUpdateDriver} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Pencil className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Edit Driver</h1>
              <p className="mt-1 text-sm text-gray-500">
                Update this driver's information and availability.
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
        />

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingUpdate && <CloseButton label="Close" onClose={onClose} />}
          <SubmitButton
            label="Update Driver"
            loading={loadingUpdate}
            loadingLabel="Updating Driver..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditDriverFormModal;
