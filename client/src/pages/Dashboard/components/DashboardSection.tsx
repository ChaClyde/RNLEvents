import type { DashboardSection as DashboardSectionData } from "../../../services/DashboardService";

interface DashboardSectionProps {
  section: DashboardSectionData;
}

const statusClass = (status?: string | null) => {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
    case "cancelled":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-[#0095D9]/10 text-[#1E3A5F] dark:text-sky-200";
  }
};

const DashboardSection = ({ section }: DashboardSectionProps) => {
  return (
    <section className="rounded-2xl border border-[#1E3A5F]/15 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-[#1E3A5F] dark:text-white">
        {section.title}
      </h2>
      {section.items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Nothing to show right now.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {section.items.map((item) => (
            <li key={`${item.type}-${item.id}-${item.title}`} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {item.title ?? "Untitled"}
                  </p>
                  {item.detail && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {item.detail}
                    </p>
                  )}
                  {(item.start || item.end) && (
                    <p className="mt-1 text-xs text-slate-400">
                      {[item.start, item.end].filter(Boolean).join(" → ")}
                    </p>
                  )}
                </div>
                {item.status && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.status)}`}
                  >
                    {item.status.replaceAll("_", " ")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DashboardSection;
