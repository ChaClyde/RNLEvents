import { useState, type FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import Spinner from "../../../components/Spinner/Spinner";
import type { DriverColumns } from "../../../interfaces/DriverColumns";
import { UserPlus, Users, Search } from "lucide-react";

interface DriverListProps {
  drivers: DriverColumns[];
  loading: boolean;
  onAddDriver: () => void;
  onEditDriver: (driver: DriverColumns) => void;
  onDeleteDriver: (driver: DriverColumns) => void;
}

const statusStyles: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-600 border-emerald-200",
  "On Leave": "bg-amber-50 text-amber-600 border-amber-200",
  "Sick Leave": "bg-orange-50 text-orange-600 border-orange-200",
  Unavailable: "bg-red-50 text-red-600 border-red-200",
};

const DriverList: FC<DriverListProps> = ({
  drivers,
  loading,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrivers = drivers.filter((driver) =>
    driver.driver_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
                Manage drivers and their current availability.
              </p>
            </div>
          </div>

          <button
            onClick={onAddDriver}
            className="flex items-center gap-2 rounded-2xl bg-[#0095D9] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#003B5C]"
          >
            <UserPlus size={16} />
            Add Driver
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-3xl border border-[#0095D9]/20 bg-white p-4 shadow-sm">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search driver name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent outline-none text-gray-900"
        />
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
                <TableCell isHeader className="px-5 py-3 text-start">
                  DRIVER NAME
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  STATUS
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  REMARKS
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start">
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#0095D9]/10 text-sm text-gray-700">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver, index) => (
                  <TableRow
                    key={driver.driver_id}
                    className="hover:bg-[#0095D9]/5 transition-colors"
                  >
                    <TableCell className="px-4 py-3 text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium text-gray-900">
                      {driver.driver_name}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                          statusStyles[driver.driver_status] ??
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {driver.driver_status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500">
                      {driver.status_remarks || "—"}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DriverList;
