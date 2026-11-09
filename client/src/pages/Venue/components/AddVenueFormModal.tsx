import { useEffect, useState } from "react";
import {
  FiX,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiMapPin,
  FiInfo,
  FiImage,
  FiClock,
  FiPackage,
  FiUser,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueResource } from "../../../interfaces/VenueColumns";

interface AddVenueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, isFailed?: boolean) => void;
}

type ResourceForm = Omit<
  VenueResource,
  "resource_id" | "venue_id" | "created_at" | "updated_at"
>;

const emptyResource: ResourceForm = {
  resource_name: "",
  total_quantity: null,
  availability_type: "available",
  condition: "good",
  coordination_office: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0095D9] focus:bg-white focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-800";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const AddVenueFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}: AddVenueFormModalProps) => {
  const [loading, setLoading] = useState(false);

  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");

  const [personInCharge, setPersonInCharge] = useState("");
  const [picContactNumber, setPicContactNumber] = useState("");
  const [picEmail, setPicEmail] = useState("");

  const [facilities, setFacilities] = useState("");

  const [overtimeRate, setOvertimeRate] = useState("0");
  const [overtimePolicy, setOvertimePolicy] = useState("");
  const [status, setStatus] = useState<"available" | "unavailable">(
    "available",
  );

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [resources, setResources] = useState<ResourceForm[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetForm = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setVenue("");
    setDescription("");
    setCapacity("");
    setLocation("");
    setPersonInCharge("");
    setPicContactNumber("");
    setPicEmail("");
    setFacilities("");
    setOvertimeRate("0");
    setOvertimePolicy("");
    setStatus("available");
    setImage(null);
    setImagePreview(null);
    setResources([]);
    setErrors({});
  };

  const closeModal = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleImageChange = (file: File | null) => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const updateResource = (
    index: number,
    field: keyof ResourceForm,
    value: string | number | null,
  ) => {
    setResources((previous) =>
      previous.map((resource, i) =>
        i === index ? { ...resource, [field]: value } : resource,
      ),
    );
  };

  const addResource = () => {
    setResources((previous) => [...previous, { ...emptyResource }]);
  };

  const removeResource = (index: number) => {
    setResources((previous) => previous.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const clientErrors: Record<string, string> = {};

    if (!venue.trim()) {
      clientErrors.venue = "Venue name is required.";
    }

    if (!capacity || Number(capacity) < 1) {
      clientErrors.capacity = "Enter a valid capacity.";
    }

    if (!location.trim()) {
      clientErrors.location = "Location is required.";
    }

    resources.forEach((resource, index) => {
      if (!resource.resource_name.trim()) {
        clientErrors[`resources.${index}.resource_name`] =
          "Resource name is required.";
      }
    });

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const formData = new FormData();

    formData.append("venue", venue.trim());
    formData.append("description", description);
    formData.append("capacity", capacity);
    formData.append("location", location.trim());
    formData.append("person_in_charge", personInCharge.trim());
    formData.append("pic_contact_number", picContactNumber.trim());
    formData.append("pic_email", picEmail.trim());
    formData.append("overtime_rate", overtimeRate || "0");
    formData.append("overtime_policy", overtimePolicy);
    formData.append("status", status);

    facilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((facility) => {
        formData.append("facilities[]", facility);
      });

    if (image) {
      formData.append("venue_image", image);
    }

    resources.forEach((resource, index) => {
      formData.append(
        `resources[${index}][resource_name]`,
        resource.resource_name.trim(),
      );
      formData.append(
        `resources[${index}][total_quantity]`,
        resource.total_quantity === null ? "" : String(resource.total_quantity),
      );
      formData.append(
        `resources[${index}][availability_type]`,
        resource.availability_type,
      );
      formData.append(`resources[${index}][condition]`, resource.condition);
      formData.append(
        `resources[${index}][coordination_office]`,
        resource.coordination_office ?? "",
      );
      formData.append(`resources[${index}][notes]`, resource.notes ?? "");
    });

    try {
      setLoading(true);

      const response = await VenueService.storeVenue(formData);

      if (response.status === 200 || response.status === 201) {
        resetForm();
        onClose();
        onSuccess();
        onNotify("Venue added successfully!");
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors ?? {};
        const formattedErrors: Record<string, string> = {};

        Object.entries(validationErrors).forEach(([key, value]) => {
          formattedErrors[key] = Array.isArray(value)
            ? String(value[0])
            : String(value);
        });

        setErrors(formattedErrors);
      } else {
        onNotify(
          error.response?.data?.message ??
            "Something went wrong while adding the venue.",
          true,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#003B5C] p-2.5 text-white">
              <FiMapPin size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add New Venue
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Register a venue and configure its facilities and resources.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={loading}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FiX size={21} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-y-auto p-5 sm:p-6"
        >
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <FiInfo className="text-[#0095D9]" size={19} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Venue Name *</label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. University Auditorium"
                  maxLength={100}
                  className={inputClass}
                />
                {errors.venue && (
                  <p className="mt-1 text-xs text-red-500">{errors.venue}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide a short description of the venue..."
                  className={inputClass}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Capacity *</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Maximum persons"
                  className={inputClass}
                />
                {errors.capacity && (
                  <p className="mt-1 text-xs text-red-500">{errors.capacity}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Location *</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Building, floor, or area"
                  maxLength={150}
                  className={inputClass}
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-500">{errors.location}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <FiUser className="text-[#0095D9]" />
                    Person in Charge
                  </span>
                </label>
                <input
                  type="text"
                  value={personInCharge}
                  onChange={(e) => setPersonInCharge(e.target.value)}
                  placeholder="Enter the name of the person in charge"
                  maxLength={150}
                  className={inputClass}
                />
                {errors.person_in_charge && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.person_in_charge}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <FiPhone className="text-[#0095D9]" />
                    PIC Contact Number
                  </span>
                </label>
                <input
                  type="tel"
                  value={picContactNumber}
                  onChange={(e) => setPicContactNumber(e.target.value)}
                  placeholder="e.g. 09123456789"
                  maxLength={30}
                  className={inputClass}
                />
                {errors.pic_contact_number && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.pic_contact_number}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <FiMail className="text-[#0095D9]" />
                    PIC Email Address
                  </span>
                </label>
                <input
                  type="email"
                  value={picEmail}
                  onChange={(e) => setPicEmail(e.target.value)}
                  placeholder="e.g. person@filamer.edu.ph"
                  maxLength={255}
                  className={inputClass}
                />
                {errors.pic_email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.pic_email}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Facilities</label>
                <input
                  value={facilities}
                  onChange={(e) => setFacilities(e.target.value)}
                  placeholder="Projector, Air Conditioning, Sound System"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Separate each facility using a comma.
                </p>
                {errors.facilities && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.facilities}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <FiImage className="text-[#0095D9]" size={19} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Venue Image
              </h3>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition hover:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800/50">
              <FiUpload className="mb-2 text-2xl text-[#0095D9]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Click to upload venue image
              </span>
              <span className="mt-1 text-xs text-gray-400">
                JPG, JPEG, PNG, or WEBP (maximum 5MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </label>

            {errors.venue_image && (
              <p className="text-xs text-red-500">{errors.venue_image}</p>
            )}

            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <img
                  src={imagePreview}
                  alt="Venue preview"
                  className="h-56 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleImageChange(null)}
                  className="absolute right-3 top-3 rounded-lg bg-red-600 p-2 text-white shadow transition hover:bg-red-700"
                >
                  <FiTrash2 />
                </button>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <FiClock className="text-[#0095D9]" size={19} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Overtime Settings
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Overtime Rate (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(e.target.value)}
                  className={inputClass}
                />
                {errors.overtime_rate && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.overtime_rate}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Venue Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "available" | "unavailable")
                  }
                  className={inputClass}
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Overtime Policy</label>
                <textarea
                  value={overtimePolicy}
                  onChange={(e) => setOvertimePolicy(e.target.value)}
                  rows={2}
                  placeholder="Enter venue overtime policy..."
                  className={inputClass}
                />
                {errors.overtime_policy && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.overtime_policy}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FiPackage className="text-[#0095D9]" size={19} />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Venue Resources & Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={addResource}
                className="flex items-center gap-2 rounded-xl bg-[#003B5C] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00679E]"
              >
                <FiPlus />
                Add Resource
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record equipment and supplies available at this venue.
            </p>

            {resources.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No resources added yet. Click "Add Resource" to get started.
              </div>
            )}

            {resources.map((resource, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#003B5C] dark:text-[#0095D9]">
                    Resource #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeResource(index)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <FiTrash2 size={14} />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Resource Name *</label>
                    <input
                      value={resource.resource_name}
                      onChange={(e) =>
                        updateResource(index, "resource_name", e.target.value)
                      }
                      placeholder="e.g. Chairs"
                      className={inputClass}
                    />
                    {errors[`resources.${index}.resource_name`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`resources.${index}.resource_name`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Total Quantity</label>
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
                      placeholder="Enter quantity"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Availability</label>
                    <select
                      value={resource.availability_type}
                      onChange={(e) =>
                        updateResource(
                          index,
                          "availability_type",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                    >
                      <option value="available">Available</option>
                      <option value="consult_required">Consult Required</option>
                      <option value="borrowed">Borrowed</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Condition</label>
                    <select
                      value={resource.condition}
                      onChange={(e) =>
                        updateResource(index, "condition", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="damaged">Damaged</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Coordination Office</label>
                    <input
                      value={resource.coordination_office ?? ""}
                      onChange={(e) =>
                        updateResource(
                          index,
                          "coordination_office",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. ICT, MMO, Library"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Notes</label>
                    <input
                      value={resource.notes ?? ""}
                      onChange={(e) =>
                        updateResource(index, "notes", e.target.value)
                      }
                      placeholder="Additional details"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-linear-to-r from-[#003B5C] to-[#00679E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#00679E] hover:to-[#0095D9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving Venue..." : "Save Venue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVenueFormModal;
