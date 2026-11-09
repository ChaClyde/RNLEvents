import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";

import { useToastMessage } from "../../../hooks/useToastMessage";
import ToastMessage from "../../../components/ToastMessage/ToastMessage";

const VenueTrash = () => {
  const [venues, setVenues] = useState<VenueColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<VenueColumns | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);
  const [toastIsFailed, setToastIsFailed] = useState(false);

  const notify = useCallback(
    (text: string, isFailed = false) => {
      setToastIsFailed(isFailed);
      showToastMessage(text);
    },
    [showToastMessage],
  );

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await VenueService.loadTrashVenues();
      const data = response.data?.data ?? response.data ?? [];

      setVenues(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load trashed venues:", err);
      setError(
        err.response?.data?.message ??
          "Unable to load trashed venues. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const filteredVenues = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return venues;

    return venues.filter(
      (venue) =>
        venue.venue.toLowerCase().includes(keyword) ||
        (venue.location ?? "").toLowerCase().includes(keyword) ||
        (venue.person_in_charge ?? "").toLowerCase().includes(keyword),
    );
  }, [venues, search]);

  const handleRestore = async (venue: VenueColumns) => {
    if (restoringId) return;

    try {
      setRestoringId(venue.venue_id);

      await VenueService.restoreVenue(venue.venue_id);

      setVenues((previous) =>
        previous.filter((item) => item.venue_id !== venue.venue_id),
      );
      notify(`"${venue.venue}" restored successfully!`);
    } catch (err: any) {
      notify(
        err.response?.data?.message ?? "Failed to restore the venue.",
        true,
      );
    } finally {
      setRestoringId(null);
    }
  };

  const handleForceDelete = async () => {
    if (!venueToDelete || deleting) return;

    try {
      setDeleting(true);

      await VenueService.forceDeleteVenue(venueToDelete.venue_id);

      setVenues((previous) =>
        previous.filter((item) => item.venue_id !== venueToDelete.venue_id),
      );
      notify(`"${venueToDelete.venue}" permanently deleted.`);
      setVenueToDelete(null);
    } catch (err: any) {
      notify(
        err.response?.data?.message ??
          "Failed to permanently delete the venue.",
        true,
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Trashed Venues
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Restore venues or delete them permanently.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#0095D9]/10 px-3 py-1.5 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
            {filteredVenues.length}{" "}
            {filteredVenues.length === 1 ? "venue" : "venues"}
          </span>

          <button
            type="button"
            onClick={loadTrash}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trashed venues..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={loadTrash}
            className="text-sm font-semibold text-red-700 underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiRefreshCw className="mx-auto mb-3 animate-spin text-3xl text-[#0095D9]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading trashed venues...
          </p>
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiTrash2 className="mx-auto mb-3 text-4xl text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {search ? "No matching venues" : "No trashed venues"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search
              ? "Try a different search keyword."
              : "Venues you delete will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVenues.map((venue) => (
            <article
              key={venue.venue_id}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {venue.venue}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <FiMapPin className="shrink-0 text-[#0095D9]" />
                  {venue.location}
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-2">
                  <FiUsers className="shrink-0 text-[#0095D9]" />
                  {venue.capacity.toLocaleString()} persons
                </p>

                <p className="flex items-center gap-2">
                  <FiUser className="shrink-0 text-[#0095D9]" />
                  {venue.person_in_charge || "No person in charge"}
                </p>

                <p className="flex items-center gap-2">
                  <FiPackage className="shrink-0 text-[#0095D9]" />
                  {venue.resources?.length ?? 0} resources
                </p>
              </div>

              <p className="border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                Moved to trash on {formatDate(venue.updated_at)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRestore(venue)}
                  disabled={restoringId === venue.venue_id}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#0095D9]/30 px-3 py-2.5 text-sm font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 disabled:opacity-50 dark:text-[#38BDF8]"
                >
                  <FiRotateCcw size={15} />
                  {restoringId === venue.venue_id ? "Restoring..." : "Restore"}
                </button>

                <button
                  type="button"
                  onClick={() => setVenueToDelete(venue)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <FiTrash2 size={15} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {venueToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Delete Permanently
              </h2>

              <button
                type="button"
                onClick={() => setVenueToDelete(null)}
                disabled={deleting}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                <FiAlertTriangle className="mt-0.5 shrink-0 text-xl text-red-600 dark:text-red-400" />

                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    Permanently delete "{venueToDelete.venue}"?
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                    This also deletes its resources and image. This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVenueToDelete(null)}
                  disabled={deleting}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleForceDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueTrash;
