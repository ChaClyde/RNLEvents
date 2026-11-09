import type { FC } from "react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import type { EventColumns } from "../../../interfaces/EventColumns";
import {
  CalendarDays,
  MapPin,
  Package,
  User,
  Mail,
  Phone,
  Building2,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react";

interface ViewEventFormModalProps {
  event: EventColumns | null;
  isOpen: boolean;
  onClose: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const ViewEventFormModal: FC<ViewEventFormModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!event) return null;

  const ChecklistRow = ({
    label,
    checked,
  }: {
    label: string;
    checked: boolean;
  }) => (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium
        ${
          checked
            ? "border-[#0095D9] bg-[#0095D9]/10 text-[#0095D9]"
            : "border-gray-200 bg-gray-50 text-gray-400"
        }`}
    >
      {checked ? <CheckSquare size={16} /> : <Square size={16} />}
      {label}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">
                {event.purpose}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Event details</p>
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-white">
          <div className="h-48 w-full bg-gray-100">
            {event.venue?.venue_image ? (
              <img
                src={`${backendUrl}/api/venues/getVenueImage/${event.venue.venue_id}`}
                alt={event.venue.venue}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <MapPin size={40} />
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} className="text-[#0095D9]" />
              Venue
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {event.venue?.venue ?? "—"}
            </p>
            {event.venue?.location && (
              <p className="text-sm text-gray-500">{event.venue.location}</p>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={18} className="text-[#0095D9]" />
            <h3 className="font-semibold text-[#003B5C]">Schedule</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase">Date Start</p>
              <p className="mt-1 font-medium text-gray-900">
                {event.date_start}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Date End</p>
              <p className="mt-1 font-medium text-gray-900">{event.date_end}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Time Start</p>
              <p className="mt-1 font-medium text-gray-900">
                {event.time_start}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase">Time End</p>
              <p className="mt-1 font-medium text-gray-900">{event.time_end}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#0095D9]/20 bg-[#0095D9]/5 px-4 py-2.5 text-sm text-[#003B5C]">
            Duration:{" "}
            <span className="font-semibold">
              {event.number_of_days}{" "}
              {event.number_of_days === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Things Needed */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Package size={18} className="text-[#003B5C]" />
            <h3 className="font-semibold text-[#003B5C]">Things Needed</h3>
          </div>

          <div className="mb-4 text-sm">
            <p className="text-gray-500 text-xs uppercase">No. of Chairs</p>
            <p className="mt-1 font-medium text-gray-900">{event.chairs}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ChecklistRow
              label="Lights & Sounds"
              checked={event.lights_and_sounds}
            />
            <ChecklistRow label="Piano" checked={event.piano} />
            <ChecklistRow
              label="Multi-Media Projector"
              checked={event.multimedia_projector}
            />
            <ChecklistRow
              label="HVLS Electric Fan"
              checked={event.hvls_electric_fan}
            />
          </div>

          {event.others_specify && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
              Others:{" "}
              <span className="font-medium">{event.others_specify}</span>
              {event.others_quantity ? ` (Qty: ${event.others_quantity})` : ""}
            </div>
          )}
        </div>

        {/* Requestor */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <User size={18} className="text-[#0095D9]" />
            <h3 className="font-semibold text-[#003B5C]">
              Requestor Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <User size={14} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Requested By</p>
                <p className="text-gray-900 font-medium">
                  {event.requested_by}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building2 size={14} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Office</p>
                <p className="text-gray-900 font-medium">
                  {event.office?.office_name ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mail size={14} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Email</p>
                <p className="text-gray-900 font-medium">{event.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone size={14} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Tel. Number</p>
                <p className="text-gray-900 font-medium">{event.tel_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#0095D9]/10 pt-6">
          <CloseButton label="Close" onClose={onClose} />
        </div>
      </div>
    </Modal>
  );
};

export default ViewEventFormModal;
