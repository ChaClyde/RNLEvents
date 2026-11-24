import React, { useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  CalendarDays,
  MapPin,
  Users,
  Filter,
  RotateCcw,
} from "lucide-react";

import type { VehicleBooking } from "../../../interfaces/VehicleBookingColumns";

import {
  formatVehicleBookingDate,
  getVehicleStageLabel,
  getVehicleStatusLabel,
  getVehicleStatusStyle,
} from "../../../interfaces/VehicleBookingHelpers";

type VehicleBookingStatus = "pending" | "approved" | "rejected" | "cancelled";

type VehicleApprovalStage =
  | "office_head"
  | "vehicle_approval"
  | "vehicle_admin"
  | "super_admin";

interface VehicleBookingListProps {
  bookings: VehicleBooking[];
  loading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onView: (booking: VehicleBooking) => void;
  onEdit: (booking: VehicleBooking) => void;
  onDelete: (booking: VehicleBooking) => void;
}

const VehicleBookingList: React.FC<VehicleBookingListProps> = ({
  bookings,
  loading = false,
  canEdit = false,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    VehicleBookingStatus | "all"
  >("all");

  const [stageFilter, setStageFilter] = useState<VehicleApprovalStage | "all">(
    "all",
  );

  const filteredBookings = useMemo(() => {
    const query = search.toLowerCase().trim();

    return bookings.filter((booking) => {
      const matchesSearch =
        !query ||
        booking.requested_by?.toLowerCase().includes(query) ||
        booking.destination?.toLowerCase().includes(query) ||
        booking.purpose?.toLowerCase().includes(query) ||
        booking.email?.toLowerCase().includes(query) ||
        booking.office?.office_name?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;

      const matchesStage =
        stageFilter === "all" || booking.approval_stage === stageFilter;

      return matchesSearch && matchesStatus && matchesStage;
    });
  }, [bookings, search, statusFilter, stageFilter]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setStageFilter("all");
  };

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || stageFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-[#00679E]" />
          <h3 className="font-semibold text-[#003B5C] dark:text-white">
            Search and Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bookings..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#00679E] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as VehicleBookingStatus | "all",
              )
            }
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00679E] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Approval Stage Filter */}
          <select
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value as VehicleApprovalStage | "all")
            }
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00679E] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Approval Stages</option>
            <option value="office_head">Office Head</option>
            <option value="vehicle_approval">Vehicle Approval</option>
            <option value="vehicle_admin">Vehicle Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#00679E] transition hover:underline dark:text-sky-400"
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Booking Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Table Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-[#003B5C] dark:text-white">
              Vehicle Booking Requests
            </h3>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {filteredBookings.length} booking(s) found
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#00679E]" />

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading vehicle bookings...
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />

            <p className="font-medium text-gray-700 dark:text-gray-200">
              No vehicle bookings found
            </p>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters
                ? "Try changing your search or filters."
                : "There are currently no vehicle booking requests."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 text-sm font-semibold text-[#00679E] hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Booking Records */
          <div className="overflow-x-auto">
            <table className="w-full min-w-255 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Requester</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Travel Date</th>
                  <th className="px-6 py-4">Passengers</th>
                  <th className="px-6 py-4">Approval Stage</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.vehicle_booking_id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {/* Requester */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {booking.requested_by}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {booking.office?.office_name || "—"}
                      </p>
                    </td>

                    {/* Destination */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <MapPin size={14} className="shrink-0 text-[#0095D9]" />
                        {booking.destination}
                      </div>

                      <p className="mt-1 max-w-55 truncate text-xs text-gray-500">
                        {booking.purpose}
                      </p>
                    </td>

                    {/* Travel Date */}
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatVehicleBookingDate(booking.travel_date)}
                    </td>

                    {/* Passengers */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Users size={15} />
                        {booking.passenger_count}
                      </div>
                    </td>

                    {/* Approval Stage */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-[#00679E] dark:text-sky-400">
                        {getVehicleStageLabel(booking.approval_stage)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getVehicleStatusStyle(
                          booking.status,
                        )}`}
                      >
                        {getVehicleStatusLabel(booking.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* View */}
                        <button
                          type="button"
                          title="View Booking"
                          aria-label="View booking"
                          onClick={() => onView(booking)}
                          className="rounded-lg p-2 text-[#00679E] transition hover:bg-sky-50 dark:hover:bg-sky-900/20"
                        >
                          <Eye size={17} />
                        </button>

                        {/* Edit */}
                        {canEdit &&
                          booking.status === "pending" &&
                          booking.approval_stage === "office_head" &&
                          (!booking.approvals ||
                            booking.approvals.length === 0) && (
                            <button
                              type="button"
                              title="Edit Booking"
                              aria-label="Edit booking"
                              onClick={() => onEdit(booking)}
                              className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                              <Pencil size={17} />
                            </button>
                          )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            type="button"
                            title="Move to Trash"
                            aria-label="Move booking to trash"
                            onClick={() => onDelete(booking)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleBookingList;
