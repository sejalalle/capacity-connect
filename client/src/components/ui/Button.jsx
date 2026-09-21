export default function Button({
  variant = "primary",
  loading,
  disabled,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <span className="spinner small" aria-hidden="true" />}
      {loading ? "Please wait…" : children}
    </button>
  );
}
