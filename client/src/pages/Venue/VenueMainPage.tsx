import { useCallback, useEffect, useState } from "react";
import {
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiUsers,
  FiPackage,
} from "react-icons/fi";

import VenueService from "../../services/VenueService";
import type { VenueColumns } from "../../interfaces/VenueColumns";

import { useToastMessage } from "../../hooks/useToastMessage";
import ToastMessage from "../../components/ToastMessage/ToastMessage";

import VenueList from "./components/VenueList";
import AddVenueFormModal from "./components/AddVenueFormModal";
import DeleteVenueFormModal from "./components/DeleteFormModal";
import EditVenueFormModal from "./components/EditFormModal";
import VenueResourcesModal from "./components/VenueResourcesModal";

const VenueMainPage = () => {
  const [venues, setVenues] = useState<VenueColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  const [selectedVenue, setSelectedVenue] = useState<VenueColumns | null>(null);

  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);

  const [toastIsFailed, setToastIsFailed] = useState(false);

  const notify = useCallback(
    (message: string, isFailed = false) => {
      setToastIsFailed(isFailed);
      showToastMessage(message);
    },
    [showToastMessage],
  );

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await VenueService.loadVenues();
      const data = response.data?.data ?? response.data ?? [];

      setVenues(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load venues:", err);

      setError(
        err.response?.data?.message ??
          "Unable to load venues. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const handleEdit = (venue: VenueColumns) => {
    setSelectedVenue(venue);
    setIsEditOpen(true);
  };

  const handleDelete = (venue: VenueColumns) => {
    setSelectedVenue(venue);
    setIsDeleteOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setSelectedVenue(null);
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setSelectedVenue(null);
  };

  const availableCount = venues.filter(
    (venue) => venue.status === "available",
  ).length;

  const unavailableCount = venues.filter(
    (venue) => venue.status === "unavailable",
  ).length;

  const totalCapacity = venues.reduce(
    (total, venue) => total + Number(venue.capacity || 0),
    0,
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast Notification */}
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-linear-to-br from-[#003B5C] to-[#0095D9] p-3 text-white shadow-md">
            <FiMapPin size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Venue Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage university venues, facilities, and resources.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsResourcesOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#0095D9]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-sky-400 dark:hover:bg-gray-800"
          >
            <FiPackage size={17} />
            Venue Resources
          </button>

          <button
            type="button"
            onClick={loadVenues}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#003B5C] to-[#00679E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#00679E] hover:to-[#0095D9]"
          >
            <FiPlus />
            Add Venue
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Venues
            </p>
            <FiMapPin className="text-xl text-[#0095D9]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {venues.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Available
            </p>
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {availableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unavailable
            </p>
            <span className="h-3 w-3 rounded-full bg-red-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {unavailableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Capacity
            </p>
            <FiUsers className="text-xl text-[#0095D9]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {totalCapacity.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Persons</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={loadVenues}
            className="text-sm font-semibold text-red-700 underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Venue List */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiRefreshCw className="mx-auto mb-3 animate-spin text-3xl text-[#0095D9]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading venues...
          </p>
        </div>
      ) : (
        <VenueList
          venues={venues}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Add Venue */}
      <AddVenueFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadVenues}
        onNotify={notify}
      />

      {/* Edit Venue */}
      <EditVenueFormModal
        isOpen={isEditOpen}
        venue={selectedVenue}
        onClose={closeEdit}
        onSuccess={loadVenues}
        onNotify={notify}
      />

      {/* Delete Venue */}
      <DeleteVenueFormModal
        isOpen={isDeleteOpen}
        venue={selectedVenue}
        onClose={closeDelete}
        onSuccess={loadVenues}
        onNotify={notify}
      />

      {/* Venue Resources */}
      <VenueResourcesModal
        isOpen={isResourcesOpen}
        venues={venues}
        onClose={() => setIsResourcesOpen(false)}
        onSuccess={loadVenues}
      />
    </div>
  );
};

export default VenueMainPage;
