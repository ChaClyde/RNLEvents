import type {
  EventBookingColumns,
  EventBookingFormData,
} from "../../../interfaces/EventBookingColumns";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";

import EventBookingForm, {
  type EventBookingAttachmentDraft,
} from "./EventBookingForm";

interface EventBookingEditProps {
  booking: EventBookingColumns;
  venues: VenueColumns[];
  offices: OfficeColumns[];
  onClose: () => void;
  // Must throw on failure so the form can show the server errors
  onSubmit: (
    event_booking_id: number,
    data: EventBookingFormData,
    attachment: EventBookingAttachmentDraft,
  ) => Promise<void>;
  isSubmitting?: boolean;
  uploadProgress?: number | null;
}

const EventBookingEdit = ({
  booking,
  venues,
  offices,
  onClose,
  onSubmit,
  isSubmitting = false,
  uploadProgress = null,
}: EventBookingEditProps) => {
  return (
    <EventBookingForm
      title="Edit Event Booking"
      subtitle="Update the details of your event booking request."
      subtitleExtra={`Booking #${booking.event_booking_id}`}
      notice={{
        title: "Update Booking Notice",
        text: "Updating this form does not automatically confirm your reservation. Your booking will remain subject to the university's approval process.",
      }}
      submitLabel="Save Changes"
      submittingLabel="Updating..."
      booking={booking}
      venues={venues}
      offices={offices}
      onClose={onClose}
      onSubmit={(data, attachment) =>
        onSubmit(booking.event_booking_id, data, attachment)
      }
      isSubmitting={isSubmitting}
      uploadProgress={uploadProgress}
    />
  );
};

export default EventBookingEdit;
