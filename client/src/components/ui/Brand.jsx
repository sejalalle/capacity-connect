import { Link } from "react-router-dom";

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="SAMARTHYA home">
      <svg
        width="36"
        height="36"
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 3 37 20 20 37 3 20Z"
          stroke="currentColor"
          strokeWidth="1.4"
          stroke="#532D4F"
          strokeWidth="1.75"
        />
        <path d="m20 10 9 19-9-5-9 5Z" fill="currentColor" />
        <circle cx="20" cy="20" r="3" fill="#0E7C7B" />
        <path d="m20 10 9 19-9-5-9 5Z" fill="#532D4F" />
        <circle cx="20" cy="20" r="3.2" fill="#A65F3D" />
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
