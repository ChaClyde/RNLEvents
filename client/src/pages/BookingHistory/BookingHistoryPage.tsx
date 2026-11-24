import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { History } from "lucide-react";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import BookingHistoryService, {
  type BookingHistoryRow,
  type BookingHistorySummary,
} from "../../services/BookingHistoryService";

const emptySummary: BookingHistorySummary = {
  events_approved: 0,
  events_rejected: 0,
  vehicles_approved: 0,
  vehicles_rejected: 0,
};

const BookingHistoryPage = () => {
  const { can } = usePermissions();
  const [module, setModule] = useState<"events" | "vehicles">("events");
  const [status, setStatus] = useState<"" | "approved" | "rejected">("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingHistoryRow[]>([]);
  const [summary, setSummary] = useState<BookingHistorySummary>(emptySummary);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    if (!can(Permission.SYSTEM_HISTORY_VIEW)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await BookingHistoryService.index({
        module,
        status,
        search: appliedSearch,
        page,
        per_page: 10,
      });
      setRows(response.data.data);
      setSummary(response.data.summary);
      setMeta(response.data.meta);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to view booking history.");
      } else {
        setError("Unable to load booking history. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, can, module, page, status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (!can(Permission.SYSTEM_HISTORY_VIEW)) {
    return (
      <div className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
          Booking History
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Booking history is not available for this role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0095D9]/10">
          <History className="h-6 w-6 text-[#0095D9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
            Booking History
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Approved and rejected event and vehicle bookings. Pending requests
            stay in the approval queue.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Approved events" value={summary.events_approved} />
        <SummaryCard label="Rejected events" value={summary.events_rejected} />
        <SummaryCard label="Approved trips" value={summary.vehicles_approved} />
        <SummaryCard label="Rejected trips" value={summary.vehicles_rejected} />
      </div>

      <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["events", "Event bookings"],
              ["vehicles", "Vehicle bookings"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setModule(value);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                module === value
                  ? "bg-[#1E3A5F] text-white"
                  : "border border-[#1E3A5F]/20 text-[#1E3A5F] dark:border-slate-600 dark:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | "approved" | "rejected");
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Approved and rejected</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
            Search
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                module === "events"
                  ? "Purpose, requester, office, or venue"
                  : "Purpose, requester, destination, vehicle, or driver"
              }
              className="mt-1 w-full rounded-xl border border-[#1E3A5F]/20 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setAppliedSearch(search.trim());
            setPage(1);
          }}
          className="mt-4 rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
          {module === "events" ? "Event booking history" : "Vehicle booking history"}
        </h2>
        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading booking history...</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No approved or rejected bookings match this history.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Requester</th>
                  <th className="px-3 py-2">Office</th>
                  <th className="px-3 py-2">
                    {module === "events" ? "Venue" : "Destination"}
                  </th>
                  {module === "vehicles" ? (
                    <>
                      <th className="px-3 py-2">Vehicle</th>
                      <th className="px-3 py-2">Driver</th>
                    </>
                  ) : null}
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.module}-${row.id}`}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                      {row.purpose}
                      {row.remarks ? (
                        <p className="mt-1 text-xs font-normal text-slate-500">
                          {row.remarks}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row.requested_by}</td>
                    <td className="px-3 py-2">{row.office ?? "—"}</td>
                    <td className="px-3 py-2">{row.place ?? "—"}</td>
                    {module === "vehicles" ? (
                      <>
                        <td className="px-3 py-2">{row.vehicle ?? "—"}</td>
                        <td className="px-3 py-2">{row.driver ?? "—"}</td>
                      </>
                    ) : null}
                    <td className="px-3 py-2">
                      {row.date_start ?? "—"}
                      {row.date_end && row.date_end !== row.date_start
                        ? ` to ${row.date_end}`
                        : ""}
                    </td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                    <td className="px-3 py-2">{row.updated_at ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {meta.current_page} of {meta.last_page} · {meta.total} records
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-[#1E3A5F]/20 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-[#1E3A5F]/20 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold text-[#1E3A5F] dark:text-white">{value}</p>
  </section>
);

export default BookingHistoryPage;
