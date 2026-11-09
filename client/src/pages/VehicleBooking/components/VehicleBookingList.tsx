import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiEye,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import type { VehicleBookingColumns } from "../../../interfaces/VehicleBookingColumns";
import {
  VEHICLE_STAGE_LABELS,
  formatDateRange,
  formatTime,
  getLifecycleLabel,
  getStatusStyle,
  isRequesterEditable,
} from "../../../interfaces/VehicleBookingHelpers";

interface VehicleBookingListProps {
  bookings: VehicleBookingColumns[];
  onView: (booking: VehicleBookingColumns) => void;
  onEdit: (booking: VehicleBookingColumns) => void;
  onDelete: (booking: VehicleBookingColumns) => void;
  isAwaitingReview?: (booking: VehicleBookingColumns) => boolean;
}

const ITEMS_PER_PAGE = 6;

const VehicleBookingList = ({
  bookings,
  onView,
  onEdit,
  onDelete,
  isAwaitingReview,
}: VehicleBookingListProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredBookings = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return bookings.filter((booking) => {
      const matchesSearch =
        !keyword ||
        booking.purpose?.toLowerCase().includes(keyword) ||
        booking.destination?.toLowerCase().includes(keyword) ||
        booking.requested_by?.toLowerCase().includes(keyword) ||
        booking.office?.office_name?.toLowerCase().includes(keyword) ||
        booking.vehicle?.vehicle_name?.toLowerCase().includes(keyword) ||
        booking.driver?.driver_name?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "awaiting_me" && Boolean(isAwaitingReview?.(booking))) ||
        (statusFilter !== "awaiting_me" &&
          (booking.status === statusFilter ||
            (booking.status === "pending" &&
              booking.approval_stage === statusFilter)));

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter, isAwaitingReview]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row dark:border-gray-700 dark:bg-gray-900">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search destination, purpose, requestor, vehicle, or driver..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="relative sm:w-56">
          <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All Status</option>
            <option value="awaiting_me">Pending my approval</option>
            <option value="pending">Pending</option>
            {Object.entries(VEHICLE_STAGE_LABELS).map(([stage, label]) => (
              <option key={stage} value={stage}>
                {label}
              </option>
            ))}
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {paginatedBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            No vehicle bookings found
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedBookings.map((booking) => (
            <article
              key={booking.vehicle_booking_id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white/70">
                      Booking #{booking.vehicle_booking_id}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white">
                      {booking.purpose}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(booking.status)}`}
                  >
                    {getLifecycleLabel(booking)}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90">
                  <FiMapPin className="shrink-0" />
                  {booking.destination}
                </p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <FiCalendar className="text-[#0095D9]" />
                  {formatDateRange(booking.travel_date, booking.expected_return_date)}
                </p>
                <p className="flex items-center gap-2 text-gray-500">
                  <FiClock className="text-[#0095D9]" />
                  {formatTime(booking.departure_time)} - {formatTime(booking.expected_return_time)}
                </p>
                <p className="flex items-center gap-2 text-gray-500">
                  <FiUsers className="text-[#0095D9]" />
                  {booking.passenger_count} passengers
                </p>
                <p className="flex items-center gap-2 text-gray-500">
                  <FiUser className="text-[#0095D9]" />
                  {booking.requested_by}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onView(booking)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    <FiEye size={16} />
                  </button>
                  {isRequesterEditable(booking) && (
                    <button
                      type="button"
                      onClick={() => onEdit(booking)}
                      className="rounded-lg border border-gray-200 p-2 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      <FiEdit2 size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(booking)}
                    className="rounded-lg border border-red-200 p-2 text-red-600"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => page - 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default VehicleBookingList;
