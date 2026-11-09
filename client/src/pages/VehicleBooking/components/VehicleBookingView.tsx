import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiTruck,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import type { DriverColumns } from "../../../interfaces/DriverColumns";
import type { VehicleColumns } from "../../../interfaces/VehicleColumns";
import type { VehicleBookingColumns } from "../../../interfaces/VehicleBookingColumns";
import {
  VEHICLE_APPROVAL_PIPELINE,
  formatDateRange,
  formatTime,
  getApprovalStageLabel,
  getLifecycleLabel,
  getStatusLabel,
  getStatusStyle,
  toTimeInput,
} from "../../../interfaces/VehicleBookingHelpers";
import AvailabilityService from "../../../services/AvailabilityService";

interface VehicleBookingViewProps {
  booking: VehicleBookingColumns;
  vehicles?: VehicleColumns[];
  drivers?: DriverColumns[];
  canApprove?: boolean;
  canCancel?: boolean;
  canAssign?: boolean;
  isActing?: boolean;
  onClose: () => void;
  onApprove?: (remarks: string) => Promise<void> | void;
  onReject?: (remarks: string) => Promise<void> | void;
  onCancel?: (reason: string) => Promise<void> | void;
  onAssign?: (vehicleId: number, driverId: number) => Promise<void> | void;
}

const sectionClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900";
const labelClass = "text-xs text-gray-400";
const valueClass = "mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200";

const VehicleBookingView = ({
  booking,
  vehicles = [],
  drivers = [],
  canApprove = false,
  canCancel = false,
  canAssign = false,
  isActing = false,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onAssign,
}: VehicleBookingViewProps) => {
  const approvals = booking.approvals ?? [];
  const currentIndex = VEHICLE_APPROVAL_PIPELINE.findIndex(
    (stage) => stage === booking.approval_stage,
  );
  const [remarks, setRemarks] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [vehicleId, setVehicleId] = useState(
    booking.vehicle_id ? String(booking.vehicle_id) : "",
  );
  const [driverId, setDriverId] = useState(
    booking.driver_id ? String(booking.driver_id) : "",
  );
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentBlocked, setAssignmentBlocked] = useState(false);

  useEffect(() => {
    if (!canAssign || !vehicleId || !driverId) {
      setAssignmentMessage("");
      setAssignmentBlocked(false);
      return;
    }

    const params = {
      travel_date: booking.travel_date.slice(0, 10),
      expected_return_date: booking.expected_return_date.slice(0, 10),
      departure_time: toTimeInput(booking.departure_time),
      expected_return_time: toTimeInput(booking.expected_return_time),
      exclude_vehicle_booking_id: booking.vehicle_booking_id,
    };

    const handle = window.setTimeout(async () => {
      try {
        const [vehicle, driver] = await Promise.all([
          AvailabilityService.checkVehicle({
            ...params,
            vehicle_id: Number(vehicleId),
            passenger_count: booking.passenger_count,
          }),
          AvailabilityService.checkDriver({
            ...params,
            driver_id: Number(driverId),
          }),
        ]);

        const blocked = !vehicle.data.available || !driver.data.available;
        setAssignmentBlocked(blocked);
        setAssignmentMessage(
          blocked
            ? [vehicle.data.message, driver.data.message]
                .filter((message, index, list) => list.indexOf(message) === index)
                .join(" ")
            : "Vehicle and driver are available for this trip.",
        );
      } catch {
        setAssignmentBlocked(false);
        setAssignmentMessage("");
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [
    canAssign,
    vehicleId,
    driverId,
    booking.travel_date,
    booking.expected_return_date,
    booking.departure_time,
    booking.expected_return_time,
    booking.vehicle_booking_id,
    booking.passenger_count,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl dark:bg-gray-950">
        <div className="bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/70">
                Booking #{booking.vehicle_booking_id}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{booking.purpose}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
                <FiMapPin className="shrink-0" />
                {booking.destination}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(booking.status)}`}
              >
                {getLifecycleLabel(booking)}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-white hover:bg-white/20"
              >
                <FiX size={21} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <FiCheckCircle className="text-[#0095D9]" />
              Approval Progress
            </h3>
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {VEHICLE_APPROVAL_PIPELINE.map((stage, index) => {
                const decided = approvals.find((row) => row.approval_stage === stage);
                const isCurrent =
                  booking.status === "pending" && booking.approval_stage === stage;
                const completed =
                  decided?.action === "approved" ||
                  (booking.status === "approved" && index <= currentIndex);

                return (
                  <li
                    key={stage}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      decided?.action === "rejected"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : completed
                          ? "border-green-200 bg-green-50 text-green-700"
                          : isCurrent
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-gray-200 text-gray-500 dark:border-gray-700"
                    }`}
                  >
                    <p className="font-semibold">Step {index + 1}</p>
                    <p className="mt-1">
                      {getApprovalStageLabel(stage).replace("Pending ", "")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <FiClock className="text-[#0095D9]" />
              Trip schedule
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Dates</p>
                <p className={valueClass}>
                  {formatDateRange(booking.travel_date, booking.expected_return_date)}
                </p>
              </div>
              <div>
                <p className={labelClass}>Time</p>
                <p className={valueClass}>
                  {formatTime(booking.departure_time)} - {formatTime(booking.expected_return_time)}
                </p>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <FiUsers className="text-[#0095D9]" />
              Passengers
            </h3>
            <p className={valueClass}>{booking.passenger_count} passengers</p>
            {booking.passenger_details && (
              <p className="mt-2 text-sm text-gray-500">{booking.passenger_details}</p>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <FiTruck className="text-[#0095D9]" />
              Assignment
            </h3>
            <p className={labelClass}>Vehicle</p>
            <p className={valueClass}>
              {booking.vehicle
                ? `${booking.vehicle.vehicle_name} (${booking.vehicle.plate_number}) · ${booking.vehicle.capacity} seats · ${booking.vehicle.status}`
                : "Not assigned"}
            </p>
            <p className={`${labelClass} mt-3`}>Driver</p>
            <p className={valueClass}>
              {booking.driver
                ? `${booking.driver.driver_name} · ${booking.driver.driver_status}`
                : "Not assigned"}
            </p>
            {canAssign && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_name} ({vehicle.plate_number}) · {vehicle.status}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value)}
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.driver_name} · {driver.driver_status}
                    </option>
                  ))}
                </select>
                {assignmentMessage && (
                  <p
                    className={`sm:col-span-2 text-sm ${
                      assignmentBlocked ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {assignmentMessage}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isActing || !vehicleId || !driverId || assignmentBlocked}
                  onClick={() => onAssign?.(Number(vehicleId), Number(driverId))}
                  className="rounded-xl bg-[#00679E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2"
                >
                  Save assignment
                </button>
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <FiUser className="text-[#0095D9]" />
              Requestor
            </h3>
            <p className={valueClass}>{booking.requested_by}</p>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <FiMail className="text-[#0095D9]" /> {booking.email}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <FiPhone className="text-[#0095D9]" /> {booking.tel_number}
            </p>
          </section>

          <section className={sectionClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <FiCheckCircle className="text-[#0095D9]" />
              Approval History
            </h3>
            <p className={labelClass}>Status</p>
            <p className={valueClass}>{getStatusLabel(booking.status)}</p>
            {approvals.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {approvals.map((row) => (
                  <li
                    key={row.vehicle_booking_approval_id}
                    className="rounded-xl border border-gray-100 p-3 text-sm dark:border-gray-800"
                  >
                    <p className="font-semibold capitalize">
                      {row.action} · {getApprovalStageLabel(row.approval_stage)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.approver
                        ? `${row.approver.first_name ?? ""} ${row.approver.last_name ?? ""}`.trim()
                        : `User #${row.approver_user_id}`}
                    </p>
                    {row.remarks && <p className="mt-2">{row.remarks}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No approval decisions have been recorded yet.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          {canApprove && (
            <div className="space-y-2">
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
                placeholder="Remarks (required to reject)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isActing || !remarks.trim()}
                  onClick={() => onReject?.(remarks.trim())}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => onApprove?.(remarks.trim())}
                  className="rounded-xl bg-[#00679E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Approve current stage
                </button>
              </div>
            </div>
          )}
          {canCancel && (
            <div className="space-y-2">
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={2}
                placeholder="Cancellation reason"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isActing || !cancelReason.trim()}
                  onClick={() => onCancel?.(cancelReason.trim())}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Cancel booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleBookingView;
