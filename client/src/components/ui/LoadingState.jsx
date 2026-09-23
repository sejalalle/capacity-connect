export default function LoadingState({ label = "Loading your workspace…" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <div className="skeleton-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  );
}
