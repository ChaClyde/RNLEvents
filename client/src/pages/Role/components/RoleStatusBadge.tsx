import type { FC } from "react";
import type { RoleStatus } from "../../../interfaces/RoleColumns";

const STYLES: Record<RoleStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
};

const RoleStatusBadge: FC<{ status: RoleStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status]}`}
  >
    {status}
  </span>
);

export default RoleStatusBadge;
