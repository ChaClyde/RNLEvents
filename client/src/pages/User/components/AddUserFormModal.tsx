import { useEffect, useState } from "react";
import {
  X,
  UserPlus,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import RoleService from "../../../services/RoleService";
import OfficeService from "../../../services/OfficeService";
import UserService from "../../../services/UserService";

interface AddUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RoleOption {
  role_id: number;
  name: string;
  slug: string;
  status: "active" | "inactive";
  is_deleted: boolean;
}

interface OfficeOption {
  office_id: number;
  office_name: string;
  status: "active" | "inactive";
  is_deleted: boolean;
}

type AccountStatus = "Active" | "Inactive";

interface FormDataState {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix_name: string;
  email: string;
  username: string;
  position: string;
  contact_number: string;
  role_id: string;
  office_id: string;
  account_status: AccountStatus;
  password: string;
  password_confirmation: string;
}

const initialFormData: FormDataState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix_name: "",
  email: "",
  username: "",
  position: "",
  contact_number: "",
  role_id: "",
  office_id: "",
  account_status: "Active",
  password: "",
  password_confirmation: "",
};

const generateTemporaryPassword = (): string => {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

  const randomValues = new Uint32Array(14);
  window.crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    (value) => characters[value % characters.length],
  ).join("");
};

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
    message?: string;
  };

  const validationErrors = axiosError.response?.data?.errors;

  if (validationErrors) {
    const firstError = Object.values(validationErrors)[0]?.[0];
    if (firstError) return firstError;
  }

  return (
    axiosError.response?.data?.message ||
    axiosError.message ||
    "Something went wrong. Please try again."
  );
};

const AddUserFormModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddUserFormModalProps) => {
  const [formData, setFormData] = useState<FormDataState>(initialFormData);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");

  const [accountCreated, setAccountCreated] = useState(false);
  const [photoUploadWarning, setPhotoUploadWarning] = useState("");

  // Load active roles and offices.
  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setErrorMessage("");

      try {
        const [roleResponse, officeResponse] = await Promise.all([
          RoleService.loadRoles(),
          OfficeService.loadOffices(),
        ]);

        const roleData: RoleOption[] = roleResponse.data.roles ?? [];
        const officeData: OfficeOption[] = officeResponse.data.offices ?? [];

        setRoles(
          roleData.filter(
            (role) => role.status === "active" && !role.is_deleted,
          ),
        );

        setOffices(
          officeData.filter(
            (office) => office.status === "active" && !office.is_deleted,
          ),
        );
      } catch (error) {
        console.error("Error loading roles and offices:", error);
        setErrorMessage("Unable to load roles and offices. Please try again.");
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [isOpen]);

  // Reset form when the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setProfilePhoto(null);
      setPhotoPreview(null);
      setErrorMessage("");
      setSuccessMessage("");
      setCreatedPassword("");
      setShowPassword(false);
      setShowConfirmation(false);
      setAccountCreated(false);
      setPhotoUploadWarning("");
    }
  }, [isOpen]);

  // Clean up image preview URLs.
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (!isOpen) return null;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Please upload a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Profile photo must not exceed 2MB.");
      event.target.value = "";
      return;
    }

    setProfilePhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
  };

  const handleGeneratePassword = () => {
    const temporaryPassword = generateTemporaryPassword();

    setFormData((previous) => ({
      ...previous,
      password: temporaryPassword,
      password_confirmation: temporaryPassword,
    }));

    setCreatedPassword("");
    setErrorMessage("");
  };

  const validateForm = (): boolean => {
    if (!formData.first_name.trim()) {
      setErrorMessage("First name is required.");
      return false;
    }

    if (!formData.last_name.trim()) {
      setErrorMessage("Last name is required.");
      return false;
    }

    if (!formData.email.trim()) {
      setErrorMessage("Email address is required.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }

    if (!formData.username.trim()) {
      setErrorMessage("Username is required.");
      return false;
    }

    if (!formData.role_id) {
      setErrorMessage("Please select a role.");
      return false;
    }

    if (!formData.office_id) {
      setErrorMessage("Please select an office.");
      return false;
    }

    if (!formData.password) {
      setErrorMessage("Please generate a temporary password.");
      return false;
    }

    if (formData.password.length < 8) {
      setErrorMessage("The temporary password must be at least 8 characters.");
      return false;
    }

    if (formData.password !== formData.password_confirmation) {
      setErrorMessage("The passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (accountCreated) return;

    setErrorMessage("");
    setSuccessMessage("");
    setPhotoUploadWarning("");

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        suffix_name: formData.suffix_name.trim() || null,
        email: formData.email.trim(),
        username: formData.username.trim(),
        position: formData.position.trim() || null,
        contact_number: formData.contact_number.trim() || null,
        role_id: Number(formData.role_id),
        office_id: Number(formData.office_id),
        account_status: formData.account_status,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      };

      // Create user account.
      const response = await UserService.storeUser(payload);

      const createdUserId = response.data.user?.user_id;

      if (!createdUserId) {
        throw new Error(
          "The server did not return the newly created user's ID.",
        );
      }

      // Upload profile photo separately.
      if (profilePhoto) {
        const photoFormData = new FormData();
        photoFormData.append("profile_photo", profilePhoto);

        try {
          await UserService.uploadProfilePhoto(createdUserId, photoFormData);
        } catch (photoError) {
          console.error("Profile photo upload failed:", photoError);

          setPhotoUploadWarning(
            "The account was created, but the profile photo could not be uploaded. You can upload it later through Edit User.",
          );
        }
      }

      setCreatedPassword(formData.password);
      setSuccessMessage("User account created successfully.");
      setAccountCreated(true);

      // Refresh the parent list without closing this modal.
      onSuccess();
    } catch (error) {
      console.error("Error creating user:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(createdPassword);
      setSuccessMessage("Password copied successfully.");
    } catch {
      setErrorMessage(
        "Unable to copy automatically. Please select and copy the password manually.",
      );
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#003B5C] px-6 py-4 text-white dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2">
              <UserPlus size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                {accountCreated ? "User Account Created" : "Add New User"}
              </h2>
              <p className="text-sm text-blue-100">
                Create a new FilSched user account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-2 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={21} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          {/* Success */}
          {successMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Photo warning */}
          {photoUploadWarning && (
            <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300">
              {photoUploadWarning}
            </div>
          )}

          {/* Generated password */}
          {accountCreated && createdPassword && (
            <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
              <p className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                Temporary Password
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-md bg-white px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                  {createdPassword}
                </code>

                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="inline-flex items-center gap-2 rounded-md bg-[#00679E] px-3 py-2 text-sm font-medium text-white hover:bg-[#005477]"
                >
                  <Copy size={15} />
                  Copy Password
                </button>
              </div>

              <p className="mt-2 text-xs text-blue-800 dark:text-blue-300">
                Save this password and provide it securely to the account
                holder. They should change it after signing in.
              </p>
            </div>
          )}

          {/* Profile Photo */}
          {!accountCreated && (
            <>
              <div className="mb-7">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
                  Profile Photo
                </h3>

                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700 sm:flex-row">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={34} className="text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Upload a profile picture
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      JPG, PNG, or WEBP. Maximum file size: 2MB.
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#00679E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#005477]">
                        <Upload size={16} />
                        Choose Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>

                      {photoPreview && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-7">
                <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter first name"
                  />

                  <InputField
                    label="Middle Name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    placeholder="Enter middle name"
                  />

                  <InputField
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter last name"
                  />

                  <InputField
                    label="Suffix"
                    name="suffix_name"
                    value={formData.suffix_name}
                    onChange={handleChange}
                    placeholder="e.g. Jr., Sr., III"
                  />

                  <InputField
                    label="Position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="e.g. Office Secretary"
                  />

                  <InputField
                    label="Contact Number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              {/* Account Information */}
              <div className="mb-7">
                <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  Account Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                  />

                  <InputField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter username"
                  />

                  {/* Role */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="role_id"
                      value={formData.role_id}
                      onChange={handleChange}
                      required
                      disabled={loadingOptions}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="">
                        {loadingOptions ? "Loading roles..." : "Select role"}
                      </option>

                      {roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Office */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Office <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="office_id"
                      value={formData.office_id}
                      onChange={handleChange}
                      required
                      disabled={loadingOptions}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="">
                        {loadingOptions
                          ? "Loading offices..."
                          : "Select office"}
                      </option>

                      {offices.map((office) => (
                        <option key={office.office_id} value={office.office_id}>
                          {office.office_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Account Status */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Status
                    </label>

                    <select
                      name="account_status"
                      value={formData.account_status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Temporary Password */}
              <div className="mb-7">
                <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-200">
                  Temporary Password
                </h3>

                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    Generate a temporary password for the new user. The user
                    should change this password after their first successful
                    login.
                  </p>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="mb-4 inline-flex items-center gap-2 rounded-lg bg-[#00679E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#005477]"
                  >
                    <RefreshCw size={16} />
                    Generate Temporary Password
                  </button>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PasswordField
                      label="Password"
                      name="password"
                      value={formData.password}
                      visible={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                      onChange={handleChange}
                    />

                    <PasswordField
                      label="Confirm Password"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      visible={showConfirmation}
                      onToggle={() => setShowConfirmation((value) => !value)}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-gray-700 sm:flex-row sm:justify-end">
            {accountCreated ? (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-[#00679E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005477]"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || loadingOptions}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00679E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005477] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      Create User
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Reusable text input.
interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: InputFieldProps) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    />
  </div>
);

// Reusable password input.
interface PasswordFieldProps {
  label: string;
  name: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const PasswordField = ({
  label,
  name,
  value,
  visible,
  onToggle,
  onChange,
}: PasswordFieldProps) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
    </label>

    <div className="relative">
      <input
        id={name}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        required
        minLength={8}
        placeholder="Generate a password"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  </div>
);

export default AddUserFormModal;
