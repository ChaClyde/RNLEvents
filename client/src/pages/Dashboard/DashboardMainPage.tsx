import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { ROLE_LABELS, useAuth } from "../../contexts/AuthContext";
import { RoleSlug } from "../../permissions";
import DashboardService, {
  type DashboardPayload,
  type DashboardPeriod,
} from "../../services/DashboardService";
import DashboardChart from "./components/DashboardChart";
import DashboardSection from "./components/DashboardSection";
import DashboardSkeleton from "./components/DashboardSkeleton";
import StatCard from "./components/StatCard";

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
];

const DashboardMainPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await DashboardService.load(period);
      setDashboard(response.data.data);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to view this dashboard.");
      } else {
        setError("Unable to load dashboard statistics. Please try again.");
      }
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const roleSlug = user?.role?.slug as RoleSlug | undefined;
  const roleLabel =
    dashboard?.role_label ??
    (roleSlug ? ROLE_LABELS[roleSlug] : "FilSched user");
  const showVehicles =
    dashboard?.capabilities.vehicles !== false &&
    roleSlug !== RoleSlug.STUDENT_REPUBLIC;

  const charts = Object.entries(dashboard?.charts ?? {}).filter(([key]) => {
    if (showVehicles) {
      return true;
    }

    return !key.toLowerCase().includes("vehicle");
  });

  const sections = Object.entries(dashboard?.sections ?? {}).filter(([key]) => {
    if (showVehicles) {
      return true;
    }

    return !key.toLowerCase().includes("vehicle") && key !== "upcoming_trips";
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">FilSched</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            Welcome, {dashboard?.user.full_name ?? user?.full_name ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {roleLabel}
            {dashboard?.user.office ? ` · ${dashboard.user.office}` : ""}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Chart period
          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value as DashboardPeriod)
            }
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-5 text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          {dashboard.cards.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
              No dashboard statistics are available for this account.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.cards
                .filter(
                  (card) =>
                    showVehicles || !card.key.toLowerCase().includes("vehicle"),
                )
                .map((card) => (
                  <StatCard
                    key={card.key}
                    label={card.label}
                    value={card.value}
                  />
                ))}
            </div>
          )}

          {charts.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {charts.map(([key, chart]) => (
                <DashboardChart
                  key={key}
                  chart={chart}
                  stacked={key === "monthly_activity"}
                />
              ))}
            </div>
          )}

          {sections.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {sections.map(([key, section]) => (
                <DashboardSection key={key} section={section} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardMainPage;
