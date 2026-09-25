import { useCallback, useEffect, useState } from "react";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

export default function AchievementsPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setReport(await part3.get("/achievements"));
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
        title="Achievements"
        description="Learning milestones and badges earned from your stored records. These are separate from completion certificates and never substitute for a verified competency decision."
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
          {!report.items.length ? (
            <EmptyState
              title="No achievements yet"
              description="Complete learning, pass an assessment or have a competency demonstrated to earn a milestone."
            />
          ) : (
            <Card title={`${report.items.length} milestone(s)`} subtitle={report.label}>
              <div className="card-grid">
                {report.items.map((item) => (
                  <div key={item.key} className="context-note">
                    <span className={`badge ${item.tone}`}>
                      <span className="status-dot" />
                      {item.title}
                    </span>
                    <p>{item.description}</p>
                    <p className="muted">
                      {new Date(item.achievedAt).toLocaleDateString()} · v
                      {item.sourceType}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
