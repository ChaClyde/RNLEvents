import { useEffect, useState, type FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import Spinner from "../../../components/Spinner/Spinner";
import type { EventColumns } from "../../../interfaces/EventColumns";
import { CalendarDays, Building2, MapPin, Filter, RefreshCw } from "lucide-react";

interface EventListProps {
  events: EventColumns[];
  loading: boolean;
  onViewEvent: (event: EventColumns) => void;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 10;

const dateKey = (value?: string | null): string => (value ?? "").slice(0, 10);

const formatDate = (value?: string | null): string => {
  const key = dateKey(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH");
};

const formatClock = (value?: string | null): string => {
  if (!value) return "—";
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return value;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatApproved = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const EventList: FC<EventListProps> = ({
  events,
  loading,
  onViewEvent,
  onRefresh,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOffice, setFilterOffice] = useState("");
  const [filterVenue, setFilterVenue] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const offices = Array.from(
    new Map(
      events
        .filter((event) => event.office)
        .map((event) => [event.office_id, event.office.office_name]),
    ).entries(),
  );
  const venues = Array.from(
    new Map(
      events
        .filter((event) => event.venue)
        .map((event) => [event.venue_id, event.venue.venue]),
    ).entries(),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOffice, filterVenue, filterDate]);

  const filteredEvents = events.filter((event) => {
    const search = searchQuery.trim().toLowerCase();
    const matchesSearch =
      search === "" ||
      event.purpose.toLowerCase().includes(search) ||
      (event.venue?.venue ?? "").toLowerCase().includes(search) ||
      (event.requested_by ?? "").toLowerCase().includes(search) ||
      (event.office?.office_name ?? "").toLowerCase().includes(search);

    const matchesOffice =
      filterOffice === "" || String(event.office_id) === filterOffice;
    const matchesVenue =
      filterVenue === "" || String(event.venue_id) === filterVenue;
    const matchesDate =
      filterDate === "" || dateKey(event.date_start) === filterDate;

    return matchesSearch && matchesOffice && matchesVenue && matchesDate;
  });

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterOffice("");
    setFilterVenue("");
    setFilterDate("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#0095D9]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-[#003B5C] to-[#0095D9] p-3">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#003B5C] dark:text-white sm:text-4xl">
                Event Management
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Approved bookings appear here after every approver has signed off.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={!onRefresh || loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C] hover:shadow-lg hover:shadow-[#0095D9]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
          <div className="mt-3 flex items-center gap-3">
            <CalendarDays className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {events.length}
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5 dark:border-[#0095D9]/30 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Venues</p>
          <div className="mt-3 flex items-center gap-3">
            <MapPin className="text-[#003B5C] dark:text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {venues.length}
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">Offices</p>
          <div className="mt-3 flex items-center gap-3">
            <Building2 className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {offices.length}
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5 dark:border-[#0095D9]/30 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Filtered Results</p>
          <div className="mt-3 flex items-center gap-3">
            <Filter className="text-[#003B5C] dark:text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {filteredEvents.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <input
          type="text"
          placeholder="Search purpose, venue, requestor..."
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setSearchQuery(event.target.value);
          }}
          className="w-full rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:w-72"
        />
        <select
          value={filterVenue}
          onChange={(event) => setFilterVenue(event.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Venues</option>
          {venues.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={filterOffice}
          onChange={(event) => setFilterOffice(event.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Offices</option>
          {offices.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {(searchQuery || filterOffice || filterVenue || filterDate) && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-500 underline transition hover:text-[#0095D9] dark:text-gray-400"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 border-b border-[#003B5C] bg-gradient-to-r from-[#003B5C] to-[#0095D9] text-xs text-white">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-center">
                  NO.
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  PURPOSE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  VENUE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  OFFICE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  SCHEDULE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  REQUESTED BY
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  APPROVED
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-center">
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#0095D9]/10 text-sm text-gray-700 dark:divide-gray-800 dark:text-gray-300">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarDays size={32} className="opacity-40" />
                      <p className="font-medium">No approved events found.</p>
                      <p className="text-xs">
                        A booking is added here after every approver has signed off.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((event, index) => (
                  <TableRow
                    key={event.event_id}
                    className="transition-colors hover:bg-[#0095D9]/5 dark:hover:bg-gray-800/70"
                  >
                    <TableCell className="px-4 py-3 text-center">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {event.purpose}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {event.venue?.venue ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {event.office?.office_name ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {formatDate(event.date_start)}
                      {dateKey(event.date_start) !== dateKey(event.date_end)
                        ? ` – ${formatDate(event.date_end)}`
                        : ""}
                      <div className="text-xs text-gray-500">
                        {formatClock(event.time_start)} – {formatClock(event.time_end)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">{event.requested_by}</TableCell>
                    <TableCell className="px-4 py-3">
                      {formatApproved(event.approved_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onViewEvent(event)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        >
                          View
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && totalPages > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#0095D9]/10 px-6 py-4 dark:border-gray-800 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of{" "}
              {filteredEvents.length} events
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    currentPage === page
                      ? "bg-[#0095D9] text-white"
                      : "border border-[#0095D9]/20 bg-white text-gray-700 hover:bg-[#0095D9]/5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventList;
