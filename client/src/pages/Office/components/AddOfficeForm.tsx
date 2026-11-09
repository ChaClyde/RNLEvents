import { useEffect, useState, type FC, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Building2, FileText, Phone, ToggleRight } from "lucide-react";

import Modal from "../../../components/Modal";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

import OfficeService from "../../../services/OfficeService";

import type {
  OfficeFieldErrors,
  OfficeStatus,
} from "../../../interfaces/OfficeColumns";

interface AddOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficeAdded: (message: string) => void;
  refreshKey?: () => void;
}

const AddOfficeModal: FC<AddOfficeModalProps> = ({
  isOpen,
  onClose,
  onOfficeAdded,
  refreshKey,
}) => {
  const [loadingStore, setLoadingStore] = useState(false);

  const [officeCode, setOfficeCode] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [officeType, setOfficeType] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<OfficeStatus>("active");

  const [errors, setErrors] = useState<OfficeFieldErrors>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOfficeCode("");
      setOfficeName("");
      setOfficeType("");
      setDescription("");
      setContactEmail("");
      setContactNumber("");
      setLocation("");
      setStatus("active");
      setErrors({});
      setFormError("");
    }
  }, [isOpen]);

  const handleStoreOffice = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoadingStore(true);
      setErrors({});
      setFormError("");

      const res = await OfficeService.storeOffice({
        office_code: officeCode,
        office_name: officeName,
        office_type: officeType || null,
        description: description || null,
        contact_email: contactEmail || null,
        contact_number: contactNumber || null,
        location: location || null,
        status,
      });

      onOfficeAdded(res.data.message);
      refreshKey?.();
      onClose();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 422) {
        const fieldErrors: OfficeFieldErrors = error.response.data.errors ?? {};

        setErrors(fieldErrors);

        if (Object.keys(fieldErrors).length === 0) {
          setFormError(
            error.response.data.message ??
              "Please check the form and try again.",
          );
        }
      } else if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError("Unable to save the office. Please try again.");
      }

      console.error("Error storing office:", error);
    } finally {
      setLoadingStore(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loadingStore ? () => {} : onClose}
      showCloseButton
    >
      <form onSubmit={handleStoreOffice} className="space-y-6">
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add Office</h1>
              <p className="mt-1 text-sm text-gray-500">
                Register a new university office and its contact information.
              </p>
            </div>
          </div>
        </div>

        {/* Office Identification */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Building2 size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Office Identification
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FloatingLabelInput
              label="Office Code"
              type="text"
              name="office_code"
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value)}
              required
              autoFocus
              errors={errors.office_code}
            />

            <FloatingLabelInput
              label="Office Name"
              type="text"
              name="office_name"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              required
              errors={errors.office_name}
            />

            <FloatingLabelInput
              label="Office Type"
              type="text"
              name="office_type"
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value)}
              errors={errors.office_type}
            />
          </div>
        </div>

        {/* Office Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <FileText size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">Office Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FloatingLabelInput
              label="Description"
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              errors={errors.description}
            />

            <FloatingLabelInput
              label="Office Location"
              type="text"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              errors={errors.location}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Phone size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FloatingLabelInput
              label="Contact Email"
              type="email"
              name="contact_email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              errors={errors.contact_email}
            />

            <FloatingLabelInput
              label="Contact Number"
              type="text"
              name="contact_number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              errors={errors.contact_number}
            />
          </div>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ToggleRight size={18} className="text-[#003B5C]" />
            <h2 className="font-semibold text-[#003B5C]">Office Status</h2>
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OfficeStatus)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#00679E] focus:ring-2 focus:ring-[#00679E]/20"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {errors.status && (
            <p className="mt-1 text-sm text-red-500">{errors.status[0]}</p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Save Office"
            loading={loadingStore}
            loadingLabel="Saving Office..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddOfficeModal;
