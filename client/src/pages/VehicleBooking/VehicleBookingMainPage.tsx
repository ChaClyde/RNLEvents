import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiAlertCircle, FiPlus, FiRefreshCw, FiTruck, FiX } from "react-icons/fi";

import VehicleBookingService from "../../services/VehicleBookingService";
import VehicleService from "../../services/VehicleService";
import DriverService from "../../services/DriverService";
import OfficeService from "../../services/OfficeService";

import type { VehicleBookingColumns, VehicleBookingFormData } from "../../interfaces/VehicleBookingColumns";
import type { VehicleColumns } from "../../interfaces/VehicleColumns";
import type { DriverColumns } from "../../interfaces/DriverColumns";
import type { OfficeColumns } from "../../interfaces/OfficeColumns";
import { isAssignmentStage, parseApiError } from "../../interfaces/VehicleBookingHelpers";

import { useToastMessage } from "../../hooks/useToastMessage";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../contexts/AuthContext";
import { ApprovalPipeline, Permission } from "../../permissions/constants";
import ToastMessage from "../../components/ToastMessage/ToastMessage";

import VehicleBookingList from "./components/VehicleBookingList";
import VehicleBookingAdd from "./components/VehicleBookingAdd";
import VehicleBookingEdit from "./components/VehicleBookingEdit";
import VehicleBookingView from "./components/VehicleBookingView";

const getResponseData = <T,>(response: unknown): T => {
  const result = response as { data?: { data?: T } };
  return result?.data?.data as T;
};

const VehicleBookingMainPage = () => {
  const location = useLocation();
  const isApprovalsRoute = location.pathname.startsWith("/approvals/vehicles");
  const { user } = useAuth();
  const { can, hasEmergencyBypass } = usePermissions();

  const [bookings, setBookings] = useState<VehicleBookingColumns[]>([]);
  const [vehicles, setVehicles] = useState<VehicleColumns[]>([]);
  const [drivers, setDrivers] = useState<DriverColumns[]>([]);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editBooking, setEditBooking] = useState<VehicleBookingColumns | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewBooking, setViewBooking] = useState<VehicleBookingColumns | null>(null);
  const [isActing, setIsActing] = useState(false);
  const { message, isVisible, showToastMessage, closeToastMessage } = useToastMessage("", false);
  const [toastIsFailed, setToastIsFailed] = useState(false);

  const canCreate =
    can(Permission.VEHICLE_BOOKINGS_CREATE) || hasEmergencyBypass;

  const notify = useCallback(
    (text: string, isFailed = false) => {
      setToastIsFailed(isFailed);
      showToastMessage(text);
    },
    [showToastMessage],
  );

  const loadBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await VehicleBookingService.loadVehicleBookings();
      const data = getResponseData<VehicleBookingColumns[]>(response);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const officeResponse = await OfficeService.loadOffices();
      const officeData = officeResponse.data?.offices;
      setOffices(Array.isArray(officeData) ? officeData : []);
    } catch {
      setOffices([]);
    }

    if (can(Permission.VEHICLES_VIEW)) {
      try {
        const response = await VehicleService.loadVehicles();
        const data = getResponseData<VehicleColumns[]>(response);
        setVehicles(Array.isArray(data) ? data : []);
      } catch {
        setVehicles([]);
      }
    }

    if (can(Permission.DRIVERS_VIEW)) {
      try {
        const response = await DriverService.loadDrivers();
        const data = getResponseData<DriverColumns[]>(response);
        setDrivers(Array.isArray(data) ? data : []);
      } catch {
        setDrivers([]);
      }
    }
  }, [can]);

  useEffect(() => {
    loadBookings();
    loadOptions();
  }, [loadBookings, loadOptions]);

  const bookingContext = (booking: VehicleBookingColumns) => ({
    officeId: booking.office_id,
    ownerId: booking.requested_by_user_id,
    approvalStage: booking.approval_stage,
    approvalPipeline: ApprovalPipeline.VEHICLE,
  });

  const canApproveBooking = (booking: VehicleBookingColumns) =>
    booking.status === "pending" &&
    can(Permission.VEHICLE_APPROVALS_APPROVE, bookingContext(booking));

  const canCancelBooking = (booking: VehicleBookingColumns) =>
    (booking.status === "pending" || booking.status === "approved") &&
    can(Permission.VEHICLE_BOOKINGS_EDIT, bookingContext(booking));

  const canAssignBooking = (booking: VehicleBookingColumns) =>
    isAssignmentStage(booking) && canApproveBooking(booking);

  const handleAdd = async (data: VehicleBookingFormData) => {
    try {
      setIsSubmitting(true);
      await VehicleBookingService.storeVehicleBooking(data);
      setIsAddOpen(false);
      notify("Vehicle booking submitted successfully!");
      await loadBookings();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (
    vehicle_booking_id: number,
    data: VehicleBookingFormData,
  ) => {
    try {
      setIsUpdating(true);
      await VehicleBookingService.updateVehicleBooking(vehicle_booking_id, data);
      setEditBooking(null);
      notify("Vehicle booking updated successfully!");
      await loadBookings();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (booking: VehicleBookingColumns) => {
    if (!window.confirm(`Move "${booking.purpose}" to the Trash Bin?`)) return;

    try {
      await VehicleBookingService.destroyVehicleBooking(booking.vehicle_booking_id);
      notify("Vehicle booking moved to Trash Bin!");
      await loadBookings();
    } catch (err) {
      notify(parseApiError(err).message, true);
    }
  };

  const handleStatusChange = async (
    booking: VehicleBookingColumns,
    status: "approved" | "rejected" | "cancelled",
    extra: { approval_remarks?: string; cancellation_reason?: string },
  ) => {
    try {
      setIsActing(true);
      const response = await VehicleBookingService.updateVehicleBookingStatus(
        booking.vehicle_booking_id,
        { status, ...extra },
      );
      const updated = getResponseData<VehicleBookingColumns>(response);
      setViewBooking(updated);
      notify(response.data.message);
      await loadBookings();
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setIsActing(false);
    }
  };

  const handleAssign = async (vehicleId: number, driverId: number) => {
    if (!viewBooking) return;

    try {
      setIsActing(true);
      const response = await VehicleBookingService.assignVehicleBooking(
        viewBooking.vehicle_booking_id,
        { vehicle_id: vehicleId, driver_id: driverId },
      );
      const updated = getResponseData<VehicleBookingColumns>(response);
      setViewBooking(updated);
      notify(response.data.message);
      await loadBookings();
    } catch (err) {
      notify(parseApiError(err).message, true);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-800 transition-colors dark:bg-[#101820] dark:text-gray-100 sm:p-6">
      <ToastMessage
        message={message}
        isVisible={isVisible}
        isFailed={toastIsFailed}
        onClose={closeToastMessage}
      />

      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003B5C] text-white dark:bg-[#00679E]">
              <FiTruck size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white sm:text-3xl">
                {isApprovalsRoute ? "Vehicle Approvals" : "Vehicle Booking"}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isApprovalsRoute
                  ? "Review pending vehicle requests and assignments."
                  : "Submit and track vehicle booking requests."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadBookings();
                loadOptions();
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium dark:border-gray-700 dark:bg-[#17232E]"
            >
              <FiRefreshCw size={16} />
              Refresh
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#00679E] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <FiPlus size={18} />
                New Vehicle Booking
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError("")}>
              <FiX />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-62.5 items-center justify-center rounded-xl border bg-white dark:border-gray-700 dark:bg-[#17232E]">
            Loading vehicle bookings...
          </div>
        ) : (
          <VehicleBookingList
            bookings={bookings}
            onView={setViewBooking}
            onEdit={setEditBooking}
            onDelete={handleDelete}
            isAwaitingReview={canApproveBooking}
          />
        )}
      </div>

      {isAddOpen && (
        <VehicleBookingAdd
          offices={offices}
          defaultRequestedBy={user?.full_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()}
          defaultEmail={user?.email}
          defaultOfficeId={user?.office_id}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAdd}
          isSubmitting={isSubmitting}
        />
      )}

      {editBooking && (
        <VehicleBookingEdit
          booking={editBooking}
          offices={offices}
          onClose={() => setEditBooking(null)}
          onSubmit={handleUpdate}
          isSubmitting={isUpdating}
        />
      )}

      {viewBooking && (
        <VehicleBookingView
          booking={viewBooking}
          vehicles={vehicles}
          drivers={drivers}
          canApprove={canApproveBooking(viewBooking)}
          canCancel={canCancelBooking(viewBooking)}
          canAssign={canAssignBooking(viewBooking)}
          isActing={isActing}
          onClose={() => setViewBooking(null)}
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
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};

export default VehicleBookingMainPage;
