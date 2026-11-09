import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Car, FileDown, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import { downloadReportResponse } from "../../services/downloadReport";
import VehicleReportService, {
  type VehicleReportBookingRow,
  type VehicleReportCard,
  type VehicleReportDrivers,
  type VehicleReportFilters,
  type VehicleReportOfficeRow,
  type VehicleReportSummary,
  type VehicleReportTrends,
  type VehicleReportUtilization,
} from "../../services/VehicleReportService";
import DashboardChart from "../Dashboard/components/DashboardChart";
import DashboardSkeleton from "../Dashboard/components/DashboardSkeleton";
import StatCard from "../Dashboard/components/StatCard";

const emptyFilters: VehicleReportFilters = {
  start_date: "",
  end_date: "",
  status: "",
  office_id: "",
  vehicle_id: "",
  driver_id: "",
  destination: "",
  search: "",
  list: "",
  page: 1,
  per_page: 10,
  sort: "travel_date",
  direction: "desc",
};

const VehicleReportsPage = () => {
  const { can, canAny } = usePermissions();
  const canOpen = canAny([
    Permission.REPORTS_VIEW_VEHICLE,
    Permission.REPORTS_VIEW_ALL,
    Permission.REPORTS_VIEW_OFFICE,
  ]);

  const [filters, setFilters] = useState<VehicleReportFilters>(emptyFilters);
  const [applied, setApplied] = useState<VehicleReportFilters>(emptyFilters);
  const [summary, setSummary] = useState<VehicleReportSummary | null>(null);
  const [trends, setTrends] = useState<VehicleReportTrends | null>(null);
  const [utilization, setUtilization] =
    useState<VehicleReportUtilization | null>(null);
  const [drivers, setDrivers] = useState<VehicleReportDrivers | null>(null);
  const [offices, setOffices] = useState<VehicleReportOfficeRow[]>([]);
  const [bookings, setBookings] = useState<VehicleReportBookingRow[]>([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [exportError, setExportError] = useState("");

  const queryFilters = useMemo(() => applied, [applied]);

  const loadReports = useCallback(async () => {
    if (!canOpen) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        summaryRes,
        trendsRes,
        utilizationRes,
        driversRes,
        officesRes,
        bookingsRes,
      ] = await Promise.all([
        VehicleReportService.summary(queryFilters),
        VehicleReportService.trends(queryFilters),
        VehicleReportService.utilization(queryFilters),
        VehicleReportService.drivers(queryFilters),
        VehicleReportService.offices(queryFilters),
        VehicleReportService.bookings(queryFilters),
      ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data);
      setUtilization(utilizationRes.data.data);
      setDrivers(driversRes.data.data);
      setOffices(officesRes.data.data);
      setBookings(bookingsRes.data.data);
      setMeta(bookingsRes.data.meta);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to view vehicle reports.");
      } else {
        setError("Unable to load vehicle reports. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [canOpen, queryFilters]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const exportFilters = useMemo(() => {
    const { page: _page, per_page: _perPage, ...rest } = applied;
    return rest;
  }, [applied]);

  const exportReport = async (format: "pdf" | "excel") => {
    if (exporting) {
      return;
    }

    setExporting(format);
    setExportError("");

    try {
      const response =
        format === "pdf"
          ? await VehicleReportService.exportPdf(exportFilters)
          : await VehicleReportService.exportExcel(exportFilters);

      await downloadReportResponse(
        response,
        `FilSched-Vehicle-Report.${format === "pdf" ? "pdf" : "xlsx"}`,
      );
    } catch {
      setExportError("Unable to export the vehicle report. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const updateFilter = <K extends keyof VehicleReportFilters>(
    key: K,
    value: VehicleReportFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (!can(Permission.REPORTS_VIEW) || !canOpen) {
    return (
      <div className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
          Vehicle Reports
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Vehicle and driver reports are not available for this role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0095D9]/10">
            <Car className="h-6 w-6 text-[#0095D9]" />
          </div>
          <div>
            <Link
              to="/reports"
              className="text-sm font-medium text-[#0095D9] hover:underline"
            >
              Reports
            </Link>
            <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
              Vehicle & Driver Reports
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Trip, fleet, and driver statistics from live FilSched records.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void exportReport("pdf")}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {exporting === "pdf" ? "Preparing PDF..." : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={() => void exportReport("excel")}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? "Preparing Excel..." : "Export Excel"}
          </button>
        </div>
      </header>
      {exportError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Start date
            <input
              type="date"
              value={filters.start_date ?? ""}
              onChange={(event) =>
                updateFilter("start_date", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            End date
            <input
              type="date"
              value={filters.end_date ?? ""}
              onChange={(event) => updateFilter("end_date", event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Status
            <select
              value={filters.status ?? ""}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Destination / search
            <input
              type="search"
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Purpose, destination, vehicle, driver"
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Destination
            <input
              type="text"
              value={filters.destination ?? ""}
              onChange={(event) =>
                updateFilter("destination", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          {summary?.options.can_filter_offices && (
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Office
              <select
                value={filters.office_id ?? ""}
                onChange={(event) =>
                  updateFilter(
                    "office_id",
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All offices</option>
                {summary.options.offices.map((office) => (
                  <option key={office.office_id} value={office.office_id}>
                    {office.office_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {summary?.options.can_filter_vehicles && (
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Vehicle
              <select
                value={filters.vehicle_id ?? ""}
                onChange={(event) =>
                  updateFilter(
                    "vehicle_id",
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All vehicles</option>
                {summary.options.vehicles.map((vehicle) => (
                  <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                    {vehicle.vehicle_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {summary?.options.can_filter_drivers && (
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Driver
              <select
                value={filters.driver_id ?? ""}
                onChange={(event) =>
                  updateFilter(
                    "driver_id",
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All drivers</option>
                {summary.options.drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    {driver.driver_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Trip list
            <select
              value={filters.list ?? ""}
              onChange={(event) =>
                updateFilter(
                  "list",
                  event.target.value as VehicleReportFilters["list"],
                )
              }
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All matching trips</option>
              <option value="upcoming">Upcoming approved</option>
              <option value="past">Completed trips</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setApplied({ ...filters, page: 1 })}
            className="rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setApplied(emptyFilters);
            }}
            className="rounded-xl border border-[#1E3A5F]/20 px-4 py-2 text-sm text-[#1E3A5F] dark:border-slate-600 dark:text-slate-200"
          >
            Reset
          </button>
        </div>
      </section>

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="mt-3 rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(summary?.cards ?? []).map((card: VehicleReportCard) => (
              <StatCard key={card.key} label={card.label} value={card.value} />
            ))}
          </div>

          {utilization?.can_view_fleet && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Available Vehicles"
                value={utilization.fleet.available}
              />
              <StatCard
                label="Unavailable Vehicles"
                value={utilization.fleet.unavailable}
              />
              <StatCard
                label="Vehicles Under Maintenance"
                value={utilization.fleet.maintenance}
              />
              <StatCard label="Total Vehicles" value={utilization.fleet.total} />
            </div>
          )}

          {trends && (
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardChart chart={trends.daily} variant="bar" />
              <DashboardChart chart={trends.weekly} variant="bar" />
              <DashboardChart chart={trends.monthly} variant="bar" />
              <DashboardChart chart={trends.yearly} variant="bar" />
              <DashboardChart
                chart={trends.status_distribution}
                variant="distribution"
              />
            </div>
          )}

          {utilization && (
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardChart chart={utilization.frequency} variant="bar" />
              <DashboardChart
                chart={utilization.distribution}
                variant="distribution"
              />
              <RankedList
                title="Most frequently used vehicles"
                rows={utilization.most_frequent}
              />
              <RankedList
                title="Least utilized vehicles"
                rows={utilization.least_utilized}
              />
            </div>
          )}

          {drivers && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {drivers.cards.map((card) => (
                  <StatCard
                    key={card.key}
                    label={card.label}
                    value={card.value}
                  />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <DashboardChart chart={drivers.utilization} variant="bar" />
                <RankedList
                  title="Driver trip assignments"
                  rows={drivers.assignments}
                />
                {drivers.can_view_drivers && (
                  <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
                      Driver leave and unavailability
                    </h2>
                    {drivers.leave.length === 0 ? (
                      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                        No drivers are currently on leave or unavailable.
                      </p>
                    ) : (
                      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                        {drivers.leave.map((row) => (
                          <li key={row.driver_id} className="py-2 text-sm">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {row.driver_name}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {row.status}
                              {row.status_remarks
                                ? ` · ${row.status_remarks}`
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
                {drivers.can_view_drivers && (
                  <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
                      License expiration monitoring
                    </h2>
                    {drivers.licenses.length === 0 ? (
                      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                        No licenses expired or expiring in the next 30 days.
                      </p>
                    ) : (
                      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                        {drivers.licenses.map((row) => (
                          <li
                            key={row.driver_id}
                            className="flex items-center justify-between py-2 text-sm"
                          >
                            <span className="text-slate-800 dark:text-slate-100">
                              {row.driver_name}
                            </span>
                            <span
                              className={
                                row.expired
                                  ? "font-semibold text-rose-600"
                                  : "text-amber-600"
                              }
                            >
                              {row.expired ? "Expired" : "Expiring"}{" "}
                              {row.license_expiry}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            </>
          )}

          <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
              Vehicle bookings per office
            </h2>
            {offices.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                No office trip totals for the selected filters.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Office</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Pending</th>
                      <th className="px-3 py-2">Approved</th>
                      <th className="px-3 py-2">Rejected</th>
                      <th className="px-3 py-2">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offices.map((row) => (
                      <tr
                        key={row.office_id ?? row.office_name}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-3 py-2 font-medium">{row.office_name}</td>
                        <td className="px-3 py-2">{row.total}</td>
                        <td className="px-3 py-2">{row.pending}</td>
                        <td className="px-3 py-2">{row.approved}</td>
                        <td className="px-3 py-2">{row.rejected}</td>
                        <td className="px-3 py-2">{row.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
              Vehicle booking report
            </h2>
            {bookings.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                No vehicle bookings match the selected filters.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr>
                      {[
                        ["vehicle_booking_id", "ID"],
                        ["requested_by", "Requester"],
                        ["office_name", "Office"],
                        ["destination", "Destination"],
                        ["purpose", "Purpose"],
                        ["vehicle_name", "Vehicle"],
                        ["driver_name", "Driver"],
                        ["travel_date", "Departure"],
                        ["expected_return_date", "Return"],
                        ["passenger_count", "Passengers"],
                        ["status", "Status"],
                        ["approval_stage", "Stage"],
                      ].map(([column, label]) => (
                        <th key={column} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setApplied((current) => ({
                                ...current,
                                sort: column,
                                direction:
                                  current.sort === column &&
                                  current.direction === "asc"
                                    ? "desc"
                                    : "asc",
                                page: 1,
                              }))
                            }
                            className="font-semibold"
                          >
                            {label}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((row) => (
                      <tr
                        key={row.vehicle_booking_id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-3 py-2">{row.vehicle_booking_id}</td>
                        <td className="px-3 py-2">{row.requested_by}</td>
                        <td className="px-3 py-2">{row.office ?? "—"}</td>
                        <td className="px-3 py-2">{row.destination}</td>
                        <td className="px-3 py-2">{row.purpose}</td>
                        <td className="px-3 py-2">{row.vehicle ?? "—"}</td>
                        <td className="px-3 py-2">{row.driver ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row.travel_date} {row.departure_time}
                        </td>
                        <td className="px-3 py-2">
                          {row.expected_return_date} {row.expected_return_time}
                        </td>
                        <td className="px-3 py-2">{row.passenger_count}</td>
                        <td className="px-3 py-2 capitalize">{row.status}</td>
                        <td className="px-3 py-2">
                          {row.approval_stage.replaceAll("_", " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {meta.current_page} of {meta.last_page} · {meta.total}{" "}
                records
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() =>
                    setApplied((current) => ({
                      ...current,
                      page: Math.max(1, (current.page ?? 1) - 1),
                    }))
                  }
                  className="rounded-lg border border-[#1E3A5F]/20 px-3 py-1 disabled:opacity-40 dark:border-slate-600"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() =>
                    setApplied((current) => ({
                      ...current,
                      page: (current.page ?? 1) + 1,
                    }))
                  }
                  className="rounded-lg border border-[#1E3A5F]/20 px-3 py-1 disabled:opacity-40 dark:border-slate-600"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const RankedList = ({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) => (
  <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
      {title}
    </h2>
    {rows.length === 0 ? (
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        No records for the selected filters.
      </p>
    ) : (
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
            <span className="font-semibold text-[#1E3A5F] dark:text-white">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default VehicleReportsPage;
