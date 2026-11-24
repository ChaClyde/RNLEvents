import { useEffect, useState } from "react";
import type { EventBooking } from "../../../interfaces/EventBookingFlow";
import EventBookingService from "../../../services/EventBookingService";
import { apiErrorMessage } from "../../../services/EventApprovalService";

type DraftLine = {
  event_booking_fee_line_id: number;
  label: string;
  line_type: string;
  schedule_date?: string | null;
  unit: string;
  quantity: string;
  unit_amount: string;
};

type RateItem = { 
  name: string;
  rate: string;
  unit: string;
  details: string | null;
};

function clockMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = value.trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatHours(hours: number): string {
  return (Math.round(hours * 100) / 100).toFixed(2);
}

function isWeekend(date: string): boolean {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  const day = parsed.getDay();
  return day === 0 || day === 6;
}

type TimeSpan = {
  date: string;
  start: string;
  end: string;
  startLabel?: string | null;
  endLabel?: string | null;
};

function spanFor(line: DraftLine, booking: EventBooking): TimeSpan | null {
  const schedules = booking.schedules ?? [];
  const match = line.schedule_date
    ? schedules.find(
        (row) => row.schedule_date.slice(0, 10) === line.schedule_date?.slice(0, 10),
      )
    : schedules[0];

  if (match?.time_start && match.time_end) {
    return {
      date: match.schedule_date,
      start: match.time_start,
      end: match.time_end,
      startLabel: match.time_start_label,
      endLabel: match.time_end_label,
    };
  }

  if (booking.time_start && booking.time_end) {
    return {
      date: line.schedule_date ?? booking.date_start,
      start: booking.time_start,
      end: booking.time_end,
      startLabel: booking.time_start_label,
      endLabel: booking.time_end_label,
    };
  }

  return null;
}

function splitHours(span: TimeSpan): { regular: number; overtime: number; total: number } | null {
  const from = clockMinutes(span.start);
  const to = clockMinutes(span.end);
  if (from == null || to == null || to <= from) return null;

  const total = (to - from) / 60;
  if (isWeekend(span.date)) {
    return { regular: 0, overtime: total, total };
  }

  const inside = Math.max(0, Math.min(to, 17 * 60) - Math.max(from, 8 * 60)) / 60;
  return { regular: inside, overtime: total - inside, total };
}

function hoursFromSchedule(line: DraftLine, booking: EventBooking): string | null {
  if (line.unit !== "hour") return null;

  const span = spanFor(line, booking);
  if (!span) return null;
  const split = splitHours(span);
  if (!split) return null;

  if (line.line_type === "overtime") return formatHours(split.overtime);
  if (line.line_type === "venue") return formatHours(split.regular);

  const stored = Number(line.quantity);
  if (split.total > 0 && Number.isFinite(stored) && stored > split.total + 0.001) {
    const count = Math.round(stored / split.total);
    if (count > 1 && Math.abs(count * split.total - stored) < 0.05) {
      return formatHours(split.total * count);
    }
  }

  return formatHours(split.total);
}

function draftsFrom(booking: EventBooking): DraftLine[] {
  return (booking.fee_snapshot?.lines ?? []).map((line) => {
    const draft: DraftLine = {
      event_booking_fee_line_id: line.event_booking_fee_line_id ?? 0,
      label: line.label,
      line_type: line.line_type,
      schedule_date: line.schedule_date,
      unit: line.unit,
      quantity: String(line.quantity),
      unit_amount: String(line.unit_amount),
    };
    draft.quantity = hoursFromSchedule(draft, booking) ?? draft.quantity;
    return draft;
  });
}

function timeCaption(line: DraftLine, booking: EventBooking): string | null {
  const span = spanFor(line, booking);
  if (!span) return null;
  const start = span.startLabel || span.start.slice(0, 5);
  const end = span.endLabel || span.end.slice(0, 5);
  return `${start} – ${end}`;
}

export default function FeeCalculationModal({
  booking,
  canEdit,
  onClose,
  onSaved,
}: {
  booking: EventBooking;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (booking: EventBooking) => void;
}) {
  const [lines, setLines] = useState<DraftLine[]>(() => draftsFrom(booking));
  const [rates, setRates] = useState<RateItem[]>([]);
  const [rateNote, setRateNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void EventBookingService.facilityRates()
      .then((response) => {
        setRates(response.data.data.items);
        setRateNote(response.data.data.evening_note);
      })
      .catch(() => setRateNote(""));
  }, []);

  const total = lines.reduce((sum, line) => {
    const amount = Number(line.quantity) * Number(line.unit_amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const save = async (confirm: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const response = await EventBookingService.updateFeeCalculation(
        booking.event_booking_id,
        {
          confirm,
          lines: lines.map((line) => ({
            event_booking_fee_line_id: line.event_booking_fee_line_id,
            quantity: Number(line.quantity),
            unit_amount: Number(line.unit_amount),
          })),
        },
      );
      onSaved(response.data.data as EventBooking);
      if (confirm) onClose();
    } catch (caught) {
      setError(apiErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-surface p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Venue calculation</h2>
        <p className="mb-4 text-sm text-muted">
          {booking.purpose} · Request #{booking.event_booking_id}
        </p>

        {!booking.fee_snapshot && (
          <p className="text-sm text-ink">No fee breakdown is recorded on this booking.</p>
        )}

        {booking.fee_snapshot && lines.length === 0 && (
          <p className="text-sm text-ink">
            {booking.fee_snapshot.calculation_note ??
              "No applicable venue rate was configured when this booking was submitted."}
          </p>
        )}

        {lines.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Charge</th>
                <th className="py-2">Hour(s)</th>
                <th className="py-2">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const hours = Number(line.quantity);
                const amount = hours * Number(line.unit_amount);
                const caption = timeCaption(line, booking);
                return (
                  <tr key={line.event_booking_fee_line_id} className="border-t border-line">
                    <td className="py-2 pr-2 text-ink">
                      {line.label}
                      <div className="text-xs text-muted">
                        {line.schedule_date || "Booking"} · {line.unit}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      {canEdit && line.unit === "hour" ? (
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          value={line.quantity}
                          aria-label={`Hours for ${line.label}`}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, quantity: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          className="w-24 rounded-lg border border-line px-2 py-1"
                        />
                      ) : (
                        <span>{Number.isFinite(hours) ? formatHours(hours) : line.quantity}</span>
                      )}
                      {line.unit === "hour" && caption && (
                        <div className="mt-1 text-xs text-muted">{caption}</div>
                      )}
                      {line.unit !== "hour" && (
                        <div className="mt-1 text-xs text-muted">per {line.unit}</div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {canEdit ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_amount}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, unit_amount: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          className="w-28 rounded-lg border border-line px-2 py-1"
                        />
                      ) : (
                        line.unit_amount
                      )}
                    </td>
                    <td className="py-2 text-right text-ink">
                      {Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="mt-3 font-semibold text-ink">
          Grand total {lines.length > 0 ? total.toFixed(2) : booking.fee_snapshot?.total_amount ?? "Not recorded"}
        </p>
        {booking.fee_snapshot?.calculation_confirmed_at && (
          <p className="text-sm text-primary">Calculation confirmed.</p>
        )}
        {booking.fee_snapshot?.calculation_note && (
          <p className="mt-1 text-sm text-muted">{booking.fee_snapshot.calculation_note}</p>
        )}

        {rates.length > 0 && (
          <div className="mt-5 rounded-lg border border-line p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">
              School facility rates, effective June 2017
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {rates.map((item) => (
                <li key={item.name}>
                  <span className="font-medium">{item.name}</span> — {item.rate} {item.unit}
                  {item.details ? `. ${item.details}` : ""}
                </li>
              ))}
            </ul>
            {rateNote && <p className="mt-2 text-xs text-muted">{rateNote}</p>}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted"
          >
            Close
          </button>
          {canEdit && booking.fee_snapshot && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Confirm calculation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
