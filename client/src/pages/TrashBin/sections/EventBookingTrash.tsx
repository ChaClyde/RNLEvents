import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";

import EventBookingService from "../../../services/EventBookingService";
import type { EventBookingColumns } from "../../../interfaces/EventBookingColumns";

import { useToastMessage } from "../../../hooks/useToastMessage";
import ToastMessage from "../../../components/ToastMessage/ToastMessage";
import {
  formatDate,
  formatDateRange,
  formatTime,
  getStatusLabel,
  getStatusStyle,
  parseApiError,
} from "../../../interfaces/EventBookingHelpers";

const EventBookingTrash = () => {
  const [bookings, setBookings] = useState<EventBookingColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [bookingToDelete, setBookingToDelete] =
    useState<EventBookingColumns | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);
  const [toastIsFailed, setToastIsFailed] = useState(false);

  const notify = useCallback(
    (text: string, isFailed = false) => {
      setToastIsFailed(isFailed);
      showToastMessage(text);
    },
    [showToastMessage],
  );

  // ============================================================
  // LOAD TRASH
  // ============================================================

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await EventBookingService.loadTrashEventBookings();
      const data = response.data?.data ?? [];

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load trashed event bookings:", err);
      setError(
        parseApiError(
          err,
          "Unable to load trashed event bookings. Please try again.",
        ).message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredBookings = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return bookings;

    return bookings.filter(
      (booking) =>
        booking.purpose?.toLowerCase().includes(keyword) ||
        booking.requested_by?.toLowerCase().includes(keyword) ||
        booking.venue?.venue?.toLowerCase().includes(keyword) ||
        booking.office?.office_name?.toLowerCase().includes(keyword) ||
        booking.email?.toLowerCase().includes(keyword),
    );
  }, [bookings, search]);

  // ============================================================
  // RESTORE
  // ============================================================

  const handleRestore = async (booking: EventBookingColumns) => {
    if (restoringId) return;

    try {
      setRestoringId(booking.event_booking_id);

      await EventBookingService.restoreEventBooking(booking.event_booking_id);

      setBookings((previous) =>
        previous.filter(
          (item) => item.event_booking_id !== booking.event_booking_id,
        ),
      );
      notify(`"${booking.purpose}" restored successfully!`);
    } catch (err) {
      // A schedule conflict comes back under venue_id
      const { message: apiMessage, fieldErrors } = parseApiError(
        err,
        "Failed to restore the event booking.",
      );

      notify(fieldErrors.venue_id ?? apiMessage, true);
    } finally {
      setRestoringId(null);
    }
  };

  // ============================================================
  // PERMANENT DELETE
  // ============================================================

  const handleForceDelete = async () => {
    if (!bookingToDelete || deleting) return;

    try {
      setDeleting(true);

      await EventBookingService.forceDeleteEventBooking(
        bookingToDelete.event_booking_id,
      );

      setBookings((previous) =>
        previous.filter(
          (item) => item.event_booking_id !== bookingToDelete.event_booking_id,
        ),
      );
      notify(`"${bookingToDelete.purpose}" permanently deleted.`);
      setBookingToDelete(null);
    } catch (err) {
      notify(
        parseApiError(err, "Failed to permanently delete the event booking.")
          .message,
        true,
      );
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-5">
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Trashed Event Bookings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Restore event bookings or delete them permanently.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#0095D9]/10 px-3 py-1.5 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
            {filteredBookings.length}{" "}
            {filteredBookings.length === 1 ? "booking" : "bookings"}
          </span>

          <button
            type="button"
            onClick={loadTrash}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trashed bookings by purpose, venue, requestor, or office..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={loadTrash}
            className="text-sm font-semibold text-red-700 underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiRefreshCw className="mx-auto mb-3 animate-spin text-3xl text-[#0095D9]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading trashed event bookings...
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiTrash2 className="mx-auto mb-3 text-4xl text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {search ? "No matching bookings" : "No trashed event bookings"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search
              ? "Try a different search keyword."
              : "Event bookings you delete will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((booking) => (
            <article
              key={booking.event_booking_id}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">
                    Booking #{booking.event_booking_id}
                  </p>
                  <h3 className="mt-0.5 line-clamp-2 text-base font-bold text-gray-900 dark:text-white">
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

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-2">
                  <FiMapPin className="shrink-0 text-[#0095D9]" />
                  <span className="truncate">
                    {booking.venue?.venue ?? "Venue unavailable"}
                  </span>
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
                  <span className="truncate">
                    {booking.requested_by}
                    {booking.office?.office_name
                      ? ` • ${booking.office.office_name}`
                      : ""}
                  </span>
                </p>
              </div>

              <p className="border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                Moved to trash on {formatDate(booking.updated_at)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(booking)}
                  disabled={restoringId === booking.event_booking_id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#0095D9]/30 px-3 py-2.5 text-sm font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 disabled:opacity-50 dark:text-[#38BDF8]"
                >
                  <FiRotateCcw size={15} />
                  {restoringId === booking.event_booking_id
                    ? "Restoring..."
                    : "Restore"}
                </button>

                <button
                  type="button"
                  onClick={() => setBookingToDelete(booking)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <FiTrash2 size={15} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Delete Permanently
              </h2>

              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                disabled={deleting}
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
                    Permanently delete "{bookingToDelete.purpose}"?
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBookingToDelete(null)}
                  disabled={deleting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleForceDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventBookingTrash;
