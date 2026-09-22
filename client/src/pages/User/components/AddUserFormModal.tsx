import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import Modal from "../../../components/Modal";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";
import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from "react";
import RoleService from "../../../services/RoleService";
import OfficeService from "../../../services/OfficeService";
import UserService from "../../../services/UserService";
import type { UserFieldErrors } from "../../../interfaces/User";
import type { RoleColumns } from "../../../interfaces/RoleColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import { User, Shield, Camera, Lock, X } from "lucide-react";

interface AddUserFormModalProps {
  onUserAdded: (message: string) => void;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: () => void;
}

const AddUserFormModal: FC<AddUserFormModalProps> = ({
  onUserAdded,
  isOpen,
  onClose,
  refreshKey,
}) => {
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roles, setRoles] = useState<RoleColumns[]>([]);

  const [loadingOffices, setLoadingOffices] = useState(false);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const [loadingStore, setLoadingStore] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffixName, setSuffixName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null,
  );
  const [roleId, setRoleId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<UserFieldErrors>({});

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setProfilePhoto(file);
    setProfilePhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
  };

  const handleStoreUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoadingStore(true);

      const payload = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix_name: suffixName,
        role_id: roleId,
        office_id: officeId,
        email: email,
        username: username,
        password: password,
        password_confirmation: passwordConfirmation,
      };

      const res = await UserService.storeUser(payload);

      if (res.status === 200 || res.status === 201) {
        if (profilePhoto) {
          const photoFormData = new FormData();
          photoFormData.append("profile_photo", profilePhoto);
          await UserService.uploadProfilePhoto(
            res.data.user.user_id,
            photoFormData,
          );
        }

        onUserAdded(res.data.message);
        refreshKey();

        setFirstName("");
        setMiddleName("");
        setLastName("");
        setSuffixName("");
        setProfilePhoto(null);
        setProfilePhotoPreview(null);
        setRoleId("");
        setOfficeId("");
        setEmail("");
        setUsername("");
        setPassword("");
        setPasswordConfirmation("");
        setErrors({});
      } else {
        console.error(
          "Unexpected error occurred during adding user: ",
          res.status,
        );
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors);
      } else {
        console.log(
          "Unexpected server error occurred during adding user: ",
          error,
        );
      }
    } finally {
      setLoadingStore(false);
    }
  };

  const handleLoadRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await RoleService.loadRoles();
      if (res.status === 200) {
        setRoles(res.data.roles);
      }
    } catch (error) {
      console.error(
        "Unexpected server error occurred during loading roles: ",
        error,
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleLoadOffices = async () => {
    try {
      setLoadingOffices(true);
      const res = await OfficeService.loadOffices();
      if (res.status === 200) {
        setOffices(res.data.offices);
      }
    } catch (error) {
      console.error(
        "Unexpected server error occurred during loading office: ",
        error,
      );
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <form onSubmit={handleStoreUser}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6 mb-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <User className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">Add User</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create a new system user and assign permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="mb-8 flex flex-col items-center">
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
              htmlFor="profile_photo"
              className="
                        absolute bottom-1 right-1
                        flex h-10 w-10 cursor-pointer items-center justify-center
                        rounded-full
                        bg-white
                        border-2 border-[#0095D9]
                        text-[#0095D9]
                        transition-all
                        hover:bg-[#0095D9]/10
                    "
            >
              <Camera size={18} />
            </label>

            <input
              id="profile_photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <p className="mt-3 text-xs text-gray-400">Upload profile picture</p>
        </div>

        {/* Personal Information */}
        <div className="mb-6 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <User size={18} className="text-[#0095D9]" />
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
              autoFocus
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

        {/* Role & Office */}
        <div className="mb-6 rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Shield size={18} className="text-[#003B5C]" />
            <h2 className="font-semibold text-[#003B5C]">Role & Office</h2>
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
          </div>
        </div>

        {/* Account Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Lock size={18} className="text-[#0095D9]" />
            <h2 className="font-semibold text-[#003B5C]">
              Account Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              errors={errors.username}
              required
            />

            <FloatingLabelInput
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errors={errors.password}
              required
            />

            <FloatingLabelInput
              label="Confirm Password"
              type="password"
              name="password_confirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              errors={errors.password_confirmation}
              required
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          {!loadingStore && <CloseButton label="Cancel" onClose={onClose} />}

          <SubmitButton
            label="Create User"
            loading={loadingStore}
            loadingLabel="Creating User..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddUserFormModal;
