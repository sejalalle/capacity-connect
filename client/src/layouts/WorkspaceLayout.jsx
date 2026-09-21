import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/ui/Sidebar";
import Topbar from "../components/ui/Topbar";
export default function WorkspaceLayout({ role }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    document.querySelector("main")?.focus();
  }, [pathname]);
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="workspace-body">
        <Topbar onMenu={() => setOpen(true)} />
        <main id="main" tabIndex={-1} className="workspace-main">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} SAMARTHYA</span>
          <span>Training and capacity-building workspace</span>
        </footer>
      </div>
    </div>
  );
}
