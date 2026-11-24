import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import { Permission } from "../../../permissions";
import { usePermissions } from "../../../hooks/usePermissions";

interface VenueRateCharge {
  charge_name: string;
  charge_type: "facility" | "equipment" | "service";
  amount: string;
  unit: "per_booking" | "per_day" | "per_hour";
  is_active: boolean;
  venue_resource_id: string;
}

interface VenueRateRecord {
  venue_rate_id: number;
  pricing_basis: "hourly" | "daily";
  hourly_rate: string | null;
  daily_rate: string | null;
  overtime_rate: string | null;
  overtime_policy: string | null;
  included_hours: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  charges?: Array<Omit<VenueRateCharge, "amount" | "venue_resource_id"> & {
    amount: string;
    venue_resource_id: number | null;
  }>;
}

const emptyCharge = (): VenueRateCharge => ({
  charge_name: "",
  charge_type: "facility",
  amount: "",
  unit: "per_booking",
  is_active: true,
  venue_resource_id: "",
});

interface VenueRatesModalProps {
  venue: VenueColumns;
  onClose: () => void;
}

const VenueRatesModal = ({ venue, onClose }: VenueRatesModalProps) => {
  const { can } = usePermissions();
  const canEdit = can(Permission.VENUE_RATES_CREATE) || can(Permission.VENUE_RATES_EDIT);
  const [rates, setRates] = useState<VenueRateRecord[]>([]);
  const [error, setError] = useState("");
  const [basis, setBasis] = useState<"hourly" | "daily">("hourly");
  const [amount, setAmount] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [includedHours, setIncludedHours] = useState("");
  const [policy, setPolicy] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [charges, setCharges] = useState<VenueRateCharge[]>([]);

  const loadRates = async () => {
    const response = await VenueService.loadRates(venue.venue_id);
    setRates(response.data.data ?? []);
  };

  useEffect(() => {
    loadRates().catch(() => setError("Unable to load rate history."));
  }, [venue.venue_id]);

  const save = async () => {
    setError("");
    try {
      await VenueService.storeRate(venue.venue_id, {
        pricing_basis: basis,
        hourly_rate: basis === "hourly" ? amount : null,
        daily_rate: basis === "daily" ? amount : null,
        overtime_rate: overtimeRate || 0,
        overtime_policy: policy || null,
        included_hours: includedHours || null,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        is_active: true,
        charges: charges
          .filter((charge) => charge.charge_name && charge.amount !== "")
          .map((charge) => ({
            ...charge,
            venue_resource_id: charge.venue_resource_id
              ? Number(charge.venue_resource_id)
              : null,
          })),
      });
      setAmount("");
      setCharges([]);
      await loadRates();
    } catch {
      setError("The rate could not be saved. Check the dates and amounts.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Rates for {venue.venue}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add a dated rate when an official price is confirmed. Existing venue overtime fields are not used as the booking fee, and no official rate is preloaded.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <FiX />
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {rates.length === 0 && (
            <p className="text-sm text-gray-500">No rate records yet.</p>
          )}
          {rates.map((rate) => (
            <div key={rate.venue_rate_id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {rate.pricing_basis === "hourly"
                    ? `Hourly ${rate.hourly_rate ?? "—"}`
                    : `Daily ${rate.daily_rate ?? "—"}`}
                  {" · "}
                  {rate.effective_from}
                  {rate.effective_to ? ` to ${rate.effective_to}` : " onward"}
                </p>
                <span className={rate.is_active ? "text-green-600" : "text-gray-400"}>
                  {rate.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-gray-500">
                Overtime {rate.overtime_rate ?? "0.00"}
                {rate.included_hours ? ` after ${rate.included_hours} hours` : ""}
                {rate.overtime_policy ? ` · ${rate.overtime_policy}` : ""}
              </p>
              {(rate.charges ?? []).length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-gray-600">
                  {rate.charges?.map((charge, index) => (
                    <li key={`${rate.venue_rate_id}-${index}`}>
                      {charge.charge_name}: {charge.amount} {charge.unit.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && rate.is_active && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[#00679E]"
                  onClick={() =>
                    VenueService.updateRate(venue.venue_id, rate.venue_rate_id, {
                      ...rate,
                      is_active: false,
                      charges: rate.charges ?? [],
                    }).then(loadRates).catch(() => setError("The rate could not be deactivated."))
                  }
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={basis} onChange={(event) => setBasis(event.target.value as "hourly" | "daily")} className="rounded-lg border px-3 py-2 text-sm">
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Rate amount" className="rounded-lg border px-3 py-2 text-sm" />
              <input value={overtimeRate} onChange={(event) => setOvertimeRate(event.target.value)} placeholder="Overtime rate per hour" className="rounded-lg border px-3 py-2 text-sm" />
              <input value={includedHours} onChange={(event) => setIncludedHours(event.target.value)} placeholder="Included hours before overtime" className="rounded-lg border px-3 py-2 text-sm" />
              <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              <input type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
            </div>
            <textarea value={policy} onChange={(event) => setPolicy(event.target.value)} placeholder="Overtime policy" className="w-full rounded-lg border px-3 py-2 text-sm" />
            {charges.map((charge, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-4">
                <input value={charge.charge_name} placeholder="Charge name" className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, charge_name: event.target.value } : item))} />
                <input value={charge.amount} placeholder="Amount" className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} />
                <select value={charge.charge_type} className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, charge_type: event.target.value as VenueRateCharge["charge_type"] } : item))}>
                  <option value="facility">Additional facility</option>
                  <option value="equipment">Equipment</option>
                  <option value="service">Additional service</option>
                </select>
                <select value={charge.unit} className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value as VenueRateCharge["unit"] } : item))}>
                  <option value="per_booking">Per booking</option>
                  <option value="per_day">Per day</option>
                  <option value="per_hour">Per hour</option>
                </select>
                <select value={charge.venue_resource_id} className="rounded-lg border px-3 py-2 text-sm" onChange={(event) => setCharges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, venue_resource_id: event.target.value } : item))}>
                  <option value="">All bookings</option>
                  {(venue.resources ?? []).map((resource) => (
                    <option key={resource.resource_id} value={resource.resource_id}>{resource.resource_name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setCharges((current) => [...current, emptyCharge()])} className="rounded-lg border px-3 py-2 text-sm">
                Add charge
              </button>
              <button type="button" onClick={save} disabled={!effectiveFrom || !amount} className="rounded-lg bg-[#00679E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Save rate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueRatesModal;
