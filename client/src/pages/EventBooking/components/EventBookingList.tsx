import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiMapPin,
  FiUsers,
  FiUser,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFilter,
  FiX,
  FiEye,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMap,
} from "react-icons/fi";

import type { EventBookingColumns } from "../../../interfaces/EventBookingColumns";
import {
  EVENT_STAGE_LABELS,
  formatDateRange,
  formatTime,
  getLifecycleLabel,
  getStatusStyle,
  isRequesterEditable,
} from "../../../interfaces/EventBookingHelpers";

interface EventBookingListProps {
  bookings: EventBookingColumns[];
  onView: (booking: EventBookingColumns) => void;
  onEdit: (booking: EventBookingColumns) => void;
  onDelete: (booking: EventBookingColumns) => void;
  isAwaitingReview?: (booking: EventBookingColumns) => boolean;
}

const ITEMS_PER_PAGE = 6;

// Resource chips shown on each card before "+N more"
const MAX_RESOURCE_CHIPS = 5;

const EventBookingList = ({
  bookings,
  onView,
  onEdit,
  onDelete,
  isAwaitingReview,
}: EventBookingListProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================================
  // SEARCH AND FILTER
  // ============================================================

  const filteredBookings = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return bookings.filter((booking) => {
      const matchesSearch =
        !keyword ||
        booking.purpose?.toLowerCase().includes(keyword) ||
        booking.requested_by?.toLowerCase().includes(keyword) ||
        booking.venue?.venue?.toLowerCase().includes(keyword) ||
        booking.venue?.location?.toLowerCase().includes(keyword) ||
        booking.office?.office_name?.toLowerCase().includes(keyword) ||
        booking.office?.office_code?.toLowerCase().includes(keyword) ||
        booking.email?.toLowerCase().includes(keyword) ||
        booking.description?.toLowerCase().includes(keyword) ||
        (booking.resources ?? []).some((resource) =>
          resource.resource_name.toLowerCase().includes(keyword),
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "awaiting_me" &&
          Boolean(isAwaitingReview?.(booking))) ||
        (statusFilter !== "awaiting_me" &&
          (booking.status === statusFilter ||
            (booking.status === "pending" &&
              booking.approval_stage === statusFilter)));

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-5">
      {/* List Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Event Booking Records
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse and manage university event booking requests.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#0095D9]/10 px-3 py-1.5 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
          {filteredBookings.length}{" "}
          {filteredBookings.length === 1 ? "booking" : "bookings"} found
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row dark:border-gray-700 dark:bg-gray-900">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search purpose, venue, requestor, office, or resources..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="relative sm:w-48">
          <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All Status</option>
            <option value="awaiting_me">Pending my approval</option>
            <option value="pending">Pending</option>
            {Object.entries(EVENT_STAGE_LABELS).map(([stage, label]) => (
              <option key={stage} value={stage}>
                {label}
              </option>
            ))}
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {(search || statusFilter !== "all") && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiX />
            Clear
          </button>
        )}
      </div>

      {/* Booking Cards */}
      {paginatedBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0095D9]/10 text-[#0095D9]">
            <FiCalendar size={26} />
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white">
            No event bookings found
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Start by adding your first event booking."}
          </p>

          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-[#0095D9] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedBookings.map((booking) => {
            const resources = booking.resources ?? [];

            return (
              <article
                key={booking.event_booking_id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
              >
                {/* Card Header */}
                <div className="bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/70">
                        Booking #{booking.event_booking_id}
                      </p>

                      <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white">
                        {booking.purpose}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${getStatusStyle(
                        booking.status,
                      )}`}
                    >
                      {getLifecycleLabel(booking)}
                    </span>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90">
                    <FiMapPin className="shrink-0" />
                    <span className="truncate">
                      {booking.venue?.venue ?? "Venue unavailable"}
                    </span>
                  </p>
                </div>

                {/* Booking Details */}
                <div className="space-y-4 p-5">
                  {/* Schedule */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FiCalendar className="shrink-0 text-[#0095D9]" />
                      <span className="font-medium">Event Schedule</span>
                    </div>

                    <p className="pl-6 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {formatDateRange(booking.date_start, booking.date_end)}
                    </p>

                    <div className="flex items-center gap-2 pl-6 text-sm text-gray-500 dark:text-gray-400">
                      <FiClock className="shrink-0 text-[#0095D9]" />
                      {formatTime(booking.time_start)} -{" "}
                      {formatTime(booking.time_end)}
                    </div>

                    <p className="pl-6 text-xs text-gray-400">
                      {booking.number_of_days}{" "}
                      {booking.number_of_days === 1 ? "day" : "days"}
                    </p>
                  </div>

                  {/* Venue Information */}
                  <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <FiMap size={15} />
                      <span className="text-xs font-medium">
                        Venue Information
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {booking.venue?.venue ?? "Venue unavailable"}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {booking.venue?.location ?? "Location unavailable"}
                    </p>

                    {booking.venue?.capacity != null && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Capacity: {booking.venue.capacity.toLocaleString()}{" "}
                        persons
                      </p>
                    )}
                  </div>

                  {/* Requestor and Attendees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-2 text-gray-400">
                        <FiUser size={15} />
                        <span className="text-xs">Requested By</span>
                      </div>

                      <p
                        className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200"
                        title={booking.requested_by}
                      >
                        {booking.requested_by}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-2 text-gray-400">
                        <FiUsers size={15} />
                        <span className="text-xs">Attendees</span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {booking.expected_attendees.toLocaleString()} persons
                      </p>
                    </div>
                  </div>

                  {/* Office */}
                  <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiMapPin className="mt-0.5 shrink-0 text-[#0095D9]" />

                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Requesting Office</p>
                      <p className="truncate font-semibold text-gray-800 dark:text-gray-200">
                        {booking.office?.office_name ?? "Office unavailable"}
                      </p>
                      {booking.office?.office_code && (
                        <p className="text-xs text-gray-400">
                          {booking.office.office_code}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email and Contact Number */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FiMail className="shrink-0 text-[#0095D9]" />
                      <p className="truncate" title={booking.email}>
                        {booking.email}
                      </p>
                    </div>

                    {booking.tel_number && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <FiPhone className="shrink-0 text-[#0095D9]" />
                        <p>{booking.tel_number}</p>
                      </div>
                    )}
                  </div>

                  {/* Requested Resources */}
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Requested Resources
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {resources.length > 0 ? (
                        <>
                          {resources
                            .slice(0, MAX_RESOURCE_CHIPS)
                            .map((resource) => (
                              <span
                                key={resource.event_booking_resource_id}
                                className="rounded-lg bg-[#0095D9]/10 px-2.5 py-1 text-xs font-medium text-[#00679E] dark:text-[#38BDF8]"
                              >
                                {resource.resource_name} ×{resource.quantity}
                              </span>
                            ))}

                          {resources.length > MAX_RESOURCE_CHIPS && (
                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              +{resources.length - MAX_RESOURCE_CHIPS} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No resources requested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Approval Stage */}
                  <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                    <p className="text-xs text-gray-400">
                      Current Approval Stage
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {getLifecycleLabel(booking)}
                    </p>
                  </div>

                  {/* Bottom Actions */}
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => onView(booking)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-2 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <FiEye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(booking)}
                      disabled={!isRequesterEditable(booking)}
                      title={
                        isRequesterEditable(booking)
                          ? "Edit booking"
                          : "Only unreviewed pending bookings can be edited"
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#0095D9]/30 px-2 py-2.5 text-sm font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#38BDF8]"
                    >
                      <FiEdit2 size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(booking)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-2 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <FiTrash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredBookings.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {filteredBookings.length}
            </span>{" "}
            bookings
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FiChevronLeft />
            </button>

            <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventBookingList;
