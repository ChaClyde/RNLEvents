import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import VenueMaintenanceService from "../../../services/VenueMaintenanceService";
import type { VenueMaintenanceRecord } from "../../../interfaces/VenueColumns";
import { getToday } from "../../../interfaces/EventBookingHelpers";

interface VenueMaintenanceSectionProps {
  venueId: number;
  onChanged?: () => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const VenueMaintenanceSection = ({
  venueId,
  onChanged,
}: VenueMaintenanceSectionProps) => {
  const [records, setRecords] = useState<VenueMaintenanceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await VenueMaintenanceService.loadMaintenance(venueId);
    setRecords(response.data.data ?? []);
  }, [venueId]);

  useEffect(() => {
    void load().catch(() => setError("Unable to load scheduled maintenance."));
  }, [load]);

  const reset = () => {
    setReason("");
    setNotes("");
    setDateStart("");
    setDateEnd("");
    setOpen(false);
  };

  const save = async () => {
    setError("");
    setSaving(true);

    try {
      await VenueMaintenanceService.storeMaintenance({
        venue_id: venueId,
        reason: reason.trim(),
        notes: notes.trim() || null,
        date_start: dateStart,
        date_end: dateEnd,
      });
      reset();
      await load();
      onChanged?.();
    } catch {
      setError("Could not schedule maintenance. Check the dates and reason.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (
    record: VenueMaintenanceRecord,
    status: VenueMaintenanceRecord["status"],
  ) => {
    setError("");

    try {
      await VenueMaintenanceService.updateStatus(record.maintenance_id, status);
      await load();
      onChanged?.();
    } catch {
      setError("Could not update this maintenance record.");
    }
  };

  const remove = async (record: VenueMaintenanceRecord) => {
    setError("");

    try {
      await VenueMaintenanceService.destroyMaintenance(record.maintenance_id);
      await load();
      onChanged?.();
    } catch {
      setError("Could not remove this maintenance record.");
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Scheduled maintenance
          </h3>
          <p className="text-xs text-gray-500">
            The venue cannot be booked on these dates. The schedule appears on the venue details and the event booking venue card.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-[#0095D9]/30 px-3 py-2 text-xs font-semibold text-[#00679E]"
          >
            <FiPlus size={14} />
            Schedule
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {records.length === 0 ? (
        <p className="text-sm text-gray-500">No maintenance is scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => (
            <li
              key={record.maintenance_id}
              className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {record.reason}{" "}
                    <span className="text-xs font-normal uppercase text-gray-400">
                      {record.phase ?? record.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {record.range_label ??
                      `${record.date_start.slice(0, 10)} to ${record.date_end.slice(0, 10)}`}
                    {record.notes ? ` · ${record.notes}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {record.status === "scheduled" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void setStatus(record, "completed")}
                        className="text-xs font-semibold text-[#00679E]"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => void setStatus(record, "cancelled")}
                        className="text-xs font-semibold text-gray-500"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(record)}
                    className="text-red-500"
                    aria-label="Remove maintenance"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Reason *</label>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={inputClass}
              maxLength={150}
            />
          </div>
          <div>
            <label className={labelClass}>Start date *</label>
            <input
              type="date"
              min={getToday()}
              value={dateStart}
              onChange={(event) => setDateStart(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End date *</label>
            <input
              type="date"
              min={dateStart || getToday()}
              value={dateEnd}
              onChange={(event) => setDateEnd(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={saving || !reason.trim() || !dateStart || !dateEnd}
              onClick={() => void save()}
              className="rounded-xl bg-[#00679E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save schedule"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default VenueMaintenanceSection;
