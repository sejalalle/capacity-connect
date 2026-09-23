export function ObservatoryGraphic({ className = "w-16 h-16 text-[#155CC4]" }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Dome */}
      <path d="M40 16c-12 0-22 9-22 21h44c0-12-10-21-22-21z" fill="#EAF3FF" stroke="currentColor" strokeWidth="2" />
      <path d="M40 10v6M36 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="16" x2="40" y2="37" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M32 24a10 10 0 0 1 16 0" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Telescope slit */}
      <rect x="37" y="19" width="6" height="15" rx="1" fill="#155CC4" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />

      {/* Building base */}
      <rect x="22" y="37" width="36" height="26" rx="2" fill="#FFFFFF" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="63" x2="64" y2="63" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="35" y="47" width="10" height="16" rx="1" fill="#EAF3FF" stroke="currentColor" strokeWidth="1.5" />
      <rect x="26" y="42" width="6" height="7" rx="1" fill="#EAF3FF" stroke="currentColor" strokeWidth="1.5" />
      <rect x="48" y="42" width="6" height="7" rx="1" fill="#EAF3FF" stroke="currentColor" strokeWidth="1.5" />

      {/* Weather trees & instruments */}
      <circle cx="15" cy="52" r="5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
      <line x1="15" y1="57" x2="15" y2="63" stroke="#16A34A" strokeWidth="1.5" />
      <circle cx="65" cy="52" r="5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
      <line x1="65" y1="57" x2="65" y2="63" stroke="#16A34A" strokeWidth="1.5" />
    </svg>
  );
}

export default function QuoteCallout({
  quote = "Better skills. Safer forecasts. A resilient tomorrow.",
  author = "",
  showGraphic = true,
  className = "",
}) {
  return (
    <div className={`bg-[#EFF4FC] border border-[#D9E3F0] rounded-xl p-4 flex items-center gap-4 ${className}`}>
      {showGraphic && <ObservatoryGraphic className="w-14 h-14 shrink-0 text-[#155CC4]" />}
      <div className="flex flex-col">
        <p className="text-sm italic font-medium text-[#101B46] m-0 leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
        {author && <span className="text-xs text-[#475875] mt-1 font-semibold">{author}</span>}
      </div>
    </div>
  );
}

