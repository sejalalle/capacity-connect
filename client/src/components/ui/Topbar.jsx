import { useEffect, useState } from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Menu, Bell, ChevronDown, UserCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { part2 } from "../../services/part2Service";

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    part2
      .get("/notifications/unread-count")
      .then((value) => setUnread(value.count))
      .then((value) => setUnread(value?.count || 0))
      .catch(() => {});
  }, []);

  // Compute breadcrumb path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const role = pathParts[0] || user?.role || "trainee";
  const section = pathParts[1]
    ? pathParts[1]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Dashboard";

  return (
    <header className="topbar">
      <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <button
          className="icon-button mobile-only"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu />
          <Menu size={20} />
        </button>
        <span className="topbar-context">
          Capacity Building <span>/</span> <b>Workspace</b>
        </span>
        <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
          <span className="text-ivory-500 capitalize">{role}</span>
          <span className="text-ivory-200">/</span>
          <b className="text-plum-900 font-semibold">{section}</b>
        </nav>
      </div>
      <div className="flex items-center gap-5">

      <div className="flex items-center gap-4">
        <span className="demo-label">Demonstration</span>

        <Link
          className="icon-button notification-button"
          to={`/${user.role}/notifications`}
          className="topbar-icon-button"
          to={`/${user?.role || "trainee"}/notifications`}
          aria-label={`${unread} unread notifications`}
          title="Notifications"
        >
          <Bell size={19} />
          {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
          <Bell size={18} />
          {unread > 0 && <span className="notification-dot">{unread > 99 ? "99+" : unread}</span>}
        </Link>
        <Link className="user-menu" to={`/${user.role}/profile`}>
          <span className="avatar">{user.name.slice(0, 1)}</span>

        <Link className="user-menu" to={`/${user?.role || "trainee"}/profile`}>
          <span className="avatar">{(user?.name || "U").slice(0, 1)}</span>
          <span className="user-menu-name">
            <strong>{user.name}</strong>
            <strong>{user?.name || "User"}</strong>
            <small>
              {user.role === "admin" ? "Admin / Coordinator" : user.role}
              {user?.role === "admin"
                ? "Admin / Coordinator"
                : user?.role === "trainer"
                ? "Trainer"
                : "Trainee"}
            </small>
          </span>
          <ChevronDown size={15} />
          <ChevronDown size={14} className="text-ivory-500 ml-0.5" />
        </Link>
      </div>
    </header>
  );
}
