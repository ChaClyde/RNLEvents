import { useEffect, useState, type FC, type FormEvent } from "react";
import Modal from "../../../components/Modal";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import type {
  DriverColumns,
  DriverFieldErrors,
} from "../../../interfaces/DriverColumns";
import { Pencil, ClipboardList } from "lucide-react";
import DriverService from "../../../services/DriverService";

interface EditDriverFormModalProps {
  driver: DriverColumns | null;
  onDriverUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

type DriverStatus = "Available" | "On Leave" | "Sick Leave" | "Unavailable";

const EditDriverFormModal: FC<EditDriverFormModalProps> = ({
  driver,
  onDriverUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("Available");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [errors, setErrors] = useState<DriverFieldErrors>({});

  useEffect(() => {
    if (isOpen && driver) {
      setDriverName(driver.driver_name);
      setDriverStatus(driver.driver_status);
      setStatusRemarks(driver.status_remarks ?? "");
      setErrors({});
    }
  }, [isOpen, driver]);

  const handleUpdateDriver = async (e: FormEvent) => {
    e.preventDefault();
    if (!driver) return;

    try {
      setLoadingUpdate(true);

      const payload = {
        driver_name: driverName,
        driver_status: driverStatus,
        status_remarks: statusRemarks || null,
      };

      const res = await DriverService.updateDriver(driver.driver_id, payload);

      if (res.status === 200) {
        onDriverUpdated(res.data.message);
        refreshKey();
        onClose();
      } else {
        console.error(
          "Unexpected status error occurred during updating driver:",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error(
          "Unexpected server error occurred during updating driver:",
          error,
        );
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
              <p className="text-sm text-gray-500 mt-1">
                Update this driver's information and availability.
              </p>
            </div>
          </div>
        </div>

        {/* Driver Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">Driver Information</h2>
          </div>

          <div className="space-y-4">
            <FloatingLabelInput
              label="Driver Name"
              type="text"
              name="driver_name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              errors={errors.driver_name}
              required
              autoFocus
            />

            <FloatingLabelSelect
              label="Status"
              name="driver_status"
              value={driverStatus}
              onChange={(e) => setDriverStatus(e.target.value as DriverStatus)}
              errors={errors.driver_status}
            >
              <option value="Available">Available</option>
              <option value="On Leave">On Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Unavailable">Unavailable</option>
            </FloatingLabelSelect>

            {driverStatus !== "Available" && (
              <FloatingLabelInput
                label="Remarks (reason / notes)"
                type="text"
                name="status_remarks"
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                errors={errors.status_remarks}
              />
            )}
          </div>
        </div>

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
