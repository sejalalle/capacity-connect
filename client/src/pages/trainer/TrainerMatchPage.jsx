import { useCallback, useEffect, useState } from "react";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

export default function TrainerMatchPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setReport(await part3.get("/trainer-match"));
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
        title="Trainer Match"
        description="Your matched trainer for each enrolled session and the reasons behind the match. A coordinator makes and records the final assignment."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !report ? (
        <LoadingState />
      ) : !report.matches.length ? (
        <EmptyState
          title="No sessions to match yet"
          description="Once you are admitted to a batch with scheduled sessions, your matched trainer will appear here."
        />
      ) : (
        <>
          {report.matches.map((match) => (
            <Card
              key={match.batch._id}
              title={match.batch.name}
              subtitle="Matched trainer per session"
            >
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Trainer</th>
                      <th>Status</th>
                      <th>Why this trainer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.sessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td>{session.title}</td>
                        <td>{session.trainer?.name || "Not yet matched"}</td>
                        <td>
                          <StatusBadge status={session.status} />
                        </td>
                        <td>
                          {session.reasons.length ? (
                            <ul>
                              {session.reasons.map((reason, index) => (
                                <li key={index}>{reason}</li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          <p className="muted">{report.note}</p>
        </>
      )}
    </>
  );
}
