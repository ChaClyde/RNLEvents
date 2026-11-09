import { useEffect, useState } from "react";
import {
  FiX,
  FiUpload,
  FiTrash2,
  FiMapPin,
  FiInfo,
  FiImage,
  FiUser,
  FiPhone,
  FiMail,
  FiClock,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import type { VenueColumns } from "../../../interfaces/VenueColumns";

interface EditVenueFormModalProps {
  isOpen: boolean;
  venue: VenueColumns | null;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, isFailed?: boolean) => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0095D9] focus:bg-white focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-800";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const EditVenueFormModal = ({
  isOpen,
  venue,
  onClose,
  onSuccess,
  onNotify,
}: EditVenueFormModalProps) => {
  const [loading, setLoading] = useState(false);

  const [venueName, setVenueName] = useState("");
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
  const [removeImage, setRemoveImage] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!venue || !isOpen) return;

    setVenueName(venue.venue);
    setDescription(venue.description ?? "");
    setCapacity(String(venue.capacity));
    setLocation(venue.location);

    setPersonInCharge(venue.person_in_charge ?? "");
    setPicContactNumber(venue.pic_contact_number ?? "");
    setPicEmail(venue.pic_email ?? "");

    setFacilities((venue.facilities ?? []).join(", "));
    setOvertimeRate(String(venue.overtime_rate ?? 0));
    setOvertimePolicy(venue.overtime_policy ?? "");
    setStatus(venue.status);

    setImage(null);
    setImagePreview(
      venue.venue_image
        ? `${VenueService.getVenueImage(venue.venue_id)}?v=${venue.updated_at}`
        : null,
    );

    setRemoveImage(false);
    setErrors({});
  }, [venue, isOpen]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (file: File | null) => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!venue) return;

    setErrors({});

    const clientErrors: Record<string, string> = {};

    if (!venueName.trim()) {
      clientErrors.venue = "Venue name is required.";
    }

    if (!capacity || Number(capacity) < 1) {
      clientErrors.capacity = "Enter a valid capacity.";
    }

    if (!location.trim()) {
      clientErrors.location = "Location is required.";
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const formData = new FormData();

    formData.append("venue", venueName.trim());
    formData.append("description", description);
    formData.append("capacity", capacity);
    formData.append("location", location.trim());
    formData.append("person_in_charge", personInCharge.trim());
    formData.append("pic_contact_number", picContactNumber.trim());
    formData.append("pic_email", picEmail.trim());
    formData.append("overtime_rate", overtimeRate || "0");
    formData.append("overtime_policy", overtimePolicy);
    formData.append("status", status);

    const facilityList = facilities
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (facilityList.length > 0) {
      facilityList.forEach((f) => formData.append("facilities[]", f));
    } else {
      // needed so clearing all facilities actually saves (empty string -> null)
      formData.append("facilities", "");
    }

    if (image) {
      formData.append("venue_image", image);
    }

    if (removeImage) {
      formData.append("remove_image", "1");
    }

    try {
      setLoading(true);

      const response = await VenueService.updateVenue(venue.venue_id, formData);

      if (response.status === 200) {
        onClose();
        onSuccess();
        onNotify("Venue updated successfully!");
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
            "Something went wrong while updating the venue.",
          true,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !venue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#003B5C] p-2.5 text-white">
              <FiMapPin size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Venue
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Update venue information, status, and its assigned person in
                charge.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
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
          {/* Basic Information */}
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
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
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
                  placeholder="Enter venue description..."
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

          {/* Overtime & Status */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <FiClock className="text-[#0095D9]" size={19} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Overtime & Status
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
                {errors.status && (
                  <p className="mt-1 text-xs text-red-500">{errors.status}</p>
                )}
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

          {/* Venue Image */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <FiImage className="text-[#0095D9]" size={19} />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Venue Image
              </h3>
            </div>

            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <img
                  src={imagePreview}
                  alt={venueName}
                  className="h-56 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-3 top-3 rounded-lg bg-red-600 p-2 text-white shadow transition hover:bg-red-700"
                >
                  <FiTrash2 />
                </button>
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center transition hover:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800/50">
              <FiUpload className="mb-2 text-2xl text-[#0095D9]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {imagePreview ? "Replace venue image" : "Upload venue image"}
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

            {removeImage && (
              <p className="text-xs text-red-500">
                The current image will be removed when you save.
              </p>
            )}

            {errors.venue_image && (
              <p className="text-xs text-red-500">{errors.venue_image}</p>
            )}
          </section>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
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
              {loading ? "Updating Venue..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVenueFormModal;