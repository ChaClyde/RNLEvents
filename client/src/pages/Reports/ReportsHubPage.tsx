import { Link } from "react-router-dom";
import { BarChart3, Car } from "lucide-react";
import { Permission } from "../../permissions";
import { usePermissions } from "../../hooks/usePermissions";

const ReportsHubPage = () => {
  const { canAny } = usePermissions();
  const canEvents = canAny([
    Permission.REPORTS_VIEW_EVENT,
    Permission.REPORTS_VIEW_ALL,
    Permission.REPORTS_VIEW_OFFICE,
  ]);
  const canVehicles = canAny([
    Permission.REPORTS_VIEW_VEHICLE,
    Permission.REPORTS_VIEW_ALL,
    Permission.REPORTS_VIEW_OFFICE,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1E3A5F] dark:text-white">
          Reports & Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a report module authorized for your role.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {canEvents && (
          <Link
            to="/reports/events"
            className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-6 shadow-sm transition hover:border-[#0095D9] dark:border-slate-700 dark:bg-slate-900"
          >
            <BarChart3 className="h-8 w-8 text-[#0095D9]" />
            <h2 className="mt-4 text-lg font-semibold text-[#1E3A5F] dark:text-white">
              Event Reports
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Booking summaries, venue utilization, and office event activity.
            </p>
          </Link>
        )}
        {canVehicles && (
          <Link
            to="/reports/vehicles"
            className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-6 shadow-sm transition hover:border-[#0095D9] dark:border-slate-700 dark:bg-slate-900"
          >
            <Car className="h-8 w-8 text-[#0095D9]" />
            <h2 className="mt-4 text-lg font-semibold text-[#1E3A5F] dark:text-white">
              Vehicle & Driver Reports
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Trip summaries, vehicle utilization, and driver availability.
            </p>
          </Link>
        )}
      </div>

      {!canEvents && !canVehicles && (
        <p className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No report modules are available for this role.
        </p>
      )}
    </div>
  );
};

export default ReportsHubPage;
