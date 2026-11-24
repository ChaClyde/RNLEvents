import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

import type { DashboardChart as DashboardChartData } from "../../../services/DashboardService";

interface DashboardChartProps {
  chart: DashboardChartData;
  stacked?: boolean;
  variant?: "line" | "bar" | "distribution";
  // Shows a "View details" link in the card header when provided
  viewMoreTo?: string;
}

// Navy first, mustard as the single accent, then neutral blues/grays
// (hex values are required here because SVG strokes can't use Tailwind classes)
const COLORS = ["#002583", "#FFB800", "#4F6FB5", "#8A97B8", "#C9D0E0"];

const LINE = "#002583";

// ------------------------------------------------------------
// Card shell
// ------------------------------------------------------------

const ChartCard = ({
  title,
  viewMoreTo,
  children,
}: {
  title: string;
  viewMoreTo?: string;
  children: ReactNode;
}) => (
  <section className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(0,37,131,0.08)] ring-1 ring-[#E5E8EF]/70">
    <div className="flex items-center justify-between gap-3 border-b border-[#E5E8EF] px-5 py-3.5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#002583]">
        {title}
      </h2>

      {viewMoreTo && (
        <Link
          to={viewMoreTo}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#002583] underline-offset-4 transition-colors hover:underline"
        >
          View details
          <FiArrowRight size={13} />
        </Link>
      )}
    </div>

    <div className="p-5">{children}</div>
  </section>
);

// ------------------------------------------------------------
// Line chart
// ------------------------------------------------------------

const LineChart = ({ series }: { series: DashboardChartData["series"] }) => {
  const W = 600;
  const H = 230;
  const L = 40;
  const R = 16;
  const T = 14;
  const B = 34;

  const peak = Math.max(1, Math.ceil(Math.max(...series.map((p) => p.value))));
  const step = peak <= 5 ? 1 : Math.ceil(peak / 4);
  const top = peak <= 5 ? peak : step * 4;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  const n = series.length;
  const x = (i: number) =>
    n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);

  const line = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const area = `${line} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const every = Math.ceil(n / 8);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Trend chart"
    >
      {/* Grid + y labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={L}
            x2={W - R}
            y1={y(t)}
            y2={y(t)}
            stroke="#E5E8EF"
            strokeWidth="1"
          />
          <text
            x={L - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="14"
            fill="#5B6678"
          >
            {t}
          </text>
        </g>
      ))}

      <path d={area} fill={LINE} opacity="0.06" />
      <path
        d={line}
        fill="none"
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Points */}
      {n <= 40 &&
        series.map((p, i) => (
          <circle
            key={`${p.label}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r="3"
            fill={LINE}
          >
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ))}

      {/* x labels */}
      {series.map((p, i) =>
        i % every === 0 ? (
          <text
            key={`x-${p.label}-${i}`}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize="14"
            fill="#5B6678"
          >
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
};

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

const DashboardChart = ({
  chart,
  stacked = false,
  variant,
  viewMoreTo,
}: DashboardChartProps) => {
  const isDistribution =
    variant === "distribution" ||
    (variant !== "bar" &&
      variant !== "line" &&
      chart.title.toLowerCase().includes("status"));

  const isLine = !stacked && !isDistribution && variant !== "bar";

  if (chart.series.length === 0) {
    return (
      <ChartCard title={chart.title} viewMoreTo={viewMoreTo}>
        <p className="py-10 text-center text-sm text-[#5B6678]">
          No chart data for this period.
        </p>
      </ChartCard>
    );
  }

  // ---------- Donut ----------
  if (isDistribution) {
    const total =
      chart.series.reduce((sum, point) => sum + point.value, 0) || 1;
    let offset = 0;

    return (
      <ChartCard title={chart.title} viewMoreTo={viewMoreTo}>
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <svg viewBox="0 0 42 42" className="h-36 w-36 shrink-0" role="img">
            <title>{chart.title}</title>
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke="#E5E8EF"
              strokeWidth="6"
            />
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
                className="flex items-center justify-between gap-3 text-[#5B6678]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {point.label}
                </span>
                <span className="font-semibold tabular-nums text-[#002583]">
                  {point.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>
    );
  }

  // ---------- Line ----------
  if (isLine) {
    return (
      <ChartCard title={chart.title} viewMoreTo={viewMoreTo}>
        <LineChart series={chart.series} />
      </ChartCard>
    );
  }

  // ---------- Bars (grouped when `stacked`) ----------
  const max = Math.max(
    1,
    ...chart.series.map((point) =>
      stacked ? Math.max(point.value, point.secondary ?? 0) : point.value,
    ),
  );

  return (
    <ChartCard title={chart.title} viewMoreTo={viewMoreTo}>
      <div className="flex h-48 items-end gap-1 overflow-x-auto">
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
                className="w-full max-w-4 rounded-t-sm bg-[#002583]"
                style={{ height: `${(point.value / max) * 100}%` }}
              />
              {stacked && (
                <div
                  className="w-full max-w-4 rounded-t-sm bg-[#FFB800]"
                  style={{
                    height: `${((point.secondary ?? 0) / max) * 100}%`,
                  }}
                />
              )}
            </div>
            <span className="max-w-full truncate text-[10px] text-[#5B6678]">
              {point.label}
            </span>
          </div>
        ))}
      </div>

      {stacked && (
        <div className="mt-3 flex gap-4 text-xs text-[#5B6678]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#002583]" /> Events
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#FFB800]" /> Vehicles
          </span>
        </div>
      )}
    </ChartCard>
  );
};

export default DashboardChart;
