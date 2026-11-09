import { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";

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
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-gray-50 px-4 py-2.5 text-left text-sm outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 disabled:opacity-60 dark:bg-gray-800 ${
          error ? "border-red-400" : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {selectedVenue ? (
          <span className="min-w-0">
            <span className="block truncate font-semibold text-gray-800 dark:text-white">
              {selectedVenue.venue}
            </span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
              {selectedVenue.location} • Capacity{" "}
              {selectedVenue.capacity.toLocaleString()}
            </span>
          </span>
        ) : (
          <span className="text-gray-400">Choose a venue</span>
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
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
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
                className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-[#0095D9]/10"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                } ${!selectable ? "cursor-not-allowed opacity-50" : ""}`}
              >
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

                {isSelected && (
                  <FiCheck className="mt-1 shrink-0 text-[#0095D9]" />
                )}
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

export const VenueDetailsCard = ({ venue }: { venue: VenueColumns }) => {
  const facilities = venue.facilities ?? [];
  const hasPic =
    venue.person_in_charge || venue.pic_contact_number || venue.pic_email;

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
            <FiClock className="shrink-0 text-[#0095D9]" />
            Overtime: {formatRate(venue.overtime_rate)}
          </p>

          <p className="flex items-center gap-2">
            <FiPackage className="shrink-0 text-[#0095D9]" />
            {venue.resources?.length ?? 0} resources on record
          </p>
        </div>

        {venue.overtime_policy && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Overtime policy:</span>{" "}
            {venue.overtime_policy}
          </p>
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
