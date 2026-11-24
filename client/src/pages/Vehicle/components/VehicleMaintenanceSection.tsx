import { useCallback, useEffect, useState, type FC } from "react";
import { CalendarClock, Plus, Trash2, Wrench } from "lucide-react";

import VehicleMaintenanceService from "../../../services/VehicleMaintenanceService";
import type {
  MaintenanceStatus,
  VehicleMaintenanceColumns,
} from "../../../interfaces/VehicleMaintenanceColumns";
import {
  formatDateRange,
  getMaintenancePhaseLabel,
  getMaintenancePhaseStyle,
  getToday,
  parseMaintenanceError,
} from "../../../interfaces/VehicleHelpers";

export interface MaintenanceDraft {
  reason: string;
  notes: string;
  date_start: string;
  date_end: string;
}

interface Props {
  vehicleId: number | null; // null = vehicle not saved yet (Add form)
  drafts?: MaintenanceDraft[];
  onDraftsChange?: (drafts: MaintenanceDraft[]) => void;
  onChanged?: () => void; // called after a saved record changes (Edit form)
}

const controlClass =
  "w-full rounded-xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#0095D9]";
const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";
const actionClass =
  "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40";

const emptyDraft: MaintenanceDraft = {
  reason: "",
  notes: "",
  date_start: "",
  date_end: "",
};

const VehicleMaintenanceSection: FC<Props> = ({
  vehicleId,
  drafts = [],
  onDraftsChange,
  onChanged,
}) => {
  const [records, setRecords] = useState<VehicleMaintenanceColumns[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MaintenanceDraft>(emptyDraft);
  const [error, setError] = useState("");

  const today = getToday();

  const load = useCallback(async () => {
    if (vehicleId === null) return;
    try {
      setLoading(true);
      const res = await VehicleMaintenanceService.loadMaintenance({
        vehicle_id: vehicleId,
      });
      setRecords(res.data.data);
    } catch (e) {
      setError(parseMaintenanceError(e, "Failed to load maintenance.").message);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    setShowForm(false);
    setForm(emptyDraft);
    setError("");
    setRecords([]);
    load();
  }, [load]);

  const set = (field: keyof MaintenanceDraft, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAdd = async () => {
    setError("");

    if (!form.reason.trim()) return setError("Reason is required.");
    if (!form.date_start || !form.date_end)
      return setError("Please choose the first and last day.");
    if (form.date_start < today)
      return setError("The first day cannot be in the past.");
    if (form.date_end < form.date_start)
      return setError("The last day cannot be before the first day.");

    const draft = {
      reason: form.reason.trim(),
      notes: form.notes.trim(),
      date_start: form.date_start,
      date_end: form.date_end,
    };

    // Add form: just keep it until the vehicle is saved
    if (vehicleId === null) {
      onDraftsChange?.([...drafts, draft]);
      setForm(emptyDraft);
      setShowForm(false);
      return;
    }

    try {
      setSaving(true);
      await VehicleMaintenanceService.storeMaintenance({
        vehicle_id: vehicleId,
        reason: draft.reason,
        notes: draft.notes || null,
        date_start: draft.date_start,
        date_end: draft.date_end,
      });
      setForm(emptyDraft);
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (e) {
      const { message, fieldErrors } = parseMaintenanceError(
        e,
        "Failed to schedule maintenance.",
      );
      setError(
        fieldErrors.date_start?.[0] ??
          fieldErrors.date_end?.[0] ??
          fieldErrors.reason?.[0] ??
          message,
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (
    record: VehicleMaintenanceColumns,
    status: MaintenanceStatus,
  ) => {
    try {
      setBusyId(record.maintenance_id);
      setError("");
      await VehicleMaintenanceService.updateMaintenanceStatus(
        record.maintenance_id,
        status,
      );
      await load();
      onChanged?.();
    } catch (e) {
      const { message, fieldErrors } = parseMaintenanceError(
        e,
        "Failed to update the status.",
      );
      setError(fieldErrors.date_start?.[0] ?? message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (record: VehicleMaintenanceColumns) => {
    if (!window.confirm("Delete this maintenance record?")) return;
    try {
      setBusyId(record.maintenance_id);
      setError("");
      await VehicleMaintenanceService.destroyMaintenance(record.maintenance_id);
      await load();
      onChanged?.();
    } catch (e) {
      setError(parseMaintenanceError(e, "Failed to delete.").message);
    } finally {
      setBusyId(null);
    }
  };

  const isDraftMode = vehicleId === null;
  const isEmpty = isDraftMode ? drafts.length === 0 : records.length === 0;

  return (
    <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-[#0095D9]" />
          <h2 className="font-semibold text-[#003B5C]">Maintenance</h2>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-2 text-xs font-medium text-[#0095D9] hover:bg-[#0095D9]/20"
          >
            <Plus size={14} />
            Schedule Maintenance
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-gray-400">
        Days the vehicle is out of service. It can't be booked on these dates.
        {isDraftMode && " These are saved together with the vehicle."}
      </p>

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-4">
          <div>
            <label className={labelClass}>Reason (e.g. Oil change)</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              className={controlClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>First day out of service</label>
              <input
                type="date"
                min={today}
                value={form.date_start}
                onChange={(e) => set("date_start", e.target.value)}
                className={controlClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last day out of service</label>
              <input
                type="date"
                min={form.date_start || today}
                value={form.date_end}
                onChange={(e) => set("date_end", e.target.value)}
                className={controlClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={controlClass}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setForm(emptyDraft);
                setError("");
              }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleAdd}
              className="rounded-xl bg-[#0095D9] px-4 py-2 text-sm font-medium text-white hover:bg-[#003B5C] disabled:opacity-60"
            >
              {saving ? "Saving..." : isDraftMode ? "Add to list" : "Schedule"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
      ) : isEmpty ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
          No maintenance scheduled.
        </p>
      ) : isDraftMode ? (
        <ul className="space-y-2">
          {drafts.map((d, i) => (
            <li
              key={`${d.date_start}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{d.reason}</p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CalendarClock size={12} />
                  {formatDateRange(d.date_start, d.date_end)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onDraftsChange?.(drafts.filter((_, idx) => idx !== i))
                }
                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => {
            const busy = busyId === r.maintenance_id;
            return (
              <li
                key={r.maintenance_id}
                className="rounded-xl border border-gray-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {r.reason}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarClock size={12} />
                      {formatDateRange(r.date_start, r.date_end)}
                    </p>
                    {r.notes && (
                      <p className="mt-0.5 text-xs text-gray-400">{r.notes}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getMaintenancePhaseStyle(
                      r.phase,
                    )}`}
                  >
                    {getMaintenancePhaseLabel(r.phase)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {r.status === "scheduled" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(r, "completed")}
                        className={`${actionClass} border-green-200 bg-green-50 text-green-700 hover:bg-green-100`}
                      >
                        Mark done
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(r, "cancelled")}
                        className={`${actionClass} border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100`}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(r, "scheduled")}
                      className={`${actionClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(r)}
                    className={`${actionClass} border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default VehicleMaintenanceSection;
