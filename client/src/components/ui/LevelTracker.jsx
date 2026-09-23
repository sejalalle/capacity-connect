import { Check } from "lucide-react";

export default function LevelTracker({
  currentLevel = 1,
  levels = [
    { level: 1, label: "L1", title: "Basic Concepts" },
    { level: 2, label: "L2", title: "Pattern Interpretation" },
    { level: 3, label: "L3", title: "Complex Analysis" },
  ],
  className = "",
}) {
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-[#D9E3F0] -z-0">
          <div
            className="h-full bg-[#155CC4] transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, ((currentLevel - 1) / (levels.length - 1)) * 100))}%`,
            }}
          />
        </div>

        {levels.map((item, idx) => {
          const isCompleted = item.level < currentLevel;
          const isCurrent = item.level === currentLevel;
          const isFuture = item.level > currentLevel;

          return (
            <div key={item.level || idx} className="flex flex-col items-center relative z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                  isCompleted
                    ? "bg-[#16A34A] text-white border-2 border-[#16A34A]"
                    : isCurrent
                      ? "bg-[#155CC4] text-white border-2 border-[#155CC4] ring-4 ring-[#EAF3FF]"
                      : "bg-white text-[#6B7280] border-2 border-[#D9E3F0]"
                }`}
              >
                {isCompleted ? <Check size={16} strokeWidth={2.5} /> : item.label || `L${item.level}`}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-xs font-semibold ${isCurrent ? "text-[#155CC4]" : "text-[#101B46]"}`}>
                  {item.label || `L${item.level}`}
                </div>
                {item.title && (
                  <div className="text-[11px] text-[#687181] font-medium whitespace-nowrap max-w-[120px] truncate">
                    {item.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

