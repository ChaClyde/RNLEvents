import { useEffect, useState } from "react";
import { FiX, FiPackage, FiAlertCircle } from "react-icons/fi";

import type { VenueColumns } from "../../../interfaces/VenueColumns";
import VenueService from "../../../services/VenueService";

import ToastMessage from "../../../components/ToastMessage/ToastMessage";
import { useToastMessage } from "../../../hooks/useToastMessage";

import VenueResourcesForm, {
  type VenueResourceInput,
} from "./VenueResourcesForm";

interface VenueResourcesModalProps {
  isOpen: boolean;
  venues: VenueColumns[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
}

const VenueResourcesModal = ({
  isOpen,
  venues,
  onClose,
  onSuccess,
}: VenueResourcesModalProps) => {
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [resources, setResources] = useState<VenueResourceInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isFailed, setIsFailed] = useState(false);

  const { message, isVisible, showToastMessage, closeToastMessage } =
    useToastMessage("", false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedVenueId("");
    setResources([]);
    setLoading(false);
    setErrorMessage("");
    setFieldErrors({});
    setIsFailed(false);
  }, [isOpen]);

  const selectedVenue = venues.find(
    (venue) => String(venue.venue_id) === selectedVenueId,
  );

  /*
  |--------------------------------------------------------------------------
  | Select Venue
  |--------------------------------------------------------------------------
  */

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    setErrorMessage("");
    setFieldErrors({});

    const venue = venues.find((item) => String(item.venue_id) === venueId);

    setResources(
      (venue?.resources ?? []).map((resource) => ({
        resource_id: resource.resource_id,
        resource_name: resource.resource_name,
        total_quantity: resource.total_quantity,
        availability_type: resource.availability_type,
        condition: resource.condition,
        coordination_office: resource.coordination_office,
        notes: resource.notes,
      })),
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Save Venue Resources
  |--------------------------------------------------------------------------
  */

  const handleSave = async () => {
    if (!selectedVenue) {
      setErrorMessage("Please select a venue first.");
      return;
    }

    const hasEmptyResource = resources.some(
      (resource) => !resource.resource_name.trim(),
    );

    if (hasEmptyResource) {
      setErrorMessage("Please provide a name for every resource.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setFieldErrors({});
    closeToastMessage();

    try {
      const formData = new FormData();

      resources.forEach((resource, index) => {
        if (resource.resource_id) {
          formData.append(
            `resources[${index}][resource_id]`,
            String(resource.resource_id),
          );
        }

        formData.append(
          `resources[${index}][resource_name]`,
          resource.resource_name.trim(),
        );

        formData.append(
          `resources[${index}][total_quantity]`,
          resource.total_quantity == null
            ? ""
            : String(resource.total_quantity),
        );

        formData.append(
          `resources[${index}][availability_type]`,
          resource.availability_type,
        );

        formData.append(`resources[${index}][condition]`, resource.condition);

        formData.append(
          `resources[${index}][coordination_office]`,
          resource.coordination_office ?? "",
        );

        formData.append(`resources[${index}][notes]`, resource.notes ?? "");
      });

      await VenueService.updateVenue(selectedVenue.venue_id, formData);

      // Show success notification.
      setIsFailed(false);
      showToastMessage("Venue resources updated successfully!");

      // Refresh venue data in the parent component.
      onSuccess();

      // Close the modal.
      onClose();
    } catch (error) {
      const apiError = error as ApiError;

      const errorMessage =
        apiError.response?.data?.message ??
        "Failed to save venue resources. Please try again.";

      setErrorMessage(errorMessage);
      setIsFailed(true);

      showToastMessage(errorMessage);

      if (apiError.response?.status === 422) {
        setFieldErrors(apiError.response.data?.errors ?? {});
      }

      console.error("Failed to save venue resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const validationMessages = Object.values(fieldErrors).flat();

  return (
    <>
      {/* Toast Notification */}
      <ToastMessage
        message={message}
        isFailed={isFailed}
        isVisible={isVisible}
        onClose={closeToastMessage}
      />

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between bg-linear-to-r from-[#003B5C] to-[#00679E] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <FiPackage size={22} />

                <div>
                  <h2 className="font-bold">Venue Resources</h2>
                  <p className="text-xs text-white/80">
                    Manage venue inventory
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Close modal"
                className="rounded-lg p-1 transition hover:bg-white/20 disabled:opacity-50"
              >
                <FiX size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">{errorMessage}</p>

                      {validationMessages.length > 0 && (
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          {validationMessages.map((message, index) => (
                            <li key={index}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Select Venue */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Venue
                </label>

                <select
                  value={selectedVenueId}
                  onChange={(e) => handleVenueChange(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Select Venue --</option>

                  {venues
                    .filter((venue) => !venue.is_deleted)
                    .map((venue) => (
                      <option key={venue.venue_id} value={venue.venue_id}>
                        {venue.venue}
                      </option>
                    ))}
                </select>
              </div>

              {/* Selected Venue */}
              {selectedVenue && (
                <div className="rounded-xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-4 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Managing Resources For
                  </p>

                  <h3 className="mt-1 font-semibold text-[#003B5C] dark:text-white">
                    {selectedVenue.venue}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {resources.length}{" "}
                    {resources.length === 1 ? "resource" : "resources"}
                  </p>
                </div>
              )}

              {/* Resource Form */}
              {selectedVenue && (
                <VenueResourcesForm
                  resources={resources}
                  onChange={(updatedResources) => {
                    setResources(updatedResources);
                    setErrorMessage("");
                    setFieldErrors({});
                  }}
                />
              )}

              {/* Empty State */}
              {!selectedVenue && (
                <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
                  <FiPackage size={36} className="mx-auto mb-3 text-gray-400" />

                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    No venue selected
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select a venue to manage its resources.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
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
                onClick={handleSave}
                disabled={!selectedVenue || loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#003B5C] to-[#00679E] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  "Save Resources"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VenueResourcesModal;
