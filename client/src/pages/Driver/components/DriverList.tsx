import { useMemo, useState, type FC } from "react";
import { UserPlus, Users, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import Spinner from "../../../components/Spinner/Spinner";
import {
  DRIVER_STATUSES,
  type DriverColumns,
  type DriverStatus,
} from "../../../interfaces/DriverColumns";
import {
  formatDriverDate,
  getAvailabilityPeriod,
  getDriverStatusStyle,
  getLicenseState,
} from "../../../interfaces/DriverHelpers";

interface DriverListProps {
  drivers: DriverColumns[];
  loading: boolean;
  onAddDriver: () => void;
  onEditDriver: (driver: DriverColumns) => void;
  onDeleteDriver: (driver: DriverColumns) => void;
}

const COLUMN_COUNT = 7;

const DriverList: FC<DriverListProps> = ({
  drivers,
  loading,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DriverStatus>("all");

  const filteredDrivers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return drivers.filter((driver) => {
      const matchesSearch =
        query === "" ||
        driver.driver_name.toLowerCase().includes(query) ||
        (driver.contact_number ?? "").toLowerCase().includes(query) ||
        (driver.license_number ?? "").toLowerCase().includes(query) ||
        (driver.default_vehicle?.vehicle_name ?? "")
          .toLowerCase()
          .includes(query) ||
        (driver.default_vehicle?.plate_number ?? "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" || driver.driver_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Hero */}
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
                Driver Management
              </h1>
              <p className="mt-1 text-gray-500">
                Manage drivers, their licenses and their availability.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddDriver}
            className="flex items-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
          >
            <UserPlus size={16} />
            Add Driver
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm">
        <div className="flex min-w-60 flex-1 items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search name, contact, license or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-gray-900 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | DriverStatus)
          }
          className="rounded-2xl border border-[#0095D9]/20 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#0095D9]"
        >
          <option value="all">All Status</option>
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 border-b border-[#003B5C] bg-linear-to-r from-[#003B5C] to-[#0095D9] text-xs text-white">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-center">
                  NO.
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  DRIVER
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  CONTACT
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  LICENSE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  USUAL VEHICLE
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  AVAILABILITY
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#0095D9]/10 text-sm text-gray-700">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-10 text-center"
                  >
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver, index) => {
                  const licenseState = getLicenseState(driver);
                  const period = getAvailabilityPeriod(driver);

                  return (
                    <TableRow
                      key={driver.driver_id}
                      className="transition-colors hover:bg-[#0095D9]/5"
                    >
                      <TableCell className="px-4 py-3 text-center">
                        {index + 1}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {driver.driver_name}
                        </p>
                        {driver.is_reliever && (
                          <span className="mt-1 inline-block rounded-full bg-[#003B5C]/10 px-2 py-0.5 text-xs font-medium text-[#003B5C]">
                            Reliever
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500">
                        <p>{driver.contact_number || "—"}</p>
                        {driver.email && (
                          <p className="text-xs text-gray-400">
                            {driver.email}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        {licenseState === "none" ? (
                          <span className="text-gray-400">
                            {driver.license_number || "—"}
                          </span>
                        ) : (
                          <div>
                            <p className="text-gray-700">
                              {driver.license_number || "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Expires {formatDriverDate(driver.license_expiry)}
                            </p>
                            {licenseState === "expired" && (
                              <span className="mt-1 inline-block rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                Expired
                              </span>
                            )}
                            {licenseState === "expiring" && (
                              <span className="mt-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                Expiring soon
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-600">
                        {driver.default_vehicle ? (
                          <div>
                            <p>{driver.default_vehicle.vehicle_name}</p>
                            <p className="text-xs text-gray-400">
                              {driver.default_vehicle.plate_number}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getDriverStatusStyle(
                            driver.driver_status,
                          )}`}
                        >
                          {driver.driver_status}
                        </span>

                        {period && (
                          <p className="mt-1 text-xs text-gray-500">{period}</p>
                        )}

                        {driver.status_remarks && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {driver.status_remarks}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => onEditDriver(driver)}
                            className="rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-3 py-1.5 text-sm font-medium text-[#0095D9] hover:bg-[#0095D9]/20"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDriver(driver)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DriverList;
