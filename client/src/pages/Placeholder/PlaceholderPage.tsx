import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/profile": "My Profile",
  "/system-history": "System History",
  "/audit-logs": "Audit Logs",
  "/messenger": "Messenger",
  "/announcements": "Announcements",
  "/settings": "System Settings",
  "/vehicle-bookings": "Vehicle Booking List",
  "/approvals/venues": "Venue Approvals",
  "/approvals/vehicles": "Vehicle Approvals",
};

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Page";

  return (
    <div className="rounded-3xl border border-[#1E3A5F]/15 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#1E3A5F]">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        This screen is reserved for a later phase. You can open it because your
        role is authorized, but the module is not implemented yet.
      </p>
    </div>
  );
};

export default PlaceholderPage;
