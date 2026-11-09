import { FiAlertCircle, FiPackage, FiPlus, FiTrash2 } from "react-icons/fi";

import type {
  VenueColumns,
  VenueResource,
  VenueResourceAvailability,
  VenueResourceCondition,
} from "../../../interfaces/VenueColumns";
import type { EventBookingResourceInput } from "../../../interfaces/EventBookingColumns";

interface BookingResourcePickerProps {
  venue: VenueColumns | null;
  value: EventBookingResourceInput[];
  onChange: (value: EventBookingResourceInput[]) => void;
  disabled?: boolean;
  // Show inline problems (after the first submit attempt)
  showErrors?: boolean;
  // Messages that came back from the server
  errorMessages?: string[];
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const availabilityMeta: Record<
  VenueResourceAvailability,
  { label: string; className: string }
> = {
  available: {
    label: "Available",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  },
  consult_required: {
    label: "Consult required",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  borrowed: {
    label: "Borrowed",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
  },
};

const conditionMeta: Record<
  VenueResourceCondition,
  { label: string; className: string } | null
> = {
  good: {
    label: "Good condition",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  },
  fair: {
    label: "Fair condition",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300",
  },
  damaged: {
    label: "Damaged",
    className: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
  not_applicable: null,
};

const badgeClass = "rounded-full px-2 py-0.5 text-[11px] font-semibold";

const BookingResourcePicker = ({
  venue,
  value,
  onChange,
  disabled = false,
  showErrors = false,
  errorMessages = [],
}: BookingResourcePickerProps) => {
  const venueResources = venue?.resources ?? [];

  const getSelected = (resourceId: number) =>
    value.find((item) => item.resource_id === resourceId);

  // ------------------------------------------------------------
  // VENUE RESOURCES
  // ------------------------------------------------------------

  const toggleResource = (resource: VenueResource) => {
    if (getSelected(resource.resource_id)) {
      onChange(
        value.filter((item) => item.resource_id !== resource.resource_id),
      );
      return;
    }

    onChange([
      ...value,
      {
        resource_id: resource.resource_id,
        resource_name: resource.resource_name,
        quantity: 1,
        notes: null,
      },
    ]);
  };

  const setResourceQuantity = (resource: VenueResource, rawValue: string) => {
    let quantity = Math.floor(Number(rawValue));

    if (!Number.isFinite(quantity) || quantity < 0) quantity = 0;

    // Never above the venue's recorded quantity
    if (resource.total_quantity !== null) {
      quantity = Math.min(quantity, resource.total_quantity);
    }

    onChange(
      value.map((item) =>
        item.resource_id === resource.resource_id
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  // ------------------------------------------------------------
  // OTHER EQUIPMENT (not on the venue's list)
  // ------------------------------------------------------------

  const addCustom = () => {
    onChange([
      ...value,
      { resource_id: null, resource_name: "", quantity: 1, notes: null },
    ]);
  };

  const updateCustom = (
    index: number,
    patch: Partial<EventBookingResourceInput>,
  ) => {
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeCustom = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const selectedCount = value.length;

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  if (!venue) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <FiPackage className="mx-auto mb-2 text-2xl text-gray-400" />
        Select a venue to see the resources it has available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resources available at{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {venue.venue}
          </span>
        </p>

        <span className="rounded-full bg-[#0095D9]/10 px-3 py-1 text-xs font-semibold text-[#00679E] dark:text-[#38BDF8]">
          {selectedCount} selected
        </span>
      </div>

      {venueResources.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          This venue has no resources on record. You can still list other
          equipment below.
        </div>
      )}

      {/* Venue resources */}
      <div className="space-y-2.5">
        {venueResources.map((resource) => {
          const selected = getSelected(resource.resource_id);

          const blockedReason =
            resource.condition === "damaged"
              ? "Damaged — cannot be requested"
              : resource.total_quantity === 0
                ? "None available"
                : "";

          // A blocked item can still be unchecked if it was saved earlier
          const checkboxDisabled =
            disabled || (Boolean(blockedReason) && !selected);

          const availability = availabilityMeta[resource.availability_type];
          const condition = conditionMeta[resource.condition];

          const quantityInvalid =
            showErrors && selected !== undefined && selected.quantity < 1;

          return (
            <div
              key={resource.resource_id}
              className={`rounded-xl border p-3 transition ${
                selected
                  ? "border-[#0095D9] bg-[#0095D9]/5"
                  : "border-gray-200 dark:border-gray-700"
              } ${blockedReason && !selected ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label
                  className={`flex min-w-0 flex-1 items-start gap-3 ${
                    checkboxDisabled ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected)}
                    onChange={() => toggleResource(resource)}
                    disabled={checkboxDisabled}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#0095D9]"
                  />

                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800 dark:text-white">
                      {resource.resource_name}
                    </span>

                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`${badgeClass} ${availability.className}`}
                      >
                        {availability.label}
                      </span>

                      {condition && (
                        <span
                          className={`${badgeClass} ${condition.className}`}
                        >
                          {condition.label}
                        </span>
                      )}

                      {resource.total_quantity !== null ? (
                        <span
                          className={`${badgeClass} bg-[#0095D9]/10 text-[#00679E] dark:text-[#38BDF8]`}
                        >
                          Max: {resource.total_quantity.toLocaleString()}
                        </span>
                      ) : (
                        <span
                          className={`${badgeClass} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`}
                        >
                          Quantity not confirmed
                        </span>
                      )}
                    </span>

                    {blockedReason && (
                      <span className="mt-1.5 block text-xs font-medium text-red-500">
                        {blockedReason}
                      </span>
                    )}

                    {resource.availability_type !== "available" && (
                      <span className="mt-1.5 block text-xs text-amber-600 dark:text-amber-400">
                        {resource.availability_type === "borrowed"
                          ? "Borrowed item"
                          : "Needs consultation"}
                        {resource.coordination_office
                          ? ` — coordinate with ${resource.coordination_office}`
                          : ""}
                      </span>
                    )}

                    {resource.notes && (
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        {resource.notes}
                      </span>
                    )}
                  </span>
                </label>

                {selected && (
                  <div className="w-full shrink-0 sm:w-36">
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Quantity
                      {resource.total_quantity !== null &&
                        ` (max ${resource.total_quantity.toLocaleString()})`}
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={resource.total_quantity ?? undefined}
                      step="1"
                      value={selected.quantity === 0 ? "" : selected.quantity}
                      onChange={(e) =>
                        setResourceQuantity(resource, e.target.value)
                      }
                      disabled={disabled}
                      className={`${inputClass} ${
                        quantityInvalid ? "border-red-400" : ""
                      }`}
                    />

                    {quantityInvalid && (
                      <p className="mt-1 text-xs text-red-500">
                        Enter a quantity of at least 1.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Other equipment */}
      <div className="space-y-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Other equipment
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              For items that are not on the venue's list. These are not checked
              against the venue's inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={addCustom}
            disabled={disabled}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#003B5C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#00679E] disabled:opacity-50"
          >
            <FiPlus />
            Add item
          </button>
        </div>

        {value.map((item, index) => {
          if (item.resource_id !== null) return null;

          const nameInvalid = showErrors && !item.resource_name.trim();
          const quantityInvalid = showErrors && item.quantity < 1;

          return (
            <div
              key={`custom-${index}`}
              className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:grid-cols-[1fr_8rem_auto] dark:border-gray-700 dark:bg-gray-800/40"
            >
              <div>
                <input
                  type="text"
                  value={item.resource_name}
                  onChange={(e) =>
                    updateCustom(index, { resource_name: e.target.value })
                  }
                  placeholder="Equipment name"
                  maxLength={100}
                  disabled={disabled}
                  className={`${inputClass} ${nameInvalid ? "border-red-400" : ""}`}
                />

                {nameInvalid && (
                  <p className="mt-1 text-xs text-red-500">Name is required.</p>
                )}
              </div>

              <div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity === 0 ? "" : item.quantity}
                  onChange={(e) => {
                    const quantity = Math.floor(Number(e.target.value));

                    updateCustom(index, {
                      quantity:
                        Number.isFinite(quantity) && quantity > 0
                          ? quantity
                          : 0,
                    });
                  }}
                  placeholder="Qty"
                  disabled={disabled}
                  className={`${inputClass} ${
                    quantityInvalid ? "border-red-400" : ""
                  }`}
                />

                {quantityInvalid && (
                  <p className="mt-1 text-xs text-red-500">Min. 1.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeCustom(index)}
                disabled={disabled}
                aria-label="Remove item"
                className="flex items-center justify-center rounded-xl px-3 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
              >
                <FiTrash2 />
              </button>
            </div>
          );
        })}
      </div>

      {/* Messages from the server */}
      {errorMessages.length > 0 && (
        <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {errorMessages.map((message, index) => (
            <p key={index} className="flex items-start gap-1.5">
              <FiAlertCircle className="mt-0.5 shrink-0" size={13} />
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingResourcePicker;
