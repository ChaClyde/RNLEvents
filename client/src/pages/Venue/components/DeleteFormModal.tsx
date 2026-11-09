import { useState } from "react";
import {
  FiAlertTriangle,
  FiX,
  FiMapPin,
  FiUsers,
  FiUser,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";

interface DeleteVenueFormModalProps {
  isOpen: boolean;
  venue: VenueColumns | null;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, isFailed?: boolean) => void;
}

const DeleteVenueFormModal = ({
  isOpen,
  venue,
  onClose,
  onSuccess,
  onNotify,
}: DeleteVenueFormModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!venue || loading) return;

    try {
      setLoading(true);

      const response = await VenueService.destroyVenue(venue.venue_id);

      if (response.status === 200 || response.status === 204) {
        onClose();
        onSuccess();
        onNotify("Venue moved to Trash Bin!");
      }
    } catch (error: any) {
      onNotify(
        error.response?.data?.message ??
          "Something went wrong while deleting the venue.",
        true,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Delete Venue
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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
                Are you sure you want to delete this venue?
              </p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                This venue will be moved to the Trash Bin. You can restore it
                later if needed.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            {venue.venue_image && (
              <img
                src={VenueService.getVenueImage(venue.venue_id)}
                alt={venue.venue}
                className="h-40 w-full object-cover"
              />
            )}

            <div className="space-y-3 p-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {venue.venue}
                </h3>
                {venue.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {venue.description}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
                <p className="flex items-center gap-2">
                  <FiMapPin className="shrink-0 text-[#0095D9]" />
                  {venue.location}
                </p>

                <p className="flex items-center gap-2">
                  <FiUsers className="shrink-0 text-[#0095D9]" />
                  {venue.capacity} persons
                </p>

                {venue.person_in_charge && (
                  <p className="flex items-center gap-2">
                    <FiUser className="shrink-0 text-[#0095D9]" />
                    {venue.person_in_charge}
                  </p>
                )}

                {venue.pic_contact_number && (
                  <p className="flex items-center gap-2">
                    <FiPhone className="shrink-0 text-[#0095D9]" />
                    {venue.pic_contact_number}
                  </p>
                )}

                {venue.pic_email && (
                  <p className="flex items-center gap-2 break-all">
                    <FiMail className="shrink-0 text-[#0095D9]" />
                    {venue.pic_email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Moving..." : "Move to Trash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteVenueFormModal;
