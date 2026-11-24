import { useEffect, useState, type FC } from "react";
import Modal from "../../../components/Modal";
import type { EventColumns, EventLetter } from "../../../interfaces/EventColumns";
import EventBookingService from "../../../services/EventBookingService";
import {
  CalendarDays,
  Download,
  Eye,
  Mail,
  MapPin,
  Phone,
  Printer,
  User,
  Building2,
  Clock,
} from "lucide-react";

interface ViewEventFormModalProps {
  event: EventColumns | null;
  isOpen: boolean;
  onClose: () => void;
}

const dateKey = (value?: string | null): string => (value ?? "").slice(0, 10);

const formatDate = (value?: string | null): string => {
  const key = dateKey(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatClock = (value?: string | null): string => {
  if (!value) return "—";
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return value;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatApproved = (value?: string | null): string => {
  if (!value) return "Approval time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-[#0095D9]">
      {label}
    </p>
    <p className="mt-1 text-sm text-[#003B5C] dark:text-white">{value}</p>
  </div>
);

interface DocumentActionsProps {
  title: string;
  filename: string;
  mimeType?: string | null;
  disabled?: boolean;
  emptyText?: string;
  onOpen: (mode: "preview" | "download" | "print") => Promise<Blob>;
}

const DocumentActions: FC<DocumentActionsProps> = ({
  title,
  filename,
  mimeType,
  disabled,
  emptyText,
  onOpen,
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const open = async (mode: "preview" | "download" | "print") => {
    setError(null);
    setBusy(true);
    try {
      const blob = await onOpen(mode);
      const type = blob.type || mimeType || "application/octet-stream";
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (mode === "print") {
        const popup = window.open(url);
        popup?.addEventListener("load", () => popup.print());
        return;
      }

      setPreviewType(type);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
    } catch {
      setError(`Unable to open the ${title.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  };

  const buttonClass =
    "inline-flex items-center gap-2 rounded-lg border border-[#0095D9]/30 px-3 py-2 text-sm font-semibold text-[#003B5C] disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-[#003B5C] dark:text-white">{title}</h3>
      {disabled ? (
        <p className="mt-2 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-500">{filename}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void open("preview")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0095D9] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void open("print")}
              className={buttonClass}
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void open("download")}
              className={buttonClass}
            >
              <Download size={16} />
              Download
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {previewUrl && (
            <div className="mt-3 h-96 overflow-hidden rounded-xl border border-[#0095D9]/20 bg-gray-50">
              {previewType.startsWith("image/") ? (
                <img src={previewUrl} alt={filename} className="h-full w-full object-contain" />
              ) : (
                <iframe title={filename} src={previewUrl} className="h-full w-full" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ViewEventFormModal: FC<ViewEventFormModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!event) return null;

  const schedule =
    dateKey(event.date_start) === dateKey(event.date_end)
      ? formatDate(event.date_start)
      : `${formatDate(event.date_start)} – ${formatDate(event.date_end)}`;
  const letters = event.letters ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton className="!max-w-4xl">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#003B5C] to-[#0095D9] p-3">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white">
                Event Details
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Approved {formatApproved(event.approved_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-[#003B5C] dark:text-white">
            {event.purpose}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Detail label="Venue" value={event.venue?.venue ?? "—"} />
            <Detail label="Office" value={event.office?.office_name ?? "—"} />
            <Detail label="Schedule" value={schedule} />
            <Detail
              label="Time"
              value={`${formatClock(event.time_start)} – ${formatClock(event.time_end)}`}
            />
            <Detail label="Requested by" value={event.requested_by || "—"} />
            <Detail label="Email" value={event.email || "—"} />
            <Detail label="Telephone" value={event.tel_number || "—"} />
            <Detail
              label="Days"
              value={String(event.number_of_days ?? "—")}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {event.venue?.venue ?? "No venue"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 size={12} /> {event.office?.office_name ?? "No office"}
            </span>
            <span className="inline-flex items-center gap-1">
              <User size={12} /> {event.requested_by}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail size={12} /> {event.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone size={12} /> {event.tel_number}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {formatApproved(event.approved_at)}
            </span>
          </div>
        </div>

        <DocumentActions
          title="Event booking"
          filename={`FCU-Event-Booking-Slip-${event.event_booking_id ?? "record"}.pdf`}
          mimeType="application/pdf"
          disabled={!event.event_booking_id}
          emptyText="This event has no booking slip attached."
          onOpen={async (mode) => {
            const response =
              mode === "download"
                ? await EventBookingService.downloadBookingSlip(event.event_booking_id!)
                : await EventBookingService.previewBookingSlip(event.event_booking_id!);
            return new Blob([response.data], { type: "application/pdf" });
          }}
        />

        {letters.length === 0 ? (
          <DocumentActions
            title="Letter of request"
            filename=""
            disabled
            emptyText="No letter of request is attached."
            onOpen={async () => new Blob()}
          />
        ) : (
          letters.map((letter: EventLetter) => (
            <DocumentActions
              key={letter.attachment_id}
              title="Letter of request"
              filename={letter.original_filename}
              mimeType={letter.mime_type}
              onOpen={async (mode) => {
                const response =
                  mode === "download"
                    ? await EventBookingService.downloadAttachment(
                        event.event_booking_id!,
                        letter.attachment_id,
                      )
                    : await EventBookingService.previewAttachment(
                        event.event_booking_id!,
                        letter.attachment_id,
                      );
                return new Blob([response.data], {
                  type: letter.mime_type || response.data.type || "application/octet-stream",
                });
              }}
            />
          ))
        )}
      </div>
    </Modal>
  );
};

export default ViewEventFormModal;
