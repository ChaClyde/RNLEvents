import { useEffect, useState, type FC, type FormEvent } from "react";
import { Pencil } from "lucide-react";

import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import VehicleService from "../../../services/VehicleService";
import type {
  VehicleColumns,
  VehicleFieldErrors,
} from "../../../interfaces/VehicleColumns";
import {
  buildVehicleFormData,
  emptyVehicleForm,
  parseVehicleError,
  vehicleToForm,
  type VehicleFormValues,
} from "../../../interfaces/VehicleHelpers";
import VehicleFormFields, {
  VehicleFormError,
  VehiclePhotoPicker,
} from "./VehicleFormFields";

interface EditVehicleFormModalProps {
  vehicle: VehicleColumns | null;
  onVehicleUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const EditVehicleFormModal: FC<EditVehicleFormModalProps> = ({
  vehicle,
  onVehicleUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [form, setForm] = useState<VehicleFormValues>(emptyVehicleForm);
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [serverError, setServerError] = useState("");

  // Load the selected vehicle into the form each time the modal opens
  useEffect(() => {
    if (isOpen && vehicle) {
      setForm(vehicleToForm(vehicle));
      setImage(null);
      setRemoveImage(false);
      setErrors({});
      setServerError("");
    }
  }, [isOpen, vehicle]);

  const handleChange = <K extends keyof VehicleFormValues>(
    field: K,
    value: VehicleFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    try {
      setLoadingUpdate(true);
      setErrors({});
      setServerError("");

      const res = await VehicleService.updateVehicle(
        vehicle.vehicle_id,
        buildVehicleFormData(form, image, removeImage),
      );

      if (res.status === 200) {
        onVehicleUpdated(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      const { status, message, fieldErrors } = parseVehicleError(
        error,
        "Failed to update the vehicle.",
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

  if (!vehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleUpdateVehicle} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Pencil className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">
                Edit Vehicle
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Update the vehicle's photo and details.
              </p>
            </div>
          </div>
        </div>

        <VehicleFormError message={serverError} />

        <VehiclePhotoPicker
          inputId="edit_vehicle_image"
          file={image}
          existingUrl={vehicle.image_url}
          removeExisting={removeImage}
          onFileChange={setImage}
          onRemoveExistingChange={setRemoveImage}
          error={errors.image_path?.[0]}
        />

        <VehicleFormFields
          values={form}
          errors={errors}
          onChange={handleChange}
        />

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-4">
          {!loadingUpdate && <CloseButton label="Close" onClose={onClose} />}

          <SubmitButton
            label="Update Vehicle"
            loading={loadingUpdate}
            loadingLabel="Updating Vehicle..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditVehicleFormModal;
