import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiImage,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import { useEffect, useRef, useState } from "react";

// ============================================================
// VENUE THUMBNAIL (photo, or an icon when there is none / it fails to load)
// ============================================================

const isFcuGymVenue = (name?: string | null) => {
  const normalized = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized === "fcu gym" || normalized === "gym";
};

const VenueThumb = ({
  venue,
  className = "h-14 w-14",
}: {
  venue: VenueColumns;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);

  // A new photo (or a different venue) gets a fresh attempt
  useEffect(() => {
    setFailed(false);
  }, [venue.venue_id, venue.updated_at]);

  if (!venue.venue_image || failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800 ${className}`}
      >
        <FiImage size={18} />
      </span>
    );
  }

  return (
    <img
      src={`${VenueService.getVenueImage(venue.venue_id)}?v=${venue.updated_at}`}
      alt={venue.venue}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  );
};

// ============================================================
// VENUE DROPDOWN
// ============================================================

interface VenueSelectProps {
  venues: VenueColumns[];
  value: string; // venue_id as string
  onChange: (venueId: string) => void;
  // The venue already saved on the booking stays selectable even if it
  // became unavailable (used by the Edit form)
  allowedUnavailableId?: number;
  disabled?: boolean;
  error?: string;
}

const VenueSelect = ({
  venues,
  value,
  onChange,
  allowedUnavailableId,
  disabled = false,
  error,
}: VenueSelectProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVenue =
    venues.find((venue) => String(venue.venue_id) === value) ?? null;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isSelectable = (venue: VenueColumns) =>
    venue.status === "available" || venue.venue_id === allowedUnavailableId;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-gray-50 px-3 py-2 text-left text-sm outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 disabled:opacity-60 dark:bg-gray-800 ${
          error ? "border-red-400" : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {selectedVenue ? (
          <span className="flex min-w-0 items-center gap-3">
            <VenueThumb venue={selectedVenue} className="h-10 w-10" />

            <span className="min-w-0">
              <span className="block truncate font-semibold text-gray-800 dark:text-white">
                {selectedVenue.venue}
              </span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                {selectedVenue.location} • Capacity{" "}
                {selectedVenue.capacity.toLocaleString()}
              </span>
            </span>
          </span>
        ) : (
          <span className="px-1 py-1.5 text-gray-400">Choose a venue</span>
        )}

        <FiChevronDown
          className={`shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {venues.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-gray-400">
              No venues found.
            </p>
          )}

          {venues.map((venue) => {
            const selectable = isSelectable(venue);
            const isSelected = String(venue.venue_id) === value;
            const resourceCount = venue.resources?.length ?? 0;

            return (
              <button
                key={venue.venue_id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={!selectable}
                onClick={() => {
                  onChange(String(venue.venue_id));
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-[#0095D9]/10"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                } ${!selectable ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <VenueThumb venue={venue} className="h-16 w-16" />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                      {venue.venue}
                    </span>

                    {!selectable && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-300">
                        Unavailable
                      </span>
                    )}
                  </span>

                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FiMapPin className="text-[#0095D9]" />
                      {venue.location}
                    </span>

                    <span className="flex items-center gap-1">
                      <FiUsers className="text-[#0095D9]" />
                      {venue.capacity.toLocaleString()} persons
                    </span>

                    <span className="flex items-center gap-1">
                      <FiPackage className="text-[#0095D9]" />
                      {resourceCount}{" "}
                      {resourceCount === 1 ? "resource" : "resources"}
                    </span>
                  </span>
                </span>

                {isSelected && <FiCheck className="shrink-0 text-[#0095D9]" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <FiAlertCircle size={13} />
          {error}
        </p>
      )}
    </div>
  );
};

export default VenueSelect;

// ============================================================
// VENUE DETAILS CARD
// ============================================================

const formatRate = (rate: number | string) =>
  Number(rate || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });

interface BookingRate {
  pricing_basis: "hourly" | "daily";
  hourly_rate: string | null;
  daily_rate: string | null;
  overtime_rate: string | null;
  overtime_policy: string | null;
  included_hours: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  charges?: Array<{
    charge_name: string;
    charge_type?: string;
    amount: string;
    unit: string;
    is_active: boolean;
  }>;
}

const activeRate = (rates: BookingRate[]) => {
  const today = new Date().toISOString().slice(0, 10);
  return rates
    .filter((rate) => {
      if (!rate.is_active || rate.effective_from > today) return false;
      return !rate.effective_to || rate.effective_to >= today;
    })
    .sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0];
};

export const VenueDetailsCard = ({ venue }: { venue: VenueColumns }) => {
  const facilities = venue.facilities ?? [];
  const hasPic =
    venue.person_in_charge || venue.pic_contact_number || venue.pic_email;
  const [rates, setRates] = useState<BookingRate[]>([]);

  useEffect(() => {
    let cancelled = false;
    VenueService.loadRates(venue.venue_id)
      .then((response) => {
        if (!cancelled) setRates(response.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setRates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [venue.venue_id]);

  const rate = activeRate(rates);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#0095D9]/20 bg-[#0095D9]/5 dark:bg-[#0095D9]/10">
      {venue.venue_image && (
        <img
          src={`${VenueService.getVenueImage(venue.venue_id)}?v=${venue.updated_at}`}
          alt={venue.venue}
          className="h-36 w-full object-cover"
        />
      )}

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white">
              {venue.venue}
            </p>

            {venue.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {venue.description}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              venue.status === "available"
                ? "bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-300"
            }`}
          >
            {venue.status === "available" ? "Available" : "Unavailable"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2 dark:text-gray-300">
          <p className="flex items-center gap-2">
            <FiMapPin className="shrink-0 text-[#0095D9]" />
            {venue.location}
          </p>

          <p className="flex items-center gap-2">
            <FiUsers className="shrink-0 text-[#0095D9]" />
            Capacity: {venue.capacity.toLocaleString()} persons
          </p>

          <p className="flex items-center gap-2">
            <FiPackage className="shrink-0 text-[#0095D9]" />
            {venue.resources?.length ?? 0} resources on record
          </p>
        </div>

        {isFcuGymVenue(venue.venue) && (
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              FCU Gym policy
            </p>
            <p>Monday, Tuesday, Thursday, and Friday: 6:00 AM–8:00 AM and 4:00 PM–6:00 PM.</p>
            <p>Wednesday and Saturday: 6:00 AM–6:00 PM.</p>
            <p>Sunday is not part of this schedule. University-wide activities are the exception.</p>
            <p>Use is first come, first served. Whole-semester and whole-summer reservations are strongly discouraged.</p>
            <p>The group must keep the Gym clean and protect its facilities and equipment. Negligent damage is charged to the organization, department, or group.</p>
          </div>
        )}

        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <span className="font-semibold">Booking rate: </span>
            {rate
              ? rate.pricing_basis === "hourly"
                ? `${formatRate(rate.hourly_rate ?? 0)} per hour`
                : `${formatRate(rate.daily_rate ?? 0)} per day`
              : "Not yet configured"}
          </p>
          <p>
            <span className="font-semibold">Regular time: </span>
            Monday to Friday, 8:00 AM to 5:00 PM
          </p>
          <p>
            <span className="font-semibold">Overtime: </span>
            {rate
              ? `${formatRate(rate.overtime_rate ?? 0)} per hour on Saturday, Sunday, before 8:00 AM, and from 5:00 PM onward`
              : "Not yet configured"}
          </p>
          <p>
            <span className="font-semibold">Overtime note: </span>
            {rate?.overtime_policy || "Monday to Friday, 8:00 AM to 5:00 PM is regular time. Saturday, Sunday, time before 8:00 AM, and time from 5:00 PM onward are overtime."}
          </p>
          <p>
            <span className="font-semibold">Effective date: </span>
            {rate?.effective_from ?? "Not yet configured"}
          </p>
        </div>

        {rate && (rate.charges ?? []).some((charge) => charge.is_active && charge.unit === "per_overtime_hour") && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Resource overtime rates
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
              {rate.charges
                ?.filter((charge) => charge.is_active && charge.unit === "per_overtime_hour")
                .map((charge) => (
                  <li key={`${charge.charge_name}-overtime`}>
                    {charge.charge_name}: {formatRate(charge.amount)} per overtime hour
                  </li>
                ))}
            </ul>
          </div>
        )}

        {(venue.maintenance ?? []).some((row) => row.status === "scheduled") && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Scheduled maintenance
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
              {venue.maintenance
                ?.filter((row) => row.status === "scheduled")
                .map((row) => (
                  <li key={row.maintenance_id}>
                    {row.reason}
                    {row.range_label
                      ? ` · ${row.range_label}`
                      : ` · ${row.date_start.slice(0, 10)} to ${row.date_end.slice(0, 10)}`}
                    {row.notes ? ` · ${row.notes}` : ""}
                  </li>
                ))}
            </ul>
            <p className="mt-1 text-xs text-gray-500">
              This venue cannot be booked on these dates.
            </p>
          </div>
        )}

        {(venue.resources ?? []).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Available resources
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
              {venue.resources?.map((resource) => (
                <li key={resource.resource_id}>
                  {resource.resource_name}
                  {resource.total_quantity !== null
                    ? ` · ${resource.total_quantity.toLocaleString()} available`
                    : ""}
                  {resource.condition !== "not_applicable"
                    ? ` · ${resource.condition.replaceAll("_", " ")}`
                    : ""}
                  {resource.availability_type !== "available"
                    ? ` · ${resource.availability_type.replaceAll("_", " ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {rate && (rate.charges ?? []).some((charge) => charge.is_active && charge.unit !== "per_overtime_hour") && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Additional charges
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
              {rate.charges
                ?.filter((charge) => charge.is_active && charge.unit !== "per_overtime_hour")
                .map((charge) => (
                  <li key={`${charge.charge_name}-${charge.unit}`}>
                    {charge.charge_type === "equipment"
                      ? "Equipment"
                      : charge.charge_type === "service"
                        ? "Additional service"
                        : "Additional facility"}
                    {" · "}
                    {charge.charge_name}: {formatRate(charge.amount)}{" "}
                    {charge.unit.replaceAll("_", " ")}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {hasPic && (
          <div className="space-y-1.5 border-t border-[#0095D9]/20 pt-3 text-sm text-gray-600 dark:text-gray-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Person in Charge
            </p>

            {venue.person_in_charge && (
              <p className="flex items-center gap-2">
                <FiUser className="shrink-0 text-[#0095D9]" />
                {venue.person_in_charge}
              </p>
            )}

            {venue.pic_contact_number && (
              <p className="flex items-center gap-2">
                <FiPhone className="shrink-0 text-[#0095D9]" />
                {venue.pic_contact_number}
              </p>
            )}

            {venue.pic_email && (
              <p className="flex items-center gap-2 break-all">
                <FiMail className="shrink-0 text-[#0095D9]" />
                {venue.pic_email}
              </p>
            )}
          </div>
        )}

        {facilities.length > 0 && (
          <div className="border-t border-[#0095D9]/20 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Facilities
            </p>

            <div className="flex flex-wrap gap-1.5">
              {facilities.map((facility, index) => (
                <span
                  key={`${facility}-${index}`}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#00679E] dark:bg-gray-800 dark:text-[#38BDF8]"
                >
                  {facility}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
