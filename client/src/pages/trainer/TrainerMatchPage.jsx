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
  const [justifications, setJustifications] = useState({});
  const [loadingAi, setLoadingAi] = useState({});

  const load = useCallback(async () => {
    setError("");
    try {
      setReport(await part3.get("/trainer-match"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  const fetchAiJustification = async (batchId, sessionId) => {
    setLoadingAi((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const res = await part3.post("/ai/explain-trainer-match", {
        batchId,
        sessionId,
      });
      setJustifications((prev) => ({
        ...prev,
        [sessionId]: res.justification,
      }));
    } catch (e) {
      setJustifications((prev) => ({
        ...prev,
        [sessionId]: errorMessage(e),
      }));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

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
      ) : !report.matches.length && !report.gapMatches.length ? (
        <EmptyState
          title="No sessions to match yet"
          description="Once you are admitted to a batch with scheduled sessions, or your role has a competency gap, your matched trainer will appear here."
        />
      ) : (
        <>
          {report.gapMatches.map((match) => (
            <Card
              key={match.competency._id}
              title={match.competency.name}
              subtitle={`Trainers for the competency your role requires at L${match.requiredLevel}`}
            >
              <p className="muted">
                {match.demonstratedLevel == null
                  ? "No reviewed level is established yet."
                  : `Your reviewed level is L${match.demonstratedLevel}.`}{" "}
                {match.gap == null
                  ? ""
                  : `Development is required for ${match.gap} level${match.gap === 1 ? "" : "s"}.`}
              </p>
              {match.trainers.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trainer</th>
                        <th>Reviewed level</th>
                        <th>Availability</th>
                        <th>Why this trainer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.trainers.map((row) => (
                        <tr key={row.trainer._id}>
                          <td>{row.trainer.name}</td>
                          <td>L{row.reviewedLevel}</td>
                          <td>
                            <StatusBadge status={row.availability} />
                          </td>
                          <td>{row.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">
                  No trainer currently holds reviewed expertise at the required
                  level. A coordinator can nominate a subject expert for
                  Train-the-Trainer.
                </p>
              )}
            </Card>
          ))}
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
                            <>
                              <ul>
                                {session.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                              {justifications[session.sessionId] ? (
                                <div
                                  style={{
                                    marginTop: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    color: "#166534",
                                  }}
                                >
                                  <strong>AI Summary: </strong>
                                  {justifications[session.sessionId]}
                                </div>
                              ) : (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <button
                                    type="button"
                                    className="button button-ghost"
                                    style={{
                                      fontSize: "0.8rem",
                                      padding: "2px 8px",
                                    }}
                                    disabled={loadingAi[session.sessionId]}
                                    onClick={() =>
                                      fetchAiJustification(
                                        match.batch._id,
                                        session.sessionId,
                                      )
                                    }
                                  >
                                    {loadingAi[session.sessionId]
                                      ? "Generating..."
                                      : "✨ AI Justification"}
                                  </button>
                                </div>
                              )}
                            </>
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
