import type { DashboardChart as DashboardChartData } from "../../../services/DashboardService";

interface DashboardChartProps {
  chart: DashboardChartData;
  stacked?: boolean;
  variant?: "bar" | "distribution";
}

const COLORS = ["#1E3A5F", "#0095D9", "#0F766E", "#F59E0B", "#94A3B8"];

const DashboardChart = ({
  chart,
  stacked = false,
  variant,
}: DashboardChartProps) => {
  const max = Math.max(
    1,
    ...chart.series.map((point) =>
      stacked ? point.value + (point.secondary ?? 0) : point.value,
    ),
  );
  const isDistribution =
    variant === "distribution" ||
    (variant !== "bar" && chart.title.toLowerCase().includes("status"));

  if (chart.series.length === 0) {
    return (
      <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
          {chart.title}
        </h2>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          No chart data for this period.
        </p>
      </section>
    );
  }

  if (isDistribution) {
    const total = chart.series.reduce((sum, point) => sum + point.value, 0) || 1;
    let offset = 0;

    return (
      <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
          {chart.title}
        </h2>
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
          <svg viewBox="0 0 42 42" className="h-36 w-36 shrink-0" role="img">
            <title>{chart.title}</title>
            {chart.series.map((point, index) => {
              const value = (point.value / total) * 100;
              const dash = `${value} ${100 - value}`;
              const current = offset;
              offset += value;

              return (
                <circle
                  key={point.label}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="6"
                  strokeDasharray={dash}
                  strokeDashoffset={25 - current}
                />
              );
            })}
          </svg>
          <ul className="w-full space-y-2 text-sm">
            {chart.series.map((point, index) => (
              <li
                key={point.label}
                className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {point.label}
                </span>
                <span className="font-semibold">{point.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
        {chart.title}
      </h2>
      <div className="mt-4 flex h-48 items-end gap-1 overflow-x-auto">
        {chart.series.map((point) => (
          <div
            key={point.label}
            className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1"
            title={`${point.label}: ${point.value}${
              point.secondary !== undefined ? ` / ${point.secondary}` : ""
            }`}
          >
            <div className="flex h-40 w-full items-end justify-center gap-0.5">
              <div
                className="w-full max-w-4 rounded-t bg-[#1E3A5F] dark:bg-[#0095D9]"
                style={{ height: `${(point.value / max) * 100}%` }}
              />
              {stacked && (
                <div
                  className="w-full max-w-4 rounded-t bg-[#0095D9]"
                  style={{
                    height: `${((point.secondary ?? 0) / max) * 100}%`,
                  }}
                />
              )}
            </div>
            <span className="max-w-full truncate text-[10px] text-slate-500 dark:text-slate-400">
              {point.label}
            </span>
          </div>
        ))}
      </div>
      {stacked && (
        <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#1E3A5F]" /> Events
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#0095D9]" /> Vehicles
          </span>
        </div>
      )}
    </section>
  );
};

export default DashboardChart;
