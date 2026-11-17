import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import {
  formatRange,
  formatShortDate,
  parseISO,
  toISO,
} from "../../../interfaces/EventBookingSchedule";
import type {
  VenueCalendarDay,
  VenueCalendarDayResponse,
} from "../../../interfaces/EventBookingColumns";
import VenueCalendarService from "../../../services/VenueCalendarService";

interface VenueCalendarModalProps {
  venueId: number;
  venueName: string;
  // When editing, hide the booking's own dates
  excludeBookingId?: number;
  initialDate?: string;
  onClose: () => void;
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
};

const VenueCalendarModal = ({
  venueId,
  venueName,
  excludeBookingId,
  initialDate,
  onClose,
}: VenueCalendarModalProps) => {
  const [month, setMonth] = useState(() => {
    const base = initialDate ? parseISO(initialDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [days, setDays] = useState<VenueCalendarDay[]>([]);
  const [windowLabel, setWindowLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<string | null>(initialDate ?? null);
  const [dayData, setDayData] = useState<
    VenueCalendarDayResponse["data"] | null
  >(null);
  const [dayLoading, setDayLoading] = useState(false);

  const today = toISO(new Date());
  const requestId = useRef(0);

  // Month
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await VenueCalendarService.loadMonth(
          venueId,
          monthKey(month),
          excludeBookingId,
        );

        if (cancelled) return;

        setDays(res.data.data.days);
        setWindowLabel(
          `${res.data.data.window.start_label} - ${res.data.data.window.end_label}`,
        );
      } catch (err) {
        if (!cancelled) {
          const e = err as {
            response?: { status?: number; data?: { message?: string } };
          };
          setError(
            `Unable to load the venue calendar${
              e.response?.status ? ` (${e.response.status})` : ""
            }${e.response?.data?.message ? `: ${e.response.data.message}` : "."}`,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [venueId, month, excludeBookingId]);

  // Clicked date
  useEffect(() => {
    if (!selected) {
      setDayData(null);
      return;
    }

    const id = ++requestId.current;
    setDayLoading(true);

    VenueCalendarService.loadDay(venueId, selected, excludeBookingId)
      .then((res) => {
        if (id === requestId.current) setDayData(res.data.data);
      })
      .catch(() => {
        if (id === requestId.current) setDayData(null);
      })
      .finally(() => {
        if (id === requestId.current) setDayLoading(false);
      });
  }, [venueId, selected, excludeBookingId]);

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const total = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();

    return [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: total }, (_, i) =>
        toISO(new Date(month.getFullYear(), month.getMonth(), i + 1)),
      ),
    ];
  }, [month]);

  const shiftMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const cellClass = (date: string) => {
    const status = dayMap.get(date)?.status;
    const past = date < today;

    const color =
      status === "booked"
        ? "border-red-300 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        : status === "partial"
          ? "border-amber-300 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300";

    return `relative h-14 rounded-xl border text-sm font-semibold transition hover:ring-2 hover:ring-[#0095D9] ${color} ${
      past ? "opacity-50" : ""
    } ${selected === date ? "ring-2 ring-[#003B5C]" : ""}`;
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">{venueName}</h3>
            <p className="text-xs text-white/75">
              Venue calendar{windowLabel ? ` · open ${windowLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/20"
            aria-label="Close calendar"
          >
            <FiX size={21} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1.4fr_1fr]">
          {/* CALENDAR */}
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <FiChevronLeft />
              </button>

              <p className="font-bold text-gray-900 dark:text-white">
                {month.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <FiChevronRight />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-gray-400">
              {WEEK.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            {error ? (
              <p className="py-10 text-center text-sm text-red-500">{error}</p>
            ) : (
              <div
                className={`grid grid-cols-7 gap-1.5 ${loading ? "opacity-50" : ""}`}
              >
                {cells.map((date, i) =>
                  date ? (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelected(date)}
                      className={cellClass(date)}
                    >
                      {Number(date.slice(8))}
                      {dayMap.get(date) && (
                        <span className="absolute bottom-1 left-0 right-0 text-[10px] font-medium">
                          {dayMap.get(date)?.events_count}{" "}
                          {dayMap.get(date)?.events_count === 1
                            ? "event"
                            : "events"}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div key={`blank-${i}`} />
                  ),
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-green-200" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-200" /> Partly booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-red-200" /> Fully booked
              </span>
            </div>
          </div>

          {/* DAY DETAILS */}
          <div className="border-t border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-950 lg:border-l lg:border-t-0">
            {!selected ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Click a date to see its events.
              </p>
            ) : dayLoading ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Loading...
              </p>
            ) : !dayData ? (
              <p className="py-10 text-center text-sm text-red-500">
                Unable to load this date.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatShortDate(dayData.date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dayData.events.length === 0
                      ? "No events. The venue is free all day."
                      : `${dayData.events.length} ${
                          dayData.events.length === 1 ? "event" : "events"
                        }`}
                  </p>
                </div>

                {dayData.events.map((ev) => (
                  <div
                    key={ev.event_booking_id}
                    className="space-y-1.5 rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {ev.purpose}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          statusBadge[ev.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <p className="font-medium text-[#00679E] dark:text-[#38BDF8]">
                      {ev.time_start_label} - {ev.time_end_label}
                    </p>

                    {ev.description && (
                      <p className="text-xs text-gray-500">{ev.description}</p>
                    )}

                    <p className="text-xs text-gray-500">
                      Requested by {ev.requested_by}
                      {ev.office ? ` · ${ev.office}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.expected_attendees.toLocaleString()} attendees ·{" "}
                      {formatRange(ev.booking_date_start, ev.booking_date_end)}{" "}
                      ({ev.number_of_days}{" "}
                      {ev.number_of_days === 1 ? "day" : "days"})
                    </p>
                  </div>
                ))}

                {dayData.free_slots.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-500">
                      Free times
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {dayData.free_slots.map((s) => (
                        <span
                          key={s.time_start}
                          className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        >
                          {s.time_start_label} - {s.time_end_label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueCalendarModal;
