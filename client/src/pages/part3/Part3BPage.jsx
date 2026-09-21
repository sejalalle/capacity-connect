import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { Breadcrumbs } from "../../components/ui/Part2Components";
import { useToast } from "../../components/ui/Toast";
import useAuth from "../../hooks/useAuth";
import { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";

const titles = {
  evidence: "Evidence",
  "evidence-review": "Assigned Evidence Review",
  "review-oversight": "Evidence Review Oversight",
  "competency-decisions": "Competency Decisions",
  "competency-history": "Competency History",
  "follow-ups": "Follow-up Actions",
  "follow-up-oversight": "Follow-up Oversight",
  "organizational-capability": "Organizational Capability",
  "skill-suggestions": "Profile Skill Suggestions",
  "ai-question-drafts": "AI-assisted Question Drafts",
  "ai-activity": "AI Activity",
};
const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
function Table({ headers, rows }) {
  if (!rows.length)
    return (
      <EmptyState
        title="No records yet"
        description="Records will appear when the authorized workflow creates them."
      />
    );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const Field = ({ label, value, onChange, type = "text", required = false }) => (
  <label>
    {label}
    {required && " *"}
    {type === "textarea" ? (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </label>
);

export default function Part3BPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const segment = pathname.split("/")[2];
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({});
  const endpoint = useMemo(() => {
    if (segment === "organizational-capability") return "/capability";
    if (segment === "ai-activity") return "/ai/activity";
    if (["follow-ups", "follow-up-oversight"].includes(segment))
      return "/follow-ups";
    if (segment === "competency-history") return "/competency-passport";
    if (["skill-suggestions", "ai-question-drafts"].includes(segment))
      return "/ai/settings";
    return "/evidence";
  }, [segment]);
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
  if (loading) return <LoadingState />;
  const heading = (
    <>
      <Breadcrumbs
        items={[
          user.role === "admin"
            ? "Coordinator"
            : user.role === "trainer"
              ? "Reviewer"
              : "Trainee",
          titles[segment],
        ]}
      />
      <PageHeader
        eyebrow={<span className="demo-label">Demo data</span>}
        title={titles[segment]}
        description="Verified evidence, explicit human competency decisions and traceable follow-up remain distinct records."
      />
    </>
  );
  if (error)
    return (
      <>
        {heading}
        <div className="error-panel" role="alert">
          <strong>Unable to load this workspace</strong>
          <p>{error}</p>
          <button className="button button-secondary" onClick={load}>
            Retry
          </button>
        </div>
      </>
    );
  let content;
  if (
    [
      "evidence",
      "evidence-review",
      "review-oversight",
      "competency-decisions",
    ].includes(segment)
  )
    content = (
      <EvidenceWorkspace
        segment={segment}
        data={data || []}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  else if (
    ["competency-history", "follow-ups", "follow-up-oversight"].includes(
      segment,
    )
  )
    content = (
      <Passport segment={segment} data={data || {}} busy={busy} act={act} />
    );
  else if (segment === "organizational-capability")
    content = <Capability data={data} />;
  else
    content = (
      <AIWorkspace
        segment={segment}
        settings={data}
        form={form}
        setForm={setForm}
        busy={busy}
        act={act}
      />
    );
  return (
    <>
      {heading}
      {content}
    </>
  );
}

function EvidenceWorkspace({ segment, data, form, setForm, busy, act }) {
  const selected = data.find((x) => String(x._id) === form.evidenceId);
  const set = (key) => (value) => setForm({ ...form, [key]: value });
  return (
    <div className="dashboard-grid">
      <Card
        title="Evidence submissions"
        className="span-2"
        subtitle="A verified evidence record still requires a separate authorized competency decision."
      >
        <Table
          headers={["Owner", "Type", "Version", "Claims", "Status", "Reviewer"]}
          rows={data.map((x) => [
            x.owner?.name || "My record",
            x.evidenceType,
            x.version,
            x.claimedCompetencies?.map((c) => c.competency?.name).join(", "),
            <StatusBadge status={x.status} />,
            x.assignedReviewer?.name || "Not assigned",
          ])}
        />
      </Card>
      {segment === "evidence" && (
        <Card
          title="Submit evidence"
          subtitle="Existing assessment submissions and private files may be referenced without duplicate upload."
        >
          <Field
            label="Enrollment ID"
            value={form.enrollment}
            onChange={set("enrollment")}
          />
          <Field
            label="Competency ID"
            value={form.competency}
            onChange={set("competency")}
            required
          />
          <Field
            label="Rubric version"
            value={form.rubricVersion}
            onChange={set("rubricVersion")}
            required
          />
          <Field
            label="Target level"
            value={form.targetLevel}
            onChange={set("targetLevel")}
            type="number"
            required
          />
          <Field
            label="Assessment submission ID"
            value={form.assessmentSubmission}
            onChange={set("assessmentSubmission")}
          />
          <Field
            label="Description"
            value={form.description}
            onChange={set("description")}
            type="textarea"
            required
          />
          <button
            className="button button-primary"
            disabled={busy || !form.competency || !form.description}
            onClick={() =>
              act(
                () =>
                  part3.post("/evidence", {
                    evidenceType: form.assessmentSubmission
                      ? "PRACTICAL_TASK"
                      : "OTHER",
                    ...(form.enrollment && { enrollment: form.enrollment }),
                    claimedCompetencies: [
                      {
                        competency: form.competency,
                        frameworkVersion: 1,
                        rubricVersion: form.rubricVersion,
                        targetLevel: Number(form.targetLevel),
                      },
                    ],
                    ...(form.assessmentSubmission && {
                      assessmentSubmission: form.assessmentSubmission,
                    }),
                    privateResources: [],
                    description: form.description,
                  }),
                "Evidence submitted",
              )
            }
          >
            Submit evidence
          </button>
        </Card>
      )}
      {segment === "review-oversight" && (
        <Card title="Assign reviewer">
          <Field
            label="Evidence ID"
            value={form.evidenceId}
            onChange={set("evidenceId")}
            required
          />
          <Field
            label="Reviewer ID"
            value={form.reviewer}
            onChange={set("reviewer")}
            required
          />
          <Field
            label="Reason"
            value={form.reason}
            onChange={set("reason")}
            type="textarea"
            required
          />
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() =>
              act(
                () =>
                  part3.post(`/evidence/${form.evidenceId}/assign-reviewer`, {
                    reviewer: form.reviewer,
                    reason: form.reason,
                  }),
                "Reviewer assigned",
              )
            }
          >
            Assign reviewer
          </button>
        </Card>
      )}
      {["evidence-review", "competency-decisions"].includes(segment) && (
        <Card
          title="Review and decide"
          subtitle="Evidence acceptance and competency decisions are stored separately."
        >
          <label>
            Evidence
            <select
              value={form.evidenceId || ""}
              onChange={(e) => set("evidenceId")(e.target.value)}
            >
              <option value="">Select assigned evidence</option>
              {data.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.evidenceKey} — {x.status}
                </option>
              ))}
            </select>
          </label>
          {segment === "evidence-review" ? (
            <>
              <Field
                label="Reason/comments"
                value={form.reason}
                onChange={set("reason")}
                type="textarea"
                required
              />
              <div className="flex gap-2">
                <button
                  className="button button-primary"
                  disabled={busy || !selected}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(`/evidence/${selected._id}/review`, {
                          status: "VERIFIED",
                          reason: form.reason,
                          comments: form.reason,
                        }),
                      "Evidence verified for its stated purpose",
                    )
                  }
                >
                  Verify evidence
                </button>
                <button
                  className="button button-secondary"
                  disabled={busy || !selected}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(`/evidence/${selected._id}/review`, {
                          status: "NEEDS_REVISION",
                          reason: form.reason,
                          comments: form.reason,
                        }),
                      "Revision requested",
                    )
                  }
                >
                  Request revision
                </button>
              </div>
            </>
          ) : (
            <>
              <Field
                label="Competency ID"
                value={
                  form.competency ||
                  selected?.claimedCompetencies?.[0]?.competency?._id
                }
                onChange={set("competency")}
                required
              />
              <Field
                label="Decision reason"
                value={form.reason}
                onChange={set("reason")}
                type="textarea"
                required
              />
              <button
                className="button button-primary"
                disabled={busy || !selected}
                onClick={() => {
                  const claim = selected.claimedCompetencies[0];
                  return act(
                    () =>
                      part3.post(
                        `/evidence/${selected._id}/competency-decisions`,
                        {
                          competency: form.competency || claim.competency._id,
                          frameworkVersion: claim.frameworkVersion,
                          rubricVersion: claim.rubricVersion,
                          targetLevel: claim.targetLevel,
                          demonstratedLevel: claim.targetLevel,
                          outcome: "DEMONSTRATED",
                          criterionResults: [
                            {
                              criterionId: "HUMAN_REVIEW",
                              met: true,
                              comments: form.reason,
                            },
                          ],
                          evidenceVersion: selected.version,
                          reason: form.reason,
                          idempotencyKey:
                            crypto.randomUUID?.() ||
                            `${Date.now()}-0000-4000-8000-000000000000`,
                        },
                      ),
                    "Human competency decision recorded",
                  );
                }}
              >
                Record demonstrated decision
              </button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Passport({ segment, data, busy, act }) {
  if (segment.includes("follow"))
    return (
      <Card
        title="Follow-up actions"
        subtitle="Completing an action does not itself demonstrate competency."
      >
        <Table
          headers={[
            "Competency",
            "Action",
            "Why suggested",
            "Due",
            "Status",
            "Next action",
          ]}
          rows={(Array.isArray(data) ? data : []).map((x) => [
            x.competency?.name,
            x.recommendedAction,
            x.explanation,
            fmt(x.dueDate),
            <StatusBadge status={x.status} />,
            x.status === "OPEN" ? (
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      part3.patch(`/follow-ups/${x._id}`, {
                        status: "IN_PROGRESS",
                        comments: "Follow-up started by the authorized user.",
                      }),
                    "Follow-up started",
                  )
                }
              >
                Start
              </button>
            ) : (
              "—"
            ),
          ])}
        />
      </Card>
    );
  return (
    <div className="dashboard-grid">
      <Card title="Current competency passport" className="span-2">
        <Table
          headers={["Competency", "Status", "Demonstrated", "Evidence date"]}
          rows={(data.records || []).map((x) => [
            x.competency?.name,
            <StatusBadge status={x.status} />,
            x.demonstratedLevel ?? "Not assessed",
            fmt(x.assessedAt),
          ])}
        />
      </Card>
      <Card title="Decision history" className="span-2">
        <Table
          headers={[
            "Competency",
            "Outcome",
            "Previous",
            "New",
            "Target",
            "Reviewer",
            "Date",
          ]}
          rows={(data.history || []).map((x) => [
            x.competency?.name,
            <StatusBadge status={x.outcome} />,
            x.previousLevel ?? "Not assessed",
            x.newLevel ?? "Not assessed",
            x.targetLevel,
            x.reviewer?.name,
            fmt(x.recordedAt),
          ])}
        />
      </Card>
    </div>
  );
}

function Capability({ data }) {
  return (
    <div className="dashboard-grid">
      <Card
        title="Competency coverage"
        className="span-2"
        subtitle={`${data.label}. Calculated ${fmt(data.calculatedAt)}.`}
      >
        <Table
          headers={[
            "Competency",
            "Requirement",
            "Meeting",
            "Below",
            "Not assessed",
            "Not comparable",
            "Demand",
            "Reviewed trainers",
            "Denominator",
            "Coverage",
          ]}
          rows={(data.coverage || []).map((x) => [
            x.competency?.name,
            `L${x.requiredLevel}`,
            x.meetingCount,
            x.belowRequiredCount,
            x.notAssessedCount,
            x.notComparableCount,
            x.pendingTrainingDemand,
            x.reviewedTrainerCount,
            x.denominator,
            x.coveragePercent == null ? "N/A" : `${x.coveragePercent}%`,
          ])}
        />
      </Card>
      <Card title="Transparent indicators" className="span-2">
        <Table
          headers={[
            "Scope",
            "Indicator",
            "Counts",
            "Threshold",
            "Reason",
            "Suggested action",
          ]}
          rows={(data.risks || []).map((x) => [
            x.scope,
            x.indicator,
            JSON.stringify(x.counts),
            x.threshold,
            x.reason,
            x.suggestedAction,
          ])}
        />
      </Card>
    </div>
  );
}

function AIWorkspace({ segment, settings, form, setForm, busy, act }) {
  const [results, setResults] = useState([]);
  const set = (key) => (value) => setForm({ ...form, [key]: value });
  if (segment === "ai-activity")
    return (
      <Card
        title="AI request metadata"
        subtitle="Private source text and API keys are not stored in activity records."
      >
        <Table
          headers={[
            "Actor",
            "Feature",
            "Provider",
            "Outcome",
            "Human action",
            "Date",
          ]}
          rows={(settings || []).map((x) => [
            x.actor?.name,
            x.feature,
            x.provider,
            <StatusBadge status={x.outcome} />,
            x.humanAction,
            fmt(x.createdAt),
          ])}
        />
      </Card>
    );
  return (
    <div className="dashboard-grid">
      <Card
        title="AI availability"
        action={
          <StatusBadge status={settings.enabled ? "AVAILABLE" : "DISABLED"} />
        }
      >
        <p>
          {settings.enabled
            ? `${settings.provider} / ${settings.model}`
            : "AI assistance is disabled. Manual workflows and deterministic catalogue search remain available."}
        </p>
        <p className="context-note">
          Suggestions never verify expertise, appoint trainers, publish results,
          or update competency.
        </p>
      </Card>
      <Card
        title={
          segment === "ai-question-drafts"
            ? "Draft from approved material"
            : "Find catalogue matches"
        }
      >
        <Field
          label="Authorized source text"
          value={form.text}
          onChange={set("text")}
          type="textarea"
          required
        />
        {segment === "skill-suggestions" ? (
          <>
            <Field
              label="Source reference"
              value={form.sourceReference}
              onChange={set("sourceReference")}
              required
            />
            <div className="ai-action-group">
              <button
                className="button button-primary"
                disabled={busy || !form.text}
                onClick={async () => {
                  const value = await act(
                    () =>
                      part3.post("/ai/competency-search", { text: form.text }),
                    "Deterministic catalogue search completed",
                    false,
                  );
                  setResults(
                    (value || []).map((item) => ({
                      ...item,
                      kind: "CATALOGUE",
                    })),
                  );
                }}
              >
                Search approved catalogue
              </button>
              <button
                className="button button-secondary"
                disabled={busy || !form.text || !settings.enabled}
                onClick={async () => {
                  const value = await act(
                    () =>
                      part3.post("/ai/skill-extraction", {
                        sourceReferenceId:
                          form.sourceReference || "authorized-profile-text",
                        sourceText: form.text,
                      }),
                    "AI suggestions created for human review",
                    false,
                  );
                  setResults(
                    (value?.suggestions || []).map((item) => ({
                      ...item,
                      kind: "SKILL",
                      requestId: value.requestId,
                    })),
                  );
                }}
              >
                Suggest profile skills
              </button>
              <button
                className="button button-secondary"
                disabled={busy || !form.text || !settings.enabled}
                onClick={async () => {
                  const value = await act(
                    () =>
                      part3.post("/ai/competency-matching", {
                        text: form.text,
                      }),
                    "AI catalogue matches created for human review",
                    false,
                  );
                  setResults(
                    (value?.matches || []).map((item) => ({
                      ...item,
                      kind: "AI_MATCH",
                      requestId: value.requestId,
                    })),
                  );
                }}
              >
                Suggest competency matches
              </button>
            </div>
          </>
        ) : (
          <>
            <Field
              label="Batch ID"
              value={form.batch}
              onChange={set("batch")}
              required
            />
            <Field
              label="Course ID"
              value={form.course}
              onChange={set("course")}
              required
            />
            <Field
              label="Published learning module ID"
              value={form.learningModule}
              onChange={set("learningModule")}
              required
            />
            <Field
              label="Source reference"
              value={form.sourceReference}
              onChange={set("sourceReference")}
              required
            />
            <button
              className="button button-primary"
              disabled={busy || !settings.enabled}
              onClick={() =>
                act(
                  () =>
                    part3.post("/ai/mcq-drafts", {
                      batch: form.batch,
                      course: form.course,
                      learningModule: form.learningModule,
                      subject: "Approved learning material",
                      sourceReference: form.sourceReference,
                      sourcePage: form.sourcePage || "",
                      sourcePassage: form.text,
                    }),
                  "Unpublished MCQ draft created",
                )
              }
            >
              Create unpublished draft
            </button>
          </>
        )}
      </Card>
      {segment === "skill-suggestions" && (
        <Card title="Human confirmation required" className="span-2">
          {!results.length ? (
            <EmptyState
              title="No suggestions yet"
              description="Run deterministic catalogue search or an enabled AI assistance option."
            />
          ) : (
            <div className="suggestion-list">
              {results.map((x, index) => (
                <article key={`${x.kind}-${index}`}>
                  <div>
                    <h3>
                      {x.suggestedCompetency?.name || x.tag || x.competencyId}
                    </h3>
                    <p>{x.sourcePhrase || x.supportingPassage}</p>
                    <small>
                      {x.explanation ||
                        (x.kind === "SKILL"
                          ? "AI-extracted profile suggestion; accepting keeps it self-declared."
                          : `Uncertainty: ${x.uncertainty || x.confidence}`)}
                    </small>
                  </div>
                  {x.kind === "SKILL" ? (
                    <button
                      className="button button-secondary"
                      disabled={busy}
                      onClick={() =>
                        act(
                          () =>
                            part3.post(
                              `/ai/skill-extraction/${x.requestId}/accept`,
                              { tag: x.tag, action: "ACCEPTED" },
                            ),
                          "Suggestion accepted as a self-declared skill",
                          false,
                        )
                      }
                    >
                      Accept as self-declared
                    </button>
                  ) : x.kind === "AI_MATCH" ? (
                    <button
                      className="button button-secondary"
                      disabled={busy || !x.competencyId}
                      onClick={() =>
                        act(
                          () =>
                            part3.post(
                              `/ai/competency-matching/${x.requestId}/review`,
                              {
                                action: "ACCEPTED",
                                competency: x.competencyId,
                                reason:
                                  "Human confirmed this catalogue suggestion; no proficiency or competency status changed.",
                              },
                            ),
                          "Catalogue mapping confirmation recorded",
                          false,
                        )
                      }
                    >
                      Confirm mapping
                    </button>
                  ) : (
                    <span className="demo-label">Manual catalogue result</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
