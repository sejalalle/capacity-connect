import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { X, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import Brand from "./Brand";
import useAuth from "../../hooks/useAuth";
import useTttNomination from "../../hooks/useTttNomination";
import { navigationGroups } from "../../utils/navigation";

export default function Sidebar({ role, open, onClose }) {
  const ref = useRef(null);
  const { logout } = useAuth();
  const location = useLocation();
  // Train-the-Trainer is admin-created: a trainee only sees the group once a
  // nomination exists. Other roles are unaffected.
  const { hasAccess: hasTttNomination } = useTttNomination();
  const groups = useMemo(
    () =>
      (navigationGroups[role] || []).filter(
        (group) =>
          !group.requiresTttNomination ||
          (role === "trainee" && hasTttNomination),
      ),
    [role, hasTttNomination],
  );

  // Determine active group from pathname
  const currentPath = location.pathname
    .replace(`/${role}`, "")
    .replace(/^\//, "");

  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Ensure active group is expanded
  useEffect(() => {
    const activeGroup = groups.find((g) =>
      g.items.some(
        ([, path]) =>
          path === currentPath || (path && currentPath.startsWith(`${path}/`)),
      ),
    );
    if (activeGroup && collapsedGroups[activeGroup.group]) {
      setCollapsedGroups((prev) => ({ ...prev, [activeGroup.group]: false }));
    }
  }, [currentPath, groups]);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 900px)").matches) return;
    const previous = document.activeElement;
    const sidebar = ref.current;
    const body = document.querySelector(".workspace-body");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (body) body.inert = true;
    const focusable = () =>
      [...sidebar.querySelectorAll("a,button")].filter(
        (el) => el.getClientRects().length && !el.disabled,
      );
    sidebar.querySelector('[aria-label="Close navigation"]')?.focus();
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    sidebar.addEventListener("keydown", trap);
    return () => {
      sidebar.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      if (body) body.inert = false;
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      if (ref.current) ref.current.inert = media.matches && !open;
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      if (ref.current) ref.current.inert = false;
    };
  }, [open]);

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
      <aside
        ref={ref}
        id="workspace-navigation"
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Main sidebar"
      >
        <div className="sidebar-brand">
          <Brand compact />
          <button
            className="icon-button mobile-only"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-badge-wrap">
          <span className="workspace-role-pill">{roleTitle}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {groups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.group]);
            const hasActiveItem = group.items.some(
              ([, path]) =>
                path === currentPath ||
                (path && currentPath.startsWith(`${path}/`)),
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
                        end={!path}
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
          <button type="button" className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
