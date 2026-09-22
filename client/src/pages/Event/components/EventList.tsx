import { useState, type FC } from "react";
import Spinner from "../../../components/Spinner/Spinner";
import type { EventColumns } from "../../../interfaces/EventColumns";
import {
  CalendarDays,
  MapPin,
  Plus,
  Search,
  RefreshCw,
  Building2,
} from "lucide-react";

interface EventListProps {
  events: EventColumns[];
  loading: boolean;
  onAddEvent: () => void;
  onViewEvent: (event: EventColumns) => void;
  onEditEvent: (event: EventColumns) => void;
  onDeleteEvent: (event: EventColumns) => void;
  onRefresh?: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const EventList: FC<EventListProps> = ({
  events,
  loading,
  onAddEvent,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase();
    return (
      query === "" ||
      event.purpose.toLowerCase().includes(query) ||
      event.venue?.venue.toLowerCase().includes(query) ||
      event.requested_by.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#0095D9]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#003B5C]">
                Event Management
              </h1>
              <p className="mt-1 text-gray-500">
                Schedule events and request venues and equipment.
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C] hover:shadow-lg hover:shadow-[#0095D9]/25"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
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
            placeholder="Search purpose, venue, requestor..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-72 rounded-2xl border border-[#0095D9]/20 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none focus:border-[#0095D9]"
          />
        </div>

        <button
          type="button"
          onClick={onAddEvent}
          className="ml-auto rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} />
            Add Event
          </div>
        </button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex justify-center rounded-3xl border border-[#0095D9]/20 bg-white py-16 shadow-sm">
          <Spinner size="md" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-[#0095D9]/20 bg-white py-16 text-center text-gray-400 shadow-sm">
          No events found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedEvents.map((event) => (
            <div
              key={event.event_id}
              className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm transition hover:shadow-lg"
            >
              <div className="h-40 w-full bg-gray-100">
                {event.venue?.venue_image ? (
                  <img
                    src={`${backendUrl}/api/venues/getVenueImage/${event.venue.venue_id}`}
                    alt={event.venue.venue}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <MapPin size={36} />
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-[#003B5C] line-clamp-1">
                  {event.purpose}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0095D9]/10 px-3 py-1 text-[#0095D9]">
                    <MapPin size={12} />
                    {event.venue?.venue ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#003B5C]/10 px-3 py-1 text-[#003B5C]">
                    <Building2 size={12} />
                    {event.office?.office ?? "—"}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                  <CalendarDays size={14} className="text-[#0095D9]" />
                  {event.date_start} – {event.date_end} ({event.number_of_days}{" "}
                  {event.number_of_days === 1 ? "day" : "days"})
                </div>

                <div className="mt-5 flex gap-2 border-t border-[#0095D9]/10 pt-4">
                  <button
                    type="button"
                    onClick={() => onViewEvent(event)}
                    className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-100"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditEvent(event)}
                    className="flex-1 rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-2 text-sm font-medium text-[#0095D9] hover:bg-[#0095D9]/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEvent(event)}
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-3xl border border-[#0095D9]/20 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of{" "}
            {filteredEvents.length} events
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-30 hover:bg-[#0095D9]/5 transition"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  currentPage === page
                    ? "bg-[#0095D9] text-white"
                    : "border border-[#0095D9]/20 bg-white text-gray-700 hover:bg-[#0095D9]/5"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-30 hover:bg-[#0095D9]/5 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventList;
