import { useCallback, useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiPlus,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import EventBookingService from "../../services/EventBookingService";
import VenueService from "../../services/VenueService";
import OfficeService from "../../services/OfficeService";

import type {
  EventBookingColumns,
  EventBookingFormData,
} from "../../interfaces/EventBookingColumns";
import type { VenueColumns } from "../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../interfaces/OfficeColumns";
import { parseApiError } from "../../interfaces/EventBookingHelpers";

import { useToastMessage } from "../../hooks/useToastMessage";
import { usePermissions } from "../../hooks/usePermissions";
import { ApprovalPipeline, Permission } from "../../permissions/constants";
import ToastMessage from "../../components/ToastMessage/ToastMessage";

import EventBookingList from "./components/EventBookingList";
import EventBookingAdd from "./components/EventBookingAdd";
import EventBookingEdit from "./components/EventBookingEdit";
import EventBookingView from "./components/EventBookingView";

// ========================================
// HELPER FUNCTIONS
// ========================================

// Reads { message, data } responses (bookings and venues)
const getResponseData = <T,>(response: unknown): T => {
  const result = response as {
    data?: {
      data?: T;
    };
  };

  return result?.data?.data as T;
};

const getErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
    message?: string;
  };

  const validationErrors = err.response?.data?.errors;

  if (validationErrors) {
    const firstError = Object.values(validationErrors).flat()[0];

    if (firstError) return firstError;
  }

  return (
    err.response?.data?.message ||
    err.message ||
    "Something went wrong. Please try again."
  );
};

// ========================================
// MAIN PAGE
// ========================================

const EventBookingMainPage = () => {
  // --------------------------------------
  // STATES
  // --------------------------------------

  const [bookings, setBookings] = useState<EventBookingColumns[]>([]);
  const [venues, setVenues] = useState<VenueColumns[]>([]);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editBooking, setEditBooking] = useState<EventBookingColumns | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const [viewBooking, setViewBooking] = useState<EventBookingColumns | null>(
    null,
  );
  const [isActing, setIsActing] = useState(false);
  const { can } = usePermissions();

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

  // --------------------------------------
  // LOAD EVENT BOOKINGS
  // --------------------------------------

  const loadBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await EventBookingService.loadEventBookings();
      const data = getResponseData<EventBookingColumns[]>(response);

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------
  // LOAD VENUES AND OFFICES
  // Venues come back as { message, data }.
  // Offices come back as { offices } (a different shape).
  // --------------------------------------

  const loadFormOptions = useCallback(async () => {
    try {
      const [venueResponse, officeResponse] = await Promise.all([
        VenueService.loadVenues(),
        OfficeService.loadOffices(),
      ]);

      const venueData = getResponseData<VenueColumns[]>(venueResponse);
      const officeData = officeResponse.data?.offices;

      setVenues(Array.isArray(venueData) ? venueData : []);

      if (Array.isArray(officeData)) {
        setOffices(officeData as OfficeColumns[]);
      } else {
        setOffices([]);
        setError("Unable to load offices. Please refresh the page.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadFormOptions();
  }, [loadBookings, loadFormOptions]);

  // --------------------------------------
  // CREATE
  // Errors are re-thrown so the modal can show them under its fields.
  // --------------------------------------

  const handleAddBooking = async (data: EventBookingFormData) => {
    try {
      setIsSubmitting(true);

      await EventBookingService.storeEventBooking(data);

      setIsAddOpen(false);
      notify("Event booking submitted successfully!");

      await loadBookings();
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------
  // UPDATE
  // --------------------------------------

  const handleUpdateBooking = async (
    event_booking_id: number,
    data: EventBookingFormData,
  ) => {
    try {
      setIsUpdating(true);

      await EventBookingService.updateEventBooking(event_booking_id, data);

      setEditBooking(null);
      notify("Event booking updated successfully!");

      await loadBookings();
    } finally {
      setIsUpdating(false);
    }
  };

  // --------------------------------------
  // DELETE
  // --------------------------------------

  const handleDeleteBooking = async (booking: EventBookingColumns) => {
    const confirmed = window.confirm(
      `Are you sure you want to move "${booking.purpose}" to the Trash Bin?`,
    );

    if (!confirmed) return;

    try {
      await EventBookingService.destroyEventBooking(booking.event_booking_id);

      notify("Event booking moved to Trash Bin!");

      await loadBookings();
    } catch (err) {
      notify(getErrorMessage(err), true);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadBookings(), loadFormOptions()]);
  };

  const bookingPermissionContext = (booking: EventBookingColumns) => ({
    officeId: booking.office_id,
    ownerId: booking.requested_by_user_id ?? booking.requester?.user_id,
    approvalStage: booking.approval_stage,
    approvalPipeline: ApprovalPipeline.EVENT,
  });

  const canApproveBooking = (booking: EventBookingColumns) =>
    booking.status === "pending" &&
    can(Permission.EVENT_APPROVALS_APPROVE, bookingPermissionContext(booking));

  const canCancelBooking = (booking: EventBookingColumns) =>
    (booking.status === "pending" || booking.status === "approved") &&
    can(Permission.EVENT_BOOKINGS_EDIT, bookingPermissionContext(booking));

  const handleStatusChange = async (
    booking: EventBookingColumns,
    status: "approved" | "rejected" | "cancelled",
    extra: { approval_remarks?: string; cancellation_reason?: string },
  ) => {
    try {
      setIsActing(true);

      const response = await EventBookingService.updateEventBookingStatus(
        booking.event_booking_id,
        { status, ...extra },
      );

      const updated = getResponseData<EventBookingColumns>(response);
      setViewBooking(updated);
      notify(response.data.message);
      await loadBookings();
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setIsActing(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-800 transition-colors dark:bg-[#101820] dark:text-gray-100 sm:p-6">
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003B5C] text-white dark:bg-[#00679E]">
              <FiCalendar size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white sm:text-3xl">
                Event Booking
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage event reservations and booking requests.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-[#17232E] dark:text-gray-200 dark:hover:bg-[#223443]"
            >
              <FiRefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={16}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#00679E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003B5C]"
            >
              <FiPlus size={18} />
              New Event Booking
            </button>
          </div>
        </div>

        {/* LOAD ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <FiAlertCircle className="mt-0.5 shrink-0" size={18} />

            <div className="flex-1">{error}</div>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0"
            >
              <FiX size={17} />
            </button>
          </div>
        )}

        {/* BOOKING COUNT */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#17232E]">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Event Bookings
            </p>

            <div className="mt-2 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-[#003B5C] dark:text-white">
                {bookings.length}
              </h2>

              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#00679E] dark:bg-blue-950/40 dark:text-blue-300">
                <FiCalendar size={21} />
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              Active records, excluding deleted bookings
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#17232E]">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pending Requests
            </p>

            <div className="mt-2 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {bookings.filter((b) => b.status === "pending").length}
              </h2>

              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <FiAlertCircle size={21} />
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {bookings.filter((booking) => canApproveBooking(booking)).length}{" "}
              in your approval queue
            </p>
          </div>
        </div>

        {/* EVENT BOOKING LIST */}
        {isLoading ? (
          <div className="flex min-h-62.5 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#17232E]">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#00679E]" />

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading event bookings...
            </p>
          </div>
        ) : (
          <EventBookingList
            bookings={bookings}
            onView={setViewBooking}
            onEdit={setEditBooking}
            onDelete={handleDeleteBooking}
            isAwaitingReview={canApproveBooking}
          />
        )}
      </div>

      {/* ADD MODAL */}
      {isAddOpen && (
        <EventBookingAdd
          venues={venues}
          offices={offices}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddBooking}
          isSubmitting={isSubmitting}
        />
      )}

      {/* EDIT MODAL */}
      {editBooking && (
        <EventBookingEdit
          key={editBooking.event_booking_id}
          booking={editBooking}
          venues={venues}
          offices={offices}
          onClose={() => setEditBooking(null)}
          onSubmit={handleUpdateBooking}
          isSubmitting={isUpdating}
        />
      )}

      {viewBooking && (
        <EventBookingView
          booking={viewBooking}
          onClose={() => setViewBooking(null)}
          canApprove={canApproveBooking(viewBooking)}
          canCancel={canCancelBooking(viewBooking)}
          isActing={isActing}
          onApprove={(remarks) =>
            handleStatusChange(viewBooking, "approved", {
              approval_remarks: remarks || undefined,
            })
          }
          onReject={(remarks) =>
            handleStatusChange(viewBooking, "rejected", {
              approval_remarks: remarks,
            })
          }
          onCancel={(reason) =>
            handleStatusChange(viewBooking, "cancelled", {
              cancellation_reason: reason,
            })
          }
        />
      )}
    </div>
  );
};

export default EventBookingMainPage;
