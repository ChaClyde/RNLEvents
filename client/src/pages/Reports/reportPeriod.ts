export type PeriodKind = "daily" | "weekly" | "monthly";

export const todayIso = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseIso = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatIso = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const periodRange = (kind: PeriodKind, anchor: string) => {
  const date = parseIso(anchor || todayIso());

  if (kind === "daily") {
    const iso = formatIso(date);
    return { start: iso, end: iso };
  }

  if (kind === "weekly") {
    const weekday = date.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const start = new Date(date);
    start.setDate(date.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: formatIso(start), end: formatIso(end) };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatIso(start), end: formatIso(end) };
};
