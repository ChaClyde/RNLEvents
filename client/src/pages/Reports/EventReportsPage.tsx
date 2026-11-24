import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { BarChart3, FileDown, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import {
  downloadReportResponse,
  printReportResponse,
} from "../../services/downloadReport";
import { periodRange, todayIso, type PeriodKind } from "./reportPeriod";
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

const openingDay = todayIso();
const openingRange = periodRange("daily", openingDay);

const emptyFilters: EventReportFilters = {
  start_date: openingRange.start,
  end_date: openingRange.end,
  status: "",
  office_id: "",
  venue_id: "",
  search: "",
  list: "",
  page: 1,
  per_page: 10,
  sort: "date_start",
  direction: "desc",
  report: "daily",
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
  const [exporting, setExporting] = useState<"pdf" | "excel" | "print" | null>(null);
  const [exportError, setExportError] = useState("");
  const [anchor, setAnchor] = useState(openingDay);
  const [officeSort, setOfficeSort] = useState<"total" | "name">("total");
  const [venueSort, setVenueSort] = useState<"bookings" | "name">("bookings");

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
    const day = todayIso();
    setAnchor(day);
    const range = periodRange("daily", day);
    const next = {
      ...emptyFilters,
      start_date: range.start,
      end_date: range.end,
      report: "daily" as const,
    };
    setFilters(next);
    setApplied(next);
  };

  const exportFilters = useMemo(() => {
    const { page: _page, per_page: _perPage, ...rest } = applied;
    return rest;
  }, [applied]);

  const applyPeriod = (report: PeriodKind, day: string, source = filters) => {
    const range = periodRange(report, day);
    const next = {
      ...source,
      report,
      start_date: range.start,
      end_date: range.end,
      page: 1,
    };
    setFilters(next);
    setApplied(next);
  };

  const exportReport = async (format: "pdf" | "excel" | "print") => {
    if (exporting) {
      return;
    }

    setExporting(format);
    setExportError("");

    try {
      if (format === "excel") {
        const excel = await EventReportService.exportExcel(exportFilters);
        await downloadReportResponse(excel, "FilSched-Event-Report.xlsx");
        return;
      }
      const response = await EventReportService.exportPdf(exportFilters);
      if (format === "print") {
        await printReportResponse(response);
        return;
      }
      await downloadReportResponse(response, "FilSched-Event-Report.pdf");
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Unable to export the event report. Please try again.",
      );
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

  const reportKind = (applied.report || "daily") as PeriodKind;
  const sortedOffices = useMemo(() => {
    const rows = [...offices];
    rows.sort((left, right) =>
      officeSort === "name"
        ? left.office_name.localeCompare(right.office_name)
        : right.total - left.total || left.office_name.localeCompare(right.office_name),
    );
    return rows;
  }, [offices, officeSort]);
  const venueRows = useMemo(() => {
    const rows = [...(venues?.ranked ?? venues?.most_frequent ?? [])];
    rows.sort((left, right) =>
      venueSort === "name"
        ? left.label.localeCompare(right.label)
        : right.value - left.value || left.label.localeCompare(right.label),
    );
    return rows;
  }, [venues, venueSort]);
  const topOffice = [...offices].sort((left, right) => right.total - left.total)[0];
  const topVenue = venues?.most_frequent?.[0];

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
              Daily, weekly, and monthly event bookings by department and venue.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void exportReport("print")}
            disabled={!!exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-[#1E3A5F]/20 px-4 py-2 text-sm font-semibold text-[#1E3A5F] disabled:opacity-60 dark:border-slate-600 dark:text-white"
          >
            {exporting === "print" ? "Preparing print..." : "Print"}
          </button>
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
                <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["daily", "Daily report"],
              ["weekly", "Weekly report"],
              ["monthly", "Monthly report"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyPeriod(value, anchor)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                reportKind === value
                  ? "bg-[#1E3A5F] text-white"
                  : "border border-[#1E3A5F]/20 text-[#1E3A5F] dark:border-slate-600 dark:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {applied.start_date} to {applied.end_date}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {reportKind === "monthly" ? "Month" : reportKind === "weekly" ? "Week containing" : "Day"}
            <input
              type={reportKind === "monthly" ? "month" : "date"}
              value={reportKind === "monthly" ? anchor.slice(0, 7) : anchor}
              onChange={(event) => {
                const value =
                  reportKind === "monthly" && event.target.value
                    ? `${event.target.value}-01`
                    : event.target.value;
                setAnchor(value);
                if (value) {
                  applyPeriod(reportKind, value);
                }
              }}
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
            <DashboardChart
              chart={
                reportKind === "weekly"
                  ? trends.weekly
                  : reportKind === "monthly"
                    ? trends.monthly
                    : trends.daily
              }
              variant="bar"
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">Department with the most events</h2>
              <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
                {topOffice ? `${topOffice.office_name} · ${topOffice.total} events` : "No events in this period."}
              </p>
            </section>
            <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">Most frequently used venue</h2>
              <p className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
                {topVenue ? `${topVenue.label} · ${topVenue.value} bookings` : "No venue bookings in this period."}
              </p>
            </section>
          </div>

          <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">Venues</h2>
              <div className="flex gap-2 text-xs">
                <button type="button" className="rounded-lg border border-[#1E3A5F]/20 px-2 py-1" onClick={() => setVenueSort("bookings")}>Most used</button>
                <button type="button" className="rounded-lg border border-[#1E3A5F]/20 px-2 py-1" onClick={() => setVenueSort("name")}>Name</button>
              </div>
            </div>
            {venueRows.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">No venue bookings in this period.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="px-3 py-2">Venue</th><th className="px-3 py-2">Bookings</th></tr></thead>
                  <tbody>
                    {venueRows.map((row) => (
                      <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
                Departments
              </h2>
              <div className="flex gap-2 text-xs">
                <button type="button" className="rounded-lg border border-[#1E3A5F]/20 px-2 py-1" onClick={() => setOfficeSort("total")}>Most events</button>
                <button type="button" className="rounded-lg border border-[#1E3A5F]/20 px-2 py-1" onClick={() => setOfficeSort("name")}>Name</button>
              </div>
            </div>
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
                    {sortedOffices.map((row) => (
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

export default EventReportsPage;
