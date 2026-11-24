import { useEffect, useState } from "react";
import { FiFile, FiDownload, FiPrinter } from "react-icons/fi";
import {
  FiX,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiUser,
  FiPackage,
  FiClock,
  FiMail,
  FiPhone,
  FiCheckCircle,
} from "react-icons/fi";

import type {
  EventBookingColumns,
  EventBookingFeeLine,
} from "../../../interfaces/EventBookingColumns";
import EventBookingService from "../../../services/EventBookingService";
import SignatureService from "../../../services/SignatureService";
import { Link } from "react-router-dom";

const feeCategory = (type: string) => {
  switch (type) {
    case "venue":
      return "Base facility rental";
    case "overtime":
      return "Overtime";
    case "facility":
      return "Additional facility charges";
    case "equipment":
      return "Equipment charges";
    case "service":
      return "Additional service charges";
    default:
      return "Additional charges";
  }
};

const feeGroups = (lines: EventBookingFeeLine[]) => {
  const order = ["venue", "overtime", "facility", "equipment", "service", "additional"];
  const totals = new Map<string, number>();
  lines.forEach((line) => {
    const type = order.includes(line.line_type) ? line.line_type : "additional";
    totals.set(type, (totals.get(type) ?? 0) + Number(line.line_amount));
  });
  return order
    .filter((type) => totals.has(type))
    .map((type) => ({
      category: feeCategory(type),
      amount: (totals.get(type) ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }));
};

const isFcuGym = (name?: string | null) => {
  const normalized = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalized === "fcu gym" || normalized === "gym";
};
import {
  EVENT_APPROVAL_PIPELINE,
  getApprovalStageLabel,
  getLifecycleLabel,
  getStatusLabel,
  getStatusStyle,
} from "../../../interfaces/EventBookingHelpers";
import {
  formatShortDate,
  getScheduleSummary,
  groupSchedules,
} from "../../../interfaces/EventBookingSchedule";

interface EventBookingViewProps {
  booking: EventBookingColumns;
  onClose: () => void;
  canApprove?: boolean;
  canCancel?: boolean;
  isActing?: boolean;
  onApprove?: (remarks: string) => Promise<void> | void;
  onReject?: (remarks: string) => Promise<void> | void;
  onCancel?: (reason: string) => Promise<void> | void;
}

const sectionClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900";

const sectionTitleClass =
  "mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white";

const labelClass = "text-xs text-gray-400";

const valueClass =
  "mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200";

const EventBookingView = ({
  booking,
  onClose,
  canApprove = false,
  canCancel = false,
  isActing = false,
  onApprove,
  onReject,
  onCancel,
}: EventBookingViewProps) => {
  const resources = booking.resources ?? [];
  const approvals = booking.approvals ?? [];
  const scheduleSummary = getScheduleSummary(booking);
  const scheduleGroups = groupSchedules(booking);
  const currentIndex = EVENT_APPROVAL_PIPELINE.findIndex(
    (stage) => stage === booking.approval_stage,
  );

  const [remarks, setRemarks] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [slipError, setSlipError] = useState("");
  const [needsSignature, setNeedsSignature] = useState(false);
  const [requesterSignatureUrl, setRequesterSignatureUrl] = useState("");
  const letter = booking.attachments?.[0] ?? null;

  useEffect(() => {
    if (!canApprove) return;
    void SignatureService.show()
      .then((response) => setNeedsSignature(!response.data.data.has_signature))
      .catch(() => setNeedsSignature(false));
  }, [canApprove]);

  useEffect(() => {
    if (!booking.has_requester_signature) return;
    let url = "";
    void EventBookingService.requesterSignature(booking.event_booking_id)
      .then((response) => {
        url = URL.createObjectURL(response.data);
        setRequesterSignatureUrl(url);
      })
      .catch(() => setRequesterSignatureUrl(""));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [booking.event_booking_id, booking.has_requester_signature]);

  const openLetter = async (mode: "preview" | "download" | "print") => {
    if (!letter) return;
    setAttachmentError("");

    try {
      const response =
        mode === "download"
          ? await EventBookingService.downloadAttachment(
              booking.event_booking_id,
              letter.attachment_id,
            )
          : await EventBookingService.previewAttachment(
              booking.event_booking_id,
              letter.attachment_id,
            );
      const blob = new Blob([response.data], {
        type: letter.mime_type || response.data.type,
      });
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = letter.original_filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (mode === "print") {
        const popup = window.open(url);
        popup?.addEventListener("load", () => popup.print());
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch {
      setAttachmentError("Unable to open the letter of request.");
    }
  };

  const openSlip = async (mode: "preview" | "download" | "print") => {
    setSlipError("");

    try {
      const response =
        mode === "download"
          ? await EventBookingService.downloadBookingSlip(booking.event_booking_id)
          : await EventBookingService.previewBookingSlip(booking.event_booking_id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `FCU-Event-Booking-Slip-${booking.event_booking_id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const popup = window.open(url);
      if (mode === "print") {
        popup?.addEventListener("load", () => popup.print());
      }
    } catch {
      setSlipError("Unable to open the booking slip.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl dark:bg-gray-950">
        <div className="bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70">
                Booking #{booking.event_booking_id}
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                {booking.purpose}
              </h2>

              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
                <FiMapPin className="shrink-0" />
                <span className="truncate">
                  {booking.venue?.venue ?? "Venue unavailable"}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${getStatusStyle(
                  booking.status,
                )}`}
              >
                {getLifecycleLabel(booking)}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-white transition hover:bg-white/20"
                aria-label="Close"
              >
                <FiX size={21} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiFile className="text-[#0095D9]" size={20} />
              Event Booking Slip
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Printable record of this booking and its approval history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openSlip("preview")}
                className="rounded-xl bg-[#00679E] px-3 py-2 text-sm font-semibold text-white"
              >
                Preview slip
              </button>
              <button
                type="button"
                onClick={() => void openSlip("download")}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                <FiDownload size={14} /> Download PDF
              </button>
              <button
                type="button"
                onClick={() => void openSlip("print")}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                <FiPrinter size={14} /> Print slip
              </button>
            </div>
            {slipError ? (
              <p className="mt-2 text-sm text-red-600">{slipError}</p>
            ) : null}
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiCheckCircle className="text-[#0095D9]" size={20} />
              Approval Progress
            </h3>

            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {EVENT_APPROVAL_PIPELINE.map((stage, index) => {
                const decided = stageDecision(approvals, stage);
                const isCurrent =
                  booking.status === "pending" &&
                  booking.approval_stage === stage;
                const rejected =
                  decided?.action === "rejected" ||
                  (booking.status === "rejected" &&
                    booking.approval_stage === stage);
                const approved =
                  booking.status === "approved" &&
                  currentIndex >= 0 &&
                  index <= currentIndex;
                const completed =
                  !rejected &&
                  (decided?.action === "approved" ||
                    approved ||
                    (booking.status === "pending" &&
                      currentIndex >= 0 &&
                      index < currentIndex));
                const state = rejected
                  ? "rejected"
                  : approved && index === currentIndex
                    ? "approved"
                    : completed
                      ? "completed"
                      : isCurrent
                        ? "current"
                        : "pending";

                return (
                  <li
                    key={stage}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      state === "rejected"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                        : state === "completed" || state === "approved"
                          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                          : state === "current"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                            : "border-gray-200 text-gray-500 dark:border-gray-700"
                    }`}
                  >
                    <p className="font-semibold">Step {index + 1}</p>
                    <p className="mt-1 leading-snug">
                      {getApprovalStageLabel(stage).replace("Pending ", "")}
                    </p>
                    <p className="mt-1 capitalize">{state}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiCalendar className="text-[#0095D9]" size={20} />
              Event Details
            </h3>

            <p className="text-lg font-semibold text-gray-800 dark:text-white">
              {booking.purpose}
            </p>

            {booking.description ? (
              <p className="mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">
                {booking.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No description provided.
              </p>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiClock className="text-[#0095D9]" size={20} />
              Event Schedule
            </h3>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Pattern</p>
                <p className={valueClass}>{scheduleSummary.dateText}</p>
              </div>

              <div>
                <p className={labelClass}>Total</p>
                <p className={valueClass}>
                  {scheduleSummary.count}{" "}
                  {scheduleSummary.count === 1 ? "date" : "dates"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {scheduleGroups.map((group) => (
                <div
                  key={group.label}
                  className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"
                >
                  <p className="text-sm font-semibold text-[#00679E] dark:text-[#38BDF8]">
                    {group.label}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.dates.map((date) => (
                      <span
                        key={date}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        {formatShortDate(date)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiMapPin className="text-[#0095D9]" size={20} />
              Venue Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className={labelClass}>Venue</p>
                <p className={valueClass}>
                  {booking.venue?.venue ?? "Not available"}
                </p>
              </div>

              <div>
                <p className={labelClass}>Location</p>
                <p className={valueClass}>
                  {booking.venue?.location ?? "Not available"}
                </p>
              </div>

              <div>
                <p className={labelClass}>Capacity</p>
                <p className={valueClass}>
                  {booking.venue?.capacity != null
                    ? `${booking.venue.capacity.toLocaleString()} persons`
                    : "Not available"}
                </p>
              </div>
            </div>
          </section>

          {isFcuGym(booking.venue?.venue) && (
            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>
                <FiCheckCircle className="text-[#0095D9]" size={20} />
                FCU Gym policy
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Responsibility acknowledgment</p>
                  <p className={valueClass}>
                    {booking.gym_responsibilities_acknowledged
                      ? "Acknowledged"
                      : "Not acknowledged"}
                  </p>
                  {booking.gym_responsibility_statement && (
                    <p className={`${labelClass} mt-1`}>
                      {booking.gym_responsibility_statement}
                    </p>
                  )}
                </div>
                <div>
                  <p className={labelClass}>Reservation length</p>
                  <p className={valueClass}>
                    {booking.reservation_span === "whole_semester"
                      ? "Whole semester"
                      : booking.reservation_span === "whole_summer"
                        ? "Whole summer"
                        : "Not recorded as a whole-semester or whole-summer reservation"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className={labelClass}>University-wide activity</p>
                  <p className={valueClass}>
                    {booking.university_wide_activity
                      ? `Designated by ${
                          booking.university_wide_designator?.full_name ||
                          [
                            booking.university_wide_designator?.first_name,
                            booking.university_wide_designator?.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Authorized person not recorded"
                        }${
                          booking.university_wide_designated_at
                            ? ` on ${booking.university_wide_designated_at}`
                            : ""
                        }`
                      : "Not designated"}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiFile className="text-[#0095D9]" size={20} />
              Fee breakdown
            </h3>
            {!booking.fee_snapshot && (
              <p className={valueClass}>No fee breakdown is recorded on this booking.</p>
            )}
            {booking.fee_snapshot && !booking.fee_snapshot.total_amount && (
              <p className={valueClass}>
                {booking.fee_snapshot.calculation_note ??
                  "No applicable venue rate was configured when this booking was submitted."}
              </p>
            )}
            {booking.fee_snapshot?.lines && booking.fee_snapshot.lines.length > 0 && (
              <div className="space-y-2">
                {feeGroups(booking.fee_snapshot.lines).map((group) => (
                  <p key={group.category} className="flex justify-between gap-3 text-sm font-medium text-gray-800 dark:text-gray-100">
                    <span>{group.category}</span>
                    <span>{group.amount}</span>
                  </p>
                ))}
                {booking.fee_snapshot.lines.map((line, index) => (
                  <div key={`${line.label}-${index}`} className="flex justify-between gap-3 text-sm">
                    <span className={labelClass}>
                      {feeCategory(line.line_type)} · {line.label}
                      {line.schedule_date ? ` · ${line.schedule_date}` : ""}
                      {` · ${line.quantity} ${line.unit} at ${line.unit_amount}`}
                    </span>
                    <span className={valueClass}>{line.line_amount}</span>
                  </div>
                ))}
                <p className="font-semibold text-gray-900 dark:text-white">
                  Grand total {booking.fee_snapshot.total_amount ?? "Not recorded"}
                </p>
                {booking.fee_snapshot.calculation_confirmed_at && (
                  <p className={labelClass}>Calculation confirmed by Admin Approvals.</p>
                )}
                {booking.fee_snapshot.calculation_note && (
                  <p className={labelClass}>{booking.fee_snapshot.calculation_note}</p>
                )}
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiFile className="text-[#0095D9]" size={20} />
              Letter of Request
            </h3>
            {letter ? (
              <div className="space-y-3">
                <p className={valueClass}>{letter.original_filename}</p>
                <p className={labelClass}>
                  {(letter.file_size / 1024).toFixed(1)} KB
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openLetter("preview")}
                    className="rounded-xl bg-[#00679E] px-3 py-2 text-sm font-semibold text-white"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void openLetter("download")}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
                  >
                    <FiDownload size={14} /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void openLetter("print")}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
                  >
                    <FiPrinter size={14} /> Print
                  </button>
                </div>
                {previewUrl ? (
                  letter.mime_type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt="Letter of request"
                      className="max-h-80 rounded-lg border border-gray-200"
                    />
                  ) : (
                    <iframe
                      title="Letter of request"
                      src={previewUrl}
                      className="h-80 w-full rounded-lg border border-gray-200"
                    />
                  )
                ) : null}
                {attachmentError ? (
                  <p className="text-sm text-red-600">{attachmentError}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No letter was attached.</p>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiUsers className="text-[#0095D9]" size={20} />
              Participants
            </h3>

            <p className={labelClass}>Expected Attendees</p>
            <p className={valueClass}>
              {booking.expected_attendees.toLocaleString()} persons
            </p>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiPackage className="text-[#0095D9]" size={20} />
              Requested Resources
              {resources.length > 0 && (
                <span className="rounded-full bg-[#0095D9]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
                  {resources.length}
                </span>
              )}
            </h3>

            {resources.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {resources.map((resource) => (
                  <li
                    key={resource.event_booking_resource_id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-200">
                      {resource.resource_name}
                    </span>

                    <span className="shrink-0 font-semibold text-[#00679E] dark:text-[#38BDF8]">
                      × {resource.quantity.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No resources requested.</p>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiUser className="text-[#0095D9]" size={20} />
              Requestor Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Requested By</p>
                <p className={valueClass}>{booking.requested_by}</p>
                {requesterSignatureUrl ? (
                  <img
                    src={requesterSignatureUrl}
                    alt="Requester e-signature"
                    className="mt-2 h-12"
                  />
                ) : (
                  <p className={`${labelClass} mt-1`}>
                    {booking.has_requester_signature
                      ? "Requester e-signature is on the booking slip."
                      : "No requester e-signature was recorded."}
                  </p>
                )}
              </div>

              <div>
                <p className={labelClass}>Requesting Office</p>
                <p className={valueClass}>
                  {booking.office?.office_name ?? "Not available"}
                  {booking.office?.office_code
                    ? ` (${booking.office.office_code})`
                    : ""}
                </p>
              </div>

              <div className="min-w-0">
                <p className={labelClass}>Email</p>
                <p
                  className={`${valueClass} flex items-center gap-2 break-all`}
                >
                  <FiMail className="shrink-0 text-[#0095D9]" />
                  {booking.email}
                </p>
              </div>

              <div>
                <p className={labelClass}>Contact Number</p>
                <p className={`${valueClass} flex items-center gap-2`}>
                  <FiPhone className="shrink-0 text-[#0095D9]" />
                  {booking.tel_number}
                </p>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <FiCheckCircle className="text-[#0095D9]" size={20} />
              Approval History
            </h3>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Status</p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                    booking.status,
                  )}`}
                >
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              <div>
                <p className={labelClass}>Current Approval Stage</p>
                <p className={valueClass}>
                  {getApprovalStageLabel(booking.approval_stage)}
                </p>
              </div>
            </div>

            {approvals.length > 0 ? (
              <ol className="space-y-3">
                {approvals.map((row) => (
                  <li
                    key={row.event_booking_approval_id}
                    className="rounded-xl border border-gray-100 p-3 text-sm dark:border-gray-800"
                  >
                    <p className="font-semibold capitalize text-gray-800 dark:text-gray-200">
                      {row.action} · {decisionLabel(row)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.approver
                        ? `${row.approver.first_name ?? ""} ${row.approver.last_name ?? ""}`.trim()
                        : `User #${row.approver_user_id}`}
                      {row.created_at ? ` · ${row.created_at}` : ""}
                    </p>
                    {row.remarks && (
                      <p className="mt-2 text-gray-600 dark:text-gray-300">
                        {row.remarks}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-400">
                No approval decisions have been recorded yet.
              </p>
            )}

            {booking.cancellation_reason && (
              <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <p className={labelClass}>Cancellation Reason</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {booking.cancellation_reason}
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900 sm:px-6">
          {canApprove && (
            <div className="space-y-2">
              {needsSignature && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Save your e-signature in{" "}
                  <Link to="/profile" className="font-semibold underline">
                    My Profile
                  </Link>{" "}
                  before approving this booking. Rejection does not require a signature.
                </p>
              )}
              <label className="text-xs font-semibold text-gray-500">
                Remarks {onReject ? "(required to reject)" : ""}
              </label>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Add remarks for this decision"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={isActing || !remarks.trim()}
                  onClick={() => onReject?.(remarks.trim())}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isActing || needsSignature}
                  onClick={() => onApprove?.(remarks.trim())}
                  className="rounded-xl bg-[#00679E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Approve current stage
                </button>
              </div>
            </div>
          )}

          {canCancel && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">
                Cancellation reason
              </label>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Explain why this booking is being cancelled"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isActing || !cancelReason.trim()}
                  onClick={() => onCancel?.(cancelReason.trim())}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40 dark:text-gray-200"
                >
                  Cancel booking
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function stageDecision(
  approvals: EventBookingColumns["approvals"],
  stage: string,
) {
  const rows = (approvals ?? []).filter((row) => row.approval_stage === stage);

  if (stage !== "event_approval") {
    return rows[0];
  }

  const legacy = rows.find((row) => !row.decision_slot);
  if (legacy) {
    return legacy;
  }

  const businessManager = rows.find(
    (row) => row.decision_slot === "business_manager",
  );
  const vpFinance = rows.find((row) => row.decision_slot === "vp_finance");

  if (businessManager?.action === "rejected") {
    return businessManager;
  }
  if (vpFinance?.action === "rejected") {
    return vpFinance;
  }
  if (
    businessManager?.action === "approved" &&
    vpFinance?.action === "approved"
  ) {
    return vpFinance;
  }

  return undefined;
}

function decisionLabel(row: NonNullable<EventBookingColumns["approvals"]>[number]) {
  if (row.decision_slot === "business_manager") {
    return "Business Manager";
  }
  if (row.decision_slot === "vp_finance") {
    return "VP-Finance";
  }

  return getApprovalStageLabel(row.approval_stage);
}

export default EventBookingView;
