import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

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
import AnnouncementBoard from "../Announcements/AnnouncementBoard";

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
];

// Where "View More" goes on the trend charts. Change these two paths if your
// booking pages live somewhere else.
const EVENT_BOOKINGS_PATH = "/event-bookings";
const VEHICLE_BOOKINGS_PATH = "/vehicle-bookings";

const getChartLink = (key: string, title: string): string | undefined => {
  const text = `${key} ${title}`.toLowerCase();

  if (text.includes("status") || text.includes("activity")) return undefined;
  if (text.includes("vehicle")) return VEHICLE_BOOKINGS_PATH;
  if (text.includes("event")) return EVENT_BOOKINGS_PATH;

  return undefined;
};

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
      {/* WELCOME BANNER */}
      <header className="flex flex-col gap-4 rounded-2xl bg-linear-to-r from-[#0B3A9F] via-[#002583] to-[#0A1A45] px-6 py-5 text-white shadow-md lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-extrabold tracking-wider text-[#FFB800] [font-variant-caps:small-caps]">
            FilSched
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Welcome, {dashboard?.user.full_name ?? user?.full_name ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-white/90">
            {roleLabel}
            {dashboard?.user.office ? ` · ${dashboard.user.office}` : ""}
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-white/90">
          Chart period
          <span className="relative">
            <FiCalendar
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2F63D4]"
              size={16}
            />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as DashboardPeriod)
              }
              className="w-full min-w-48 appearance-none rounded-lg bg-white py-2.5 pl-10 pr-9 text-sm font-semibold text-[#002583] shadow-sm outline-none transition focus:ring-2 focus:ring-[#FFB800]"
            >
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <FiChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#002583]"
              size={16}
            />
          </span>
        </label>
      </header>

      <AnnouncementBoard limit={3} />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft p-5 text-danger">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-3 rounded-lg bg-[#002583] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0B3A9F]"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          {dashboard.cards.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-[#5B6678] shadow-[0_4px_14px_rgba(0,37,131,0.08)] ring-1 ring-[#E5E8EF]/70">
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
                    cardKey={card.key}
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
                  viewMoreTo={getChartLink(key, chart.title)}
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
