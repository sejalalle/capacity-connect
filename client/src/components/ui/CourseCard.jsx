import { Clock, BarChart3, User, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export function CycloneThumbnail({ className = "w-full h-32" }) {
  return (
    <div className={`bg-gradient-to-br from-[#101B46] via-[#155CC4] to-[#1E3A8A] flex items-center justify-center relative overflow-hidden rounded-lg ${className}`}>
      {/* Abstract radar / cyclone spiral */}
      <svg viewBox="0 0 100 100" className="w-20 h-20 text-white/30 animate-pulse" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="40" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="50" cy="50" r="28" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="16" strokeWidth="2" />
        <path d="M50 10 C 70 30, 70 70, 50 90 C 30 70, 30 30, 50 10" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="4" fill="#EAF3FF" />
      </svg>
      <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
        IMD Radar
      </div>
    </div>
  );
}

export default function CourseCard({
  course,
  to,
  layout = "vertical", // 'vertical' or 'horizontal'
  onAction,
  actionLabel = "View Course →",
  className = "",
}) {
  const isHorizontal = layout === "horizontal";
  const title = course?.title || "Advanced Radar Interpretation";
  const description =
    course?.description ||
    "Covers complex radar patterns, real-world meteorological cases and operational application.";
  const duration = course?.duration || "4 weeks";
  const level = course?.level || "L2 → L3";
  const trainer = course?.trainer?.name || course?.trainerName || "Dr. Sharma";
  const isRecommended = course?.recommended !== false;

  const content = (
    <div
      className={`bg-white border border-[#D9E3F0] rounded-xl p-4 transition-all hover:border-[#155CC4] hover:shadow-md flex ${
        isHorizontal ? "flex-col sm:flex-row items-start sm:items-center gap-5" : "flex-col gap-3"
      } ${className}`}
    >
      <div className={`${isHorizontal ? "w-full sm:w-44 shrink-0" : "w-full"}`}>
        <CycloneThumbnail className={`${isHorizontal ? "h-28" : "h-36"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {isRecommended && (
            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF3FF] text-[#155CC4]">
              Recommended for you
            </span>
          )}
          {course?.code && (
            <span className="text-[11px] font-mono text-[#687181]">{course.code}</span>
          )}
        </div>

        <h3 className="text-base font-bold text-[#101B46] m-0 mb-1 leading-snug truncate">
          {title}
        </h3>

        <p className="text-xs text-[#475875] m-0 mb-3 line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center gap-4 text-xs font-medium text-[#475875] flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-[#687181]" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 size={14} className="text-[#687181]" />
            <span>{level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-[#687181]" />
            <span>{trainer}</span>
          </div>
        </div>
      </div>

      <div className={`${isHorizontal ? "shrink-0 w-full sm:w-auto mt-3 sm:mt-0" : "mt-2 pt-3 border-t border-[#D9E3F0]"}`}>
        {to ? (
          <Link
            to={to}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-semibold rounded-lg no-underline transition-colors"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );

  return content;
}

