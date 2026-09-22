import { type FC, type FormEvent, useState } from "react";
import Modal from "../../../components/Modal";
import type { DriverColumns } from "../../../interfaces/DriverColumns";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import { Trash2, AlertTriangle, UserRound } from "lucide-react";
import DriverService from "../../../services/DriverService";

interface DeleteDriverFormModalProps {
  driver: DriverColumns | null;
  onDeleteDriver: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteDriverFormModal: FC<DeleteDriverFormModalProps> = ({
  driver,
  onDeleteDriver,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);

  const handleDestroyDriver = async (e: FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    try {
      setLoadingDestroy(true);
      const res = await DriverService.destroyDriver(driver.driver_id);
      if (res.status === 200) {
        onDeleteDriver(res.data.message);
        refreshKey();
        onClose();
      } else {
        console.error("Unexpected error:", res.status);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setLoadingDestroy(false);
    }
  };

  if (!isOpen || !driver) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleDestroyDriver} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delete Driver
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                This driver will be moved to Trash and can be restored later.
              </p>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-400 text-white">
              <UserRound size={32} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              {driver.driver_name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Current status:{" "}
              <span className="font-medium">{driver.driver_status}</span>
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This moves the driver to Trash Bin — they'll be removed from active
            assignments, but you can restore or permanently delete them from
            there.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          {!loadingDestroy && <CloseButton label="Cancel" onClose={onClose} />}
          <SubmitButton
            label="Move to Trash"
            loading={loadingDestroy}
            loadingLabel="Deleting..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default DeleteDriverFormModal;
