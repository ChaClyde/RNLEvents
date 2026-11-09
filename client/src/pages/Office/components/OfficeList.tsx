import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  RefreshCw,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import OfficeService from "../../../services/OfficeService";
import type { OfficeColumns } from "../../../interfaces/OfficeColumns";
import OfficeStatusBadge from "./OfficeStatusBadge";

interface OfficeListProps {
  refreshKey: number;
  onAdd: () => void;
  onEdit: (office: OfficeColumns) => void;
  onDelete: (office: OfficeColumns) => void;
}

type StatusFilter = "all" | "active" | "inactive";

const ITEMS_PER_PAGE = 10;

const OfficeList = ({
  refreshKey,
  onAdd,
  onEdit,
  onDelete,
}: OfficeListProps) => {
  const [offices, setOffices] = useState<OfficeColumns[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadOffices = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage("");

      const response = await OfficeService.loadOffices();

      setOffices(response.data.offices ?? []);
    } catch (error) {
      if (isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Unable to load offices. Please try again.",
        );
      } else {
        setErrorMessage("An unexpected error occurred while loading offices.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOffices();
  }, [refreshKey]);

  const officeTypes = useMemo(() => {
    return Array.from(
      new Set(
        offices
          .map((office) => office.office_type)
          .filter((type): type is string => Boolean(type)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [offices]);

  const filteredOffices = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return offices.filter((office) => {
      const matchesSearch =
        !normalizedSearch ||
        office.office_code.toLowerCase().includes(normalizedSearch) ||
        office.office_name.toLowerCase().includes(normalizedSearch) ||
        (office.office_type ?? "").toLowerCase().includes(normalizedSearch) ||
        (office.contact_email ?? "").toLowerCase().includes(normalizedSearch) ||
        (office.location ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || office.status === statusFilter;

      const matchesType =
        typeFilter === "all" || office.office_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [offices, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOffices.length / ITEMS_PER_PAGE),
  );

  const paginatedOffices = filteredOffices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeCount = offices.filter(
    (office) => office.status === "active",
  ).length;

  const inactiveCount = offices.filter(
    (office) => office.status === "inactive",
  ).length;

  const totalUsers = offices.reduce(
    (total, office) => total + (office.users_count ?? 0),
    0,
  );

  const handleToggleStatus = async (office: OfficeColumns) => {
    const activating = office.status === "inactive";

    const confirmed = window.confirm(
      `Are you sure you want to ${
        activating ? "activate" : "deactivate"
      } ${office.office_name}?`,
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(office.office_id);
      setErrorMessage("");

      if (activating) {
        await OfficeService.activateOffice(office.office_id);
      } else {
        await OfficeService.deactivateOffice(office.office_id);
      }

      await loadOffices(true);
    } catch (error) {
      if (isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            `Unable to ${activating ? "activate" : "deactivate"} this office.`,
        );
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Offices
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {offices.length}
              </h3>
            </div>
            <div className="rounded-lg bg-[#0095D9]/10 p-3">
              <Building2 className="h-6 w-6 text-[#0095D9]" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Offices
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {activeCount}
              </h3>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Power className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Inactive Offices
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {inactiveCount}
              </h3>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3">
              <PowerOff className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assigned Users
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {totalUsers}
              </h3>
            </div>
            <div className="rounded-lg bg-violet-500/10 p-3">
              <Users className="h-6 w-6 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Office Directory
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage university offices and their information.
            </p>
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00679E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#003B5C]"
          >
            <Plus className="h-4 w-4" />
            Add Office
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search office code, name, email, or location..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#0095D9] focus:ring-2 focus:ring-[#0095D9]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0095D9] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All Office Types</option>
            {officeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadOffices(true)}
            disabled={isRefreshing}
            title="Refresh offices"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2.5 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
              <tr>
                <th className="px-5 py-4 font-semibold">Office</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Users</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading offices...
                  </td>
                </tr>
              ) : paginatedOffices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <Building2 className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium">No offices found</p>
                    <p className="mt-1 text-xs">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOffices.map((office) => (
                  <tr
                    key={office.office_id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {office.office_name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {office.office_code}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {office.office_type || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-gray-700 dark:text-gray-300">
                        {office.contact_email || "—"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {office.contact_number || ""}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {office.location || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Users className="h-4 w-4 text-gray-400" />
                        {office.users_count ?? 0}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <OfficeStatusBadge status={office.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(office)}
                          title="Edit office"
                          className="rounded-lg p-2 text-[#0095D9] transition hover:bg-[#0095D9]/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(office)}
                          disabled={actionLoadingId === office.office_id}
                          title={
                            office.status === "active"
                              ? "Deactivate office"
                              : "Activate office"
                          }
                          className={`rounded-lg p-2 transition disabled:opacity-50 ${
                            office.status === "active"
                              ? "text-amber-600 hover:bg-amber-500/10"
                              : "text-emerald-600 hover:bg-emerald-500/10"
                          }`}
                        >
                          {office.status === "active" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(office)}
                          title="Move office to trash"
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredOffices.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredOffices.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {filteredOffices.length}
              </span>{" "}
              offices
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeList;
