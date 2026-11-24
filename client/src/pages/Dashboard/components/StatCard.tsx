import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

interface StatCardProps {
  label: string;
  value: number;
  // The card's key from the API (e.g. "total_users"); picks the icon + accent
  cardKey?: string;
}

// Restrained palette: every card is navy, and only status cards get a
// meaningful accent on the left edge.
const NAVY = "#002583";
const ACCENT = {
  neutral: NAVY,
  pending: "#FFB800",
  approved: "#15803D",
  rejected: "#B91C1C",
};

const getMeta = (key = "", label = ""): { icon: IconType; accent: string } => {
  const k = `${key} ${label}`.toLowerCase();

  if (k.includes("pending")) return { icon: FiClock, accent: ACCENT.pending };
  if (k.includes("approved")) {
    return { icon: FiCheckCircle, accent: ACCENT.approved };
  }
  if (k.includes("rejected")) {
    return { icon: FiXCircle, accent: ACCENT.rejected };
  }
  if (k.includes("active"))
    return { icon: FiUserCheck, accent: ACCENT.neutral };
  if (k.includes("vehicle")) return { icon: FiTruck, accent: ACCENT.neutral };
  if (k.includes("event")) return { icon: FiCalendar, accent: ACCENT.neutral };
  if (k.includes("office"))
    return { icon: FiBriefcase, accent: ACCENT.neutral };
  if (k.includes("user")) return { icon: FiUsers, accent: ACCENT.neutral };

  return { icon: FiBarChart2, accent: ACCENT.neutral };
};

const StatCard = ({ label, value, cardKey }: StatCardProps) => {
  const { icon: Icon, accent } = getMeta(cardKey, label);

  return (
    <article
      className="flex min-h-28 items-center justify-between gap-4 rounded-lg border border-l-4 border-[#E5E8EF] bg-white px-5 py-4"
      style={{ borderLeftColor: accent }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-[#5B6678]">
          {label}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-[#002583]">
          {value.toLocaleString()}
        </p>
      </div>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#F1F4FA] text-[#002583]">
        <Icon size={20} />
      </span>
    </article>
  );
};

export default StatCard;
