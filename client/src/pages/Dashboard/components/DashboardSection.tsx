import type { DashboardSection as DashboardSectionData } from "../../../services/DashboardService";

interface DashboardSectionProps {
  section: DashboardSectionData;
}

const statusClass = (status?: string | null) => {
  switch (status) {
    case "approved":
      return "bg-success-soft text-success";
    case "rejected":
      return "bg-danger-soft text-danger";
    case "cancelled":
      return "bg-page text-muted";
    case "pending":
      return "bg-accent-soft text-[#6b4e00]";
    default:
      return "bg-primary-soft text-primary";
  }
};

const DashboardSection = ({ section }: DashboardSectionProps) => {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">{section.title}</h2>
      {section.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing to show right now.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {section.items.map((item) => (
            <li key={`${item.type}-${item.id}-${item.title}`} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {item.title ?? "Untitled"}
                  </p>
                  {item.detail && (
                    <p className="mt-1 text-sm text-muted">{item.detail}</p>
                  )}
                  {(item.start || item.end) && (
                    <p className="mt-1 text-xs text-muted">
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
