import { FolderOpen } from "lucide-react";
export default function EmptyState({
  title = "Nothing here yet",
  description = "Updates will appear here when available.",
  icon: Icon = FolderOpen,
  action,
}) {
  return (
    <div className="state">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
