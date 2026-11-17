import type { FC } from "react";
import type { RoleStatus } from "../../../interfaces/RoleColumns";

const STYLES: Record<RoleStatus, string> = {
  active: "bg-success-soft text-success ring-success/20",
  inactive: "bg-page text-muted ring-line",
};

const RoleStatusBadge: FC<{ status: RoleStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status]}`}
  >
    {status}
  </span>
);

export default RoleStatusBadge;
