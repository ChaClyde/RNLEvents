import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiRotateCcw, FiSearch, FiTrash2 } from "react-icons/fi";

import type { VehicleBooking } from "../../../interfaces/VehicleBookingColumns";
import {
  formatDateRange,
  parseApiError,
} from "../../../interfaces/VehicleBookingHelpers";
import { useToastMessage } from "../../../hooks/useToastMessage";
import ToastMessage from "../../../components/ToastMessage/ToastMessage";
import VehicleBookingService from "../../../services/VehicleBookingService";

const VehicleBookingTrash = () => {
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await VehicleBookingService.loadTrashVehicleBookings();

      const data = response.data?.data ?? [];

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = parseApiError(
        err,
        "Unable to load trashed vehicle bookings.",
      ).message;

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const filteredBookings = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return bookings;

    return bookings.filter(
      (booking) =>
        booking.purpose?.toLowerCase().includes(keyword) ||
        booking.destination?.toLowerCase().includes(keyword) ||
        booking.requested_by?.toLowerCase().includes(keyword),
    );
  }, [bookings, search]);

  const handleRestore = async (booking: VehicleBooking) => {
    try {
      setRestoringId(booking.vehicle_booking_id);

      await VehicleBookingService.restoreVehicleBooking(
        booking.vehicle_booking_id,
      );

      setBookings((previous) =>
        previous.filter(
          (item) => item.vehicle_booking_id !== booking.vehicle_booking_id,
        ),
      );

      notify(`"${booking.purpose}" restored successfully!`);
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setRestoringId(null);
    }
  };

  const handleForceDelete = async (booking: VehicleBooking) => {
    const confirmed = window.confirm(
      `Permanently delete "${booking.purpose}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(booking.vehicle_booking_id);

      await VehicleBookingService.forceDeleteVehicleBooking(
        booking.vehicle_booking_id,
      );

      setBookings((previous) =>
        previous.filter(
          (item) => item.vehicle_booking_id !== booking.vehicle_booking_id,
        ),
      );

      notify(`"${booking.purpose}" permanently deleted.`);
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Trashed Vehicle Bookings
          </h2>
          <p className="text-sm text-gray-500">
            Restore or permanently delete removed vehicle bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTrash}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search trashed vehicle bookings..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Loading trashed vehicle bookings...
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-16 text-center dark:border-gray-700">
          <FiTrash2 className="mx-auto mb-3 text-4xl text-gray-400" />

          <h3 className="font-semibold text-gray-700 dark:text-gray-200">
            No trashed vehicle bookings
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {search
              ? "No bookings match your search."
              : "Deleted vehicle bookings will appear here."}
          </p>
        </div>
      ) : (
        /* Booking Cards */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredBookings.map((booking) => (
            <article
              key={booking.vehicle_booking_id}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-gray-900 dark:text-white">
                    {booking.purpose}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {booking.requested_by}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${getStatusStyle(
                    booking.status,
                  )}`}
                >
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  <span className="font-medium">Destination:</span>{" "}
                  {booking.destination}
                </p>

                <p>
                  <span className="font-medium">Travel Date:</span>{" "}
                  {formatDateRange(
                    booking.travel_date,
                    booking.expected_return_date,
                  )}
                </p>

                <p>
                  <span className="font-medium">Departure:</span>{" "}
                  {booking.departure_time}
                </p>

                <p>
                  <span className="font-medium">Passengers:</span>{" "}
                  {booking.passenger_count}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => handleRestore(booking)}
                  disabled={
                    restoringId === booking.vehicle_booking_id ||
                    deletingId === booking.vehicle_booking_id
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <FiRotateCcw size={15} />

                  {restoringId === booking.vehicle_booking_id
                    ? "Restoring..."
                    : "Restore"}
                </button>

                <button
                  type="button"
                  onClick={() => handleForceDelete(booking)}
                  disabled={
                    deletingId === booking.vehicle_booking_id ||
                    restoringId === booking.vehicle_booking_id
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                >
                  <FiTrash2 size={15} />

                  {deletingId === booking.vehicle_booking_id
                    ? "Deleting..."
                    : "Delete Permanently"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleBookingTrash;
