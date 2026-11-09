import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  User,
  X,
} from "lucide-react";

import type { RoleColumns } from "../../../interfaces/RoleColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import type { UserColumns } from "../../../interfaces/UserColumns";

import RoleService from "../../../services/RoleService";
import OfficeService from "../../../services/OfficeService";
import UserService from "../../../services/UserService";

interface EditUserFormModalProps {
  user: UserColumns | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (message: string) => void;
}

interface UserFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix_name: string;
  position: string;
  contact_number: string;
  email: string;
  username: string;
  role_id: string;
  office_id: string;
  account_status: "Active" | "Inactive";
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[] | string>;
    };
  };
}

const initialFormData: UserFormData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix_name: "",
  position: "",
  contact_number: "",
  email: "",
  username: "",
  role_id: "",
  office_id: "",
  account_status: "Active",
};

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const EditUserFormModal = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}: EditUserFormModalProps) => {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  const [roles, setRoles] = useState<RoleColumns[]>([]);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);

  // Full name preview
  const fullName = useMemo(
    () =>
      [
        formData.first_name,
        formData.middle_name,
        formData.last_name,
        formData.suffix_name,
      ]
        .filter(Boolean)
        .join(" "),
    [formData],
  );

  // Initialize form whenever the modal opens or selected user changes
  useEffect(() => {
    if (!isOpen || !user) return;

    setFormData({
      first_name: user.first_name ?? "",
      middle_name: user.middle_name ?? "",
      last_name: user.last_name ?? "",
      suffix_name: user.suffix_name ?? "",
      position: user.position ?? "",
      contact_number: user.contact_number ?? "",
      email: user.email ?? "",
      username: user.username ?? "",
      role_id: String(user.role_id ?? ""),
      office_id: String(user.office_id ?? ""),
      account_status: user.account_status ?? "Active",
    });

    setPhotoPreview(user.profile_photo_url ?? null);
    setProfilePhoto(null);
    setRemoveCurrentPhoto(false);

    setErrors({});
    setGeneralError("");
  }, [isOpen, user]);

  // Load roles and offices
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setGeneralError("");

      try {
        const [roleResponse, officeResponse] = await Promise.all([
          RoleService.loadRoles(),
          OfficeService.loadOffices(),
        ]);

        if (cancelled) return;

        const roleData = roleResponse.data?.roles;
        const officeData = officeResponse.data?.offices;

        const activeRoles: RoleColumns[] = Array.isArray(roleData)
          ? roleData.filter(
              (role: RoleColumns) =>
                role.status === "active" && !role.is_deleted,
            )
          : [];

        const activeOffices: OfficeColumns[] = Array.isArray(officeData)
          ? officeData.filter(
              (office: OfficeColumns) =>
                office.status === "active" && !office.is_deleted,
            )
          : [];

        // Keep the currently assigned role visible,
        // even if it has already become inactive.
        if (
          user?.role &&
          !activeRoles.some((role) => role.role_id === user.role_id)
        ) {
          activeRoles.push(user.role);
        }

        // Keep the currently assigned office visible,
        // even if it has already become inactive.
        if (
          user?.office &&
          !activeOffices.some((office) => office.office_id === user.office_id)
        ) {
          activeOffices.push(user.office);
        }

        setRoles(activeRoles);
        setOffices(activeOffices);
      } catch (error) {
        console.error("Error loading roles and offices:", error);

        if (!cancelled) {
          setGeneralError(
            "Unable to load roles and offices. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  // Generate and clean up preview URL for selected photo
  useEffect(() => {
    if (!profilePhoto) return;

    const objectUrl = URL.createObjectURL(profilePhoto);

    setPhotoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profilePhoto]);

  if (!isOpen || !user) return null;

  // Handle text and select inputs
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  // Handle profile photo selection
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setGeneralError("");

    if (!file.type.startsWith("image/")) {
      setGeneralError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setGeneralError("Profile photo must not exceed 2 MB.");
      event.target.value = "";
      return;
    }

    setProfilePhoto(file);
    setRemoveCurrentPhoto(false);

    // Allow selecting the same file again later.
    event.target.value = "";
  };

  // Remove current or newly selected profile photo
  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
    setRemoveCurrentPhoto(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required.";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    }

    if (!formData.role_id) {
      newErrors.role_id = "Please select a role.";
    }

    if (!formData.office_id) {
      newErrors.office_id = "Please select an office.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Submit updated user information
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setGeneralError("");

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        suffix_name: formData.suffix_name.trim() || null,
        position: formData.position.trim() || null,
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim(),
        username: formData.username.trim(),
        role_id: Number(formData.role_id),
        office_id: Number(formData.office_id),
        account_status: formData.account_status,
      };

      // Update user information
      await UserService.updateUser(user.user_id, payload);

      // Upload new profile photo, if selected
      if (profilePhoto) {
        const photoData = new FormData();

        photoData.append("profile_photo", profilePhoto);

        await UserService.uploadProfilePhoto(user.user_id, photoData);
      }

      // Remove existing profile photo, if requested
      else if (removeCurrentPhoto) {
        await UserService.removeProfilePhoto(user.user_id);
      }

      // Notify parent component
      onUserUpdated("User account updated successfully.");
    } catch (error: unknown) {
      console.error("Error updating user:", error);

      const apiError = error as ApiErrorResponse;
      const responseErrors = apiError.response?.data?.errors;

      if (responseErrors && typeof responseErrors === "object") {
        const mappedErrors: Record<string, string> = {};

        Object.entries(responseErrors).forEach(([key, value]) => {
          mappedErrors[key] = Array.isArray(value)
            ? String(value[0])
            : String(value);
        });

        setErrors(mappedErrors);
      }

      setGeneralError(
        apiError.response?.data?.message ||
          "Unable to update the user account. Please check the details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Styling
  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-900";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

  const renderError = (field: string) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-500">{errors[field]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit User Account
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update the user's information and account settings.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* General Error */}
            {generalError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Profile Photo */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Profile Photo
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="User profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={36} className="text-gray-400" />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800">
                    <Camera size={16} />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={submitting}
                      className="hidden"
                    />
                  </label>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={submitting}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Accepted image formats. Maximum file size: 2 MB.
              </p>
            </section>

            {/* Personal Information */}
            <section>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Personal Information
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("first_name")}
                </div>

                <div>
                  <label className={labelClass}>Middle Name</label>
                  <input
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("middle_name")}
                </div>

                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("last_name")}
                </div>

                <div>
                  <label className={labelClass}>Suffix</label>
                  <input
                    name="suffix_name"
                    value={formData.suffix_name}
                    onChange={handleChange}
                    disabled={submitting}
                    placeholder="Jr., Sr., III"
                    className={inputClass}
                  />
                  {renderError("suffix_name")}
                </div>

                <div>
                  <label className={labelClass}>Position</label>
                  <input
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("position")}
                </div>

                <div>
                  <label className={labelClass}>Contact Number</label>
                  <input
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("contact_number")}
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Account Information
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("email")}
                </div>

                <div>
                  <label className={labelClass}>Username *</label>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                  {renderError("username")}
                </div>

                <div>
                  <label className={labelClass}>Role *</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleChange}
                    disabled={loadingOptions || submitting}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingOptions ? "Loading roles..." : "Select Role"}
                    </option>

                    {roles.map((role) => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.name}
                        {role.status !== "active" ? " (Inactive)" : ""}
                      </option>
                    ))}
                  </select>
                  {renderError("role_id")}
                </div>

                <div>
                  <label className={labelClass}>Office *</label>
                  <select
                    name="office_id"
                    value={formData.office_id}
                    onChange={handleChange}
                    disabled={loadingOptions || submitting}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingOptions ? "Loading offices..." : "Select Office"}
                    </option>

                    {offices.map((office) => (
                      <option key={office.office_id} value={office.office_id}>
                        {office.office_name}
                        {office.status !== "active" ? " (Inactive)" : ""}
                      </option>
                    ))}
                  </select>
                  {renderError("office_id")}
                </div>

                <div>
                  <label className={labelClass}>Account Status *</label>
                  <select
                    name="account_status"
                    value={formData.account_status}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {renderError("account_status")}
                </div>
              </div>
            </section>

            {/* Full Name Preview */}
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Full name preview
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {fullName || "User name"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserFormModal;
