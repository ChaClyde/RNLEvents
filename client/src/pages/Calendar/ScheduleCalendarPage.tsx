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

// Same status colors as the dashboard: pending = yellow, approved = green,
// everything else (rejected, cancelled) = red
const itemColor = (item: CalendarItem) => {
  if (item.status === "pending") {
    return "bg-accent-soft text-[#6b4e00] border-accent/40";
  }
  if (item.status === "approved" || item.status === "scheduled") {
    return "bg-success-soft text-success border-success/20";
  }
  return "bg-danger-soft text-danger border-danger/20";
};

const selectClass =
  "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

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

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-ink">Schedule Calendar</h1>
            <p className="mt-1 text-sm text-muted">
              Event, venue, vehicle, and driver schedules you are authorized to
              see.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["month", "week", "day"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  view === option
                    ? "bg-primary text-on-primary"
                    : "border border-line bg-surface text-ink hover:bg-primary-soft hover:text-primary"
                }`}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:bg-primary-soft hover:text-primary"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <FiChevronLeft />
          </button>
          <p className="font-semibold text-ink">
            {cursor.toLocaleDateString("en-PH", {
              month: "long",
              year: "numeric",
              ...(view !== "month" ? { day: "numeric" } : {}),
            })}
          </p>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <FiChevronRight />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-muted">
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
          <label className="text-sm font-medium text-muted">
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
          <label className="text-sm font-medium text-muted">
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
                className="text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-7 gap-1 rounded-xl border border-line bg-surface p-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div
                key={label}
                className="pb-2 text-center text-xs font-semibold text-muted"
              >
                {label}
              </div>
            ))}
            {days.map((day) => {
              const key = toDateKey(day);
              const dayItems = itemsByDay.get(key) ?? [];
              const outsideMonth =
                view === "month" && day.getMonth() !== cursor.getMonth();

              return (
                <button
                  key={key + day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-24 rounded-lg border p-2 text-left text-xs transition-colors ${
                    selectedDate === key
                      ? "border-primary bg-primary-soft"
                      : "border-transparent hover:bg-page"
                  } ${outsideMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">
                      {day.getDate()}
                    </span>
                    {hasConflictDay(key) && (
                      <span className="h-2 w-2 rounded-full bg-danger" />
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <p
                        key={item.id}
                        className={`truncate rounded border px-1 py-0.5 ${itemColor(item)}`}
                      >
                        {item.title}
                      </p>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] text-muted">
                        +{dayItems.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="rounded-xl border border-line bg-surface p-4">
            <h2 className="font-bold text-ink">Details for {selectedDate}</h2>
            {selectedItems.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No scheduled items.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedItems.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${itemColor(item)}`}
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
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendarPage;
