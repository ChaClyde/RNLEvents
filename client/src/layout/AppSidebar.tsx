import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  FiLogOut,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Color Palette
|--------------------------------------------------------------------------
| Deep Navy Blue  #1E3A5F  Sidebar background
| Slate Gray      #64748B  Dividers and guide lines
| Soft White      #F8FAFC  Text, active and hover pills
| Teal Green      #0F766E  Active indicator, status dot
| Amber           #F59E0B  Pending / warning badge
*/

const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="relative group/tip w-full">
    {children}
    <div
      className="
        pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
        whitespace-nowrap rounded-xl border border-[#64748B]/30 bg-[#F8FAFC] text-[#1E3A5F]
        px-3 py-2 text-xs font-medium shadow-xl
        opacity-0 translate-x-1.5
        group-hover/tip:opacity-100 group-hover/tip:translate-x-0
        transition-all duration-150
      "
    >
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#F8FAFC]" />
    </div>
  </div>
);

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
  "vehicle-list": <FiClipboard />,
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (menu: string) =>
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  const handleLogout = () => {
    void logout().then(() => navigate("/login"));
  };

  const pendingApprovals = 0;

  const sidebarItems = useMemo(
    () => getVisibleSidebarItems(user, pendingApprovals),
    [user],
  );

  // Soft White text on Deep Navy; Soft White pill on hover and when active,
  // with a Teal Green indicator bar on the active item
  const inactiveLink =
    "text-[#F8FAFC]/80 hover:bg-[#F8FAFC] hover:text-[#1E3A5F]";
  const activeLink =
    "bg-[#F8FAFC] text-[#1E3A5F] shadow-md shadow-black/20 font-semibold shadow-[inset_4px_0_0_#0F766E]";
  const activeChild =
    "bg-[#F8FAFC]/90 text-[#1E3A5F] font-semibold shadow-[inset_3px_0_0_#0F766E]";
  const logoutLink = "text-[#F8FAFC]/80 hover:bg-red-500 hover:text-white";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        id="top-bar-sidebar"
        className={`
          fixed top-0 left-0 z-40 h-screen
          bg-[#1E3A5F]
          border-r border-[#64748B]/30 shadow-lg
          flex flex-col
          transition-[width] duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-64" : "w-0 sm:w-17"}
        `}
        aria-label="Sidebar"
      >
        {/* Spacer below fixed header */}
        <div className="h-18 shrink-0 border-b border-[#64748B]/30" />

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
                      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${isActive ? activeLink : inactiveLink}
                    `}
                  >
                    <span className="text-base shrink-0">{navIcons[item.id]}</span>
                    <span className="whitespace-nowrap">{item.text}</span>
                  </NavLink>
                ) : (
                  <Tooltip label={item.text}>
                    <NavLink
                      to={item.path!}
                      end={item.path === "/"}
                      className={({ isActive }) => `
                        flex items-center justify-center w-full py-2.5 rounded-xl text-base
                        transition-all duration-200
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
                      className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${inactiveLink}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base shrink-0">{navIcons[item.id]}</span>
                        <span className="whitespace-nowrap">{item.text}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold text-[#1E3A5F]">
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
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#64748B]/60 pl-3 pb-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.id}
                            to={child.path}
                            end
                            className={({ isActive }) => `
                              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                              transition-all duration-200
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
                  <div className="space-y-0.5">
                    <Tooltip label={item.text}>
                      <div className="relative flex w-full items-center justify-center py-2 rounded-xl text-base text-[#F8FAFC]/50 cursor-default select-none">
                        {navIcons[item.id]}

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-[#F59E0B]" />
                        )}
                      </div>
                    </Tooltip>

                    {item.children.map((child) => (
                      <Tooltip key={child.id} label={child.text}>
                        <NavLink
                          to={child.path}
                          end
                          className={({ isActive }) => `
                            flex items-center justify-center w-full py-2.5 rounded-xl text-base
                            transition-all duration-200
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

        {/* Account: My Profile + Logout */}
        <div className="shrink-0 space-y-0.5 border-t border-[#64748B]/30 px-2 py-2">
          {isOpen ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive ? activeLink : inactiveLink}
                `}
              >
                <span className="text-base shrink-0">
                  <FiUser />
                </span>
                <span className="whitespace-nowrap">My Profile</span>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${logoutLink}`}
              >
                <span className="text-base shrink-0">
                  <FiLogOut />
                </span>
                <span className="whitespace-nowrap">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Tooltip label="My Profile">
                <NavLink
                  to="/profile"
                  className={({ isActive }) => `
                    flex items-center justify-center w-full py-2.5 rounded-xl text-base
                    transition-all duration-200
                    ${isActive ? activeLink : inactiveLink}
                  `}
                >
                  <FiUser />
                </NavLink>
              </Tooltip>

              <Tooltip label="Logout">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`flex w-full items-center justify-center py-2.5 rounded-xl text-base transition-all duration-200 ${logoutLink}`}
                >
                  <FiLogOut />
                </button>
              </Tooltip>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#64748B]/30 shrink-0 p-3">
          {isOpen ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC]/10 px-3 py-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#0F766E] shadow-lg shadow-[#0F766E]/60" />
              <p className="text-[10px] text-[#F8FAFC]/70 whitespace-nowrap">
                Event Management System
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="h-2 w-2 rounded-full bg-[#0F766E] shadow-lg shadow-[#0F766E]/60" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
