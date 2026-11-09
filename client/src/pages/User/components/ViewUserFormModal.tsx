import type { FC } from "react";
import Modal from "../../../components/Modal";
import CloseButton from "../../../components/Button/CloseButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  User as UserIcon,
  Shield,
  Calendar,
  Download,
  CircleCheck,
  CircleX,
  AtSign,
  Briefcase,
  Phone,
  Clock,
  KeyRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { UserColumns } from "../../../interfaces/UserColumns";

interface UserViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserColumns | null;
}

const UserViewModal: FC<UserViewModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  // User initials
  const getInitials = (): string => {
    return `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.toUpperCase();
  };

  // Full name formatting
  const getFullName = (): string => {
    const middleInitial = user.middle_name
      ? ` ${user.middle_name.charAt(0)}.`
      : "";

    const suffix = user.suffix_name ? ` ${user.suffix_name}` : "";

    return `${user.last_name}, ${user.first_name}${middleInitial}${suffix}`;
  };

  // Safe date formatting
  const formatDate = (
    dateValue: string | null | undefined,
    includeTime = false,
  ): string => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(includeTime && {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  // Export user details to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Header
    doc.setFillColor(0, 59, 92);
    doc.rect(0, 0, 210, 35, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("USER PROFILE REPORT", 105, 15, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("FilSched - User Management System", 105, 23, {
      align: "center",
    });

    doc.setTextColor(50, 50, 50);

    // User name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(getFullName(), 14, 47);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Username: @${user.username}`, 14, 54);

    // Account status
    doc.setTextColor(50, 50, 50);

    const accountStatus = user.account_status ?? "Unknown";

    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT STATUS", 145, 47);

    doc.setFont("helvetica", "normal");

    if (accountStatus === "Active") {
      doc.setTextColor(0, 130, 75);
    } else {
      doc.setTextColor(200, 50, 50);
    }

    doc.text(accountStatus.toUpperCase(), 145, 54);

    doc.setTextColor(50, 50, 50);

    // User information
    const accountFields = [
      ["Username", user.username],
      ["Email Address", user.email],
      ["Email Verified", user.email_verified_at ? "Verified" : "Not Verified"],
      ["Account Status", user.account_status],
      ["Role", user.role?.name ?? "Not Assigned"],
      ["Office", user.office?.office_name ?? "Not Assigned"],
      ["Position", user.position ?? "—"],
      ["Contact Number", user.contact_number ?? "—"],
      ["Password Change Required", user.must_change_password ? "Yes" : "No"],
      ["Online Status", user.online_status ? "Online" : "Offline"],
      ["Last Login", formatDate(user.last_login_at, true)],
      ["Last Activity", formatDate(user.last_activity_at, true)],
      ["Date Created", formatDate(user.created_at, true)],
      ["Last Updated", formatDate(user.updated_at, true)],
    ];

    autoTable(doc, {
      startY: 63,
      head: [["ACCOUNT AND ORGANIZATION INFORMATION", "DETAILS"]],
      body: accountFields,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [0, 103, 158],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: {
          cellWidth: 65,
          fontStyle: "bold",
          textColor: [70, 70, 70],
        },
        1: {
          cellWidth: 115,
          textColor: [40, 40, 40],
        },
      },
    });

    // Personal information
    const personalFields = [
      ["First Name", user.first_name],
      ["Middle Name", user.middle_name ?? "—"],
      ["Last Name", user.last_name],
      ["Suffix", user.suffix_name ?? "—"],
    ];

    const finalY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? 63;

    autoTable(doc, {
      startY: finalY + 8,
      head: [["PERSONAL INFORMATION", "DETAILS"]],
      body: personalFields,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 59, 92],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: {
          cellWidth: 65,
          fontStyle: "bold",
          textColor: [70, 70, 70],
        },
        1: {
          cellWidth: 115,
        },
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);

      doc.text(`Generated on ${new Date().toLocaleString("en-PH")}`, 14, 287);

      doc.text(`Page ${page} of ${pageCount}`, 196, 287, { align: "right" });
    }

    const safeUsername = user.username.replace(/[^a-zA-Z0-9_-]/g, "_");

    doc.save(`${safeUsername}_user_details.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
      <div className="max-h-[85vh] space-y-6 overflow-y-auto pr-1">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0095D9]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#003B5C]/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#003B5C] to-[#0095D9] p-3">
              <UserIcon className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#003B5C] dark:text-white">
                User Profile
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Complete information and account details.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col items-center">
            {user.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={`${getFullName()} profile`}
                className="h-28 w-28 rounded-full border-4 border-[#0095D9] object-cover shadow-lg shadow-[#0095D9]/20"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#003B5C] to-[#0095D9] text-3xl font-bold text-white shadow-lg dark:border-gray-800">
                {getInitials()}
              </div>
            )}

            <h2 className="mt-4 text-xl font-bold text-[#003B5C] dark:text-white">
              {getFullName()}
            </h2>

            <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>

            {/* Account Status */}
            <div className="mt-3">
              {user.account_status === "Active" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-medium text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CircleCheck size={14} />
                  ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                  <CircleX size={14} />
                  INACTIVE
                </span>
              )}
            </div>

            {/* Online Status */}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  user.online_status ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />

              <span className="text-gray-500 dark:text-gray-400">
                {user.online_status ? "Currently Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Account Information */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <AtSign className="text-[#0095D9]" size={18} />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Account Information
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Username</p>

                <p className="font-medium text-gray-900 dark:text-white">
                  {user.username}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Email Address
                </p>

                <p className="break-all font-medium text-gray-900 dark:text-white">
                  {user.email}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Email Verification
                </p>

                <div className="mt-1 flex items-center gap-2">
                  {user.email_verified_at ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-500" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle size={15} className="text-red-500" />
                      <span className="font-medium text-red-600 dark:text-red-400">
                        Not Verified
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  Password Change
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <KeyRound size={15} className="text-[#0095D9]" />

                  <span className="font-medium text-gray-900 dark:text-white">
                    {user.must_change_password
                      ? "Password change required"
                      : "No change required"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <Shield
                className="text-[#003B5C] dark:text-[#0095D9]"
                size={18}
              />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Organization
              </h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Role</p>

                <p className="font-medium text-gray-900 dark:text-white">
                  {user.role?.name ?? "Not Assigned"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">Office</p>

                <p className="font-medium text-gray-900 dark:text-white">
                  {user.office?.office_name ?? "Not Assigned"}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">Role ID</p>

                <p className="font-medium text-gray-900 dark:text-white">
                  {user.role_id}
                </p>
              </div>

              <div>
                <p className="text-gray-500 dark:text-gray-400">Office ID</p>

                <p className="font-medium text-gray-900 dark:text-white">
                  {user.office_id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-2">
            <UserIcon size={18} className="text-[#0095D9]" />

            <h3 className="font-semibold text-[#003B5C] dark:text-white">
              Personal Information
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                First Name
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {user.first_name}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Middle Name
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {user.middle_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Last Name
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {user.last_name}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Suffix
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {user.suffix_name || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Employment / Contact Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Position */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <Briefcase size={18} className="text-[#0095D9]" />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Position
              </h3>
            </div>

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user.position || "Not Specified"}
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <Phone size={18} className="text-[#0095D9]" />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Contact Number
              </h3>
            </div>

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user.contact_number || "Not Provided"}
            </p>
          </div>
        </div>

        {/* Activity Information */}
        <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-2">
            <Clock size={18} className="text-[#0095D9]" />

            <h3 className="font-semibold text-[#003B5C] dark:text-white">
              Account Activity
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Last Login
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(user.last_login_at, true)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Last Activity
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(user.last_activity_at, true)}
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Created */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-[#0095D9]" />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Created
              </h3>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatDate(user.created_at)}
            </p>
          </div>

          {/* Updated */}
          <div className="rounded-2xl border border-[#0095D9]/20 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <Calendar
                size={18}
                className="text-[#003B5C] dark:text-[#0095D9]"
              />

              <h3 className="font-semibold text-[#003B5C] dark:text-white">
                Last Updated
              </h3>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatDate(user.updated_at)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#0095D9]/10 pt-6 dark:border-gray-700 sm:flex-row">
          <CloseButton label="Close" onClose={onClose} />

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/25"
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
