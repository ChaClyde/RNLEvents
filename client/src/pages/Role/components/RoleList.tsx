import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import { useEffect, useState, type FC } from "react";
import type { RoleColumns } from "../../../interfaces/RoleColumns";
import RoleService from "../../../services/RoleService";
import Spinner from "../../../components/Spinner/Spinner";

interface RoleListProps {
  refreshKey?: boolean;
}

const RoleList: FC<RoleListProps> = ({ refreshKey }) => {
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roles, setRoles] = useState<RoleColumns[]>([]);

  const handleLoadRoles = async () => {
    try {
      setLoadingRoles(true);

      const res = await RoleService.loadRoles();

      if (res.status === 200) {
        setRoles(res.data.roles);
      } else {
        console.error(
          "Unexpected error status occurred during loading roles:",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected error occurred during loading roles finally :",
        error,
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    handleLoadRoles();
  }, [refreshKey]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#0095D9]/20 bg-white shadow-sm">
        <div className="max-h-[calc(100vh-220px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#003B5C] to-[#0095D9] border-b border-[#003B5C]">
              <TableRow>
                <TableCell
                  isHeader
                  className="w-16 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-white"
                >
                  No.
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-white"
                >
                  Role Name
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-white"
                >
                  Role Description
                </TableCell>

                <TableCell
                  isHeader
                  className="w-32 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-white"
                >
                  Users
                </TableCell>

                <TableCell
                  isHeader
                  className="w-44 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-white"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#0095D9]/10">
              {loadingRoles ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-gray-500"
                  >
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role, index) => (
                  <TableRow
                    key={role.role_id}
                    className="hover:bg-[#0095D9]/5 transition-colors"
                  >
                    <TableCell className="px-6 py-4 text-center font-medium text-gray-600">
                      {index + 1}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center font-semibold text-[#003B5C]">
                      {role.role}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-gray-600">
                      {role.description}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-[#0095D9]/10 px-3 py-1 text-sm font-medium text-[#0095D9]">
                        {role.users_count}
                      </span>
                    </TableCell>

                    <TableCell className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          to={`/roles/edit/${role.role_id}`}
                          className="rounded-lg border border-[#0095D9]/30 bg-[#0095D9]/10 px-4 py-2 text-sm font-medium text-[#0095D9] transition hover:bg-[#0095D9]/20"
                        >
                          Edit
                        </Link>

                        <Link
                          to={`/roles/delete/${role.role_id}`}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default RoleList;
