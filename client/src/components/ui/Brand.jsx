import { Link } from "react-router-dom";

export function AshokaEmblem({ className = "w-9 h-9", color = "currentColor" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ashoka Lion Capital Emblem representation */}
      <g stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Base / Abacus */}
        <rect x="12" y="38" width="24" height="4" rx="1" fill={color} fillOpacity="0.15" />
        <line x1="8" y1="42" x2="40" y2="42" strokeWidth="2" />
        
        {/* Ashoka Chakra in Center */}
        <circle cx="24" cy="34" r="4.5" strokeWidth="1.2" />
        <circle cx="24" cy="34" r="1" fill={color} />
        <path d="M24 29.5v9M19.5 34h9M20.8 30.8l6.4 6.4M20.8 37.2l6.4-6.4" strokeWidth="0.8" />
        
        {/* Lion silhouettes */}
        <path d="M19 14c-1.5-3-3-4-5-3-2 1-3 4-2 7 1 3 3 5 5 7l1 5h12l1-5c2-2 4-4 5-7 1-3 0-6-2-7-2-1-3.5 0-5 3" />
        <path d="M20 9c0-2.5 1.5-4 4-4s4 1.5 4 4c0 3-1 6-4 9-3-3-4-6-4-9z" fill={color} fillOpacity="0.15" />
        <path d="M24 13v4M22 15h4" />
        <path d="M16 20c0 2 2 4 4 4M32 20c0 2-2 4-4 4" />
        
        {/* Side animals & scroll */}
        <path d="M12 36c1-2 3-3 5-3M36 36c-1-2-3-3-5-3" />
      </g>
    </svg>
  );
}

export default function Brand({ compact = false, showTagline = false }) {
  return (
    <Link to="/" className="brand flex items-center gap-3 no-underline text-inherit" aria-label="SAMARTHYA home">
      <AshokaEmblem className="w-10 h-10 text-[#155CC4] shrink-0" color="var(--brand-primary, #155CC4)" />
      <span className="flex flex-col leading-tight">
        <strong className="text-xl font-bold tracking-tight text-[#101B46]">SAMARTHYA</strong>
        <small className="text-xs font-medium text-[#475875]">Indian Meteorological Department</small>
        {showTagline && !compact && (
          <span className="text-[11px] text-[#687181] italic mt-0.5">
            Learning Today, Stronger Forecasts Tomorrow.
          </span>
        )}
      </span>
    </Link>
  );
}
