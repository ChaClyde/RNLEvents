import { joinTime, splitTime } from "../../../interfaces/EventBookingSchedule";

interface TimeSelectProps {
  value: string; // "HH:MM" 24h
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const selectClass = (invalid?: boolean) =>
  `rounded-xl border bg-gray-50 px-2.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 disabled:opacity-60 dark:bg-gray-800 dark:text-white ${
    invalid ? "border-red-400" : "border-gray-200 dark:border-gray-700"
  }`;

const TimeSelect = ({
  value,
  onChange,
  disabled,
  invalid,
}: TimeSelectProps) => {
  const { hour, minute, period } = splitTime(value);

  // Keep odd minutes (e.g. :07 saved earlier) selectable
  const minutes = MINUTES.includes(minute)
    ? MINUTES
    : [...MINUTES, minute].sort((a, b) => a - b);

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hour}
        disabled={disabled}
        onChange={(e) =>
          onChange(joinTime(Number(e.target.value), minute, period))
        }
        className={selectClass(invalid)}
        aria-label="Hour"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <span className="text-gray-400">:</span>

      <select
        value={minute}
        disabled={disabled}
        onChange={(e) =>
          onChange(joinTime(hour, Number(e.target.value), period))
        }
        className={selectClass(invalid)}
        aria-label="Minute"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>

      <select
        value={period}
        disabled={disabled}
        onChange={(e) =>
          onChange(joinTime(hour, minute, e.target.value as "AM" | "PM"))
        }
        className={selectClass(invalid)}
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default TimeSelect;
