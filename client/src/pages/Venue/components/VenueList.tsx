import { useState, type FC } from "react";
import Spinner from "../../../components/Spinner/Spinner";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import {
  MapPin,
  Building2,
  Users2,
  Plus,
  Search,
  RefreshCw,
  Layers,
} from "lucide-react";

interface VenueListProps {
  venues: VenueColumns[];
  loading: boolean;
  onAddVenue: () => void;
  onEditVenue: (venue: VenueColumns) => void;
  onDeleteVenue: (venue: VenueColumns) => void;
  onRefresh?: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const VenueList: FC<VenueListProps> = ({
  venues,
  loading,
  onAddVenue,
  onEditVenue,
  onDeleteVenue,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const filteredVenues = venues.filter((venue) => {
    const query = searchQuery.toLowerCase();
    return (
      query === "" ||
      venue.venue.toLowerCase().includes(query) ||
      venue.location.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredVenues.length / itemsPerPage);
  const paginatedVenues = filteredVenues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#0095D9]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#003B5C]">
                Venue Management
              </h1>
              <p className="mt-1 text-gray-500">
                Manage venues available for event booking.
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5">
          <p className="text-sm text-gray-500">Total Venues</p>
          <div className="mt-3 flex items-center gap-3">
            <Building2 className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {venues.length}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5">
          <p className="text-sm text-gray-500">Combined Capacity</p>
          <div className="mt-3 flex items-center gap-3">
            <Users2 className="text-[#003B5C]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {totalCapacity}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5">
          <p className="text-sm text-gray-500">Filtered Results</p>
          <div className="mt-3 flex items-center gap-3">
            <Layers className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {filteredVenues.length}
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
            placeholder="Search name or location..."
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
          onClick={onAddVenue}
          className="ml-auto rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} />
            Add Venue
          </div>
        </button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex justify-center rounded-3xl border border-[#0095D9]/20 bg-white py-16 shadow-sm">
          <Spinner size="md" />
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="rounded-3xl border border-[#0095D9]/20 bg-white py-16 text-center text-gray-400 shadow-sm">
          No venues found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedVenues.map((venue) => (
            <div
              key={venue.venue_id}
              className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm transition hover:shadow-lg"
            >
              {/* Big image holder */}
              <div className="h-56 w-full bg-gray-100">
                {venue.venue_image ? (
                  <img
                    src={`${backendUrl}/api/venues/getVenueImage/${venue.venue_id}`}
                    alt={venue.venue}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <Building2 size={48} />
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-[#003B5C]">
                  {venue.venue}
                </h3>

                {venue.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {venue.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0095D9]/10 px-3 py-1 text-[#0095D9]">
                    <Users2 size={14} />
                    {venue.capacity}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#003B5C]/10 px-3 py-1 text-[#003B5C]">
                    <MapPin size={14} />
                    {venue.location}
                  </span>
                </div>

                <div className="mt-5 flex gap-2 border-t border-[#0095D9]/10 pt-4">
                  <button
                    type="button"
                    onClick={() => onEditVenue(venue)}
                    className="flex-1 rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-2 text-sm font-medium text-[#0095D9] hover:bg-[#0095D9]/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVenue(venue)}
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
            {Math.min(currentPage * itemsPerPage, filteredVenues.length)} of{" "}
            {filteredVenues.length} venues
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

export default VenueList;
