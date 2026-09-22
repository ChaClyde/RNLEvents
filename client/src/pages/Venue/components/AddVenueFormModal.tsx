import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import { useState, type FC, type FormEvent, type ChangeEvent } from "react";
import VenueService from "../../../services/VenueService";
import type { VenueFieldErrors } from "../../../interfaces/VenueColumns";
import { MapPin, Camera, X } from "lucide-react";

interface AddVenueFormModalProps {
  onVenueAdded: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: () => void;
}

const AddVenueFormModal: FC<AddVenueFormModalProps> = ({
  onVenueAdded,
  isOpen,
  onClose,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [venueImage, setVenueImage] = useState<File | null>(null);
  const [venueImagePreview, setVenueImagePreview] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<VenueFieldErrors>({});

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setVenueImage(file);
    setVenueImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveImage = () => {
    setVenueImage(null);
    setVenueImagePreview(null);
  };

  const handleStoreVenue = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoadingStore(true);

      const formData = new FormData();
      formData.append("venue", venueName);
      formData.append("description", description);
      formData.append("capacity", capacity);
      formData.append("location", location);
      if (venueImage) {
        formData.append("venue_image", venueImage);
      }

      const res = await VenueService.storeVenue(formData);

      if (res.status === 201) {
        onVenueAdded(res.data.message);
        refreshKey();

        setVenueName("");
        setDescription("");
        setCapacity("");
        setLocation("");
        setVenueImage(null);
        setVenueImagePreview(null);
        setErrors({});
      } else {
        console.error(
          "Unexpected error occurred during adding venue: ",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.log(
          "Unexpected server error occurred during adding venue: ",
          error,
        );
      }
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleStoreVenue}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6 mb-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <MapPin className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Venue</h1>
              <p className="text-sm text-gray-500 mt-1">
                Add a venue with a photo so it can be picked when scheduling an
                event.
              </p>
            </div>
          </div>
        </div>

        {/* Venue Photo — big rectangular holder */}
        <div className="mb-8">
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
                <p className="text-sm font-medium">No photo selected</p>
              </div>
            )}

            <label
              htmlFor="venue_image"
              className="absolute bottom-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white border-2 border-[#0095D9] text-[#0095D9] transition-all hover:bg-[#0095D9]/10"
            >
              <Camera size={18} />
            </label>

            <input
              id="venue_image"
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
        <div className="mb-6 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
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
              autoFocus
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
        <div className="mt-8 flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Create Venue"
            loading={loadingStore}
            loadingLabel="Creating Venue..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddVenueFormModal;
