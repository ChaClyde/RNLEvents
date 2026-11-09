import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  FiTrash2,
  FiSearch,
  FiRotateCcw,
  FiAlertTriangle,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import type { RoleColumns } from "../../../interfaces/RoleColumns";
import RoleService from "../../../services/RoleService";

const RoleTrash = () => {
  const [roles, setRoles] = useState<RoleColumns[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const handleLoadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await RoleService.loadTrashRoles();

      setRoles(response.data.roles ?? []);
    } catch (err) {
      console.error("Failed to load deleted roles:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Unable to load deleted roles."
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleLoadTrash();
  }, [handleLoadTrash]);

  const filteredRoles = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return roles.filter((role) =>
      [role.name, role.slug, role.description ?? ""].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [roles, search]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleRestore = async (role: RoleColumns) => {
    const confirmed = window.confirm(
      `Restore "${role.name}"? This role will return to Role Management.`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(role.role_id);
      setError("");

      await RoleService.restoreRole(role.role_id);

      setRoles((prev) => prev.filter((item) => item.role_id !== role.role_id));
    } catch (err) {
      console.error("Failed to restore role:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Unable to restore role."
          : "An unexpected error occurred.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (role: RoleColumns) => {
    const confirmed = window.confirm(
      `Permanently delete "${role.name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(role.role_id);
      setError("");

      await RoleService.forceDeleteRole(role.role_id);

      setRoles((prev) => prev.filter((item) => item.role_id !== role.role_id));
    } catch (err) {
      console.error("Failed to permanently delete role:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Unable to permanently delete role."
          : "An unexpected error occurred.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Deleted Roles
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Restore roles or permanently remove them from the system.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#0095D9]/10 px-4 py-3 text-[#00679E] dark:text-[#58C5F5]">
          <FiTrash2 size={18} />
          <span className="text-sm font-semibold">
            {roles.length} Deleted {roles.length === 1 ? "Role" : "Roles"}
          </span>
        </div>
      </div>

      {/* Information */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Permanently deleting a role cannot be undone. Make sure the role is no
          longer needed before proceeding.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deleted roles..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0095D9]/20 border-t-[#0095D9]" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading deleted roles...
            </p>
          </div>
        ) : paginatedRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-5 dark:bg-gray-800">
              <FiTrash2 size={30} className="text-gray-400" />
            </div>

            <h3 className="font-semibold text-gray-800 dark:text-white">
              {search ? "No matching roles found" : "Trash Bin is empty"}
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search
                ? "Try another search keyword."
                : "Deleted roles will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Slug</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Assigned Users</th>
                    <th className="px-5 py-4">Deleted Date</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedRoles.map((role) => (
                    <tr
                      key={role.role_id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-[#0095D9]/10 p-2 text-[#00679E] dark:text-[#58C5F5]">
                            <FiShield size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {role.name}
                            </p>
                            {role.is_system_role && (
                              <span className="text-xs text-[#00679E] dark:text-[#58C5F5]">
                                System Role
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {role.slug}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            role.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {role.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <FiUsers />
                          {role.users_count}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(role.updated_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={processingId === role.role_id}
                            onClick={() => handleRestore(role)}
                            title="Restore role"
                            className="rounded-lg bg-green-50 p-2 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                          >
                            <FiRotateCcw size={17} />
                          </button>

                          <button
                            type="button"
                            disabled={processingId === role.role_id}
                            onClick={() => handlePermanentDelete(role)}
                            title="Permanently delete role"
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                          >
                            <FiTrash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of{" "}
                {filteredRoles.length} roles
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-gray-600 dark:text-gray-300">
                  {currentPage} / {Math.max(totalPages, 1)}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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

export default RoleTrash;
