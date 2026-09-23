import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="SAMARTHYA home">
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 3 37 20 20 37 3 20Z"
          stroke="var(--brand-primary)"
          strokeWidth="1.75"
        />
        <path d="m20 10 9 19-9-5-9 5Z" fill="var(--brand-primary)" />
        <circle cx="20" cy="20" r="3.2" fill="#FFFFFF" />
      </svg>
      <span>
        <strong>SAMARTHYA</strong>
        {!compact && (
          <small>Digital Capacity Building & Learning Platform</small>
        )}
      </span>
    </Link>
  );
}
