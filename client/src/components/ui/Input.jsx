import { useId } from "react";
export default function Input({ label, error, hint, id: supplied, ...props }) {
  const generated = useId(),
    id = supplied || generated;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        {...props}
      />
      {(error || hint) && (
        <small id={`${id}-help`} className={error ? "field-error" : "muted"}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
