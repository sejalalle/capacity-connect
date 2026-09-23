import { useEffect, useState } from "react";
import { part3 } from "../../services/part3Service";
import { part2 } from "../../services/part2Service";
import { errorMessage } from "../../services/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
export default function CapacityPage() {
  const [batches, setBatches] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [data, setData] = useState(null);
  const [form, setForm] = useState({
    batch: "",
    traineeCount: 30,
    batchSize: 30,
    trainersPerSession: 1,
    start: "",
    end: "",
  });
  async function load() {
    setError("");
    try {
      const r = await part2.get("/batches", { limit: 100 });
      setBatches(r.items || []);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function calculate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setData(
        await part3.post("/capacity", {
          ...form,
          traineeCount: Number(form.traineeCount),
          batchSize: Number(form.batchSize),
          trainersPerSession: Number(form.trainersPerSession),
          start: new Date(form.start).toISOString(),
          end: new Date(form.end).toISOString(),
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (key, label, type = "number") => (
    <label>
      {label}
      <input
        required
        type={type}
        min={type === "number" ? 1 : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <>
      <PageHeader
        title="Trainer Capacity Planning"
        description="Compare stated teaching demand with recorded availability. Estimates do not appoint trainers or guarantee a feasible schedule."
      />
      {error && (
        <div className="error-banner" role="alert">
          {error}
          {!batches && <Button onClick={load}>Retry</Button>}
        </div>
      )}
      {!batches && !error ? (
        <LoadingState />
      ) : batches?.length ? (
        <Card title="Planning inputs">
          <form onSubmit={calculate} className="auth-form">
            <label>
              Batch/session template
              <select
                required
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
              >
                <option value="">Select a batch</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              {field("traineeCount", "Planned trainee count")}
              {field("batchSize", "Trainees per batch")}
              {field("trainersPerSession", "Trainers per session")}
              {field("start", "Planning start", "datetime-local")}
              {field("end", "Planning end", "datetime-local")}
            </div>
            <Button type="submit" loading={busy}>
              Calculate planning estimate
            </Button>
          </form>
        </Card>
      ) : (
        <EmptyState
          title="No batch templates available"
          description="Configure a batch with dated sessions and requirements before estimating teaching capacity."
        />
      )}
      {data && (
        <>
          <Card title="Demand and recorded capacity">
            <p>{data.definition}</p>
            <dl className="form-grid">
              <div>
                <dt>Recorded current demand</dt><dd>{data.recordedDemandPeople} people</dd>
                  <dt>Required batches</dt>
                <dd>{data.batchesRequired}</dd>
              </div>
              <div>
                <dt>Required teaching hours</dt>
                <dd>{data.requiredTeachingHours.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Unallocated recorded hours</dt>
                <dd>{data.unallocatedTeachingHours.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Hour-based batch estimate</dt>
                <dd>{data.estimatedHourCapacity ?? "Not calculable"}</dd>
              </div>
            </dl>
            <p>
              <strong>Next action:</strong> {data.recommendedAction}
            </p>
            <ul>
              {data.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <small>
              Calculated {new Date(data.calculatedAt).toLocaleString()}
            </small>
          </Card>
          <Card title="Available trainer workload">
            {data.trainers.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>Available hours</th>
                      <th>Assigned hours</th>
                      <th>Unallocated hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trainers.map((t) => (
                      <tr key={t.trainer}>
                        <td>{t.name}</td>
                        <td>{t.recordedAvailableHours.toFixed(1)}</td>
                        <td>{t.assignedHours.toFixed(1)}</td>
                        <td>{t.unallocatedHours.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No eligible available trainer recorded"
                description="Review the session checks below. Missing information is not treated as confirmed availability."
              />
            )}
          </Card>
          <Card title="Session eligibility">
            {data.sessions.map((s) => (
              <details key={s.session}>
                <summary>
                  {s.title} ·{" "}
                  {s.suitability.filter((t) => t.status === "ELIGIBLE").length}{" "}
                  eligible trainers
                </summary>
                {s.suitability.map((t) => (
                  <article className="activity-item" key={t.trainer._id}>
                    <strong>
                      {t.trainer.name} · {t.status.replaceAll("_", " ")}
                    </strong>
                    <p>{t.explanation}</p>
                  </article>
                ))}
              </details>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
