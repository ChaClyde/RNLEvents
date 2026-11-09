import type { EventBookingFormData } from "../../../interfaces/EventBookingColumns";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";

import EventBookingForm from "./EventBookingForm";

interface EventBookingAddProps {
  venues: VenueColumns[];
  offices: OfficeColumns[];
  onClose: () => void;
  // Must throw on failure so the form can show the server errors
  onSubmit: (data: EventBookingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const EventBookingAdd = ({
  venues,
  offices,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EventBookingAddProps) => {
  return (
    <EventBookingForm
      title="Create Event Booking"
      subtitle="Choose a venue, then fill out the details to submit an event booking request."
      notice={{
        title: "Booking Request Notice",
        text: "Submitting this form does not automatically confirm your reservation. Your request will undergo the university's approval process.",
      }}
      submitLabel="Submit Booking"
      submittingLabel="Submitting..."
      venues={venues}
      offices={offices}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
};

export default EventBookingAdd;
