import { useCallback, useEffect, useState } from "react";
import type { EventBooking } from "../../interfaces/EventBookingFlow";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";
import ApprovalProgress, { EVENT_STAGES } from "./components/ApprovalProgress";
import {
  apiErrorMessage,
  eventApprovalService,
} from "../../services/EventApprovalService";
import EventBookingService from "../../services/EventBookingService";
import SignatureService from "../../services/SignatureService";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { RoleSlug } from "../../permissions";
import { isFinancialTurn } from "../../interfaces/EventBookingHelpers";
import FeeCalculationModal from "./components/FeeCalculationModal";

const stageLabel = (key: string) =>
  EVENT_STAGES.find((s) => s.key === key)?.label ?? key;

const formatDates = (b: EventBooking) =>
  b.date_start === b.date_end
    ? b.date_start
    : `${b.date_start} to ${b.date_end} (${b.number_of_days} days)`;

const statusStyle: Record<string, string> = {
  pending: "bg-accent text-on-accent",
  approved: "bg-primary text-white",
  rejected: "bg-danger text-white",
  cancelled: "bg-line text-muted",
};

export default function EventApprovalMainPage() {
  const { canAny } = usePermissions();
  const { user } = useAuth();

  // Approvers see the queue waiting on them; requesters track their own requests.
  const isApprover = canAny([Permission.EVENT_APPROVALS_APPROVE]);

  const [items, setItems] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<EventBooking | null>(null);
  const selectedIsMyTurn =
    selected !== null && isFinancialTurn(user?.role?.slug, selected);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [needsSignature, setNeedsSignature] = useState(false);
  const [calculationBooking, setCalculationBooking] = useState<EventBooking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(
        isApprover
          ? await eventApprovalService.awaitingMyApproval()
          : await eventApprovalService.myRequests(),
      );
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isApprover) return;
    void SignatureService.show()
      .then((response) => setNeedsSignature(!response.data.data.has_signature))
      .catch(() => setNeedsSignature(false));
  }, [isApprover]);

  const openRequest = (booking: EventBooking) => {
    setSelected(booking);
    setRemarks("");
    setFormError(null);
    setSlipError(null);
    setLetterError(null);
  };

  const openSlip = async (mode: "preview" | "download" | "print") => {
    if (!selected) return;
    setSlipError(null);

    try {
      const response =
        mode === "download"
          ? await EventBookingService.downloadBookingSlip(selected.event_booking_id)
          : await EventBookingService.previewBookingSlip(selected.event_booking_id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `FCU-Event-Booking-Slip-${selected.event_booking_id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const popup = window.open(url);
      if (mode === "print") {
        popup?.addEventListener("load", () => popup.print());
      }
    } catch {
      setSlipError("Unable to open the booking slip.");
    }
  };

  const openLetter = async (mode: "preview" | "download" | "print") => {
    const letter = selected?.attachments?.[0];
    if (!selected || !letter) return;
    setLetterError(null);

    try {
      const response =
        mode === "download"
          ? await EventBookingService.downloadAttachment(
              selected.event_booking_id,
              letter.attachment_id,
            )
          : await EventBookingService.previewAttachment(
              selected.event_booking_id,
              letter.attachment_id,
            );
      const blob = new Blob([response.data], {
        type: letter.mime_type || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = letter.original_filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const popup = window.open(url);
      if (mode === "print") {
        popup?.addEventListener("load", () => popup.print());
      }
    } catch {
      setLetterError("Unable to open the letter of request.");
    }
  };

  const closeRequest = () => {
    if (submitting) return;
    setSelected(null);
  };

  const decide = async (action: "approved" | "rejected") => {
    if (!selected) return;

    if (action === "rejected" && remarks.trim() === "") {
      setFormError("Please enter a remark explaining the rejection.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result =
        action === "approved"
          ? await eventApprovalService.approve(
              selected.event_booking_id,
              remarks,
            )
          : await eventApprovalService.reject(
              selected.event_booking_id,
              remarks,
            );

      setNotice(result.message);
      setSelected(null);
      await load();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {isApprover ? "My Event Requests" : "My Event Booking Requests"}
        </h1>
        <p className="text-sm text-muted">
          {isApprover
            ? "Event booking requests waiting for your approval."
            : "Track where your event booking requests are in the approval process."}
        </p>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-line bg-primary-soft px-4 py-2 text-sm text-primary">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-line bg-danger-soft px-4 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-page text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Venue</th>
              <th className="px-4 py-3">Office</th>
              {isApprover && <th className="px-4 py-3">Requested by</th>}
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">{isApprover ? "Stage" : "Status"}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Loading requests...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && !loadError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {isApprover
                    ? "Nothing is waiting for your approval."
                    : "You have not submitted any event booking requests."}
                </td>
              </tr>
            )}

            {items.map((b) => (
              <tr
                key={b.event_booking_id}
                className="border-b border-line last:border-0 hover:bg-primary-soft/50"
              >
                <td className="px-4 py-3 font-medium text-ink">{b.purpose}</td>
                <td className="px-4 py-3 text-muted">
                  {b.venue?.venue ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {b.office?.office_code ?? "-"}
                </td>
                {isApprover && (
                  <td className="px-4 py-3 text-muted">{b.requested_by}</td>
                )}
                <td className="px-4 py-3 text-muted">{formatDates(b)}</td>
                <td className="px-4 py-3">
                  {isApprover ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent">
                      {stageLabel(b.approval_stage)}
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                        statusStyle[b.status] ?? "bg-line text-muted"
                      }`}
                    >
                      {b.status === "pending"
                        ? `Waiting: ${stageLabel(b.approval_stage)}`
                        : b.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setCalculationBooking(b)}
                    className="mr-2 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-page"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openRequest(b)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    {isApprover ? "Review" : "Track"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={closeRequest}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">
              {selected.purpose}
            </h2>
            <p className="mb-4 text-sm text-muted">
              Request #{selected.event_booking_id}
            </p>

            <ApprovalProgress booking={selected} />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openSlip("preview")}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Preview slip
              </button>
              <button
                type="button"
                onClick={() => void openSlip("download")}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => void openSlip("print")}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Print slip
              </button>
            </div>
            {slipError && (
              <p className="mt-2 text-sm text-danger">{slipError}</p>
            )}

            <div className="mt-4 rounded-lg border border-line p-3">
              <h3 className="text-xs font-semibold uppercase text-muted">
                Letter of request
              </h3>
              {selected.attachments?.[0] ? (
                <>
                  <p className="mt-1 text-sm text-ink">
                    {selected.attachments[0].original_filename}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openLetter("preview")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Preview letter
                    </button>
                    <button
                      type="button"
                      onClick={() => void openLetter("download")}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Download letter
                    </button>
                    <button
                      type="button"
                      onClick={() => void openLetter("print")}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Print letter
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">No letter was attached.</p>
              )}
              {letterError && (
                <p className="mt-2 text-sm text-danger">{letterError}</p>
              )}
            </div>

            {!isApprover &&
              selected.status === "rejected" &&
              selected.approval_remarks && (
                <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  Rejected: {selected.approval_remarks}
                </p>
              )}

            {!isApprover &&
              selected.status === "cancelled" &&
              selected.cancellation_reason && (
                <p className="mt-4 rounded-lg bg-page px-3 py-2 text-sm text-muted">
                  Cancelled: {selected.cancellation_reason}
                </p>
              )}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Venue</dt>
                <dd className="text-ink">{selected.venue?.venue ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Office</dt>
                <dd className="text-ink">
                  {selected.office?.office_name ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Schedule</dt>
                <dd className="text-ink">{formatDates(selected)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Time</dt>
                <dd className="text-ink">
                  {selected.time_start_label} - {selected.time_end_label}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Requested by</dt>
                <dd className="text-ink">{selected.requested_by}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Contact</dt>
                <dd className="text-ink">
                  {selected.email} / {selected.tel_number}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Expected attendees</dt>
                <dd className="text-ink">{selected.expected_attendees}</dd>
              </div>
              {selected.description && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted">Description</dt>
                  <dd className="text-ink">{selected.description}</dd>
                </div>
              )}
            </dl>

            {selected.approvals && selected.approvals.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted">
                  Decisions so far
                </h3>
                <ul className="space-y-1 text-sm">
                  {selected.approvals.map((a) => (
                    <li key={a.event_booking_approval_id} className="text-ink">
                      <span className="font-medium">
                        {a.decision_slot === "business_manager"
                          ? "Business Manager"
                          : a.decision_slot === "vp_finance"
                            ? "VP-Finance"
                            : stageLabel(a.approval_stage)}
                      </span>{" "}
                      ({a.approver?.full_name ?? "Unknown"}) {a.action}
                      {a.remarks ? `: ${a.remarks}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isApprover && selectedIsMyTurn && needsSignature && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Save your e-signature in <Link to="/profile" className="font-semibold underline">My Profile</Link> before approving. Rejection does not require a signature.
              </p>
            )}

            {isApprover && selectedIsMyTurn && (
              <label className="mt-5 block text-sm font-medium text-ink">
                Remarks{" "}
                <span className="font-normal text-muted">
                  (required when rejecting)
                </span>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            )}

            {selected.fee_snapshot && (
              <div className="mt-4 rounded-lg border border-line p-3 text-sm">
                <h3 className="text-xs font-semibold uppercase text-muted">
                  Expense breakdown
                </h3>
                <p className="mt-1 text-ink">
                  Total {selected.fee_snapshot.total_amount ?? "Not recorded"}
                  {selected.fee_snapshot.calculation_confirmed_at
                    ? " · Calculation confirmed"
                    : ""}
                </p>
                {(selected.fee_snapshot.lines ?? []).map((line, index) => (
                  <p key={`${line.label}-${index}`} className="text-muted">
                    {line.label}: {line.quantity} {line.unit} at {line.unit_amount} = {line.line_amount}
                  </p>
                ))}
              </div>
            )}

            {selected.approval_stage === "event_approval" &&
              selected.fee_snapshot &&
              !selected.fee_snapshot.calculation_confirmed_at &&
              selectedIsMyTurn && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Open View and confirm the venue calculation before approving.
                </p>
              )}

            {formError && (
              <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeRequest}
                disabled={submitting}
                className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-page"
              >
                Close
              </button>

              {isApprover && selectedIsMyTurn && (
                <>
                  <button
                    onClick={() => void decide("rejected")}
                    disabled={submitting}
                    className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => void decide("approved")}
                    disabled={
                      submitting ||
                      needsSignature ||
                      (selected.approval_stage === "event_approval" &&
                        Boolean(selected.fee_snapshot) &&
                        !selected.fee_snapshot?.calculation_confirmed_at)
                    }
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Approve"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {calculationBooking && (
        <FeeCalculationModal
          booking={calculationBooking}
          canEdit={
            user?.role?.slug === RoleSlug.ADMIN_APPROVALS &&
            calculationBooking.status === "pending" &&
            calculationBooking.approval_stage === "event_approval"
          }
          onClose={() => setCalculationBooking(null)}
          onSaved={(updated) => {
            setCalculationBooking(updated);
            setSelected((current) =>
              current?.event_booking_id === updated.event_booking_id ? updated : current,
            );
            setItems((current) =>
              current.map((item) =>
                item.event_booking_id === updated.event_booking_id ? updated : item,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
