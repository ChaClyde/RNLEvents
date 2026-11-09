import { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import CalendarService, {
  type CalendarItem,
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

const itemColor = (item: CalendarItem) => {
  if (item.status === "pending") {
    return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200";
  }
  if (item.status === "approved" || item.status === "scheduled") {
    return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-200";
  }
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200";
};

const ScheduleCalendarPage = () => {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [items, setItems] = useState<CalendarItem[]>([]);
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

  const days = useMemo(() => {
    if (view === "day") return [new Date(cursor)];
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    const start = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor, view]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    items.forEach((item) => {
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
  }, [items]);

  const selectedItems = itemsByDay.get(selectedDate) ?? [];
  const hasConflictDay = (key: string) => (itemsByDay.get(key) ?? []).length > 1;

  const shift = (amount: number) => {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + amount);
    else if (view === "week") next.setDate(next.getDate() + amount * 7);
    else next.setMonth(next.getMonth() + amount);
    setCursor(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-[#101820] sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white">
              Schedule Calendar
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Event, venue, vehicle, and driver schedules you are authorized to see.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["month", "week", "day"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  view === option
                    ? "bg-[#00679E] text-white"
                    : "border border-gray-300 bg-white dark:border-gray-700 dark:bg-[#17232E]"
                }`}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm dark:border-gray-700"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 dark:border-gray-700 dark:bg-[#17232E]">
          <button type="button" onClick={() => shift(-1)}>
            <FiChevronLeft />
          </button>
          <p className="font-semibold">
            {cursor.toLocaleDateString("en-PH", {
              month: "long",
              year: "numeric",
              ...(view !== "month" ? { day: "numeric" } : {}),
            })}
          </p>
          <button type="button" onClick={() => shift(1)}>
            <FiChevronRight />
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-7 gap-1 rounded-2xl border bg-white p-3 dark:border-gray-700 dark:bg-[#17232E]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="pb-2 text-center text-xs font-semibold text-gray-500">
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
                  className={`min-h-24 rounded-xl border p-2 text-left text-xs ${
                    selectedDate === key
                      ? "border-[#0095D9] bg-[#0095D9]/10"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                  } ${outsideMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{day.getDate()}</span>
                    {hasConflictDay(key) && (
                      <span className="h-2 w-2 rounded-full bg-red-500" />
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
                      <p className="text-[10px] text-gray-400">+{dayItems.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="rounded-2xl border bg-white p-4 dark:border-gray-700 dark:bg-[#17232E]">
            <h2 className="font-bold">Details for {selectedDate}</h2>
            {selectedItems.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No scheduled items.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedItems.map((item) => (
                  <li key={item.id} className={`rounded-xl border p-3 text-sm ${itemColor(item)}`}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs uppercase">{item.type.replace("_", " ")} · {item.status}</p>
                    {item.resource_label && <p className="mt-1 text-xs">{item.resource_label}</p>}
                    {item.destination && <p className="mt-1 text-xs">{item.destination}</p>}
                    {item.requested_by && <p className="mt-1 text-xs">{item.requested_by}</p>}
                    {item.unavailability_reason && (
                      <p className="mt-1 text-xs">{item.unavailability_reason}</p>
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
