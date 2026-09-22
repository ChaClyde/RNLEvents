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
import type { User } from "../../../interfaces/User";
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

interface UserListProps {
  users: User[];
  loading: boolean;
  onAddUser: () => void;
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onRefresh?: () => void;
}

const UserList: FC<UserListProps> = ({
  users,
  loading,
  onAddUser,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onRefresh,
}) => {
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
  const itemsPerPage = 10;

  const handleLoadRoles = async () => {
    try {
      const res = await RoleService.loadRoles();
      if (res.status === 200) setRoles(res.data.roles);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const handleLoadOffices = async () => {
    try {
      const res = await OfficeService.loadOffices();
      if (res.status === 200) setOffices(res.data.offices);
    } catch (error) {
      console.error("Error loading offices:", error);
    }
  };

  useEffect(() => {
    handleLoadRoles();
    handleLoadOffices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterOffice, filterDate]);

  const handleUserFullNameFormat = (user: User) => {
    let fullName = user.middle_name
      ? `${user.last_name}, ${user.first_name} ${user.middle_name.charAt(0)}.`
      : `${user.last_name}, ${user.first_name}`;
    if (user.suffix_name) fullName += ` ${user.suffix_name}`;
    return fullName;
  };

  const handleUserInitials = (user: User) => {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  };

  const filteredUsers = users.filter((user) => {
    const fullName = handleUserFullNameFormat(user).toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      fullName.includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      filterRole === "" || user.role?.role_id.toString() === filterRole;

    const matchesOffice =
      filterOffice === "" || user.office?.office_id.toString() === filterOffice;

    const matchesDate =
      filterDate === "" ||
      new Date(user.created_at).toISOString().slice(0, 10) === filterDate;

    return matchesSearch && matchesRole && matchesOffice && matchesDate;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilterRole("");
    setFilterOffice("");
    setFilterDate("");
  };

  const handleExportAllPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("User List", 105, 15, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString("en-PH")}`, 14, 22);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 28,
      head: [
        ["#", "Full Name", "Role", "Office", "Email", "Status", "Date Created"],
      ],
      body: filteredUsers.map((user, index) => [
        index + 1,
        handleUserFullNameFormat(user),
        user.role?.role ?? "-",
        user.office?.office ?? "-",
        user.email,
        user.account_status,
        new Date(user.created_at).toLocaleDateString("en-PH"),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 149, 217] }, // #0095D9
    });

    doc.save("users_list.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#0095D9]/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#003B5C]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-linear-to-r from-[#003B5C] to-[#0095D9] p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#003B5C]">
                User Management
              </h1>
              <p className="mt-1 text-gray-500">
                Manage users, offices, roles and system access.
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C] hover:shadow-lg hover:shadow-[#0095D9]/25"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5">
          <p className="text-sm text-gray-500">Total Users</p>
          <div className="mt-3 flex items-center gap-3">
            <Users className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {users.length}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5">
          <p className="text-sm text-gray-500">Active Roles</p>
          <div className="mt-3 flex items-center gap-3">
            <Shield className="text-[#003B5C]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {roles.length}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#0095D9]/20 bg-[#0095D9]/5 p-5">
          <p className="text-sm text-gray-500">Offices</p>
          <div className="mt-3 flex items-center gap-3">
            <Building2 className="text-[#0095D9]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {offices.length}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#003B5C]/20 bg-[#003B5C]/5 p-5">
          <p className="text-sm text-gray-500">Filtered Results</p>
          <div className="mt-3 flex items-center gap-3">
            <Filter className="text-[#003B5C]" />
            <span className="text-3xl font-bold text-[#003B5C]">
              {filteredUsers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search name, email, username..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setSearchQuery(e.target.value);
          }}
          className="w-64 rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#0095D9]"
        />

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 focus:border-[#0095D9]"
        >
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.role}
            </option>
          ))}
        </select>

        <select
          value={filterOffice}
          onChange={(e) => setFilterOffice(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-gray-900 focus:border-[#0095D9]"
        >
          <option value="">All Offices</option>
          {offices.map((office) => (
            <option key={office.office_id} value={office.office_id}>
              {office.office}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0095D9]"
        />

        {(searchQuery || filterRole || filterOffice || filterDate) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-[#0095D9] underline"
          >
            Clear Filters
          </button>
        )}

        <div className="ml-auto flex gap-3">
          <button
            type="button"
            onClick={handleExportAllPDF}
            className="rounded-2xl border border-[#003B5C]/30 bg-[#003B5C]/10 px-5 py-3 text-sm font-medium text-[#003B5C] transition-all hover:bg-[#003B5C]/20"
          >
            <div className="flex items-center gap-2">
              <FileDown size={16} />
              Export PDF
            </div>
          </button>

          <button
            type="button"
            onClick={onAddUser}
            className="rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
          >
            <div className="flex items-center gap-2">
              <UserPlus size={16} />
              Add User
            </div>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-linear-to-r from-[#003B5C] to-[#0095D9] border-b border-[#003B5C] text-xs text-white">
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
                <TableCell isHeader className="px-5 py-3 text-start">
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#0095D9]/10 text-sm text-gray-700">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow
                    key={user.user_id}
                    className="hover:bg-[#0095D9]/5 transition-colors"
                  >
                    <TableCell className="px-4 py-3 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-center">
                      {user.profile_photo_url ? (
                        <img
                          src={user.profile_photo_url}
                          alt={handleUserInitials(user)}
                          className="w-10 h-10 rounded-full object-cover mx-auto border border-[#0095D9]/20"
                        />
                      ) : (
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#0095D9] text-sm font-bold text-white">
                          {handleUserInitials(user)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-gray-900">
                      {handleUserFullNameFormat(user)}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      {user.role?.role ?? "-"}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      {user.office?.office ?? "-"}
                    </TableCell>

                    <TableCell className="px-4 py-3">{user.email}</TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => onViewUser(user)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditUser(user)}
                          className="rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-1.5 text-sm font-medium text-[#0095D9] hover:bg-[#0095D9]/20"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#0095D9]/10 px-6 py-4">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-30 hover:bg-[#0095D9]/5 transition"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      currentPage === page
                        ? "bg-[#0095D9] text-white"
                        : "border border-[#0095D9]/20 bg-white text-gray-700 hover:bg-[#0095D9]/5"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[#0095D9]/20 bg-white px-4 py-2 text-sm text-gray-700 disabled:opacity-30 hover:bg-[#0095D9]/5 transition"
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
