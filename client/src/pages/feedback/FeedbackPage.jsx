import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

export default function FeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(""),
    [rating, setRating] = useState(""),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      setData(
        await part3.get(
          user.role === "trainee" ? "/feedback/opportunities" : "/feedback",
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [user.role]);
  useEffect(() => {
    load();
  }, [load]);
  const opportunities = (data?.items || []).filter(
    (x) =>
      !data.submitted.some(
        (r) =>
          r.enrollment === x.enrollment &&
          r.targetType === x.targetType &&
          r.target === x.target,
      ),
  );
  async function submit(e) {
    e.preventDefault();
    const item = opportunities.find(
      (x) => `${x.enrollment}:${x.targetType}:${x.target}` === selected,
    );
    if (!item || !rating) return;
    setBusy(true);
    try {
      await part3.post("/feedback", {
        enrollment: item.enrollment,
        target: item.target,
        targetType: item.targetType,
        rating: Number(rating),
        comment,
      });
      toast("Feedback submitted");
      setSelected("");
      setRating("");
      setComment("");
      await load();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Training Feedback"
        description="Share your training experience. Feedback does not verify competency or determine trainer suitability."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error} <Button onClick={load}>Retry</Button>
        </div>
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          <p className="muted">{data.privacy}</p>
          {user.role === "trainee" ? (
            <>
              <Card title="Share feedback">
                {opportunities.length ? (
                  <form onSubmit={submit} className="auth-form">
                    <label>
                      Feedback opportunity
                      <select
                        required
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        <option value="">Select a training activity</option>
                        {opportunities.map((x) => {
                          const key = `${x.enrollment}:${x.targetType}:${x.target}`;
                          return (
                            <option key={key} value={key}>
                              {x.batchName} · {x.targetType.toLowerCase()} ·{" "}
                              {x.title}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <div>
                      <label htmlFor="feedback-rating">Rating</label>
                      <select
                        id="feedback-rating"
                        required
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                      >
                        <option value="">Choose a rating</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </div>
                    <label>
                      Comments (optional)
                      <textarea
                        maxLength={3000}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </label>
                    <Button
                      type="submit"
                      loading={busy}
                      disabled={!selected || !rating}
                    >
                      Submit feedback
                    </Button>
                  </form>
                ) : (
                  <EmptyState
                    title="No pending feedback opportunities"
                    description="Feedback becomes available for confirmed training enrollments. Each opportunity accepts one response."
                  />
                )}
              </Card>
              <Card title="Your submitted feedback">
                {data.submitted.length ? (
                  data.submitted.map((x) => (
                    <article key={x._id} className="activity-item">
                      <strong>
                        {x.targetType} · {x.rating} / 5
                      </strong>
                      <p>{x.comment || "No comment added"}</p>
                      <small>
                        {new Date(x.createdAt).toLocaleDateString()}
                      </small>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="No feedback submitted"
                    description="Your saved responses will appear here."
                  />
                )}
              </Card>
            </>
          ) : (
            <Card title="Response summary">
              {data.aggregates.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Target</th>
                        <th>Responses</th>
                        <th>Average rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.aggregates.map((x, i) => (
                        <tr key={i}>
                          <td>{x.targetType}</td>
                          <td>{x.count}</td>
                          <td>{x.average.toFixed(1)} / 5</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No feedback in your scope"
                  description="Participant responses will appear for authorized training activities."
                />
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
