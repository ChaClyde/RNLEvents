import { useMemo, useState, type FC } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Wrench,
} from "lucide-react";

import Spinner from "../../../components/Spinner/Spinner";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import type {
  MaintenancePhase,
  MaintenanceStatus,
  VehicleMaintenanceColumns,
} from "../../../interfaces/VehicleMaintenanceColumns";
import {
  formatDateRange,
  getMaintenancePhaseLabel,
  getMaintenancePhaseStyle,
  MAINTENANCE_PHASE_OPTIONS,
} from "../../../interfaces/VehicleHelpers";

interface VehicleMaintenanceListProps {
  records: VehicleMaintenanceColumns[];
  vehicles: VehicleColumns[];
  loading: boolean;
  busyId: number | null;
  onAdd: () => void;
  onEdit: (record: VehicleMaintenanceColumns) => void;
  onDelete: (record: VehicleMaintenanceColumns) => void;
  onStatusChange: (
    record: VehicleMaintenanceColumns,
    status: MaintenanceStatus,
  ) => void;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 10;

const actionClass =
  "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40";

const VehicleMaintenanceList: FC<VehicleMaintenanceListProps> = ({
  records,
  vehicles,
  loading,
  busyId,
  onAdd,
  onEdit,
  onDelete,
  onStatusChange,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState<"all" | MaintenancePhase>(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return records.filter((record) => {
      const matchesSearch =
        query === "" ||
        record.reason.toLowerCase().includes(query) ||
        (record.notes ?? "").toLowerCase().includes(query) ||
        (record.vehicle?.vehicle_name ?? "").toLowerCase().includes(query) ||
        (record.vehicle?.plate_number ?? "").toLowerCase().includes(query);

      const matchesVehicle =
        vehicleFilter === "all" || String(record.vehicle_id) === vehicleFilter;

      const matchesPhase =
        phaseFilter === "all" || record.phase === phaseFilter;

      return matchesSearch && matchesVehicle && matchesPhase;
    });
  }, [records, searchQuery, vehicleFilter, phaseFilter]);

  const countOf = (phase: MaintenancePhase) =>
    records.filter((record) => record.phase === phase).length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / ITEMS_PER_PAGE),
  );
  const page = Math.min(currentPage, totalPages);

  const paginatedRecords = filteredRecords.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#003B5C]">
                Maintenance Sheet
              </h1>
              <p className="mt-1 text-gray-500">
                Schedule the days a vehicle is out of service. Requesters are
                told it isn't available on those dates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/vehicles"
              className="flex items-center gap-2 rounded-2xl border border-[#0095D9]/30 bg-white px-5 py-3 text-sm font-medium text-[#003B5C] transition-all hover:bg-[#0095D9]/10"
            >
              <Truck size={16} />
              Vehicles
            </Link>

            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-gray-500">Ongoing now</p>
          <div className="mt-3 flex items-center gap-3">
            <Wrench className="text-amber-600" />
            <span className="text-3xl font-bold text-amber-700">
              {countOf("ongoing")}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm text-gray-500">Upcoming</p>
          <div className="mt-3 flex items-center gap-3">
            <CalendarClock className="text-sky-600" />
            <span className="text-3xl font-bold text-sky-700">
              {countOf("upcoming")}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-gray-500">Overdue (not marked done)</p>
          <div className="mt-3 flex items-center gap-3">
            <CalendarClock className="text-red-600" />
            <span className="text-3xl font-bold text-red-700">
              {countOf("overdue")}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search reason, notes, vehicle or plate..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            className="w-80 max-w-full rounded-2xl border border-[#0095D9]/20 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none focus:border-[#0095D9]"
          />
        </div>

        <select
          value={vehicleFilter}
          onChange={(e) => {
            setVehicleFilter(e.target.value);
            resetPage();
          }}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#0095D9]"
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
              {vehicle.vehicle_name} ({vehicle.plate_number})
            </option>
          ))}
        </select>

        <select
          value={phaseFilter}
          onChange={(e) => {
            setPhaseFilter(e.target.value as "all" | MaintenancePhase);
            resetPage();
          }}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#0095D9]"
        >
          <option value="all">All Status</option>
          {MAINTENANCE_PHASE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onAdd}
          className="ml-auto rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} />
            Schedule Maintenance
          </div>
        </button>
      </div>

      {/* Sheet */}
      {loading ? (
        <div className="flex justify-center rounded-3xl border border-[#0095D9]/20 bg-white py-16 shadow-sm">
          <Spinner size="md" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-3xl border border-[#0095D9]/20 bg-white py-16 text-center text-gray-400 shadow-sm">
          No maintenance records found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-[#0095D9]/10 bg-[#0095D9]/5 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Maintenance</th>
                <th className="px-5 py-3 font-semibold">Dates</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedRecords.map((record) => {
                const busy = busyId === record.maintenance_id;
                const isScheduled = record.status === "scheduled";

                return (
                  <tr
                    key={record.maintenance_id}
                    className={record.phase === "overdue" ? "bg-red-50/40" : ""}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#003B5C]">
                        {record.vehicle?.vehicle_name ?? "Vehicle unavailable"}
                      </p>
                      <p className="text-xs tracking-wide text-gray-500">
                        {record.vehicle?.plate_number}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {record.reason}
                      </p>
                      {record.notes && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                          {record.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatDateRange(record.date_start, record.date_end)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getMaintenancePhaseStyle(
                          record.phase,
                        )}`}
                      >
                        {getMaintenancePhaseLabel(record.phase)}
                      </span>

                      {record.phase === "overdue" && (
                        <p className="mt-1 text-[11px] text-red-600">
                          End date passed. Mark it done.
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isScheduled ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onEdit(record)}
                              className={`${actionClass} border-[#0095D9]/30 bg-[#0095D9]/10 text-[#0095D9] hover:bg-[#0095D9]/20`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                onStatusChange(record, "completed")
                              }
                              className={`${actionClass} border-green-200 bg-green-50 text-green-700 hover:bg-green-100`}
                            >
                              Mark done
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                onStatusChange(record, "cancelled")
                              }
                              className={`${actionClass} border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100`}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onStatusChange(record, "scheduled")}
                            className={`${actionClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
                          >
                            Reopen
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onDelete(record)}
                          className={`${actionClass} border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-3xl border border-[#0095D9]/20 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(page * ITEMS_PER_PAGE, filteredRecords.length)} of{" "}
            {filteredRecords.length} records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(page - 1, 1))}
              disabled={page === 1}
              className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:opacity-30"
            >
              Previous
            </button>

            <span className="px-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
              disabled={page === totalPages}
              className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMaintenanceList;
