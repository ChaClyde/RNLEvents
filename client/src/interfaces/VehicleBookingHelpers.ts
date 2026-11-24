import type {
  VehicleApprovalStage,
  VehicleBooking,
  VehicleBookingFormData,
  VehicleBookingStatus,
} from "./VehicleBookingColumns";
import { earliestBookingDate } from "./EventBookingSchedule";

// One message per field, e.g. { vehicle_id: "This vehicle is already booked..." }
export type VehicleBookingFieldErrors = Record<string, string | undefined>;

// ============================================================
// API ERRORS
// ============================================================

export interface ParsedApiError {
  status?: number;
  message: string;
  fieldErrors: VehicleBookingFieldErrors;
}

export const parseApiError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedApiError => {
  const err = error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        errors?: Record<string, string[] | string>;
      };
    };
  };

  const fieldErrors: VehicleBookingFieldErrors = {};

  Object.entries(err.response?.data?.errors ?? {}).forEach(([key, value]) => {
    fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
  });

  return {
    status: err.response?.status,
    message: err.response?.data?.message ?? fallback,
    fieldErrors,
  };
};

export const getApiValidationErrors = (error: unknown) =>
  parseApiError(error).fieldErrors;

export const getApiErrorMessage = (error: unknown) =>
  parseApiError(error).message;

// The first field error if there is one, otherwise the general message
export const getVehicleBookingErrorMessage = (error: unknown): string => {
  const { message, fieldErrors } = parseApiError(error);

  return Object.values(fieldErrors).find(Boolean) ?? message;
};

// ============================================================
// DATES AND TIMES
// ============================================================

const pad = (value: number) => String(value).padStart(2, "0");

const parseDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
};

export const getToday = (): string => {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// "Nov 20, 2026"
export const formatDate = (value?: string | null): string => {
  if (!value) return "—";

  const parsed = parseDate(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateRange = (start: string, end: string): string =>
  start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;

// "13:00:00" -> "13:00" (value for <input type="time">)
export const toTimeInput = (value?: string | null): string =>
  value ? value.slice(0, 5) : "";

// "13:00" or "13:00:00" -> "1:00 PM"
export const formatTime = (value?: string | null): string => {
  const time = toTimeInput(value);

  if (!time) return "—";

  const [hour, minute] = time.split(":").map(Number);

  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)} ${
    hour >= 12 ? "PM" : "AM"
  }`;
};

export const formatVehicleBookingDate = formatDate;
export const formatVehicleBookingTime = formatTime;

// ============================================================
// STATUS AND STAGE LABELS
// ============================================================

const STATUS_LABELS: Record<VehicleBookingStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<VehicleBookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const STAGE_LABELS: Record<VehicleApprovalStage, string> = {
  office_head: "Unit Head (Dean / Office Head)",
  vehicle_admin: "Admin Assistant, President's Office",
  vehicle_approval: "Admin Approvals",
  oic_budget: "OIC, Accounting/Budget Office",
  super_admin: "President",
};

export const getVehicleStatusLabel = (status: string): string =>
  STATUS_LABELS[status as VehicleBookingStatus] ?? status;

export const getVehicleStatusStyle = (status: string): string =>
  STATUS_STYLES[status as VehicleBookingStatus] ?? "bg-gray-100 text-gray-600";

export const getVehicleStageLabel = (stage?: string | null): string =>
  stage ? (STAGE_LABELS[stage as VehicleApprovalStage] ?? stage) : "—";

// ============================================================
// BOOKING RULES (mirror the backend)
// ============================================================

// Vehicle and driver can only be assigned at these stages
export const isAssignmentStage = (stage?: string | null): boolean =>
  stage === "vehicle_admin" || stage === "super_admin";

export const hasVehicleAssignment = (
  booking: Pick<VehicleBooking, "vehicle_id" | "driver_id">,
): boolean => Boolean(booking.vehicle_id && booking.driver_id);

// The requester can edit until the first approval decision
export const isRequesterEditable = (booking: VehicleBooking): boolean =>
  booking.status === "pending" &&
  booking.approval_stage === "office_head" &&
  (booking.approvals?.length ?? 0) === 0;

export const canEditVehicleBooking = isRequesterEditable;

export const canAssignVehicle = (booking: VehicleBooking): boolean =>
  booking.status === "pending" && isAssignmentStage(booking.approval_stage);

// At the assignment stages both a vehicle and a driver are needed to approve
export const canApproveVehicleBooking = (booking: VehicleBooking): boolean =>
  booking.status === "pending" &&
  (!isAssignmentStage(booking.approval_stage) || hasVehicleAssignment(booking));

// ============================================================
// FORM
// ============================================================

export const initialVehicleBookingForm: VehicleBookingFormData = {
  requested_by: "",
  email: "",
  tel_number: "",
  office_id: undefined,

  destination: "",
  purpose: "",
  remarks: "",

  travel_date: "",
  departure_time: "",
  expected_return_date: "",
  expected_return_time: "",

  passenger_count: 1,
  passenger_details: "",

  vehicle_id: null,
  driver_id: null,
};

export const mapBookingToForm = (
  booking: VehicleBooking,
): VehicleBookingFormData => ({
  requested_by: booking.requested_by ?? "",
  email: booking.email ?? "",
  tel_number: booking.tel_number ?? "",
  office_id: booking.office_id ?? undefined,

  destination: booking.destination ?? "",
  purpose: booking.purpose ?? "",
  remarks: booking.remarks ?? "",

  travel_date: booking.travel_date.slice(0, 10),
  departure_time: toTimeInput(booking.departure_time),
  expected_return_date: booking.expected_return_date.slice(0, 10),
  expected_return_time: toTimeInput(booking.expected_return_time),

  passenger_count: booking.passenger_count ?? 1,
  passenger_details: booking.passenger_details ?? "",

  vehicle_id: booking.vehicle_id ?? null,
  driver_id: booking.driver_id ?? null,
});

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidReturnDateTime = (
  departureDate: string,
  departureTime: string,
  returnDate: string,
  returnTime: string,
): boolean => {
  const departure = new Date(`${departureDate}T${departureTime}`).getTime();
  const returning = new Date(`${returnDate}T${returnTime}`).getTime();

  return (
    Number.isFinite(departure) &&
    Number.isFinite(returning) &&
    returning > departure
  );
};

export const isValidPassengerCount = (count: number): boolean =>
  Number.isInteger(count) && count >= 1 && count <= 200;

export const validateVehicleBookingForm = (
  form: VehicleBookingFormData,
): VehicleBookingFieldErrors => {
  const errors: VehicleBookingFieldErrors = {};
  const today = getToday();

  if (!form.requested_by.trim()) {
    errors.requested_by = "Requester name is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.tel_number.trim()) {
    errors.tel_number = "Contact number is required.";
  }

  if (!form.destination.trim()) {
    errors.destination = "Destination is required.";
  }

  if (!form.purpose.trim()) {
    errors.purpose = "Purpose of travel is required.";
  }

  if (!form.travel_date) {
    errors.travel_date = "Travel date is required.";
  } else if (form.travel_date < earliestBookingDate(today)) {
    errors.travel_date =
      "Book at least 2 days before the trip. Same-day and next-day trips are not allowed.";
  }

  if (!form.departure_time) {
    errors.departure_time = "Departure time is required.";
  }

  if (!form.expected_return_date) {
    errors.expected_return_date = "Return date is required.";
  } else if (form.travel_date && form.expected_return_date < form.travel_date) {
    errors.expected_return_date =
      "Return date cannot be before the travel date.";
  }

  if (!form.expected_return_time) {
    errors.expected_return_time = "Return time is required.";
  }

  if (
    !errors.travel_date &&
    !errors.departure_time &&
    !errors.expected_return_date &&
    !errors.expected_return_time
  ) {
    const departure = new Date(
      `${form.travel_date}T${form.departure_time}`,
    ).getTime();

    if (departure < Date.now()) {
      errors.departure_time =
        "The departure date and time cannot be in the past.";
    } else if (
      !isValidReturnDateTime(
        form.travel_date,
        form.departure_time,
        form.expected_return_date,
        form.expected_return_time,
      )
    ) {
      errors.expected_return_time =
        "The return date and time must be after departure.";
    }
  }

  if (!isValidPassengerCount(Number(form.passenger_count))) {
    errors.passenger_count = "Passengers must be between 1 and 200.";
  }

  // The backend needs both or neither
  if (form.vehicle_id && !form.driver_id) {
    errors.driver_id = "Select a driver together with the vehicle.";
  } else if (form.driver_id && !form.vehicle_id) {
    errors.vehicle_id = "Select a vehicle together with the driver.";
  }

  return errors;
};

export type VehicleDestination = {
  name: string;
  withinCapiz: boolean;
  basis: "per_person" | "whole_day" | "fuel_only";
  fare: number | null;
};

const perPerson = (
  name: string,
  withinCapiz: boolean,
  fare: number,
): VehicleDestination => ({ name, withinCapiz, basis: "per_person", fare });

export const vehicleDestinations: VehicleDestination[] = [
  perPerson("Caticlan", false, 240),
  perPerson("Altavas", false, 80),
  perPerson("Banga", false, 130),
  perPerson("Batan", false, 110),
  perPerson("Kalibo", false, 170),
  perPerson("San Jose", false, 280),
  perPerson("Lawaan", false, 260),
  perPerson("Bailan", true, 60),
  perPerson("Cuartero", true, 70),
  perPerson("Dao", true, 65),
  perPerson("Dumalag", true, 70),
  perPerson("Dumarao", true, 85),
  perPerson("Ivisan", true, 35),
  perPerson("Jamindan", true, 100),
  perPerson("Pres. Roxas (Lutod-lutod)", true, 70),
  perPerson("Maayon", true, 70),
  perPerson("Mambusao", true, 80),
  perPerson("Panay", true, 40),
  perPerson("Panitan", true, 30),
  perPerson("Pilar", true, 80),
  perPerson("Pontevedra", true, 55),
  perPerson("Sapi-an", true, 70),
  perPerson("Sigma", true, 60),
  perPerson("Tapaz", true, 100),
  perPerson("Timpas, Panitan", true, 50),
  perPerson("Balasan", false, 90),
  perPerson("Barotac Viejo (Camp HG)", false, 200),
  perPerson("Batad", false, 140),
  perPerson("Bingawan", false, 100),
  perPerson("Dumangas", false, 130),
  perPerson("Dumaguete", false, 350),
  perPerson("Bacolod", false, 300),
  perPerson("Kabankalan", false, 400),
  perPerson("Estancia", false, 100),
  perPerson("Iloilo City", false, 250),
  perPerson("Leon / Oton", false, 200),
  perPerson("Passi", false, 125),
  perPerson("Pototan", false, 130),
  perPerson("San Dionisio", false, 140),
  perPerson("Carles", false, 100),
  perPerson("San Enrique", false, 110),
  { name: "Roxas City and around", withinCapiz: true, basis: "whole_day", fare: null },
  { name: "Vigil Service", withinCapiz: true, basis: "fuel_only", fare: null },
];

export const vehicleMealQuote = (
  destination: string,
  travelDate: string,
  returnDate: string,
) => {
  const row = vehicleDestinations.find((item) => item.name === destination);
  if (!row || !travelDate || !returnDate || returnDate < travelDate) return null;

  const start = new Date(`${travelDate}T00:00:00`);
  const end = new Date(`${returnDate}T00:00:00`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const mealRate = row.withinCapiz ? 200 : 300;

  return {
    area: row.withinCapiz ? "within_capiz" : "outside_capiz",
    mealRate,
    mealCount: days,
    driverMealAmount: mealRate * days,
    basis: row.basis,
    fare: row.fare,
  };
};

export const vehicleChargeDetail = (id: string): string => {
  switch (id) {
    case "passenger_fare":
      return "Passenger fare from the October 1, 2025 computation sheet. It is charged once for each passenger.";
    case "fuel":
      return "Fuel for a trip that stays in Roxas City and around. The sheet charges ₱400 for the whole vehicle on each travel day, not for each passenger.";
    case "wear_tear":
      return "Wear and tear for a trip that stays in Roxas City and around. The sheet charges ₱300 for the whole vehicle on each travel day. Fuel and wear and tear together are ₱700 for the whole day.";
    case "fuel_only":
      return "Vigil service is marked Fuel Only on the sheet. No peso amount is printed, so this line starts at zero until Vehicle Admin or Admin Approvals enters the fuel cost.";
    case "driver_meal":
      return "Driver's meal allowance, paid directly to the driver. Within Capiz is ₱200 per meal. Outside Capiz is ₱300 per meal. One meal is counted for each day from the travel date through the return date.";
    default:
      return "Additional charge added by Vehicle Admin or Admin Approvals. This amount is not printed on the October 1, 2025 fare sheet.";
  }
};

export type VehicleChargeLine = {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  unit_amount: number;
  removable: boolean;
  meal_rate?: number;
  day_count?: number;
  meal_breakdown?: { name: string; days: number }[];
  added_by_name?: string | null;
  added_at?: string | null;
};

const money = (amount: number) =>
  `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const driverMealPlan = (
  travelDate: string,
  returnDate: string,
  departureTime: string,
  returnTime: string,
) => {
  if (!travelDate || !returnDate || !departureTime || !returnTime || returnDate < travelDate) {
    return null;
  }

  const start = new Date(`${travelDate}T${departureTime}`);
  const end = new Date(`${returnDate}T${returnTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;

  const counts = [
    { name: "Breakfast", time: "07:00", days: 0 },
    { name: "Lunch", time: "12:00", days: 0 },
    { name: "Dinner", time: "18:00", days: 0 },
  ];
  const cursor = new Date(`${travelDate}T00:00:00`);
  const last = new Date(`${returnDate}T00:00:00`);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    counts.forEach((meal) => {
      const moment = new Date(`${year}-${month}-${day}T${meal.time}:00`);
      if (moment >= start && moment <= end) meal.days += 1;
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return counts.filter((meal) => meal.days > 0);
};

export const describeChargeLine = (line: {
  id: string;
  label: string;
  quantity: number;
  unit_amount: number;
  removable?: boolean;
  meal_rate?: number;
  meal_breakdown?: { name: string; days: number }[];
  added_by_name?: string | null;
  added_at?: string | null;
}): string[] => {
  const quantity = Number(line.quantity) || 0;
  const unit = Number(line.unit_amount) || 0;
  const total = quantity * unit;
  const countLabel = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);

  if (line.id === "passenger_fare") {
    return [
      `Fare per person: ${money(unit)}`,
      `Number of passengers: ${countLabel}`,
      `Total: ${money(total)}`,
    ];
  }

  if (line.id === "driver_meal") {
    const rate = Number(line.meal_rate ?? unit);
    const meals = line.meal_breakdown ?? [];
    const rows = [`${money(rate)} per meal`];
    if (meals.length === 0) {
      rows.push("No breakfast, lunch, or dinner falls within this schedule.");
      rows.push(`Total: ${money(total)}`);
      return rows;
    }
    const dayCounts = meals.map((item) => item.days);
    const same = dayCounts.every((days) => days === dayCounts[0]);
    if (same) {
      const daily = rate * meals.length;
      rows.unshift(meals.map((item) => item.name).join(" and "));
      rows.push(`${money(rate)} × ${meals.length} = ${money(daily)} per day`);
      rows.push(`${money(daily)} × ${dayCounts[0]} day${dayCounts[0] === 1 ? "" : "s"}`);
    } else {
      meals.forEach((item) => {
        rows.push(`${item.name}: ${money(rate)} × ${item.days} day${item.days === 1 ? "" : "s"} = ${money(rate * item.days)}`);
      });
    }
    rows.push(`Total: ${money(total)}`);
    return rows;
  }

  if (line.removable) {
    const rows = [
      `Name: ${line.label}`,
      `Quantity: ${countLabel}`,
      `Price: ${money(unit)}`,
      `Total: ${money(total)}`,
    ];
    if (line.added_by_name) {
      const when = line.added_at
        ? new Date(line.added_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "time not recorded";
      rows.push(`Added by ${line.added_by_name} on ${when}`);
    }
    return rows;
  }

  return [`${line.label}: ${money(unit)} × ${countLabel} = ${money(total)}`];
};

export const vehicleChargeEstimate = (
  destination: string,
  travelDate: string,
  returnDate: string,
  passengers: number,
  departureTime = "",
  returnTime = "",
): VehicleChargeLine[] | null => {
  const quote = vehicleMealQuote(destination, travelDate, returnDate);
  if (!quote) return null;
  const meals = driverMealPlan(travelDate, returnDate, departureTime, returnTime) ?? [];
  const mealCount = meals.reduce((sum, meal) => sum + meal.days, 0);

  const lines: VehicleChargeLine[] = [];
  const count = Math.max(1, Number(passengers) || 1);

  if (quote.basis === "per_person" && quote.fare != null) {
    lines.push({
      id: "passenger_fare",
      label: `Fare per person · ${destination}`,
      detail: vehicleChargeDetail("passenger_fare"),
      quantity: count,
      unit_amount: quote.fare,
      removable: false,
    });
  } else if (quote.basis === "whole_day") {
    lines.push({
      id: "fuel",
      label: "Fuel · Roxas City and around",
      detail: vehicleChargeDetail("fuel"),
      quantity: quote.mealCount,
      unit_amount: 400,
      removable: false,
    });
    lines.push({
      id: "wear_tear",
      label: "Wear and tear · Roxas City and around",
      detail: vehicleChargeDetail("wear_tear"),
      quantity: quote.mealCount,
      unit_amount: 300,
      removable: false,
    });
  } else {
    lines.push({
      id: "fuel_only",
      label: "Vigil service · fuel only",
      detail: vehicleChargeDetail("fuel_only"),
      quantity: 1,
      unit_amount: 0,
      removable: false,
    });
  }

  lines.push({
    id: "driver_meal",
    label: "Driver's meal allowance",
    detail: vehicleChargeDetail("driver_meal"),
    quantity: mealCount,
    unit_amount: quote.mealRate,
    meal_rate: quote.mealRate,
    day_count: quote.mealCount,
    meal_breakdown: meals,
    removable: false,
  });

  return lines;
};

export const vehicleSeatingNote = (vehicleName?: string | null): string | null => {
  const name = (vehicleName ?? "").toLowerCase();

  if (name.includes("urvan")) return "Official seating: 14 passengers.";
  if (name.includes("hiace") || name.includes("hi-ace") || name.includes("hi ace")) {
    return "Official seating: 12 passengers.";
  }
  if (name.includes("crosswind")) return "Official seating: 8 passengers.";
  if (name.includes("canter")) return "Official seating: 3 passengers plus 11 in the back.";
  if (name.includes("frontier")) return "Official seating: 4 passengers plus 5 in the back.";
  if (name.includes("commuter")) return "Official seating: 14 passengers.";

  return null;
};
