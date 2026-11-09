import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import type { VehicleBookingFormData } from "../../../interfaces/VehicleBookingColumns";
import VehicleBookingForm from "./VehicleBookingForm";

interface VehicleBookingAddProps {
  offices: OfficeColumns[];
  defaultRequestedBy?: string;
  defaultEmail?: string;
  defaultOfficeId?: number | null;
  onClose: () => void;
  onSubmit: (data: VehicleBookingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const VehicleBookingAdd = ({
  offices,
  defaultRequestedBy,
  defaultEmail,
  defaultOfficeId,
  onClose,
  onSubmit,
  isSubmitting = false,
}: VehicleBookingAddProps) => (
  <VehicleBookingForm
    title="Create Vehicle Booking"
    subtitle="Submit a vehicle request. Assignment happens after approval reaches Vehicle Admin."
    submitLabel="Submit Request"
    submittingLabel="Submitting..."
    offices={offices}
    defaultRequestedBy={defaultRequestedBy}
    defaultEmail={defaultEmail}
    defaultOfficeId={defaultOfficeId}
    onClose={onClose}
    onSubmit={onSubmit}
    isSubmitting={isSubmitting}
  />
);

export default VehicleBookingAdd;
