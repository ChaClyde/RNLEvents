import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import {
  FiHome,
  FiUsers,
  FiShield,
  FiBriefcase,
  FiCalendar,
  FiMapPin,
  FiCheckSquare,
  FiTrash2,
  FiChevronDown,
  FiTruck,
  FiList,
  FiUser,
  FiClipboard,
} from "react-icons/fi";

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
        whitespace-nowrap rounded-xl border border-[#0095D9]/20 bg-white text-gray-900
        px-3 py-2 text-xs font-medium shadow-xl
        opacity-0 translate-x-1.5
        group-hover/tip:opacity-100 group-hover/tip:translate-x-0
        transition-all duration-150
      "
    >
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-white" />
    </div>
  </div>
);

interface NavChild {
  text: string;
  path: string;
  icon: React.ReactNode;
}
interface NavItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavChild[];
}

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "User Management": true,
  });

  const toggleMenu = (menu: string) =>
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  const sidebarItems: NavItem[] = [
    { text: "Dashboard", path: "/", icon: <FiHome /> },

    {
      text: "User Management",
      icon: <FiUsers />,
      children: [
        { text: "Roles List", path: "/roles", icon: <FiShield /> },
        { text: "Office List", path: "/offices", icon: <FiBriefcase /> },
        { text: "User List", path: "/users", icon: <FiUsers /> },
      ],
    },

    {
      text: "Event Management",
      icon: <FiCalendar />,
      children: [
        { text: "Venue List", path: "/venues", icon: <FiMapPin /> },
        { text: "Event List", path: "/events", icon: <FiCalendar /> },
        { text: "Approval List", path: "/approvals", icon: <FiCheckSquare /> },
      ],
    },

    {
      text: "Vehicle Management",
      icon: <FiTruck />,
      children: [
        { text: "Vehicle List", path: "/vehicles", icon: <FiList /> },
        { text: "Driver List", path: "/drivers", icon: <FiUser /> },
        {
          text: "Vehicle Request List",
          path: "/vehicle-requests",
          icon: <FiClipboard />,
        },
        {
          text: "Vehicle Approval List",
          path: "/vehicle-approvals",
          icon: <FiCheckSquare />,
        },
      ],
    },

    {
      text: "Trash Bin",
      icon: <FiTrash2 />,
      children: [
        { text: "User Trash", path: "/user-trash", icon: <FiTrash2 /> },
        { text: "Event Trash", path: "/event-trash", icon: <FiTrash2 /> },
        { text: "Vehicle Trash", path: "/vehicle-trash", icon: <FiTrash2 /> },
      ],
    },
  ];

  // Light text on the ocean-blue gradient; white pill on hover/active
  const inactiveLink = "text-white/80 hover:bg-white hover:text-[#003B5C]";
  const activeLink =
    "bg-white text-[#003B5C] shadow-md shadow-black/20 font-semibold";
  const activeChild = "bg-white/90 text-[#003B5C] font-semibold";

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
          bg-linear-to-b from-[#003B5C] via-[#00679E] to-[#0095D9]
          border-r border-[#003B5C] shadow-lg
          flex flex-col
          transition-[width] duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-64" : "w-0 sm:w-17"}
        `}
        aria-label="Sidebar"
      >
        {/* Spacer below fixed header */}
        <div className="h-18 shrink-0 border-b border-white/10" />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {sidebarItems.map((item, i) => (
            <div key={i}>
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
                    <span className="text-base shrink-0">{item.icon}</span>
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
                      {item.icon}
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
                        <span className="text-base shrink-0">{item.icon}</span>
                        <span className="whitespace-nowrap">{item.text}</span>
                      </div>
                      <FiChevronDown
                        size={13}
                        className={`shrink-0 transition-transform duration-300 ${
                          openMenus[item.text] ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        openMenus[item.text] ? "max-h-60" : "max-h-0"
                      }`}
                    >
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/20 pl-3 pb-1">
                        {item.children.map((child, ci) => (
                          <NavLink
                            key={ci}
                            to={child.path}
                            className={({ isActive }) => `
                              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                              transition-all duration-200
                              ${isActive ? activeChild : inactiveLink}
                            `}
                          >
                            <span className="text-sm shrink-0">
                              {child.icon}
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
                      <div className="flex w-full items-center justify-center py-2 rounded-xl text-base text-white/50 cursor-default select-none">
                        {item.icon}
                      </div>
                    </Tooltip>

                    {item.children.map((child, ci) => (
                      <Tooltip key={ci} label={child.text}>
                        <NavLink
                          to={child.path}
                          className={({ isActive }) => `
                            flex items-center justify-center w-full py-2.5 rounded-xl text-base
                            transition-all duration-200
                            ${isActive ? activeLink : inactiveLink}
                          `}
                        >
                          {child.icon}
                        </NavLink>
                      </Tooltip>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 shrink-0 p-3">
          {isOpen ? (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <p className="text-[10px] text-white/70 whitespace-nowrap">
                Event Management System
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="h-2 w-2 rounded-full bg-white shadow-lg shadow-white/50" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
