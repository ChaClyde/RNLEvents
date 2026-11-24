import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContext";
import { HeaderProvider } from "../contexts/HeaderContext";
import { ToastProvider } from "../contexts/ToastContext";

const LayoutContent = () => {
  const { isOpen } = useSidebar();

  return (
    <>
      <AppSidebar />
      <AppHeader />

      {/*
        pt-22 = 88px: the 64px header + a 24px gap.
        The left margin follows the sidebar: w-64 (256px) when open,
        w-17 (68px icon rail) when collapsed. On phones the sidebar
        overlays the page, so there is no margin.
      */}
      <main
        className={`min-h-screen bg-page px-4 pb-6 pt-22 transition-[margin] duration-300 sm:px-6 ${
          isOpen ? "sm:ml-64" : "sm:ml-17"
        }`}
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </>
  );
};

const AppLayout = () => {
  return (
    <ToastProvider>
      <HeaderProvider>
        <SidebarProvider>
          <LayoutContent />
        </SidebarProvider>
      </HeaderProvider>
    </ToastProvider>
  );
};

export default AppLayout;
