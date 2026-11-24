import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ChevronDown,
  Check,
  Search,
  Car,
  UserRound,
  X,
} from "lucide-react";

import type {
  VehicleBookingDriver,
  VehicleBookingFormData,
  VehicleBookingOffice,
  VehicleBookingVehicle,
} from "../../../interfaces/VehicleBookingColumns";

import {
  describeChargeLine,
  formatDate,
  formatTime,
  getToday,
  initialVehicleBookingForm,
  validateVehicleBookingForm,
  vehicleChargeEstimate,
  vehicleDestinations,
  vehicleSeatingNote,
  type VehicleBookingFieldErrors,
} from "../../../interfaces/VehicleBookingHelpers";
import { earliestBookingDate } from "../../../interfaces/EventBookingSchedule";
import { useAuth } from "../../../contexts/AuthContext";

import AvailabilityService from "../../../services/AvailabilityService";
import OptionImage from "./OptionImage";
import ResourceCalendarModal from "./ResourceCalendarModal";

// ============================================================
// STYLES
// ============================================================

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00679E] focus:ring-2 focus:ring-[#00679E]/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

const sectionClass =
  "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900";

const dropdownClass =
  "absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-[#17212b]";

const getStatus = (status?: string) => {
  const value = (status || "available").toLowerCase();

  if (value === "unavailable" || value.includes("leave")) {
    return {
      label: status || "Unavailable",
      className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    };
  }

  if (value === "available" || value === "active") {
    return {
      label: "Available",
      className:
        "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    };
  }

  if (value.includes("maintenance")) {
    return {
      label: "Under Maintenance",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
  }

  return {
    label: status || "Unavailable",
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
};

// ============================================================
// SMALL LAYOUT HELPERS
// ============================================================

const Section: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className={sectionClass}>
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#003B5C] dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
    {children}
  </section>
);

const Field: React.FC<{
  label: string;
  error?: string;
  field?: string;
  children: React.ReactNode;
}> = ({ label, error, field, children }) => (
  <div data-field={field}>
    <label className={labelClass}>{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const shortDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const dayAfterLabel = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + 1);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const rangesOverlap = (
  start?: string | null,
  end?: string | null,
  tripStart?: string,
  tripEnd?: string,
) => {
  if (!tripStart || !tripEnd) return false;
  const from = (start || "0000-01-01").slice(0, 10);
  const to = (end || "9999-12-31").slice(0, 10);
  return from <= tripEnd && to >= tripStart;
};

const maintenanceLines = (
  row?: {
    reason?: string | null;
    date_start?: string | null;
    date_end?: string | null;
    range_label?: string | null;
  } | null,
) => {
  if (!row) return [];
  const lines: string[] = [];
  if (row.range_label) lines.push(row.range_label);
  else if (row.date_start || row.date_end) {
    lines.push(`${shortDate(row.date_start)} to ${shortDate(row.date_end)}`);
  }
  if (row.reason) lines.push(row.reason);
  const again = dayAfterLabel(row.date_end);
  if (again) lines.push(`Available again on ${again}.`);
  return lines;
};

const driverStatusLines = (driver: VehicleBookingDriver) => {
  const status = driver.driver_status || "Available";
  if (status.toLowerCase() === "available") return ["Available for assignment."];

  const lines = [status];
  if (driver.status_remarks) lines.push(driver.status_remarks);
  if (driver.status_start_date || driver.status_end_date) {
    lines.push(
      `${shortDate(driver.status_start_date) || "No start date"} to ${shortDate(driver.status_end_date) || "no return date"}`,
    );
  }
  const again = dayAfterLabel(driver.status_end_date);
  if (again) lines.push(`Available again on ${again}.`);
  else lines.push("No return date is recorded.");
  return lines;
};

const letterProblem = (file: File | null, required: boolean) => {
  if (!file) {
    return required
      ? "Attach the letter of request. Use a PDF, JPG, or PNG no larger than 5 MB."
      : undefined;
  }

  const accepted =
    /^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type) ||
    /\.(pdf|jpe?g|png)$/i.test(file.name);

  if (!accepted) {
    return `"${file.name}" cannot be attached. Upload a PDF, JPG, or PNG.`;
  }

  if (file.size > 5 * 1024 * 1024) {
    return `"${file.name}" is larger than 5 MB. Choose a smaller PDF, JPG, or PNG.`;
  }

  return undefined;
};

const TimeOfDay: React.FC<{
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ value, disabled, onChange }) => {
  const [hourPart, minutePart] = value ? value.split(":") : ["", ""];
  const hour24 = hourPart === "" ? null : Number(hourPart);
  const period = hour24 === null ? "AM" : hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 === null ? "" : String(hour24 % 12 === 0 ? 12 : hour24 % 12);

  const commit = (nextHour: string, nextMinute: string, nextPeriod: string) => {
    if (!nextHour || nextMinute === "") {
      onChange("");
      return;
    }
    let hour = Number(nextHour) % 12;
    if (nextPeriod === "PM") hour += 12;
    onChange(`${String(hour).padStart(2, "0")}:${nextMinute}`);
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_5.5rem] gap-2">
      <select
        className={inputClass}
        value={hour12}
        disabled={disabled}
        onChange={(event) => commit(event.target.value, minutePart || "00", period)}
      >
        <option value="">Hour</option>
        {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <select
        className={inputClass}
        value={minutePart}
        disabled={disabled}
        onChange={(event) => commit(hour12 || "12", event.target.value, period)}
      >
        <option value="">Minute</option>
        {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </select>
      <select
        className={inputClass}
        value={period}
        disabled={disabled || !value}
        onChange={(event) => commit(hour12 || "12", minutePart || "00", event.target.value)}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

// ============================================================
// VEHICLE / DRIVER PICKER
// ============================================================

interface PickerItem {
  id: number;
  title: string;
  lines: string[];
  badge: { label: string; className: string };
  searchText: string;
  renderThumb: (size: "sm" | "lg") => React.ReactNode;
}

interface ResourcePickerProps {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  noneLabel: string;
  icon: React.ReactNode;
  items: PickerItem[];
  value?: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  error?: string;
}

const ResourcePicker: React.FC<ResourcePickerProps> = ({
  label,
  placeholder,
  searchPlaceholder,
  noneLabel,
  icon,
  items,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.find((item) => item.id === value) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return query
      ? items.filter((item) => item.searchText.includes(query))
      : items;
  }, [items, search]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  const choose = (id: number | null) => {
    onChange(id);
    close();
  };

  return (
    <div className="relative">
      <label className={labelClass}>{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={`${inputClass} flex items-center justify-between gap-3 text-left ${
          error ? "border-red-400" : ""
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selected ? (
            selected.renderThumb("sm")
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#00679E] dark:bg-blue-500/10">
              {icon}
            </span>
          )}

          <span className="min-w-0">
            <span className="block truncate font-medium">
              {selected ? selected.title : placeholder}
            </span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
              {selected ? selected.lines[0] : `${items.length} in the list`}
            </span>
          </span>
        </span>

        <ChevronDown size={18} className="shrink-0 text-gray-400" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-20 cursor-default"
            onClick={close}
          />

          <div className={dropdownClass}>
            <div className="sticky top-0 mb-2 bg-white pb-2 dark:bg-[#17212b]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`${inputClass} py-2 pl-9`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => choose(null)}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <X size={16} />
              {noneLabel}
            </button>

            {filtered.map((item) => {
              const isSelected = item.id === value;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => choose(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    isSelected ? "bg-blue-50 dark:bg-blue-500/10" : ""
                  }`}
                >
                  {item.renderThumb("lg")}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {item.title}
                    </span>

                    {item.lines.map((line, index) => (
                      <span
                        key={index}
                        className="block truncate text-xs text-gray-500 dark:text-gray-400"
                      >
                        {line}
                      </span>
                    ))}

                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badge.className}`}
                    >
                      {item.badge.label}
                    </span>
                  </span>

                  {isSelected && (
                    <Check size={18} className="shrink-0 text-[#00679E]" />
                  )}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-gray-500">
                No matches found.
              </p>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

// ============================================================
// FORM
// ============================================================

interface VehicleBookingFormProps {
  initialData?: VehicleBookingFormData;
  offices?: VehicleBookingOffice[];
  vehicles?: VehicleBookingVehicle[];
  drivers?: VehicleBookingDriver[];
  // Errors returned by the server, shown under their fields
  serverErrors?: VehicleBookingFieldErrors;
  loading?: boolean;
  submitLabel?: string;
  requireLetter?: boolean;
  bookingId?: number;
  onSubmit: (
    data: VehicleBookingFormData,
    letter: File | null,
  ) => Promise<void> | void;
  onCancel: () => void;
}

const VehicleBookingForm: React.FC<VehicleBookingFormProps> = ({
  initialData,
  offices = [],
  vehicles = [],
  drivers = [],
  serverErrors,
  loading = false,
  submitLabel = "Submit Request",
  requireLetter = false,
  bookingId,
  onSubmit,
  onCancel,
}) => {
  const { user } = useAuth();
  const today = getToday();
  const earliestTravel = earliestBookingDate(today);
  const [form, setForm] = useState<VehicleBookingFormData>({
    ...initialVehicleBookingForm,
    ...initialData,
  });

  const [errors, setErrors] = useState<VehicleBookingFieldErrors>({});
  const [letter, setLetter] = useState<File | null>(null);
  const [calendar, setCalendar] = useState<"vehicles" | "drivers" | null>(null);
  const [conflict, setConflict] = useState<string[] | null>(null);
  const dismissedConflict = useRef("");

  useEffect(() => {
    if (initialData?.office_id || !user?.office_id) return;

    setForm((previous) =>
      previous.office_id ? previous : { ...previous, office_id: user.office_id },
    );
  }, [initialData?.office_id, user?.office_id]);

  const chargeEstimate = useMemo(
    () =>
      vehicleChargeEstimate(
        form.destination,
        form.travel_date,
        form.expected_return_date,
        Number(form.passenger_count || 1),
        form.departure_time,
        form.expected_return_time,
      ),
    [
      form.destination,
      form.travel_date,
      form.expected_return_date,
      form.departure_time,
      form.expected_return_time,
      form.passenger_count,
    ],
  );

  useEffect(() => {
    setForm({ ...initialVehicleBookingForm, ...initialData });
    setErrors({});
  }, [initialData]);

  useEffect(() => {
    if (serverErrors) setErrors(serverErrors);
  }, [serverErrors]);

  const updateField = <K extends keyof VehicleBookingFormData>(
    field: K,
    value: VehicleBookingFormData[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));

    setErrors((previous) => {
      if (!previous[field as string]) return previous;

      const next = { ...previous };
      delete next[field as string];
      return next;
    });
  };

  // --------------------------------------
  // PICKER ITEMS
  // --------------------------------------

  const vehicleItems = useMemo<PickerItem[]>(
    () =>
      vehicles.map((vehicle) => {
        const name = vehicle.vehicle_name || `Vehicle #${vehicle.vehicle_id}`;

        return {
          id: vehicle.vehicle_id,
          title: name,
          lines: [
            vehicle.plate_number || "No plate number",
            [
              vehicle.vehicle_type,
              vehicle.capacity ? `${vehicle.capacity} passengers` : null,
              vehicleSeatingNote(vehicle.vehicle_name),
            ]
              .filter(Boolean)
              .join(" · "),
            vehicle.availability_message,
            ...maintenanceLines(vehicle.current_maintenance || vehicle.next_maintenance),
          ].filter((line): line is string => Boolean(line)),
          badge: getStatus(vehicle.availability_status || vehicle.status),
          searchText: [name, vehicle.plate_number, vehicle.vehicle_type]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          renderThumb: (size) => (
            <OptionImage
              protectedPath={
                vehicle.image_path
                  ? `/vehicles/getVehicleImage/${vehicle.vehicle_id}`
                  : null
              }
              alt={name}
              className={`shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-gray-800 ${
                size === "lg" ? "h-14 w-16" : "h-11 w-14"
              }`}
              fallback={
                <span
                  className={`flex shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#00679E] dark:bg-blue-500/10 ${
                    size === "lg" ? "h-14 w-16" : "h-11 w-14"
                  }`}
                >
                  <Car size={22} />
                </span>
              }
            />
          ),
        };
      }),
    [vehicles],
  );

  const driverItems = useMemo<PickerItem[]>(
    () =>
      drivers.map((driver) => {
        const name = driver.driver_name || `Driver #${driver.driver_id}`;

        return {
          id: driver.driver_id,
          title: name,
          lines: [
            driver.contact_number || "No contact number",
            driver.email || "No email address",
            ...driverStatusLines(driver),
          ],
          badge: getStatus(driver.driver_status),
          searchText: [name, driver.contact_number, driver.email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          renderThumb: (size) => (
            <OptionImage
              url={driver.image_url}
              alt={name}
              className={`shrink-0 rounded-full bg-gray-100 object-cover dark:bg-gray-800 ${
                size === "lg" ? "h-12 w-12" : "h-11 w-11"
              }`}
              fallback={
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#00679E] dark:bg-blue-500/10 ${
                    size === "lg" ? "h-12 w-12" : "h-11 w-11"
                  }`}
                >
                  <UserRound size={22} />
                </span>
              }
            />
          ),
        };
      }),
    [drivers],
  );

  const selectedVehicle = vehicles.find((item) => item.vehicle_id === form.vehicle_id) ?? null;
  const selectedDriver = drivers.find((item) => item.driver_id === form.driver_id) ?? null;

  const localConflictMessages = () => {
    const messages: string[] = [];
    const tripStart = form.travel_date;
    const tripEnd = form.expected_return_date;

    if (selectedVehicle) {
      const status = (selectedVehicle.availability_status || selectedVehicle.status || "").toLowerCase();
      const maintenance = selectedVehicle.current_maintenance || selectedVehicle.next_maintenance;
      const coversTrip = maintenance
        ? rangesOverlap(maintenance.date_start, maintenance.date_end, tripStart, tripEnd)
        : false;

      if (status === "maintenance" || status === "unavailable" || coversTrip) {
        messages.push(
          [
            `${selectedVehicle.vehicle_name || "This vehicle"} cannot be used for this trip.`,
            selectedVehicle.availability_message,
            ...maintenanceLines(maintenance),
          ]
            .filter(Boolean)
            .join(" "),
        );
      }
    }

    if (selectedDriver) {
      const status = selectedDriver.driver_status || "Available";
      const blocks =
        status.toLowerCase() !== "available" &&
        (!tripStart ||
          !tripEnd ||
          rangesOverlap(
            selectedDriver.status_start_date,
            selectedDriver.status_end_date,
            tripStart,
            tripEnd,
          ));

      if (blocks) {
        messages.push(
          [
            `${selectedDriver.driver_name || "This driver"} cannot be assigned.`,
            ...driverStatusLines(selectedDriver),
          ].join(" "),
        );
      }
    }

    return messages;
  };

  const scheduleConflictMessages = async () => {
    if (
      !form.travel_date ||
      !form.expected_return_date ||
      !form.departure_time ||
      !form.expected_return_time ||
      form.expected_return_date < form.travel_date
    ) {
      return [];
    }

    const messages: string[] = [];
    const window = {
      travel_date: form.travel_date,
      expected_return_date: form.expected_return_date,
      departure_time: form.departure_time,
      expected_return_time: form.expected_return_time,
      exclude_vehicle_booking_id: bookingId,
    };

    if (form.vehicle_id) {
      const response = await AvailabilityService.checkVehicle({
        ...window,
        vehicle_id: form.vehicle_id,
        passenger_count: Number(form.passenger_count) || undefined,
      });
      if (!response.data.available) {
        messages.push(response.data.message);
        response.data.conflicts?.forEach((row) => {
          const when = [
            row.travel_date ? formatDate(row.travel_date) : null,
            formatTime(row.departure_time),
            "to",
            row.expected_return_date ? formatDate(row.expected_return_date) : null,
            formatTime(row.expected_return_time),
          ]
            .filter(Boolean)
            .join(" ");
          messages.push(
            `${row.destination || row.purpose || "Another trip"} · ${when}`,
          );
        });
      }
    }

    if (form.driver_id) {
      const response = await AvailabilityService.checkDriver({
        ...window,
        driver_id: form.driver_id,
      });
      if (!response.data.available && !messages.includes(response.data.message)) {
        messages.push(response.data.message);
      }
    }

    return messages;
  };

  const revealMistakes = (validationErrors: VehicleBookingFieldErrors) => {
    setErrors(validationErrors);
    const entries = Object.entries(validationErrors).filter((entry) => entry[1]);
    const first = entries[0];
    if (!first) return;
    toast.error(
      entries.length === 1
        ? first[1]
        : `The form still needs ${entries.length} items. Start with: ${first[1]}`,
    );
    window.setTimeout(() => {
      document
        .querySelector(`[data-field="${first[0]}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  useEffect(() => {
    const local = localConflictMessages();
    if (!form.vehicle_id && !form.driver_id) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const schedule = await scheduleConflictMessages();
          const messages = [...local, ...schedule.filter((item) => !local.includes(item))];
          const key = messages.join("\n");
          if (!key || key === dismissedConflict.current) {
            if (!key) setConflict(null);
            return;
          }
          setConflict(messages);
        } catch {
          if (local.length && local.join("\n") !== dismissedConflict.current) {
            setConflict(local);
          }
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    form.vehicle_id,
    form.driver_id,
    form.travel_date,
    form.expected_return_date,
    form.departure_time,
    form.expected_return_time,
    form.passenger_count,
    vehicles,
    drivers,
  ]);

  // --------------------------------------
  // SUBMIT
  // --------------------------------------

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    const validationErrors = validateVehicleBookingForm(form);
    const seated = vehicles.find((item) => item.vehicle_id === form.vehicle_id);
    if (seated?.capacity && Number(form.passenger_count) > seated.capacity) {
      validationErrors.passenger_count = `This vehicle seats ${seated.capacity} passengers. Enter ${seated.capacity} or fewer.`;
    }
    const letterError = letterProblem(letter, requireLetter);
    if (letterError) validationErrors.letter = letterError;

    if (Object.values(validationErrors).some(Boolean)) {
      revealMistakes(validationErrors);
      return;
    }

    try {
      const messages = [
        ...localConflictMessages(),
        ...(await scheduleConflictMessages()),
      ];
      const unique = [...new Set(messages)];
      if (unique.length) {
        setConflict(unique);
        return;
      }
    } catch {
      toast.error("The schedule could not be checked. Try again before sending the request.");
      return;
    }

    setErrors({});

    await onSubmit({
      ...form,
      requested_by: form.requested_by.trim(),
      email: form.email.trim(),
      tel_number: form.tel_number.trim(),
      destination: form.destination.trim(),
      purpose: form.purpose.trim(),
      remarks: form.remarks?.trim() || null,
      passenger_count: Number(form.passenger_count),
      passenger_details: form.passenger_details?.trim() || null,
      // null (not undefined) so removing a selection also clears it on the server
      vehicle_id: form.vehicle_id ?? null,
      driver_id: form.driver_id ?? null,
    }, letter);
  };

  // --------------------------------------
  // RENDER
  // --------------------------------------

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {Object.values(errors).some(Boolean) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="font-semibold">The request cannot be sent yet.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.values(errors)
              .filter((message): message is string => Boolean(message))
              .map((message) => (
                <li key={message}>{message}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Vehicle and Driver */}
      <Section
        title="Vehicle and Driver Selection"
        description="Choose a vehicle and a driver. Maintenance, leave, and overlapping trips are shown before the request is sent."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div data-field="vehicle_id">
            <ResourcePicker
              label="Select Vehicle"
              placeholder="Choose a vehicle"
              searchPlaceholder="Search vehicle..."
              noneLabel="No vehicle selected"
              icon={<Car size={22} />}
              items={vehicleItems}
              value={form.vehicle_id}
              onChange={(id) => updateField("vehicle_id", id)}
              disabled={loading}
              error={errors.vehicle_id}
            />
            {selectedVehicle && (
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {vehicleItems
                  .find((item) => item.id === selectedVehicle.vehicle_id)
                  ?.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </div>
            )}
          </div>

          <div data-field="driver_id">
            <ResourcePicker
              label="Select Driver"
              placeholder="Choose a driver"
              searchPlaceholder="Search driver..."
              noneLabel="No driver selected"
              icon={<UserRound size={22} />}
              items={driverItems}
              value={form.driver_id}
              onChange={(id) => updateField("driver_id", id)}
              disabled={loading}
              error={errors.driver_id}
            />
            {selectedDriver && (
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {driverItems
                  .find((item) => item.id === selectedDriver.driver_id)
                  ?.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!form.vehicle_id}
            onClick={() => setCalendar("vehicles")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            View vehicle calendar
          </button>
          <button
            type="button"
            disabled={!form.driver_id}
            onClick={() => setCalendar("drivers")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            View driver calendar
          </button>
        </div>

        {calendar === "vehicles" && form.vehicle_id && (
          <ResourceCalendarModal
            kind="vehicles"
            resourceId={form.vehicle_id}
            resourceName={selectedVehicle?.vehicle_name || "Vehicle"}
            onClose={() => setCalendar(null)}
          />
        )}
        {calendar === "drivers" && form.driver_id && (
          <ResourceCalendarModal
            kind="drivers"
            resourceId={form.driver_id}
            resourceName={selectedDriver?.driver_name || "Driver"}
            onClose={() => setCalendar(null)}
          />
        )}
      </Section>

      {/* Trip Information */}
      <Section
        title="Trip Information"
        description="Enter the destination and purpose of your vehicle request."
      >
        <div className="space-y-5">
          <Field label="Destination *" field="destination" error={errors.destination}>
            <select
              className={inputClass}
              value={form.destination}
              onChange={(e) => updateField("destination", e.target.value)}
              disabled={loading}
            >
              <option value="">Select a destination</option>
              <optgroup label="Within Capiz">
                {vehicleDestinations
                  .filter((row) => row.withinCapiz)
                  .map((row) => (
                    <option key={row.name} value={row.name}>
                      {row.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Outside Capiz">
                {vehicleDestinations
                  .filter((row) => !row.withinCapiz)
                  .map((row) => (
                    <option key={row.name} value={row.name}>
                      {row.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </Field>

          {chargeEstimate && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <p className="font-semibold">Expense breakdown</p>
              <p className="mt-1 text-xs text-gray-500">
                This is the estimate from the October 1, 2025 computation sheet. Vehicle Admin and Admin Approvals confirm it before they approve.
              </p>
              <div className="mt-3 space-y-3">
                {chargeEstimate.map((line) => (
                  <div key={line.id}>
                    <p className="font-medium">{line.label}</p>
                    {describeChargeLine(line).map((row) => (
                      <p key={row}>{row}</p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-3 font-semibold">
                Estimated total ₱
                {chargeEstimate
                  .reduce((sum, line) => sum + line.quantity * line.unit_amount, 0)
                  .toFixed(2)}
              </p>
            </div>
          )}

          <Field label="Purpose of Travel *" field="purpose" error={errors.purpose}>
            <textarea
              className={inputClass}
              rows={3}
              value={form.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              placeholder="Explain the purpose of the trip"
              maxLength={200}
              disabled={loading}
            />
          </Field>

          <Field label="Additional Remarks" error={errors.remarks}>
            <textarea
              className={inputClass}
              rows={3}
              value={form.remarks ?? ""}
              onChange={(e) => updateField("remarks", e.target.value)}
              placeholder="Additional information (optional)"
              disabled={loading}
            />
          </Field>
        </div>
      </Section>

      {/* Travel Schedule */}
      <Section
        title="Travel Schedule"
        description="Departure and return dates must form a valid trip schedule."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Travel Date *" field="travel_date" error={errors.travel_date}>
            <input
              type="date"
              className={inputClass}
              value={form.travel_date}
              min={earliestTravel}
              onChange={(e) => updateField("travel_date", e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field label="Departure Time *" field="departure_time" error={errors.departure_time}>
            <TimeOfDay
              value={form.departure_time}
              disabled={loading}
              onChange={(value) => updateField("departure_time", value)}
            />
          </Field>

          <Field
            label="Expected Return Date *"
            field="expected_return_date"
            error={errors.expected_return_date}
          >
            <input
              type="date"
              className={inputClass}
              value={form.expected_return_date}
              min={form.travel_date || today}
              onChange={(e) =>
                updateField("expected_return_date", e.target.value)
              }
              disabled={loading}
            />
          </Field>

          <Field
            label="Expected Return Time *"
            field="expected_return_time"
            error={errors.expected_return_time}
          >
            <TimeOfDay
              value={form.expected_return_time}
              disabled={loading}
              onChange={(value) => updateField("expected_return_time", value)}
            />
          </Field>
        </div>
      </Section>

      {/* Passenger Information */}
      <Section
        title="Passenger Information"
        description={
          selectedVehicle?.capacity
            ? `This vehicle seats ${selectedVehicle.capacity} passengers.`
            : "Select a vehicle first. The passenger count cannot be higher than that vehicle's seating."
        }
      >
        <div className="space-y-5">
          <Field label="Number of Passengers *" field="passenger_count" error={errors.passenger_count}>
            <input
              type="number"
              min={1}
              max={selectedVehicle?.capacity || 200}
              className={inputClass}
              value={form.passenger_count || ""}
              onChange={(e) =>
                updateField("passenger_count", Number(e.target.value))
              }
              disabled={loading || !selectedVehicle}
            />
          </Field>

          <Field
            label={requireLetter ? "Letter of request *" : "Letter of request"}
            field="letter"
            error={errors.letter}
          >
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              className={inputClass}
              disabled={loading}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLetter(file);
                const problem = letterProblem(file, requireLetter);
                setErrors((previous) => ({ ...previous, letter: problem }));
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              {letter
                ? `Selected: ${letter.name}`
                : "Required for a new request. PDF, JPG, or PNG, up to 5 MB."}
            </p>
          </Field>

          <Field label="Passenger Details" error={errors.passenger_details}>
            <textarea
              className={inputClass}
              rows={4}
              value={form.passenger_details ?? ""}
              onChange={(e) => updateField("passenger_details", e.target.value)}
              placeholder="Enter passenger names or other details (optional)"
              disabled={loading}
            />
          </Field>
        </div>
      </Section>

      {/* Requester Information */}
      <Section
        title="Requester Information"
        description="Provide the contact details of the person requesting the vehicle."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Requester Name *" field="requested_by" error={errors.requested_by}>
            <input
              className={inputClass}
              value={form.requested_by}
              onChange={(e) => updateField("requested_by", e.target.value)}
              placeholder="Enter requester name"
              maxLength={150}
              disabled={loading}
            />
          </Field>

          <Field label="Email Address *" field="email" error={errors.email}>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Enter email address"
              maxLength={150}
              disabled={loading}
            />
          </Field>

          <Field label="Contact Number *" field="tel_number" error={errors.tel_number}>
            <input
              className={inputClass}
              value={form.tel_number}
              onChange={(e) => updateField("tel_number", e.target.value)}
              placeholder="Enter contact number"
              maxLength={30}
              disabled={loading}
            />
          </Field>

          {user?.office_id && (
            <Field label="Requesting unit">
              <input
                className={inputClass}
                value={
                  offices.find((office) => office.office_id === (form.office_id ?? user.office_id))
                    ?.office_name ?? "Taken from the office on your account."
                }
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">
                Taken from the office on your account.
              </p>
            </Field>
          )}
        </div>
      </Section>

      {conflict && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#003B5C]">This trip cannot use that vehicle or driver</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
              {conflict.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-[#00679E] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  dismissedConflict.current = conflict.join("\n");
                  setConflict(null);
                }}
              >
                Choose a different schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="sticky bottom-0 -mx-6 flex flex-col-reverse justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#17212b] sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={16} />
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default VehicleBookingForm;
