// import { Link } from "react-router-dom";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHeader,
//   TableRow,
// } from "../../../components/Table";
// import { useEffect, useState, type FC } from "react";
// import type { OfficeColumns } from "../../../components/Interfaces/OfficeColumns";
// import OfficeService from "../../../services/OfficeService";
// import Spinner from "../../../components/Spinner/Spinner";

// interface OfficeListProps {
//   refreshKey?: boolean;
// }

// const OfficeList: FC<OfficeListProps> = ({ refreshKey }) => {
//   const [loadingOffices, setLoadingOffices] = useState(true);
//   const [offices, setOffices] = useState<OfficeColumns[]>([]);

//   const handleLoadOffices = async () => {
//     try {
//       setLoadingOffices(true);

//       const res = await OfficeService.loadOffices();

//       if (res.status === 200) {
//         setOffices(res.data.offices);
//       } else {
//         console.error(
//           "Unexpected error status occurred during loading offices:",
//           res.status,
//         );
//       }
//     } catch (error) {
//       console.error(
//         "Unexpected error occurred during loading offices finally :",
//         error,
//       );
//     } finally {
//       setLoadingOffices(false);
//     }
//   };

//   useEffect(() => {
//     handleLoadOffices();
//   }, [refreshKey]);

//   return (
//     <>
//       <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
//         <div className="max-w-full max-h-[calc(100vh-200px)] overflow-x-auto">
//           <Table>
//             <TableHeader className="border-b border-gray-200 bg-blue-600 sticky top-0 text-xs">
//               <TableRow>
//                 <TableCell
//                   isHeader
//                   className="px-5 py-3 font-medium text-center"
//                 >
//                   No.
//                 </TableCell>
//                 <TableCell
//                   isHeader
//                   className="px-5 py-3 font-medium text-center"
//                 >
//                   Office Name
//                 </TableCell>
//                 <TableCell
//                   isHeader
//                   className="px-5 py-3 font-medium text-start"
//                 >
//                   Office Description
//                 </TableCell>
//                 <TableCell
//                   isHeader
//                   className="px-5 py-3 font-medium text-start"
//                 >
//                   Users
//                 </TableCell>
//                 <TableCell
//                   isHeader
//                   className="px-5 py-3 font-medium text-center"
//                 >
//                   Actions
//                 </TableCell>
//               </TableRow>
//             </TableHeader>

//             <TableBody className="divide-y divide-gray-100 text-gray-500 text-md">
//               {loadingOffices ? (
//                 <TableRow>
//                   <TableCell colSpan={5} className="px-5 py-4 text-center">
//                     <Spinner size="md" />
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 offices.map((office, index) => (
//                   <TableRow className="hover:bg-gray-100" key={index}>
//                     <TableCell className="px-5 py-4 text-center">
//                       {index + 1}
//                     </TableCell>
//                     <TableCell className="px-5 py-4 text-center">
//                       {office.office}
//                     </TableCell>
//                     <TableCell className="px-5 py-4 text-start">
//                       {office.description}
//                     </TableCell>
//                     <TableCell className="px-5 py-4 text-start">
//                       {office.users_count}
//                     </TableCell>
//                     <TableCell className="px-5 py-4 text-center">
//                       <div className="flex justify-center gap-3">
//                         <Link
//                           to={`/offices/edit/${office.office_id}`}
//                           className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium border border-blue-400 text-blue-400 hover:bg-blue-500/20 shadow-lg"
//                         >
//                           Edit
//                         </Link>
//                         <Link
//                           to={`/offices/delete/${office.office_id}`}
//                           className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm font-medium border border-red-400 text-red-400 hover:bg-red-500/20 shadow-lg"
//                         >
//                           Delete
//                         </Link>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </div>
//       </div>
//     </>
//   );
// };

// export default OfficeList;

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
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[calc(100vh-220px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <TableRow>
                <TableCell
                  isHeader
                  className="w-16 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-black"
                >
                  No.
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-black"
                >
                  Office
                </TableCell>

                <TableCell
                  isHeader
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-black"
                >
                  Description
                </TableCell>

                <TableCell
                  isHeader
                  className="w-32 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-black"
                >
                  Users
                </TableCell>

                <TableCell
                  isHeader
                  className="w-44 px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-black"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100">
              {loadingOffices ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Spinner size="md" />
                  </TableCell>
                </TableRow>
              ) : offices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-gray-500"
                  >
                    No offices found.
                  </TableCell>
                </TableRow>
              ) : (
                offices.map((office, index) => (
                  <TableRow
                    key={office.office_id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <TableCell className="px-6 py-4 text-center font-medium text-gray-600">
                      {index + 1}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center font-semibold text-gray-800">
                      {office.office}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-gray-600">
                      {office.description}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        {office.users_count}
                      </span>
                    </TableCell>

                    <TableCell className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Link
                          to={`/offices/edit/${office.office_id}`}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                        >
                          Edit
                        </Link>

                        <Link
                          to={`/offices/delete/${office.office_id}`}
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

export default OfficeList;

// import { useEffect, useState, type FC } from "react";
// import { Link } from "react-router-dom";
// import Spinner from "../../../components/Spinner/Spinner";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHeader,
//   TableRow,
// } from "../../../components/Table";
// import type { OfficeColumns } from "../../../components/Interfaces/OfficeColumns";
// import OfficeService from "../../../services/OfficeService";

// interface OfficeListProps {
//   refreshKey?: boolean;
// }

// const OfficeList: FC<OfficeListProps> = ({ refreshKey }) => {
//   const [loadingOffices, setLoadingOffices] = useState(false);
//   const [offices, setOffices] = useState<OfficeColumns[]>([]);

//   const handleLoadOffices = async () => {
//     try {
//       setLoadingOffices(true);

//       const res = await OfficeService.loadOffices();

//       if (res.status === 200) {
//         setOffices(res.data.offices);
//       } else {
//         console.error(
//           "Unexpected status error occurred during loading offices:",
//           res.status,
//         );
//       }
//     } catch (error) {
//       console.error(
//         "Unexpected server error occurred during loading offices:",
//         error,
//       );
//     } finally {
//       setLoadingOffices(false);
//     }
//   };

//   useEffect(() => {
//     handleLoadOffices();
//   }, [refreshKey]);

//   return (
//     <>
//       <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-lg">
//         {/* Table Header */}
//         <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
//           <div>
//             <h3 className="text-lg font-semibold text-white">Offices</h3>
//             <p className="text-sm text-gray-400">
//               Total: {offices.length} office(s)
//             </p>
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <Table>
//             <TableHeader className="sticky top-0 bg-gray-950 text-gray-300 text-xs uppercase tracking-wider">
//               <TableCell isHeader className="px-5 py-4 text-center">
//                 No.
//               </TableCell>

//               <TableCell isHeader className="px-5 py-4 text-center">
//                 Office
//               </TableCell>

//               <TableCell isHeader className="px-5 py-4 text-center">
//                 Description
//               </TableCell>

//               <TableCell isHeader className="px-5 py-4 text-center">
//                 Users
//               </TableCell>

//               <TableCell isHeader className="px-5 py-4 text-center">
//                 Actions
//               </TableCell>
//             </TableHeader>

//             <TableBody className="text-sm">
//               {loadingOffices ? (
//                 <TableRow>
//                   <TableCell colSpan={5} className="py-10">
//                     <div className="flex justify-center">
//                       <Spinner size="md" />
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ) : offices.length === 0 ? (
//                 <TableRow>
//                   <TableCell
//                     colSpan={5}
//                     className="py-10 text-center text-gray-500"
//                   >
//                     No offices found.
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 offices.map((office, index) => (
//                   <TableRow
//                     key={office.office_id}
//                     className="
//                       border-t border-gray-800
//                       hover:bg-gray-800/50
//                       transition-colors
//                     "
//                   >
//                     <TableCell className="px-5 py-4 text-center text-gray-300">
//                       {index + 1}
//                     </TableCell>

//                     <TableCell className="px-5 py-4 text-center font-medium text-white">
//                       {office.office}
//                     </TableCell>

//                     <TableCell className="px-5 py-4 text-center text-gray-400">
//                       {office.description || "-"}
//                     </TableCell>

//                     <TableCell className="px-5 py-4 text-center text-gray-400">
//                       {office.users_count}
//                     </TableCell>

//                     <TableCell className="px-5 py-4">
//                       <div className="flex justify-center gap-3">
//                         <Link
//                           to={`/offices/edit/${office.office_id}`}
//                           className="
//                             rounded-lg
//                             bg-blue-500/10
//                             px-3 py-1.5
//                             text-sm
//                             font-medium
//                             text-blue-400
//                             hover:bg-blue-500/20
//                           "
//                         >
//                           Edit
//                         </Link>

//                         <Link
//                           to={`/offices/delete/${office.office_id}`}
//                           className="
//                             rounded-lg
//                             bg-red-500/10
//                             px-3 py-1.5
//                             text-sm
//                             font-medium
//                             text-red-400
//                             hover:bg-red-500/20
//                           "
//                         >
//                           Delete
//                         </Link>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </div>
//       </div>
//     </>
//   );
// };

// export default OfficeList;
