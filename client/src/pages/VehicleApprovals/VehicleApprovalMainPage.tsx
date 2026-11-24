import { useCallback, useEffect, useState } from "react";
import type {
  VehicleBooking,
  VehicleBookingDriver,
  VehicleBookingVehicle,
} from "../../interfaces/VehicleBookingColumns";
import {
  canAssignVehicle,
  getVehicleBookingErrorMessage,
  getVehicleStageLabel,
  hasVehicleAssignment,
  isAssignmentStage,
} from "../../interfaces/VehicleBookingHelpers";
import { describeChargeLine } from "../../interfaces/VehicleBookingHelpers";
import { Permission, RoleSlug, ruleFor } from "../../permissions";
import { useAuth } from "../../contexts/AuthContext";
import VehicleBookingService from "../../services/VehicleBookingService";

const VEHICLE_STAGES = [
  "office_head",
  "vehicle_admin",
  "vehicle_approval",
  "oic_budget",
  "super_admin",
] as const;

const statusStyle: Record<string, string> = {
  pending: "bg-accent text-on-accent",
  approved: "bg-primary text-white",
  rejected: "bg-danger text-white",
  cancelled: "bg-line text-muted",
};

function formatTrip(booking: VehicleBooking) {
  return booking.travel_date === booking.expected_return_date
    ? booking.travel_date
    : `${booking.travel_date} to ${booking.expected_return_date}`;
}

export default function VehicleApprovalMainPage() {
  const { user } = useAuth();
  const laterStages =
    ruleFor(user?.role?.slug, Permission.VEHICLE_APPROVALS_APPROVE)?.approvalStages ??
    [];
  const isApprover = laterStages.length > 0;

  const [items, setItems] = useState<VehicleBooking[]>([]);
  const [vehicles, setVehicles] = useState<VehicleBookingVehicle[]>([]);
  const [drivers, setDrivers] = useState<VehicleBookingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<VehicleBooking | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [chargeDraft, setChargeDraft] = useState<
    NonNullable<VehicleBooking["charge_lines"]>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isApprover) {
        setItems(await VehicleBookingService.awaitingMyApproval());
      } else {
        const response = await VehicleBookingService.getAll();
        const rows = Array.isArray(response.data) ? response.data : [];
        setItems(
          rows.filter(
            (row) => row.approval_stage !== "office_head" && row.status !== "approved",
          ),
        );
      }
    } catch (error) {
      setLoadError(getVehicleBookingErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isApprover) return;
    void Promise.allSettled([
      VehicleBookingService.getVehicles(),
      VehicleBookingService.getDrivers(),
    ]).then(([vehicleResult, driverResult]) => {
      if (vehicleResult.status === "fulfilled") {
        const data = vehicleResult.value.data;
        setVehicles(Array.isArray(data) ? data : []);
      }
      if (driverResult.status === "fulfilled") {
        const data = driverResult.value.data;
        setDrivers(Array.isArray(data) ? data : []);
      }
    });
  }, [isApprover]);

  const openRequest = (booking: VehicleBooking) => {
    setSelected(booking);
    setVehicleId(booking.vehicle_id ? String(booking.vehicle_id) : "");
    setDriverId(booking.driver_id ? String(booking.driver_id) : "");
    setRemarks("");
    setFormError(null);
    setChargeDraft(booking.charge_lines ?? []);
  };

  const closeRequest = () => {
    if (submitting) return;
    setSelected(null);
  };

  const assignIfNeeded = async (booking: VehicleBooking) => {
    if (!canAssignVehicle(booking)) return booking;
    if (!vehicleId || !driverId) {
      throw new Error("Assign a vehicle and a driver before approving.");
    }
    if (
      String(booking.vehicle_id ?? "") === vehicleId &&
      String(booking.driver_id ?? "") === driverId
    ) {
      return booking;
    }

    const response = await VehicleBookingService.assign(booking.vehicle_booking_id, {
      vehicle_id: Number(vehicleId),
      driver_id: Number(driverId),
    });
    return response.data;
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
      const current =
        action === "approved" ? await assignIfNeeded(selected) : selected;
      if (
        action === "approved" &&
        isAssignmentStage(current.approval_stage) &&
        !hasVehicleAssignment(current)
      ) {
        setFormError("Assign a vehicle and a driver before approving.");
        return;
      }

      const response = await VehicleBookingService.updateStatus(
        current.vehicle_booking_id,
        {
          status: action,
          approval_remarks: remarks.trim() || null,
        },
      );
      setNotice(response.message);
      setSelected(null);
      await load();
    } catch (error) {
      setFormError(
        error instanceof Error && !("response" in error)
          ? error.message
          : getVehicleBookingErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canEditCharges =
    selected !== null &&
    selected.status === "pending" &&
    ((user?.role?.slug === RoleSlug.VEHICLE_ADMIN &&
      selected.approval_stage === "vehicle_admin") ||
      (user?.role?.slug === RoleSlug.ADMIN_APPROVALS &&
        selected.approval_stage === "vehicle_approval"));
  const chargesConfirmed =
    selected?.calculation_confirmed_stage === selected?.approval_stage;

  const saveCharges = async (confirm: boolean) => {
    if (!selected) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await VehicleBookingService.updateCharges(
        selected.vehicle_booking_id,
        { confirm, lines: chargeDraft },
      );
      setSelected(response.data);
      setChargeDraft(response.data.charge_lines ?? []);
      setNotice(response.message);
    } catch (error) {
      setFormError(getVehicleBookingErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openDocument = async (
    mode: "preview" | "download" | "print",
    kind: "slip" | "letter",
  ) => {
    if (!selected) return;
    const letter = selected.attachments?.[0];
    if (kind === "letter" && !letter) return;

    try {
      const response =
        kind === "slip"
          ? await (mode === "download"
              ? VehicleBookingService.downloadSlip(selected.vehicle_booking_id)
              : VehicleBookingService.previewSlip(selected.vehicle_booking_id))
          : await (mode === "download"
              ? VehicleBookingService.downloadLetter(
                  selected.vehicle_booking_id,
                  letter!.attachment_id,
                )
              : VehicleBookingService.previewLetter(
                  selected.vehicle_booking_id,
                  letter!.attachment_id,
                ));
      const blob = new Blob([response.data], {
        type: kind === "letter" ? letter?.mime_type || "application/pdf" : "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const filename =
        kind === "slip"
          ? `FCU-Vehicle-Booking-Slip-${selected.vehicle_booking_id}.pdf`
          : letter!.original_filename;

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const popup = window.open(url);
      if (mode === "print") popup?.addEventListener("load", () => popup.print());
    } catch {
      setFormError(
        kind === "slip"
          ? "Unable to open the booking slip."
          : "Unable to open the letter of request.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {isApprover ? "Vehicle Approvals" : "My Vehicle Requests"}
        </h1>
        <p className="text-sm text-muted">
          {isApprover
            ? "Vehicle requests waiting for your approval."
            : "Trips move here after the Unit Head approves them. Track the rest of the approval process here."}
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
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Office</th>
              {isApprover && <th className="px-4 py-3">Requested by</th>}
              <th className="px-4 py-3">Travel date</th>
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
                    : "No vehicle request has passed the Unit Head yet."}
                </td>
              </tr>
            )}
            {items.map((booking) => (
              <tr
                key={booking.vehicle_booking_id}
                className="border-b border-line last:border-0 hover:bg-primary-soft/50"
              >
                <td className="px-4 py-3 font-medium text-ink">{booking.purpose}</td>
                <td className="px-4 py-3 text-muted">{booking.destination}</td>
                <td className="px-4 py-3 text-muted">
                  {booking.office?.office_code ?? "-"}
                </td>
                {isApprover && (
                  <td className="px-4 py-3 text-muted">{booking.requested_by}</td>
                )}
                <td className="px-4 py-3 text-muted">{formatTrip(booking)}</td>
                <td className="px-4 py-3">
                  {isApprover ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent">
                      {getVehicleStageLabel(booking.approval_stage)}
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                        statusStyle[booking.status] ?? "bg-line text-muted"
                      }`}
                    >
                      {booking.status === "pending"
                        ? `Waiting: ${getVehicleStageLabel(booking.approval_stage)}`
                        : booking.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openRequest(booking)}
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
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">{selected.purpose}</h2>
            <p className="mb-4 text-sm text-muted">
              Request #{selected.vehicle_booking_id}
            </p>

            <ol className="flex w-full items-start">
              {VEHICLE_STAGES.map((stage, index) => {
                const approved = selected.approvals?.some(
                  (row) => row.approval_stage === stage && row.action === "approved",
                );
                const rejected = selected.approvals?.some(
                  (row) => row.approval_stage === stage && row.action === "rejected",
                );
                const current =
                  selected.status === "pending" && selected.approval_stage === stage;
                const state = rejected
                  ? "rejected"
                  : approved
                    ? "approved"
                    : current
                      ? "current"
                      : "upcoming";
                const circle = {
                  approved: "bg-primary text-white border-primary",
                  rejected: "bg-danger text-white border-danger",
                  current: "bg-accent text-on-accent border-accent",
                  upcoming: "bg-surface text-muted border-line",
                }[state];

                return (
                  <li key={stage} className="relative flex-1 px-1 text-center">
                    {index > 0 && (
                      <span className="absolute left-0 top-3.5 h-0.5 w-1/2 bg-line" />
                    )}
                    <span
                      className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${circle}`}
                    >
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[11px] font-medium text-ink">
                      {getVehicleStageLabel(stage)}
                    </p>
                  </li>
                );
              })}
            </ol>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Destination</dt>
                <dd className="text-ink">{selected.destination}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Office</dt>
                <dd className="text-ink">{selected.office?.office_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Travel</dt>
                <dd className="text-ink">{formatTrip(selected)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Passengers</dt>
                <dd className="text-ink">{selected.passenger_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Vehicle</dt>
                <dd className="text-ink">{selected.vehicle?.vehicle_name ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Driver</dt>
                <dd className="text-ink">{selected.driver?.driver_name ?? "Not assigned"}</dd>
              </div>
              {selected.driver_meal_amount != null && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted">Driver's meal allowance</dt>
                  <dd className="text-ink">
                    ₱{Number(selected.driver_meal_amount).toFixed(2)}
                  </dd>
                </div>
              )}
            </dl>

            {isApprover && canAssignVehicle(selected) && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm text-ink">
                  Vehicle
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.vehicle_name}
                        {vehicle.plate_number ? ` · ${vehicle.plate_number}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-ink">
                  Driver
                  <select
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
                  >
                    <option value="">Select a driver</option>
                    {drivers.map((driver) => (
                      <option key={driver.driver_id} value={driver.driver_id}>
                        {driver.driver_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {selected.charge_lines && !canEditCharges && (
              <div className="mt-4 rounded-lg border border-line p-3">
                <h3 className="text-xs font-semibold uppercase text-muted">
                  Charge breakdown
                </h3>
                <div className="mt-2 space-y-3 text-sm text-ink">
                  {selected.charge_lines.map((line) => (
                    <div key={line.id}>
                      <p className="font-medium">{line.label}</p>
                      {describeChargeLine(line).map((row) => (
                        <p key={row} className="text-xs text-muted">{row}</p>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Overall total ₱{Number(selected.charge_total ?? 0).toFixed(2)}
                </p>
              </div>
            )}

            {selected.charge_lines && canEditCharges && (
              <div className="mt-4 rounded-lg border border-line p-3">
                <h3 className="text-xs font-semibold uppercase text-muted">
                  Charge breakdown
                </h3>
                <div className="mt-2 space-y-3">
                  {chargeDraft.map((line, index) => (
                    <div key={`${line.id}-${index}`} className="text-sm">
                      <input
                        value={line.label}
                        disabled={!canEditCharges || !line.removable}
                        onChange={(event) =>
                          setChargeDraft((rows) =>
                            rows.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, label: event.target.value }
                                : row,
                            ),
                          )
                        }
                        className="w-full rounded border border-line px-2 py-1"
                      />
                      <div className="mt-1 space-y-0.5 text-xs text-muted">
                        {describeChargeLine(line).map((row) => (
                          <p key={row}>{row}</p>
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={line.quantity}
                          disabled={!canEditCharges}
                          onChange={(event) =>
                            setChargeDraft((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, quantity: Number(event.target.value) }
                                  : row,
                              ),
                            )
                          }
                          className="w-20 rounded border border-line px-2 py-1"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          min={0}
                          value={line.unit_amount}
                          disabled={!canEditCharges}
                          onChange={(event) =>
                            setChargeDraft((rows) =>
                              rows.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, unit_amount: Number(event.target.value) }
                                  : row,
                              ),
                            )
                          }
                          className="w-28 rounded border border-line px-2 py-1"
                        />
                        <span>
                          = ₱{(Number(line.quantity) * Number(line.unit_amount)).toFixed(2)}
                        </span>
                        {canEditCharges && line.removable && (
                          <button
                            type="button"
                            className="text-xs text-danger"
                            onClick={() =>
                              setChargeDraft((rows) =>
                                rows.filter((_, rowIndex) => rowIndex !== index),
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Total ₱
                  {chargeDraft
                    .reduce(
                      (sum, line) =>
                        sum + Number(line.quantity) * Number(line.unit_amount),
                      0,
                    )
                    .toFixed(2)}
                </p>
                {canEditCharges && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-line px-3 py-1.5 text-xs font-semibold"
                      onClick={() =>
                        setChargeDraft((rows) => [
                          ...rows,
                          {
                            id: `extra-${Date.now()}`,
                            label: "Additional charge",
                            quantity: 1,
                            unit_amount: 0,
                            removable: true,
                          },
                        ])
                      }
                    >
                      Add additional fee
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      className="rounded border border-line px-3 py-1.5 text-xs font-semibold"
                      onClick={() => void saveCharges(false)}
                    >
                      Save breakdown
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => void saveCharges(true)}
                    >
                      Confirm calculation
                    </button>
                  </div>
                )}
                {canEditCharges && !chargesConfirmed && (
                  <p className="mt-2 text-sm text-danger">
                    Confirm the calculation before approving.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted">
                Booking slip and letter
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void openDocument("preview", "slip")}>View slip</button>
                <button type="button" className="rounded border border-line px-3 py-1.5 text-xs font-semibold" onClick={() => void openDocument("print", "slip")}>Print slip</button>
                <button type="button" className="rounded border border-line px-3 py-1.5 text-xs font-semibold" onClick={() => void openDocument("download", "slip")}>Download slip</button>
              </div>
              {selected.attachments?.[0] ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void openDocument("preview", "letter")}>View letter</button>
                  <button type="button" className="rounded border border-line px-3 py-1.5 text-xs font-semibold" onClick={() => void openDocument("print", "letter")}>Print letter</button>
                  <button type="button" className="rounded border border-line px-3 py-1.5 text-xs font-semibold" onClick={() => void openDocument("download", "letter")}>Download letter</button>
                </div>
              ) : (
                <p className="text-xs text-muted">No letter or file is attached to this request.</p>
              )}
            </div>

            {isApprover && (
              <label className="mt-4 block text-sm text-ink">
                Remarks
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
                />
              </label>
            )}

            {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRequest}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink"
              >
                Close
              </button>
              {isApprover && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void decide("rejected")}
                    className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={submitting || (canEditCharges && !chargesConfirmed)}
                    onClick={() => void decide("approved")}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
