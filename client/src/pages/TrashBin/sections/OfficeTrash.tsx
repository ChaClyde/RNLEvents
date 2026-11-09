import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  FiTrash2,
  FiSearch,
  FiRotateCcw,
  FiAlertTriangle,
  FiBriefcase,
  FiUsers,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";

import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import OfficeService from "../../../services/OfficeService";

const OfficeTrash = () => {
  const [offices, setOffices] = useState<OfficeColumns[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Load deleted offices
  const handleLoadTrash = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await OfficeService.loadTrashOffices();

      setOffices(response.data.offices ?? []);
    } catch (err) {
      console.error("Failed to load deleted offices:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Unable to load deleted offices."
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleLoadTrash();
  }, [handleLoadTrash]);

  // Search
  const filteredOffices = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return offices.filter((office) =>
      [
        office.office_name,
        office.office_code,
        office.office_type ?? "",
        office.description ?? "",
        office.contact_email ?? "",
      ].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [offices, search]);

  // Pagination
  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);

  const paginatedOffices = filteredOffices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Restore office
  const handleRestore = async (office: OfficeColumns) => {
    const confirmed = window.confirm(
      `Restore "${office.office_name}"?\n\nThis office will return to Office Management.`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(office.office_id);
      setError("");

      await OfficeService.restoreOffice(office.office_id);

      setOffices((prev) =>
        prev.filter((item) => item.office_id !== office.office_id),
      );
    } catch (err) {
      console.error("Failed to restore office:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message || "Unable to restore office."
          : "An unexpected error occurred.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Permanently delete office
  const handlePermanentDelete = async (office: OfficeColumns) => {
    const confirmed = window.confirm(
      `Permanently delete "${office.office_name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setProcessingId(office.office_id);
      setError("");

      await OfficeService.forceDeleteOffice(office.office_id);

      setOffices((prev) =>
        prev.filter((item) => item.office_id !== office.office_id),
      );
    } catch (err) {
      console.error("Failed to permanently delete office:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message ||
              "Unable to permanently delete office."
          : "An unexpected error occurred.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Date formatting
  const formatDate = (date: string) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "—"
      : parsedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Deleted Offices
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage, restore, or permanently remove deleted offices.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#0095D9]/10 px-4 py-3 text-[#00679E] dark:text-[#58C5F5]">
          <FiTrash2 size={18} />

          <span className="text-sm font-semibold">
            {offices.length} Deleted{" "}
            {offices.length === 1 ? "Office" : "Offices"}
          </span>
        </div>
      </div>

      {/* Warning */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />

        <p className="text-sm text-amber-800 dark:text-amber-300">
          Permanently deleting an office cannot be undone. Offices assigned to
          existing user records cannot be permanently deleted.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search office name, code, or type..."
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
              Loading deleted offices...
            </p>
          </div>
        ) : paginatedOffices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-5 dark:bg-gray-800">
              <FiTrash2 size={30} className="text-gray-400" />
            </div>

            <h3 className="font-semibold text-gray-800 dark:text-white">
              {search ? "No matching offices found" : "Trash Bin is empty"}
            </h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search
                ? "Try another search keyword."
                : "Deleted offices will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-4">Office</th>
                    <th className="px-5 py-4">Office Type</th>
                    <th className="px-5 py-4">Contact Information</th>
                    <th className="px-5 py-4">Location</th>
                    <th className="px-5 py-4">Assigned Users</th>
                    <th className="px-5 py-4">Last Updated</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedOffices.map((office) => (
                    <tr
                      key={office.office_id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {/* Office */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-[#0095D9]/10 p-2 text-[#00679E] dark:text-[#58C5F5]">
                            <FiBriefcase size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {office.office_name}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {office.office_code}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Office Type */}
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {office.office_type || "—"}
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {office.contact_email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <FiMail className="shrink-0" />
                              {office.contact_email}
                            </div>
                          )}

                          {office.contact_number && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <FiPhone className="shrink-0" />
                              {office.contact_number}
                            </div>
                          )}

                          {!office.contact_email && !office.contact_number && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          {office.location && <FiMapPin className="shrink-0" />}
                          {office.location || "—"}
                        </div>
                      </td>

                      {/* Assigned Users */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <FiUsers />
                          {office.users_count}
                        </div>
                      </td>

                      {/* Last Updated */}
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {formatDate(office.updated_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={processingId === office.office_id}
                            onClick={() => handleRestore(office)}
                            title="Restore office"
                            className="rounded-lg bg-green-50 p-2 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                          >
                            <FiRotateCcw size={17} />
                          </button>

                          <button
                            type="button"
                            disabled={processingId === office.office_id}
                            onClick={() => handlePermanentDelete(office)}
                            title="Permanently delete office"
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
                {Math.min(currentPage * itemsPerPage, filteredOffices.length)}{" "}
                of {filteredOffices.length} offices
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

export default OfficeTrash;
