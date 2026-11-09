import { useMemo, useState } from "react";
import {
  FiSearch,
  FiMapPin,
  FiUsers,
  FiUser,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiClock,
  FiFilter,
  FiX,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";

interface VenueListProps {
  venues: VenueColumns[];
  onEdit: (venue: VenueColumns) => void;
  onDelete: (venue: VenueColumns) => void;
}

const ITEMS_PER_PAGE = 6;

const VenueList = ({ venues, onEdit, onDelete }: VenueListProps) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredVenues = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return venues.filter((venue) => {
      const matchesSearch =
        !keyword ||
        venue.venue.toLowerCase().includes(keyword) ||
        (venue.location ?? "").toLowerCase().includes(keyword) ||
        (venue.person_in_charge ?? "").toLowerCase().includes(keyword) ||
        (venue.description ?? "").toLowerCase().includes(keyword) ||
        (venue.facilities ?? []).some((facility) =>
          facility.toLowerCase().includes(keyword),
        ) ||
        (venue.resources ?? []).some((resource) =>
          resource.resource_name.toLowerCase().includes(keyword),
        );

      const matchesStatus =
        statusFilter === "all" || venue.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [venues, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVenues.length / ITEMS_PER_PAGE),
  );

  const paginatedVenues = filteredVenues.slice(
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

  const formatRate = (rate: number | string) => {
    return Number(rate || 0).toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-5">
      {/* List Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            University Venues
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse and manage registered venues.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#0095D9]/10 px-3 py-1.5 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
          {filteredVenues.length}{" "}
          {filteredVenues.length === 1 ? "venue" : "venues"} found
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
            placeholder="Search venue, location, PIC, or resources..."
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
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
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

      {/* Venue Cards */}
      {paginatedVenues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0095D9]/10 text-[#0095D9]">
            <FiMapPin size={26} />
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white">
            No venues found
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Start by adding your first university venue."}
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
          {paginatedVenues.map((venue) => (
            <article
              key={venue.venue_id}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                {venue.venue_image ? (
                  <img
                    src={VenueService.getVenueImage(venue.venue_id)}
                    alt={venue.venue}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                    <FiMapPin size={34} />
                    <span className="mt-2 text-xs">No venue image</span>
                  </div>
                )}

                <div className="absolute left-3 top-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                      venue.status === "available"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/80 dark:text-red-300"
                    }`}
                  >
                    {venue.status === "available" ? "Available" : "Unavailable"}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(venue)}
                    title="Edit venue"
                    className="rounded-lg bg-white/95 p-2.5 text-[#00679E] shadow-md transition hover:bg-[#00679E] hover:text-white"
                  >
                    <FiEdit2 size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(venue)}
                    title="Delete venue"
                    className="rounded-lg bg-white/95 p-2.5 text-red-600 shadow-md transition hover:bg-red-600 hover:text-white"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Venue Details */}
              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {venue.venue}
                  </h3>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <FiMapPin className="shrink-0 text-[#0095D9]" />
                    {venue.location}
                  </p>

                  {venue.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {venue.description}
                    </p>
                  )}
                </div>

                {/* Capacity and PIC */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <FiUsers size={15} />
                      <span className="text-xs">Capacity</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {venue.capacity.toLocaleString()} persons
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-gray-400">
                      <FiUser size={15} />
                      <span className="text-xs">Person in Charge</span>
                    </div>
                    <p
                      className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200"
                      title={venue.person_in_charge ?? "Not assigned"}
                    >
                      {venue.person_in_charge || "Not assigned"}
                    </p>
                  </div>
                </div>

                {/* Facilities */}
                {venue.facilities && venue.facilities.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Facilities
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {venue.facilities.slice(0, 4).map((facility, index) => (
                        <span
                          key={`${facility}-${index}`}
                          className="rounded-lg bg-[#0095D9]/10 px-2.5 py-1 text-xs font-medium text-[#00679E] dark:text-[#38BDF8]"
                        >
                          {facility}
                        </span>
                      ))}

                      {venue.facilities.length > 4 && (
                        <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          +{venue.facilities.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Resources */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiPackage className="text-[#0095D9]" />
                    <span>Resources</span>
                  </div>

                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {venue.resources?.length ?? 0} items
                  </span>
                </div>

                {/* Overtime */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiClock className="text-[#0095D9]" />
                    <span>Overtime Rate</span>
                  </div>

                  <span className="text-right text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {formatRate(venue.overtime_rate)}
                  </span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => onEdit(venue)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#0095D9]/30 px-3 py-2.5 text-sm font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 dark:text-[#38BDF8]"
                  >
                    <FiEdit2 size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(venue)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <FiTrash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredVenues.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredVenues.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {filteredVenues.length}
            </span>{" "}
            venues
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

export default VenueList;
