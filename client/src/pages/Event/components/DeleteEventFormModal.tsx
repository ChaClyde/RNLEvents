import { type FC, type FormEvent, useState } from "react";
import Modal from "../../../components/Modal";
import type { EventColumns } from "../../../interfaces/EventColumns";
import EventService from "../../../services/EventService";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import { Trash2, CalendarDays, MapPin, AlertTriangle } from "lucide-react";

interface DeleteEventFormModalProps {
  event: EventColumns | null;
  onDeleteEvent: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DeleteEventFormModal: FC<DeleteEventFormModalProps> = ({
  event,
  onDeleteEvent,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingDestroy, setLoadingDestroy] = useState(false);

  const handleDestroyEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!event) return;
    try {
      setLoadingDestroy(true);
      const res = await EventService.destroyEvent(event.event_id);
      if (res.status === 200) {
        onDeleteEvent(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setLoadingDestroy(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleDestroyEvent} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-red-500 p-3">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delete Event</h1>
              <p className="text-sm text-gray-500 mt-1">
                This event will be removed from the schedule.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">{event.purpose}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0095D9]/10 px-3 py-1 text-[#0095D9]">
              <MapPin size={14} />
              {event.venue?.venue ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#003B5C]/10 px-3 py-1 text-[#003B5C]">
              <CalendarDays size={14} />
              {event.date_start} – {event.date_end} ({event.number_of_days}{" "}
              {event.number_of_days === 1 ? "day" : "days"})
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This removes the event from the active schedule. This action can
            only be reversed by a system administrator.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          {!loadingDestroy && <CloseButton label="Cancel" onClose={onClose} />}
          <SubmitButton
            label="Delete Event"
            loading={loadingDestroy}
            loadingLabel="Deleting..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default DeleteEventFormModal;
