import StatusBadge from "./StatusBadge";
import { Radio, Satellite, CloudSun, Activity } from "lucide-react";

export function getCompetencyIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("radar")) return Radio;
  if (n.includes("satell")) return Satellite;
  if (n.includes("numerical") || n.includes("nwp")) return Activity;
  return CloudSun;
}

export default function CompetencyProgressRow({
  icon: IconProp,
  name,
  currentLevel = 1,
  requiredLevel = 3,
  status = "IN_PROGRESS",
  statusLabel = "",
  className = "",
}) {
  const Icon = IconProp || getCompetencyIcon(name);
  const percentage = Math.min(100, Math.round((currentLevel / (requiredLevel || 3)) * 100));

  let barColor = "bg-[#D97706]"; // In Progress amber
  if (currentLevel >= requiredLevel && requiredLevel > 0) {
    barColor = "bg-[#16A34A]"; // Completed green
  } else if (status === "NEEDS_DEVELOPMENT" || status === "NEEDS_PRACTICE") {
    barColor = "bg-[#DC2626]"; // Needs development red
  } else if (status === "NOT_ASSESSED") {
    barColor = "bg-[#6B7280]"; // Grey
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-3 border-b border-[#D9E3F0] last:border-b-0 min-w-0 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] flex items-center justify-center text-[#155CC4] shrink-0">
          <Icon size={18} />
        </div>
        <span className="text-sm font-semibold text-[#101B46] truncate">{name}</span>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0 sm:flex-1">
        <div className="w-24 sm:flex-1 sm:max-w-[180px] h-2 bg-[#D9E3F0] rounded-full overflow-hidden shrink-0">
          <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-xs font-semibold text-[#475875] whitespace-nowrap">
          L{currentLevel} / L{requiredLevel}
        </span>
        <div className="shrink-0">
          <StatusBadge status={status} label={statusLabel} />
        </div>
      </div>
    </div>
  );
}
