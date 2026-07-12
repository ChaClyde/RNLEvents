import { Link } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { useState } from "react";

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const sidebarItems = [
    {
      path: "/",
      text: "Dashboard",
    },
    {
      text: "User Management",
      children: [
        {
          text: "Roles List",
          path: "/roles",
        },
        {
          text: "Office List",
          path: "/offices",
        },
        {
          text: "User List",
          path: "/users",
        },
      ],
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 blur-lg sm:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        id="top-bar-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 h-full transition-transform 
          ${isOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-18 overflow-y-auto bg-white border-e border-default">
          <ul className="space-y-2 font-medium">
            {sidebarItems.map((item) => (
              <li key={item.text}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.text)}
                      className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-700 hover:text-white"
                    >
                      <span>{item.text}</span>

                      <span
                        className={`transition-transform ${
                          openMenu === item.text ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {openMenu === item.text && (
                      <ul className="mt-1 ml-5 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              className="block rounded-lg px-2 py-2 hover:bg-gray-700 hover:text-white"
                            >
                              {child.text}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path!}
                    className="flex items-center px-2 py-2 rounded-lg hover:bg-gray-700 hover:text-white"
                  >
                    {item.text}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
