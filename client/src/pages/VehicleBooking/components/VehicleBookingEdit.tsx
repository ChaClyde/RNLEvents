import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import type {
  VehicleBookingColumns,
  VehicleBookingFormData,
} from "../../../interfaces/VehicleBookingColumns";
import VehicleBookingForm from "./VehicleBookingForm";

interface VehicleBookingEditProps {
  booking: VehicleBookingColumns;
  offices: OfficeColumns[];
  onClose: () => void;
  onSubmit: (
    vehicle_booking_id: number,
    data: VehicleBookingFormData,
  ) => Promise<void>;
  isSubmitting?: boolean;
}

const VehicleBookingEdit = ({
  booking,
  offices,
  onClose,
  onSubmit,
  isSubmitting = false,
}: VehicleBookingEditProps) => (
  <VehicleBookingForm
    title="Edit Vehicle Booking"
    subtitle={`Booking #${booking.vehicle_booking_id} can be updated until the first review.`}
    submitLabel="Save Changes"
    submittingLabel="Updating..."
    offices={offices}
    booking={booking}
    onClose={onClose}
    onSubmit={(data) => onSubmit(booking.vehicle_booking_id, data)}
    isSubmitting={isSubmitting}
  />
);

export default VehicleBookingEdit;
