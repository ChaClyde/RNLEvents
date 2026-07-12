import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import type { FC } from "react";

interface UserListProps {
  onAddUser: () => void;
}

const UserList: FC<UserListProps> = ({ onAddUser }) => {
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="max-w-full max-h-[calc(100vh-200px)] overflow-x-auto">
          <Table>
            <caption className="mb-4">
              <div className="border-b border-gray-100">
                <div className="p-4 flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium border border-blue-400 text-blue-400 hover:bg-blue-500/20 shadow-lg"
                    onClick={onAddUser}
                  >
                    Add User
                  </button>
                </div>
              </div>
            </caption>
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
                  First Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Middle Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Last Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Suffix Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Role
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-center"
                  >
                    Office
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-center"
                  >
                    Actions
                  </TableCell>
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="text-sm">
              <TableRow>
                <TableCell className="px-5 py-4">
                  <div className="flex justify-center gap-3">
                    <Link
                      to={`/users/edit`}
                      className="
                      rounded-lg 
                      bg-blue-500/10 
                      px-3 
                      py-1.5 
                      text-sm 
                      font-medium 
                      border 
                      border-blue-400 
                      text-blue-400 
                      hover:bg-blue-500/20 
                      shadow-lg"
                    >
                      Edit
                    </Link>

                    <Link
                      to={`/users/delete/`}
                      className="
                      rounded-lg
                      bg-red-500/10
                      px-3 py-1.5
                      text-sm
                      font-medium
                      border
                      border-red-400
                      text-red-400
                      hover:bg-red-500/20
                      shadow-lg"
                    >
                      Delete
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default UserList;
