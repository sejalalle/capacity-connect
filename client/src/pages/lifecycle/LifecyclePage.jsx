import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  Users,
  CalendarDays,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useUsers from "../../hooks/useUsers";
import { workflowService as service } from "../../services/workflowService";
import { errorMessage } from "../../services/api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import KpiCard from "../../components/ui/KpiCard";
import StatusBadge from "../../components/ui/StatusBadge";
import Table from "../../components/ui/Table";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../components/ui/Toast";
import UserTable from "../admin/UserTable";
import ActionDialog from "./ActionDialog";
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
const fmt = (value) =>
  value ? new Date(value).toLocaleString() : "Not reviewed";
const list = (value) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const field = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const options = (rows, label = "title") =>
  rows.map((r) => ({ value: r._id, label: r[label] || r.name || r._id }));
const select = (name, label, choices) =>
  field(name, label, "select", { options: choices });
const choices = (values) =>
  values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
const reason = () => field("reason", "Decision reason / basis", "textarea");
function AccountApprovals() {
  const { data, loading, error, refresh } = useUsers({
    status: "pending",
    limit: 5,
  });
  return (
    <Card
      title="Pending User Approvals"
      subtitle="Account access is separate from course admission"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={refresh} />
      ) : data.users.length ? (
        <UserTable users={data.users} refresh={refresh} />
      ) : (
        <EmptyState
          title="All registrations reviewed"
          description="New account requests will appear here."
        />
      )}
    </Card>
  );
}
export default function LifecyclePage({ view: explicitView }) {
  const { user } = useAuth(),
    location = useLocation(),
    toast = useToast();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(null),
    [rankings, setRankings] = useState(null),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(() => setRevision((v) => v + 1), []),
    close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    service
      .get()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  const path = explicitView || location.pathname.split("/").pop();
  const aliases = {
    trainee: "overview",
    trainer: "overview",
    admin: "overview",
    dashboard: "overview",
    courses: "planning",
    "my-learning": "nominations",
    "learning-path": "needs",
    "skill-gaps": "coverage",
    "competency-passport": "coverage",
    competencies: "coverage",
    "training-needs": "needs",
    "evidence-review": "evidence",
    reports: "coverage",
    "organizational-insights": "coverage",
    "audit-logs": "audit",
    trainees: "enrollments",
  };
  const view = aliases[path] || path;
  const open = (title, action, fields, build, description) =>
    setDialog({ title, action, fields, build, description });
  const action = (label, onClick, disabled = false) => (
    <Button
      key={label}
      variant="secondary"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {label}
    </Button>
  );
  const decide = (title, command, base, description) =>
    open(
      title,
      command,
      [reason()],
      (v) => ({ ...base, reason: v.reason }),
      description,
    );
  const can = (batch, permission) =>
    batch?.permissions.some(
      (p) => same(p.user, user) && p.actions.includes(permission),
    );
  const coordinator = (batch) =>
    user.role === "admin" && same(batch?.coordinator, user);
  async function work(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <LoadingState label="Loading authorized lifecycle records…" />;
  if (!data) return <ErrorState message={error} retry={refresh} />;
  const d = data;
  const batchOf = (id) => d.batches.find((b) => same(b, id));
  const courseOf = (id) => d.courses.find((c) => same(c, id));
  const person = (id) =>
    d.directory.find((u) => same(u, id))?.name || "Restricted user";
  const titleOf = (rows, id) =>
    rows.find((r) => same(r, id))?.title || String(id).slice(-6);
  const table = (title, rows, columns, description, controls) => (
    <Card
      key={title}
      title={title}
      subtitle={description}
      action={controls}
      className="mb-6"
    >
      {rows.length ? (
        <Table rows={rows} columns={columns} />
      ) : (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="Authorized records will appear here as the workflow progresses."
        />
      )}
    </Card>
  );
  const c = (key, label, render) => ({ key, label, render });
  const state = (key = "state", label = "State") =>
    c(key, label, (r) => <StatusBadge status={r[key]} />);
  const name = c("owner", "Person", (r) => person(r.owner));
  const batchCol = c("batch", "Batch", (r) => titleOf(d.batches, r.batch));
  const decisionFields = [
    select(
      "eligibility",
      "Eligibility",
      choices(["NEEDS_INFORMATION", "ELIGIBLE", "INELIGIBLE"]),
    ),
    reason(),
  ];
  const rulesFor = (batch) => d.rules.find((r) => same(r, batch.ruleVersion));
  const ownNeeds = d.needs.filter((n) => same(n.owner, user));
  const nominate = (batch) =>
    open(
      "Draft nomination",
      "nominate",
      [
        select(
          "need",
          "Your training need",
          options(
            ownNeeds
              .filter((n) => !n.course || same(n.course, batch.course))
              .map((n) => ({ ...n, title: n.reason })),
          ),
        ),
        field("information", "Submitted professional information", "textarea"),
        field("qualifications", "Qualifications (comma separated)"),
        field("resources", "Your private attachments", "multiselect", {
          required: false,
          options: options(
            d.resources.filter((r) => same(r.owner, user)),
            "filename",
          ),
        }),
      ],
      (v) => ({
        batch: batch._id,
        need: v.need,
        information: v.information,
        qualifications: list(v.qualifications),
        resources: list(v.resources),
      }),
      "A preview does not decide eligibility. Final review uses the submitted information and evidence.",
    );
  const coverage = [];
  for (const enrollment of d.enrollments.filter(
    (e) => e.completion !== "WITHDRAWN",
  )) {
    const course = courseOf(batchOf(enrollment.batch)?.course);
    for (const id of course?.intendedCompetencies || []) {
      if (
        coverage.some(
          (r) => same(r.owner, enrollment.owner) && same(r.competency, id),
        )
      )
        continue;
      const competency = d.competencies.find((c) => same(c, id));
      const records = d.records
        .filter(
          (r) =>
            same(r.owner, enrollment.owner) &&
            same(r.competency, id) &&
            r.rubricVersion === competency?.rubricVersion,
        )
        .sort(
          (a, b) =>
            new Date(b.reviewedAt || b.updatedAt) -
            new Date(a.reviewedAt || a.updatedAt),
        );
      const record = records[0];
      const jobRole = d.directory.find((u) =>
        same(u, enrollment.owner),
      )?.jobRole;
      const requirement = d.requirements.find(
        (r) =>
          same(r.jobRole, jobRole) &&
          same(r.competency, id) &&
          r.rubricVersion === competency?.rubricVersion,
      );
      coverage.push({
        _id: `${enrollment.owner}-${id}`,
        owner: enrollment.owner,
        competency: id,
        record,
        requirement,
        outcome: record?.outcome || "NOT_ASSESSED",
      });
    }
  }
  const reviewed = coverage.filter((r) =>
    ["DEMONSTRATED", "NEEDS_PRACTICE"].includes(r.outcome),
  );
  const missing = coverage.filter((r) => r.outcome === "NOT_ASSESSED");
  const title =
    {
      overview: "Capacity-building workspace",
      planning: "Courses & rule versions",
      nominations: "Nominations",
      batches: "Batches & session planning",
      trainers: "Trainer availability & assignments",
      assessments: "Assessments & evaluations",
      enrollments: "Learning, results & certificates",
      evidence: "Competency evidence review",
      coverage: "Task evidence coverage",
      needs: "Training needs & follow-up",
      notifications: "Notifications",
      audit: "Decision audit",
    }[view] || "Capacity-building workspace";
  const overview = (
    <>
      <div className="kpi-grid">
        {[
          [
            "Pending nominations",
            d.nominations.filter((n) =>
              [
                "SUBMITTED",
                "RESUBMITTED",
                "UNDER_REVIEW",
                "WAITLISTED",
              ].includes(n.state),
            ).length,
            Users,
          ],
          [
            "Active batches",
            d.batches.filter((b) => b.state === "IN_PROGRESS").length,
            CalendarDays,
          ],
          [
            "Demonstrated tasks",
            coverage.filter((r) => r.outcome === "DEMONSTRATED").length,
            FileCheck2,
          ],
          ["Not assessed", missing.length, ClipboardCheck],
        ].map(([label, value, icon]) => (
          <KpiCard
            key={label}
            {...{ label, value, icon }}
            note="Authorized synthetic demo records"
          />
        ))}
      </div>
      <Card title="A connected, human-controlled journey" className="mb-6">
        <p className="muted">
          Training need → Nomination → Eligibility review → Admission → Learning
          → Assessment → Evaluation → Published result → Competency evidence
          review → Feedback → Follow-up.
        </p>
        <p className="mt-4">
          {reviewed.length} of {coverage.length} person–task records have
          reviewed evidence. This denominator covers visible enrolled people and
          intended course tasks; it is not an organizational competence
          estimate.
        </p>
        <p className="muted mt-2">
          Course completion:{" "}
          {d.enrollments.filter((e) => e.completion === "COMPLETED").length} of{" "}
          {d.enrollments.filter((e) => e.completion !== "WITHDRAWN").length}{" "}
          visible enrollments. Current recorded demand: {d.needs.length}{" "}
          training needs; not a forecast.
        </p>
        <div className="flex gap-3 flex-wrap mt-4">
          {[
            ["Courses", "courses"],
            ["Nominations", "nominations"],
            ["Learning & results", "enrollments"],
            ["Evidence", "evidence"],
            ["Follow-up", "follow-ups"],
          ].map(([label, route]) => (
            <Link
              key={route}
              className="button button-secondary"
              to={`/${user.role}/${route}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>
      {user.role === "admin" && <AccountApprovals />}
    </>
  );
  const planning = (
    <>
      <div className="workflow-toolbar">
        <label className="field">
          Search programmes
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
          />
        </label>
        {user.role === "admin" &&
          action("Create course", () =>
            open(
              "Create proposed course",
              "createCourse",
              [
                field("title", "Course title"),
                field("subject", "Subject"),
                field("description", "Description", "textarea"),
                select("competency", "Intended competency", [
                  { value: "", label: "No mapping" },
                  ...options(d.competencies),
                ]),
              ],
              (v) => ({
                title: v.title,
                subject: v.subject,
                description: v.description,
                intendedCompetencies: v.competency ? [v.competency] : [],
              }),
            ),
          )}
      </div>
      {table(
        "Training programmes",
        d.courses.filter((c) =>
          c.title.toLowerCase().includes(query.toLowerCase()),
        ),
        [
          c("title", "Sample Training Programme"),
          c("subject", "Subject"),
          c("description", "Description"),
          c("actions", "Planning", (course) => (
            <div className="table-actions">
              {same(course.owner, user) &&
                action("Define rule version", () =>
                  open(
                    "Approve new rule version",
                    "defineRules",
                    [
                      field("version", "Version number", "number", {
                        value:
                          Math.max(
                            0,
                            ...d.rules
                              .filter((r) => same(r.course, course))
                              .map((r) => r.version),
                          ) + 1,
                        min: 1,
                      }),
                      field(
                        "qualifications",
                        "Required applicant qualifications (comma separated)",
                        "text",
                        { required: false },
                      ),
                      field(
                        "instructions",
                        "Eligibility review instructions",
                        "textarea",
                      ),
                      field(
                        "prerequisites",
                        "Required trainer qualifications (comma separated)",
                        "text",
                        { required: false },
                      ),
                      field("mcq", "MCQ passing score / 100", "number", {
                        value: 60,
                        min: 0,
                        max: 100,
                      }),
                      field(
                        "practical",
                        "Practical passing score / 100",
                        "number",
                        { value: 60, min: 0, max: 100 },
                      ),
                      select(
                        "written",
                        "Enable written examination",
                        choices(["NO", "YES"]),
                      ),
                      field(
                        "writtenPass",
                        "Written passing score / 100",
                        "number",
                        { value: 60, min: 0, max: 100 },
                      ),
                      select(
                        "viva",
                        "Enable viva record",
                        choices(["NO", "YES"]),
                      ),
                      field("vivaPass", "Viva passing score / 100", "number", {
                        value: 60,
                        min: 0,
                        max: 100,
                      }),
                      select(
                        "evidence",
                        "Certificate requires reviewed demonstrated evidence",
                        choices(["NO", "YES"]),
                      ),
                    ],
                    (v) => ({
                      course: course._id,
                      version: Number(v.version),
                      eligibility: {
                        requiredQualifications: list(v.qualifications),
                        instructions: v.instructions,
                      },
                      assessmentKinds: [
                        "MCQ",
                        "PRACTICAL",
                        ...(v.written === "YES" ? ["WRITTEN"] : []),
                        ...(v.viva === "YES" ? ["VIVA"] : []),
                      ],
                      passing: {
                        MCQ: Number(v.mcq),
                        PRACTICAL: Number(v.practical),
                        ...(v.written === "YES"
                          ? { WRITTEN: Number(v.writtenPass) }
                          : {}),
                        ...(v.viva === "YES"
                          ? { VIVA: Number(v.vivaPass) }
                          : {}),
                      },
                      certificate: {
                        requireCompletion: true,
                        requirePublishedPass: true,
                        requireDemonstratedEvidence: v.evidence === "YES",
                      },
                      trainerPrerequisites: list(v.prerequisites),
                    }),
                    "Creates an immutable approved version. Existing batches keep their pinned version. Thresholds are synthetic examples, not universal IMD rules.",
                  ),
                )}
            </div>
          )),
        ],
        "Intended learning outcomes do not automatically become acquired competencies.",
      )}
      {table("Approved rule versions", d.rules, [
        c("course", "Course", (r) => titleOf(d.courses, r.course)),
        c("version", "Version"),
        c("eligibility", "Eligibility", (r) => (
          <span>
            {r.eligibility.instructions}
            <br />
            Required:{" "}
            {r.eligibility.requiredQualifications.join(", ") ||
              "None configured"}
          </span>
        )),
        c("passing", "Assessment / passing", (r) =>
          r.assessmentKinds.map((k) => `${k}: ${r.passing[k]}/100`).join("; "),
        ),
        c(
          "certificate",
          "Certificate conditions",
          (r) =>
            `Completion: ${r.certificate.requireCompletion}; published pass: ${r.certificate.requirePublishedPass}; demonstrated evidence: ${r.certificate.requireDemonstratedEvidence}`,
        ),
        c(
          "actions",
          "Batch",
          (r) =>
            same(r.owner, user) &&
            action("Create batch", () =>
              open(
                "Create batch with pinned rules",
                "createBatch",
                [
                  field("title", "Batch title"),
                  field("capacity", "Seat capacity", "number", {
                    value: 10,
                    min: 1,
                  }),
                  field("session", "Session title"),
                  field("subject", "Session subject", "text", {
                    value: courseOf(r.course)?.subject,
                  }),
                  field("start", "Session starts", "datetime-local"),
                  field("end", "Session ends", "datetime-local"),
                ],
                (v) => ({
                  ruleVersion: r._id,
                  title: v.title,
                  capacity: Number(v.capacity),
                  sessions: [
                    {
                      title: v.session,
                      subject: v.subject,
                      start: new Date(v.start).toISOString(),
                      end: new Date(v.end).toISOString(),
                    },
                  ],
                }),
              ),
            ),
        ),
      ])}
    </>
  );
  const batches = table(
    "Batches",
    d.batches,
    [
      c("title", "Batch"),
      state(),
      c("admitted", "Seats", (b) => `${b.admitted} / ${b.capacity}`),
      c(
        "ruleVersion",
        "Pinned rules",
        (b) => `Version ${rulesFor(b)?.version}`,
      ),
      c("sessions", "Sessions", (b) =>
        b.sessions.map((s) => (
          <p key={s._id}>
            {s.title}
            <br />
            {fmt(s.start)} – {fmt(s.end)}
          </p>
        )),
      ),
      c("actions", "Actions", (b) => (
        <div className="table-actions flex-wrap">
          {coordinator(b) &&
            b.state !== "COMPLETED" &&
            action(
              b.state === "PLANNED"
                ? "Open nominations"
                : b.state === "NOMINATIONS_OPEN"
                  ? "Start learning"
                  : "Complete batch",
              () =>
                decide("Change batch state", "batchState", {
                  batch: b._id,
                  state: {
                    PLANNED: "NOMINATIONS_OPEN",
                    NOMINATIONS_OPEN: "IN_PROGRESS",
                    IN_PROGRESS: "COMPLETED",
                  }[b.state],
                }),
            )}
          {user.role === "trainee" &&
            b.state === "NOMINATIONS_OPEN" &&
            !d.nominations.some((n) => same(n.batch, b)) &&
            action("Draft nomination", () => nominate(b), !ownNeeds.length)}
          {coordinator(b) &&
            action("Assign permissions", () =>
              open(
                "Explicit batch permissions",
                "grantPermission",
                [
                  select(
                    "user",
                    "Assignee",
                    options(
                      d.directory.filter((p) =>
                        ["trainer", "admin"].includes(p.role),
                      ),
                      "name",
                    ),
                  ),
                  select(
                    "permission",
                    "Permission assignment",
                    choices([
                      "CREATE_ASSESSMENT",
                      "EVALUATE",
                      "PUBLISH_RESULT",
                      "REVIEW_EVIDENCE",
                      "REMOVE_ALL",
                    ]),
                  ),
                  reason(),
                ],
                (v) => ({
                  batch: b._id,
                  user: v.user,
                  actions:
                    v.permission === "REMOVE_ALL"
                      ? []
                      : [
                          ...new Set([
                            ...(b.permissions.find((p) => same(p.user, v.user))
                              ?.actions || []),
                            v.permission,
                          ]),
                        ],
                  reason: v.reason,
                }),
                "Evidence review requires an explicitly assigned reviewer; an admin role alone is insufficient.",
              ),
            )}
        </div>
      )),
    ],
    "Planning: create course → approve rule version → create batch and sessions → open nominations.",
  );
  const nominations = table(
    "Nominations",
    d.nominations,
    [
      name,
      batchCol,
      state(),
      state("eligibility", "Eligibility"),
      c("information", "Submitted information", (n) => (
        <details>
          <summary>Information & decision history</summary>
          <p>{n.information}</p>
          <p>Qualifications: {n.qualifications.join(", ") || "Not supplied"}</p>
          {n.resources.map((id) => (
            <p key={id}>
              Attachment:{" "}
              {d.resources.find((r) => same(r, id))?.filename ||
                "Restricted attachment"}
            </p>
          ))}
          {n.history.map((h, i) => (
            <p key={i}>
              {h.to} · {fmt(h.at)} · {h.reason}
            </p>
          ))}
        </details>
      )),
      c("actions", "Actions", (n) => {
        const own = same(n.owner, user),
          coord = coordinator(batchOf(n.batch));
        return (
          <div className="table-actions flex-wrap">
            {own && ["DRAFT", "RETURNED"].includes(n.state) && (
              <>
                {action("Edit information", () =>
                  open(
                    "Correct nomination",
                    "editNomination",
                    [
                      field(
                        "information",
                        "Submitted information",
                        "textarea",
                        { value: n.information },
                      ),
                      field(
                        "qualifications",
                        "Qualifications (comma separated)",
                        "text",
                        { value: n.qualifications.join(", "), required: false },
                      ),
                      field(
                        "resources",
                        "Your private attachments",
                        "multiselect",
                        {
                          value: n.resources.join(", "),
                          required: false,
                          options: options(
                            d.resources.filter((r) => same(r.owner, user)),
                            "filename",
                          ),
                        },
                      ),
                    ],
                    (v) => ({
                      nomination: n._id,
                      information: v.information,
                      qualifications: list(v.qualifications),
                      resources: list(v.resources),
                    }),
                  ),
                )}
                {action(n.state === "DRAFT" ? "Submit" : "Resubmit", () =>
                  decide(
                    "Submit for final eligibility review",
                    "nominationState",
                    {
                      nomination: n._id,
                      state: n.state === "DRAFT" ? "SUBMITTED" : "RESUBMITTED",
                    },
                  ),
                )}
              </>
            )}
            {coord &&
              ["SUBMITTED", "RESUBMITTED"].includes(n.state) &&
              action("Begin review", () =>
                decide("Begin eligibility review", "nominationState", {
                  nomination: n._id,
                  state: "UNDER_REVIEW",
                }),
              )}
            {coord && n.state === "UNDER_REVIEW" && (
              <>
                {action("Review eligibility", () =>
                  open(
                    "Review submitted eligibility",
                    "reviewEligibility",
                    decisionFields,
                    (v) => ({ nomination: n._id, ...v }),
                    `Pinned requirements: ${rulesFor(batchOf(n.batch))?.eligibility.requiredQualifications.join(", ") || "None"}. Review the submitted evidence; do not rely on the preview.`,
                  ),
                )}
                {["RETURNED", "WAITLISTED", "APPROVED", "REJECTED"].map(
                  (state) =>
                    action(state, () =>
                      decide(`Nomination ${state}`, "nominationState", {
                        nomination: n._id,
                        state,
                      }),
                    ),
                )}
              </>
            )}
            {coord &&
              n.state === "WAITLISTED" &&
              action("Approve available seat", () =>
                decide("Approve available seat", "nominationState", {
                  nomination: n._id,
                  state: "APPROVED",
                }),
              )}
            {own &&
              !["REJECTED", "WITHDRAWN"].includes(n.state) &&
              action("Withdraw", () =>
                decide("Withdraw nomination", "nominationState", {
                  nomination: n._id,
                  state: "WITHDRAWN",
                }),
              )}
          </div>
        );
      }),
    ],
    "Eligibility is separate from nomination state. Returned and rejected decisions require a reason.",
  );
  const trainerView = (
    <>
      {table(
        "Session trainer planning",
        d.batches
          .filter(coordinator)
          .flatMap((b) => b.sessions.map((s) => ({ ...s, batch: b._id }))),
        [
          c("title", "Session"),
          batchCol,
          c("start", "Schedule", (s) => `${fmt(s.start)} – ${fmt(s.end)}`),
          c("actions", "Recommendations", (s) =>
            action("Find eligible trainers", () =>
              work(async () =>
                setRankings({
                  batch: s.batch,
                  session: s._id,
                  rows: await service.matching(s.batch, s._id),
                }),
              ),
            ),
          ),
        ],
        "Mandatory prerequisites, approved relevant expertise, exact-session availability and no conflicts precede ranking.",
      )}
      {rankings &&
        table(
          "Trainer recommendations",
          rankings.rows.map((r) => ({ ...r, _id: r.trainer })),
          [
            c("name", "Trainer"),
            c("eligible", "Eligible", (r) => (r.eligible ? "Yes" : "No")),
            c("points", "Recommendation points", (r) => r.points ?? "—"),
            c("explanation", "Explanation / missing information"),
            c(
              "actions",
              "Coordinator decision",
              (r) =>
                r.eligible &&
                action("Assign to session", () =>
                  decide(
                    "Approve session trainer",
                    "assignTrainer",
                    {
                      batch: rankings.batch,
                      sessionId: rankings.session,
                      trainer: r.trainer,
                    },
                    "Record your reason, including any departure from the ranking.",
                  ),
                ),
            ),
          ],
          rankings.rows.some((r) => r.eligible)
            ? "Points are explained recommendations, not a probability or a competence percentage."
            : "No eligible trainer available.",
        )}
      {table("Trainer assignments", d.assignments, [
        c("trainer", "Trainer", (r) => person(r.trainer)),
        batchCol,
        state(),
        c("start", "Session start", (r) => fmt(r.start)),
        c("reason", "Decision reason"),
      ])}
      {table(
        "Approved expertise",
        d.expertise,
        [
          c("trainer", "Trainer", (r) => person(r.trainer)),
          c("subject", "Subject"),
          state("status", "Review"),
          c("qualifications", "Qualifications", (r) =>
            r.qualifications.join(", "),
          ),
          c("teachingYears", "Relevant teaching years"),
          c("basis", "Approval basis"),
        ],
        undefined,
        user.role === "admin" &&
          action("Review trainer expertise", () =>
            open(
              "Review relevant trainer expertise",
              "expertise",
              [
                select(
                  "trainer",
                  "Trainer",
                  options(
                    d.directory.filter((u) => u.role === "trainer"),
                    "name",
                  ),
                ),
                field("subject", "Exact subject"),
                field(
                  "qualifications",
                  "Approved qualifications (comma separated)",
                ),
                field("teachingYears", "Relevant teaching years", "number", {
                  min: 0,
                  max: 60,
                  value: 0,
                }),
                select("status", "Decision", choices(["APPROVED", "REJECTED"])),
                field("basis", "Review basis / evidence", "textarea"),
              ],
              (v) => ({
                ...v,
                qualifications: list(v.qualifications),
                teachingYears: Number(v.teachingYears),
              }),
            ),
          ),
      )}
      {table(
        "Trainer availability",
        d.availability,
        [
          c("trainer", "Trainer", (r) => person(r.trainer)),
          c("start", "From", (r) => fmt(r.start)),
          c("end", "To", (r) => fmt(r.end)),
          c("available", "Availability", (r) =>
            r.available ? "Available" : "Unavailable",
          ),
          c("reason", "Reason"),
        ],
        undefined,
        ["trainer", "admin"].includes(user.role) &&
          action("Record availability", () =>
            open(
              "Record session availability",
              "availability",
              [
                ...(user.role === "admin"
                  ? [
                      select(
                        "trainer",
                        "Trainer",
                        options(
                          d.directory.filter((u) => u.role === "trainer"),
                          "name",
                        ),
                      ),
                    ]
                  : []),
                field("start", "From", "datetime-local"),
                field("end", "To", "datetime-local"),
                select("available", "Availability", choices(["YES", "NO"])),
                reason(),
              ],
              (v) => ({
                trainer: user.role === "trainer" ? user._id : v.trainer,
                start: new Date(v.start).toISOString(),
                end: new Date(v.end).toISOString(),
                available: v.available === "YES",
                reason: v.reason,
              }),
              "Unavailable periods flag affected sessions. Only a coordinator can approve replacements.",
            ),
          ),
      )}
    </>
  );
  const assessmentView = (
    <>
      {table(
        "Assessments",
        d.assessments,
        [
          c("title", "Task"),
          batchCol,
          c("kind", "Type"),
          c("published", "Publication", (a) =>
            a.published ? "Published" : "Draft",
          ),
          c("instructions", "Task / sources", (a) => (
            <details>
              <summary>Read task</summary>
              <p>{a.instructions}</p>
              {a.questions.map((q, i) => (
                <div key={i}>
                  <strong>{q.prompt}</strong>
                  <p>{q.options.join(" / ")}</p>
                  <p>
                    Source: {q.sourcePassage} — {q.sourcePage}
                  </p>
                </div>
              ))}
            </details>
          )),
          c("actions", "Actions", (a) => (
            <div className="table-actions">
              {!a.published &&
                can(batchOf(a.batch), "CREATE_ASSESSMENT") &&
                action("Publish assessment", () =>
                  decide(
                    "Trainer approval of assessment",
                    "publishAssessment",
                    { assessment: a._id },
                  ),
                )}
              {a.published &&
                d.enrollments.some(
                  (e) =>
                    same(e.batch, a.batch) &&
                    same(e.owner, user) &&
                    e.completion !== "WITHDRAWN",
                ) &&
                !d.submissions.some(
                  (s) => same(s.assessment, a) && same(s.owner, user),
                ) &&
                action("Submit response", () =>
                  open(
                    "Submit assessment response",
                    "submit",
                    a.kind === "MCQ"
                      ? a.questions.map((q, i) =>
                          select(
                            `answer${i}`,
                            q.prompt,
                            q.options.map((label, index) => ({
                              label,
                              value: String(index),
                            })),
                          ),
                        )
                      : [
                          field(
                            "text",
                            "Practical / written / viva response",
                            "textarea",
                          ),
                          field(
                            "resources",
                            "Your private attachments",
                            "multiselect",
                            {
                              required: false,
                              options: options(
                                d.resources.filter((r) => same(r.owner, user)),
                                "filename",
                              ),
                            },
                          ),
                        ],
                    (v) => ({
                      assessment: a._id,
                      text: v.text || "",
                      resources: list(v.resources || ""),
                      answers:
                        a.kind === "MCQ"
                          ? a.questions.map((_, i) => Number(v[`answer${i}`]))
                          : [],
                    }),
                    "MCQ scores are provisional until evaluated and officially published.",
                  ),
                )}
            </div>
          )),
        ],
        "Assessment creation, evaluation, result publication and evidence review have separate permissions.",
        d.batches.some((b) => can(b, "CREATE_ASSESSMENT")) &&
          action("Draft assessment", () =>
            open(
              "Draft assessment",
              "createAssessment",
              [
                select(
                  "batch",
                  "Batch",
                  options(d.batches.filter((b) => can(b, "CREATE_ASSESSMENT"))),
                ),
                field("title", "Assessment title"),
                select(
                  "kind",
                  "Assessment type",
                  choices(["MCQ", "PRACTICAL", "WRITTEN", "VIVA"]),
                ),
                field("instructions", "Task instructions", "textarea"),
                select("competency", "Task competency", [
                  { value: "", label: "No competency mapping" },
                  ...options(d.competencies),
                ]),
                field("question", "MCQ question (MCQ only)", "textarea", {
                  required: false,
                }),
                field("option0", "MCQ option 1", "text", { required: false }),
                field("option1", "MCQ option 2", "text", { required: false }),
                select(
                  "correctIndex",
                  "MCQ correct option",
                  choices(["0", "1"]),
                ),
                field(
                  "sourcePassage",
                  "MCQ supporting source passage",
                  "textarea",
                  { required: false },
                ),
                field("sourcePage", "MCQ source page", "text", {
                  required: false,
                }),
              ],
              (v) => ({
                batch: v.batch,
                title: v.title,
                kind: v.kind,
                instructions: v.instructions,
                ...(v.competency
                  ? {
                      competency: v.competency,
                      rubricVersion: d.competencies.find((c) =>
                        same(c, v.competency),
                      ).rubricVersion,
                    }
                  : {}),
                questions:
                  v.kind === "MCQ"
                    ? [
                        {
                          prompt: v.question,
                          options: [v.option0, v.option1],
                          correctIndex: Number(v.correctIndex),
                          sourcePassage: v.sourcePassage,
                          sourcePage: v.sourcePage,
                        },
                      ]
                    : [],
              }),
              "Manual draft. Only types configured in the batch rule version are accepted.",
            ),
          ),
      )}
      {table("Submissions", d.submissions, [
        name,
        c("assessment", "Assessment", (s) =>
          titleOf(d.assessments, s.assessment),
        ),
        c("text", "Response", (s) => (
          <details>
            <summary>Read submitted evidence</summary>
            <p>{s.text || "MCQ responses submitted"}</p>
            <p>
              Attachments:{" "}
              {s.resources
                .map(
                  (id) =>
                    d.resources.find((r) => same(r, id))?.filename ||
                    "Restricted attachment",
                )
                .join(", ") || "None"}
            </p>
          </details>
        )),
        c("automaticScore", "Provisional MCQ score", (s) =>
          s.automaticScore === undefined ? "—" : `${s.automaticScore}/100`,
        ),
        c("actions", "Action", (s) => (
          <div className="table-actions">
            {can(batchOf(s.batch), "EVALUATE") &&
              !same(s.owner, user) &&
              !d.evaluations.some((e) => same(e.submission, s)) &&
              action("Evaluate", () =>
                open(
                  "Human evaluation",
                  "evaluate",
                  [
                    field("score", "Score / 100", "number", {
                      value: s.automaticScore ?? "",
                      min: 0,
                      max: 100,
                    }),
                    field("comments", "Evaluation comments", "textarea"),
                  ],
                  (v) => ({
                    submission: s._id,
                    score: Number(v.score),
                    comments: v.comments,
                  }),
                  "MCQ evaluation retains the automatically calculated score. Result publication remains separate.",
                ),
              )}
            {same(s.owner, user) &&
              d.assessments.find((a) => same(a, s.assessment))?.competency &&
              !d.evidence.some((e) => same(e.submission, s)) &&
              action("Use as evidence", () => {
                const a = d.assessments.find((a) => same(a, s.assessment));
                work(async () => {
                  await service.act("submitEvidence", {
                    submission: s._id,
                    competency: a.competency,
                    rubricVersion: a.rubricVersion,
                  });
                  toast("Submission reused as evidence.");
                  refresh();
                });
              })}
          </div>
        )),
      ])}
      {table("Human evaluations", d.evaluations, [
        c("submission", "Submission", (e) => String(e.submission).slice(-6)),
        c("score", "Score / 100"),
        c("comments", "Comments"),
        c("evaluator", "Evaluator", (r) => person(r.evaluator)),
      ])}
    </>
  );
  const enrollments = (
    <>
      {table("Learning enrollments", d.enrollments, [
        name,
        batchCol,
        state("completion", "Completion"),
        c("actions", "Human-controlled actions", (e) => (
          <div className="table-actions flex-wrap">
            {coordinator(batchOf(e.batch)) &&
              e.completion !== "COMPLETED" &&
              e.completion !== "WITHDRAWN" &&
              action("Record completion", () =>
                decide(
                  "Record course completion",
                  "completeLearning",
                  { enrollment: e._id },
                  "Completion does not publish results or demonstrate competency.",
                ),
              )}
            {can(batchOf(e.batch), "PUBLISH_RESULT") &&
              !d.results.some((r) => same(r.enrollment, e)) &&
              action("Publish result", () =>
                decide(
                  "Approve official result publication",
                  "publishResult",
                  { enrollment: e._id },
                  "All configured assessments must have submissions and human evaluations.",
                ),
              )}
            {coordinator(batchOf(e.batch)) &&
              d.results.some((r) => same(r.enrollment, e)) &&
              !d.certificates.some((c) => same(c.enrollment, e)) &&
              action("Issue certificate", () =>
                decide(
                  "Approve configured certificate",
                  "issueCertificate",
                  { enrollment: e._id },
                  "Only configured conditions are certified. This is not an expert designation.",
                ),
              )}
            {same(e.owner, user) &&
              d.results.some((r) => same(r.enrollment, e)) &&
              !d.feedback.some((f) => same(f.enrollment, e)) &&
              action("Course feedback", () =>
                open(
                  "Identified course feedback",
                  "feedback",
                  [
                    field("rating", "Rating (1–5)", "number", {
                      min: 1,
                      max: 5,
                    }),
                    field("comments", "Feedback", "textarea"),
                  ],
                  (v) => ({
                    enrollment: e._id,
                    rating: Number(v.rating),
                    comments: v.comments,
                  }),
                  "This feedback is identified. Your coordinator can see your response with your account. It is not anonymous.",
                ),
              )}
            {coordinator(batchOf(e.batch)) &&
              action("Create follow-up", () =>
                open(
                  "Create follow-up and new need",
                  "followUp",
                  [
                    field("action", "Follow-up action", "textarea"),
                    field("dueAt", "Due date", "datetime-local"),
                    select(
                      "nextAction",
                      "New need",
                      choices([
                        "ASSESSMENT",
                        "EVIDENCE_SUBMISSION",
                        "TRAINING",
                      ]),
                    ),
                    select("evidence", "Related reviewed evidence", [
                      { value: "", label: "No evidence link" },
                      ...d.evidence
                        .filter(
                          (x) =>
                            same(x.owner, e.owner) && same(x.batch, e.batch),
                        )
                        .map((x) => ({
                          value: x._id,
                          label: `${titleOf(d.competencies, x.competency)} — ${x.status}`,
                        })),
                    ]),
                  ],
                  (v) => ({
                    enrollment: e._id,
                    action: v.action,
                    dueAt: new Date(v.dueAt).toISOString(),
                    nextAction: v.nextAction,
                    ...(v.evidence ? { evidence: v.evidence } : {}),
                  }),
                  "Missing evidence calls for assessment or evidence submission, not an automatic training-gap diagnosis.",
                ),
              )}
          </div>
        )),
      ])}
      {table(
        "Published results",
        d.results,
        [
          name,
          batchCol,
          state("outcome", "Result"),
          c("publishedAt", "Published", (r) => fmt(r.publishedAt)),
          c("publishedBy", "Authorized publisher", (r) =>
            person(r.publishedBy),
          ),
        ],
        "Official demonstration results do not automatically create competency records.",
      )}
      {table("Issued certificates", d.certificates, [
        name,
        c("serial", "Certificate reference"),
        c("issuedAt", "Issued", (r) => fmt(r.issuedAt)),
        c("statement", "What it establishes"),
      ])}
      {table(
        "Identified course feedback",
        d.feedback,
        [name, c("rating", "Rating"), c("comments", "Feedback")],
        "Responses are visible to the respondent and batch coordinator. Feedback is not used for trainer ranking.",
      )}
    </>
  );
  const evidenceView = table(
    "Competency evidence",
    d.evidence,
    [
      name,
      c("competency", "Task & rubric", (e) => (
        <details>
          <summary>
            {titleOf(d.competencies, e.competency)} · {e.rubricVersion}
          </summary>
          {d.competencies
            .find((c) => same(c, e.competency))
            ?.levels.map((l) => (
              <p key={l.level}>
                Synthetic level {l.level}: {l.definition}
              </p>
            ))}
        </details>
      )),
      state("status", "Evidence status"),
      c("submission", "Reused submission", (e) => (
        <details>
          <summary>{String(e.submission).slice(-6)}</summary>
          <p>{d.submissions.find((s) => same(s, e.submission))?.text}</p>
          {e.supplement?.text && <p>Supplement: {e.supplement.text}</p>}
          <p>{e.review?.comments}</p>
        </details>
      )),
      c("outcome", "Competency outcome", (e) => (
        <StatusBadge
          status={
            d.records.find((r) => same(r.evidence, e))?.outcome ||
            "NOT_ASSESSED"
          }
        />
      )),
      c("actions", "Review action", (e) => (
        <div className="table-actions">
          {e.status === "SUBMITTED" &&
            can(batchOf(e.batch), "REVIEW_EVIDENCE") &&
            !same(e.owner, user) &&
            action("Review evidence", () =>
              open(
                "Task-specific competency review",
                "reviewEvidence",
                [
                  select(
                    "status",
                    "Evidence decision",
                    choices(["ACCEPTED", "RETURNED", "REJECTED"]),
                  ),
                  select(
                    "outcome",
                    "Competency outcome",
                    choices(["DEMONSTRATED", "NEEDS_PRACTICE", "NOT_ASSESSED"]),
                  ),
                  select("level", "Demonstrated level", [
                    { value: "", label: "No demonstrated level" },
                    ...(
                      d.competencies.find((c) => same(c, e.competency))
                        ?.levels || []
                    ).map((l) => ({
                      value: String(l.level),
                      label: `Synthetic ${l.level}: ${l.definition}`,
                    })),
                  ]),
                  field(
                    "comments",
                    "Review comments and justification",
                    "textarea",
                  ),
                  field(
                    "reviewDueAt",
                    "Next evidence review due (optional)",
                    "datetime-local",
                    { required: false },
                  ),
                ],
                (v) => ({
                  evidence: e._id,
                  status: v.status,
                  outcome: v.outcome,
                  comments: v.comments,
                  ...(v.level ? { demonstratedLevel: Number(v.level) } : {}),
                  ...(v.reviewDueAt
                    ? { reviewDueAt: new Date(v.reviewDueAt).toISOString() }
                    : {}),
                }),
                "Returned or rejected evidence must remain NOT_ASSESSED. Review-due dates do not change competence outcomes.",
              ),
            )}
          {same(e.owner, user) &&
            e.status === "RETURNED" &&
            action("Supplement & resubmit", () =>
              open(
                "Resubmit returned evidence",
                "resubmitEvidence",
                [
                  field("text", "Supplementary response", "textarea"),
                  field(
                    "resources",
                    "Your private attachments",
                    "multiselect",
                    {
                      required: false,
                      options: options(
                        d.resources.filter((r) => same(r.owner, user)),
                        "filename",
                      ),
                    },
                  ),
                  reason(),
                ],
                (v) => ({
                  evidence: e._id,
                  ...v,
                  resources: list(v.resources),
                }),
              ),
            )}
        </div>
      )),
    ],
    "Self-declared skills and uploaded certificates do not establish demonstrated competency.",
  );
  const frameworkControls = user.role === "admin" && (
    <div className="workflow-toolbar flex-wrap">
      {action("Define synthetic rubric", () =>
        open(
          "Define a new synthetic competency rubric",
          "defineCompetency",
          [
            field("title", "Competency task title"),
            field("rubricVersion", "New rubric version"),
            field("task", "Task description", "textarea"),
            field("level1", "Synthetic level 1 definition", "textarea"),
            field("level2", "Synthetic level 2 definition", "textarea"),
            field("level3", "Synthetic level 3 definition", "textarea"),
          ],
          (v) => ({
            title: v.title,
            rubricVersion: v.rubricVersion,
            task: v.task,
            levels: [1, 2, 3].map((level) => ({
              level,
              definition: v[`level${level}`],
            })),
          }),
          "These are synthetic task levels, not an official WMO/IMD framework. New versions do not alter existing reviews.",
        ),
      )}
      {action("Define job role", () =>
        open(
          "Define proposed professional role",
          "defineJobRole",
          [
            field("title", "Professional role title"),
            field("description", "Role description", "textarea"),
          ],
          (v) => v,
        ),
      )}
      {action("Define role requirement", () =>
        open(
          "Define compatible task requirement",
          "defineRequirement",
          [
            select("jobRole", "Professional role", options(d.jobRoles)),
            select(
              "competency",
              "Competency and rubric",
              d.competencies.map((c) => ({
                value: c._id,
                label: `${c.title} — ${c.rubricVersion}`,
              })),
            ),
            field("requiredLevel", "Required synthetic level", "number", {
              min: 1,
              max: 100,
            }),
          ],
          (v) => ({
            ...v,
            rubricVersion: d.competencies.find((c) => same(c, v.competency))
              .rubricVersion,
            requiredLevel: Number(v.requiredLevel),
          }),
        ),
      )}
      {action("Assign job role", () =>
        open(
          "Assign proposed professional role",
          "assignJobRole",
          [
            select("user", "Person", options(d.directory, "name")),
            select("jobRole", "Professional role", options(d.jobRoles)),
            reason(),
          ],
          (v) => v,
          "This changes a professional role reference, never access permissions.",
        ),
      )}
    </div>
  );
  const coverageView = (
    <>
      {frameworkControls}
      <Card title="Coverage denominator & evidence dates" className="mb-6">
        <p>
          {reviewed.length} / {coverage.length} visible person–task records have
          reviewed evidence for this task set. Not assessed: {missing.length}.
          Dates are shown for each decision below.
        </p>
        <p className="muted mt-2">
          Intended course outcomes define this task set; they are not
          automatically acquired skills. Compare levels only within the same
          competency and rubric version. These synthetic levels are not an
          official WMO/IMD framework.
        </p>
      </Card>
      {table("Task evidence coverage", coverage, [
        name,
        c("competency", "Task", (r) => titleOf(d.competencies, r.competency)),
        state("outcome", "Review outcome"),
        c(
          "level",
          "Compatible levels",
          (r) =>
            `Required: ${r.requirement?.requiredLevel ?? "Not configured"}; demonstrated: ${r.record?.demonstratedLevel ?? "Not assessed"}; rubric ${r.record?.rubricVersion || d.competencies.find((c) => same(c, r.competency))?.rubricVersion}`,
        ),
        c("date", "Evidence date", (r) => fmt(r.record?.reviewedAt)),
        c("due", "Review due", (r) =>
          r.record?.reviewDueAt ? fmt(r.record.reviewDueAt) : "Not scheduled",
        ),
        c("recommendation", "Next step", (r) =>
          r.outcome === "NOT_ASSESSED"
            ? "Request assessment or evidence submission"
            : r.outcome === "UNDER_REVIEW"
              ? "Await authorized human review"
              : r.outcome === "NEEDS_PRACTICE"
                ? "Review task feedback and agree practice"
                : r.requirement &&
                    r.record.demonstratedLevel < r.requirement.requiredLevel
                  ? "Discuss the reviewed task-level difference"
                  : "No automatic change; follow the reviewed task decision",
        ),
      ])}
      {table("Synthetic competency framework", d.competencies, [
        c("title", "Task"),
        c("rubricVersion", "Rubric version"),
        c("levels", "Plain-language levels", (c) => (
          <div>
            {c.levels.map((l) => (
              <p key={l.level}>
                Synthetic {l.level}: {l.definition}
              </p>
            ))}
          </div>
        )),
      ])}
    </>
  );
  const needs = (
    <>
      {table(
        "Training needs",
        d.needs,
        [
          name,
          c("reason", "Identified need"),
          c("action", "Proposed next action"),
          c("followUp", "Follow-up link", (n) =>
            n.followUp ? String(n.followUp).slice(-6) : "Initial need",
          ),
        ],
        "Current recorded demand, not a forecast.",
        action("Identify need", () =>
          open(
            "Identify a training or assessment need",
            "createNeed",
            [
              select("course", "Course", options(d.courses)),
              select(
                "action",
                "Next action",
                choices(["ASSESSMENT", "EVIDENCE_SUBMISSION", "TRAINING"]),
              ),
              reason(),
            ],
            (v) => v,
            "No reviewed evidence means NOT_ASSESSED, not zero ability.",
          ),
        ),
      )}
      {table("Follow-up actions", d.followUps, [
        name,
        c("action", "Action"),
        c("dueAt", "Due", (r) => fmt(r.dueAt)),
        state(),
        c("newNeed", "New training need", (r) =>
          String(r.newNeed || "").slice(-6),
        ),
        c(
          "actions",
          "Action",
          (r) =>
            r.state === "OPEN" &&
            action("Mark action done", () =>
              decide("Complete follow-up action", "completeFollowUp", {
                followUp: r._id,
              }),
            ),
        ),
      ])}
    </>
  );
  const notifications = table(
    "Notifications",
    d.notifications,
    [
      c("message", "Update"),
      c("createdAt", "Date", (n) => fmt(n.createdAt)),
      c("readAt", "Read", (n) =>
        n.readAt
          ? "Read"
          : action("Mark read", () =>
              work(async () => {
                await service.act("readNotification", { notification: n._id });
                refresh();
              }),
            ),
      ),
    ],
    "Only your own notifications are shown.",
  );
  const audit = table(
    "Decision audit",
    d.auditLogs,
    [
      c("at", "Timestamp", (r) => fmt(r.at)),
      c("actor", "Actor", (r) => person(r.actor)),
      c("action", "Action"),
      c("entityType", "Record type"),
      c("entityId", "Record ID"),
      c("reason", "Reason / basis"),
    ],
    "Most recent 100 authorized decisions. Audit access is scoped to the actor or batch coordinator.",
  );
  const files = table(
    "Private resources",
    d.resources,
    [
      c("filename", "File"),
      c("purpose", "Purpose"),
      c("size", "Bytes"),
      c("actions", "Download", (r) =>
        action("Download", () => work(() => service.download(r))),
      ),
    ],
    "PDF, PNG, JPEG or UTF-8 text, maximum 5 MB. Downloads require server authorization.",
    <label className="button button-secondary">
      Upload file
      <input
        className="sr-only"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.txt"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const allowed = d.batches.filter(
            (b) =>
              coordinator(b) ||
              b.permissions.some((p) => same(p.user, user)) ||
              d.enrollments.some(
                (x) =>
                  same(x.batch, b) &&
                  same(x.owner, user) &&
                  x.completion !== "WITHDRAWN",
              ) ||
              (user.role === "trainee" && b.state === "NOMINATIONS_OPEN"),
          );
          setDialog({
            title: "Choose private file destination",
            action: "__upload",
            fields: [
              select("batch", "Batch", options(allowed)),
              select(
                "purpose",
                "Purpose",
                choices(
                  user.role === "trainee"
                    ? ["NOMINATION", "SUBMISSION", "CERTIFICATE"]
                    : ["LEARNING", "SUBMISSION", "CERTIFICATE"],
                ),
              ),
            ],
            build: (v) => v,
            file,
          });
        }}
      />
    </label>,
  );
  const sections = {
    overview,
    planning,
    nominations: (
      <>
        {batches}
        {nominations}
      </>
    ),
    batches,
    trainers: trainerView,
    assessments: assessmentView,
    enrollments,
    evidence: evidenceView,
    coverage: coverageView,
    needs,
    notifications,
    audit,
    "follow-ups": needs,
  };
  return (
    <>
      <PageHeader
        eyebrow="SYNTHETIC IMD TRAINING DEMONSTRATION"
        title={title}
        description="Learning, published results and demonstrated capability are distinct records."
        action={action("Refresh", refresh)}
      />
      <div className="proposal-note">
        PROPOSED — TO BE VALIDATED WITH IMD. No SOP has been supplied. These
        rules and outcomes are synthetic; this is not an official IMD
        deployment.
      </div>
      {error && (
        <div role="alert" className="error-banner mb-6">
          {error}
        </div>
      )}
      {sections[view] || overview}
      {["planning", "assessments", "evidence", "nominations"].includes(view) &&
        files}
      {dialog && (
        <ActionDialog
          key={dialog.title}
          config={dialog}
          onClose={close}
          onDone={() => {
            setDialog(null);
            setRankings(null);
            toast("Action recorded.");
            refresh();
          }}
        />
      )}
    </>
  );
}
