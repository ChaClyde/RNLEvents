import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isAxiosError } from "axios";
import {
  Download,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  Power,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import RoleStatusBadge from "./RoleStatusBadge";
import type { RoleColumns, RoleStatus } from "../../../interfaces/RoleColumns";

import Spinner from "../../../components/Spinner/Spinner";
import RoleService from "../../../services/RoleService";

interface RoleListProps {
  refreshKey?: boolean;
  onAdd?: () => void;
  onEdit: (role: RoleColumns) => void;
  onDelete: (role: RoleColumns) => void;
}

type RoleResponse = {
  roles: RoleColumns[];
};

const ITEMS_PER_PAGE = 10;

const RoleList: React.FC<RoleListProps> = ({
  refreshKey,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [roles, setRoles] = useState<RoleColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RoleStatus>("all");

  const [typeFilter, setTypeFilter] = useState<"all" | "system" | "custom">(
    "all",
  );

  const [currentPage, setCurrentPage] = useState(1);

  // Tracks which role is currently being activated/deactivated.
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  const [statusActionError, setStatusActionError] = useState("");

  // ==========================================
  // LOAD ROLES
  // ==========================================

  const handleLoadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await RoleService.loadRoles();
      const data = response.data as RoleResponse;

      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (err) {
      console.error("Failed to load roles:", err);

      if (isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Unable to load roles. Please try again.",
        );
      } else {
        setError("An unexpected error occurred while loading roles.");
      }

      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleLoadRoles();
  }, [handleLoadRoles, refreshKey]);

  // ==========================================
  // ACTIVATE / DEACTIVATE ROLE
  // ==========================================

  const handleToggleStatus = async (role: RoleColumns) => {
    if (updatingRoleId !== null) return;

    const isCurrentlyActive = role.status === "active";

    // System roles cannot be deactivated.
    if (role.is_system_role && isCurrentlyActive) {
      setStatusActionError("System roles cannot be deactivated.");
      return;
    }

    const action = isCurrentlyActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the "${role.name}" role?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingRoleId(role.role_id);
      setStatusActionError("");

      if (isCurrentlyActive) {
        await RoleService.deactivateRole(role.role_id);
      } else {
        await RoleService.activateRole(role.role_id);
      }

      // Update the table immediately after successful API response.
      setRoles((previousRoles) =>
        previousRoles.map((item) =>
          item.role_id === role.role_id
            ? {
                ...item,
                status: isCurrentlyActive ? "inactive" : "active",
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Failed to update role status:", err);

      if (isAxiosError(err)) {
        setStatusActionError(
          err.response?.data?.message ||
            `Unable to ${action} this role. Please try again.`,
        );
      } else {
        setStatusActionError(
          "An unexpected error occurred while updating the role.",
        );
      }

      // Reload from the server if the update failed.
      handleLoadRoles();
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesSearch =
        !normalizedSearch ||
        [role.name, role.slug, role.description ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );

      const matchesStatus =
        statusFilter === "all" || role.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "system" && role.is_system_role) ||
        (typeFilter === "custom" && !role.is_system_role);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [roles, searchTerm, statusFilter, typeFilter]);

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / ITEMS_PER_PAGE),
  );

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredRoles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRoles, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalRoles = roles.length;

  const activeRoles = roles.filter((role) => role.status === "active").length;

  const inactiveRoles = roles.filter(
    (role) => role.status === "inactive",
  ).length;

  const systemRoles = roles.filter((role) => role.is_system_role).length;

  const customRoles = roles.filter((role) => !role.is_system_role).length;

  // ==========================================
  // EXPORT PDF
  // ==========================================

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Role Management Report", 14, 18);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Total Roles: ${totalRoles}`, 14, 33);
    doc.text(`Active Roles: ${activeRoles}`, 14, 40);
    doc.text(`Inactive Roles: ${inactiveRoles}`, 14, 47);
    doc.text(`System Roles: ${systemRoles}`, 14, 54);
    doc.text(`Custom Roles: ${customRoles}`, 14, 61);

    autoTable(doc, {
      startY: 69,
      head: [["Role Name", "Slug", "Description", "Type", "Status", "Users"]],
      body: filteredRoles.map((role) => [
        role.name,
        role.slug,
        role.description || "No description",
        role.is_system_role ? "System" : "Custom",
        role.status.toUpperCase(),
        String(role.users_count ?? 0),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fontStyle: "bold",
      },
    });

    doc.save("role-management-report.pdf");
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Role Management
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage system roles and their assigned users.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filteredRoles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Download size={16} />
            Export PDF
          </button>

          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00679E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00547F]"
            >
              <Plus size={16} />
              Add Role
            </button>
          )}
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Roles"
          value={totalRoles}
          icon={<Shield size={20} />}
        />

        <StatCard
          label="Active Roles"
          value={activeRoles}
          icon={<Shield size={20} />}
        />

        <StatCard
          label="Inactive Roles"
          value={inactiveRoles}
          icon={<Power size={20} />}
        />

        <StatCard
          label="System Roles"
          value={systemRoles}
          icon={<Lock size={20} />}
        />

        <StatCard
          label="Custom Roles"
          value={customRoles}
          icon={<Users size={20} />}
        />
      </div>

      {/* LOAD ERROR */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <span>{error}</span>

            <button
              type="button"
              onClick={handleLoadRoles}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* STATUS ACTION ERROR */}
      {statusActionError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>{statusActionError}</span>

          <button
            type="button"
            onClick={() => setStatusActionError("")}
            className="font-semibold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search role name, slug, or description..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#00679E] focus:ring-2 focus:ring-[#00679E]/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | RoleStatus)
          }
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-[#00679E] dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as "all" | "system" | "custom")
          }
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-[#00679E] dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="system">System Roles</option>
          <option value="custom">Custom Roles</option>
        </select>
      </div>

      {/* ROLE TABLE */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {filteredRoles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield size={36} className="mx-auto mb-3 text-gray-400" />

            <h3 className="font-semibold text-gray-900 dark:text-white">
              No roles found
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Slug</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Users</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedRoles.map((role) => {
                    const isUpdating = updatingRoleId === role.role_id;

                    const isActive = role.status === "active";

                    const cannotDeactivate = role.is_system_role && isActive;

                    return (
                      <tr
                        key={role.role_id}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {/* ROLE NAME */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {role.name}
                          </div>
                        </td>

                        {/* SLUG */}
                        <td className="px-5 py-4">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {role.slug}
                          </code>
                        </td>

                        {/* DESCRIPTION */}
                        <td className="max-w-[260px] px-5 py-4 text-gray-600 dark:text-gray-400">
                          <span className="line-clamp-2">
                            {role.description || "No description"}
                          </span>
                        </td>

                        {/* TYPE */}
                        <td className="px-5 py-4">
                          {role.is_system_role ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              <Lock size={12} />
                              System
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              Custom
                            </span>
                          )}
                        </td>

                        {/* USERS */}
                        <td className="px-5 py-4 font-medium text-gray-700 dark:text-gray-300">
                          {role.users_count ?? 0}
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-4">
                          <RoleStatusBadge status={role.status} />
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={() => onEdit(role)}
                              title="Edit role"
                              aria-label={`Edit ${role.name}`}
                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* ACTIVATE / DEACTIVATE */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(role)}
                              disabled={
                                isUpdating ||
                                updatingRoleId !== null ||
                                cannotDeactivate
                              }
                              title={
                                cannotDeactivate
                                  ? "System roles cannot be deactivated"
                                  : isActive
                                    ? "Deactivate role"
                                    : "Activate role"
                              }
                              aria-label={
                                isActive
                                  ? `Deactivate ${role.name}`
                                  : `Activate ${role.name}`
                              }
                              className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                isActive
                                  ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                  : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/40"
                              }`}
                            >
                              {isUpdating ? (
                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Power size={16} />
                              )}
                            </button>

                            {/* DELETE */}
                            {!role.is_system_role && (
                              <button
                                type="button"
                                onClick={() => onDelete(role)}
                                title="Move to trash"
                                aria-label={`Delete ${role.name}`}
                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex flex-col justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredRoles.length)}{" "}
                of {filteredRoles.length} roles
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ==========================================
// STAT CARD COMPONENT
// ==========================================

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>

        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>

      <div className="rounded-lg bg-[#00679E]/10 p-3 text-[#00679E] dark:text-[#36A9E1]">
        {icon}
      </div>
    </div>
  );
};

export default RoleList;
