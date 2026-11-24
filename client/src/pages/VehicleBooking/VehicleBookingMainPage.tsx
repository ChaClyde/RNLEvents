import React, { useCallback, useEffect, useState } from "react";
import { FiAlertCircle, FiPlus, FiRefreshCw, FiTruck } from "react-icons/fi";
import { toast } from "sonner";

import type {
  VehicleBooking,
  VehicleBookingDriver,
  VehicleBookingOffice,
  VehicleBookingVehicle,
} from "../../interfaces/VehicleBookingColumns";

import {
  canApproveVehicleBooking,
  canAssignVehicle,
  getVehicleBookingErrorMessage,
  isRequesterEditable,
} from "../../interfaces/VehicleBookingHelpers";

import VehicleBookingService from "../../services/VehicleBookingService";
import OfficeService from "../../services/OfficeService";

import { usePermissions } from "../../hooks/usePermissions";
import { ApprovalPipeline, Permission } from "../../permissions/constants";

import VehicleBookingAdd from "./components/VehicleBookingAdd";
import VehicleBookingEdit from "./components/VehicleBookingEdit";
import VehicleBookingView from "./components/VehicleBookingView";
import VehicleBookingList from "./components/VehicleBookingList";

type PageMode = "list" | "add" | "edit" | "view";

const VehicleBookingMainPage: React.FC = () => {
  const { can } = usePermissions();

  // =====================================================
  // STATES
  // =====================================================

  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<VehicleBooking | null>(
    null,
  );
  const [pageMode, setPageMode] = useState<PageMode>("list");

  const [loading, setLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const [offices, setOffices] = useState<VehicleBookingOffice[]>([]);
  const [vehicles, setVehicles] = useState<VehicleBookingVehicle[]>([]);
  const [drivers, setDrivers] = useState<VehicleBookingDriver[]>([]);

  // =====================================================
  // PERMISSIONS
  // The server decides in the end. These only show or hide buttons.
  // =====================================================

  const canCreate = can(Permission.VEHICLE_BOOKINGS_CREATE);
  const canEdit = can(Permission.VEHICLE_BOOKINGS_EDIT);
  const canDelete = can(Permission.VEHICLE_BOOKINGS_DELETE);

  const bookingContext = (booking: VehicleBooking) => ({
    officeId: booking.office_id,
    ownerId: booking.requested_by_user_id ?? booking.requester?.user_id,
    approvalStage: booking.approval_stage,
    approvalPipeline: ApprovalPipeline.VEHICLE,
  });

  // Only the role whose turn it is can approve or reject
  const canApproveBooking = (booking: VehicleBooking) =>
    booking.status === "pending" &&
    can(Permission.VEHICLE_APPROVALS_APPROVE, bookingContext(booking));

  const canCancelBooking = (booking: VehicleBooking) =>
    (booking.status === "pending" || booking.status === "approved") &&
    can(Permission.VEHICLE_BOOKINGS_EDIT, bookingContext(booking));

  // =====================================================
  // LOAD BOOKINGS
  // =====================================================

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await VehicleBookingService.getAll();

      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  // =====================================================
  // LOAD VEHICLES, DRIVERS AND OFFICES
  // =====================================================

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const [vehicleResult, driverResult, officeResult] =
        await Promise.allSettled([
          VehicleBookingService.getVehicles(),
          VehicleBookingService.getDrivers(),
          OfficeService.loadOffices(),
        ]);

      if (!active) return;

      if (vehicleResult.status === "fulfilled") {
        const data = vehicleResult.value.data;
        setVehicles(Array.isArray(data) ? data : []);
      } else {
        toast.error(
          `Unable to load vehicles: ${getVehicleBookingErrorMessage(
            vehicleResult.reason,
          )}`,
        );
      }

      if (driverResult.status === "fulfilled") {
        const data = driverResult.value.data;
        setDrivers(Array.isArray(data) ? data : []);
      } else {
        toast.error(
          `Unable to load drivers: ${getVehicleBookingErrorMessage(
            driverResult.reason,
          )}`,
        );
      }

      // Offices only matter to roles that can book for any office, so a
      // failure here is not an error for everyone else
      if (officeResult.status === "fulfilled") {
        const list: unknown = officeResult.value.data?.offices;
        setOffices(Array.isArray(list) ? (list as VehicleBookingOffice[]) : []);
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // =====================================================
  // MODALS
  // =====================================================

  const handleCloseModal = () => {
    if (isActing) return;

    setPageMode("list");
    setSelectedBooking(null);
  };

  const handleView = async (booking: VehicleBooking) => {
    try {
      setLoading(true);

      const response = await VehicleBookingService.getById(
        booking.vehicle_booking_id,
      );

      setSelectedBooking(response.data);
      setPageMode("view");
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (booking: VehicleBooking) => {
    if (!isRequesterEditable(booking)) {
      toast.error("This booking can no longer be edited.");
      return;
    }

    setSelectedBooking(booking);
    setPageMode("edit");
  };

  const handleSaved = async () => {
    setPageMode("list");
    setSelectedBooking(null);

    await loadBookings();
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (booking: VehicleBooking) => {
    const confirmed = window.confirm(
      `Move vehicle booking #${booking.vehicle_booking_id} to Trash Bin?`,
    );

    if (!confirmed) return;

    try {
      setIsActing(true);

      const response = await VehicleBookingService.delete(
        booking.vehicle_booking_id,
      );

      toast.success(response.message || "Booking moved to Trash Bin.");

      await loadBookings();
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  };

  // =====================================================
  // APPROVE / REJECT / CANCEL / ASSIGN
  // =====================================================

  const handleApprove = async () => {
    if (!selectedBooking) return;

    if (!canApproveVehicleBooking(selectedBooking)) {
      toast.error(
        "This booking cannot be approved yet. Assign a vehicle and a driver first.",
      );
      return;
    }

    try {
      setIsActing(true);

      const response = await VehicleBookingService.updateStatus(
        selectedBooking.vehicle_booking_id,
        { status: "approved" },
      );

      toast.success(response.message || "Booking approved.");
      setSelectedBooking(response.data);

      await loadBookings();
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!selectedBooking) return;

    try {
      setIsActing(true);

      const response = await VehicleBookingService.updateStatus(
        selectedBooking.vehicle_booking_id,
        { status: "rejected", approval_remarks: remarks.trim() },
      );

      toast.success(response.message || "Booking rejected.");
      setSelectedBooking(response.data);

      await loadBookings();
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  };

  const handleCancelBooking = async (reason: string) => {
    if (!selectedBooking) return;

    try {
      setIsActing(true);

      const response = await VehicleBookingService.updateStatus(
        selectedBooking.vehicle_booking_id,
        { status: "cancelled", cancellation_reason: reason.trim() },
      );

      toast.success(response.message || "Booking cancelled.");
      setSelectedBooking(response.data);

      await loadBookings();
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  };

  const handleAssign = async (vehicleId: number, driverId: number) => {
    if (!selectedBooking) return;

    if (!canAssignVehicle(selectedBooking)) {
      toast.error(
        "Vehicle assignment is only allowed at the Vehicle Admin and Super Admin stages.",
      );
      return;
    }

    try {
      setIsActing(true);

      const response = await VehicleBookingService.assign(
        selectedBooking.vehicle_booking_id,
        { vehicle_id: vehicleId, driver_id: driverId },
      );

      toast.success(response.message || "Vehicle and driver assigned.");
      setSelectedBooking(response.data);

      await loadBookings();
    } catch (error: unknown) {
      toast.error(getVehicleBookingErrorMessage(error));
    } finally {
      setIsActing(false);
    }
  };

  // =====================================================
  // SELECTED BOOKING CONDITIONS
  // =====================================================

  const canApproveSelected =
    selectedBooking !== null && canApproveBooking(selectedBooking);

  const canAssignSelected =
    selectedBooking !== null &&
    canApproveBooking(selectedBooking) &&
    canAssignVehicle(selectedBooking);

  const canCancelSelected =
    selectedBooking !== null && canCancelBooking(selectedBooking);

  // =====================================================
  // RENDER
  // =====================================================

  const officeHeadBookings = bookings.filter(
    (booking) => booking.approval_stage === "office_head",
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 text-gray-800 transition-colors dark:bg-[#101820] dark:text-gray-100 sm:p-6">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003B5C] text-white dark:bg-[#00679E]">
                <FiTruck size={23} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white sm:text-3xl">
                  Vehicle Booking
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Requests stay here until the Unit Head approves them. After that they move to Vehicle Approvals.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadBookings()}
                disabled={loading || isActing}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-[#17232E] dark:text-gray-200 dark:hover:bg-[#223443]"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                Refresh
              </button>

              {canCreate && (
                <button
                  type="button"
                  onClick={() => setPageMode("add")}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#00679E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003B5C]"
                >
                  <FiPlus size={18} />
                  New Vehicle Booking
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#17232E]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Waiting for Unit Head
              </p>
              <div className="mt-2 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-[#003B5C] dark:text-white">
                  {officeHeadBookings.length}
                </h2>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#00679E] dark:bg-blue-950/40 dark:text-blue-300">
                  <FiTruck size={21} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                These requests have not left Booking Management
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#17232E]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pending Unit Head review
              </p>
              <div className="mt-2 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {officeHeadBookings.filter((booking) => booking.status === "pending").length}
                </h2>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                  <FiAlertCircle size={21} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {officeHeadBookings.filter((booking) => canApproveBooking(booking)).length} in your Unit Head queue
              </p>
            </div>
          </div>

          <VehicleBookingList
            bookings={officeHeadBookings}
            loading={loading}
            canEdit={canEdit}
            canDelete={canDelete && !isActing}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {pageMode === "add" && (
        <VehicleBookingAdd
          isOpen
          offices={offices}
          vehicles={vehicles}
          drivers={drivers}
          onClose={handleCloseModal}
          onSuccess={handleSaved}
        />
      )}

      {pageMode === "edit" && selectedBooking && (
        <VehicleBookingEdit
          isOpen
          booking={selectedBooking}
          offices={offices}
          vehicles={vehicles}
          drivers={drivers}
          onClose={handleCloseModal}
          onSuccess={handleSaved}
        />
      )}

      {pageMode === "view" && selectedBooking && (
        <VehicleBookingView
          isOpen
          booking={selectedBooking}
          vehicles={vehicles}
          drivers={drivers}
          canApprove={canApproveSelected}
          canCancel={canCancelSelected}
          canAssign={canAssignSelected}
          isActing={isActing}
          onClose={handleCloseModal}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancelBooking={handleCancelBooking}
          onAssign={handleAssign}
        />
      )}
    </>
  );
};

export default VehicleBookingMainPage;
