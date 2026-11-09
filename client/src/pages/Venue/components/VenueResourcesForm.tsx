import type { FC } from "react";
import { Plus, Trash2, Package } from "lucide-react";

import type {
  VenueResource,
  VenueResourceAvailability,
  VenueResourceCondition,
} from "../../../interfaces/VenueColumns";

export type VenueResourceInput = Omit<
  VenueResource,
  "resource_id" | "venue_id" | "created_at" | "updated_at"
> & {
  resource_id?: number;
};

interface VenueResourcesFormProps {
  resources: VenueResourceInput[];
  onChange: (resources: VenueResourceInput[]) => void;
}

const VenueResourcesForm: FC<VenueResourcesFormProps> = ({
  resources,
  onChange,
}) => {
  const addResource = () => {
    onChange([
      ...resources,
      {
        resource_name: "",
        total_quantity: 0,
        availability_type: "available",
        condition: "good",
        coordination_office: "",
        notes: "",
      },
    ]);
  };

  const updateResource = (
    index: number,
    field: keyof VenueResourceInput,
    value: string | number | null,
  ) => {
    const updated = [...resources];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    onChange(updated);
  };

  const removeResource = (index: number) => {
    onChange(resources.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="text-[#0095D9]" size={20} />
          <h2 className="font-semibold text-[#003B5C]">
            Venue Resources & Inventory
          </h2>
        </div>

        <button
          type="button"
          onClick={addResource}
          className="flex items-center gap-2 rounded-xl bg-[#003B5C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00679E]"
        >
          <Plus size={16} />
          Add Resource
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Record the equipment and supplies available at this venue.
      </p>

      {resources.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No resources added yet.
        </div>
      )}

      {resources.map((resource, index) => (
        <div
          key={resource.resource_id ?? `new-${index}`}
          className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#003B5C]">
              Resource #{index + 1}
            </span>

            <button
              type="button"
              onClick={() => removeResource(index)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Resource name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Resource Name
              </label>
              <input
                type="text"
                value={resource.resource_name}
                onChange={(e) =>
                  updateResource(index, "resource_name", e.target.value)
                }
                placeholder="e.g. Chairs"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
                required
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Total Quantity
              </label>
              <input
                type="number"
                min="0"
                value={resource.total_quantity ?? ""}
                onChange={(e) =>
                  updateResource(
                    index,
                    "total_quantity",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                placeholder="Unknown quantity"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Availability
              </label>
              <select
                value={resource.availability_type}
                onChange={(e) =>
                  updateResource(
                    index,
                    "availability_type",
                    e.target.value as VenueResourceAvailability,
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
              >
                <option value="available">Available</option>
                <option value="consult_required">Consult Required</option>
                <option value="borrowed">Borrowed</option>
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Condition
              </label>
              <select
                value={resource.condition}
                onChange={(e) =>
                  updateResource(
                    index,
                    "condition",
                    e.target.value as VenueResourceCondition,
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>

            {/* Coordination Office */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Coordination Office
              </label>
              <input
                type="text"
                value={resource.coordination_office ?? ""}
                onChange={(e) =>
                  updateResource(index, "coordination_office", e.target.value)
                }
                placeholder="e.g. ICT, MMO, Library"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <input
                type="text"
                value={resource.notes ?? ""}
                onChange={(e) => updateResource(index, "notes", e.target.value)}
                placeholder="Additional details"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0095D9]"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VenueResourcesForm;
