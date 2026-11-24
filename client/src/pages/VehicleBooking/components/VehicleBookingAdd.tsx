import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import VehicleBookingForm from "./VehicleBookingForm";

import type {
  VehicleBookingDriver,
  VehicleBookingFormData,
  VehicleBookingOffice,
  VehicleBookingVehicle,
} from "../../../interfaces/VehicleBookingColumns";

import VehicleBookingService from "../../../services/VehicleBookingService";

import {
  getApiErrorMessage,
  getApiValidationErrors,
  type VehicleBookingFieldErrors,
} from "../../../interfaces/VehicleBookingHelpers";

interface VehicleBookingAddProps {
  isOpen: boolean;
  offices?: VehicleBookingOffice[];
  vehicles?: VehicleBookingVehicle[];
  drivers?: VehicleBookingDriver[];
  onClose: () => void;
  onSuccess: () => void;
}

const VehicleBookingAdd: React.FC<VehicleBookingAddProps> = ({
  isOpen,
  offices = [],
  vehicles = [],
  drivers = [],
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<VehicleBookingFieldErrors>(
    {},
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (
    data: VehicleBookingFormData,
    letter: File | null,
  ) => {
    try {
      if (!letter) {
        toast.error("Attach the letter of request before submitting.");
        return;
      }

      setLoading(true);
      setServerErrors({});

      const response = await VehicleBookingService.create(data);
      await VehicleBookingService.uploadLetter(
        response.data.vehicle_booking_id,
        letter,
      );

      toast.success(
        response.message || "Vehicle booking submitted successfully.",
      );

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const fieldErrors = getApiValidationErrors(error);

      setServerErrors(fieldErrors);

      toast.error(
        Object.values(fieldErrors).find(Boolean) || getApiErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={() => {
        if (!loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-booking-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#17212b]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div>
            <h2
              id="vehicle-booking-modal-title"
              className="text-xl font-bold text-[#003B5C] dark:text-white"
            >
              Add Vehicle Booking
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Complete the form below to submit a vehicle booking request.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <VehicleBookingForm
            offices={offices}
            vehicles={vehicles}
            drivers={drivers}
            serverErrors={serverErrors}
            loading={loading}
            submitLabel="Submit Booking Request"
            requireLetter
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleBookingAdd;
