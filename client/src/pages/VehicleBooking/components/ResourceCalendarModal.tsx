import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import VehicleBookingService from "../../../services/VehicleBookingService";

interface DayMark {
  date: string;
  status: string;
  trips_count: number;
  reasons: string[];
}

interface DayDetail {
  date: string;
  day: string;
  reasons: string[];
  trips: {
    vehicle_booking_id: number;
    purpose: string;
    destination: string;
    status: string;
    office?: string | null;
    vehicle?: string | null;
    driver?: string | null;
    time: string;
  }[];
}

interface ResourceCalendarModalProps {
  kind: "vehicles" | "drivers";
  resourceId: number;
  resourceName: string;
  onClose: () => void;
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ResourceCalendarModal({
  kind,
  resourceId,
  resourceName,
  onClose,
}: ResourceCalendarModalProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [days, setDays] = useState<DayMark[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    VehicleBookingService.loadResourceMonth(kind, resourceId, monthKey(month))
      .then((response) => {
        if (!cancelled) setDays(response.data.data.days ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, resourceId, month]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    VehicleBookingService.loadResourceDay(kind, resourceId, selected).then(
      (response) => {
        if (!cancelled) setDetail(response.data.data);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [kind, resourceId, selected]);

  const marks = new Map(days.map((day) => [day.date, day]));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells: Array<Date | null> = [
    ...Array.from({ length: first.getDay() }, () => null),
  ];
  const cursor = new Date(first);
  while (cursor.getMonth() === month.getMonth()) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-surface p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {kind === "vehicles" ? "Vehicle" : "Driver"} calendar
            </h2>
            <p className="text-sm text-muted">{resourceName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calendar">
            <FiX />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <FiChevronLeft />
          </button>
          <p className="font-semibold text-ink">
            {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <FiChevronRight />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading calendar...</p>
        ) : (
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEK.map((label) => (
              <div key={label} className="py-1 text-xs text-muted">
                {label}
              </div>
            ))}
            {cells.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} />;
              const key = date.toLocaleDateString("en-CA");
              const mark = marks.get(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`rounded-lg border px-1 py-2 ${
                    selected === key
                      ? "border-primary bg-primary text-white"
                      : mark?.status === "blocked"
                        ? "border-danger/30 bg-danger-soft text-danger"
                        : mark
                          ? "border-accent/40 bg-accent/20 text-ink"
                          : "border-line text-ink"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        )}

        {detail && (
          <div className="mt-4 rounded-lg border border-line p-3 text-sm">
            <p className="font-semibold text-ink">
              {detail.day}, {detail.date}
            </p>
            {detail.reasons.map((reason) => (
              <p key={reason} className="mt-1 text-danger">
                {reason}
              </p>
            ))}
            {detail.trips.length === 0 && detail.reasons.length === 0 && (
              <p className="mt-1 text-muted">No trip is scheduled on this date.</p>
            )}
            {detail.trips.map((trip) => (
              <div key={trip.vehicle_booking_id} className="mt-2 border-t border-line pt-2">
                <p className="font-medium text-ink">{trip.purpose}</p>
                <p className="text-muted">
                  {trip.destination} · {trip.time} · {trip.status}
                </p>
                <p className="text-muted">
                  {trip.office || "No office"} · {trip.vehicle || "No vehicle"} ·{" "}
                  {trip.driver || "No driver"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
