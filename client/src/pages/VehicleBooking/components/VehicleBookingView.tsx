import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Ban,
  Car,
  UserRound,
  CalendarDays,
  MapPin,
  Users,
  ClipboardList,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import type {
  VehicleBooking,
  VehicleBookingDriver,
  VehicleBookingVehicle,
} from "../../../interfaces/VehicleBookingColumns";

import { describeChargeLine } from "../../../interfaces/VehicleBookingHelpers";
import VehicleBookingService from "../../../services/VehicleBookingService";

import {
  formatVehicleBookingDate,
  formatVehicleBookingTime,
  getVehicleStageLabel,
  getVehicleStatusLabel,
  getVehicleStatusStyle,
  hasVehicleAssignment,
  isAssignmentStage,
} from "../../../interfaces/VehicleBookingHelpers";

interface VehicleBookingViewProps {
  booking: VehicleBooking;
  isOpen: boolean;
  vehicles?: VehicleBookingVehicle[];
  drivers?: VehicleBookingDriver[];
  canApprove?: boolean;
  canCancel?: boolean;
  canAssign?: boolean;
  isActing?: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (remarks: string) => void;
  onCancelBooking: (reason: string) => void;
  onAssign: (vehicleId: number, driverId: number) => void;
}

interface DropdownOption {
  id: number;
  name: string;
  subtitle?: string;
  details?: string;
  status?: string;
  image?: string;
}

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

const sectionClass =
  "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900";

const labelClass = "text-xs font-medium uppercase tracking-wide text-gray-400";

const valueClass =
  "mt-1 break-words text-sm font-medium text-gray-800 dark:text-gray-100";

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  emptyMessage = "No results found.",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find(
    (option) => option.id.toString() === value,
  );

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return options;

    return options.filter((option) =>
      [option.name, option.subtitle, option.details, option.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [options, search]);

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm outline-none transition hover:border-[#00679E] focus:border-[#00679E] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
      >
        <span className="flex min-w-0 items-center gap-3">
          {selectedOption?.image ? (
            <img
              src={selectedOption.image}
              alt={selectedOption.name}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-[#00679E] dark:bg-sky-900/40 dark:text-sky-300">
              {selectedOption ? (
                <span className="font-bold">
                  {selectedOption.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Search size={18} />
              )}
            </span>
          )}

          <span className="min-w-0">
            <span
              className={`block truncate font-medium ${
                selectedOption
                  ? "text-gray-800 dark:text-white"
                  : "text-gray-400"
              }`}
            >
              {selectedOption?.name || placeholder}
            </span>

            {selectedOption?.subtitle && (
              <span className="block truncate text-xs text-gray-500">
                {selectedOption.subtitle}
              </span>
            )}
          </span>
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 p-3 dark:border-gray-800">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 dark:border-gray-700">
                <Search size={16} className="shrink-0 text-gray-400" />

                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400">
                  {emptyMessage}
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id.toString());
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-sky-50 dark:hover:bg-sky-900/20 ${
                      value === option.id.toString()
                        ? "bg-sky-50 dark:bg-sky-900/20"
                        : ""
                    }`}
                  >
                    {option.image ? (
                      <img
                        src={option.image}
                        alt={option.name}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-lg font-bold text-[#00679E] dark:bg-sky-900/40 dark:text-sky-300">
                        {option.name.charAt(0).toUpperCase()}
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white">
                        {option.name}
                      </span>

                      {option.subtitle && (
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {option.subtitle}
                        </span>
                      )}

                      {option.details && (
                        <span className="mt-0.5 block truncate text-xs text-gray-400">
                          {option.details}
                        </span>
                      )}
                    </span>

                    {option.status && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {option.status}
                      </span>
                    )}

                    {value === option.id.toString() && (
                      <CheckCircle2
                        size={17}
                        className="shrink-0 text-[#0095D9]"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const VehicleBookingView: React.FC<VehicleBookingViewProps> = ({
  booking,
  isOpen,
  vehicles = [],
  drivers = [],
  canApprove = false,
  canCancel = false,
  canAssign = false,
  isActing = false,
  onClose,
  onApprove,
  onReject,
  onCancelBooking,
  onAssign,
}) => {
  const [vehicleId, setVehicleId] = useState(
    booking.vehicle_id?.toString() ?? "",
  );

  const [driverId, setDriverId] = useState(booking.driver_id?.toString() ?? "");

  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");

  const openBlob = async (
    response: { data: BlobPart },
    filename: string,
    mode: "preview" | "download" | "print",
    mime = "application/pdf",
  ) => {
    const blob = new Blob([response.data], { type: mime });
    const url = URL.createObjectURL(blob);
    if (mode === "download") {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const popup = window.open(url);
    if (mode === "print") popup?.addEventListener("load", () => popup.print());
  };

  const openSlip = (mode: "preview" | "download" | "print") =>
    (mode === "download"
      ? VehicleBookingService.downloadSlip(booking.vehicle_booking_id)
      : VehicleBookingService.previewSlip(booking.vehicle_booking_id)
    )
      .then((response) =>
        openBlob(response, `FCU-Vehicle-Booking-Slip-${booking.vehicle_booking_id}.pdf`, mode),
      )
      .catch(() => toast.error("Unable to open the booking slip."));

  const openLetter = (mode: "preview" | "download" | "print") => {
    const letter = booking.attachments?.[0];
    if (!letter) return;
    const request =
      mode === "download"
        ? VehicleBookingService.downloadLetter(booking.vehicle_booking_id, letter.attachment_id)
        : VehicleBookingService.previewLetter(booking.vehicle_booking_id, letter.attachment_id);
    void request
      .then((response) =>
        openBlob(response, letter.original_filename, mode, letter.mime_type || "application/pdf"),
      )
      .catch(() => toast.error("Unable to open the letter of request."));
  };

  const [vehicleImages, setVehicleImages] = useState<Record<number, string>>(
    {},
  );

  useEffect(() => {
    setVehicleId(booking.vehicle_id?.toString() ?? "");
    setDriverId(booking.driver_id?.toString() ?? "");
    setRejectionRemarks("");
    setCancellationReason("");
  }, [booking]);

  // Load protected vehicle images.
  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    const loadImages = async () => {
      const vehiclesWithImages = vehicles.filter(
        (vehicle) => vehicle.image_path,
      );

      if (vehiclesWithImages.length === 0) {
        if (active) setVehicleImages({});
        return;
      }

      const results = await Promise.allSettled(
        vehiclesWithImages.map(async (vehicle) => ({
          id: vehicle.vehicle_id,
          url: await VehicleBookingService.getVehicleImage(vehicle.vehicle_id),
        })),
      );

      if (!active) {
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            URL.revokeObjectURL(result.value.url);
          }
        });
        return;
      }

      const images: Record<number, string> = {};

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          images[result.value.id] = result.value.url;
          createdUrls.push(result.value.url);
        }
      });

      setVehicleImages(images);
    };

    void loadImages();

    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [vehicles]);

  // Close modal using Escape key.
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isActing) onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isActing, onClose]);

  const vehicleOptions: DropdownOption[] = vehicles.map((vehicle) => ({
    id: vehicle.vehicle_id,
    name: vehicle.vehicle_name || `Vehicle ${vehicle.vehicle_id}`,
    subtitle: vehicle.plate_number || "No plate number",
    details: [
      vehicle.vehicle_type,
      vehicle.capacity ? `${vehicle.capacity} seats` : null,
      vehicle.availability_message,
    ]
      .filter(Boolean)
      .join(" · "),
    status:
      vehicle.availability_status || vehicle.status || "Status unavailable",
    image: vehicleImages[vehicle.vehicle_id],
  }));

  const driverOptions: DropdownOption[] = drivers.map((driver) => ({
    id: driver.driver_id,
    name: driver.driver_name || `Driver ${driver.driver_id}`,
  }));

  const assignmentRequired = isAssignmentStage(booking.approval_stage);
  const assignmentComplete = hasVehicleAssignment(booking);

  const isPending = booking.status === "pending";
  const canShowApprovalActions = canApprove && isPending;

  const approvalDisabled =
    isActing || !isPending || (assignmentRequired && !assignmentComplete);

  const canShowCancellation =
    canCancel &&
    (booking.status === "pending" || booking.status === "approved");

  const handleReject = () => {
    if (!rejectionRemarks.trim()) {
      toast.error("A rejection remark is required.");
      return;
    }

    onReject(rejectionRemarks.trim());
  };

  const handleCancel = () => {
    if (!cancellationReason.trim()) {
      toast.error("A cancellation reason is required.");
      return;
    }

    onCancelBooking(cancellationReason.trim());
  };

  const handleAssign = () => {
    const selectedVehicle = Number(vehicleId);
    const selectedDriver = Number(driverId);

    if (!selectedVehicle || !selectedDriver) {
      toast.error("Select both a vehicle and a driver.");
      return;
    }

    onAssign(selectedVehicle, selectedDriver);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={() => {
        if (!isActing) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-booking-view-title"
        className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl dark:bg-[#17212b]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2
              id="vehicle-booking-view-title"
              className="text-xl font-bold text-[#003B5C] dark:text-white"
            >
              Vehicle Booking Details
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review booking information, assignments, and approval history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-[#00679E] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void openSlip("preview")}>Preview slip</button>
              <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => void openSlip("download")}>Download slip</button>
              <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => void openSlip("print")}>Print slip</button>
              {booking.attachments?.[0] && (
                <>
                  <button type="button" className="rounded-lg bg-[#003B5C] px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void openLetter("preview")}>Preview letter</button>
                  <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => void openLetter("download")}>Download letter</button>
                  <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => void openLetter("print")}>Print letter</button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isActing}
            aria-label="Close modal"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-6 overflow-y-auto p-6">
          {/* Booking Header */}
          <div className="rounded-2xl bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] p-6 text-white shadow-lg">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm text-white/70">Vehicle Booking Request</p>

                <h2 className="mt-1 text-2xl font-bold">
                  #{booking.vehicle_booking_id}
                </h2>

                <p className="mt-2 text-sm text-white/80">
                  Submitted by {booking.requested_by}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getVehicleStatusStyle(
                    booking.status,
                  )}`}
                >
                  {getVehicleStatusLabel(booking.status)}
                </span>

                <span className="text-sm font-medium text-white/90">
                  {getVehicleStageLabel(booking.approval_stage)}
                </span>
              </div>
            </div>
          </div>

          {/* Requester and Trip Information */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Requester Information */}
            <div className={sectionClass}>
              <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
                <UserRound size={18} />
                Requester Information
              </h3>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Requester</p>
                  <p className={valueClass}>{booking.requested_by}</p>
                </div>

                <div>
                  <p className={labelClass}>Office</p>
                  <p className={valueClass}>
                    {booking.office?.office_name || "—"}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Email</p>
                  <p className={valueClass}>{booking.email}</p>
                </div>

                <div>
                  <p className={labelClass}>Contact Number</p>
                  <p className={valueClass}>{booking.tel_number}</p>
                </div>
              </div>
            </div>

            {/* Trip Information */}
            <div className={sectionClass}>
              <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
                <MapPin size={18} />
                Trip Information
              </h3>

              <div className="space-y-4">
                <div>
                  <p className={labelClass}>Destination</p>
                  <p className={valueClass}>{booking.destination}</p>
                  {booking.charge_lines && booking.charge_lines.length > 0 && (
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      {booking.charge_lines.map((line) => (
                        <div key={line.id}>
                          <p className="font-medium text-gray-800">{line.label}</p>
                          {describeChargeLine(line).map((row) => (
                            <p key={row} className="text-xs">{row}</p>
                          ))}
                        </div>
                      ))}
                      <p className="font-semibold text-gray-800">
                        Total ₱{Number(booking.charge_total ?? 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className={labelClass}>Purpose</p>
                  <p className={valueClass}>{booking.purpose}</p>
                </div>

                <div>
                  <p className={labelClass}>Remarks</p>
                  <p className={valueClass}>{booking.remarks || "—"}</p>
                </div>
              </div>
            </div>

            {/* Travel Schedule */}
            <div className={sectionClass}>
              <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
                <CalendarDays size={18} />
                Travel Schedule
              </h3>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Departure Date</p>
                  <p className={valueClass}>
                    {formatVehicleBookingDate(booking.travel_date)}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Departure Time</p>
                  <p className={valueClass}>
                    {formatVehicleBookingTime(booking.departure_time)}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Return Date</p>
                  <p className={valueClass}>
                    {formatVehicleBookingDate(booking.expected_return_date)}
                  </p>
                </div>

                <div>
                  <p className={labelClass}>Return Time</p>
                  <p className={valueClass}>
                    {formatVehicleBookingTime(booking.expected_return_time)}
                  </p>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div className={sectionClass}>
              <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
                <Users size={18} />
                Passenger Information
              </h3>

              <div>
                <p className={labelClass}>Passenger Count</p>
                <p className={valueClass}>
                  {booking.passenger_count} passenger(s)
                </p>
              </div>

              <div className="mt-4">
                <p className={labelClass}>Passenger Details</p>
                <p className={valueClass}>{booking.passenger_details || "—"}</p>
              </div>
            </div>
          </div>

          {/* Vehicle and Driver Assignment */}
          <div className={sectionClass}>
            <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
              <Car size={18} />
              Vehicle and Driver Assignment
            </h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Assigned Vehicle</p>
                <p className={valueClass}>
                  {booking.vehicle?.vehicle_name || "Not assigned"}
                  {booking.vehicle?.plate_number
                    ? ` (${booking.vehicle.plate_number})`
                    : ""}
                </p>
              </div>

              <div>
                <p className={labelClass}>Assigned Driver</p>
                <p className={valueClass}>
                  {booking.driver?.driver_name || "Not assigned"}
                </p>
              </div>
            </div>

            {assignmentRequired && canAssign && isPending && (
              <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-5 dark:border-sky-900/50 dark:bg-sky-900/10">
                <h4 className="font-semibold text-[#003B5C] dark:text-sky-300">
                  Assign Vehicle and Driver
                </h4>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Select a vehicle and a driver for this booking.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SearchableDropdown
                    label="Select Vehicle"
                    placeholder="Choose a vehicle"
                    value={vehicleId}
                    options={vehicleOptions}
                    onChange={setVehicleId}
                    disabled={isActing}
                    emptyMessage="No vehicles found."
                  />

                  <SearchableDropdown
                    label="Select Driver"
                    placeholder="Choose a driver"
                    value={driverId}
                    options={driverOptions}
                    onChange={setDriverId}
                    disabled={isActing}
                    emptyMessage="No drivers found."
                  />
                </div>

                <button
                  type="button"
                  disabled={isActing}
                  onClick={handleAssign}
                  className="mt-4 rounded-xl bg-linear-to-r from-[#003B5C] to-[#0095D9] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {isActing ? "Assigning..." : "Save Assignment"}
                </button>
              </div>
            )}

            {assignmentRequired && !assignmentComplete && (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                Vehicle and driver assignment is required before approval.
              </p>
            )}
          </div>

          {/* Approval History */}
          <div className={sectionClass}>
            <h3 className="mb-5 flex items-center gap-2 font-semibold text-[#003B5C] dark:text-white">
              <ClipboardList size={18} />
              Approval History
            </h3>

            {!booking.approvals?.length ? (
              <p className="text-sm text-gray-500">
                No approval actions have been recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {booking.approvals.map((approval) => {
                  const approverName =
                    approval.approver?.name ||
                    [
                      approval.approver?.first_name,
                      approval.approver?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    `User #${approval.approver_user_id}`;

                  return (
                    <div
                      key={approval.vehicle_booking_approval_id}
                      className="flex gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                    >
                      <div
                        className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          approval.action === "approved"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30"
                        }`}
                      >
                        {approval.action === "approved" ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {approval.action === "approved"
                            ? "Approved"
                            : "Rejected"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {approverName} ·{" "}
                          {getVehicleStageLabel(approval.approval_stage)}
                        </p>

                        {approval.remarks && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {approval.remarks}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(approval.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Actions */}
          {(canShowApprovalActions || canShowCancellation) && (
            <div className={sectionClass}>
              <h3 className="mb-5 font-semibold text-[#003B5C] dark:text-white">
                Booking Actions
              </h3>

              {/* Approval and Rejection Actions */}
              {canShowApprovalActions && (
                <div className="space-y-4">
                  <button
                    type="button"
                    disabled={approvalDisabled}
                    onClick={onApprove}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 size={17} />
                    {isActing ? "Processing..." : "Approve / Continue"}
                  </button>

                  {assignmentRequired && !assignmentComplete && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Assign both a vehicle and a driver before approving.
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rejection Remarks
                    </label>

                    <textarea
                      rows={3}
                      value={rejectionRemarks}
                      onChange={(event) =>
                        setRejectionRemarks(event.target.value)
                      }
                      placeholder="Explain why this booking is being rejected..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />

                    <button
                      type="button"
                      disabled={isActing}
                      onClick={handleReject}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-900/20"
                    >
                      <XCircle size={17} />
                      Reject Booking
                    </button>
                  </div>
                </div>
              )}

              {/* Cancellation Action */}
              {canShowCancellation && (
                <div
                  className={`space-y-3 ${
                    canShowApprovalActions
                      ? "mt-6 border-t border-gray-100 pt-5 dark:border-gray-800"
                      : ""
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cancellation Reason
                  </label>

                  <textarea
                    rows={3}
                    value={cancellationReason}
                    onChange={(event) =>
                      setCancellationReason(event.target.value)
                    }
                    placeholder="Enter the reason for cancelling this booking..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />

                  <button
                    type="button"
                    disabled={isActing}
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Ban size={17} />
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rejection Remarks */}
          {booking.status === "rejected" && booking.approval_remarks && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
              <h3 className="font-semibold text-red-700 dark:text-red-300">
                Rejection Remarks
              </h3>

              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {booking.approval_remarks}
              </p>
            </div>
          )}

          {/* Cancellation Reason */}
          {booking.status === "cancelled" && booking.cancellation_reason && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                Cancellation Reason
              </h3>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {booking.cancellation_reason}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={isActing}
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleBookingView;
