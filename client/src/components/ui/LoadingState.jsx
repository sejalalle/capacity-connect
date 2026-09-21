export default function LoadingState({ label = "Loading your workspace…" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}
