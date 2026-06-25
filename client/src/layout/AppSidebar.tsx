import { Link } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  const sidebarItems = [
    {
      path: "/",
      text: "Dashboard",
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
        <div className="h-full px-3 py-18 overflow-y-auto bg-neutral-primary-soft border-e border-default">
          <ul className="space-y-2 font-medium">
            {sidebarItems.map((sidebarItem) => (
              <li>
                <Link
                  to={sidebarItem.path}
                  className="flex items-center px-2 py-1.5 text-body rounded-base hover:bg-neutral-tertiary hover:text-fg-brand group"
                >
                  <span className="ms-3">{sidebarItem.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
