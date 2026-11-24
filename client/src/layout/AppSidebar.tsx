import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../contexts/AuthContext";
import { getVisibleSidebarItems } from "../permissions";
import {
  FiHome,
  FiUsers,
  FiShield,
  FiBriefcase,
  FiCalendar,
  FiMapPin,
  FiCheckSquare,
  FiCheckCircle,
  FiTrash2,
  FiChevronDown,
  FiTruck,
  FiList,
  FiUser,
  FiClipboard,
  FiBookOpen,
  FiBarChart2,
  FiActivity,
  FiFileText,
  FiMessageSquare,
  FiBell,
  FiSettings,
} from "react-icons/fi";
import { eventApprovalService } from "../services/EventApprovalService";
import VehicleBookingService from "../services/VehicleBookingService";

/*
|--------------------------------------------------------------------------
| FCU Light Theme (tokens come from fcu-theme.css)
|--------------------------------------------------------------------------
| surface        #FFFFFF  Sidebar background
| line           #E2E8F0  Borders and dividers
| ink            #0F1F3D  Strong text, tooltip background
| muted          #5B6678  Inactive links and icons
| primary        #1D4ED8  Active text and indicator bar
| primary-soft   #EAF0FD  Hover and active background
| accent         #F5B800  Pending badge (navy text on top)
*/

// The sidebar clips overflow, so the tooltip is `fixed` and positioned from
// the hovered item. That way it is never cut off at the sidebar's edge.
const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
  };

  return (
    <div
      className="w-full"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={() => setPos(null)}
    >
      {children}

      {pos && (
        <div
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white shadow-md"
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-ink" />
        </div>
      )}
    </div>
  );
};

const navIcons: Record<string, React.ReactNode> = {
  dashboard: <FiHome />,
  calendar: <FiCalendar />,
  user_management: <FiUsers />,
  roles: <FiShield />,
  offices: <FiBriefcase />,
  users: <FiUsers />,
  event_management: <FiCalendar />,
  venues: <FiMapPin />,
  events: <FiCalendar />,
  vehicle_management: <FiTruck />,
  vehicles: <FiList />,
  drivers: <FiUser />,
  trips: <FiClipboard />,
  booking_management: <FiBookOpen />,
  "event-bookings": <FiList />,
  "vehicle-bookings": <FiList />,
  approval_management: <FiCheckCircle />,
  "event-approvals": <FiCheckSquare />,
  "vehicle-approvals": <FiCheckSquare />,
  reports: <FiBarChart2 />,
  system_history: <FiActivity />,
  audit_logs: <FiFileText />,
  messenger: <FiMessageSquare />,
  announcements: <FiBell />,
  settings: <FiSettings />,
  trash: <FiTrash2 />,
};

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (menu: string) =>
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  // Number of event requests waiting on the logged-in approver
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.allSettled([
      eventApprovalService.awaitingMyApproval(),
      VehicleBookingService.awaitingMyApproval(),
    ]).then(([events, vehicles]) => {
      if (cancelled) return;
      const eventCount = events.status === "fulfilled" ? events.value.length : 0;
      const vehicleCount = vehicles.status === "fulfilled" ? vehicles.value.length : 0;
      setPendingApprovals(eventCount + vehicleCount);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const sidebarItems = useMemo(
    () => getVisibleSidebarItems(user, pendingApprovals),
    [user, pendingApprovals],
  );

  // Muted text on white; soft blue pill on hover; active item gets the same
  // pill in royal blue text plus a blue indicator bar on the left edge
  const inactiveLink = "text-[#6B7790] hover:bg-[#E3EBFF] hover:text-[#002583]";
  const activeLink = "bg-[#002583] text-white font-semibold shadow-md";
  const activeChild = "bg-[#002583] text-white font-semibold shadow-md";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Expanded: w-64. Collapsed: icon rail (w-17) on sm+, hidden on phones */}
      <aside
        id="top-bar-sidebar"
        className={`
          fixed top-16 bottom-3 left-0 z-40 rounded-br-3xl shadow-sm
          bg-white
          border-r border-[#E5E8EF]
          flex flex-col
          transition-[width] duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-64" : "w-0 sm:w-17"}
        `}
        aria-label="Sidebar"
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <div key={item.id}>
              {/* Single link */}
              {!item.children &&
                (isOpen ? (
                  <NavLink
                    to={item.path!}
                    end={item.path === "/"}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${isActive ? activeLink : inactiveLink}
                    `}
                  >
                    <span className="text-base shrink-0">
                      {navIcons[item.id]}
                    </span>
                    <span className="whitespace-nowrap">{item.text}</span>
                  </NavLink>
                ) : (
                  <Tooltip label={item.text}>
                    <NavLink
                      to={item.path!}
                      end={item.path === "/"}
                      aria-label={item.text}
                      className={({ isActive }) => `
                        flex items-center justify-center w-full py-2.5 rounded-lg text-base
                        transition-colors duration-150
                        ${isActive ? activeLink : inactiveLink}
                      `}
                    >
                      {navIcons[item.id]}
                    </NavLink>
                  </Tooltip>
                ))}

              {/* Dropdown */}
              {item.children &&
                (isOpen ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.text)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${inactiveLink}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base shrink-0">
                          {navIcons[item.id]}
                        </span>
                        <span className="whitespace-nowrap">{item.text}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-on-accent">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}

                        <FiChevronDown
                          size={13}
                          className={`shrink-0 transition-transform duration-300 ${
                            openMenus[item.text] ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        openMenus[item.text] ? "max-h-60" : "max-h-0"
                      }`}
                    >
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-line pl-3 pb-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.id}
                            to={child.path}
                            end
                            className={({ isActive }) => `
                              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                              transition-colors duration-150
                              ${isActive ? activeChild : inactiveLink}
                            `}
                          >
                            <span className="text-sm shrink-0">
                              {navIcons[child.id]}
                            </span>
                            <span className="whitespace-nowrap">
                              {child.text}
                            </span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Collapsed: the group icon, then each child icon as its own
                     clickable link */
                  <div className="space-y-0.5">
                    <Tooltip label={item.text}>
                      <div className="relative flex w-full items-center justify-center py-2 rounded-lg text-base text-muted/60 cursor-default select-none">
                        {navIcons[item.id]}

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-accent" />
                        )}
                      </div>
                    </Tooltip>

                    {item.children.map((child) => (
                      <Tooltip key={child.id} label={child.text}>
                        <NavLink
                          to={child.path}
                          end
                          aria-label={child.text}
                          className={({ isActive }) => `
                            flex items-center justify-center w-full py-2.5 rounded-lg text-base
                            transition-colors duration-150
                            ${isActive ? activeLink : inactiveLink}
                          `}
                        >
                          {navIcons[child.id]}
                        </NavLink>
                      </Tooltip>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-line shrink-0 p-3">
          {isOpen ? (
            <div className="flex items-center gap-2 rounded-lg bg-page px-3 py-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p className="text-[10px] text-muted whitespace-nowrap">
                Event Management System
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
