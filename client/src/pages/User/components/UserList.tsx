import { useEffect, useState, type FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import RoleService from "../../../services/RoleService";
import OfficeService from "../../../services/OfficeService";
import Spinner from "../../../components/Spinner/Spinner";
import type { RoleColumns } from "../../../interfaces/RoleColumns";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users,
  UserPlus,
  FileDown,
  Shield,
  Building2,
  Filter,
  RefreshCw,
} from "lucide-react";
import type { UserColumns } from "../../../interfaces/UserColumns";
import { Permission } from "../../../permissions";
import { usePermissions } from "../../../hooks/usePermissions";

interface UserListProps {
  users: UserColumns[];
  loading: boolean;
  onAddUser: () => void;
  onViewUser: (user: UserColumns) => void;
  onEditUser: (user: UserColumns) => void;
  onDeleteUser: (user: UserColumns) => void;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 10;

const UserList: FC<UserListProps> = ({
  users,
  loading,
  onAddUser,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onRefresh,
}) => {
  const { can } = usePermissions();
  const officeUsersOnly = can(Permission.USERS_VIEW) && !can(Permission.ROLES_VIEW);

  const [roles, setRoles] = useState<RoleColumns[]>([]);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterOffice, setFilterOffice] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Load roles
  const handleLoadRoles = async () => {
    try {
      const res = await RoleService.loadRoles();

      if (res.status === 200) {
        setRoles(res.data.roles ?? []);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  // Load offices
  const handleLoadOffices = async () => {
    try {
      const res = await OfficeService.loadOffices();

      if (res.status === 200) {
        setOffices(res.data.offices ?? []);
      }
    } catch (error) {
      console.error("Error loading offices:", error);
    }
  };

  useEffect(() => {
    handleLoadRoles();
    handleLoadOffices();
  }, []);

  // Reset pagination whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterOffice, filterDate]);

  // Format user full name
  const handleUserFullNameFormat = (user: UserColumns): string => {
    const middleInitial = user.middle_name
      ? ` ${user.middle_name.charAt(0)}.`
      : "";

    const suffix = user.suffix_name ? ` ${user.suffix_name}` : "";

    return `${user.last_name}, ${user.first_name}${middleInitial}${suffix}`;
  };

  // Generate user initials
  const handleUserInitials = (user: UserColumns): string => {
    return `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.toUpperCase();
  };

  // Safely format a date for filtering
  const getLocalDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Safely format a date for display
  const formatDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-PH");
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const fullName = handleUserFullNameFormat(user).toLowerCase();
    const search = searchQuery.trim().toLowerCase();

    const matchesSearch =
      search === "" ||
      fullName.toLowerCase().includes(search) ||
      (user.email ?? "").toLowerCase().includes(search) ||
      (user.username ?? "").toLowerCase().includes(search) ||
      (user.position ?? "").toLowerCase().includes(search) ||
      (user.contact_number ?? "").toLowerCase().includes(search);

    const matchesRole =
      filterRole === "" || String(user.role_id) === filterRole;

    const matchesOffice =
      filterOffice === "" || String(user.office_id) === filterOffice;

    const matchesDate =
      filterDate === "" || getLocalDate(user.created_at) === filterDate;

    return matchesSearch && matchesRole && matchesOffice && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  // Keep current page valid when the number of results changes
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Clear filters
  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterRole("");
    setFilterOffice("");
    setFilterDate("");
    setCurrentPage(1);
  };

  // Export filtered users to PDF
  const handleExportAllPDF = () => {
    if (filteredUsers.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 59, 92);
    doc.text("User Management Report", 148.5, 15, {
      align: "center",
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString("en-PH")}`, 14, 23);

    doc.text(`Total Records: ${filteredUsers.length}`, 14, 29);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "#",
          "Full Name",
          "Username",
          "Role",
          "Office",
          "Email",
          "Contact Number",
          "Status",
          "Date Created",
        ],
      ],
      body: filteredUsers.map((user, index) => [
        index + 1,
        handleUserFullNameFormat(user),
        user.username ?? "-",
        user.role?.name ?? "-",
        user.office?.office_name ?? "-",
        user.email ?? "-",
        user.contact_number ?? "-",
        user.account_status ?? "-",
        formatDate(user.created_at),
      ]),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [0, 59, 92],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [240, 248, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        7: { halign: "center" },
        8: { halign: "center" },
      },
      margin: {
        top: 35,
        left: 14,
        right: 14,
      },
    });

    doc.save("filsched_user_list.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#0095D9]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Users className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[#003B5C] dark:text-white sm:text-4xl">
                {officeUsersOnly ? "Office Users" : "User Management"}
              </h1>

              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {officeUsersOnly
                  ? "Manage users in your office."
                  : "Manage users, offices, roles and system access."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={!onRefresh || loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C] hover:shadow-lg hover:shadow-[#0095D9]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Users
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Users className="text-[#0095D9]" />

            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {users.length}
            </span>
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5 dark:border-[#0095D9]/30 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Roles
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Shield className="text-[#003B5C] dark:text-[#0095D9]" />

            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {roles.length}
            </span>
          </div>
        </div>

        {/* Offices */}
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Offices
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Building2 className="text-[#0095D9]" />

            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {offices.length}
            </span>
          </div>
        </div>

        {/* Filtered Results */}
        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5 dark:border-[#0095D9]/30 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Filtered Results
          </p>

          <div className="mt-3 flex items-center gap-3">
            <Filter className="text-[#003B5C] dark:text-[#0095D9]" />

            <span className="text-3xl font-bold text-[#003B5C] dark:text-white">
              {filteredUsers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Search */}
        <input
          type="text"
          placeholder="Search name, email, username..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setSearchQuery(e.target.value);
          }}
          className="w-full rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:w-64"
        />

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Roles</option>

          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.name}
            </option>
          ))}
        </select>

        {/* Office Filter */}
        <select
          value={filterOffice}
          onChange={(e) => setFilterOffice(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Offices</option>

          {offices.map((office) => (
            <option key={office.office_id} value={office.office_id}>
              {office.office_name}
            </option>
          ))}
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {/* Clear Filters */}
        {(searchQuery || filterRole || filterOffice || filterDate) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-gray-500 underline transition hover:text-[#0095D9] dark:text-gray-400"
          >
            Clear Filters
          </button>
        )}

        {/* Actions */}
        <div className="ml-auto flex w-full flex-wrap gap-3 sm:w-auto">
          <button
            type="button"
            onClick={handleExportAllPDF}
            disabled={filteredUsers.length === 0}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#003B5C]/30 bg-[#003B5C]/10 px-5 py-3 text-sm font-medium text-[#003B5C] transition-all hover:bg-[#003B5C]/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#0095D9]/30 dark:bg-[#0095D9]/10 dark:text-[#0095D9] dark:hover:bg-[#0095D9]/20"
          >
            <FileDown size={16} />
            Export PDF
          </button>

          <button
            type="button"
            onClick={onAddUser}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 border-b border-[#003B5C] bg-gradient-to-r from-[#003B5C] to-[#0095D9] text-xs text-white">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-center">
                  NO.
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-center">
                  PROFILE
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  FULL NAME
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  ROLE
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  OFFICE
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-start">
                  EMAIL
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-center">
                  STATUS
                </TableCell>

                <TableCell isHeader className="px-5 py-3 text-center">
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#0095D9]/10 text-sm text-gray-700 dark:divide-gray-800 dark:text-gray-300">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="opacity-40" />

                      <p className="font-medium">No users found.</p>

                      <p className="text-xs">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow
                    key={user.user_id}
                    className="transition-colors hover:bg-[#0095D9]/5 dark:hover:bg-gray-800/70"
                  >
                    {/* Number */}
                    <TableCell className="px-4 py-3 text-center">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>

                    {/* Profile */}
                    <TableCell className="px-4 py-3 text-center">
                      {user.profile_photo_url ? (
                        <img
                          src={user.profile_photo_url}
                          alt={`${handleUserFullNameFormat(user)} profile`}
                          className="mx-auto h-10 w-10 rounded-full border border-[#0095D9]/20 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#003B5C] to-[#0095D9] text-sm font-bold text-white">
                          {handleUserInitials(user)}
                        </div>
                      )}
                    </TableCell>

                    {/* Full Name */}
                    <TableCell className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {handleUserFullNameFormat(user)}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-4 py-3">
                      {user.role?.name ?? "-"}
                    </TableCell>

                    {/* Office */}
                    <TableCell className="px-4 py-3">
                      {user.office?.office_name ?? "-"}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="px-4 py-3">{user.email}</TableCell>

                    {/* Account Status */}
                    <TableCell className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.account_status === "Active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                      >
                        {user.account_status}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewUser(user)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditUser(user)}
                          className="rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-1.5 text-sm font-medium text-[#0095D9] transition hover:bg-[#0095D9]/20"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteUser(user)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#0095D9]/10 px-6 py-4 dark:border-gray-800 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      currentPage === page
                        ? "bg-[#0095D9] text-white"
                        : "border border-[#0095D9]/20 bg-white text-gray-700 hover:bg-[#0095D9]/5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-[#0095D9]/5 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
