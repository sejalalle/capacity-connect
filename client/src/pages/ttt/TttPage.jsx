import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { part3 } from "../../services/part3Service";
import { part2 } from "../../services/part2Service";
import { userService } from "../../services/userService";
import { errorMessage } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

const items = (result) => result?.items || [];

const PRACTICE_STATES = ["ACCEPTED", "IN_PROGRESS", "TEACHING_PRACTICE"];

export default function TttPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const isTrainer = user.role === "trainer";

  const [nominations, setNominations] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [practices, setPractices] = useState({});
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [programForm, setProgramForm] = useState({
    status: "ACTIVE",
    targetLevel: 3,
    frameworkVersion: 1,
  });
  const [selectedProgram, setSelectedProgram] = useState("");
  const [rationales, setRationales] = useState({});
  const [practiceForm, setPracticeForm] = useState({});
  const [evalForm, setEvalForm] = useState({});
  const [reasons, setReasons] = useState({});
  const [tttSummaries, setTttSummaries] = useState({});
  const [loadingTttSummary, setLoadingTttSummary] = useState({});

  const fetchTttSummary = async (nominationId) => {
    setLoadingTttSummary((prev) => ({ ...prev, [nominationId]: true }));
    try {
      const res = await part3.post("/ai/summarize-ttt-candidate", {
        nominationId,
      });
      setTttSummaries((prev) => ({ ...prev, [nominationId]: res }));
    } catch (err) {
      setTttSummaries((prev) => ({
        ...prev,
        [nominationId]: { candidateBlurb: errorMessage(err) },
      }));
    } finally {
      setLoadingTttSummary((prev) => ({ ...prev, [nominationId]: false }));
    }
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const [nom, progs] = await Promise.all([
        part3.get("/ttt/candidates"),
        isAdmin || isTrainer ? part3.get("/ttt/programs") : Promise.resolve([]),
      ]);
      setNominations(nom);
      setPrograms(progs);
      if (isAdmin) {
        const [competencyResult, userResult] = await Promise.all([
          part2.get("/competencies", { limit: 50 }),
          userService.list({ role: "trainer", status: "approved", limit: 100 }),
        ]);
        setCompetencies(
          items(competencyResult).filter((c) => c.status === "PUBLISHED"),
        );
        setTrainers(userResult.users || []);
      }
      const relevant = nom.filter((n) =>
        ["TEACHING_PRACTICE", "EVALUATED"].includes(n.status),
      );
      const loaded = await Promise.all(
        relevant.map(async (n) => [
          n._id,
          await part3.get(`/ttt/nominations/${n._id}/practices`),
        ]),
      );
      setPractices(Object.fromEntries(loaded));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [isAdmin, isTrainer]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(op, message) {
    setBusy(true);
    try {
      await op();
      toast(message);
      await load();
      return true;
    } catch (e) {
      toast(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openEligibility(programId) {
    setSelectedProgram(programId);
    setEligibility(null);
    const program = programs.find((p) => p._id === programId);
    if (!program) return;
    try {
      const rows = await part3.get("/ttt/eligibility", {
        competency: program.competency?._id || program.competency,
        frameworkVersion: program.frameworkVersion,
        targetLevel: program.targetLevel,
      });
      setEligibility(rows);
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  const updateEval = (practiceId, patch) =>
    setEvalForm((prev) => ({
      ...prev,
      [practiceId]: { ...prev[practiceId], ...patch },
    }));

  return (
    <>
      <PageHeader
        title="Train the Trainer"
        description="Develop strong subject experts into verified trainers. A candidate remains a trainee/employee until a coordinator verifies their teaching capability."
      />
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !nominations ? (
        <LoadingState />
      ) : (
        <>
          {isAdmin && (
            <Card title="Create a Train-the-Trainer program">
              <form
                className="auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act(
                      () =>
                        part3.post("/ttt/programs", {
                          title: programForm.title,
                          competency: programForm.competency,
                          frameworkVersion: Number(programForm.frameworkVersion),
                          targetLevel: Number(programForm.targetLevel),
                          teachingPracticeRequirements:
                            programForm.teachingPracticeRequirements || "",
                          defaultEvaluator: programForm.defaultEvaluator || undefined,
                          status: programForm.status,
                        }),
                      "Program saved",
                    )
                  )
                    setProgramForm({
                      status: "ACTIVE",
                      targetLevel: 3,
                      frameworkVersion: 1,
                    });
                }}
              >
                <label>
                  Program title
                  <input
                    required
                    minLength={4}
                    value={programForm.title || ""}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Competency
                  <select
                    required
                    value={programForm.competency || ""}
                    onChange={(e) => {
                      const competency = competencies.find(
                        (c) => c._id === e.target.value,
                      );
                      setProgramForm({
                        ...programForm,
                        competency: e.target.value,
                        frameworkVersion: competency?.version || 1,
                      });
                    }}
                  >
                    <option value="">Select a published competency</option>
                    {competencies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Framework version
                  <input
                    required
                    type="number"
                    min="1"
                    value={programForm.frameworkVersion || 1}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        frameworkVersion: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Target teaching level
                  <select
                    required
                    value={programForm.targetLevel}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        targetLevel: e.target.value,
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        L{level}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Default evaluator (optional)
                  <select
                    value={programForm.defaultEvaluator || ""}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        defaultEvaluator: e.target.value,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {trainers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Teaching-practice requirements
                  <textarea
                    value={programForm.teachingPracticeRequirements || ""}
                    onChange={(e) =>
                      setProgramForm({
                        ...programForm,
                        teachingPracticeRequirements: e.target.value,
                      })
                    }
                  />
                </label>
                <Button loading={busy} type="submit">
                  Save program
                </Button>
              </form>
            </Card>
          )}

          {isAdmin && (
            <Card
              title="Nominate a candidate"
              subtitle="Eligibility is checked against demonstrated subject competence. Missing evidence is reported separately."
            >
              <label>
                Active program
                <select
                  value={selectedProgram}
                  onChange={(e) => openEligibility(e.target.value)}
                >
                  <option value="">Select a program</option>
                  {programs
                    .filter((p) => p.status === "ACTIVE")
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </label>
              {selectedProgram && !eligibility && (
                <p className="muted">Checking candidate eligibility…</p>
              )}
              {eligibility && !eligibility.length && (
                <p className="muted">
                  No candidate holds demonstrated subject competence for this
                  competency yet.
                </p>
              )}
              {eligibility &&
                eligibility.map((row) => (
                  <div key={row.candidate._id} className="context-note">
                    <p>
                      <strong>{row.candidate.name}</strong>{" "}
                      <StatusBadge status={row.status} />
                    </p>
                    <ul>
                      {row.checks.map((c) => (
                        <li key={c.key}>
                          {c.met ? "✓" : "✗"} {c.key.replaceAll("_", " ")}
                          {c.detail ? ` — ${c.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                    {row.status === "ELIGIBLE" && (
                      <form
                        className="auth-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const key = row.candidate._id;
                          if (
                            await act(
                              () =>
                                part3.post("/ttt/nominations", {
                                  program: selectedProgram,
                                  candidate: key,
                                  rationale: rationales[key] || "",
                                  requestId: crypto.randomUUID(),
                                }),
                              "Candidate nominated",
                            )
                          ) {
                            setRationales({ ...rationales, [key]: "" });
                            await openEligibility(selectedProgram);
                          }
                        }}
                      >
                        <label>
                          Rationale
                          <textarea
                            required
                            minLength={4}
                            maxLength={5000}
                            value={rationales[row.candidate._id] || ""}
                            onChange={(e) =>
                              setRationales({
                                ...rationales,
                                [row.candidate._id]: e.target.value,
                              })
                            }
                          />
                        </label>
                        <Button loading={busy} type="submit">
                          Nominate
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
            </Card>
          )}

          {!nominations.length ? (
            <EmptyState
              title="No Train-the-Trainer activity"
              description={
                isAdmin
                  ? "Create an active program, then nominate a subject expert."
                  : isTrainer
                    ? "Candidates in programs you evaluate will appear here."
                    : "You have no Train-the-Trainer nomination yet."
              }
            />
          ) : (
            nominations.map((nomination) => {
              const rows = practices[nomination._id] || [];
              return (
                <Card
                  key={nomination._id}
                  title={`${nomination.candidate?.name || "Candidate"} · ${nomination.program?.title || ""}`}
                  subtitle={`${nomination.competency?.name || ""} · target L${nomination.targetLevel}`}
                >
                  <StatusBadge status={nomination.status} />
                  <p>
                    <strong>Nominated by:</strong>{" "}
                    {nomination.nominatedBy?.name}
                  </p>
                  <p>
                    <strong>Rationale:</strong> {nomination.rationale}
                  </p>
                  {nomination.eligibilitySnapshot && (
                    <details>
                      <summary>Eligibility basis</summary>
                      {nomination.eligibilitySnapshot.checks?.map((c) => (
                        <p key={c.key}>
                          {c.met ? "✓" : "✗"} {c.key.replaceAll("_", " ")}
                          {c.detail ? ` — ${c.detail}` : ""}
                        </p>
                      ))}
                    </details>
                  )}

                  {(isAdmin || isTrainer) && (
                    <div style={{ margin: "0.75rem 0" }}>
                      {tttSummaries[nomination._id] ? (
                        <div
                          style={{
                            padding: "0.75rem",
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                          }}
                        >
                          <strong style={{ color: "#0f172a" }}>
                            AI Candidate Readiness Summary:
                          </strong>
                          <p style={{ margin: "0.25rem 0", color: "#334155" }}>
                            {tttSummaries[nomination._id].candidateBlurb}
                          </p>
                          {tttSummaries[nomination._id].teachingStrengths?.length >
                            0 && (
                            <ul
                              style={{
                                margin: "0.25rem 0 0.25rem 1.25rem",
                                color: "#475569",
                              }}
                            >
                              {tttSummaries[
                                nomination._id
                              ].teachingStrengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          )}
                          {tttSummaries[nomination._id].readinessSummary && (
                            <p
                              style={{
                                margin: "0.25rem 0 0 0",
                                color: "#166534",
                                fontWeight: 500,
                              }}
                            >
                              {tttSummaries[nomination._id].readinessSummary}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="button button-ghost"
                          style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                          disabled={loadingTttSummary[nomination._id]}
                          onClick={() => fetchTttSummary(nomination._id)}
                        >
                          {loadingTttSummary[nomination._id]
                            ? "Summarizing..."
                            : "✨ AI Candidate Summary"}
                        </button>
                      )}
                    </div>
                  )}

                  {!isAdmin && !isTrainer && (
                    <div className="button-row">
                      {nomination.status === "NOMINATED" && (
                        <Button
                          loading={busy}
                          onClick={() =>
                            act(
                              () =>
                                part3.post(
                                  `/ttt/nominations/${nomination._id}/transitions`,
                                  {
                                    action: "ACCEPT",
                                    reason: "Accepting the nomination",
                                    expectedRevision: nomination.revision,
                                  },
                                ),
                              "Nomination accepted",
                            )
                          }
                        >
                          Accept & enroll
                        </Button>
                      )}
                      {nomination.status === "ACCEPTED" && (
                        <Button
                          loading={busy}
                          onClick={() =>
                            act(
                              () =>
                                part3.post(
                                  `/ttt/nominations/${nomination._id}/transitions`,
                                  {
                                    action: "START",
                                    reason: "Beginning the programme",
                                    expectedRevision: nomination.revision,
                                  },
                                ),
                              "Programme started",
                            )
                          }
                        >
                          Start programme
                        </Button>
                      )}
                      {PRACTICE_STATES.includes(nomination.status) && (
                        <form
                          className="auth-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = practiceForm[nomination._id] || {};
                            if (
                              await act(
                                () =>
                                  part3.post(
                                    `/ttt/nominations/${nomination._id}/teaching-practice`,
                                    {
                                      sessionTitle: form.sessionTitle,
                                      responseText: form.responseText || "",
                                      scheduledAt: form.scheduledAt
                                        ? new Date(
                                            form.scheduledAt,
                                          ).toISOString()
                                        : undefined,
                                    },
                                  ),
                                "Teaching practice recorded",
                              )
                            )
                              setPracticeForm({
                                ...practiceForm,
                                [nomination._id]: {},
                              });
                          }}
                        >
                          <label>
                            Teaching session title
                            <input
                              required
                              minLength={4}
                              value={
                                practiceForm[nomination._id]?.sessionTitle || ""
                              }
                              onChange={(e) =>
                                setPracticeForm({
                                  ...practiceForm,
                                  [nomination._id]: {
                                    ...practiceForm[nomination._id],
                                    sessionTitle: e.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            Scheduled at (optional)
                            <input
                              type="datetime-local"
                              value={
                                practiceForm[nomination._id]?.scheduledAt || ""
                              }
                              onChange={(e) =>
                                setPracticeForm({
                                  ...practiceForm,
                                  [nomination._id]: {
                                    ...practiceForm[nomination._id],
                                    scheduledAt: e.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            Teaching practice submission
                            <textarea
                              rows={4}
                              value={
                                practiceForm[nomination._id]?.responseText || ""
                              }
                              onChange={(e) =>
                                setPracticeForm({
                                  ...practiceForm,
                                  [nomination._id]: {
                                    ...practiceForm[nomination._id],
                                    responseText: e.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                          <p className="muted">
                            Submitting records practice for evaluation. It does
                            not verify trainer capability by itself.
                          </p>
                          <Button loading={busy} type="submit">
                            Submit teaching practice
                          </Button>
                        </form>
                      )}
                    </div>
                  )}

                  {rows.length > 0 && (
                    <details open={isTrainer}>
                      <summary>Teaching practice & evaluation</summary>
                      {rows.map((practice) => (
                        <div key={practice._id} className="context-note">
                          <p>
                            <strong>Practice v{practice.version}:</strong>{" "}
                            {practice.sessionTitle}{" "}
                            <StatusBadge status={practice.status} />
                          </p>
                          {practice.responseText && (
                            <p className="muted">{practice.responseText}</p>
                          )}
                          {practice.evaluation ? (
                            <p>
                              Evaluation: {practice.evaluation.outcome} ·{" "}
                              {practice.evaluation.score} marks ·{" "}
                              {practice.evaluation.comments}
                            </p>
                          ) : isTrainer &&
                            practice.status === "SUBMITTED" &&
                            !evalForm[practice._id] && (
                              <form
                                className="auth-form"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const form = evalForm[practice._id] || {};
                                  const criterionMarks = practice.rubric.map(
                                    (c) => ({
                                      criterionId: c.criterionId,
                                      marks: Number(
                                        form.marks?.[c.criterionId] || 0,
                                      ),
                                      comment: "",
                                    }),
                                  );
                                  if (
                                    await act(
                                      () =>
                                        part3.post(
                                          `/ttt/practices/${practice._id}/evaluate`,
                                          {
                                            outcome: form.outcome,
                                            comments: form.comments || "",
                                            criterionMarks,
                                          },
                                        ),
                                      "Evaluation recorded",
                                    )
                                  )
                                    setEvalForm({
                                      ...evalForm,
                                      [practice._id]: undefined,
                                    });
                                }}
                              >
                                {practice.rubric.map((c) => (
                                  <label key={c.criterionId}>
                                    {c.label} (max {c.maxMarks})
                                    <input
                                      required
                                      type="number"
                                      min="0"
                                      max={c.maxMarks}
                                      value={
                                        evalForm[practice._id]?.marks?.[
                                          c.criterionId
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        updateEval(practice._id, {
                                          marks: {
                                            ...(evalForm[practice._id]?.marks ||
                                              {}),
                                            [c.criterionId]: e.target.value,
                                          },
                                        })
                                      }
                                    />
                                  </label>
                                ))}
                                <label>
                                  Outcome
                                  <select
                                    required
                                    value={evalForm[practice._id]?.outcome || ""}
                                    onChange={(e) =>
                                      updateEval(practice._id, {
                                        outcome: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Select outcome</option>
                                    <option value="DEMONSTRATED">
                                      Demonstrated
                                    </option>
                                    <option value="NEEDS_PRACTICE">
                                      Needs further practice
                                    </option>
                                  </select>
                                </label>
                                <label>
                                  Comments
                                  <textarea
                                    value={evalForm[practice._id]?.comments || ""}
                                    onChange={(e) =>
                                      updateEval(practice._id, {
                                        comments: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <Button loading={busy} type="submit">
                                  Record evaluation
                                </Button>
                              </form>
                            )}
                        </div>
                      ))}
                    </details>
                  )}

                  {isAdmin && (
                    <form
                      className="auth-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await act(
                            () =>
                              part3.post(
                                `/ttt/nominations/${nomination._id}/verify`,
                                {
                                  outcome: "VERIFIED",
                                  reason: reasons[nomination._id] || "",
                                  expectedRevision: nomination.revision,
                                },
                              ),
                            "Trainer verified",
                          )
                        )
                          setReasons({ ...reasons, [nomination._id]: "" });
                      }}
                    >
                      <label>
                        Verification reason
                        <textarea
                          required
                          minLength={4}
                          maxLength={3000}
                          value={reasons[nomination._id] || ""}
                          onChange={(e) =>
                            setReasons({
                              ...reasons,
                              [nomination._id]: e.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="button-row">
                        <Button
                          loading={busy}
                          type="submit"
                          disabled={nomination.status !== "EVALUATED"}
                        >
                          Verify as trainer
                        </Button>
                        <Button
                          variant="secondary"
                          loading={busy}
                          onClick={() =>
                            act(
                              () =>
                                part3.post(
                                  `/ttt/nominations/${nomination._id}/verify`,
                                  {
                                    outcome: "RETURNED",
                                    reason:
                                      reasons[nomination._id] ||
                                      "Returned for further development",
                                    expectedRevision: nomination.revision,
                                  },
                                ),
                              "Returned for further development",
                            )
                          }
                        >
                          Return for development
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}
    </>
  );
}
