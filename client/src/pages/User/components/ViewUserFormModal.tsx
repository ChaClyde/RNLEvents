import type { FC } from "react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import type { User as UserType } from "../../../interfaces/User";
import jsPDF from "jspdf";
import {
  User as UserIcon,
  Shield,
  Calendar,
  Download,
  CircleCheck,
  CircleX,
  AtSign,
} from "lucide-react";

interface UserViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

const UserViewModal: FC<UserViewModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const getInitials = () => {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    let fullName = user.middle_name
      ? `${user.last_name}, ${user.first_name} ${user.middle_name.charAt(0)}.`
      : `${user.last_name}, ${user.first_name}`;
    if (user.suffix_name) fullName += ` ${user.suffix_name}`;
    return fullName;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("User Details", 105, 20, { align: "center" });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 28, 196, 28);

    const fields = [
      ["Full Name", getFullName()],
      ["Username", user.username],
      ["Email", user.email],
      ["Role", user.role.role],
      ["Office", user.office.office],
      ["Status", user.account_status],
      [
        "Created At",
        new Date(user.created_at).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ],
    ];

    let y = 40;
    fields.forEach(([label, value]) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, 14, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value ?? "—", 60, y);

      y += 12;
    });

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString("en-PH")}`, 14, 285);

    doc.save(`${user.username}_details.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <UserIcon className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C]">
                User Profile
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Complete information and account details.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-6">
          <div className="flex flex-col items-center">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={getInitials()}
                className="
                  h-28 w-28 rounded-full object-cover
                  border-4 border-[#0095D9]
                  shadow-lg shadow-[#0095D9]/20
                "
              />
            ) : (
              <div
                className="
                  flex h-28 w-28 items-center justify-center
                  rounded-full
                  bg-[#003B5C]
                  text-3xl font-bold text-white
                  border-4 border-white
                  shadow-lg
                "
              >
                {getInitials()}
              </div>
            )}

            <h2 className="mt-4 text-xl font-bold text-[#003B5C]">
              {getFullName()}
            </h2>

            <p className="text-gray-500">@{user.username}</p>

            <div className="mt-3">
              {user.account_status === "Active" ? (
                <span
                  className="
                    inline-flex items-center gap-2
                    rounded-full
                    border border-emerald-200
                    bg-emerald-50
                    px-4 py-1
                    text-xs font-medium text-emerald-600
                  "
                >
                  <CircleCheck size={14} />
                  ACTIVE
                </span>
              ) : (
                <span
                  className="
                    inline-flex items-center gap-2
                    rounded-full
                    border border-red-200
                    bg-red-50
                    px-4 py-1
                    text-xs font-medium text-red-600
                  "
                >
                  <CircleX size={14} />
                  INACTIVE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Information */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <AtSign className="text-[#0095D9]" size={18} />
              <h3 className="font-semibold text-[#003B5C]">
                Account Information
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Username</p>
                <p className="font-medium text-gray-900">{user.username}</p>
              </div>

              <div>
                <p className="text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="text-[#003B5C]" size={18} />
              <h3 className="font-semibold text-[#003B5C]">Organization</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{user.role.role}</p>
              </div>

              <div>
                <p className="text-gray-500">Office</p>
                <p className="font-medium text-gray-900">
                  {user.office.office}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <UserIcon size={18} className="text-[#0095D9]" />
            <h3 className="font-semibold text-[#003B5C]">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-gray-500 uppercase">First Name</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.first_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase">Middle Name</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.middle_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase">Last Name</p>
              <p className="mt-1 text-gray-900 font-medium">{user.last_name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase">Suffix</p>
              <p className="mt-1 text-gray-900 font-medium">
                {user.suffix_name || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#0095D9]" />
              <h3 className="font-semibold text-[#003B5C]">Created</h3>
            </div>

            <p className="text-gray-700">
              {new Date(user.created_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#003B5C]" />
              <h3 className="font-semibold text-[#003B5C]">Updated</h3>
            </div>

            <p className="text-gray-700">
              {new Date(user.updated_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#0095D9]/10 pt-6">
          <CloseButton label="Close" onClose={onClose} />

          <button
            type="button"
            onClick={handleExportPDF}
            className="
              flex items-center gap-2
              rounded-2xl
              bg-red-600
              px-5 py-3
              text-sm font-medium
              text-white
              transition-all
              hover:bg-red-500
              hover:shadow-lg
              hover:shadow-red-500/25
            "
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserViewModal;
