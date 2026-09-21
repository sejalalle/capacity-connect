import { NavLink } from "react-router-dom";
import { X, LogOut, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { X, LogOut, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import Brand from "./Brand";
import useAuth from "../../hooks/useAuth";
import { navigation } from "../../utils/navigation";
import { navigationGroups } from "../../utils/navigation";

export default function Sidebar({ role, open, onClose }) {
  const { logout } = useAuth();
  const location = useLocation();
  const groups = navigationGroups[role] || [];

  // Determine active group from pathname
  const currentPath = location.pathname.replace(`/${role}`, "").replace(/^\//, "");

  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Ensure active group is expanded
  useEffect(() => {
    const activeGroup = groups.find((g) =>
      g.items.some(([, path]) => path === currentPath || (path === "" && currentPath === "")),
    );
    if (activeGroup && collapsedGroups[activeGroup.group]) {
      setCollapsedGroups((prev) => ({ ...prev, [activeGroup.group]: false }));
    }
  }, [currentPath, groups]);

  const toggleGroup = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const roleTitle =
    role === "admin"
      ? "Administrator / Coordinator"
      : role === "trainer"
      ? "Trainer Workspace"
      : "Trainee Workspace";

  return (
    <>
      <div
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main sidebar">
        <div className="sidebar-brand">
          <Brand compact />
          <button
            className="icon-button mobile-only"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X />
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          {role === "admin" ? "Admin / Coordinator" : role} workspace

        <div className="workspace-badge-wrap">
          <span className="workspace-role-pill">{roleTitle}</span>
        </div>
        <nav aria-label="Workspace navigation">
          {navigation[role].map(([label, path, Icon]) => (
            <NavLink
              key={label}
              to={`/${role}${path ? `/${path}` : ""}`}
              end
              onClick={onClose}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {groups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.group]);
            const hasActiveItem = group.items.some(
              ([, path]) => path === currentPath || (path === "" && currentPath === ""),
            );

            return (
              <div
                key={group.group}
                className={`nav-group ${hasActiveItem ? "has-active" : ""}`}
              >
                {group.group !== "Overview" ? (
                  <button
                    type="button"
                    className="nav-group-header"
                    onClick={() => toggleGroup(group.group)}
                    aria-expanded={!isCollapsed}
                  >
                    <span>{group.group}</span>
                    {isCollapsed ? (
                      <ChevronRight size={14} className="nav-group-chevron" />
                    ) : (
                      <ChevronDown size={14} className="nav-group-chevron" />
                    )}
                  </button>
                ) : null}

                {!isCollapsed && (
                  <div className="nav-group-items">
                    {group.items.map(([label, path, Icon]) => (
                      <NavLink
                        key={label}
                        to={`/${role}${path ? `/${path}` : ""}`}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          `nav-link ${isActive ? "active" : ""}`
                        }
                      >
                        <Icon size={17} className="nav-link-icon" />
                        <span className="nav-link-text">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="text-xs uppercase tracking-widest">
              Purpose into practice
            </span>
            <p>
              Learning is the beginning.
              <br />
              Capability is the outcome.
          <div className="sidebar-footer-card">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-plum-700">
              <Sparkles size={13} className="text-copper-600" />
              <span>Demonstration Mode</span>
            </div>
            <p className="text-xs text-ivory-700 mt-1 leading-snug">
              Synthetic training records & traceable competencies.
            </p>
            <ArrowUpRight size={18} />
          </div>
          <button onClick={logout}>
            <LogOut size={17} /> Sign out

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
          <small>Demo data</small>
        </div>
      </aside>
    </>
  );
}
