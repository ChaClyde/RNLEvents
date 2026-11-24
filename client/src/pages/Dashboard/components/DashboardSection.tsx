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
      return "bg-[#E5E8EF] text-[#5B6678]";
    case "pending":
      return "bg-[#FFF1C2] text-[#7A5600]";
    default:
      return "bg-[#E3EBFF] text-[#1F4FC0]";
  }
};

const DashboardSection = ({ section }: DashboardSectionProps) => {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(0,37,131,0.08)] ring-1 ring-[#E5E8EF]/70">
      <div className="border-b border-[#E5E8EF] px-5 py-3.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#002583]">
          {section.title}
        </h2>
      </div>

      {section.items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[#5B6678]">
          Nothing to show right now.
        </p>
      ) : (
        <ul className="divide-y divide-[#E5E8EF] px-5">
          {section.items.map((item) => (
            <li key={`${item.type}-${item.id}-${item.title}`} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#002583]">
                    {item.title ?? "Untitled"}
                  </p>
                  {item.detail && (
                    <p className="mt-1 text-sm text-[#5B6678]">{item.detail}</p>
                  )}
                  {(item.start || item.end) && (
                    <p className="mt-1 text-xs text-[#5B6678]">
                      {[item.start, item.end].filter(Boolean).join(" → ")}
                    </p>
                  )}
                </div>

                {item.status && (
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClass(item.status)}`}
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
