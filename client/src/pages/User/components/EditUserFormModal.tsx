import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Modal from "../../../components/Modal";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import CloseButton from "../../../components/Button/CloseButton";
import SubmitButton from "../../../components/Button/SubmitButton";

import RoleService from "../../../services/RoleService";
import OfficeService from "../../../services/OfficeService";
import UserService from "../../../services/UserService";

import type { User, UserFieldErrors } from "../../../interfaces/User";
import type { RoleColumns } from "../../../interfaces/RoleColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";

import {
  User as UserIcon,
  Shield,
  Camera,
  X,
  Pencil,
  Mail,
} from "lucide-react";

interface EditUserFormModalProps {
  user: User | null;
  onUserUpdated: (message: string) => void;
  refreshKey: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const EditUserFormModal: FC<EditUserFormModalProps> = ({
  user,
  onUserUpdated,
  refreshKey,
  isOpen,
  onClose,
}) => {
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roles, setRoles] = useState<RoleColumns[]>([]);

  const [loadingOffices, setLoadingOffices] = useState(false);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffixName, setSuffixName] = useState("");

  const [roleId, setRoleId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [accountStatus, setAccountStatus] = useState<"Active" | "Inactive">(
    "Active",
  );

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null,
  );
  const [removePhoto, setRemovePhoto] = useState(false);

  const [errors, setErrors] = useState<UserFieldErrors>({});

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setProfilePhoto(file);
    setProfilePhotoPreview(file ? URL.createObjectURL(file) : null);
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    setRemovePhoto(true);
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoadingUpdate(true);
      setErrors({});

      const payload = {
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        suffix_name: suffixName || null,
        role_id: roleId,
        office_id: officeId,
        email,
        username,
        account_status: accountStatus,
      };

      const res = await UserService.updateUser(user.user_id, payload);

      if (res.status === 200) {
        if (profilePhoto) {
          const photoFormData = new FormData();
          photoFormData.append("profile_photo", profilePhoto);
          await UserService.uploadProfilePhoto(user.user_id, photoFormData);
        } else if (removePhoto) {
          await UserService.removeProfilePhoto(user.user_id);
        }

        onUserUpdated(res.data.message);
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

  const handleLoadRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await RoleService.loadRoles();
      if (res.status === 200) setRoles(res.data.roles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleLoadOffices = async () => {
    try {
      setLoadingOffices(true);
      const res = await OfficeService.loadOffices();
      if (res.status === 200) setOffices(res.data.offices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOffices(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleLoadRoles();
      handleLoadOffices();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.first_name);
      setMiddleName(user.middle_name ?? "");
      setLastName(user.last_name);
      setSuffixName(user.suffix_name ?? "");
      setRoleId(user.role_id.toString());
      setOfficeId(user.office_id.toString());
      setEmail(user.email);
      setUsername(user.username);
      setAccountStatus(user.account_status);
      setProfilePhotoPreview(user.profile_photo_url);
      setProfilePhoto(null);
      setRemovePhoto(false);
      setErrors({});
    }
  }, [isOpen, user]);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleUpdateUser} className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Pencil className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Edit User</h1>
              <p className="text-sm text-gray-500 mt-1">
                Update user information, role assignment and profile settings.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {profilePhotoPreview ? (
              <>
                <img
                  src={profilePhotoPreview}
                  alt="Preview"
                  className="h-28 w-28 rounded-full object-cover border-4 border-[#0095D9] shadow-lg shadow-[#0095D9]/20"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#0095D9] text-white shadow"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#003B5C] text-3xl font-bold text-white border-4 border-white shadow-lg">
                {firstName && lastName
                  ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
                  : "?"}
              </div>
            )}

            <label
              htmlFor="edit_profile_photo"
              className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white border-2 border-[#0095D9] text-[#0095D9] transition-all hover:bg-[#0095D9]/10"
            >
              <Camera size={18} />
            </label>

            <input
              id="edit_profile_photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <p className="mt-3 text-xs text-gray-400">Change profile picture</p>
        </div>

        {/* Personal Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <UserIcon size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="First Name"
              type="text"
              name="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              errors={errors.first_name}
              required
            />
            <FloatingLabelInput
              label="Middle Name"
              type="text"
              name="middle_name"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              errors={errors.middle_name}
            />
            <FloatingLabelInput
              label="Last Name"
              type="text"
              name="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              errors={errors.last_name}
              required
            />
            <FloatingLabelInput
              label="Suffix Name"
              type="text"
              name="suffix_name"
              value={suffixName}
              onChange={(e) => setSuffixName(e.target.value)}
              errors={errors.suffix_name}
            />
          </div>
        </div>

        {/* Access Configuration */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Shield size={18} className="text-[#003B5C]" />
            <h2 className="font-semibold text-[#003B5C]">
              Access Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelSelect
              label="Role"
              name="role_id"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              errors={errors.role_id}
            >
              {loadingRoles ? (
                <option>Loading...</option>
              ) : (
                <>
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role}
                    </option>
                  ))}
                </>
              )}
            </FloatingLabelSelect>

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
                      {office.office}
                    </option>
                  ))}
                </>
              )}
            </FloatingLabelSelect>

            <FloatingLabelSelect
              label="Account Status"
              name="account_status"
              value={accountStatus}
              onChange={(e) =>
                setAccountStatus(e.target.value as "Active" | "Inactive")
              }
              errors={errors.account_status}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </FloatingLabelSelect>
          </div>
        </div>

        {/* Account Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Mail size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Account Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingLabelInput
              label="Email"
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errors={errors.email}
            />
            <FloatingLabelInput
              label="Username"
              type="text"
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              errors={errors.username}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#0095D9]/10">
          {!loadingUpdate && <CloseButton label="Close" onClose={onClose} />}
          <SubmitButton
            label="Update User"
            loading={loadingUpdate}
            loadingLabel="Updating User..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditUserFormModal;
