import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { Breadcrumbs } from "../../components/ui/Part2Components";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";

const TITLES = {
  "trainer-profile": "Trainer Profile & Expertise",
  availability: "Trainer Availability",
  "assigned-batches": "Assigned Batches",
  "trainer-discovery": "Trainer Discovery",
  "trainer-assignments": "Assignment Management",
  learning: "Learning Delivery",
  "question-bank": "Question Bank",
  assessments: "Assessments",
  evaluations: "Evaluation Queue",
  results: "Results",
};
const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const same = (a, b) => String(a?._id || a || "") === String(b?._id || b || "");

function Table({ headers, rows }) {
  if (!rows.length)
    return (
      <EmptyState
        title="No records yet"
        description="Records will appear here when the permitted workflow creates them."
      />
    );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ErrorPanel({ message, retry }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle />
      <div>
        <strong>Unable to load this workspace</strong>
        <p>{message}</p>
        <button className="button button-secondary" onClick={retry}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    </div>
  );
}

export default function Part3Page() {
  const { user } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const segment = pathname.split("/")[2] || "assessments";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const endpoint = useMemo(() => {
    if (segment === "trainer-profile") return "/trainer-profile";
    if (segment === "availability") return "/availability";
    if (segment === "learning") return "/learning";
    if (segment === "question-bank") return "/questions";
    if (segment === "assessments")
      return user.role === "trainee" ? "/dashboard" : "/assessments";
    if (segment === "evaluations") return "/submissions";
    if (segment === "results" && user.role !== "admin") return "/results";
    return "/dashboard";
  }, [segment, user.role]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await part3.get(endpoint));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    setForm({});
    setRecommendations([]);
    setAttempt(null);
    load();
  }, [load]);
  const act = async (operation, message, refresh = true) => {
    setBusy(true);
    try {
      const result = await operation();
      toast(message);
      if (refresh) await load();
      return result;
    } catch (err) {
      toast(errorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const header = (
    <>
      <Breadcrumbs
        items={[
          user.role === "admin"
            ? "Coordinator"
            : user.role === "trainer"
              ? "Trainer"
              : "Trainee",
          TITLES[segment] || "Training & Assessments",
        ]}
      />
      <PageHeader
        eyebrow={<span className="demo-label">Demo data</span>}
        title={TITLES[segment] || "Training & Assessments"}
        description="Trainer management, learning delivery, assessments and human-controlled results."
      />
    </>
  );
  if (loading)
    return (
      <>
        <LoadingState />
      </>
    );
  if (error)
    return (
      <>
        {header}
        <ErrorPanel message={error} retry={load} />
      </>
    );
  let content;
  if (segment === "trainer-profile")
    content = (
      <TrainerProfile
        data={data}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else if (segment === "availability")
    content = (
      <Availability
        data={data}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else if (
    ["assigned-batches", "trainer-discovery", "trainer-assignments"].includes(
      segment,
    )
  )
    content = (
      <Assignments
        data={data}
        user={user}
        form={form}
        setForm={setForm}
        recommendations={recommendations}
        setRecommendations={setRecommendations}
        busy={busy}
        act={act}
      />
    );
  else if (segment === "learning")
    content = <Learning data={data} user={user} busy={busy} act={act} />;
  else if (segment === "question-bank")
    content = (
      <Questions
        data={data}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else if (segment === "assessments")
    content = (
      <Assessments
        data={data}
        user={user}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
        attempt={attempt}
        setAttempt={setAttempt}
      />
    );
  else if (segment === "evaluations")
    content = (
      <Evaluations
        data={data}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else if (segment === "results")
    content = (
      <Results
        data={data}
        user={user}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else content = <EmptyState />;
  return (
    <>
      {header}
      {content}
    </>
  );
}

function TrainerProfile({ data, form, setForm, busy, act }) {
  const profile = data?.profile;
  const value = (key, fallback = "") => form[key] ?? profile?.[key] ?? fallback;
  return (
    <div className="dashboard-grid">
      <Card
        title="Professional delivery profile"
        subtitle="Profile information remains self-declared until reviewed."
      >
        <label>
          Professional experience (years)
          <input
            type="number"
            min="0"
            max="60"
            value={value("professionalExperienceYears", 0)}
            onChange={(e) =>
              setForm({
                ...form,
                professionalExperienceYears: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Teaching experience (years)
          <input
            type="number"
            min="0"
            max="60"
            value={value("teachingExperienceYears", 0)}
            onChange={(e) =>
              setForm({
                ...form,
                teachingExperienceYears: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Domains, comma separated
          <input
            value={value("domains", []).join?.(", ") || value("domains")}
            onChange={(e) =>
              setForm({
                ...form,
                domains: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label>
          Supported location
          <input
            value={value("locations", []).join?.(", ") || value("locations")}
            onChange={(e) =>
              setForm({
                ...form,
                locations: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() =>
            act(
              () =>
                part3.put("/trainer-profile", {
                  professionalExperienceYears: value(
                    "professionalExperienceYears",
                    0,
                  ),
                  teachingExperienceYears: value("teachingExperienceYears", 0),
                  domains: Array.isArray(value("domains", []))
                    ? value("domains", [])
                    : [],
                  deliveryModes: form.deliveryModes ||
                    profile?.deliveryModes || ["ONLINE"],
                  locations: Array.isArray(value("locations", []))
                    ? value("locations", [])
                    : [],
                }),
              "Trainer profile saved",
            )
          }
        >
          Save profile
        </button>
      </Card>
      <Card
        title="Review status"
        action={
          <StatusBadge status={profile?.reviewStatus || "SELF_DECLARED"} />
        }
      >
        <p>
          Profile review and subject expertise review are separate decisions.
        </p>
        <p className="context-note">
          An access role never establishes subject expertise.
        </p>
      </Card>
      <Card title="Expertise records" className="span-2">
        <Table
          headers={[
            "Competency",
            "Claimed",
            "Reviewed",
            "Status",
            "Review basis",
          ]}
          rows={(data?.expertise || []).map((item) => [
            item.competency?.name,
            item.claimedLevel || "—",
            item.approvedLevel || "—",
            <StatusBadge status={item.status} />,
            item.reviewBasis || "Awaiting review",
          ])}
        />
      </Card>
    </div>
  );
}

function Availability({ data, form, setForm, busy, act }) {
  return (
    <div className="dashboard-grid">
      <Card title="Availability windows" className="span-2">
        <Table
          headers={["Start", "End", "Available", "Mode", "Reason"]}
          rows={(data || []).map((item) => [
            fmt(item.start),
            fmt(item.end),
            <StatusBadge
              status={item.available ? "AVAILABLE" : "UNAVAILABLE"}
            />,
            item.deliveryModes?.join(", "),
            item.reason,
          ])}
        />
      </Card>
      <Card
        title="Record availability"
        subtitle="Changes that overlap an assignment flag it for coordinator action."
      >
        <label>
          Start *
          <input
            type="datetime-local"
            value={form.start || ""}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
        </label>
        <label>
          End *
          <input
            type="datetime-local"
            value={form.end || ""}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
        </label>
        <label>
          Availability
          <select
            value={form.available ?? "true"}
            onChange={(e) =>
              setForm({ ...form, available: e.target.value === "true" })
            }
          >
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </label>
        <label>
          Reason *
          <textarea
            value={form.reason || ""}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
        <button
          className="button button-primary"
          disabled={busy || !form.start || !form.end || !form.reason}
          onClick={() =>
            act(
              () =>
                part3.post("/availability", {
                  start: new Date(form.start).toISOString(),
                  end: new Date(form.end).toISOString(),
                  available: form.available ?? true,
                  reason: form.reason,
                  deliveryModes: ["ONLINE", "BLENDED"],
                  locations: ["Demonstration Training Centre"],
                  preferenceScore: 1,
                }),
              "Availability saved",
            )
          }
        >
          Save availability
        </button>
      </Card>
    </div>
  );
}

function Assignments({
  data,
  user,
  form,
  setForm,
  recommendations,
  setRecommendations,
  busy,
  act,
}) {
  const assignments = data?.assignments || (Array.isArray(data) ? data : []);
  const calculate = async () => {
    setBusySafe(true);
    try {
      setRecommendations(
        await part3.get(`/trainer-suitability/${form.batch}/${form.sessionId}`),
      );
    } catch (err) {
      setRecommendations([{ error: errorMessage(err) }]);
    } finally {
      setBusySafe(false);
    }
  };
  const setBusySafe = () => {};
  return (
    <div className="dashboard-grid">
      <Card title="Session assignments" className="span-2">
        <Table
          headers={["Batch", "Trainer", "Scope", "Status", "Decision"]}
          rows={assignments.map((item) => [
            item.batch?._id ? (
              <Link to={`/${user.role}/batches/${item.batch._id}`}>
                {item.batch?.name || item.batch?.course?.title}
              </Link>
            ) : (
              item.batch?.name || item.batch?.course?.title
            ),
            item.trainer?.name || user.name,
            item.scopeTitle || fmt(item.start),
            <StatusBadge status={item.status} />,
            item.decisionReason,
          ])}
        />
      </Card>
      {user.role === "admin" && (
        <Card
          title="Calculate current suitability"
          subtitle="Mandatory checks run before the 100-point recommendation model."
        >
          <label>
            Batch ID *
            <input
              value={form.batch || ""}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
            />
          </label>
          <label>
            Session ID *
            <input
              value={form.sessionId || ""}
              onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy || !form.batch || !form.sessionId}
            onClick={calculate}
          >
            <Search size={16} />
            Calculate suitability
          </button>
        </Card>
      )}
      <Card
        title="Explained shortlist"
        className={user.role === "admin" ? "" : "span-2"}
      >
        {recommendations.length ? (
          recommendations.map((item) => (
            <div
              className="recommendation"
              key={item.trainer?._id || item.error}
            >
              <div className="flex-between">
                <strong>{item.trainer?.name || "Unable to calculate"}</strong>
                {item.status && <StatusBadge status={item.status} />}
              </div>
              <p>{item.explanation || item.error}</p>
              {item.status === "ELIGIBLE" && (
                <>
                  <small>
                    {item.totalPoints} recommendation points ·{" "}
                    {item.configurationVersion}
                  </small>
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() =>
                      act(
                        () =>
                          part3.post("/trainer-assignments", {
                            batch: form.batch,
                            sessionId: form.sessionId,
                            trainer: item.trainer._id,
                            reason:
                              "Coordinator confirmed the current eligible shortlist.",
                            rankingDepartureReason: "",
                            shortlistCalculatedAt: item.calculatedAt,
                          }),
                        "Trainer assignment confirmed",
                      )
                    }
                  >
                    Assign trainer
                  </button>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="muted">
            Enter a batch and session to show eligible, excluded and
            needs-information trainers with factor contributions.
          </p>
        )}
      </Card>
    </div>
  );
}

function Learning({ data, user, busy, act }) {
  const modules = data?.modules || [];
  const enrollment = data?.enrollments?.[0];
  return (
    <div className="card-grid">
      {modules.map((module) => {
        const progress = data?.progress?.find((item) =>
          same(item.module, module._id),
        );
        return (
          <Card
            key={module._id}
            title={`${module.order}. ${module.title}`}
            subtitle={`Version ${module.version} · ${module.completionRule}`}
            action={<StatusBadge status={progress?.status || module.status} />}
          >
            <p>{module.summary}</p>
            {module.announcement && (
              <p className="context-note">{module.announcement}</p>
            )}
            <ul className="plain-list">
              {module.resources?.map((resource) => (
                <li key={resource._id}>
                  {resource.title} · {resource.type}{" "}
                  {resource.restricted ? "· Restricted" : ""}
                </li>
              ))}
            </ul>
            {user.role === "trainee" && enrollment && (
              <button
                className="button button-secondary"
                disabled={busy || progress?.status === "COMPLETED"}
                onClick={() =>
                  act(
                    () =>
                      part3.post(`/learning/modules/${module._id}/progress`, {
                        enrollment: enrollment._id,
                        status: "COMPLETED",
                      }),
                    "Module progress saved",
                  )
                }
              >
                {progress?.status === "COMPLETED"
                  ? "Completed"
                  : "Mark completed"}
              </button>
            )}
          </Card>
        );
      })}
      {!modules.length && (
        <EmptyState
          title="No learning modules"
          description="Published modules for authorized batches will appear here."
        />
      )}
      <Card title="Learning boundary">
        <p>
          Opening resources and completing modules do not update competency
          records.
        </p>
      </Card>
    </div>
  );
}

function Questions({ data, form, setForm, busy, act }) {
  return (
    <div className="dashboard-grid">
      <Card title="Reviewed question bank" className="span-2">
        <Table
          headers={["Key", "Question", "Course", "Version", "Status", "Source"]}
          rows={(data || []).map((item) => [
            item.questionKey,
            item.text,
            item.course?.title,
            item.version,
            <StatusBadge status={item.status} />,
            item.sourceReference,
          ])}
        />
      </Card>
      <Card title="Create single-correct MCQ">
        <label>
          Batch ID *
          <input
            value={form.batch || ""}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
          />
        </label>
        <label>
          Course ID *
          <input
            value={form.course || ""}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
          />
        </label>
        <label>
          Question key *
          <input
            value={form.questionKey || ""}
            onChange={(e) =>
              setForm({ ...form, questionKey: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Question text *
          <textarea
            value={form.text || ""}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </label>
        <label>
          Option A *
          <input
            value={form.optionA || ""}
            onChange={(e) => setForm({ ...form, optionA: e.target.value })}
          />
        </label>
        <label>
          Option B *
          <input
            value={form.optionB || ""}
            onChange={(e) => setForm({ ...form, optionB: e.target.value })}
          />
        </label>
        <label>
          Source reference *
          <input
            value={form.sourceReference || ""}
            onChange={(e) =>
              setForm({ ...form, sourceReference: e.target.value })
            }
          />
        </label>
        <button
          className="button button-primary"
          disabled={
            busy ||
            !form.batch ||
            !form.course ||
            !form.questionKey ||
            !form.text ||
            !form.optionA ||
            !form.optionB ||
            !form.sourceReference
          }
          onClick={() =>
            act(
              () =>
                part3.post("/questions", {
                  batch: form.batch,
                  course: form.course,
                  subject: "Weather Radar",
                  questionKey: form.questionKey,
                  text: form.text,
                  options: [
                    { optionId: "A", text: form.optionA },
                    { optionId: "B", text: form.optionB },
                  ],
                  correctOptionId: "A",
                  marks: 1,
                  explanation: "Review the cited approved source.",
                  sourceReference: form.sourceReference,
                  provenance: { type: "MANUAL" },
                }),
              "Question draft created",
            )
          }
        >
          Create draft
        </button>
      </Card>
      <Card title="Publication control">
        <p>
          Only independently reviewed questions can be frozen into a published
          assessment. Answer keys are never returned to trainee APIs before
          release.
        </p>
      </Card>
    </div>
  );
}

function Assessments({
  data,
  user,
  form,
  setForm,
  busy,
  act,
  attempt,
  setAttempt,
}) {
  const rows = Array.isArray(data) ? data : data?.assessments || [];
  if (user.role === "trainee")
    return (
      <div className="card-grid">
        {!rows.length && (
          <EmptyState
            title="No assigned assessments"
            description="Published assessments will appear here for your enrolled learning."
          />
        )}
        {rows.map((assessment) => (
          <Card
            key={assessment._id}
            title={assessment.title}
            subtitle={`${assessment.type} · Version ${assessment.version}`}
            action={<StatusBadge status={assessment.status} />}
          >
            <p>{assessment.instructions}</p>
            <p className="context-note">
              Open until {fmt(assessment.closesAt)}. Results remain private
              until authorized publication.
            </p>
            {assessment.type === "MCQ" ? (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={async () => {
                  const result = await act(
                    () =>
                      part3.post(
                        `/assessments/${assessment._id}/attempts/start`,
                        {},
                      ),
                    "Attempt ready",
                    false,
                  );
                  if (result) setAttempt(result);
                }}
              >
                Start or resume attempt
              </button>
            ) : (
              <button
                className="button button-secondary"
                onClick={() =>
                  setForm({
                    assessment: assessment._id,
                    enrollment: data?.enrollments?.[0]?._id,
                  })
                }
              >
                Prepare submission
              </button>
            )}
          </Card>
        ))}
        {attempt && (
          <AttemptPanel
            value={attempt}
            form={form}
            setForm={setForm}
            busy={busy}
            act={act}
            setAttempt={setAttempt}
          />
        )}
        {form.assessment && !attempt && (
          <Card title="Practical submission">
            <label>
              Response *
              <textarea
                value={form.responseText || ""}
                onChange={(e) =>
                  setForm({ ...form, responseText: e.target.value })
                }
              />
            </label>
            <button
              className="button button-primary"
              disabled={busy || !form.responseText}
              onClick={() =>
                act(
                  () =>
                    part3.post("/submissions", {
                      enrollment: form.enrollment,
                      assessment: form.assessment,
                      responseText: form.responseText,
                      privateResources: [],
                    }),
                  "Submission receipt created",
                )
              }
            >
              Submit practical work
            </button>
          </Card>
        )}
      </div>
    );
  return (
    <div className="dashboard-grid">
      <Card title="Assessment versions" className="span-2">
        <Table
          headers={[
            "Assessment",
            "Batch",
            "Type",
            "Version",
            "Window",
            "Status",
          ]}
          rows={rows.map((item) => [
            item.title,
            item.batch?.name,
            item.type,
            item.version,
            `${fmt(item.opensAt)} — ${fmt(item.closesAt)}`,
            <StatusBadge status={item.status} />,
          ])}
        />
      </Card>
      <Card title="Assessment controls">
        <p>
          Published versions are immutable for attempts. Create a new version
          for future changes.
        </p>
        <p className="context-note">
          Publishing an assessment never publishes a result.
        </p>
      </Card>
    </div>
  );
}

function AttemptPanel({ value, form, setForm, busy, act, setAttempt }) {
  const { attempt, assessment } = value;
  const answers = form.answers || [];
  return (
    <Card
      title={assessment.title}
      subtitle={`Attempt ${attempt.attemptNumber} · Deadline ${fmt(attempt.effectiveDeadline)}`}
    >
      {attempt.questionOrder.map((key, index) => {
        const question = assessment.questionVersions.find(
          (item) => item.questionKey === key,
        );
        return (
          <fieldset key={key}>
            <legend>
              {index + 1}. {question.text}
            </legend>
            {question.options.map((option) => (
              <label className="option-row" key={option.optionId}>
                <input
                  type="radio"
                  name={key}
                  checked={
                    answers.find((item) => item.questionId === key)
                      ?.optionId === option.optionId
                  }
                  onChange={() =>
                    setForm({
                      ...form,
                      answers: [
                        ...answers.filter((item) => item.questionId !== key),
                        { questionId: key, optionId: option.optionId },
                      ],
                    })
                  }
                />
                {option.text}
              </label>
            ))}
          </fieldset>
        );
      })}
      <div className="button-row">
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={async () => {
            const result = await act(
              () => part3.put(`/attempts/${attempt._id}/answers`, { answers }),
              "Answers saved",
              false,
            );
            if (result) setAttempt(result);
          }}
        >
          Save answers
        </button>
        <button
          className="button button-primary"
          disabled={busy}
          onClick={async () => {
            await part3.put(`/attempts/${attempt._id}/answers`, { answers });
            const result = await act(
              () =>
                part3.post(`/attempts/${attempt._id}/submit`, {
                  submissionKey: crypto.randomUUID(),
                }),
              "Attempt submitted",
              false,
            );
            if (result) setAttempt(null);
          }}
        >
          Submit attempt
        </button>
      </div>
    </Card>
  );
}

function Evaluations({ data, form, setForm, busy, act }) {
  const submissions = Array.isArray(data) ? data : data?.submissions || [];
  const chosen = submissions.find((item) => item._id === form.submission);
  return (
    <div className="dashboard-grid">
      <Card title="Assigned evaluator queue" className="span-2">
        <Table
          headers={[
            "Trainee",
            "Assessment",
            "Revision",
            "Submitted",
            "Status",
            "Action",
          ]}
          rows={submissions.map((item) => [
            item.trainee?.name,
            item.assessment?.title,
            item.version,
            fmt(item.submittedAt),
            <StatusBadge status={item.status} />,
            item.status === "SUBMITTED" ? (
              <button
                className="button button-secondary"
                onClick={() => setForm({ submission: item._id })}
              >
                Evaluate
              </button>
            ) : (
              "Recorded"
            ),
          ])}
        />
      </Card>
      {chosen && (
        <Card title="Criterion-level evaluation" className="span-2">
          {chosen.assessment.rubric.map((criterion) => (
            <label key={criterion.criterionId}>
              {criterion.label} (0–{criterion.maxMarks})
              <input
                type="number"
                min="0"
                max={criterion.maxMarks}
                value={form[criterion.criterionId] ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [criterion.criterionId]: Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
          <label>
            Comments *
            <textarea
              value={form.comments || ""}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy || !form.comments}
            onClick={() =>
              act(
                () =>
                  part3.post(`/submissions/${chosen._id}/evaluations`, {
                    status: "EVALUATED",
                    criterionMarks: chosen.assessment.rubric.map(
                      (criterion) => ({
                        criterionId: criterion.criterionId,
                        marks: form[criterion.criterionId] ?? 0,
                        comment: "",
                      }),
                    ),
                    comments: form.comments,
                  }),
                "Human evaluation recorded",
              )
            }
          >
            Complete evaluation
          </button>
        </Card>
      )}
    </div>
  );
}

function Results({ data, user, form, setForm, busy, act }) {
  const rows = user.role === "admin" ? data?.readyResults || [] : data || [];
  return (
    <div className="dashboard-grid">
      <Card
        title={
          user.role === "admin"
            ? "Results ready for authorized publication"
            : "Published result history"
        }
        className="span-2"
      >
        <Table
          headers={[
            "Trainee",
            "Batch",
            "Version",
            "Outcome",
            "Score",
            "Status",
            "Action",
          ]}
          rows={rows.map((item) => [
            item.trainee?.name,
            item.batch?.name,
            item.version,
            item.status === "PUBLISHED" ? (
              <StatusBadge status={item.outcome} />
            ) : (
              "Withheld"
            ),
            item.status === "PUBLISHED" ? `${item.percentage}%` : "Withheld",
            <StatusBadge status={item.status} />,
            user.role === "admin" && item.status === "READY_FOR_REVIEW" ? (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      part3.post(`/results/${item._id}/publish`, {
                        reason: "Authorized publication after required checks.",
                      }),
                    "Result published",
                  )
                }
              >
                Publish
              </button>
            ) : (
              "—"
            ),
          ])}
        />
      </Card>
      {user.role === "admin" && (
        <Card title="Prepare result review">
          <label>
            Enrollment ID *
            <input
              value={form.enrollment || ""}
              onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
            />
          </label>
          <label>
            Reason *
            <textarea
              value={form.reason || ""}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
          <button
            className="button button-secondary"
            disabled={busy || !form.enrollment || !form.reason}
            onClick={() =>
              act(
                () =>
                  part3.post("/results/prepare", {
                    enrollment: form.enrollment,
                    reason: form.reason,
                  }),
                "Result prepared for review",
              )
            }
          >
            Prepare result
          </button>
        </Card>
      )}
      <Card title="Human control">
        <p>
          Evaluation and assessment scores remain private until an explicitly
          authorized publisher releases a version. Corrections retain prior
          versions.
        </p>
      </Card>
    </div>
  );
}
