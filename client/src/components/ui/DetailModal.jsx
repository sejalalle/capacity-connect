import { useEffect } from "react";
import { X } from "lucide-react";

export default function DetailModal({ title, subtitle, onClose, children, actions, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className={`admin-modal${wide ? " admin-modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <p className="admin-modal-name">{title}</p>
            {subtitle && <p className="admin-modal-email">{subtitle}</p>}
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {actions && (
          <div className="admin-modal-footer">
            <div className="admin-modal-btns">{actions}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailRows({ rows }) {
  return (
    <div className="admin-detail-section">
      {rows.map(([k, v]) => (
        <div key={k} className="admin-detail-row">
          <span className="admin-detail-key">{k}</span>
          <span className="admin-detail-val">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function PanelState({ loading, error, empty, onRetry, children, loadingLabel = "Loading…" }) {
  if (loading) return <section className="xp-panel"><p>{loadingLabel}</p></section>;
  if (error)
    return (
      <section className="xp-panel" role="alert">
        <p>{error}</p>
        {onRetry && <button className="button button-secondary" onClick={onRetry}>Retry</button>}
      </section>
    );
  if (empty) return <section className="xp-panel"><p>{empty}</p></section>;
  return children;
}
