import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";

import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";

import OfficeService from "../../../services/OfficeService";
import type {
  OfficeColumns,
  OfficeFieldErrors,
  OfficePayload,
  OfficeStatus,
} from "../../../interfaces/OfficeColumns";

interface EditOfficeModalProps {
  office: OfficeColumns | null;
  onClose: () => void;
  onOfficeUpdated: () => void;
}

const EditOfficeModal = ({
  office,
  onClose,
  onOfficeUpdated,
}: EditOfficeModalProps) => {
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
  const [isSaving, setIsSaving] = useState(false);

  // Populate form whenever an office is selected.
  useEffect(() => {
    if (!office) return;

    setOfficeCode(office.office_code ?? "");
    setOfficeName(office.office_name ?? "");
    setOfficeType(office.office_type ?? "");
    setDescription(office.description ?? "");
    setContactEmail(office.contact_email ?? "");
    setContactNumber(office.contact_number ?? "");
    setLocation(office.location ?? "");
    setStatus(office.status ?? "active");

    setErrors({});
    setFormError("");
  }, [office]);

  const handleClose = () => {
    if (isSaving) return;

    setErrors({});
    setFormError("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!office) return;

    setIsSaving(true);
    setErrors({});
    setFormError("");

    const payload: OfficePayload = {
      office_code: officeCode.trim(),
      office_name: officeName.trim(),
      office_type: officeType.trim() || null,
      description: description.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_number: contactNumber.trim() || null,
      location: location.trim() || null,
      status,
    };

    try {
      await OfficeService.updateOffice(office.office_id, payload);

      onOfficeUpdated();
      onClose();
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 422) {
          setErrors(error.response.data.errors ?? {});
          setFormError(
            error.response.data.message ?? "Please check the form fields.",
          );
        } else {
          setFormError(
            error.response?.data?.message ??
              "Unable to update the office. Please try again.",
          );
        }
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={!!office} onClose={handleClose} showCloseButton={false}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Office
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update the office information and contact details.
            </p>
          </div>

          <CloseButton
            label="Close"
            onClose={handleClose}
            disabled={isSaving}
          />
        </div>

        {/* General Error */}
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Office Information */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FloatingLabelInput
              label="Office Code"
              type="text"
              name="office_code"
              value={officeCode}
              onChange={(e) => setOfficeCode(e.target.value)}
              errors={errors.office_code}
              required
            />

            <FloatingLabelInput
              label="Office Name"
              type="text"
              name="office_name"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              errors={errors.office_name}
              required
            />

            <FloatingLabelInput
              label="Office Type (Optional)"
              type="text"
              name="office_type"
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value)}
              errors={errors.office_type}
            />

            <FloatingLabelInput
              label="Contact Email (Optional)"
              type="email"
              name="contact_email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              errors={errors.contact_email}
            />

            <FloatingLabelInput
              label="Contact Number (Optional)"
              type="text"
              name="contact_number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              errors={errors.contact_number}
            />

            <FloatingLabelInput
              label="Location (Optional)"
              type="text"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              errors={errors.location}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description (Optional)
            </label>

            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Enter office description..."
            />

            {errors.description && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-500">
                {errors.description[0]}
              </span>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="office_status"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Office Status
            </label>

            <select
              id="office_status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OfficeStatus)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {errors.status && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-500">
                {errors.status[0]}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <SubmitButton
              label="Save Changes"
              loading={isSaving}
              loadingLabel="Saving..."
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditOfficeModal;
