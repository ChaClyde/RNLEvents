import { useEffect, useState, type FC, type FormEvent } from "react";
import { Truck } from "lucide-react";

import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import VehicleService from "../../../services/VehicleService";
import type { VehicleFieldErrors } from "../../../interfaces/VehicleColumns";
import {
  buildVehicleFormData,
  emptyVehicleForm,
  parseVehicleError,
  type VehicleFormValues,
} from "../../../interfaces/VehicleHelpers";
import VehicleFormFields, {
  VehicleFormError,
  VehiclePhotoPicker,
} from "./VehicleFormFields";

interface AddVehicleFormModalProps {
  onVehicleAdded: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: () => void;
}

const AddVehicleFormModal: FC<AddVehicleFormModalProps> = ({
  onVehicleAdded,
  isOpen,
  onClose,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [form, setForm] = useState<VehicleFormValues>(emptyVehicleForm);
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [serverError, setServerError] = useState("");

  // Start from a clean form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(emptyVehicleForm);
      setImage(null);
      setErrors({});
      setServerError("");
    }
  }, [isOpen]);

  const handleChange = <K extends keyof VehicleFormValues>(
    field: K,
    value: VehicleFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleStoreVehicle = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoadingStore(true);
      setErrors({});
      setServerError("");

      const res = await VehicleService.storeVehicle(
        buildVehicleFormData(form, image),
      );

      if (res.status === 201) {
        onVehicleAdded(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      const { status, message, fieldErrors } = parseVehicleError(
        error,
        "Failed to create the vehicle.",
      );

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
      <form onSubmit={handleStoreVehicle} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Truck className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Vehicle</h1>
              <p className="mt-1 text-sm text-gray-500">
                Add a vehicle with its photo, seating capacity and person in
                charge so it can be picked when booking a trip.
              </p>
            </div>
          </div>
        </div>

        <VehicleFormError message={serverError} />

        <VehiclePhotoPicker
          inputId="add_vehicle_image"
          file={image}
          onFileChange={setImage}
          error={errors.image_path?.[0]}
        />

        <VehicleFormFields
          values={form}
          errors={errors}
          onChange={handleChange}
          autoFocus
        />

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Create Vehicle"
            loading={loadingStore}
            loadingLabel="Creating Vehicle..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddVehicleFormModal;
