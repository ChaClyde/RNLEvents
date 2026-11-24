import type {
  EventBookingColumns,
  EventBookingScheduleInput,
  ScheduleType,
} from "./EventBookingColumns";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MAX_OCCURRENCES = 200;

export interface TimeRange {
  time_start: string; // "HH:MM" (24h, internal only)
  time_end: string;
}

export interface Occurrence extends TimeRange {
  date: string; // YYYY-MM-DD
}

export interface ScheduleState extends TimeRange {
  type: ScheduleType;
  date_start: string;
  date_end: string;
  weekdays: number[]; // 0 = Sunday ... 6 = Saturday
  customDates: string[];
  excluded: string[]; // dates removed from a range/weekly schedule
  overrides: Record<string, TimeRange>; // per-date time changes
}

// ------------------------------------------------------------
// DATE / TIME HELPERS
// ------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hm = (t?: string | null) => (t ? t.slice(0, 5) : "");

/** "13:00" or "13:00:00" -> "1:00 PM" */
export const to12h = (value?: string | null) => {
  const t = hm(value);
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
};

export const splitTime = (value?: string | null) => {
  const [h, m] = (hm(value) || "08:00").split(":").map(Number);
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: m,
    period: (h >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
};

export const joinTime = (hour: number, minute: number, period: "AM" | "PM") =>
  `${pad((hour % 12) + (period === "PM" ? 12 : 0))}:${pad(minute)}`;

export const formatShortDate = (iso: string) =>
  parseISO(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatRange = (start: string, end: string) => {
  if (!start) return "";
  if (!end || start === end) return formatShortDate(start);

  const s = parseISO(start);
  const e = parseISO(end);
  const sameYear = s.getFullYear() === e.getFullYear();

  const startText = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  return `${startText} - ${e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
};

// ------------------------------------------------------------
// BUILD THE LIST OF BOOKED DATES (mirrors BookingScheduleBuilder)
// ------------------------------------------------------------

export const buildOccurrences = (s: ScheduleState): Occurrence[] => {
  const defaults: TimeRange = {
    time_start: s.time_start,
    time_end: s.time_end,
  };

  let dates: string[] = [];

  if (s.type === "custom") {
    dates = Array.from(new Set(s.customDates)).sort();
  } else if (s.date_start && s.date_end && s.date_end >= s.date_start) {
    const excluded = new Set(s.excluded);
    const end = parseISO(s.date_end);
    const day = parseISO(s.date_start);

    // Stop runaway ranges (backend allows at most one year)
    for (let i = 0; day <= end && i < 400; i++) {
      const iso = toISO(day);

      const weekdayOk =
        s.type !== "weekly" || s.weekdays.includes(day.getDay());

      if (weekdayOk && !excluded.has(iso)) dates.push(iso);

      day.setDate(day.getDate() + 1);
    }
  }

  return dates.map((date) => ({ date, ...(s.overrides[date] ?? defaults) }));
};

// ------------------------------------------------------------
// INITIAL STATE
// ------------------------------------------------------------

export const buildInitialSchedule = (
  booking?: EventBookingColumns | null,
): ScheduleState => {
  if (!booking) {
    return {
      type: "range",
      date_start: "",
      date_end: "",
      weekdays: [],
      time_start: "08:00",
      time_end: "17:00",
      customDates: [],
      excluded: [],
      overrides: {},
    };
  }

  const rows = booking.schedules ?? [];
  const defStart = hm(booking.time_start);
  const defEnd = hm(booking.time_end);
  const type: ScheduleType = booking.schedule_type ?? "range";

  const state: ScheduleState = {
    type,
    date_start: booking.date_start.slice(0, 10),
    date_end: booking.date_end.slice(0, 10),
    weekdays: booking.weekdays ?? [],
    time_start: defStart,
    time_end: defEnd,
    customDates:
      type === "custom" ? rows.map((r) => r.schedule_date.slice(0, 10)) : [],
    excluded: [],
    overrides: {},
  };

  rows.forEach((r) => {
    if (hm(r.time_start) !== defStart || hm(r.time_end) !== defEnd) {
      state.overrides[r.schedule_date.slice(0, 10)] = {
        time_start: hm(r.time_start),
        time_end: hm(r.time_end),
      };
    }
  });

  // Dates the pattern would generate but that are not saved = excluded
  if (type !== "custom" && rows.length > 0) {
    const saved = new Set(rows.map((r) => r.schedule_date.slice(0, 10)));
    state.excluded = buildOccurrences(state)
      .map((o) => o.date)
      .filter((d) => !saved.has(d));
  }

  return state;
};

// ------------------------------------------------------------
// PAYLOAD + VALIDATION
// ------------------------------------------------------------

export const buildSchedulePayload = (
  s: ScheduleState,
  occurrences: Occurrence[],
): EventBookingScheduleInput => {
  const common = {
    schedule_type: s.type,
    time_start: s.time_start,
    time_end: s.time_end,
  };

  if (s.type === "custom") {
    return {
      ...common,
      date_start: null,
      date_end: null,
      dates: occurrences.map((o) => ({
        date: o.date,
        time_start: o.time_start,
        time_end: o.time_end,
      })),
    };
  }

  return {
    ...common,
    date_start: s.date_start,
    date_end: s.date_end,
    weekdays: s.type === "weekly" ? s.weekdays : undefined,
    excluded_dates: s.excluded,
    overrides: occurrences
      .filter((o) => o.time_start !== s.time_start || o.time_end !== s.time_end)
      .map((o) => ({
        date: o.date,
        time_start: o.time_start,
        time_end: o.time_end,
      })),
  };
};

export const MINIMUM_ADVANCE_DAYS = 2;

export const ADVANCE_BOOKING_MESSAGE =
  "Book at least 2 days before the event. Same-day and next-day bookings are not allowed.";

export const earliestBookingDate = (today: string): string => {
  const parsed = new Date(`${today.slice(0, 10)}T00:00:00`);
  parsed.setDate(parsed.getDate() + MINIMUM_ADVANCE_DAYS);

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${parsed.getFullYear()}-${month}-${day}`;
};

export const validateSchedule = (
  s: ScheduleState,
  occurrences: Occurrence[],
  today: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const earliest = earliestBookingDate(today);

  if (s.type === "custom") {
    if (s.customDates.length === 0) {
      errors.schedule = "Add at least one date.";
    } else if (s.customDates.some((d) => d < earliest)) {
      errors.schedule = ADVANCE_BOOKING_MESSAGE;
    }
  } else {
    if (!s.date_start) errors.date_start = "Start date is required.";
    else if (s.date_start < earliest)
      errors.date_start = ADVANCE_BOOKING_MESSAGE;

    if (!s.date_end) errors.date_end = "End date is required.";
    else if (s.date_start && s.date_end < s.date_start)
      errors.date_end = "End date cannot be before start date.";

    if (s.type === "weekly" && s.weekdays.length === 0) {
      errors.weekdays = "Select at least one day of the week.";
    }

    if (
      !errors.date_start &&
      !errors.date_end &&
      !errors.weekdays &&
      occurrences.length === 0
    ) {
      errors.schedule = "No dates match the selected schedule.";
    }
  }

  if (occurrences.length > MAX_OCCURRENCES) {
    errors.schedule = `A booking can have at most ${MAX_OCCURRENCES} dates.`;
  }

  const soon = occurrences.find((item) => item.date < earliest);
  if (soon && !errors.date_start && !errors.schedule) {
    errors.date_start = ADVANCE_BOOKING_MESSAGE;
  }

  const bad = occurrences.find((o) => o.time_end <= o.time_start);
  if (bad) {
    errors.time_end = `End time must be later than start time on ${formatShortDate(bad.date)}.`;
  }

  return errors;
};

export const bookingWindowError = (
  occurrences: Occurrence[],
  gym: boolean,
): string => {
  if (gym) return "";

  const outside = occurrences.find(
    (item) => item.time_start < "07:00" || item.time_end > "22:00",
  );

  if (!outside) return "";

  return `Bookings are only allowed from 7:00 AM to 10:00 PM. ${formatShortDate(outside.date)} is outside that time.`;
};

export const maintenanceBookingError = (
  maintenance:
    | {
        status?: string;
        date_start: string;
        date_end: string;
        reason: string;
        range_label?: string;
      }[]
    | undefined,
  occurrences: Occurrence[],
): string => {
  const hit = (maintenance ?? []).find((row) => {
    if (row.status && row.status !== "scheduled") return false;

    const start = row.date_start.slice(0, 10);
    const end = row.date_end.slice(0, 10);

    return occurrences.some((item) => item.date >= start && item.date <= end);
  });

  if (!hit) return "";

  const when =
    hit.range_label ??
    `${hit.date_start.slice(0, 10)} to ${hit.date_end.slice(0, 10)}`;

  return `This venue is under scheduled maintenance (${hit.reason}) ${when} and cannot be booked.`;
};

// ------------------------------------------------------------
// DISPLAY (list / view / delete)
// ------------------------------------------------------------

export const getScheduleSummary = (b: EventBookingColumns) => {
  const rows = b.schedules ?? [];
  const count = rows.length || b.number_of_days;

  let dateText = formatRange(b.date_start, b.date_end);

  if (b.schedule_type === "weekly" && b.weekdays?.length) {
    const names = [...b.weekdays].sort().map((d) => WEEKDAY_SHORT[d]);
    dateText = `Every ${names.join(", ")} · ${dateText}`;
  } else if (b.schedule_type === "custom") {
    dateText =
      count === 1 ? formatShortDate(b.date_start) : `${count} selected dates`;
  }

  const labels = Array.from(
    new Set(
      rows.map(
        (r) =>
          `${r.time_start_label ?? to12h(r.time_start)} - ${
            r.time_end_label ?? to12h(r.time_end)
          }`,
      ),
    ),
  );

  const timeText =
    labels.length === 1
      ? labels[0]
      : labels.length > 1
        ? "Varies by day"
        : `${b.time_start_label ?? to12h(b.time_start)} - ${
            b.time_end_label ?? to12h(b.time_end)
          }`;

  return { dateText, timeText, count, varies: labels.length > 1 };
};

/** Groups the booked dates by time, e.g. Mon-Thu 1-5 PM, Fri 1-8 PM */
export const groupSchedules = (b: EventBookingColumns) => {
  const rows = b.schedules ?? [];

  if (rows.length === 0) {
    return [
      {
        label: `${b.time_start_label ?? to12h(b.time_start)} - ${
          b.time_end_label ?? to12h(b.time_end)
        }`,
        dates: [b.date_start.slice(0, 10)],
      },
    ];
  }

  const map = new Map<string, string[]>();

  rows.forEach((r) => {
    const label = `${r.time_start_label ?? to12h(r.time_start)} - ${
      r.time_end_label ?? to12h(r.time_end)
    }`;
    map.set(label, [...(map.get(label) ?? []), r.schedule_date.slice(0, 10)]);
  });

  return Array.from(map, ([label, dates]) => ({ label, dates }));
};
