import { useEffect, useState } from "react";
import {
  FiX,
  FiUpload,
  FiTrash2,
  FiPlus,
  FiPackage,
  FiMapPin,
  FiInfo,
  FiImage,
  FiUser,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import VenueService from "../../../services/VenueService";
import VenueMaintenanceSection from "./VenueMaintenanceSection";
import type { VenueColumns, VenueResourceInput } from "../../../interfaces/VenueColumns";

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

const defaultOvertimePolicy =
  "Monday to Friday, 8:00 AM to 5:00 PM is regular time. Saturday, Sunday, time before 8:00 AM, and time from 5:00 PM onward are overtime.";

type OvertimeResourceRate = {
  resource_name: string;
  overtime_rate: string;
};

type KeptCharge = {
  charge_name: string;
  charge_type: "facility" | "equipment" | "service";
  amount: string;
  unit: "per_hour" | "per_day" | "per_booking";
  is_active: boolean;
  venue_resource_id: number | null;
};

const emptyResource = (): VenueResourceInput => ({
  resource_name: "",
  total_quantity: null,
  availability_type: "available",
  condition: "good",
  coordination_office: "",
  notes: "",
});

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
  const [status, setStatus] = useState<"available" | "unavailable">(
    "available",
  );
  const [resources, setResources] = useState<VenueResourceInput[]>([]);
  const [pricingBasis, setPricingBasis] = useState<"hourly" | "daily">("hourly");
  const [baseAmount, setBaseAmount] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [overtimePolicy, setOvertimePolicy] = useState(defaultOvertimePolicy);
  const [overtimeResources, setOvertimeResources] = useState<OvertimeResourceRate[]>([]);
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState("");
  const [rateId, setRateId] = useState<number | null>(null);
  const [includedHours, setIncludedHours] = useState<string | null>(null);
  const [loadedEffectiveFrom, setLoadedEffectiveFrom] = useState("");
  const [keptCharges, setKeptCharges] = useState<KeptCharge[]>([]);

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
    setStatus(venue.status);
    setResources(
      (venue.resources ?? []).map((resource) => ({
        resource_id: resource.resource_id,
        resource_name: resource.resource_name,
        total_quantity: resource.total_quantity,
        availability_type: resource.availability_type,
        condition: resource.condition,
        coordination_office: resource.coordination_office ?? "",
        notes: resource.notes ?? "",
      })),
    );
    setPricingBasis("hourly");
    setBaseAmount("");
    setOvertimeRate("");
    setOvertimePolicy(defaultOvertimePolicy);
    setOvertimeResources([]);
    setRateEffectiveFrom(new Date().toISOString().slice(0, 10));
    setRateId(null);
    setIncludedHours(null);
    setLoadedEffectiveFrom("");
    setKeptCharges([]);

    VenueService.loadRates(venue.venue_id)
      .then((response) => {
        const rates = (response.data.data ?? []) as Array<{
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
          charges?: Array<{
            charge_name: string;
            charge_type: "facility" | "equipment" | "service";
            amount: string;
            unit: string;
            is_active: boolean;
            venue_resource_id: number | null;
          }>;
        }>;
        const today = new Date().toISOString().slice(0, 10);
        const active = rates
          .filter((rate) => rate.is_active && rate.effective_from <= today && (!rate.effective_to || rate.effective_to >= today))
          .sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0]
          ?? rates.sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0];

        if (!active) return;

        setRateId(active.venue_rate_id);
        setLoadedEffectiveFrom(active.effective_from);
        setRateEffectiveFrom(active.effective_from);
        setPricingBasis(active.pricing_basis);
        setBaseAmount(
          active.pricing_basis === "hourly"
            ? (active.hourly_rate ?? "")
            : (active.daily_rate ?? ""),
        );
        setOvertimeRate(active.overtime_rate ?? "");
        setOvertimePolicy(active.overtime_policy || defaultOvertimePolicy);
        setIncludedHours(active.included_hours);
        setOvertimeResources(
          (active.charges ?? [])
            .filter((charge) => charge.unit === "per_overtime_hour")
            .map((charge) => ({
              resource_name: charge.charge_name,
              overtime_rate: String(charge.amount ?? ""),
            })),
        );
        setKeptCharges(
          (active.charges ?? [])
            .filter((charge) => charge.unit !== "per_overtime_hour")
            .map((charge) => ({
              charge_name: charge.charge_name,
              charge_type: charge.charge_type,
              amount: String(charge.amount ?? ""),
              unit: charge.unit as KeptCharge["unit"],
              is_active: charge.is_active,
              venue_resource_id: charge.venue_resource_id,
            })),
        );
      })
      .catch(() => undefined);

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

  const updateResource = (
    index: number,
    field: keyof VenueResourceInput,
    value: string,
  ) => {
    setResources((previous) =>
      previous.map((resource, i) =>
        i === index ? { ...resource, [field]: value } : resource,
      ),
    );
  };

  const addOvertimeResource = () => {
    setOvertimeResources((previous) => [
      ...previous,
      { resource_name: "", overtime_rate: "" },
    ]);
  };

  const updateOvertimeResource = (
    index: number,
    field: keyof OvertimeResourceRate,
    value: string,
  ) => {
    setOvertimeResources((previous) =>
      previous.map((resource, i) =>
        i === index ? { ...resource, [field]: value } : resource,
      ),
    );
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

    if (baseAmount !== "" && Number(baseAmount) < 0) {
      clientErrors["rate.base_amount"] = "Enter a base rental of zero or more.";
    }

    if (overtimeRate !== "" && Number(overtimeRate) < 0) {
      clientErrors["rate.overtime_rate"] = "Enter an overtime rate of zero or more.";
    }

    if (baseAmount === "" && (overtimeRate !== "" || overtimeResources.length > 0)) {
      clientErrors["rate.base_amount"] = "Enter the base rental with the overtime rate.";
    }

    overtimeResources.forEach((resource, index) => {
      if (!resource.resource_name.trim()) {
        clientErrors[`rate.resources.${index}.resource_name`] = "Resource name is required.";
      }
      if (resource.overtime_rate === "" || Number(resource.overtime_rate) < 0) {
        clientErrors[`rate.resources.${index}.overtime_rate`] =
          "Enter an overtime rate of zero or more.";
      }
    });

    resources.forEach((resource, index) => {
      if (!resource.resource_name.trim()) {
        clientErrors[`resources.${index}.resource_name`] = "Resource name is required.";
      }
    });

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

    resources.forEach((resource, index) => {
      if (resource.resource_id) {
        formData.append(`resources[${index}][resource_id]`, String(resource.resource_id));
      }
      formData.append(`resources[${index}][resource_name]`, resource.resource_name.trim());
      formData.append(
        `resources[${index}][total_quantity]`,
        resource.total_quantity === null || resource.total_quantity === undefined
          ? ""
          : String(resource.total_quantity),
      );
      formData.append(`resources[${index}][availability_type]`, resource.availability_type);
      formData.append(`resources[${index}][condition]`, resource.condition);
      formData.append(
        `resources[${index}][coordination_office]`,
        resource.coordination_office ?? "",
      );
      formData.append(`resources[${index}][notes]`, resource.notes ?? "");
    });

    try {
      setLoading(true);

      const response = await VenueService.updateVenue(venue.venue_id, formData);

      if (response.status === 200 && baseAmount !== "") {
        const charges = [
          ...keptCharges.map((charge) => ({
            charge_name: charge.charge_name,
            charge_type: charge.charge_type,
            amount: charge.amount,
            unit: charge.unit,
            is_active: charge.is_active,
            venue_resource_id: charge.venue_resource_id,
          })),
          ...overtimeResources.map((resource) => ({
            charge_name: resource.resource_name.trim(),
            charge_type: "equipment" as const,
            amount: resource.overtime_rate,
            unit: "per_overtime_hour" as const,
            is_active: true,
            venue_resource_id: null,
          })),
        ];
        const ratePayload = {
          pricing_basis: pricingBasis,
          hourly_rate: pricingBasis === "hourly" ? baseAmount : null,
          daily_rate: pricingBasis === "daily" ? baseAmount : null,
          overtime_rate: overtimeRate === "" ? 0 : overtimeRate,
          overtime_policy: overtimePolicy.trim(),
          included_hours: includedHours,
          effective_from: rateEffectiveFrom,
          is_active: true,
          charges,
        };

        if (rateId && rateEffectiveFrom === loadedEffectiveFrom) {
          await VenueService.updateRate(venue.venue_id, rateId, ratePayload);
        } else {
          await VenueService.storeRate(venue.venue_id, ratePayload);
        }
      }

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
                Update venue information, overtime rates, resources, and the person in charge.
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

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Availability
              </h3>
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

          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Overtime Rates
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monday to Friday, 8:00 AM to 5:00 PM is regular time. Saturday, Sunday, time before 8:00 AM, and time from 5:00 PM onward are overtime.
            </p>
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/40">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Regular time</label>
                  <input value="Monday–Friday, 8:00 AM – 5:00 PM" readOnly className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Billing basis</label>
                  <select
                    value={pricingBasis}
                    onChange={(e) => setPricingBasis(e.target.value as "hourly" | "daily")}
                    className={inputClass}
                  >
                    <option value="hourly">Hourly rental</option>
                    <option value="daily">Daily rental</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    {pricingBasis === "hourly" ? "Base rental per hour" : "Base rental per day"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    className={inputClass}
                  />
                  {errors["rate.base_amount"] && (
                    <p className="mt-1 text-xs text-red-500">{errors["rate.base_amount"]}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Overtime rate per hour</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overtimeRate}
                    onChange={(e) => setOvertimeRate(e.target.value)}
                    className={inputClass}
                  />
                  {errors["rate.overtime_rate"] && (
                    <p className="mt-1 text-xs text-red-500">{errors["rate.overtime_rate"]}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Effective date</label>
                  <input
                    type="date"
                    value={rateEffectiveFrom}
                    onChange={(e) => setRateEffectiveFrom(e.target.value)}
                    className={inputClass}
                  />
                  {errors.effective_from && (
                    <p className="mt-1 text-xs text-red-500">{errors.effective_from}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Overtime note / policy</label>
                  <textarea
                    value={overtimePolicy}
                    onChange={(e) => setOvertimePolicy(e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resource overtime rates
                </p>
                <button
                  type="button"
                  onClick={addOvertimeResource}
                  className="flex items-center gap-2 rounded-xl bg-[#003B5C] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#00679E]"
                >
                  <FiPlus />
                  Add
                </button>
              </div>
              {overtimeResources.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No overtime resource rates yet. Use Add to charge a resource for each overtime hour.
                </p>
              )}
              {overtimeResources.map((resource, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] dark:border-gray-700 dark:bg-gray-900"
                >
                  <div>
                    <label className={labelClass}>Resource name</label>
                    <input
                      value={resource.resource_name}
                      onChange={(e) => updateOvertimeResource(index, "resource_name", e.target.value)}
                      className={inputClass}
                    />
                    {errors[`rate.resources.${index}.resource_name`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`rate.resources.${index}.resource_name`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Rate per overtime hour</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={resource.overtime_rate}
                      onChange={(e) => updateOvertimeResource(index, "overtime_rate", e.target.value)}
                      className={inputClass}
                    />
                    {errors[`rate.resources.${index}.overtime_rate`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`rate.resources.${index}.overtime_rate`]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOvertimeResources((previous) => previous.filter((_, i) => i !== index))
                      }
                      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <FiTrash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
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
                onClick={() => setResources((previous) => [...previous, emptyResource()])}
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
                key={resource.resource_id ?? `new-${index}`}
                className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#003B5C] dark:text-[#0095D9]">
                    Resource #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResources((previous) => previous.filter((_, i) => i !== index))}
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
                      onChange={(e) => updateResource(index, "resource_name", e.target.value)}
                      className={inputClass}
                    />
                    {errors[`resources.${index}.resource_name`] && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors[`resources.${index}.resource_name`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={resource.total_quantity ?? ""}
                      onChange={(e) =>
                        setResources((previous) =>
                          previous.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  total_quantity: e.target.value === "" ? null : Number(e.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Availability</label>
                    <select
                      value={resource.availability_type}
                      onChange={(e) => updateResource(index, "availability_type", e.target.value)}
                      className={inputClass}
                    >
                      <option value="available">Available</option>
                      <option value="consult_required">Consult required</option>
                      <option value="borrowed">Borrowed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Condition</label>
                    <select
                      value={resource.condition}
                      onChange={(e) => updateResource(index, "condition", e.target.value)}
                      className={inputClass}
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="damaged">Damaged</option>
                      <option value="not_applicable">Not applicable</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Coordination office</label>
                    <input
                      value={resource.coordination_office ?? ""}
                      onChange={(e) => updateResource(index, "coordination_office", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Notes</label>
                    <input
                      value={resource.notes ?? ""}
                      onChange={(e) => updateResource(index, "notes", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {venue && (
            <VenueMaintenanceSection
              venueId={venue.venue_id}
              onChanged={onSuccess}
            />
          )}

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