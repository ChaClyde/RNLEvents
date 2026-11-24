import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBell, FiLogOut, FiMenu, FiUser } from "react-icons/fi";

import { useHeader } from "../contexts/HeaderContext";
import { useSidebar } from "../contexts/SidebarContext";
import { ROLE_LABELS, useAuth } from "../contexts/AuthContext";
import { RoleSlug } from "../permissions";
import NotificationService, {
  type AppNotification,
} from "../services/NotificationService";

// The logo must live inside the client app so Vite can bundle it:
// client/src/assets/fs.png
import logo from "../assets/fs.png";

// "Juan Dela Cruz" -> "JC", "Maria" -> "M"
const getInitials = (
  fullName?: string | null,
  firstName?: string | null,
  email?: string | null,
): string => {
  const source = (fullName || firstName || email || "").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

// Profile photo, or the user's initials when there is no photo
// (or the photo fails to load)
const UserAvatar = ({
  photoUrl,
  initials,
  alt,
}: {
  photoUrl?: string | null;
  initials: string;
  alt: string;
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  if (photoUrl && !failed) {
    return (
      <img
        className="h-9 w-9 rounded-full object-cover"
        src={photoUrl}
        alt={alt}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-[#FFB800] text-sm font-bold text-[#002583]"
      aria-label={alt}
    >
      {initials}
    </span>
  );
};

const AppHeader = () => {
  const { isOpen, toggleUserMenu } = useHeader();
  const { isOpen: isSidebarOpen, toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noticesOpen, setNoticesOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = () => {
      NotificationService.list()
        .then((response) => {
          if (!cancelled) {
            setNotifications(response.data.data);
            setUnreadCount(response.data.unread_count);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNotifications([]);
            setUnreadCount(0);
          }
        });
    };

    load();
    const timer = window.setInterval(load, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  const openNotice = async (notice: AppNotification) => {
    setNoticesOpen(false);
    if (!notice.read_at) {
      await NotificationService.markRead(notice.notification_id).catch(() => undefined);
      setUnreadCount((count) => Math.max(0, count - 1));
      setNotifications((rows) =>
        rows.map((row) =>
          row.notification_id === notice.notification_id
            ? { ...row, read_at: row.read_at ?? "read" }
            : row,
        ),
      );
    }
    if (notice.link) {
      navigate(notice.link);
    }
  };

  const roleSlug = user?.role?.slug as RoleSlug | undefined;
  const roleLabel = roleSlug ? ROLE_LABELS[roleSlug] : user?.role?.slug;

  const displayName = user?.full_name ?? user?.first_name ?? "";
  const initials = getInitials(user?.full_name, user?.first_name, user?.email);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Click-away layer for the profile menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={toggleUserMenu} />
      )}

      {/* Height (h-16 = 64px) matches the spacer at the top of the sidebar */}
      <nav className="fixed top-0 z-50 h-16 w-full bg-linear-to-r from-[#00205F] via-[#002583] to-[#2F5BC4] shadow-md">
        <div className="flex h-full items-center justify-between px-3 lg:px-5 lg:pl-3">
          {/* Left: sidebar toggle + logo (the logo is not a link) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-controls="top-bar-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="rounded-lg border border-transparent bg-transparent p-2 text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-[#FFB800]/50"
            >
              <FiMenu size={22} />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-12 items-center justify-center rounded-xl bg-[#E5E8EF] p-1.5 shadow-sm">
                <img
                  src={logo}
                  alt="FilSched logo"
                  className="h-full w-auto select-none object-contain"
                  draggable={false}
                />
              </span>

              <span className="select-none text-xl font-extrabold tracking-wide [font-variant-caps:small-caps] sm:text-2xl">
                <span className="text-white">Fil</span>
                <span className="text-[#FFB800]">Sched</span>
              </span>
            </div>
          </div>

          {/* Right: bell + profile menu */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNoticesOpen((open) => !open)}
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread notifications`
                    : "Notifications"
                }
                className="relative rounded-full p-2 text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-[#FFB800]/50"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FFB800] px-1 text-[10px] font-bold text-[#002583]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {noticesOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#E5E8EF] bg-white text-left shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#E5E8EF] px-4 py-3">
                    <p className="text-sm font-semibold text-[#002583]">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#0095D9]"
                        onClick={() => {
                          void NotificationService.markAllRead().then(() => {
                            setUnreadCount(0);
                            setNotifications((rows) =>
                              rows.map((row) => ({ ...row, read_at: row.read_at ?? "read" })),
                            );
                          });
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
                  ) : (
                    <ul className="max-h-96 overflow-y-auto">
                      {notifications.map((notice) => (
                        <li key={notice.notification_id}>
                          <button
                            type="button"
                            onClick={() => void openNotice(notice)}
                            className={`w-full px-4 py-3 text-left ${
                              notice.read_at ? "bg-white" : "bg-[#EAF0FD]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-[#002583]">{notice.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{notice.body}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{notice.created_at}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex rounded-full text-sm ring-2 ring-[#FFB800] shadow-sm focus:outline-none focus:ring-4 focus:ring-[#FFB800]/50"
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                <span className="sr-only">Open user menu</span>
                <UserAvatar
                  photoUrl={user?.profile_photo_url}
                  initials={initials}
                  alt={displayName || "User"}
                />
              </button>

              <div
                id="dropdown-user"
                className={`absolute right-0 top-full z-50 mt-2 w-56 min-w-56 rounded-xl border border-[#E5E8EF] bg-white shadow-lg ${
                  isOpen ? "block" : "hidden"
                }`}
              >
                <div
                  className="border-b border-[#E5E8EF] px-4 py-3"
                  role="none"
                >
                  <p
                    className="text-sm font-semibold text-[#002583]"
                    role="none"
                  >
                    {displayName}
                  </p>
                  <p className="truncate text-sm text-muted" role="none">
                    {user?.email}
                  </p>
                  {roleLabel && (
                    <p className="mt-1 text-xs text-muted" role="none">
                      {roleLabel}
                    </p>
                  )}
                </div>

                <ul className="p-2 text-sm font-medium text-muted" role="none">
                  <li>
                    <Link
                      to="/profile"
                      onClick={toggleUserMenu}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-[#E5E8EF] hover:text-[#002583]"
                    >
                      <FiUser className="shrink-0" />
                      My Profile
                    </Link>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <FiLogOut className="shrink-0" />
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default AppHeader;
