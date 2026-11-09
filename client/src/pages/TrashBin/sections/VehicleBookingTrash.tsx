import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import VehicleBookingService from "../../../services/VehicleBookingService";
import type { VehicleBookingColumns } from "../../../interfaces/VehicleBookingColumns";
import {
  formatDateRange,
  getStatusLabel,
  getStatusStyle,
  parseApiError,
} from "../../../interfaces/VehicleBookingHelpers";
import { useToastMessage } from "../../../hooks/useToastMessage";
import ToastMessage from "../../../components/ToastMessage/ToastMessage";

const VehicleBookingTrash = () => {
  const [bookings, setBookings] = useState<VehicleBookingColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<number | null>(null);
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
      setError(parseApiError(err, "Unable to load trashed vehicle bookings.").message);
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

  const handleRestore = async (booking: VehicleBookingColumns) => {
    try {
      setRestoringId(booking.vehicle_booking_id);
      await VehicleBookingService.restoreVehicleBooking(booking.vehicle_booking_id);
      setBookings((previous) =>
        previous.filter((item) => item.vehicle_booking_id !== booking.vehicle_booking_id),
      );
      notify(`"${booking.purpose}" restored successfully!`);
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setRestoringId(null);
    }
  };

  const handleForceDelete = async (booking: VehicleBookingColumns) => {
    if (!window.confirm(`Permanently delete "${booking.purpose}"?`)) return;

    try {
      await VehicleBookingService.forceDeleteVehicleBooking(booking.vehicle_booking_id);
      setBookings((previous) =>
        previous.filter((item) => item.vehicle_booking_id !== booking.vehicle_booking_id),
      );
      notify(`"${booking.purpose}" permanently deleted.`);
    } catch (err) {
      notify(parseApiError(err).message, true);
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Trashed Vehicle Bookings</h2>
        <button
          type="button"
          onClick={loadTrash}
          className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search trashed vehicle bookings..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading trashed vehicle bookings...</p>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-5 py-16 text-center">
          <FiTrash2 className="mx-auto mb-3 text-4xl text-gray-400" />
          <p>No trashed vehicle bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredBookings.map((booking) => (
            <article
              key={booking.vehicle_booking_id}
              className="space-y-3 rounded-2xl border p-5 dark:border-gray-700"
            >
              <div className="flex justify-between gap-3">
                <h3 className="font-bold">{booking.purpose}</h3>
                <span className={`rounded-full px-3 py-1 text-xs ${getStatusStyle(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500">{booking.destination}</p>
              <p className="text-sm">
                {formatDateRange(booking.travel_date, booking.expected_return_date)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(booking)}
                  disabled={restoringId === booking.vehicle_booking_id}
                  className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm"
                >
                  <FiRotateCcw size={15} />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => handleForceDelete(booking)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600"
                >
                  Delete
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
