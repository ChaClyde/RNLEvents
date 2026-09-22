import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Modal from "../../../components/Modal";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import VenueService from "../../../services/VenueService";
import type {
  VenueColumns,
  VenueFieldErrors,
} from "../../../interfaces/VenueColumns";
import { MapPin, Camera, X, Pencil } from "lucide-react";

interface EditVenueFormModalProps {
  venue: VenueColumns | null;
  onVenueUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

const EditVenueFormModal: FC<EditVenueFormModalProps> = ({
  venue,
  onVenueUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const [venueName, setVenueName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");

  const [venueImage, setVenueImage] = useState<File | null>(null);
  const [venueImagePreview, setVenueImagePreview] = useState<string | null>(
    null,
  );
  const [removeImage, setRemoveImage] = useState(false);

  const [errors, setErrors] = useState<VenueFieldErrors>({});

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVenueImage(file);
    setVenueImagePreview(file ? URL.createObjectURL(file) : null);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setVenueImage(null);
    setVenueImagePreview(null);
    setRemoveImage(true);
  };

  const handleUpdateVenue = async (e: FormEvent) => {
    e.preventDefault();
    if (!venue) return;

    try {
      setLoadingUpdate(true);
      setErrors({});

      const formData = new FormData();
      formData.append("venue", venueName);
      formData.append("description", description);
      formData.append("capacity", capacity);
      formData.append("location", location);

      if (venueImage) {
        formData.append("venue_image", venueImage);
      } else if (removeImage) {
        formData.append("remove_image", "1");
      }

      const res = await VenueService.updateVenue(venue.venue_id, formData);

      if (res.status === 200) {
        onVenueUpdated(res.data.message);
        refreshKey();
        onClose();
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.error(error);
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  useEffect(() => {
    if (isOpen && venue) {
      setVenueName(venue.venue);
      setDescription(venue.description ?? "");
      setCapacity(String(venue.capacity));
      setLocation(venue.location);
      setVenueImagePreview(
        venue.venue_image
          ? `${backendUrl}/api/venues/getVenueImage/${venue.venue_id}`
          : null,
      );
      setVenueImage(null);
      setRemoveImage(false);
      setErrors({});
    }
  }, [isOpen, venue]);

  if (!venue) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleUpdateVenue} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Pencil className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Edit Venue</h1>
              <p className="text-sm text-gray-500 mt-1">
                Update the venue's photo and details.
              </p>
            </div>
          </div>
        </div>

        {/* Venue Photo — big rectangular holder */}
        <div>
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#0095D9]/30 bg-[#0095D9]/5">
            {venueImagePreview ? (
              <>
                <img
                  src={venueImagePreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#0095D9] text-white shadow"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#0095D9]/60">
                <MapPin size={40} />
                <p className="text-sm font-medium">No photo</p>
              </div>
            )}

            <label
              htmlFor="edit_venue_image"
              className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white border-2 border-[#0095D9] text-[#0095D9] transition-all hover:bg-[#0095D9]/10"
            >
              <Camera size={18} />
            </label>

            <input
              id="edit_venue_image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          {errors.venue_image && (
            <p className="mt-2 text-xs text-red-500">{errors.venue_image[0]}</p>
          )}
        </div>

        {/* Venue Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <MapPin size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">Venue Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Venue Name"
              type="text"
              name="venue"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              errors={errors.venue}
              required
            />

            <FloatingLabelInput
              label="Location"
              type="text"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              errors={errors.location}
              required
            />

            <FloatingLabelInput
              label="Capacity"
              type="number"
              name="capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              errors={errors.capacity}
              required
            />

            <FloatingLabelInput
              label="Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={errors.description}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#0095D9]/10">
          {!loadingUpdate && <CloseButton label="Close" onClose={onClose} />}
          <SubmitButton
            label="Update Venue"
            loading={loadingUpdate}
            loadingLabel="Updating Venue..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditVenueFormModal;
