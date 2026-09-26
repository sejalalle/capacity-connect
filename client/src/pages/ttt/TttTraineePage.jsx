import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Info,
  ListChecks,
  Target,
  Upload,
} from "lucide-react";
import useTttNomination from "../../hooks/useTttNomination";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import Table from "../../components/ui/Table";

const TITLES = {
  "ttt-dashboard": [
    "TTT Dashboard",
    "Your Train-the-Trainer journey at a glance.",
  ],
  "ttt-program": [
    "Train-the-Trainer Program",
    "Your nomination and what the programme covers.",
  ],
  "ttt-modules": [
    "TTT Learning Modules",
    "Complete every programme module to unlock teaching practice.",
  ],
  "ttt-practice": [
    "Teaching Practice",
    "Your practice sessions and how they are assessed.",
  ],
  "ttt-submissions": [
    "Teaching Practice Submission",
    "Submit each session plan and reflection for evaluation.",
  ],
  "ttt-progress": [
    "Progress & Evaluation",
    "Evaluation results and programme completion status.",
  ],
};

const PRACTICE_STATES = ["ACCEPTED", "IN_PROGRESS", "TEACHING_PRACTICE"];

const TRANSITION_MESSAGES = {
  ACCEPT: "Nomination accepted",
  START: "Programme started",
  WITHDRAW: "Nomination withdrawn",
};

const fmt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div
      className="ttt-progress"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${safe}%` }} />
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="ttt-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          className={`ttt-tab ${active === tab ? "active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function Specs({ rows }) {
  return (
    <dl className="ttt-specs">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// Components that are designed and placed, but whose data the candidate API
// does not expose yet. Stated plainly rather than rendered as fake content.
function Pending({ children }) {
  return (
    <p className="ttt-notice">
      <Info size={15} />
      <span>{children}</span>
    </p>
  );
}

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="ttt-tile">
      <span className="ttt-tile-icon">
        <Icon size={17} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function TttTraineePage() {
  const { pathname } = useLocation();
  const segment = pathname.split("/")[2] || "ttt-dashboard";
  const toast = useToast();
  const {
    nomination,
    hasAccess,
    loading: nominationLoading,
    reload: reloadNomination,
  } = useTttNomination();

  const [learning, setLearning] = useState(null);
  const [practices, setPractices] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState(null);
  const [draft, setDraft] = useState({
    sessionTitle: "",
    scheduledAt: "",
    responseText: "",
  });

  const nominationId = nomination?._id;

  useEffect(() => {
    setTab(null);
    setDraft({ sessionTitle: "", scheduledAt: "", responseText: "" });
  }, [segment, nominationId]);

  const reload = useCallback(() => {
    setRevision((value) => value + 1);
    reloadNomination();
  }, [reloadNomination]);

  useEffect(() => {
    if (!nominationId) {
      setLearning(null);
      setPractices(null);
      return;
    }
    let active = true;
    setError("");
    Promise.all([
      part3.get(`/ttt/nominations/${nominationId}/learning`),
      part3.get(`/ttt/nominations/${nominationId}/practices`),
    ])
      .then(([learningRow, practiceRows]) => {
        if (!active) return;
        setLearning(learningRow);
        setPractices(Array.isArray(practiceRows) ? practiceRows : []);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [nominationId, revision]);

  async function act(operation, message) {
    setBusy(true);
    try {
      await operation();
      toast(message);
      reload();
      return true;
    } catch (e) {
      toast(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const title = TITLES[segment] || TITLES["ttt-dashboard"];

  if (nominationLoading) return <LoadingState label="Loading your programme…" />;

  if (!nomination || !hasAccess)
    return (
      <>
        <PageHeader
          title="Train-the-Trainer"
          description="This workspace opens when a coordinator nominates you for the Train-the-Trainer programme."
        />
        <EmptyState
          title="No Train-the-Trainer nomination"
          description="A coordinator or trainer nominates strong subject experts. Once you are nominated, this portal unlocks with your programme, learning modules, teaching practice and evaluation."
          action={
            <Link className="button button-secondary" to="/trainee">
              Back to dashboard
            </Link>
          }
        />
      </>
    );

  const items = learning?.items || [];
  const total = learning?.total || 0;
  const completed = learning?.completed || 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const gate = learning?.gate || "NO_LEARNING_REQUIRED";
  const learningDone = gate !== "TTT_LEARNING_REQUIRED";
  const practiceRows = practices || [];
  const evaluated = practiceRows.find((row) => row.evaluation) || null;
  const programComplete = learningDone && Boolean(evaluated);
  const maxScore = evaluated
    ? (evaluated.rubric || []).reduce(
        (sum, criterion) => sum + (criterion.maxMarks || 0),
        0,
      )
    : 0;

  const runTransition = (action, reason) =>
    act(
      () =>
        part3.post(`/ttt/nominations/${nominationId}/transitions`, {
          action,
          reason,
          expectedRevision: nomination.revision,
        }),
      TRANSITION_MESSAGES[action] || "Nomination updated",
    );

  const practiceList = (
    <div className="ttt-sessions">
      {practiceRows.length ? (
        practiceRows.map((practice) => (
          <article key={practice._id} className="ttt-session">
            <div className="ttt-session-head">
              <div>
                <strong>{practice.sessionTitle}</strong>
                <small>
                  <CalendarDays size={13} />
                  {fmtDateTime(practice.scheduledAt)}
                </small>
              </div>
              <StatusBadge status={practice.status} />
            </div>
            <dl className="ttt-specs compact">
              <div>
                <dt>Version</dt>
                <dd>{practice.version}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{fmtDateTime(practice.submittedAt)}</dd>
              </div>
              <div>
                <dt>Evaluation</dt>
                <dd>
                  {practice.evaluation
                    ? `${practice.evaluation.score}/${(practice.rubric || []).reduce((sum, c) => sum + (c.maxMarks || 0), 0)}`
                    : "Pending evaluation"}
                </dd>
              </div>
            </dl>
          </article>
        ))
      ) : (
        <EmptyState
          title="No practice session yet"
          description="Your teaching practice sessions appear here once you schedule or submit one."
        />
      )}
    </div>
  );

  const moduleRows = (
    <div className="ttt-modules">
      {items.length ? (
        items.map((item) => (
          <article key={item.course._id} className="ttt-module">
            <div className="ttt-module-head">
              <div>
                <strong>{item.course.title}</strong>
                <small>
                  {item.course.code || "Programme module"}
                  {item.completedAt ? ` · completed ${fmt(item.completedAt)}` : ""}
                </small>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <ProgressBar value={item.progressPercent} />
            <div className="ttt-module-foot">
              <span className="muted text-xs">
                {item.progressPercent}% complete
              </span>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={busy || item.progressPercent === 50}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(
                          `/ttt/nominations/${nominationId}/learning`,
                          { course: item.course._id, progressPercent: 50 },
                        ),
                      "Learning progress recorded",
                    )
                  }
                >
                  In progress
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={busy || item.status === "COMPLETED"}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(
                          `/ttt/nominations/${nominationId}/learning`,
                          { course: item.course._id, progressPercent: 100 },
                        ),
                      "Module completed",
                    )
                  }
                >
                  Mark complete
                </button>
              </div>
            </div>
          </article>
        ))
      ) : (
        <EmptyState
          title="No learning modules configured"
          description="This programme does not list learning modules, so teaching practice is open once your nomination is accepted."
        />
      )}
    </div>
  );

  const evaluationView = evaluated ? (
    <>
      <Card
        title={`Teaching practice evaluation · ${evaluated.sessionTitle}`}
        subtitle={`Evaluated by ${evaluated.evaluation.evaluator?.name || "an assigned evaluator"}${
          evaluated.evaluation.evaluator?.role
            ? ` (${evaluated.evaluation.evaluator.role})`
            : ""
        } on ${fmtDateTime(evaluated.evaluation.evaluatedAt)}`}
        action={<StatusBadge status={evaluated.evaluation.outcome} />}
      >
        <Table
          caption="Teaching practice rubric scores"
          rowKey="criterionId"
          columns={[
            { key: "criterion", label: "Criterion" },
            { key: "max", label: "Maximum" },
            { key: "marks", label: "Marks" },
            { key: "comment", label: "Comment" },
          ]}
          rows={(evaluated.rubric || []).map((criterion) => {
            const mark = (evaluated.evaluation.criterionMarks || []).find(
              (item) => item.criterionId === criterion.criterionId,
            );
            return {
              criterionId: criterion.criterionId,
              criterion: criterion.label || criterion.criterionId,
              max: criterion.maxMarks,
              marks: mark ? mark.marks : "—",
              comment: mark?.comment || "—",
            };
          })}
        />
        <div className="ttt-score">
          <div>
            <strong>
              {evaluated.evaluation.score}
              <span> / {maxScore}</span>
            </strong>
            <small>Overall score</small>
          </div>
          <p>{evaluated.evaluation.comments || "No evaluator comments recorded."}</p>
        </div>
      </Card>
    </>
  ) : (
    <EmptyState
      title="No evaluation yet"
      description="Submit a teaching practice session. An assigned evaluator records rubric scores and comments, and the result appears here."
      action={
        learningDone ? (
          <Link className="button button-primary" to="/trainee/ttt-submissions">
            Submit teaching practice
          </Link>
        ) : null
      }
    />
  );

  const completionView = (
    <>
      {programComplete && (
        <div className="ttt-banner">
          <CheckCircle2 size={22} />
          <div>
            <strong>TTT Programme requirements complete</strong>
            <p>
              {nomination.status === "VERIFIED"
                ? "A coordinator has verified your teaching capability and you are in the verified trainer pool."
                : "Your results have been forwarded for coordinator verification. Verified expertise is created only by that decision."}
            </p>
          </div>
        </div>
      )}
      <Card title="Programme completion">
        <ul className="ttt-checks">
          <li className={learningDone ? "done" : ""}>
            <CheckCircle2 size={16} />
            <span>
              <strong>Learning modules</strong>
              <small>
                {total
                  ? `${completed} of ${total} complete (${percent}%)`
                  : "No programme modules required"}
              </small>
            </span>
          </li>
          <li className={practiceRows.length ? "done" : ""}>
            <CheckCircle2 size={16} />
            <span>
              <strong>Teaching practice sessions</strong>
              <small>
                {practiceRows.length
                  ? `${practiceRows.length} recorded`
                  : "Not started"}
              </small>
            </span>
          </li>
          <li className={evaluated ? "done" : ""}>
            <CheckCircle2 size={16} />
            <span>
              <strong>Evaluation</strong>
              <small>
                {evaluated
                  ? `${evaluated.evaluation.outcome.replaceAll("_", " ")} · ${evaluated.evaluation.score} marks`
                  : "Pending evaluation"}
              </small>
            </span>
          </li>
          <li className={nomination.status === "VERIFIED" ? "done" : ""}>
            <Clock3 size={16} />
            <span>
              <strong>Final status</strong>
              <small>
                {nomination.status === "VERIFIED"
                  ? "Verified trainer"
                  : "Pending coordinator verification"}
              </small>
            </span>
          </li>
        </ul>
      </Card>
      <Card title="Nomination history">
        <ul className="ttt-timeline">
          {(nomination.history || []).map((entry, index) => (
            <li key={`${entry.status}-${index}`}>
              <StatusBadge status={entry.status} />
              <span>
                <strong>{fmtDateTime(entry.at)}</strong>
                <small>{entry.reason || "No reason recorded"}</small>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="TRAIN-THE-TRAINER"
        title={title[0]}
        description={title[1]}
        action={<StatusBadge status={nomination.status} />}
      />

      {error && (
        <div className="error-banner" role="alert">
          {error}
          <Button onClick={reload}>Retry</Button>
        </div>
      )}

      {segment === "ttt-dashboard" && (
        <>
          <div className="ttt-callout">
            <div className="ttt-callout-main">
              <StatusBadge status={nomination.status} />
              <h2>Train-the-Trainer Programme</h2>
              <p>
                You have been nominated by{" "}
                <strong>{nomination.nominatedBy?.name || "a coordinator"}</strong>{" "}
                for {nomination.competency?.name || "your subject"} at target level
                L{nomination.targetLevel}.
              </p>
            </div>
            <div className="ttt-callout-actions">
              <Link className="button button-primary" to="/trainee/ttt-program">
                View programme <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="ttt-tiles">
            <Tile
              icon={BookOpenCheck}
              label="Learning complete"
              value={total ? `${percent}%` : "Not required"}
            />
            <Tile
              icon={ClipboardCheck}
              label="Practice sessions"
              value={practiceRows.length}
            />
            <Tile
              icon={Target}
              label="Evaluation score"
              value={
                evaluated
                  ? `${evaluated.evaluation.score}/${maxScore}`
                  : "Pending"
              }
            />
            <Tile
              icon={ListChecks}
              label="Final status"
              value={
                nomination.status === "VERIFIED"
                  ? "Verified"
                  : "Awaiting verification"
              }
            />
          </div>

          <Card title="Your next step">
            {nomination.status === "NOMINATED" ? (
              <p>
                Review the nomination and accept it to enrol.{" "}
                <Link to="/trainee/ttt-program">Open the nomination →</Link>
              </p>
            ) : nomination.status === "ACCEPTED" ? (
              <p>
                Start the programme to open your learning modules.{" "}
                <Link to="/trainee/ttt-program">Start the programme →</Link>
              </p>
            ) : !learningDone ? (
              <p>
                Complete the remaining learning modules to unlock teaching
                practice.{" "}
                <Link to="/trainee/ttt-modules">Open learning modules →</Link>
              </p>
            ) : !practiceRows.length ? (
              <p>
                Submit your teaching practice session.{" "}
                <Link to="/trainee/ttt-submissions">Prepare a submission →</Link>
              </p>
            ) : !evaluated ? (
              <p>
                Your submission is with an evaluator. The rubric result appears
                under progress and evaluation.
              </p>
            ) : (
              <p>
                All requirements are recorded. A coordinator makes the final
                verification decision.
              </p>
            )}
          </Card>

          {completionView}
        </>
      )}

      {segment === "ttt-program" && (
        <>
          <Card
            title="Nomination details"
            subtitle="Based on your demonstrated subject competence."
          >
            <Specs
              rows={[
                ["Nominated by", nomination.nominatedBy?.name || "—"],
                ["Nominator role", nomination.nominatedBy?.role || "—"],
                ["Nominated on", fmt(nomination.createdAt)],
                ["Relevant competency", nomination.competency?.name || "—"],
                ["Target level", `L${nomination.targetLevel}`],
                ["Framework version", nomination.frameworkVersion ?? "—"],
                ["Current role", nomination.candidate?.role || "trainee"],
              ]}
            />
            <p className="context-note">
              <strong>Reason:</strong> {nomination.rationale}
            </p>
            <div className="button-row">
              {nomination.status === "NOMINATED" && (
                <Button
                  loading={busy}
                  onClick={() =>
                    runTransition("ACCEPT", "Accepting the nomination")
                  }
                >
                  Accept &amp; enroll
                </Button>
              )}
              {nomination.status === "ACCEPTED" && (
                <Button
                  loading={busy}
                  onClick={() =>
                    runTransition("START", "Beginning the programme")
                  }
                >
                  Start programme
                </Button>
              )}
              {["NOMINATED", "ACCEPTED", "IN_PROGRESS"].includes(
                nomination.status,
              ) && (
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    runTransition("WITHDRAW", "Withdrawing from the programme")
                  }
                >
                  Decline
                </Button>
              )}
            </div>
            <p className="context-note">
              Accepting records your enrolment. It does not create verified
              expertise — only coordinator verification after evaluation does.
            </p>
          </Card>

          <Tabs
            tabs={["Overview", "Modules", "Schedule", "Requirements"]}
            active={tab || "Overview"}
            onChange={setTab}
          />

          {(tab || "Overview") === "Overview" && (
            <Card
              title="Programme overview"
              subtitle="Develop teaching, communication and training-delivery skills for subject experts."
            >
              <Specs
                rows={[
                  ["Programme", learning?.program?.title || "—"],
                  ["Competency area", nomination.competency?.name || "—"],
                  ["Target level", `L${nomination.targetLevel}`],
                  ["Learning modules", total ? `${total} modules` : "None listed"],
                  ["Programme status", nomination.program?.status || "—"],
                ]}
              />
              <Pending>
                Duration, delivery mode and start/end dates are not configured
                for this programme yet.
              </Pending>
              {items.length > 0 && (
                <>
                  <h3 className="ttt-subheading">Learning modules preview</h3>
                  <ol className="ttt-preview">
                    {items.map((item) => (
                      <li key={item.course._id}>
                        <span>{item.course.title}</span>
                        <StatusBadge status={item.status} />
                      </li>
                    ))}
                  </ol>
                  <Link to="/trainee/ttt-modules">
                    Open learning modules <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </Card>
          )}

          {(tab || "Overview") === "Modules" && (
            <Card title="Programme modules">
              {moduleRows}
              <Link to="/trainee/ttt-modules">
                Track progress and record completion{" "}
                <ArrowRight size={14} />
              </Link>
            </Card>
          )}

          {(tab || "Overview") === "Schedule" && (
            <Card title="Practice schedule">{practiceList}</Card>
          )}

          {(tab || "Overview") === "Requirements" && (
            <Card title="Programme requirements">
              <ul className="ttt-checks">
                <li className={learningDone ? "done" : ""}>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Complete every learning module</strong>
                    <small>
                      {total
                        ? `${completed} of ${total} complete`
                        : "No modules required"}
                    </small>
                  </span>
                </li>
                <li className={practiceRows.length ? "done" : ""}>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Deliver an observed teaching practice session</strong>
                    <small>
                      Submit a session plan and reflection for evaluation
                    </small>
                  </span>
                </li>
                <li className={evaluated ? "done" : ""}>
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>Pass the teaching practice evaluation</strong>
                    <small>
                      An assigned evaluator scores the practice against the
                      rubric
                    </small>
                  </span>
                </li>
              </ul>
              <Pending>
                The programme's written teaching-practice requirements are not
                exposed to the candidate API yet.
              </Pending>
            </Card>
          )}
        </>
      )}

      {segment === "ttt-modules" && (
        <>
          <Card
            title="Learning progress"
            action={<StatusBadge status={learningDone ? "COMPLETED" : "IN_PROGRESS"} />}
          >
            <div className="ttt-progress-head">
              <strong>{percent}% complete</strong>
              <span className="muted text-xs">
                {total ? `${completed} of ${total} modules` : "No modules listed"}
              </span>
            </div>
            <ProgressBar value={percent} />
            <p className="context-note">
              {learning?.note ||
                "Completing the programme's learning gates teaching practice and nothing else."}
            </p>
          </Card>
          <Card title="Modules">{moduleRows}</Card>
          <Card title="Additional resources">
            <EmptyState
              title="No programme resources yet"
              description="Trainer handbooks, sample session plans and reference videos will appear here once they are attached to the programme."
            />
            <Pending>
              Programme resources need a backend field on the Train-the-Trainer
              programme.
            </Pending>
          </Card>
        </>
      )}

      {segment === "ttt-practice" && (
        <>
          <Tabs
            tabs={["My Sessions", "Guidelines"]}
            active={tab || "My Sessions"}
            onChange={setTab}
          />
          {(tab || "My Sessions") === "My Sessions" && (
            <Card
              title="My practice sessions"
              action={
                learningDone ? (
                  <Link
                    className="button button-primary"
                    to="/trainee/ttt-submissions"
                  >
                    New submission
                  </Link>
                ) : null
              }
            >
              {practiceList}
              <Pending>
                Session join links and recording playback need a schedule link
                field on the practice session.
              </Pending>
            </Card>
          )}
          {(tab || "My Sessions") === "Guidelines" && (
            <Card title="How teaching practice is assessed">
              <p>
                Teaching practice is scored against the programme rubric. The
                evaluator records a mark per criterion and an outcome of
                demonstrated or needs-further-practice.
              </p>
              {(practiceRows[0]?.rubric || []).length > 0 ? (
                <Table
                  caption="Rubric criteria"
                  rowKey="criterionId"
                  columns={[
                    { key: "criterionId", label: "Criterion" },
                    { key: "label", label: "What is assessed" },
                    { key: "maxMarks", label: "Maximum marks" },
                  ]}
                  rows={practiceRows[0].rubric.map((criterion) => ({
                    criterionId: criterion.criterionId,
                    label: criterion.label || criterion.description || "—",
                    maxMarks: criterion.maxMarks,
                  }))}
                />
              ) : (
                <Pending>
                  The rubric appears here after the first practice session is
                  recorded.
                </Pending>
              )}
              <p className="context-note">
                Your learning modules must be complete before teaching practice
                opens. Completing practice never verifies trainer capability by
                itself.
              </p>
            </Card>
          )}
        </>
      )}

      {segment === "ttt-submissions" && (
        <>
          {!learningDone ? (
            <EmptyState
              title="Teaching practice is locked"
              description="Complete every programme learning module first. The programme gates teaching practice on learning completion."
              action={
                <Link
                  className="button button-primary"
                  to="/trainee/ttt-modules"
                >
                  Open learning modules
                </Link>
              }
            />
          ) : !PRACTICE_STATES.includes(nomination.status) ? (
            <EmptyState
              title="Submission is not open yet"
              description={`Teaching practice opens once your nomination is accepted and the programme has started. Current status: ${nomination.status}.`}
            />
          ) : (
            <Card
              title="Submit teaching practice"
              subtitle="Record what you delivered, your reflection, and prepare the session plan."
            >
              <form
                className="auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await act(
                      () =>
                        part3.post(
                          `/ttt/nominations/${nominationId}/teaching-practice`,
                          {
                            sessionTitle: draft.sessionTitle,
                            responseText: draft.responseText || "",
                            ...(draft.scheduledAt && {
                              scheduledAt: new Date(
                                draft.scheduledAt,
                              ).toISOString(),
                            }),
                          },
                        ),
                      "Teaching practice submitted for evaluation",
                    )
                  )
                    setDraft({
                      sessionTitle: "",
                      scheduledAt: "",
                      responseText: "",
                    });
                }}
              >
                <Input
                  label="Session title"
                  required
                  minLength={4}
                  maxLength={300}
                  value={draft.sessionTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, sessionTitle: e.target.value })
                  }
                />
                <Input
                  label="Delivered on"
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={(e) =>
                    setDraft({ ...draft, scheduledAt: e.target.value })
                  }
                />
                <div className="ttt-upload">
                  <label htmlFor="ttt-session-plan">
                    Upload session plan
                  </label>
                  <div className="ttt-upload-row">
                    <input
                      id="ttt-session-plan"
                      type="file"
                      disabled
                      aria-describedby="ttt-upload-note"
                    />
                    <span className="ttt-upload-chip">
                      <Upload size={13} /> Not available yet
                    </span>
                  </div>
                </div>
                <div className="ttt-upload">
                  <label htmlFor="ttt-recording">
                    Upload recording (optional)
                  </label>
                  <div className="ttt-upload-row">
                    <input
                      id="ttt-recording"
                      type="file"
                      disabled
                      aria-describedby="ttt-upload-note"
                    />
                    <span className="ttt-upload-chip">
                      <Upload size={13} /> Not available yet
                    </span>
                  </div>
                </div>
                <p className="ttt-notice" id="ttt-upload-note">
                  <Info size={15} />
                  <span>
                    File attachments are not wired yet: the submission currently
                    records the session, its date and your reflection. A private
                    file upload endpoint for practice evidence is still needed.
                  </span>
                </p>
                <label>
                  Reflection and self-feedback
                  <textarea
                    rows={5}
                    maxLength={5000}
                    placeholder="What went well, challenges faced, and key learnings…"
                    value={draft.responseText}
                    onChange={(e) =>
                      setDraft({ ...draft, responseText: e.target.value })
                    }
                  />
                </label>
                <Button loading={busy} type="submit">
                  Submit for evaluation
                </Button>
              </form>
            </Card>
          )}
          <Card title="Submitted sessions">
            {practiceList}
          </Card>
        </>
      )}

      {segment === "ttt-progress" && (
        <>
          {evaluationView}
          {completionView}
          {!evaluated && practiceRows.length > 0 && (
            <Card title="Pending evaluation">
              <p>
                Your submission is with an assigned evaluator. Rubric scores and
                comments appear here once recorded.
              </p>
            </Card>
          )}
        </>
      )}
    </>
  );
}
