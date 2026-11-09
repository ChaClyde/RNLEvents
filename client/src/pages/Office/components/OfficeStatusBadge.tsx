import type { OfficeStatus } from "../../../interfaces/OfficeColumns";

interface OfficeStatusBadgeProps {
  status: OfficeStatus;
}

const OfficeStatusBadge = ({ status }: OfficeStatusBadgeProps) => {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        isActive
          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isActive ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {isActive ? "ACTIVE" : "INACTIVE"}
    </span>
  );
};

export default OfficeStatusBadge;
