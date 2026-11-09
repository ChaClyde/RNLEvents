import { useState } from "react";
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

import type { EventBookingColumns } from "../../../interfaces/EventBookingColumns";
import {
  EVENT_APPROVAL_PIPELINE,
  formatDateRange,
  formatTime,
  getApprovalStageLabel,
  getLifecycleLabel,
  getStatusLabel,
  getStatusStyle,
} from "../../../interfaces/EventBookingHelpers";

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
  const currentIndex = EVENT_APPROVAL_PIPELINE.findIndex(
    (stage) => stage === booking.approval_stage,
  );

  const [remarks, setRemarks] = useState("");
  const [cancelReason, setCancelReason] = useState("");

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
              <FiCheckCircle className="text-[#0095D9]" size={20} />
              Approval Progress
            </h3>

            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {EVENT_APPROVAL_PIPELINE.map((stage, index) => {
                const decided = approvals.find(
                  (row) => row.approval_stage === stage,
                );
                const isCurrent =
                  booking.status === "pending" &&
                  booking.approval_stage === stage;
                const completed =
                  decided?.action === "approved" ||
                  (booking.status === "approved" && index <= currentIndex);

                return (
                  <li
                    key={stage}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      decided?.action === "rejected"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                        : completed
                          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                          : isCurrent
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                            : "border-gray-200 text-gray-500 dark:border-gray-700"
                    }`}
                  >
                    <p className="font-semibold">Step {index + 1}</p>
                    <p className="mt-1 leading-snug">
                      {getApprovalStageLabel(stage).replace("Pending ", "")}
                    </p>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className={labelClass}>Date</p>
                <p className={valueClass}>
                  {formatDateRange(booking.date_start, booking.date_end)}
                </p>
              </div>

              <div>
                <p className={labelClass}>Time</p>
                <p className={valueClass}>
                  {formatTime(booking.time_start)} -{" "}
                  {formatTime(booking.time_end)}
                </p>
              </div>

              <div>
                <p className={labelClass}>Duration</p>
                <p className={valueClass}>
                  {booking.number_of_days}{" "}
                  {booking.number_of_days === 1 ? "day" : "days"}
                </p>
              </div>
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
                      {row.action} · {getApprovalStageLabel(row.approval_stage)}
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
                  disabled={isActing}
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

export default EventBookingView;
