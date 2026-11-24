import { useEffect, useState } from "react";
import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import { Permission } from "../../../permissions";
import { usePermissions } from "../../../hooks/usePermissions";

type ChargeType = "facility" | "equipment" | "service";
type ChargeUnit = "per_hour" | "per_day" | "per_booking" | "per_overtime_hour";

interface RateCharge {
  charge_name: string;
  charge_type: ChargeType;
  amount: string;
  unit: ChargeUnit;
  is_active: boolean;
  venue_resource_id: number | null;
}

interface DatedRate {
  venue_rate_id: number;
  venue_id: number;
  venueName: string;
  pricing_basis: "hourly" | "daily";
  hourly_rate: string | null;
  daily_rate: string | null;
  overtime_rate: string | null;
  overtime_policy: string | null;
  included_hours: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  charges: RateCharge[];
}

interface DraftCharge {
  charge_name: string;
  charge_type: ChargeType;
  amount: string;
  unit: ChargeUnit;
  venue_resource_id: string;
}

interface OvertimeRatesPanelProps {
  venues: VenueColumns[];
  onSaved: () => void;
}

const emptyCharge = (type: ChargeType): DraftCharge => ({
  charge_name: "",
  charge_type: type,
  amount: "",
  unit: "per_hour",
  venue_resource_id: "",
});

const chargeLabel: Record<ChargeType, string> = {
  facility: "Additional facility charges",
  equipment: "Equipment charges",
  service: "Additional service charges",
};

const OvertimeRatesPanel = ({ venues, onSaved }: OvertimeRatesPanelProps) => {
  const { can } = usePermissions();
  const canEdit = can(Permission.VENUE_RATES_EDIT) || can(Permission.VENUE_RATES_CREATE);
  const [rates, setRates] = useState<DatedRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DatedRate | null>(null);
  const [basis, setBasis] = useState<"hourly" | "daily">("hourly");
  const [baseAmount, setBaseAmount] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [charges, setCharges] = useState<DraftCharge[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const rows = await Promise.all(
      venues.map(async (venue) => {
        const response = await VenueService.loadRates(venue.venue_id);
        return (response.data.data ?? []).map((rate: DatedRate) => ({
          ...rate,
          venueName: venue.venue,
          charges: rate.charges ?? [],
        }));
      }),
    );
    setRates(rows.flat());
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [venues]);

  const open = (rate: DatedRate) => {
    setEditing(rate);
    setBasis(rate.pricing_basis);
    setBaseAmount(
      rate.pricing_basis === "hourly"
        ? (rate.hourly_rate ?? "")
        : (rate.daily_rate ?? ""),
    );
    setOvertimeRate(rate.overtime_rate ?? "");
    setEffectiveFrom(rate.effective_from);
    setCharges(
      rate.charges.map((charge) => ({
        charge_name: charge.charge_name,
        charge_type: charge.charge_type,
        amount: String(charge.amount ?? ""),
        unit: charge.unit,
        venue_resource_id: charge.venue_resource_id
          ? String(charge.venue_resource_id)
          : "",
      })),
    );
    setError("");
  };

  const openNew = (venue: VenueColumns) => {
    open({
      venue_rate_id: 0,
      venue_id: venue.venue_id,
      venueName: venue.venue,
      pricing_basis: "hourly",
      hourly_rate: null,
      daily_rate: null,
      overtime_rate: null,
      overtime_policy: null,
      included_hours: null,
      effective_from: new Date().toISOString().slice(0, 10),
      effective_to: null,
      is_active: true,
      charges: [],
    });
  };

  const save = async () => {
    if (!editing || baseAmount === "") return;
    setError("");

    const payload = {
      pricing_basis: basis,
      hourly_rate: basis === "hourly" ? baseAmount : null,
      daily_rate: basis === "daily" ? baseAmount : null,
      overtime_rate: overtimeRate === "" ? 0 : overtimeRate,
      overtime_policy: editing.overtime_policy,
      included_hours: editing.included_hours,
      effective_from: effectiveFrom,
      effective_to: editing.effective_to,
      is_active: editing.is_active,
      charges: charges
        .filter((charge) => charge.charge_name.trim() && charge.amount !== "")
        .map((charge) => ({
          charge_name: charge.charge_name.trim(),
          charge_type: charge.charge_type,
          amount: charge.amount,
          unit: charge.unit,
          is_active: true,
          venue_resource_id: charge.venue_resource_id
            ? Number(charge.venue_resource_id)
            : null,
        })),
    };

    try {
      if (editing.venue_rate_id === 0 || effectiveFrom !== editing.effective_from) {
        await VenueService.storeRate(editing.venue_id, payload);
      } else {
        await VenueService.updateRate(
          editing.venue_id,
          editing.venue_rate_id,
          payload,
        );
      }
      setEditing(null);
      await load();
      onSaved();
    } catch {
      setError(
        "This rate could not be changed. A rate already used by a booking needs a new effective date.",
      );
    }
  };

  const venueFor = (venueId: number) =>
    venues.find((venue) => venue.venue_id === venueId);

  const baseLabel = (rate: DatedRate) =>
    rate.pricing_basis === "hourly"
      ? `${Number(rate.hourly_rate ?? 0).toFixed(2)} per hour`
      : `${Number(rate.daily_rate ?? 0).toFixed(2)} per day`;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Overtime rates</h2>
        <p className="mt-1 text-sm text-gray-500">
          Monday to Friday, 8:00 AM to 5:00 PM is regular time. Saturday, Sunday, time before 8:00 AM, and time from 5:00 PM onward are overtime. No official price is preloaded.
        </p>
      </div>
      {loading ? (
        <p className="px-5 py-4 text-sm text-gray-500">Loading rates...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Effective date</th>
                <th className="px-4 py-3">Base rental</th>
                <th className="px-4 py-3">Regular hours</th>
                <th className="px-4 py-3">Overtime rate</th>
                <th className="px-4 py-3">Other charges</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {venues.filter((venue) => !rates.some((rate) => rate.venue_id === venue.venue_id)).map((venue) => (
                <tr key={`missing-${venue.venue_id}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{venue.venue}</td>
                  <td className="px-4 py-3" colSpan={6}>Not yet configured</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openNew(venue)} className="font-semibold text-[#00679E]">
                        Add rate
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rates.map((rate) => (
                <tr key={rate.venue_rate_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{rate.venueName}</td>
                  <td className="px-4 py-3">{rate.effective_from}</td>
                  <td className="px-4 py-3">{baseLabel(rate)}</td>
                  <td className="px-4 py-3">Weekdays, 8:00 AM – 5:00 PM</td>
                  <td className="px-4 py-3">
                    {`${Number(rate.overtime_rate ?? 0).toFixed(2)} per hour`}
                  </td>
                  <td className="px-4 py-3">
                    {rate.charges.length === 0
                      ? "None"
                      : (["facility", "equipment", "service"] as ChargeType[])
                          .map((type) => {
                            const count = rate.charges.filter((charge) => charge.charge_type === type).length;
                            return count > 0 ? `${chargeLabel[type]}: ${count}` : null;
                          })
                          .filter(Boolean)
                          .join("; ")}
                  </td>
                  <td className="px-4 py-3">{rate.is_active ? "Active" : "Inactive"}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => open(rate)} className="font-semibold text-[#00679E]">
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Rates for {editing.venueName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter a confirmed amount only. A later effective date creates a new rate when this one is already used by a booking.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Billing basis
                <select value={basis} onChange={(event) => setBasis(event.target.value as "hourly" | "daily")} className="mt-1 w-full rounded-lg border px-3 py-2">
                  <option value="hourly">Hourly rental</option>
                  <option value="daily">Daily rental</option>
                </select>
              </label>
              <label className="block text-sm">
                Base facility rental
                <input value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block text-sm">
                Regular hours
                <input value="Weekdays, 8:00 AM – 5:00 PM" readOnly className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2" />
              </label>
              <label className="block text-sm">
                Overtime rate per hour
                <input value={overtimeRate} onChange={(event) => setOvertimeRate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Effective date
                <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
            </div>

            {(["facility", "equipment", "service"] as ChargeType[]).map((type) => (
              <section key={type} className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{chargeLabel[type]}</h4>
                  <button type="button" onClick={() => setCharges((current) => [...current, emptyCharge(type)])} className="text-sm font-semibold text-[#00679E]">
                    Add
                  </button>
                </div>
                {charges.map((charge, index) => charge.charge_type === type && (
                  <div key={`${type}-${index}`} className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input value={charge.charge_name} placeholder="Description" className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, charge_name: event.target.value } : item))} />
                    <input value={charge.amount} placeholder="Amount" className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} />
                    <select value={charge.unit} className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value as ChargeUnit } : item))}>
                      <option value="per_hour">Per hour</option>
                      <option value="per_overtime_hour">Per overtime hour</option>
                      <option value="per_day">Per day</option>
                      <option value="per_booking">Per booking</option>
                    </select>
                    <select value={charge.venue_resource_id} className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, venue_resource_id: event.target.value } : item))}>
                      <option value="">Every booking</option>
                      {(venueFor(editing.venue_id)?.resources ?? []).map((resource) => (
                        <option key={resource.resource_id} value={resource.resource_id}>{resource.resource_name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </section>
            ))}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={() => void save()} disabled={baseAmount === ""} className="rounded-lg bg-[#00679E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeRatesPanel;
