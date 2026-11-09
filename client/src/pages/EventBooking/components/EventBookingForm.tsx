import { useEffect, useMemo, useState } from "react";
import {
  FiX,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiUser,
  FiPackage,
  FiClock,
  FiSave,
  FiAlertCircle,
} from "react-icons/fi";

import type {
  EventBookingColumns,
  EventBookingFormData,
  EventBookingResourceInput,
} from "../../../interfaces/EventBookingColumns";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import {
  calculateDays,
  getToday,
  parseApiError,
  toTimeInput,
} from "../../../interfaces/EventBookingHelpers";
import VenueSelect, {
  VenueDetailsCard,
} from "../../Venue/components/VenueSelect";
import BookingResourcePicker from "./BookingResourcePicker";
import AvailabilityService from "../../../services/AvailabilityService";
import type { ScheduleConflict } from "../../../interfaces/EventBookingHelpers";

// ============================================================
// PROPS
// ============================================================

interface EventBookingFormProps {
  title: string;
  subtitle: string;
  subtitleExtra?: string;
  notice: { title: string; text: string };
  submitLabel: string;
  submittingLabel: string;

  venues: VenueColumns[];
  offices: OfficeColumns[];

  // Provided when editing
  booking?: EventBookingColumns | null;

  onClose: () => void;
  // Must throw on failure so this form can show the server errors
  onSubmit: (data: EventBookingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

// ============================================================
// INITIAL VALUES
// ============================================================

const buildInitialState = (booking?: EventBookingColumns | null) => ({
  venue_id: booking ? String(booking.venue_id) : "",
  purpose: booking?.purpose ?? "",
  description: booking?.description ?? "",

  date_start: booking?.date_start?.slice(0, 10) ?? "",
  date_end: booking?.date_end?.slice(0, 10) ?? "",
  time_start: toTimeInput(booking?.time_start),
  time_end: toTimeInput(booking?.time_end),

  expected_attendees: booking ? String(booking.expected_attendees ?? 1) : "1",

  requested_by: booking?.requested_by ?? "",
  office_id: booking ? String(booking.office_id) : "",
  email: booking?.email ?? "",
  tel_number: booking?.tel_number ?? "",
});

type FormState = ReturnType<typeof buildInitialState>;

const buildInitialResources = (
  booking?: EventBookingColumns | null,
): EventBookingResourceInput[] =>
  (booking?.resources ?? []).map((resource) => ({
    resource_id: resource.resource_id,
    resource_name: resource.resource_name,
    quantity: resource.quantity,
    notes: resource.notes,
  }));

// ============================================================
// STYLES
// ============================================================

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const labelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const sectionClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900";

const ErrorMessage = ({ message }: { message?: string }) => {
  if (!message) return null;

  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <FiAlertCircle size={13} />
      {message}
    </p>
  );
};

// ============================================================
// COMPONENT
// ============================================================

const EventBookingForm = ({
  title,
  subtitle,
  subtitleExtra,
  notice,
  submitLabel,
  submittingLabel,
  venues,
  offices,
  booking = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EventBookingFormProps) => {
  const [formData, setFormData] = useState<FormState>(() =>
    buildInitialState(booking),
  );
  const [resources, setResources] = useState<EventBookingResourceInput[]>(() =>
    buildInitialResources(booking),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityConflicts, setAvailabilityConflicts] = useState<
    ScheduleConflict[]
  >([]);
  const [slotAvailable, setSlotAvailable] = useState(true);

  const today = getToday();

  // --------------------------------------
  // OPTIONS
  // --------------------------------------

  const venueOptions = useMemo(
    () => venues.filter((venue) => !venue.is_deleted),
    [venues],
  );

  const hasSelectableVenue = useMemo(
    () =>
      venueOptions.some(
        (venue) =>
          venue.status === "available" || venue.venue_id === booking?.venue_id,
      ),
    [venueOptions, booking?.venue_id],
  );

  const activeOffices = useMemo(
    () =>
      offices.filter(
        (office) =>
          (office.status === "active" && !office.is_deleted) ||
          office.office_id === booking?.office_id,
      ),
    [offices, booking?.office_id],
  );

  const selectedVenue = useMemo(
    () =>
      venueOptions.find(
        (venue) => venue.venue_id === Number(formData.venue_id),
      ) ?? null,
    [venueOptions, formData.venue_id],
  );

  const totalDays = calculateDays(formData.date_start, formData.date_end);

  useEffect(() => {
    if (
      !formData.venue_id ||
      !formData.date_start ||
      !formData.date_end ||
      !formData.time_start ||
      !formData.time_end
    ) {
      setAvailabilityMessage("");
      setAvailabilityConflicts([]);
      setSlotAvailable(true);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const response = await AvailabilityService.checkVenue({
          venue_id: Number(formData.venue_id),
          date_start: formData.date_start,
          date_end: formData.date_end,
          time_start: formData.time_start,
          time_end: formData.time_end,
          exclude_event_booking_id: booking?.event_booking_id,
        });
        setSlotAvailable(response.data.available);
        setAvailabilityMessage(response.data.message);
        setAvailabilityConflicts(response.data.conflicts ?? []);
      } catch {
        setSlotAvailable(true);
        setAvailabilityMessage("");
        setAvailabilityConflicts([]);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [
    formData.venue_id,
    formData.date_start,
    formData.date_end,
    formData.time_start,
    formData.time_end,
    booking?.event_booking_id,
  ]);

  // Server messages about resources ("resources.0.quantity", ...)
  const resourceServerErrors = Object.entries(errors)
    .filter(([key]) => key.startsWith("resources."))
    .map(([, message]) => message);

  // --------------------------------------
  // HANDLERS
  // --------------------------------------

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearResourceErrors = () => {
    setErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.startsWith("resources")),
      ),
    );
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  // Each venue has its own resources, so the selection starts over
  const handleVenueChange = (venueId: string) => {
    if (venueId === formData.venue_id) return;

    setFormData((prev) => ({ ...prev, venue_id: venueId }));
    setResources([]);
    clearError("venue_id");
    clearResourceErrors();
  };

  const handleResourcesChange = (next: EventBookingResourceInput[]) => {
    setResources(next);
    clearResourceErrors();
  };

  // --------------------------------------
  // VALIDATION
  // --------------------------------------

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.venue_id) {
      newErrors.venue_id = "Please select a venue.";
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = "Event purpose is required.";
    }

    if (!formData.date_start) {
      newErrors.date_start = "Start date is required.";
    } else if (formData.date_start < today) {
      newErrors.date_start = "Start date cannot be in the past.";
    }

    if (!formData.date_end) {
      newErrors.date_end = "End date is required.";
    } else if (formData.date_start && formData.date_end < formData.date_start) {
      newErrors.date_end = "End date cannot be before start date.";
    }

    if (!formData.time_start) {
      newErrors.time_start = "Start time is required.";
    }

    if (!formData.time_end) {
      newErrors.time_end = "End time is required.";
    } else if (
      formData.time_start &&
      formData.time_end <= formData.time_start
    ) {
      // The backend requires end time after start time for every booking
      newErrors.time_end = "End time must be later than start time.";
    }

    const attendees = Number(formData.expected_attendees);

    if (
      !formData.expected_attendees ||
      !Number.isInteger(attendees) ||
      attendees < 1
    ) {
      newErrors.expected_attendees = "Expected attendees must be at least 1.";
    } else if (selectedVenue && attendees > selectedVenue.capacity) {
      newErrors.expected_attendees = `This venue only accommodates ${selectedVenue.capacity.toLocaleString()} persons.`;
    }

    const hasResourceProblem = resources.some((resource) => {
      if (!Number.isInteger(resource.quantity) || resource.quantity < 1) {
        return true;
      }

      if (resource.resource_id === null) {
        return !resource.resource_name.trim();
      }

      const venueResource = selectedVenue?.resources?.find(
        (item) => item.resource_id === resource.resource_id,
      );

      return (
        venueResource !== undefined &&
        venueResource.total_quantity !== null &&
        resource.quantity > venueResource.total_quantity
      );
    });

    if (hasResourceProblem) {
      newErrors.resources = "Please fix the highlighted resources.";
    }

    if (!formData.requested_by.trim()) {
      newErrors.requested_by = "Requestor name is required.";
    }

    if (!formData.office_id) {
      newErrors.office_id = "Please select a requesting office.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.tel_number.trim()) {
      newErrors.tel_number = "Contact number is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // --------------------------------------
  // SUBMIT
  // --------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    setSubmitted(true);

    if (!validateForm() || !slotAvailable) return;

    const payload: EventBookingFormData = {
      venue_id: Number(formData.venue_id),

      purpose: formData.purpose.trim(),
      description: formData.description.trim() || null,

      date_start: formData.date_start,
      date_end: formData.date_end,
      time_start: formData.time_start,
      time_end: formData.time_end,

      expected_attendees: Number(formData.expected_attendees),

      resources: resources.map((resource) => ({
        resource_id: resource.resource_id,
        resource_name: resource.resource_name.trim(),
        quantity: resource.quantity,
        notes: null,
      })),

      requested_by: formData.requested_by.trim(),
      office_id: Number(formData.office_id),

      email: formData.email.trim(),
      tel_number: formData.tel_number.trim(),
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      const { status, message, fieldErrors } = parseApiError(
        error,
        "Something went wrong while saving the booking.",
      );

      if (status === 422 && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);

        // Schedule conflicts arrive under venue_id and status rule
        // violations under status; show them where they are always visible
        setServerError(fieldErrors.venue_id ?? fieldErrors.status ?? "");
      } else {
        setServerError(message);
      }
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl dark:bg-gray-950">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-linear-to-r from-[#003B5C] via-[#00679E] to-[#0095D9] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>

            <p className="mt-1 text-sm text-white/75">{subtitle}</p>

            {subtitleExtra && (
              <p className="mt-1 text-xs text-white/70">{subtitleExtra}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label="Close form"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* SERVER ERROR */}
        {serverError && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {/* VENUE */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiMapPin className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Venue Information
                </h3>
              </div>

              <label className={labelClass}>
                Select Venue <span className="text-red-500">*</span>
              </label>

              <VenueSelect
                venues={venueOptions}
                value={formData.venue_id}
                onChange={handleVenueChange}
                allowedUnavailableId={booking?.venue_id}
                disabled={isSubmitting}
                error={errors.venue_id}
              />

              {!hasSelectableVenue && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  No available venues found.
                </p>
              )}

              {selectedVenue && <VenueDetailsCard venue={selectedVenue} />}
            </section>

            {/* EVENT DETAILS */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiCalendar className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Event Details
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Event Purpose <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => handleChange("purpose", e.target.value)}
                    placeholder="Enter event name or purpose"
                    maxLength={200}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.purpose} />
                </div>

                <div>
                  <label className={labelClass}>Description</label>

                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    rows={3}
                    placeholder="Provide additional information about the event..."
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.description} />
                </div>
              </div>
            </section>

            {/* SCHEDULE */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiClock className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Event Schedule
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Start Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    min={today}
                    value={formData.date_start}
                    onChange={(e) => handleChange("date_start", e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.date_start} />
                </div>

                <div>
                  <label className={labelClass}>
                    End Date <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    min={formData.date_start || today}
                    value={formData.date_end}
                    onChange={(e) => handleChange("date_end", e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.date_end} />
                </div>

                <div>
                  <label className={labelClass}>
                    Start Time <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => handleChange("time_start", e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.time_start} />
                </div>

                <div>
                  <label className={labelClass}>
                    End Time <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => handleChange("time_end", e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.time_end} />
                </div>
              </div>

              {totalDays > 0 && (
                <div className="mt-4 rounded-xl bg-[#0095D9]/10 px-4 py-3 text-sm text-[#00679E] dark:text-[#38BDF8]">
                  Total duration:{" "}
                  <strong>
                    {totalDays} {totalDays === 1 ? "day" : "days"}
                  </strong>
                </div>
              )}
            </section>

            {/* PARTICIPANTS */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiUsers className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Participants
                </h3>
              </div>

              <label className={labelClass}>
                Expected Attendees <span className="text-red-500">*</span>
              </label>

              <input
                type="number"
                min="1"
                max={selectedVenue?.capacity}
                step="1"
                value={formData.expected_attendees}
                onChange={(e) =>
                  handleChange("expected_attendees", e.target.value)
                }
                className={inputClass}
                disabled={isSubmitting}
              />

              {selectedVenue && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Maximum capacity: {selectedVenue.capacity.toLocaleString()}{" "}
                  persons
                </p>
              )}

              <ErrorMessage message={errors.expected_attendees} />
            </section>

            {/* RESOURCES */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiPackage className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Venue Resources & Equipment
                </h3>
              </div>

              <BookingResourcePicker
                venue={selectedVenue}
                value={resources}
                onChange={handleResourcesChange}
                disabled={isSubmitting}
                showErrors={submitted}
                errorMessages={resourceServerErrors}
              />

              <ErrorMessage message={errors.resources} />
            </section>

            {/* REQUESTOR */}
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <FiUser className="text-[#0095D9]" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Requestor Information
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Requested By <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.requested_by}
                    onChange={(e) =>
                      handleChange("requested_by", e.target.value)
                    }
                    placeholder="Full name"
                    maxLength={150}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.requested_by} />
                </div>

                <div>
                  <label className={labelClass}>
                    Requesting Office <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={formData.office_id}
                    onChange={(e) => handleChange("office_id", e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  >
                    <option value="">Select office</option>

                    {activeOffices.map((office) => (
                      <option key={office.office_id} value={office.office_id}>
                        {office.office_name}
                      </option>
                    ))}
                  </select>

                  <ErrorMessage message={errors.office_id} />
                </div>

                <div>
                  <label className={labelClass}>
                    Email Address <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="example@filamer.edu.ph"
                    maxLength={150}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.email} />
                </div>

                <div>
                  <label className={labelClass}>
                    Contact Number <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="tel"
                    value={formData.tel_number}
                    onChange={(e) => handleChange("tel_number", e.target.value)}
                    placeholder="09XXXXXXXXX"
                    maxLength={30}
                    className={inputClass}
                    disabled={isSubmitting}
                  />

                  <ErrorMessage message={errors.tel_number} />
                </div>
              </div>
            </section>

            {availabilityMessage && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  slotAvailable
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300"
                }`}
              >
                <p className="font-semibold">{availabilityMessage}</p>
                {availabilityConflicts.map((conflict, index) => (
                  <p key={`${conflict.id ?? "hidden"}-${index}`} className="mt-1 text-xs">
                    {conflict.purpose ?? "Reserved"} · {conflict.date_start} {conflict.time_start} - {conflict.date_end} {conflict.time_end}
                  </p>
                ))}
              </div>
            )}

            {/* NOTICE */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-1">{notice.text}</p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end dark:border-gray-700 dark:bg-gray-900 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !hasSelectableVenue || !slotAvailable}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#00679E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003B5C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSave size={16} />
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventBookingForm;
