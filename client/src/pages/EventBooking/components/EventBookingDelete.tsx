import { useState } from "react";
import {
  FiAlertTriangle,
  FiX,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUser,
} from "react-icons/fi";

import EventBookingService from "../../../services/EventBookingService";
import type { EventBookingColumns } from "../../../interfaces/EventBookingColumns";
import {
  formatDateRange,
  formatTime,
  getStatusLabel,
  getStatusStyle,
  parseApiError,
} from "../../../interfaces/EventBookingHelpers";

interface EventBookingDeleteProps {
  isOpen: boolean;
  booking: EventBookingColumns | null;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, isFailed?: boolean) => void;
}

const EventBookingDelete = ({
  isOpen,
  booking,
  onClose,
  onSuccess,
  onNotify,
}: EventBookingDeleteProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!booking || loading) return;

    try {
      setLoading(true);

      await EventBookingService.destroyEventBooking(booking.event_booking_id);

      onClose();
      onSuccess();
      onNotify("Event booking moved to Trash Bin!");
    } catch (error) {
      const { message } = parseApiError(
        error,
        "Something went wrong while deleting the event booking.",
      );

      onNotify(message, true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !booking) return null;

  const holdsSchedule =
    booking.status === "pending" || booking.status === "approved";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Delete Event Booking
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <FiAlertTriangle className="mt-0.5 shrink-0 text-xl text-red-600 dark:text-red-400" />

            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">
                Are you sure you want to delete this booking?
              </p>

              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                This booking will be moved to the Trash Bin. You can restore it
                later if the schedule is still free.
              </p>

              {holdsSchedule && (
                <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
                  Deleting a {booking.status} booking releases its venue
                  schedule.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">
                  Booking #{booking.event_booking_id}
                </p>

                <h3 className="mt-0.5 font-bold text-gray-900 dark:text-white">
                  {booking.purpose}
                </h3>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                  booking.status,
                )}`}
              >
                {getStatusLabel(booking.status)}
              </span>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <p className="flex items-center gap-2">
                <FiMapPin className="shrink-0 text-[#0095D9]" />
                {booking.venue?.venue ?? "Venue unavailable"}
              </p>

              <p className="flex items-center gap-2">
                <FiCalendar className="shrink-0 text-[#0095D9]" />
                {formatDateRange(booking.date_start, booking.date_end)}
              </p>

              <p className="flex items-center gap-2">
                <FiClock className="shrink-0 text-[#0095D9]" />
                {formatTime(booking.time_start)} -{" "}
                {formatTime(booking.time_end)}
              </p>

              <p className="flex items-center gap-2">
                <FiUser className="shrink-0 text-[#0095D9]" />
                {booking.requested_by}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Moving..." : "Move to Trash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventBookingDelete;
