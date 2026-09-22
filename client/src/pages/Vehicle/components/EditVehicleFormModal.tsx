import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Modal from "../../../components/Modal";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import VehicleService from "../../../services/VehicleService";
import type {
  VehicleColumns,
  VehicleFieldErrors,
} from "../../../interfaces/VehicleColumns";
import { Truck, Camera, X, Pencil } from "lucide-react";

interface EditVehicleFormModalProps {
  vehicle: VehicleColumns | null;
  onVehicleUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const EditVehicleFormModal: FC<EditVehicleFormModalProps> = ({
  vehicle,
  onVehicleUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const [vehicleName, setVehicleName] = useState("");
  const [vehicleMaintenance, setVehicleMaintenance] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("available");

  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(
    null,
  );
  const [removeImage, setRemoveImage] = useState(false);

  const [errors, setErrors] = useState<VehicleFieldErrors>({});

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVehicleImage(file);
    setVehicleImagePreview(file ? URL.createObjectURL(file) : null);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setVehicleImage(null);
    setVehicleImagePreview(null);
    setRemoveImage(true);
  };

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    try {
      setLoadingUpdate(true);
      setErrors({});

      const formData = new FormData();
      formData.append("vehicle_name", vehicleName);
      formData.append("vehicle_maintenance", vehicleMaintenance);
      formData.append("vehicle_type", vehicleType);
      formData.append("capacity", capacity);
      formData.append("status", status);

      if (vehicleImage) {
        formData.append("image_path", vehicleImage);
      } else if (removeImage) {
        formData.append("remove_image", "1");
      }

      const res = await VehicleService.updateVehicle(
        vehicle.vehicle_id,
        formData,
      );

      if (res.status === 200) {
        onVehicleUpdated(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error(error);
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      setVehicleName(vehicle.vehicle_name);
      setVehicleMaintenance(vehicle.vehicle_maintenance ?? "");
      setVehicleType(vehicle.vehicle_type ?? "");
      setCapacity(vehicle.capacity ?? "");
      setStatus(vehicle.status);
      setVehicleImagePreview(
        vehicle.image_path
          ? `${backendUrl}/api/vehicles/getVehicleImage/${vehicle.vehicle_id}`
          : null,
      );
      setVehicleImage(null);
      setRemoveImage(false);
      setErrors({});
    }
  }, [isOpen, vehicle]);

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
              <p className="text-sm text-gray-500 mt-1">
                Update the vehicle's photo and details.
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle Photo */}
        <div>
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#0095D9]/30 bg-[#0095D9]/5">
            {vehicleImagePreview ? (
              <>
                <img
                  src={vehicleImagePreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0095D9] text-white shadow"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#0095D9]/60">
                <Truck size={40} />
                <p className="text-sm font-medium">No photo</p>
              </div>
            )}

            <label
              htmlFor="edit_vehicle_image"
              className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white border-2 border-[#0095D9] text-[#0095D9] transition-all hover:bg-[#0095D9]/10"
            >
              <Camera size={18} />
            </label>

            <input
              id="edit_vehicle_image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          {errors.image_path && (
            <p className="mt-2 text-xs text-red-500">{errors.image_path[0]}</p>
          )}
        </div>

        {/* Vehicle Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Truck size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Vehicle Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Vehicle Name"
              type="text"
              name="vehicle_name"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              errors={errors.vehicle_name}
              required
            />

            <FloatingLabelInput
              label="Maintenance"
              type="text"
              name="vehicle_maintenance"
              value={vehicleMaintenance}
              onChange={(e) => setVehicleMaintenance(e.target.value)}
              errors={errors.vehicle_maintenance}
              required
            />

            <FloatingLabelInput
              label="Vehicle Type"
              type="text"
              name="vehicle_type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              errors={errors.vehicle_type}
            />

            <FloatingLabelInput
              label="Capacity"
              type="text"
              name="capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              errors={errors.capacity}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#0095D9]/10">
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
