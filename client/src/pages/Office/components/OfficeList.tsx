import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";

const OfficeList = () => {
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
                  Office Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
                >
                  Office Description
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-center"
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

            <TableBody className="text-sm">
              <TableRow>
                <TableCell className="px-5 py-4">
                  <div className="flex justify-center gap-3">
                    <Link
                      to={`/offices/edit/`}
                      className="
                                                    rounded-lg
                                                    bg-blue-500/10
                                                    px-3 py-1.5
                                                    text-sm
                                                    font-medium
                                                    border border-blue-400
                                                    text-blue-400
                                                    hover:bg-blue-500/20
                                                    shadow-lg
                                                "
                    >
                      Edit
                    </Link>

                    <Link
                      to={`/offices/delete/`}
                      className="
                                                    rounded-lg
                                                    bg-red-500/10
                                                    px-3 py-1.5
                                                    text-sm
                                                    font-medium
                                                    border border-red-400
                                                    text-red-400
                                                    hover:bg-red-500/20
                                                    shadow-lg
                                                "
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

export default OfficeList;
