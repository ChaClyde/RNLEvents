import { useState, useEffect, useMemo, type FC, type FormEvent } from "react";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import EventService from "../../../services/EventService";
import OfficeService from "../../../services/OfficeService";
import VenueService from "../../../services/VenueService"; // ⚠️ confirm this path/name
import type { EventFieldErrors } from "../../../interfaces/EventColumns";
import type { VenueColumns } from "../../../interfaces/VenueColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import { CalendarDays, Package, User, CheckSquare, Square } from "lucide-react";
import FloatingImageSelect, {
  type FloatingImageOption,
} from "../../../components/FloatingImageSelect/FloatingImageSelect";

interface AddEventFormModalProps {
  onEventAdded: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: () => void;
}

const AddEventFormModal: FC<AddEventFormModalProps> = ({
  onEventAdded,
  isOpen,
  onClose,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);

  const [loadingOffices, setLoadingOffices] = useState(false);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const [loadingVenues, setLoadingVenues] = useState(false);
  const [venues, setVenues] = useState<VenueColumns[]>([]);

  const [purpose, setPurpose] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<VenueColumns | null>(null);

  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [chairs, setChairs] = useState("0");
  const [lightsAndSounds, setLightsAndSounds] = useState(false);
  const [piano, setPiano] = useState(false);
  const [multimediaProjector, setMultimediaProjector] = useState(false);
  const [hvlsElectricFan, setHvlsElectricFan] = useState(false);
  const [othersSpecify, setOthersSpecify] = useState("");
  const [othersQuantity, setOthersQuantity] = useState("");

  const [requestedBy, setRequestedBy] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [email, setEmail] = useState("");
  const [telNumber, setTelNumber] = useState("");

  const [errors, setErrors] = useState<EventFieldErrors>({});

  const numberOfDays = useMemo(() => {
    if (!dateStart || !dateEnd) return 0;
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [dateStart, dateEnd]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

  const venueOptions: FloatingImageOption[] = venues.map((v) => ({
    id: v.venue_id,
    image: v.venue_image
      ? `${backendUrl}/api/venues/getVenueImage/${v.venue_id}`
      : "",
    title: v.venue,
    description: v.description,
    meta: [{ label: "Capacity", value: String(v.capacity) }],
  }));

  const handleLoadOffices = async () => {
    try {
      setLoadingOffices(true);
      const res = await OfficeService.loadOffices();
      if (res.status === 200) setOffices(res.data.offices);
    } catch (error) {
      console.error("Error loading offices:", error);
    } finally {
      setLoadingOffices(false);
    }
  };

  const handleLoadVenues = async () => {
    try {
      setLoadingVenues(true);
      const res = await VenueService.loadVenues(); // ⚠️ confirm method name
      if (res.status === 200) setVenues(res.data.venues); // ⚠️ confirm response key
    } catch (error) {
      console.error("Error loading venues:", error);
    } finally {
      setLoadingVenues(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleLoadOffices();
      handleLoadVenues();
    }
  }, [isOpen]);

  const resetForm = () => {
    setPurpose("");
    setSelectedVenue(null);
    setTimeStart("");
    setTimeEnd("");
    setDateStart("");
    setDateEnd("");
    setChairs("0");
    setLightsAndSounds(false);
    setPiano(false);
    setMultimediaProjector(false);
    setHvlsElectricFan(false);
    setOthersSpecify("");
    setOthersQuantity("");
    setRequestedBy("");
    setOfficeId("");
    setEmail("");
    setTelNumber("");
    setErrors({});
  };

  const handleStoreEvent = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoadingStore(true);
      setErrors({});

      const payload = {
        purpose,
        venue_id: selectedVenue?.venue_id,
        time_start: timeStart,
        time_end: timeEnd,
        date_start: dateStart,
        date_end: dateEnd,
        chairs: Number(chairs) || 0,
        lights_and_sounds: lightsAndSounds,
        piano,
        multimedia_projector: multimediaProjector,
        hvls_electric_fan: hvlsElectricFan,
        others_specify: othersSpecify || null,
        others_quantity: othersSpecify ? Number(othersQuantity) || null : null,
        requested_by: requestedBy,
        office_id: officeId,
        email,
        tel_number: telNumber,
      };

      const res = await EventService.storeEvent(payload);

      if (res.status === 201) {
        onEventAdded(res.data.message);
        refreshKey();
        resetForm();
        onClose();
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error(
          "Unexpected server error occurred during adding event: ",
          error,
        );
      }
    } finally {
      setLoadingStore(false);
    }
  };

  const ChecklistItem = ({
    label,
    checked,
    onToggle,
  }: {
    label: string;
    checked: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors
          ${
            checked
              ? "border-[#0095D9] bg-[#0095D9]/10 text-[#0095D9]"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
    >
      {checked ? <CheckSquare size={16} /> : <Square size={16} />}
      {label}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleStoreEvent} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Event</h1>
              <p className="text-sm text-gray-500 mt-1">
                Schedule an event and request the venue and equipment needed.
              </p>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">Event Details</h2>
          </div>

          <div className="mb-4">
            <FloatingLabelInput
              label="Purpose / Activity"
              type="text"
              name="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              errors={errors.purpose}
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <FloatingImageSelect
              options={venueOptions}
              loading={loadingVenues}
              label="Place / Venue"
              value={selectedVenue?.venue_id ?? null}
              onChange={(id) => {
                const venue = venues.find(
                  (v) => String(v.venue_id) === String(id),
                );
                setSelectedVenue(venue ?? null);
              }}
              errors={errors.venue_id}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Time Start"
              type="time"
              name="time_start"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              errors={errors.time_start}
              required
            />

            <FloatingLabelInput
              label="Time End"
              type="time"
              name="time_end"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              errors={errors.time_end}
              required
            />

            <FloatingLabelInput
              label="Date Start"
              type="date"
              name="date_start"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              errors={errors.date_start}
              required
            />

            <FloatingLabelInput
              label="Date End"
              type="date"
              name="date_end"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              errors={errors.date_end}
              required
            />
          </div>

          {numberOfDays > 0 && (
            <div className="mt-4 rounded-lg border border-[#0095D9]/20 bg-[#0095D9]/5 px-4 py-2.5 text-sm text-[#003B5C]">
              Duration:{" "}
              <span className="font-semibold">
                {numberOfDays} {numberOfDays === 1 ? "day" : "days"}
              </span>
            </div>
          )}
        </div>

        {/* Things Needed */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Package size={18} className="text-[#003B5C]" />
            <h2 className="font-semibold text-[#003B5C]">Things Needed</h2>
          </div>

          <div className="mb-4">
            <FloatingLabelInput
              label="No. of Chairs"
              type="number"
              name="chairs"
              value={chairs}
              onChange={(e) => setChairs(e.target.value)}
              errors={errors.chairs}
              required
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <ChecklistItem
              label="Lights & Sounds"
              checked={lightsAndSounds}
              onToggle={() => setLightsAndSounds((v) => !v)}
            />
            <ChecklistItem
              label="Piano"
              checked={piano}
              onToggle={() => setPiano((v) => !v)}
            />
            <ChecklistItem
              label="Multi-Media Projector"
              checked={multimediaProjector}
              onToggle={() => setMultimediaProjector((v) => !v)}
            />
            <ChecklistItem
              label="HVLS Electric Fan"
              checked={hvlsElectricFan}
              onToggle={() => setHvlsElectricFan((v) => !v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Others (specify)"
              type="text"
              name="others_specify"
              value={othersSpecify}
              onChange={(e) => setOthersSpecify(e.target.value)}
              errors={errors.others_specify}
            />

            <FloatingLabelInput
              label="Quantity"
              type="number"
              name="others_quantity"
              value={othersQuantity}
              onChange={(e) => setOthersQuantity(e.target.value)}
              errors={errors.others_quantity}
              disabled={!othersSpecify}
            />
          </div>
        </div>

        {/* Requestor Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <User size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Requestor Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Requested By"
              type="text"
              name="requested_by"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              errors={errors.requested_by}
              required
            />

            <FloatingLabelSelect
              label="Office"
              name="office_id"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              errors={errors.office_id}
            >
              {loadingOffices ? (
                <option>Loading...</option>
              ) : (
                <>
                  <option value="">Select Office</option>
                  {offices.map((office) => (
                    <option key={office.office_id} value={office.office_id}>
                      {office.office_name}
                    </option>
                  ))}
                </>
              )}
            </FloatingLabelSelect>

            <FloatingLabelInput
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={errors.email}
              required
            />

            <FloatingLabelInput
              label="Tel. Number"
              type="text"
              name="tel_number"
              value={telNumber}
              onChange={(e) => setTelNumber(e.target.value)}
              errors={errors.tel_number}
              required
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}
          <SubmitButton
            label="Create Event"
            loading={loadingStore}
            loadingLabel="Creating Event..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddEventFormModal;
