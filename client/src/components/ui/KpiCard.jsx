export default function KpiCard({
  label,
  value,
  icon: Icon,
  note,
  tone = "blue",
}) {
  return (
    <div className="card kpi">
      <div className="flex justify-between items-center">
        <span className="muted text-sm">{label}</span>
        <span className={`icon-box ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <span className="muted text-xs">
        {note || "Synthetic Data · Demonstration"}
      </span>
    </div>
  );
}
