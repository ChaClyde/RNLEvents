import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import { useEffect, useState, type FC } from "react";
import type { RoleColumns } from "../../../components/Interfaces/RoleColumns";
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="max-w-full max-h-[calc(100vh-200px)] overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-200 bg-blue-600 sticky top-0 text-xs">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  No.
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Role Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-start"
                >
                  Role Description
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-start"
                >
                  Users
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 text-gray-500 text-sm">
              {loadingRoles ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-5 py-4 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role, index) => (
                  <TableRow key={role.role_id}>
                    <TableCell className="px-5 py-4 text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      {role.role}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      {role.description}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      {role.users_count}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <Link
                          to={`/roles/edit/${role.role_id}`}
                          className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium border border-blue-400 text-blue-400 hover:bg-blue-500/20 shadow-lg"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/roles/delete/${role.role_id}`}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium border border-red-400 text-red-400 hover:bg-red-500/20 shadow-lg"
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
