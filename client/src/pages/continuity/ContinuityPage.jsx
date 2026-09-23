import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
export default function ContinuityPage() {
  const { user } = useAuth(),
    toast = useToast();
  const [rows, setRows] = useState(null),
    [options, setOptions] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({ participants: [], courses: [] }),
    [entries, setEntries] = useState({}),
    [reasons, setReasons] = useState({});
  const load = useCallback(async () => {
    setError("");
    try {
      const [plans, choices] = await Promise.all([
        part3.get("/continuity"),
        user.role === "admin"
          ? part3.get("/continuity/options")
          : Promise.resolve(null),
      ]);
      setRows(plans);
      setOptions(choices);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [user.role]);
  useEffect(() => {
    load();
  }, [load]);
  async function act(path, body) {
    setBusy(true);
    try {
      await part3.post(path, body);
      toast("Knowledge-transfer record saved");
      await load();
      return true;
    } catch (e) {
      toast(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const field = (key, label, type = "text") => (
    <label>
      {label}
      <input
        required
        type={type}
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <>
      <PageHeader
        title="Knowledge Continuity"
        description="Plan knowledge transfer from recorded subject expertise. Reading, attendance and participation do not verify competency."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !rows ? (
        <LoadingState />
      ) : (
        <>
          {user.role === "admin" && options && (
            <Card title="Create a knowledge-transfer plan">
              <form
                className="auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act("/continuity", {
                      ...form,
                      dueDate: new Date(form.dueDate).toISOString(),
                      requestId: crypto.randomUUID(),
                    })
                  )
                    setForm({ participants: [], courses: [] });
                }}
              >
                {field("title", "Plan title")}
                <label>
                  Source expert and reviewed competency
                  <select
                    required
                    value={form.sourceRecord || ""}
                    onChange={(e) =>
                      setForm({ ...form, sourceRecord: e.target.value })
                    }
                  >
                    <option value="">Select a reviewed subject record</option>
                    {options.records.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.trainee?.name} · {r.competency?.name} L
                        {r.demonstratedLevel}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="role-choices">
                  <legend>Participants</legend>
                  {options.people.map((p) => (
                    <label className="checkbox-label" key={p._id}>
                      <input
                        type="checkbox"
                        checked={form.participants.includes(p._id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            participants: e.target.checked
                              ? [...form.participants, p._id]
                              : form.participants.filter((id) => id !== p._id),
                          })
                        }
                      />
                      {p.name} · {p.role}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="role-choices">
                  <legend>Related courses (optional)</legend>
                  {options.courses.map((c) => (
                    <label className="checkbox-label" key={c._id}>
                      <input
                        type="checkbox"
                        checked={form.courses.includes(c._id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            courses: e.target.checked
                              ? [...form.courses, c._id]
                              : form.courses.filter((id) => id !== c._id),
                          })
                        }
                      />
                      {c.title}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Workplace practice task
                  <textarea
                    required
                    minLength={4}
                    value={form.practiceTask || ""}
                    onChange={(e) =>
                      setForm({ ...form, practiceTask: e.target.value })
                    }
                  />
                </label>
                <label>
                  Review requirements
                  <textarea
                    required
                    minLength={4}
                    value={form.reviewRequirements || ""}
                    onChange={(e) =>
                      setForm({ ...form, reviewRequirements: e.target.value })
                    }
                  />
                </label>
                {field("dueDate", "Due date", "datetime-local")}
                <p className="muted">
                  Course links retain their existing enrollment and
                  private-resource controls. This plan does not grant access to
                  private evidence.
                </p>
                <Button
                  loading={busy}
                  disabled={!form.participants.length}
                  type="submit"
                >
                  Create plan
                </Button>
              </form>
            </Card>
          )}
          {!rows.length ? (
            <EmptyState
              title="No knowledge-transfer plans"
              description="Coordinator-created plans appear for their assigned source expert and participants."
            />
          ) : (
            rows.map((row) => (
              <Card
                key={row._id}
                title={row.title}
                subtitle={`${row.competency?.name} · proposed target L${row.targetLevel}`}
              >
                <StatusBadge status={row.status} />
                <p>
                  <strong>Source:</strong> {row.sourceExpert?.name}
                </p>
                <p>
                  <strong>Participants:</strong>{" "}
                  {row.participants.map((p) => p.name).join(", ")}
                </p>
                <p>
                  <strong>Practice:</strong> {row.practiceTask}
                </p>
                <p>
                  <strong>Review:</strong> {row.reviewRequirements}
                </p>
                <p>
                  <strong>Due:</strong>{" "}
                  {new Date(row.dueDate).toLocaleDateString()}
                </p>
                <details>
                  <summary>Participation records and history</summary>
                  <p>
                    Notes are visible to the plan’s participants, source expert
                    and coordinators. Linked evidence retains its own access
                    restrictions.
                  </p>
                  {row.participation.map((p, i) => (
                    <p key={i}>
                      {new Date(p.at).toLocaleDateString()} · {p.text}
                    </p>
                  ))}
                  {row.history.map((h, i) => (
                    <p key={`h${i}`}>
                      {h.status} · {h.reason}
                    </p>
                  ))}
                </details>
                {row.status === "ACTIVE" &&
                  row.participants.some((p) => p._id === user._id) && (
                    <form
                      className="auth-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await act(`/continuity/${row._id}/participation`, {
                            text: entries[row._id] || "",
                            requestId: crypto.randomUUID(),
                          })
                        )
                          setEntries({ ...entries, [row._id]: "" });
                      }}
                    >
                      <label>
                        Your participation note
                        <textarea
                          required
                          minLength={4}
                          maxLength={3000}
                          value={entries[row._id] || ""}
                          onChange={(e) =>
                            setEntries({
                              ...entries,
                              [row._id]: e.target.value,
                            })
                          }
                        />
                      </label>
                      <Button type="submit" loading={busy}>
                        Record participation
                      </Button>
                    </form>
                  )}
                {row.status === "ACTIVE" && user.role === "admin" && (
                  <form
                    className="auth-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(`/continuity/${row._id}/close`, {
                        status: "COMPLETED",
                        reason: reasons[row._id] || "",
                      });
                    }}
                  >
                    <label>
                      Completion reason
                      <textarea
                        required
                        minLength={4}
                        maxLength={3000}
                        value={reasons[row._id] || ""}
                        onChange={(e) =>
                          setReasons({ ...reasons, [row._id]: e.target.value })
                        }
                      />
                    </label>
                    <Button type="submit" loading={busy}>
                      Close plan as completed
                    </Button>
                  </form>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </>
  );
}
