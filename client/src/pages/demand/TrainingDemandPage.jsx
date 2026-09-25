import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

export default function TrainingDemandPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setReport(await part3.get("/training-demand"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Training Demand"
        description="How many people need development in each competency, and whether recorded trainer supply covers that demand. Derived from stored reviewed evidence, not a forecast."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !report ? (
        <LoadingState />
      ) : (
        <>
          <Card
            title="Demand summary"
            subtitle={report.definition}
            action={
              <Link className="button button-secondary" to="/admin/trainer-capacity">
                Open Trainer Capacity
              </Link>
            }
          >
            <div className="kpi-grid">
              <div className="kpi">
                <span>Competencies with demand</span>
                <strong>{report.summary.competenciesWithDemand}</strong>
              </div>
              <div className="kpi">
                <span>People needing development</span>
                <strong>{report.summary.totalPeopleNeedingDevelopment}</strong>
              </div>
              <div className="kpi">
                <span>Trainer capacity gaps</span>
                <strong>
                  {report.summary.competenciesWithTrainerCapacityGap}
                </strong>
              </div>
              <div className="kpi">
                <span>TTT in progress</span>
                <strong>{report.summary.tttInProgress}</strong>
              </div>
            </div>
          </Card>

          {!report.rows.length ? (
            <EmptyState
              title="No open training demand"
              description="Either recorded coverage meets every configured requirement, or no job-role requirements are configured yet."
            />
          ) : (
            <Card
              title="Demand by competency"
              subtitle={report.chain}
              action={
                <Link className="button button-secondary" to="/admin/train-the-trainer">
                  Train the Trainer
                </Link>
              }
            >
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Competency</th>
                      <th>Role</th>
                      <th>Required</th>
                      <th>Verified</th>
                      <th>Gap</th>
                      <th>Pending needs</th>
                      <th>Trainers (eligible / available)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={`${row.competency?._id}-${row.requiredLevel}`}>
                        <td>{row.competency?.name}</td>
                        <td>{row.jobRole?.title || "—"}</td>
                        <td>
                          L{row.requiredLevel} · {row.requiredHeadcount}
                        </td>
                        <td>{row.verifiedHeadcount}</td>
                        <td>
                          <strong>{row.gapHeadcount}</strong>
                        </td>
                        <td>{row.pendingNeeds}</td>
                        <td>
                          {row.eligibleTrainers} /{" "}
                          {row.availableTrainers ?? "—"}
                          {row.trainerCapacityGap && (
                            <span className="badge red"> capacity gap</span>
                          )}
                        </td>
                        <td>{row.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">{report.label}</p>
            </Card>
          )}
        </>
      )}
    </>
  );
}
