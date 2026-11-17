import { FiAlertTriangle, FiCalendar } from "react-icons/fi";
import type {
  ConflictSuggestion,
  VenueConflict,
} from "../../../interfaces/EventBookingColumns";
import { formatShortDate } from "../../../interfaces/EventBookingSchedule";

interface ScheduleConflictPanelProps {
  conflicts: VenueConflict[];
  suggestions: ConflictSuggestion[];
  // Replace a conflicting date with a free one
  onPickAlternative: (conflictDate: string, newDate: string) => void;
  onOpenCalendar: () => void;
}

const ScheduleConflictPanel = ({
  conflicts,
  suggestions,
  onPickAlternative,
  onOpenCalendar,
}: ScheduleConflictPanelProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
          <div>
            <p className="font-bold text-red-700 dark:text-red-300">
              Schedule conflict on {conflicts.length}{" "}
              {conflicts.length === 1 ? "date" : "dates"}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              The venue is already booked at these times. Pick another date or
              change the time.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#00679E] shadow-sm hover:bg-gray-50 dark:bg-gray-900 dark:text-[#38BDF8]"
        >
          <FiCalendar size={14} />
          View venue calendar
        </button>
      </div>

      {conflicts.map((c) => {
        const suggestion = suggestions.find((s) => s.conflict_date === c.date);

        return (
          <div
            key={c.date}
            className="space-y-3 rounded-xl bg-white p-4 dark:bg-gray-900"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatShortDate(c.date)}
              </p>
              <p className="text-xs text-gray-500">
                You requested {c.requested.time_start_label} -{" "}
                {c.requested.time_end_label}
              </p>
            </div>

            <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
              {c.conflicts_with.map((w) => (
                <li key={`${w.event_booking_id}-${w.time_start_label}`}>
                  Booked: <strong>{w.purpose}</strong> · {w.time_start_label} -{" "}
                  {w.time_end_label} · {w.status}
                  {w.office ? ` · ${w.office}` : ""}
                </li>
              ))}
            </ul>

            {suggestion && suggestion.free_slots_that_day.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-500">
                  Free times that day
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.free_slots_that_day.map((slot) => (
                    <span
                      key={slot.time_start}
                      className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    >
                      {slot.time_start_label} - {slot.time_end_label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {suggestion && suggestion.alternative_dates.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-500">
                  Nearest dates free at {c.requested.time_start_label} -{" "}
                  {c.requested.time_end_label} (click to use)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.alternative_dates.map((alt) => (
                    <button
                      key={alt.date}
                      type="button"
                      onClick={() => onPickAlternative(c.date, alt.date)}
                      className="rounded-lg border border-[#0095D9]/40 bg-[#0095D9]/10 px-2.5 py-1 text-xs font-semibold text-[#00679E] transition hover:bg-[#0095D9]/20 dark:text-[#38BDF8]"
                    >
                      {formatShortDate(alt.date)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No fully free dates found nearby. Check the venue calendar.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleConflictPanel;
