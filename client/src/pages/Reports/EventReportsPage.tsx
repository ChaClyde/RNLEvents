import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { BarChart3, FileDown, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import { downloadReportResponse } from "../../services/downloadReport";
import EventReportService, {
  type EventReportBookingRow,
  type EventReportCard,
  type EventReportFilters,
  type EventReportOfficeRow,
  type EventReportSummary,
  type EventReportTrends,
  type EventReportVenues,
} from "../../services/EventReportService";
import DashboardChart from "../Dashboard/components/DashboardChart";
import DashboardSkeleton from "../Dashboard/components/DashboardSkeleton";
import StatCard from "../Dashboard/components/StatCard";

const emptyFilters: EventReportFilters = {
  start_date: "",
  end_date: "",
  status: "",
  office_id: "",
  venue_id: "",
  search: "",
  list: "",
  page: 1,
  per_page: 10,
  sort: "date_start",
  direction: "desc",
};

const EventReportsPage = () => {
  const { can, canAny } = usePermissions();
  const canOpenEventReports = canAny([
    Permission.REPORTS_VIEW_EVENT,
    Permission.REPORTS_VIEW_ALL,
    Permission.REPORTS_VIEW_OFFICE,
  ]);

  const [filters, setFilters] = useState<EventReportFilters>(emptyFilters);
  const [applied, setApplied] = useState<EventReportFilters>(emptyFilters);
  const [summary, setSummary] = useState<EventReportSummary | null>(null);
  const [trends, setTrends] = useState<EventReportTrends | null>(null);
  const [venues, setVenues] = useState<EventReportVenues | null>(null);
  const [offices, setOffices] = useState<EventReportOfficeRow[]>([]);
  const [bookings, setBookings] = useState<EventReportBookingRow[]>([]);
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

  const queryFilters = useMemo(() => {
    const { page, per_page, sort, direction, ...rest } = applied;
    return { ...rest, page, per_page, sort, direction };
  }, [applied]);

  const loadReports = useCallback(async () => {
    if (!canOpenEventReports) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [summaryRes, trendsRes, venuesRes, officesRes, bookingsRes] =
        await Promise.all([
          EventReportService.summary(queryFilters),
          EventReportService.trends(queryFilters),
          EventReportService.venues(queryFilters),
          EventReportService.offices(queryFilters),
          EventReportService.bookings(queryFilters),
        ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data);
      setVenues(venuesRes.data.data);
      setOffices(officesRes.data.data);
      setBookings(bookingsRes.data.data);
      setMeta(bookingsRes.data.meta);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to view event reports.");
      } else {
        setError("Unable to load event reports. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [canOpenEventReports, queryFilters]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const updateFilter = <K extends keyof EventReportFilters>(
    key: K,
    value: EventReportFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    setApplied({ ...filters, page: 1 });
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
  };

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
          ? await EventReportService.exportPdf(exportFilters)
          : await EventReportService.exportExcel(exportFilters);

      await downloadReportResponse(
        response,
        `FilSched-Event-Report.${format === "pdf" ? "pdf" : "xlsx"}`,
      );
    } catch {
      setExportError("Unable to export the event report. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const sortBy = (column: string) => {
    setApplied((current) => ({
      ...current,
      sort: column,
      direction:
        current.sort === column && current.direction === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  if (!can(Permission.REPORTS_VIEW) || !canOpenEventReports) {
    return (
      <div className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
          Event Reports
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Event reports are not available for this role. Vehicle reports will be
          added in a later phase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0095D9]/10">
            <BarChart3 className="h-6 w-6 text-[#0095D9]" />
          </div>
          <div>
            <Link
              to="/reports"
              className="text-sm font-medium text-[#0095D9] hover:underline"
            >
              Reports
            </Link>
            <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
              Event Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live event booking statistics from FilSched records.
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
              onChange={(event) => updateFilter("start_date", event.target.value)}
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
            Search
            <input
              type="search"
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Event title, requester, venue"
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
          {summary?.options.can_filter_venues && (
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Venue
              <select
                value={filters.venue_id ?? ""}
                onChange={(event) =>
                  updateFilter(
                    "venue_id",
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All venues</option>
                {summary.options.venues.map((venue) => (
                  <option key={venue.venue_id} value={venue.venue_id}>
                    {venue.venue}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Event list
            <select
              value={filters.list ?? ""}
              onChange={(event) =>
                updateFilter("list", event.target.value as EventReportFilters["list"])
              }
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All matching events</option>
              <option value="upcoming">Upcoming approved</option>
              <option value="past">Past events</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(summary?.cards ?? []).map((card: EventReportCard) => (
              <StatCard key={card.key} label={card.label} value={card.value} />
            ))}
          </div>

          {trends && (
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardChart chart={trends.daily} variant="bar" />
              <DashboardChart chart={trends.weekly} variant="bar" />
              <DashboardChart chart={trends.monthly} variant="bar" />
              <DashboardChart chart={trends.yearly} variant="bar" />
            </div>
          )}

          {venues && (
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardChart chart={venues.frequency} variant="bar" />
              <DashboardChart chart={venues.distribution} variant="distribution" />
              <VenueList
                title="Most frequently reserved venues"
                rows={venues.most_frequent}
              />
              <VenueList
                title="Least utilized venues"
                rows={venues.least_utilized}
              />
            </div>
          )}

          <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
              Event bookings per office
            </h2>
            {offices.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                No office booking totals for the selected filters.
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
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                          {row.office_name}
                        </td>
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
              Event status report
            </h2>
            {bookings.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                No event bookings match the selected filters.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr>
                      {[
                        ["event_booking_id", "ID"],
                        ["purpose", "Event title"],
                        ["office_name", "Office"],
                        ["requested_by", "Requester"],
                        ["venue", "Venue"],
                        ["date_start", "Start"],
                        ["date_end", "End"],
                        ["status", "Status"],
                        ["approval_stage", "Stage"],
                      ].map(([column, label]) => (
                        <th key={column} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => sortBy(column)}
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
                        key={row.event_booking_id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-3 py-2">{row.event_booking_id}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                          {row.purpose}
                        </td>
                        <td className="px-3 py-2">{row.office ?? "—"}</td>
                        <td className="px-3 py-2">{row.requested_by}</td>
                        <td className="px-3 py-2">{row.venue ?? "—"}</td>
                        <td className="px-3 py-2">{row.date_start ?? "—"}</td>
                        <td className="px-3 py-2">{row.date_end ?? "—"}</td>
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

const VenueList = ({
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
        No venue utilization data for this period.
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

export default EventReportsPage;
