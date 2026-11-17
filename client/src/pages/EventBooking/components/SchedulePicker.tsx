import { useState } from "react";
import {
  FiAlertCircle,
  FiEdit2,
  FiPlus,
  FiRotateCcw,
  FiX,
} from "react-icons/fi";

import TimeSelect from "./TimeSelect";
import {
  formatShortDate,
  to12h,
  WEEKDAY_SHORT,
  type Occurrence,
  type ScheduleState,
} from "../../../interfaces/EventBookingSchedule";
import type { ScheduleType } from "../../../interfaces/EventBookingColumns";

interface SchedulePickerProps {
  value: ScheduleState;
  onChange: (next: ScheduleState) => void;
  occurrences: Occurrence[];
  conflictDates: Set<string>;
  errors: Record<string, string>;
  extraMessages?: string[];
  today: string;
  disabled?: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const Err = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <FiAlertCircle size={13} />
      {message}
    </p>
  ) : null;

const TYPES: { id: ScheduleType; title: string; hint: string }[] = [
  { id: "range", title: "Every day", hint: "Continuous, e.g. Mon-Fri" },
  { id: "weekly", title: "Selected weekdays", hint: "e.g. every Wednesday" },
  { id: "custom", title: "Pick dates", hint: "Hand-picked dates" },
];

const SchedulePicker = ({
  value,
  onChange,
  occurrences,
  conflictDates,
  errors,
  extraMessages = [],
  today,
  disabled,
}: SchedulePickerProps) => {
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");

  const set = (patch: Partial<ScheduleState>) =>
    onChange({ ...value, ...patch });

  const toggleWeekday = (day: number) =>
    set({
      weekdays: value.weekdays.includes(day)
        ? value.weekdays.filter((d) => d !== day)
        : [...value.weekdays, day],
    });

  // Editing a row's time: matching the default removes the override
  const updateRowTime = (
    date: string,
    patch: Partial<{ time_start: string; time_end: string }>,
  ) => {
    const row = occurrences.find((o) => o.date === date);
    if (!row) return;

    const next = {
      time_start: row.time_start,
      time_end: row.time_end,
      ...patch,
    };

    const overrides = { ...value.overrides };

    if (
      next.time_start === value.time_start &&
      next.time_end === value.time_end
    ) {
      delete overrides[date];
    } else {
      overrides[date] = next;
    }

    set({ overrides });
  };

  const resetRow = (date: string) => {
    const overrides = { ...value.overrides };
    delete overrides[date];
    set({ overrides });
  };

  const removeRow = (date: string) => {
    const overrides = { ...value.overrides };
    delete overrides[date];

    if (value.type === "custom") {
      set({
        customDates: value.customDates.filter((d) => d !== date),
        overrides,
      });
    } else {
      set({ excluded: [...value.excluded, date], overrides });
    }
  };

  const addCustomDate = () => {
    if (!newDate || newDate < today || value.customDates.includes(newDate)) {
      return;
    }
    set({ customDates: [...value.customDates, newDate] });
    setNewDate("");
  };

  return (
    <div className="space-y-5">
      {/* TYPE */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => set({ type: t.id })}
            className={`rounded-xl border p-3 text-left transition ${
              value.type === t.id
                ? "border-[#0095D9] bg-[#0095D9]/10"
                : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {t.title}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t.hint}
            </p>
          </button>
        ))}
      </div>

      {/* DATES */}
      {value.type !== "custom" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={value.date_start}
              onChange={(e) =>
                set({ date_start: e.target.value, excluded: [] })
              }
              disabled={disabled}
              className={inputClass}
            />
            <Err message={errors.date_start} />
          </div>

          <div>
            <label className={labelClass}>
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={value.date_start || today}
              value={value.date_end}
              onChange={(e) => set({ date_end: e.target.value, excluded: [] })}
              disabled={disabled}
              className={inputClass}
            />
            <Err message={errors.date_end} />
          </div>
        </div>
      ) : (
        <div>
          <label className={labelClass}>Add a date</label>
          <div className="flex gap-2">
            <input
              type="date"
              min={today}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={disabled}
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCustomDate}
              disabled={disabled || !newDate}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#003B5C] px-4 text-sm font-semibold text-white transition hover:bg-[#00679E] disabled:opacity-50"
            >
              <FiPlus /> Add
            </button>
          </div>
        </div>
      )}

      {/* WEEKDAYS */}
      {value.type === "weekly" && (
        <div>
          <label className={labelClass}>
            Days of the week <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((name, day) => (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => toggleWeekday(day)}
                className={`h-10 w-14 rounded-xl border text-sm font-semibold transition ${
                  value.weekdays.includes(day)
                    ? "border-[#0095D9] bg-[#0095D9] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <Err message={errors.weekdays} />
        </div>
      )}

      {/* DEFAULT TIME */}
      <div>
        <p className={labelClass}>
          Time on each date <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <TimeSelect
            value={value.time_start}
            onChange={(time_start) => set({ time_start })}
            disabled={disabled}
          />
          <span className="text-sm text-gray-400">to</span>
          <TimeSelect
            value={value.time_end}
            onChange={(time_end) => set({ time_end })}
            disabled={disabled}
            invalid={Boolean(errors.time_end)}
          />
        </div>
        <Err message={errors.time_end} />
        <p className="mt-1.5 text-xs text-gray-400">
          Need a different time on one date (e.g. the last day runs longer)? Use
          Edit time on that date below.
        </p>
      </div>

      <Err message={errors.schedule} />

      {extraMessages.length > 0 && (
        <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {extraMessages.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}

      {/* PREVIEW */}
      {occurrences.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Booked dates
            </p>
            <span className="rounded-full bg-[#0095D9]/10 px-3 py-1 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
              {occurrences.length} {occurrences.length === 1 ? "date" : "dates"}
            </span>
          </div>

          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
            {occurrences.map((o) => {
              const isOverride = Boolean(value.overrides[o.date]);
              const editing = editingDate === o.date;
              const conflict = conflictDates.has(o.date);

              return (
                <li
                  key={o.date}
                  className={`p-3 text-sm ${
                    conflict ? "bg-red-50 dark:bg-red-950/20" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {formatShortDate(o.date)}
                        {conflict && (
                          <span className="ml-2 text-xs font-semibold text-red-600">
                            Conflict
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-xs ${
                          isOverride
                            ? "font-semibold text-[#00679E] dark:text-[#38BDF8]"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {to12h(o.time_start)} - {to12h(o.time_end)}
                        {isOverride && " (custom time)"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isOverride && (
                        <button
                          type="button"
                          onClick={() => resetRow(o.date)}
                          disabled={disabled}
                          title="Use the default time"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <FiRotateCcw size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingDate(editing ? null : o.date)}
                        disabled={disabled}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#00679E] hover:bg-[#0095D9]/10 dark:text-[#38BDF8]"
                      >
                        <FiEdit2 size={13} />
                        {editing ? "Done" : "Edit time"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(o.date)}
                        disabled={disabled}
                        title="Remove this date"
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <FiX size={15} />
                      </button>
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <TimeSelect
                        value={o.time_start}
                        onChange={(time_start) =>
                          updateRowTime(o.date, { time_start })
                        }
                      />
                      <span className="text-gray-400">to</span>
                      <TimeSelect
                        value={o.time_end}
                        onChange={(time_end) =>
                          updateRowTime(o.date, { time_end })
                        }
                        invalid={o.time_end <= o.time_start}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {value.type !== "custom" && value.excluded.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Removed:</span>
              {value.excluded.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    set({ excluded: value.excluded.filter((x) => x !== d) })
                  }
                  className="rounded-lg bg-gray-100 px-2 py-1 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  title="Restore this date"
                >
                  {formatShortDate(d)} ↺
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchedulePicker;
