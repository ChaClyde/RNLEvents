import { useEffect, useMemo, useRef, useState } from "react";
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
  FiCheckCircle,
  FiFile,
  FiTrash2,
} from "react-icons/fi";

import type {
  ConflictSuggestion,
  EventBookingColumns,
  EventBookingFeeSnapshot,
  EventBookingFormData,
  EventBookingResourceInput,
  VenueConflict,
} from "../../../interfaces/EventBookingColumns";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import {
  getToday,
  parseApiError,
} from "../../../interfaces/EventBookingHelpers";
import {
  buildInitialSchedule,
  buildOccurrences,
  buildSchedulePayload,
  bookingWindowError,
  maintenanceBookingError,
  validateSchedule,
  type ScheduleState,
  type TimeRange,
} from "../../../interfaces/EventBookingSchedule";
import EventBookingService from "../../../services/EventBookingService";
import SignatureService from "../../../services/SignatureService";
import { Link } from "react-router-dom";
import { Permission, RoleSlug } from "../../../permissions";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAuth } from "../../../contexts/AuthContext";
import VenueSelect, {
  VenueDetailsCard,
} from "../../Venue/components/VenueSelect";
import BookingResourcePicker from "./BookingResourcePicker";
import SchedulePicker from "./SchedulePicker";
import ScheduleConflictPanel from "./ScheduleConflictPanel";
import VenueCalendarModal from "./VenueCalendarModal";

const isFcuGym = (name?: string | null) => {
  const normalized = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized === "fcu gym" || normalized === "gym";
};

const GYM_RESPONSIBILITIES = [
  "Maintain cleanliness.",
  "Protect facilities and equipment.",
  "Negligent damage will be charged to the responsible organization, department, or group.",
];

const ACCEPTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export interface EventBookingAttachmentDraft {
  file: File | null;
  removeExisting: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  onSubmit: (
    data: EventBookingFormData,
    attachment: EventBookingAttachmentDraft,
  ) => Promise<void>;
  isSubmitting?: boolean;
  uploadProgress?: number | null;
}

// ============================================================
// INITIAL VALUES (schedule is handled by ScheduleState)
// ============================================================

const buildInitialState = (booking?: EventBookingColumns | null) => ({
  venue_id: booking ? String(booking.venue_id) : "",
  purpose: booking?.purpose ?? "",
  description: booking?.description ?? "",

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
  (booking?.resources ?? [])
    .filter((resource) => resource.resource_id !== null)
    .map((resource) => ({
      resource_id: resource.resource_id,
      resource_name: resource.resource_name,
      quantity: resource.quantity,
      notes: resource.notes,
    }));

// Error keys that belong to the schedule section
const isScheduleErrorKey = (key: string) =>
  [
    "schedule",
    "schedule_type",
    "date_start",
    "date_end",
    "weekdays",
    "time_start",
    "time_end",
  ].includes(key) ||
  key.startsWith("dates") ||
  key.startsWith("overrides") ||
  key.startsWith("excluded_dates");

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
  uploadProgress = null,
}: EventBookingFormProps) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canDesignateUniversityWide = can(
    Permission.EVENT_BOOKINGS_DESIGNATE_UNIVERSITY_WIDE,
  );
  const [formData, setFormData] = useState<FormState>(() =>
    buildInitialState(booking),
  );
  const [schedule, setSchedule] = useState<ScheduleState>(() =>
    buildInitialSchedule(booking),
  );
  const [resources, setResources] = useState<EventBookingResourceInput[]>(() =>
    buildInitialResources(booking),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (booking || !user?.office_id) return;

    setFormData((previous) => ({
      ...previous,
      office_id: String(user.office_id),
    }));
  }, [booking, user?.office_id]);

  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feeQuote, setFeeQuote] = useState<EventBookingFeeSnapshot | null>(null);
  const signsOnSubmit =
    user?.role?.slug === RoleSlug.FACULTY_STAFF ||
    user?.role?.slug === RoleSlug.STUDENT_REPUBLIC;
  const [hasSignature, setHasSignature] = useState(true);

  useEffect(() => {
    if (!signsOnSubmit) return;
    void SignatureService.show()
      .then((response) => setHasSignature(Boolean(response.data.data.has_signature)))
      .catch(() => setHasSignature(false));
  }, [signsOnSubmit]);

  // Conflict check
  const [conflicts, setConflicts] = useState<VenueConflict[]>([]);
  const [suggestions, setSuggestions] = useState<ConflictSuggestion[]>([]);
  const [checking, setChecking] = useState(false);
  const checkId = useRef(0);

  const [scheduleRestrictions, setScheduleRestrictions] = useState<string[]>([]);
  const [reservationSpan, setReservationSpan] = useState<
    "standard" | "whole_semester" | "whole_summer"
  >(
    booking?.reservation_span === "whole_semester" ||
      booking?.reservation_span === "whole_summer"
      ? booking.reservation_span
      : "standard",
  );
  const [responsibilitiesAcknowledged, setResponsibilitiesAcknowledged] =
    useState(Boolean(booking?.gym_responsibilities_acknowledged));
  const [universityWide, setUniversityWide] = useState(
    Boolean(booking?.university_wide_activity) && canDesignateUniversityWide,
  );
  const [scheduleNote, setScheduleNote] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
  const [removeExistingAttachment, setRemoveExistingAttachment] =
    useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const existingAttachment = booking?.attachments?.[0] ?? null;

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

  const recognizedOffice = useMemo(() => {
    const officeId = booking?.office_id ?? user?.office_id;
    const fromList = offices.find((office) => office.office_id === officeId);

    if (fromList) {
      return fromList.office_code
        ? `${fromList.office_name} (${fromList.office_code})`
        : fromList.office_name;
    }

    if (user?.office && user.office.office_id === officeId) {
      return user.office.office_code
        ? `${user.office.office_name} (${user.office.office_code})`
        : user.office.office_name;
    }

    return "No office is assigned to your account";
  }, [booking?.office_id, offices, user]);

  const selectedVenue = useMemo(
    () =>
      venueOptions.find(
        (venue) => venue.venue_id === Number(formData.venue_id),
      ) ?? null,
    [venueOptions, formData.venue_id],
  );
  const gymBooking = isFcuGym(selectedVenue?.venue);

  // --------------------------------------
  // SCHEDULE (derived)
  // --------------------------------------

  const occurrences = useMemo(() => buildOccurrences(schedule), [schedule]);

  const schedulePayload = useMemo(
    () => buildSchedulePayload(schedule, occurrences),
    [schedule, occurrences],
  );

  const scheduleErrors = useMemo(() => {
    const next = validateSchedule(schedule, occurrences, today);
    const windowError = bookingWindowError(occurrences, gymBooking);

    if (windowError) next.time_start = windowError;

    const closed = maintenanceBookingError(
      selectedVenue?.maintenance,
      occurrences,
    );

    if (closed) next.venue_id = closed;

    return next;
  }, [schedule, occurrences, today, gymBooking, selectedVenue]);

  const scheduleReady = Object.keys(scheduleErrors).length === 0;

  const conflictDates = useMemo(
    () => new Set(conflicts.map((c) => c.date)),
    [conflicts],
  );

  // Server messages that have no field of their own in SchedulePicker
  const scheduleServerMessages = Object.entries(errors)
    .filter(
      ([key]) =>
        key.startsWith("dates") ||
        key.startsWith("overrides") ||
        key.startsWith("excluded_dates"),
    )
    .map(([, message]) => message);

  // --------------------------------------
  // CONFLICT CHECK (debounced dry run)
  // --------------------------------------

  const checkKey = JSON.stringify({
    venue: formData.venue_id,
    schedule: schedulePayload,
    ready: scheduleReady,
    universityWide,
    reservationSpan,
  });

  useEffect(() => {
    if (!formData.venue_id || !scheduleReady) {
      checkId.current += 1;
      setConflicts([]);
      setSuggestions([]);
      setChecking(false);
      return;
    }

    const id = ++checkId.current;
    setChecking(true);

    const handle = window.setTimeout(async () => {
      try {
        const response = await EventBookingService.checkAvailability({
          ...schedulePayload,
          venue_id: Number(formData.venue_id),
          exclude_event_booking_id: booking?.event_booking_id,
          university_wide_activity: universityWide,
          reservation_span: reservationSpan,
        });

        if (id !== checkId.current) return;

        setConflicts(response.data.conflicts ?? []);
        setSuggestions(response.data.suggestions ?? []);
        setScheduleRestrictions(response.data.schedule_restrictions ?? []);
      } catch {
        // The server checks again on submit, so a failed dry run is not blocking
        if (id !== checkId.current) return;

        setConflicts([]);
        setSuggestions([]);
        setScheduleRestrictions([]);
      } finally {
        if (id === checkId.current) setChecking(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKey, booking?.event_booking_id, universityWide, reservationSpan]);

  useEffect(() => {
    if (!formData.venue_id || !scheduleReady) {
      setFeeQuote(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const response = await EventBookingService.previewFee({
          ...schedulePayload,
          venue_id: Number(formData.venue_id),
          resources: resources
            .filter((resource) => resource.resource_id)
            .map((resource) => ({
              resource_id: Number(resource.resource_id),
              quantity: Number(resource.quantity || 1),
            })),
        });
        setFeeQuote(response.data.data);
      } catch {
        setFeeQuote(null);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [checkKey, resources, formData.venue_id, schedulePayload, scheduleReady]);

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

  const clearScheduleErrors = () => {
    setErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([key]) => !isScheduleErrorKey(key)),
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

  const handleScheduleChange = (next: ScheduleState) => {
    setSchedule(next);
    setScheduleNote("");
    clearScheduleErrors();
    clearError("venue_id");
    setServerError("");
  };

  // Replace one conflicting date with a free date.
  // A single date cannot be swapped inside a range/weekly pattern, so the
  // schedule becomes hand-picked dates, each keeping its own time.
  const handlePickAlternative = (conflictDate: string, newDate: string) => {
    const dates: string[] = [];
    const overrides: Record<string, TimeRange> = {};

    occurrences.forEach((o) => {
      const date = o.date === conflictDate ? newDate : o.date;

      if (!dates.includes(date)) dates.push(date);

      if (
        o.time_start !== schedule.time_start ||
        o.time_end !== schedule.time_end
      ) {
        overrides[date] = {
          time_start: o.time_start,
          time_end: o.time_end,
        };
      }
    });

    setSchedule({
      ...schedule,
      type: "custom",
      customDates: dates.sort(),
      weekdays: [],
      excluded: [],
      overrides,
    });

    setScheduleNote(
      schedule.type === "custom"
        ? ""
        : "Your schedule is now a list of hand-picked dates so one date could be changed.",
    );
    clearScheduleErrors();
  };

  // --------------------------------------
  // VALIDATION
  // --------------------------------------

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = { ...scheduleErrors };

    if (!formData.venue_id) {
      newErrors.venue_id = "Please select a venue.";
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = "Event purpose is required.";
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
      newErrors.office_id = "Your account has no office assigned.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.tel_number.trim()) {
      newErrors.tel_number = "Contact number is required.";
    }

    if (gymBooking && !responsibilitiesAcknowledged) {
      newErrors.gym_responsibilities_acknowledged =
        "Acknowledge the Gym responsibilities before submitting.";
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

    if (!validateForm()) return;

    if (signsOnSubmit && !hasSignature) {
      setServerError(
        "Save your e-signature in My Profile. It is attached automatically when you submit this booking.",
      );
      return;
    }

    if (checking) {
      setServerError("Still checking the venue schedule. Please try again.");
      return;
    }

    if (conflicts.length > 0) {
      setServerError(
        "The venue is already booked on some of your dates. Pick another date or change the time.",
      );
      return;
    }

    if (scheduleRestrictions.length > 0) {
      setServerError(scheduleRestrictions[0]);
      return;
    }

    const payload: EventBookingFormData = {
      ...schedulePayload,

      venue_id: Number(formData.venue_id),

      purpose: formData.purpose.trim(),
      description: formData.description.trim() || null,

      expected_attendees: Number(formData.expected_attendees),

      resources: resources
        .filter((resource) => resource.resource_id !== null)
        .map((resource) => ({
        resource_id: resource.resource_id,
        resource_name: resource.resource_name.trim(),
        quantity: resource.quantity,
        notes: null,
      })),

      requested_by: formData.requested_by.trim(),
      office_id: Number(formData.office_id),

      email: formData.email.trim(),
      tel_number: formData.tel_number.trim(),
      university_wide_activity: gymBooking && universityWide,
      reservation_span: gymBooking ? reservationSpan : "standard",
      gym_responsibilities_acknowledged:
        gymBooking && responsibilitiesAcknowledged,
    };

    try {
      await onSubmit(payload, {
        file: attachmentFile,
        removeExisting: removeExistingAttachment,
      });
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

        {signsOnSubmit && !hasSignature && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">
            Save your e-signature in{" "}
            <Link to="/profile" className="font-semibold underline">
              My Profile
            </Link>{" "}
            before booking. It is placed on the booking slip automatically.
          </div>
        )}

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
                error={scheduleErrors.venue_id || errors.venue_id}
              />

              {!hasSelectableVenue && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  No available venues found.
                </p>
              )}

              {selectedVenue && <VenueDetailsCard venue={selectedVenue} />}
              {gymBooking && (
                <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-semibold">FCU Gym schedule</p>
                  <p>Monday, Tuesday, Thursday, and Friday: 6:00 AM–8:00 AM and 4:00 PM–6:00 PM.</p>
                  <p>Wednesday and Saturday: 6:00 AM–6:00 PM.</p>
                  <p>Sunday is not part of the permitted Gym schedule.</p>
                  <p>Use is first come, first served. A whole-semester or whole-summer reservation is strongly discouraged.</p>
                  <label className="block">
                    Reservation length
                    <select
                      value={reservationSpan}
                      onChange={(event) =>
                        setReservationSpan(
                          event.target.value as
                            | "standard"
                            | "whole_semester"
                            | "whole_summer",
                        )
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    >
                      <option value="standard">Selected dates</option>
                      <option value="whole_semester">Whole semester</option>
                      <option value="whole_summer">Whole summer</option>
                    </select>
                  </label>
                  {reservationSpan === "whole_semester" && (
                    <p>A whole-semester Gym reservation is strongly discouraged. The request can still be submitted.</p>
                  )}
                  {reservationSpan === "whole_summer" && (
                    <p>A whole-summer Gym reservation is strongly discouraged. The request can still be submitted.</p>
                  )}
                  <div>
                    <p className="font-semibold">Responsibilities</p>
                    <ul className="mt-1 list-disc pl-5">
                      {GYM_RESPONSIBILITIES.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <label className="mt-2 flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={responsibilitiesAcknowledged}
                        onChange={(event) =>
                          setResponsibilitiesAcknowledged(event.target.checked)
                        }
                        className="mt-1"
                      />
                      <span>I acknowledge these responsibilities for this Gym booking.</span>
                    </label>
                    <ErrorMessage message={errors.gym_responsibilities_acknowledged} />
                  </div>
                  {canDesignateUniversityWide && (
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={universityWide}
                        onChange={(event) => setUniversityWide(event.target.checked)}
                        className="mt-1"
                      />
                      <span>This is a University-wide activity. The permitted Gym schedule does not apply.</span>
                    </label>
                  )}
                  {scheduleRestrictions.length > 0 && !universityWide && (
                    <p>{scheduleRestrictions[0]}</p>
                  )}
                </div>
              )}
              {feeQuote && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    Estimated charges
                  </p>
                  {(
                    [
                      ["venue", "Base facility rental"],
                      ["overtime", "Overtime"],
                      ["facility", "Additional facility charges"],
                      ["equipment", "Equipment charges"],
                      ["service", "Additional service charges"],
                      ["additional", "Other additional charges"],
                    ] as const
                  ).map(([type, label]) => {
                    const amount = (feeQuote.lines ?? [])
                      .filter((line) => line.line_type === type)
                      .reduce((sum, line) => sum + Number(line.line_amount), 0);
                    const shown =
                      feeQuote.total_amount == null
                        ? "Not yet configured"
                        : amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          });
                    return (
                      <p key={type} className="mt-1 flex justify-between gap-3">
                        <span>{label}</span>
                        <span>{shown}</span>
                      </p>
                    );
                  })}
                  <p className="mt-2 flex justify-between gap-3 font-semibold text-gray-800 dark:text-gray-100">
                    <span>Estimated total</span>
                    <span>
                      {feeQuote.total_amount == null
                        ? "Not yet configured"
                        : Number(feeQuote.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                    </span>
                  </p>
                  <p className="mt-1 text-xs">
                    {feeQuote.calculation_note} This is a server estimate. It is not a finance-verified fee, and a later rate change does not change a booking that was already saved.
                  </p>
                </div>
              )}
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FiClock className="text-[#0095D9]" size={20} />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Event Schedule
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  disabled={!selectedVenue}
                  title={
                    selectedVenue
                      ? "See which dates are already booked"
                      : "Select a venue first"
                  }
                  className="flex items-center gap-1.5 rounded-xl border border-[#0095D9]/30 px-3 py-2 text-xs font-semibold text-[#00679E] transition hover:bg-[#0095D9]/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#38BDF8]"
                >
                  <FiCalendar size={14} />
                  View venue calendar
                </button>
              </div>

              <SchedulePicker
                value={schedule}
                onChange={handleScheduleChange}
                occurrences={occurrences}
                conflictDates={conflictDates}
                errors={{ ...errors, ...scheduleErrors }}
                extraMessages={[
                  ...scheduleServerMessages,
                  ...(gymBooking ? [] : scheduleRestrictions),
                ]}
                timeHint={
                  gymBooking
                    ? undefined
                    : "Bookings are allowed only from 7:00 AM to 10:00 PM."
                }
                today={today}
                disabled={isSubmitting}
              />

              {scheduleNote && (
                <p className="mt-3 rounded-xl bg-[#0095D9]/10 px-4 py-2.5 text-xs text-[#00679E] dark:text-[#38BDF8]">
                  {scheduleNote}
                </p>
              )}

              {/* AVAILABILITY STATUS */}
              {selectedVenue && scheduleReady && (
                <div className="mt-4 space-y-4">
                  {checking ? (
                    <p className="text-xs text-gray-400">
                      Checking venue availability...
                    </p>
                  ) : conflicts.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300">
                      <FiCheckCircle className="shrink-0" />
                      The venue is free on all {occurrences.length}{" "}
                      {occurrences.length === 1 ? "date" : "dates"}.
                    </div>
                  ) : (
                    <ScheduleConflictPanel
                      conflicts={conflicts}
                      suggestions={suggestions}
                      onPickAlternative={handlePickAlternative}
                      onOpenCalendar={() => setCalendarOpen(true)}
                    />
                  )}
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
                  <label className={labelClass}>Requesting Office</label>

                  <input
                    type="text"
                    value={recognizedOffice}
                    readOnly
                    className={inputClass}
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    Taken from the office on your account.
                  </p>

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

            <section className={sectionClass}>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <FiFile className="text-[#0095D9]" />
                Letter of Request
              </h3>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Attach a PDF, JPG, or PNG up to 5 MB. You can replace or remove
                it before submitting this request.
              </p>

              {existingAttachment && !removeExistingAttachment && !attachmentFile ? (
                <div className="mb-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {existingAttachment.original_filename}
                  </p>
                  <p className="text-gray-500">
                    {formatFileSize(existingAttachment.file_size)}
                  </p>
                </div>
              ) : null}

              {attachmentFile ? (
                <div className="mb-3 rounded-xl border border-[#0095D9]/30 bg-[#0095D9]/5 p-3 text-sm">
                  <p className="font-semibold text-[#003B5C] dark:text-white">
                    {attachmentFile.name}
                  </p>
                  <p className="text-gray-500">
                    {formatFileSize(attachmentFile.size)}
                  </p>
                  {attachmentFile.type.startsWith("image/") && attachmentPreviewUrl ? (
                    <img
                      src={attachmentPreviewUrl}
                      alt="Letter preview"
                      className="mt-3 max-h-48 rounded-lg border border-gray-200"
                    />
                  ) : null}
                  {attachmentFile.type === "application/pdf" && attachmentPreviewUrl ? (
                    <iframe
                      title="Letter preview"
                      src={attachmentPreviewUrl}
                      className="mt-3 h-56 w-full rounded-lg border border-gray-200"
                    />
                  ) : null}
                </div>
              ) : null}

              {uploadProgress !== null ? (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-medium text-[#00679E]">
                    Uploading letter... {uploadProgress}%
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-[#0095D9]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-xl bg-[#00679E] px-4 py-2 text-sm font-semibold text-white">
                  {attachmentFile || existingAttachment
                    ? "Replace letter"
                    : "Upload letter"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      if (!file) return;
                      const allowed =
                        ACCEPTED_ATTACHMENT_TYPES.includes(file.type) ||
                        /\.(pdf|jpe?g|png)$/i.test(file.name);
                      if (!allowed) {
                        setAttachmentError("Use a PDF, JPG, or PNG file.");
                        return;
                      }
                      if (file.size > MAX_ATTACHMENT_BYTES) {
                        setAttachmentError("The letter must be 5 MB or smaller.");
                        return;
                      }
                      if (attachmentPreviewUrl) {
                        URL.revokeObjectURL(attachmentPreviewUrl);
                      }
                      setAttachmentError("");
                      setAttachmentFile(file);
                      setAttachmentPreviewUrl(URL.createObjectURL(file));
                      setRemoveExistingAttachment(false);
                    }}
                  />
                </label>
                {attachmentFile || (existingAttachment && !removeExistingAttachment) ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (attachmentPreviewUrl) {
                        URL.revokeObjectURL(attachmentPreviewUrl);
                      }
                      setAttachmentFile(null);
                      setAttachmentPreviewUrl("");
                      setRemoveExistingAttachment(Boolean(existingAttachment));
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                  >
                    <FiTrash2 size={14} />
                    Remove
                  </button>
                ) : null}
              </div>
              <ErrorMessage message={attachmentError} />
            </section>

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
              disabled={
                isSubmitting ||
                !hasSelectableVenue ||
                checking ||
                conflicts.length > 0
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#00679E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003B5C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSave size={16} />
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>

      {/* VENUE CALENDAR POP-UP */}
      {calendarOpen && selectedVenue && (
        <VenueCalendarModal
          venueId={selectedVenue.venue_id}
          venueName={selectedVenue.venue}
          excludeBookingId={booking?.event_booking_id}
          initialDate={conflicts[0]?.date ?? occurrences[0]?.date}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  );
};

export default EventBookingForm;
