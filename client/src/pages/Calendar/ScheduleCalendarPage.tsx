import { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import CalendarService, {
  type CalendarDriverOption,
  type CalendarItem,
  type CalendarVehicleOption,
  type CalendarVenueOption,
} from "../../services/CalendarService";
import { parseApiError } from "../../interfaces/EventBookingHelpers";

type CalendarView = "month" | "week" | "day";

const toDateKey = (value: Date) => value.toLocaleDateString("en-CA");

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, amount: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

// Same status colors as the dashboard: pending = mustard, approved = green,
// everything else (rejected, cancelled) = red
const itemColor = (item: CalendarItem) => {
  if (item.status === "pending") {
    return "bg-[#FFF1C2] text-[#7A5600] border-[#FFB800]/50";
  }
  if (item.status === "approved" || item.status === "scheduled") {
    return "bg-success-soft text-success border-success/20";
  }
  return "bg-danger-soft text-danger border-danger/20";
};

const selectClass =
  "mt-1.5 w-full rounded-lg border border-[#E5E8EF] bg-white px-3 py-2.5 text-sm font-medium text-[#002583] shadow-sm outline-none transition focus:border-[#2F63D4] focus:ring-2 focus:ring-[#2F63D4]/25";

const cardClass =
  "rounded-2xl bg-white shadow-[0_4px_14px_rgba(0,37,131,0.08)] ring-1 ring-[#E5E8EF]/70";

const ScheduleCalendarPage = () => {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [venues, setVenues] = useState<CalendarVenueOption[]>([]);
  const [vehicles, setVehicles] = useState<CalendarVehicleOption[]>([]);
  const [drivers, setDrivers] = useState<CalendarDriverOption[]>([]);
  const [venueId, setVenueId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const todayKey = toDateKey(new Date());

  const range = useMemo(() => {
    if (view === "day") {
      return { from: toDateKey(cursor), to: toDateKey(cursor) };
    }
    if (view === "week") {
      const start = startOfWeek(cursor);
      return { from: toDateKey(start), to: toDateKey(addDays(start, 6)) };
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { from: toDateKey(start), to: toDateKey(end) };
  }, [cursor, view]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await CalendarService.load(range);
      setItems(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;

    CalendarService.options()
      .then((response) => {
        if (!active) return;
        setVenues(
          Array.isArray(response.data.venues) ? response.data.venues : [],
        );
        setVehicles(
          Array.isArray(response.data.vehicles) ? response.data.vehicles : [],
        );
        setDrivers(
          Array.isArray(response.data.drivers) ? response.data.drivers : [],
        );
      })
      .catch(() => {
        if (!active) return;
        setVenues([]);
        setVehicles([]);
        setDrivers([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const days = useMemo(() => {
    if (view === "day") return [new Date(cursor)];
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    const start = startOfWeek(
      new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    );
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor, view]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (venueId && String(item.venue_id ?? "") !== venueId) return false;
      if (vehicleId && String(item.vehicle_id ?? "") !== vehicleId)
        return false;
      if (driverId && String(item.driver_id ?? "") !== driverId) return false;
      return true;
    });
  }, [driverId, items, vehicleId, venueId]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    visibleItems.forEach((item) => {
      const start = item.start.slice(0, 10);
      const end = item.end.slice(0, 10);
      let cursorDate = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      while (cursorDate <= last) {
        const key = toDateKey(cursorDate);
        map.set(key, [...(map.get(key) ?? []), item]);
        cursorDate = addDays(cursorDate, 1);
      }
    });
    return map;
  }, [visibleItems]);

  const selectedItems = itemsByDay.get(selectedDate) ?? [];
  const hasConflictDay = (key: string) =>
    (itemsByDay.get(key) ?? []).length > 1;

  const shift = (amount: number) => {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + amount);
    else if (view === "week") next.setDate(next.getDate() + amount * 7);
    else next.setMonth(next.getMonth() + amount);
    setCursor(next);
  };

  const goToday = () => {
    const now = new Date();
    setCursor(now);
    setSelectedDate(toDateKey(now));
  };

  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "en-PH",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <header className="flex flex-col gap-4 rounded-2xl bg-linear-to-r from-[#0B3A9F] via-[#002583] to-[#0A1A45] px-6 py-5 text-white shadow-md lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-extrabold tracking-wider text-[#FFB800] [font-variant-caps:small-caps]">
            FilSched
          </p>
          <h1 className="mt-1 text-2xl font-bold">Schedule Calendar</h1>
          <p className="mt-1 text-sm text-white/90">
            Event, venue, vehicle, and driver schedules you are authorized to
            see.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white/10 p-1">
            {(["month", "week", "day"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  view === option
                    ? "bg-white text-[#002583] shadow-sm"
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                }`}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={load}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#002583] shadow-sm transition-colors hover:bg-[#E5E8EF] focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* MONTH NAVIGATION */}
      <div
        className={`${cardClass} flex items-center justify-between gap-3 px-4 py-3`}
      >
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous"
          className="rounded-xl border border-[#E5E8EF] p-2 text-[#002583] transition-colors hover:bg-[#E5E8EF]"
        >
          <FiChevronLeft />
        </button>

        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-[#002583]">
            {cursor.toLocaleDateString("en-PH", {
              month: "long",
              year: "numeric",
              ...(view !== "month" ? { day: "numeric" } : {}),
            })}
          </p>

          <button
            type="button"
            onClick={goToday}
            className="rounded-lg bg-[#FFB800] px-3 py-1 text-xs font-bold text-[#002583] transition-colors hover:bg-[#FFC933]"
          >
            Today
          </button>
        </div>

        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next"
          className="rounded-xl border border-[#E5E8EF] p-2 text-[#002583] transition-colors hover:bg-[#E5E8EF]"
        >
          <FiChevronRight />
        </button>
      </div>

      {/* FILTERS */}
      <div className={`${cardClass} grid grid-cols-1 gap-3 p-4 sm:grid-cols-3`}>
        <label className="text-sm font-medium text-[#5B6678]">
          Venue
          <select
            value={venueId}
            onChange={(event) => setVenueId(event.target.value)}
            className={selectClass}
          >
            <option value="">All venues</option>
            {venues.map((venue) => (
              <option key={venue.venue_id} value={venue.venue_id}>
                {venue.venue}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[#5B6678]">
          Vehicle
          <select
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            className={selectClass}
          >
            <option value="">All vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                {vehicle.plate_number
                  ? `${vehicle.vehicle_name} (${vehicle.plate_number})`
                  : vehicle.vehicle_name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[#5B6678]">
          Driver
          <select
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
            className={selectClass}
          >
            <option value="">All drivers</option>
            {drivers.map((driver) => (
              <option key={driver.driver_id} value={driver.driver_id}>
                {driver.driver_name}
              </option>
            ))}
          </select>
        </label>

        {(venueId || vehicleId || driverId) && (
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={() => {
                setVenueId("");
                setVehicleId("");
                setDriverId("");
              }}
              className="text-sm font-semibold text-[#2F63D4] transition-colors hover:text-[#002583]"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        {/* CALENDAR GRID */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-[#E5E8EF] px-5 py-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#002583]">
              {view === "month"
                ? "Monthly schedule"
                : view === "week"
                  ? "Weekly schedule"
                  : "Daily schedule"}
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-1.5 p-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div
                key={label}
                className="pb-2 text-center text-xs font-bold uppercase tracking-wide text-[#002583]"
              >
                {label}
              </div>
            ))}

            {days.map((day) => {
              const key = toDateKey(day);
              const dayItems = itemsByDay.get(key) ?? [];
              const outsideMonth =
                view === "month" && day.getMonth() !== cursor.getMonth();
              const isToday = key === todayKey;

              return (
                <button
                  key={key + day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-24 rounded-xl border p-2 text-left text-xs transition-colors ${
                    selectedDate === key
                      ? "border-[#002583] bg-[#E3EBFF]"
                      : "border-[#E5E8EF] hover:border-[#2F63D4] hover:bg-[#F4F7FD]"
                  } ${outsideMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${
                        isToday ? "bg-[#002583] text-white" : "text-[#002583]"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {hasConflictDay(key) && (
                      <span
                        className="h-2 w-2 rounded-full bg-danger"
                        title="More than one item on this day"
                      />
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <p
                        key={item.id}
                        className={`truncate rounded-md border px-1.5 py-0.5 font-medium ${itemColor(item)}`}
                      >
                        {item.title}
                      </p>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] font-medium text-[#5B6678]">
                        +{dayItems.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 border-t border-[#E5E8EF] px-5 py-3 text-xs text-[#5B6678]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FFB800]" /> Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Approved /
              scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Rejected /
              cancelled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" /> Busy day
            </span>
          </div>
        </div>

        {/* DETAILS */}
        <aside className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-[#E5E8EF] px-5 py-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#002583]">
              Details
            </h2>
          </div>

          <div className="p-5">
            <p className="text-base font-bold text-[#002583]">
              {selectedLabel}
            </p>

            {selectedItems.length === 0 ? (
              <p className="mt-6 text-sm text-[#5B6678]">No scheduled items.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedItems.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-xl border p-3 text-sm ${itemColor(item)}`}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs uppercase">
                      {item.type.replace("_", " ")} · {item.status}
                    </p>
                    {item.resource_label && (
                      <p className="mt-1 text-xs">{item.resource_label}</p>
                    )}
                    {item.destination && (
                      <p className="mt-1 text-xs">{item.destination}</p>
                    )}
                    {item.requested_by && (
                      <p className="mt-1 text-xs">{item.requested_by}</p>
                    )}
                    {item.unavailability_reason && (
                      <p className="mt-1 text-xs">
                        {item.unavailability_reason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ScheduleCalendarPage;
