import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";

const AccessDeniedPage = () => {
  const { can } = usePermissions();
  const canOpenDashboard = can(Permission.DASHBOARD_VIEW);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-[#1E3A5F]/15 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <FiAlertTriangle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            You do not have permission to open this page. If you believe this is
            a mistake, contact a Super Admin.
          </p>
          {canOpenDashboard && (
            <Link
              to="/"
              className="mt-5 inline-flex rounded-xl bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F766E]"
            >
              Back to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
