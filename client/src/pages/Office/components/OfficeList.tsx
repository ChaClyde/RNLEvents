import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/Table";
import { useEffect, useState, type FC } from "react";
import type { OfficeColumns } from "../../../components/Interfaces/OfficeColumns";
import OfficeService from "../../../services/OfficeService";
import Spinner from "../../../components/Spinner/Spinner";

interface OfficeListProps {
  refreshKey?: boolean;
}

const OfficeList: FC<OfficeListProps> = ({ refreshKey }) => {
  const [loadingOffices, setLoadingOffices] = useState(true);
  const [offices, setOffices] = useState<OfficeColumns[]>([]);

  const handleLoadOffices = async () => {
    try {
      setLoadingOffices(true);

      const res = await OfficeService.loadOffices();

      if (res.status === 200) {
        setOffices(res.data.offices);
      } else {
        console.error(
          "Unexpected error status occurred during loading offices:",
          res.status,
        );
      }
    } catch (error) {
      console.error(
        "Unexpected error occurred during loading offices finally :",
        error,
      );
    } finally {
      setLoadingOffices(false);
    }
  };

  useEffect(() => {
    handleLoadOffices();
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
                  Office Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-start"
                >
                  Office Description
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

            <TableBody className="divide-y divide-gray-100 text-gray-500 text-md">
              {loadingOffices ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-5 py-4 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : (
                offices.map((office, index) => (
                  <TableRow className="hover:bg-gray-100" key={index}>
                    <TableCell className="px-5 py-4 text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      {office.office}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      {office.description}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      {office.users_count}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <Link
                          to={`/offices/edit/${office.office_id}`}
                          className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium border border-blue-400 text-blue-400 hover:bg-blue-500/20 shadow-lg"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/offices/delete/${office.office_id}`}
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

export default OfficeList;
