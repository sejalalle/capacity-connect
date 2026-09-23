import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  Breadcrumbs,
  CompetencyComparison,
  EligibilityChecklist,
  Timeline,
} from "../../components/ui/Part2Components";
import { errorMessage } from "../../services/api";
import { part2 } from "../../services/part2Service";
import { part3 } from "../../services/part3Service";

const labels = {
  "competency-passport": "Competency Passport",
  "skill-gaps": "Skill Gaps",
  "training-needs": "Training Needs",
  "learning-paths": "Learning Paths",
  courses: "Courses",
  nominations: "My Nominations",
  batches: "Batches",
  calendar: "Training Calendar",
  notifications: "Notifications",
  competencies: "Competency Framework",
  "job-role-requirements": "Job Role Requirements",
  "audit-logs": "Audit Logs",
};
const descriptions = {
  "competency-passport":
    "Reviewed records and self-declared information are shown separately.",
  "skill-gaps":
    "Compare proposed job-role requirements with compatible reviewed records.",
  "training-needs":
    "Create, review and track justified capacity-building requests.",
  "learning-paths":
    "Published course sequences linked to approved development goals.",
  courses: "Create and manage owned courses, or browse published programmes.",
  nominations:
    "Track applications, corrections, decisions and confirmed admission.",
  batches: "Manage pinned rules, nomination windows and available capacity.",
  calendar: "Upcoming sample training dates in the configured batch timezone.",
  notifications: "Workflow decisions and actions that need your attention.",
  competencies:
    "Versioned synthetic task competencies and plain-language levels.",
  "job-role-requirements":
    "Proposed professional-role requirements, separate from access roles.",
  "audit-logs": "Read-only records of important workflow decisions.",
};
const fmt = (value, dateOnly = false) =>
  value
    ? new Intl.DateTimeFormat(
        "en-IN",
        dateOnly
          ? { dateStyle: "medium" }
          : { dateStyle: "medium", timeStyle: "short" },
      ).format(new Date(value))
    : "—";
const items = (data) => data?.items || data || [];

function ErrorPanel({ message, retry }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle />
      <div>
        <strong>Unable to load this page</strong>
        <p>{message}</p>
        <button className="button button-secondary" onClick={retry}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    </div>
  );
}
function Kpis({ values }) {
  return (
    <div className="kpi-grid">
      {Object.entries(values || {}).map(([key, value]) => (
        <div className="kpi" key={key}>
          <strong>{value}</strong>
          <span>
            {key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (c) => c.toUpperCase())}
          </span>
        </div>
      ))}
    </div>
  );
}
function DemoNote() {
  return <span className="demo-label">Demo data</span>;
}

export default function Part2Page({ view }) {
  const { user } = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    params = useParams(),
    toast = useToast();
  const segment = view || location.pathname.split("/")[2] || "dashboard";
  const detailId = params.id;
  const [passportComparisons, setPassportComparisons] = useState([]);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [loadedFor, setLoadedFor] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({});
  const title =
    segment === "dashboard"
      ? "Dashboard"
      : segment === "nominations" && user.role === "admin"
        ? "Nomination Review"
        : labels[segment] || "SAMARTHYA";
  const endpoint = useMemo(() => {
    if (segment === "dashboard") return "/dashboard";
    if (segment === "competency-passport") return "/competency-records/me";
    if (segment === "skill-gaps") return "/gaps/me";
    if (segment === "training-needs")
      return detailId ? `/training-needs/${detailId}` : "/training-needs";
    if (segment === "learning-paths")
      return user.role === "trainee"
        ? "/learning-paths/assignments/me"
        : "/learning-paths";
    if (segment === "courses")
      return detailId ? `/courses/${detailId}` : "/courses";
    if (segment === "nominations")
      return detailId ? `/nominations/${detailId}` : "/nominations";
    if (segment === "batches")
      return detailId ? `/batches/${detailId}` : "/batches";
    if (segment === "calendar") return "/calendar";
    if (segment === "notifications") return "/notifications";
    if (segment === "competencies") return "/competencies";
    if (segment === "job-role-requirements") return "/job-roles";
    if (segment === "audit-logs") return "/audit";
    return "/dashboard";
  }, [segment, detailId, user.role]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await part2.get(endpoint));
      if (endpoint === "/competency-records/me")
        setPassportComparisons(await part2.get("/gaps/me"));
      setLoadedFor(endpoint);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    if (segment !== "training-needs" || detailId) return;
    const query = new URLSearchParams(location.search);
    const competency = query.get("competency");
    if (competency && /^[a-f\d]{24}$/i.test(competency))
      setForm({
        title: query.get("title") || "Competency development request",
        competencyGoals: [competency],
        targetJobRole: user.jobRole?._id || user.jobRole || "",
        justification: "",
      });
  }, [location.search, segment, detailId, user.jobRole]);
  useEffect(() => {
    load();
    document.title = `${title} | SAMARTHYA`;
  }, [load, title]);
  const act = async (request, success) => {
    setBusy(true);
    try {
      await request();
      toast(success);
      setForm({});
      await load();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading || loadedFor !== endpoint)
    return <LoadingState label={`Loading ${title.toLowerCase()}…`} />;
  if (error)
    return (
      <>
        <Breadcrumbs items={["SAMARTHYA", title]} />
        <PageHeader title={title} />
        <ErrorPanel message={error} retry={load} />
      </>
    );
  const common = (
    <>
      <Breadcrumbs
        items={[
          user.role === "admin"
            ? "Coordinator"
            : user.role === "trainer"
              ? "Trainer"
              : "Trainee",
          title,
        ]}
      />
      <PageHeader
        eyebrow={<DemoNote />}
        title={title}
        description={
          descriptions[segment] ||
          "Role-specific capacity-building information."
        }
      />
    </>
  );

  if (segment === "dashboard")
    return (
      <>
        {common}
        <Kpis values={data.kpis} />
        {user.role === "admin" ? (
          <AdminDashboard data={data} />
        ) : user.role === "trainer" ? (
          <TrainerDashboard data={data} />
        ) : (
          <TraineeDashboard data={data} />
        )}
      </>
    );
  if (segment === "competency-passport")
    return (
      <>
        {common}
        <Card
          title="Current competency records"
          subtitle="Synthetic historical demonstration records are labelled; self-assessment does not verify a level."
        >
          <DataTable
            headers={[
              "Competency",
              "Required",
              "Human-verified level",
              "Assessment estimate",
              "Status",
              "Source",
              "Assessed",
            ]}
            rows={items(data).map((x) => [
              x.competency?.name,
              passportComparisons.find(
                (g) => g.competency?._id === x.competency?._id,
              )?.requiredLevel != null
                ? `L${passportComparisons.find((g) => g.competency?._id === x.competency?._id).requiredLevel}`
                : "No role requirement",
              x.demonstratedLevel == null
                ? "Not assessed"
                : `L${x.demonstratedLevel}`,
              "Not assessed",
              <StatusBadge status={x.status} />,
              x.sourceReference ? (
                <details>
                  <summary>Reviewed source</summary>
                  <p className="source-reference">{x.sourceReference}</p>
                </details>
              ) : (
                "No reviewed source"
              ),
              fmt(x.assessedAt, true),
            ])}
          />
        </Card>
        <div className="flex gap-3 my-6 flex-wrap">
          <Link
            className="button button-secondary"
            to="/trainee/competency-history"
          >
            View competency history
          </Link>
          <Link className="button button-secondary" to="/trainee/evidence">
            View evidence
          </Link>
        </div>
        <Card
          title="Self-declared profile skills"
          subtitle="These profile entries are separate from reviewed competency records."
        >
          <p>
            {user.skills?.length
              ? user.skills.join(", ")
              : "No self-declared skills added."}
          </p>
        </Card>
      </>
    );
  if (segment === "skill-gaps")
    return (
      <>
        {common}
        <div className="comparison-grid">
          {items(data).map((x) => (
            <CompetencyComparison key={x.competency?._id} item={x} />
          ))}
        </div>
        {!items(data).length && (
          <EmptyState
            title="No role requirements available"
            description="Ask a coordinator to assign a proposed job role before comparing requirements."
          />
        )}
      </>
    );
  if (segment === "training-needs")
    return (
      <>
        {common}
        {detailId ? (
          <NeedDetail
            row={data}
            user={user}
            form={form}
            setForm={setForm}
            busy={busy}
            act={act}
            navigate={navigate}
          />
        ) : (
          <NeedList
            data={data}
            user={user}
            form={form}
            setForm={setForm}
            busy={busy}
            act={act}
          />
        )}
      </>
    );
  if (segment === "learning-paths")
    return (
      <>
        {common}
        <PathList data={data} trainee={user.role === "trainee"} />
      </>
    );
  if (segment === "courses")
    return (
      <>
        {common}
        {detailId ? (
          <CourseDetail
            data={data}
            user={user}
            form={form}
            setForm={setForm}
            busy={busy}
            act={act}
            navigate={navigate}
          />
        ) : (
          <CourseList
            data={data}
            user={user}
            busy={busy}
            act={act}
            navigate={navigate}
          />
        )}
      </>
    );
  if (segment === "nominations")
    return (
      <>
        {common}
        {detailId ? (
          <NominationDetail
            row={data}
            user={user}
            form={form}
            setForm={setForm}
            busy={busy}
            act={act}
          />
        ) : (
          <NominationList data={data} role={user.role} />
        )}
      </>
    );
  if (segment === "batches")
    return (
      <>
        {common}
        {detailId ? (
          <BatchDetail data={data} user={user} />
        ) : (
          <BatchList data={data} />
        )}
      </>
    );
  if (segment === "calendar")
    return (
      <>
        {common}
        <CalendarList data={data} />
      </>
    );
  if (segment === "notifications")
    return (
      <>
        {common}
        <NotificationList data={data} busy={busy} act={act} />
      </>
    );
  if (segment === "competencies")
    return (
      <>
        {common}
        <CompetencyList
          data={data}
          user={user}
          form={form}
          setForm={setForm}
          busy={busy}
          act={act}
        />
      </>
    );
  if (segment === "job-role-requirements")
    return (
      <>
        {common}
        <RoleList
          data={data}
          user={user}
          form={form}
          setForm={setForm}
          busy={busy}
          act={act}
        />
      </>
    );
  if (segment === "audit-logs")
    return (
      <>
        {common}
        <AuditList data={data} />
      </>
    );
  return (
    <>
      {common}
      <EmptyState />
    </>
  );
}

function DataTable({ headers, rows }) {
  if (!rows.length) return <EmptyState />;
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
              {row.map((value, j) => (
                <td key={j}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TraineeDashboard({ data }) {
  return (
    <div className="dashboard-grid">
      <Card
        title="Your next step"
        className="span-2"
        action={
          <Link className="button button-primary" to="/trainee/learning">
            Continue learning <ArrowRight size={16} />
          </Link>
        }
      >
        {data.actionItems?.length ? (
          data.actionItems.map((x) => (
            <Link className="notice-row warning" to={x.path} key={x.path}>
              <AlertCircle />
              <span>
                <strong>{x.title}</strong>
                <small>{x.message}</small>
              </span>
              <ArrowRight />
            </Link>
          ))
        ) : (
          <p className="muted">No corrections are currently required.</p>
        )}
      </Card>
      <Card title="Upcoming training">
        {data.upcoming?.length ? (
          data.upcoming.map((x) => (
            <div className="list-row" key={x._id}>
              <CalendarDays />
              <span>
                <strong>{x.batch?.course?.title}</strong>
                <small>{fmt(x.batch?.startDate, true)}</small>
              </span>
            </div>
          ))
        ) : (
          <p className="muted">No confirmed upcoming batch.</p>
        )}
      </Card>
      <Card title="Recently assigned path">
        {data.assignment ? (
          <>
            <strong>{data.assignment.learningPath?.title}</strong>
            <p>{data.assignment.learningPath?.description}</p>
            <Link to="learning-paths">
              View path <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <p className="muted">No active learning path assignment.</p>
        )}
      </Card>
    </div>
  );
}
function AdminDashboard({ data }) {
  return (
    <div className="dashboard-grid">
      <Card
        title="Action queue"
        subtitle="Oldest submitted requests appear first"
        className="span-2"
      >
        <DataTable
          headers={["Type", "Applicant", "Item", "Status"]}
          rows={[
            ...(data.needs || []).map((x) => [
              "Training need",
              x.beneficiary?.name,
              <Link to={`training-needs/${x._id}`}>{x.title}</Link>,
              <StatusBadge status={x.status} />,
            ]),
            ...(data.nominations || []).map((x) => [
              "Nomination",
              x.trainee?.name,
              <Link to={`nominations/${x._id}`}>{x.course?.title}</Link>,
              <StatusBadge status={x.status} />,
            ]),
          ]}
        />
      </Card>
      <Card title="Batch occupancy">
        {data.batches?.map((x) => (
          <div className="occupancy" key={x._id}>
            <span>{x.course?.title}</span>
            <strong>
              {x.seatsAllocated}/{x.capacity}
            </strong>
            <div>
              <i
                style={{
                  width: `${Math.min(100, (x.seatsAllocated / x.capacity) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </Card>
      <Card title="Upcoming deadlines">
        {data.batches?.map((x) => (
          <div className="list-row" key={x._id}>
            <CalendarDays />
            <span>
              <strong>{x.name}</strong>
              <small>Nominations close {fmt(x.nominationClosesAt, true)}</small>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
function TrainerDashboard({ data }) {
  return (
    <div className="dashboard-grid">
      <Card title="Published courses">
        <p>
          Browse approved course metadata and intended outcomes relevant to
          training delivery.
        </p>
        <Link to="courses">
          View courses <ArrowRight size={15} />
        </Link>
      </Card>
      <Card title="Upcoming calendar">
        {data.upcoming?.map((x) => (
          <div className="list-row" key={x._id}>
            <CalendarDays />
            <span>
              <strong>{x.course?.title}</strong>
              <small>{fmt(x.startDate, true)}</small>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function NeedList({ data, user, form, setForm, busy, act }) {
  const rows = items(data);
  return (
    <div className="dashboard-grid">
      <Card title="Requests" className="span-2">
        <DataTable
          headers={["Need", "Beneficiary", "Priority", "Status", "Updated"]}
          rows={rows.map((x) => [
            <Link to={`${x._id}`}>{x.title}</Link>,
            x.beneficiary?.name,
            x.priority,
            <StatusBadge status={x.status} />,
            fmt(x.updatedAt, true),
          ])}
        />
      </Card>
      {user.role === "trainee" && (
        <Card
          title="Create training need"
          subtitle="A request may be based on a known gap or a manual justification."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(
                () => part2.post("/training-needs", form),
                "Draft training need saved",
              );
            }}
          >
            <label>
              Title *
              <input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              Justification *
              <textarea
                value={form.justification || ""}
                onChange={(e) =>
                  setForm({ ...form, justification: e.target.value })
                }
                required
                minLength={4}
              />
            </label>
            <label>
              Job role ID *
              <input
                value={form.targetJobRole || ""}
                onChange={(e) =>
                  setForm({ ...form, targetJobRole: e.target.value })
                }
                required
              />
            </label>
            <button disabled={busy} className="button button-primary">
              <Plus size={16} /> Save draft
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
function NeedDetail({ row, user, form, setForm, busy, act }) {
  const canEdit =
    user.role === "trainee" && ["DRAFT", "RETURNED"].includes(row.status);
  const next =
    user.role === "admin"
      ? { SUBMITTED: "UNDER_REVIEW", RESUBMITTED: "UNDER_REVIEW" }[row.status]
      : { DRAFT: "SUBMITTED", RETURNED: "RESUBMITTED" }[row.status];
  return (
    <div className="dashboard-grid">
      <Card title={row.title} action={<StatusBadge status={row.status} />}>
        <dl className="detail-list">
          <dt>Beneficiary</dt>
          <dd>{row.beneficiary?.name}</dd>
          <dt>Priority</dt>
          <dd>{row.priority}</dd>
          <dt>Justification</dt>
          <dd>{row.justification}</dd>
          <dt>Review comment</dt>
          <dd>{row.reviewReason || "No review comment"}</dd>
        </dl>
      </Card>
      <Card title="Status history">
        <Timeline events={row.history} />
      </Card>
      {next && (
        <Card title="Next action">
          <label>
            Reason
            <input
              value={form.reason || ""}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
          <button
            disabled={busy}
            className="button button-primary"
            onClick={() =>
              act(
                () =>
                  part2.post(`/training-needs/${row._id}/transitions`, {
                    status: next,
                    reason: form.reason,
                  }),
                `Training need moved to ${next.replaceAll("_", " ")}`,
              )
            }
          >
            {next.replaceAll("_", " ")}
          </button>
        </Card>
      )}
      {user.role === "admin" && row.status === "UNDER_REVIEW" && (
        <DecisionButtons
          base={`/training-needs/${row._id}/transitions`}
          revision={row.revision}
          form={form}
          setForm={setForm}
          busy={busy}
          act={act}
          states={["APPROVED", "RETURNED", "REJECTED"]}
        />
      )}{" "}
      {canEdit && (
        <p className="context-note">
          Edit the draft from the requests list before submitting. Submitted
          content is frozen during review.
        </p>
      )}
    </div>
  );
}
function DecisionButtons({ base, revision, form, setForm, busy, act, states }) {
  return (
    <Card
      title="Record decision"
      subtitle="Returned and rejected decisions require a precise reason."
    >
      <label>
        Decision reason *
        <textarea
          value={form.reason || ""}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          required
        />
      </label>
      <div className="button-row">
        {states.map((state) => (
          <button
            key={state}
            disabled={busy || !form.reason}
            className={`button ${state === "APPROVED" ? "button-primary" : "button-secondary"}`}
            onClick={() =>
              act(
                () =>
                  part2.post(base, {
                    status: state,
                    reason: form.reason,
                    expectedRevision: revision,
                  }),
                `${state.replaceAll("_", " ")} recorded`,
              )
            }
          >
            {state.replaceAll("_", " ")}
          </button>
        ))}
      </div>
    </Card>
  );
}
function PathList({ data, trainee }) {
  const rows = items(data);
  return (
    <div className="card-grid">
      {rows.map((x) => {
        const path = trainee ? x.learningPath : x;
        return (
          <Card
            key={x._id}
            title={path?.title}
            subtitle={`Version ${path?.version || x.learningPathVersion}`}
          >
            <p>{path?.description}</p>
            <ol className="path-steps">
              {path?.orderedCourseSteps
                ?.sort((a, b) => a.order - b.order)
                .map((step) => (
                  <li key={step._id}>
                    <span>{step.order}</span>
                    <div>
                      <strong>{step.course?.title}</strong>
                      <p>{step.explanation}</p>
                    </div>
                  </li>
                ))}
            </ol>
            <p className="context-note">
              Course completion alone does not establish demonstrated
              competency.
            </p>
          </Card>
        );
      })}
      {!rows.length && (
        <EmptyState
          title="No assigned learning path"
          description={
            trainee
              ? "An approved need can be linked to a published path by a coordinator."
              : "Create and publish a path for an approved development goal."
          }
        />
      )}
    </div>
  );
}
function CourseList({ data, user, busy, act, navigate }) {
  const role = user.role;
  const [draft, setDraft] = useState({ title: "", code: "" });
  return (
    <div className="dashboard-grid">
      {role === "trainer" && (
        <Card
          className="span-2 course-create"
          title="Create course"
          subtitle="Your approved trainer account can create and publish its own valid courses."
        >
          <label>
            Course title *
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Course code *
            <input
              value={draft.code}
              onChange={(e) =>
                setDraft({ ...draft, code: e.target.value.toUpperCase() })
              }
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy || !draft.title.trim() || !draft.code.trim()}
            onClick={() =>
              act(async () => {
                const row = await part2.post("/courses", draft);
                navigate(`/${role}/courses/${row._id}`);
              }, "Course draft created")
            }
          >
            <Plus size={16} /> Create Course
          </button>
        </Card>
      )}
      <Card
        title={
          role === "trainer"
            ? "My courses and published catalogue"
            : "Published programmes"
        }
        className="span-2"
      >
        <DataTable
          headers={[
            "Course",
            "Owner",
            "Domain",
            "Duration",
            "Difficulty",
            "Status",
          ]}
          rows={items(data).map((x) => [
            <Link to={`/${role}/courses/${x._id}`}>{x.title}</Link>,
            String(x.createdBy?._id || x.createdBy) === String(user._id)
              ? "You"
              : x.createdBy?.name || "Catalogue",
            x.domain || "Not set",
            x.duration?.value
              ? `${x.duration.value} ${x.duration.unit?.toLowerCase()}`
              : "Not set",
            x.difficulty || "Not set",
            <StatusBadge status={x.status} />,
          ])}
        />
      </Card>
    </div>
  );
}
function CourseDetail({ data, user, form, setForm, busy, act, navigate }) {
  const [eligibility, setEligibility] = useState(null);
  const course = data.course;
  return (
    <div className="dashboard-grid">
      <Card title={course.title} subtitle={course.code}>
        <p>{course.description}</p>
        <h3>Intended outcomes</h3>
        {course.competencyOutcomes.map((x) => (
          <p key={x._id}>
            {x.competency?.name}: target L{x.targetLevel}
          </p>
        ))}
        <p className="context-note">
          Mappings describe intended learning outcomes; they do not
          automatically update competency records.
        </p>
      </Card>
      {data.access?.canManage && (
        <CourseEditor data={data} busy={busy} act={act} />
      )}
      <Card title="Upcoming batches">
        {data.batches.map((batch) => (
          <div className="batch-option" key={batch._id}>
            <div>
              <strong>{batch.name}</strong>
              <small>
                {fmt(batch.startDate, true)} ·{" "}
                {batch.deliveryMode.replaceAll("_", " ")} ·{" "}
                {batch.seatsAllocated}/{batch.capacity} allocated
              </small>
            </div>
            {user.role === "trainee" && (
              <button
                className="button button-secondary"
                onClick={async () => {
                  setForm({ ...form, batch: batch._id });
                  setEligibility(
                    await part2.get(`/batches/${batch._id}/eligibility`),
                  );
                }}
              >
                Check eligibility
              </button>
            )}
          </div>
        ))}
      </Card>
      {eligibility && (
        <Card title="Batch eligibility">
          <EligibilityChecklist snapshot={eligibility} />
          {eligibility.status !== "INELIGIBLE" && (
            <>
              <label>
                Approved training need ID *
                <input
                  value={form.trainingNeed || ""}
                  onChange={(e) =>
                    setForm({ ...form, trainingNeed: e.target.value })
                  }
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
                disabled={busy || !form.trainingNeed || !form.reason}
                className="button button-primary"
                onClick={() =>
                  act(async () => {
                    const row = await part2.post("/nominations", form);
                    navigate(`/${user.role}/nominations/${row._id}`);
                  }, "Nomination draft saved")
                }
              >
                Create nomination draft
              </button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function CourseEditor({ data, busy, act }) {
  const course = data.course;
  const [draft, setDraft] = useState({
    title: course.title || "",
    code: course.code || "",
    description: course.description || "",
    domain: course.domain || "",
    category: course.category || "",
    difficulty: course.difficulty || "FOUNDATION",
    durationValue: course.duration?.value || "",
    durationUnit: course.duration?.unit || "HOURS",
    competencyOutcomes: (course.competencyOutcomes || []).map((x) => ({
      competency: x.competency?._id || x.competency,
      frameworkVersion: x.frameworkVersion,
      targetLevel: x.targetLevel,
    })),
  });
  const [competencies, setCompetencies] = useState([]);
  const [competencyLoading, setCompetencyLoading] = useState(true);
  const [competencyError, setCompetencyError] = useState("");
  const [moduleDraft, setModuleDraft] = useState({
    order: (data.modules?.length || 0) + 1,
    title: "",
    summary: "",
    completionRule: "VIEW",
    link: "",
    linkType: "VIDEO",
  });
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const loadCompetencies = useCallback(async () => {
    setCompetencyLoading(true);
    setCompetencyError("");
    try {
      const rows = [];
      let page = 1,
        pages = 1;
      do {
        const response = await part2.get("/competencies", { page, limit: 50 });
        rows.push(...items(response).filter((c) => c.status === "PUBLISHED"));
        pages = response.pagination?.pages || 1;
        page += 1;
      } while (page <= pages);
      setCompetencies(rows);
    } catch (error) {
      setCompetencyError(errorMessage(error));
    } finally {
      setCompetencyLoading(false);
    }
  }, []);
  useEffect(() => {
    loadCompetencies();
  }, [loadCompetencies]);
  const save = () =>
    act(
      () =>
        part2.patch(`/courses/${course._id}`, {
          title: draft.title,
          code: draft.code,
          description: draft.description,
          domain: draft.domain,
          category: draft.category,
          difficulty: draft.difficulty,
          duration: {
            value: Number(draft.durationValue),
            unit: draft.durationUnit,
          },
          competencyOutcomes: draft.competencyOutcomes,
        }),
      "Course draft saved",
    );
  const selectedCompetency = competencies.find(
    (x) => x._id === draft.selectedCompetency,
  );
  return (
    <div className="span-2 course-editor">
      <Card
        title="Course editor"
        subtitle={`Ownership: ${data.access.isOwner ? "You" : "Coordinator access"} · ${course.status}`}
        action={<StatusBadge status={course.status} />}
      >
        <div className="form-grid two-column">
          <label>
            Course title *
            <input
              disabled={course.status !== "DRAFT"}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Course code *
            <input
              disabled={course.status !== "DRAFT"}
              value={draft.code}
              onChange={(e) =>
                setDraft({ ...draft, code: e.target.value.toUpperCase() })
              }
            />
          </label>
          <label>
            Domain *
            <input
              disabled={course.status !== "DRAFT"}
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
            />
          </label>
          <label>
            Category *
            <input
              disabled={course.status !== "DRAFT"}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </label>
          <label>
            Difficulty *
            <select
              disabled={course.status !== "DRAFT"}
              value={draft.difficulty}
              onChange={(e) =>
                setDraft({ ...draft, difficulty: e.target.value })
              }
            >
              <option>FOUNDATION</option>
              <option>INTERMEDIATE</option>
              <option>ADVANCED</option>
            </select>
          </label>
          <label>
            Duration *
            <span className="inline-fields">
              <input
                disabled={course.status !== "DRAFT"}
                type="number"
                min="1"
                value={draft.durationValue}
                onChange={(e) =>
                  setDraft({ ...draft, durationValue: e.target.value })
                }
              />
              <select
                disabled={course.status !== "DRAFT"}
                value={draft.durationUnit}
                onChange={(e) =>
                  setDraft({ ...draft, durationUnit: e.target.value })
                }
              >
                <option>HOURS</option>
                <option>DAYS</option>
                <option>WEEKS</option>
              </select>
            </span>
          </label>
        </div>
        <label>
          Description *
          <textarea
            disabled={course.status !== "DRAFT"}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        {course.status === "DRAFT" && (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={save}
          >
            Save Draft
          </button>
        )}
      </Card>
      <Card
        title="Competency mapping"
        subtitle="Intended learning outcomes do not automatically establish competency."
      >
        {competencyLoading && (
          <p role="status">Loading published competencies…</p>
        )}
        {competencyError && <p role="alert">{competencyError}</p>}
        {!competencyLoading && !competencyError && !competencies.length && (
          <p role="status">
            No published competencies are available. A coordinator must publish
            the shared framework in Competency Framework. This does not require
            approval of your course.
          </p>
        )}
        <button
          className="button button-secondary"
          disabled={competencyLoading}
          onClick={loadCompetencies}
        >
          Refresh competencies
        </button>
        {draft.competencyOutcomes.map((x, index) => (
          <div className="batch-option" key={`${x.competency}-${index}`}>
            <span>
              {competencies.find((c) => c._id === x.competency)?.name ||
                x.competency}{" "}
              · target L{x.targetLevel}
            </span>
            {course.status === "DRAFT" && (
              <button
                className="button button-secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    competencyOutcomes: draft.competencyOutcomes.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {course.status === "DRAFT" && (
          <div className="form-grid two-column">
            <label>
              Published competency
              <select
                value={draft.selectedCompetency || ""}
                onChange={(e) => {
                  const comp = competencies.find(
                    (c) => c._id === e.target.value,
                  );
                  const defaultLevel = comp?.levels?.[0]?.value || 1;
                  setDraft({
                    ...draft,
                    selectedCompetency: e.target.value,
                    selectedLevel: defaultLevel,
                  });
                }}
              >
                <option value="">Select</option>
                {competencies.map((x) => (
                  <option value={x._id} key={x._id}>
                    {x.name} (v{x.version})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target level
              <select
                disabled={!selectedCompetency}
                value={draft.selectedLevel || ""}
                onChange={(e) =>
                  setDraft({ ...draft, selectedLevel: Number(e.target.value) })
                }
              >
                <option value="">Select defined level</option>
                {(selectedCompetency?.levels?.length
                  ? selectedCompetency.levels
                  : [1, 2, 3, 4, 5].map((v) => ({
                      value: v,
                      label: `Level ${v}`,
                    }))
                ).map((level) => (
                  <option key={level.value} value={level.value}>
                    L{level.value} — {level.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-secondary"
              disabled={
                !selectedCompetency ||
                !draft.selectedLevel ||
                draft.competencyOutcomes.some(
                  (x) => x.competency === draft.selectedCompetency,
                )
              }
              onClick={() =>
                setDraft({
                  ...draft,
                  competencyOutcomes: [
                    ...draft.competencyOutcomes,
                    {
                      competency: selectedCompetency._id,
                      frameworkVersion: selectedCompetency.version,
                      targetLevel: draft.selectedLevel || 1,
                    },
                  ],
                  selectedCompetency: "",
                })
              }
            >
              Add mapping
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                act(
                  () =>
                    part2.patch(`/courses/${course._id}`, {
                      competencyOutcomes: draft.competencyOutcomes,
                    }),
                  "Competency mappings saved",
                )
              }
            >
              Save competency mappings
            </button>
          </div>
        )}
      </Card>
      <Card
        title="Modules & resources"
        subtitle="PDF, PPT/PPTX, PNG, JPEG or text; maximum 5 MB. Files remain private and access-controlled."
      >
        {(data.modules || []).map((m) => (
          <div className="batch-option" key={m._id}>
            <div>
              <strong>
                {m.order}. {m.title}
              </strong>
              <small>
                Version {m.version} · {m.resources?.length || 0} resources
              </small>
            </div>
            <span>
              <StatusBadge status={m.status} />{" "}
              {m.status === "DRAFT" && (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(`/learning/modules/${m._id}/publish`, {}),
                      "Module published",
                    )
                  }
                >
                  Publish content
                </button>
              )}
              {m.status === "PUBLISHED" && (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() =>
                    act(
                      () =>
                        part3.post(`/learning/modules/${m._id}/revisions`, {}),
                      "Editable revision created",
                    )
                  }
                >
                  Create revision
                </button>
              )}
            </span>
          </div>
        ))}
        <div className="form-grid two-column">
          <label>
            Module order
            <input
              type="number"
              min="1"
              value={moduleDraft.order}
              onChange={(e) =>
                setModuleDraft({
                  ...moduleDraft,
                  order: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Module title
            <input
              value={moduleDraft.title}
              onChange={(e) =>
                setModuleDraft({ ...moduleDraft, title: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Summary
          <textarea
            value={moduleDraft.summary}
            onChange={(e) =>
              setModuleDraft({ ...moduleDraft, summary: e.target.value })
            }
          />
        </label>
        <label>
          Private learning file
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <label>
          Video or session link
          <input
            type="url"
            placeholder="https://…"
            value={moduleDraft.link}
            onChange={(e) =>
              setModuleDraft({ ...moduleDraft, link: e.target.value })
            }
          />
        </label>
        {localError && (
          <p className="field-error" role="alert">
            {localError}
          </p>
        )}
        <button
          className="button button-primary"
          disabled={busy || !moduleDraft.title || !moduleDraft.summary}
          onClick={async () => {
            setLocalError("");
            try {
              let uploaded;
              if (file)
                uploaded = await part3.uploadCourseFile(course._id, file);
              const resources = [
                ...(uploaded
                  ? [
                      {
                        title: uploaded.filename,
                        type:
                          uploaded.mimeType.includes("presentation") ||
                          uploaded.mimeType.includes("powerpoint")
                            ? "PRESENTATION"
                            : "PDF",
                        privateResource: uploaded._id,
                        restricted: true,
                      },
                    ]
                  : []),
                ...(moduleDraft.link
                  ? [
                      {
                        title: "Authorized learning link",
                        type: "VIDEO",
                        externalUrl: moduleDraft.link,
                        restricted: true,
                      },
                    ]
                  : []),
              ];
              await act(
                () =>
                  part3.post("/learning/modules", {
                    course: course._id,
                    order: moduleDraft.order,
                    title: moduleDraft.title,
                    summary: moduleDraft.summary,
                    completionRule: "VIEW",
                    announcement: "",
                    resources,
                  }),
                "Learning module draft created",
              );
            } catch (e) {
              setLocalError(errorMessage(e));
            }
          }}
        >
          <Plus size={16} /> Add module draft
        </button>
      </Card>
      <Card
        title="Preview"
        subtitle="This is how the course metadata will appear in the catalogue after publication."
      >
        <h3>{draft.title || "Untitled course"}</h3>
        <p>{draft.description || "Add a clear description."}</p>
        <p>
          {draft.domain || "Domain not set"} · {draft.difficulty} ·{" "}
          {draft.durationValue || "—"} {draft.durationUnit.toLowerCase()}
        </p>
      </Card>
      <Card title="Publication">
        <p>
          Publishing makes this valid course visible in the catalogue. It does
          not create a batch or approve nominations.
        </p>
        {course.status === "DRAFT" && (
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() =>
              act(
                () => part2.post(`/courses/${course._id}/publish`, {}),
                "Course published without additional approval",
              )
            }
          >
            Publish Course
          </button>
        )}
        {course.status === "PUBLISHED" && (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() =>
              act(
                () =>
                  part2.post(`/courses/${course._id}/archive`, {
                    reason: "Archived by course owner",
                  }),
                "Course archived",
              )
            }
          >
            Archive Course
          </button>
        )}
      </Card>
    </div>
  );
}
function NominationList({ data, role }) {
  return (
    <Card title={role === "admin" ? "Nomination review queue" : "Applications"}>
      <DataTable
        headers={[
          "Course",
          "Batch",
          "Applicant",
          "Eligibility",
          "Status",
          "Updated",
        ]}
        rows={items(data).map((x) => [
          <Link to={`/${role}/nominations/${x._id}`}>{x.course?.title}</Link>,
          x.batch?.name,
          x.trainee?.name,
          <StatusBadge
            status={x.eligibilitySnapshot?.status || "NOT_CHECKED"}
          />,
          <StatusBadge status={x.status} />,
          fmt(x.updatedAt, true),
        ])}
      />
    </Card>
  );
}
function NominationDetail({ row, user, form, setForm, busy, act }) {
  const next =
    user.role === "admin"
      ? { SUBMITTED: "UNDER_REVIEW", RESUBMITTED: "UNDER_REVIEW" }[row.status]
      : { DRAFT: "SUBMITTED", RETURNED: "RESUBMITTED" }[row.status];
  return (
    <div className="dashboard-grid">
      <Card
        title={row.course?.title}
        subtitle={row.batch?.name}
        action={<StatusBadge status={row.status} />}
      >
        <dl className="detail-list">
          <dt>Applicant</dt>
          <dd>{row.trainee?.name}</dd>
          <dt>Reason</dt>
          <dd>{row.reason}</dd>
          <dt>Decision comment</dt>
          <dd>{row.decisionReason || "No decision recorded"}</dd>
          <dt>Revision</dt>
          <dd>{row.revision}</dd>
        </dl>
        <EligibilityChecklist snapshot={row.eligibilitySnapshot} />
      </Card>
      <Card title="Decision history">
        <Timeline events={row.history} />
      </Card>
      {user.role === "trainee" && row.status === "RETURNED" && (
        <Card title="Correct nomination">
          <label>
            Correction response *
            <textarea
              value={form.correctionResponse || ""}
              onChange={(e) =>
                setForm({ ...form, correctionResponse: e.target.value })
              }
            />
          </label>
          <button
            disabled={busy || !form.correctionResponse}
            className="button button-primary"
            onClick={() =>
              act(async () => {
                await part2.patch(`/nominations/${row._id}`, {
                  correctionResponse: form.correctionResponse,
                });
                await part2.post(`/nominations/${row._id}/transitions`, {
                  status: "RESUBMITTED",
                  reason: "Requested correction supplied",
                });
              }, "Nomination corrected and resubmitted")
            }
          >
            Correct and resubmit
          </button>
        </Card>
      )}
      {next && !(user.role === "trainee" && row.status === "RETURNED") && (
        <Card title="Advance workflow">
          <button
            disabled={busy}
            className="button button-primary"
            onClick={() =>
              act(
                () =>
                  part2.post(`/nominations/${row._id}/transitions`, {
                    status: next,
                    reason: "Submitted for authorized review",
                  }),
                `Nomination moved to ${next.replaceAll("_", " ")}`,
              )
            }
          >
            {next.replaceAll("_", " ")}
          </button>
        </Card>
      )}
      {user.role === "admin" && row.status === "UNDER_REVIEW" && (
        <DecisionButtons
          base={`/nominations/${row._id}/transitions`}
          revision={row.revision}
          form={form}
          setForm={setForm}
          busy={busy}
          act={act}
          states={["APPROVED", "WAITLISTED", "RETURNED", "REJECTED"]}
        />
      )}
    </div>
  );
}
function BatchList({ data }) {
  return (
    <Card title="Course batches">
      <DataTable
        headers={["Batch", "Course", "Dates", "Mode", "Capacity", "Status"]}
        rows={items(data).map((x) => [
          <Link to={`${x._id}`}>{x.name}</Link>,
          x.course?.title,
          `${fmt(x.startDate, true)} – ${fmt(x.endDate, true)}`,
          x.deliveryMode.replaceAll("_", " "),
          `${x.seatsAllocated}/${x.capacity}`,
          <StatusBadge status={x.status} />,
        ])}
      />
    </Card>
  );
}
function BatchDetail({ data, user }) {
  const b = data.batch;
  return (
    <div className="dashboard-grid">
      <Card
        title={b.name}
        subtitle={`${b.course?.title} · rule version ${b.ruleVersion?.version}`}
        action={<StatusBadge status={b.status} />}
      >
        <dl className="detail-list">
          <dt>Dates</dt>
          <dd>
            {fmt(b.startDate, true)} – {fmt(b.endDate, true)} ({b.timezone})
          </dd>
          <dt>Delivery</dt>
          <dd>
            {b.deliveryMode.replaceAll("_", " ")} · {b.location}
          </dd>
          <dt>Seat allocation</dt>
          <dd>
            {data.activeEnrollments}/{b.capacity}
          </dd>
          <dt>Waitlisted</dt>
          <dd>{data.waitlisted}</dd>
        </dl>
      </Card>
      {user.role === "trainer" && (
        <Card
          title="Learning resources"
          subtitle="Manage this batch's content only when MANAGE_LEARNING access has been assigned."
        >
          <Link className="button button-primary" to="/trainer/learning">
            Open Learning Resources
          </Link>
        </Card>
      )}
      <Card title="Confirmed roster">
        <DataTable
          headers={["Name", "Department", "Designation"]}
          rows={(data.roster || []).map((x) => [
            x.trainee?.name,
            x.trainee?.department,
            x.trainee?.designation,
          ])}
        />
      </Card>
    </div>
  );
}
function CalendarList({ data }) {
  return (
    <Card
      title="Training dates"
      subtitle="List view; dates are shown using your browser locale."
    >
      <DataTable
        headers={["Programme", "Batch", "Start", "End", "Mode", "Status"]}
        rows={items(data).map((x) => [
          x.course?.title,
          x.name,
          fmt(x.startDate, true),
          fmt(x.endDate, true),
          x.deliveryMode.replaceAll("_", " "),
          <StatusBadge status={x.status} />,
        ])}
      />
    </Card>
  );
}
function NotificationList({ data, busy, act }) {
  return (
    <Card title="Notification centre">
      <div>
        {items(data).map((x) => (
          <div
            className={`notification-row ${x.readAt ? "" : "unread"}`}
            key={x._id}
          >
            <Bell />
            <span>
              <strong>{x.title}</strong>
              <p>{x.message}</p>
              <small>{fmt(x.createdAt)}</small>
            </span>
            {!x.readAt && (
              <button
                disabled={busy}
                className="button button-quiet"
                onClick={() =>
                  act(
                    () => part2.patch(`/notifications/${x._id}/read`, {}),
                    "Notification marked read",
                  )
                }
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
      {!items(data).length && <EmptyState title="No notifications" />}
    </Card>
  );
}
function CompetencyList({ data, user, form, setForm, busy, act }) {
  return (
    <div className="dashboard-grid">
      <Card title="Published framework" className="span-2">
        <DataTable
          headers={[
            "Code",
            "Competency",
            "Domain",
            "Version",
            "Levels",
            "Status",
            "Action",
          ]}
          rows={items(data).map((x) => [
            x.code,
            x.name,
            x.domain,
            `v${x.version}`,
            x.levels.map((l) => `L${l.value} ${l.label}`).join(" · "),
            <StatusBadge status={x.status} />,
            user.role === "admin" && x.status === "DRAFT" ? (
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() =>
                  act(
                    () => part2.post(`/competencies/${x._id}/publish`, {}),
                    "Competency published for course mapping",
                  )
                }
              >
                Publish competency
              </button>
            ) : (
              "—"
            ),
          ])}
        />
      </Card>
      {user.role === "admin" && (
        <Card
          title="Create competency version"
          subtitle="PROPOSED — TO BE VALIDATED WITH IMD. Add plain-language levels for this application configuration."
        >
          <label>
            Code *
            <input
              value={form.code || ""}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label>
            Competency name *
            <input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Domain *
            <input
              value={form.domain || ""}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            Level 1 definition *
            <textarea
              value={form.level1 || ""}
              onChange={(e) => setForm({ ...form, level1: e.target.value })}
            />
          </label>
          <label>
            Level 2 definition *
            <textarea
              value={form.level2 || ""}
              onChange={(e) => setForm({ ...form, level2: e.target.value })}
            />
          </label>
          <label>
            Level 3 definition (optional)
            <textarea
              value={form.level3 || ""}
              onChange={(e) => setForm({ ...form, level3: e.target.value })}
            />
          </label>
          <fieldset className="role-choices">
            <legend>Observable criteria</legend>
            <p>
              Criteria are versioned application rules. Evidence is reviewed by
              an authorized person; completing a course does not establish a
              level.
            </p>
            <label>
              Rubric version
              <input
                value={form.rubricVersion || ""}
                onChange={(e) =>
                  setForm({ ...form, rubricVersion: e.target.value })
                }
                placeholder="e.g. proposed-radar-v1"
              />
            </label>
            {[1, 2, 3].map((level) => (
              <div key={level} className="activity-item">
                <label>
                  Level {level} observable criterion
                  <textarea
                    value={form[`criterion${level}`] || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [`criterion${level}`]: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Level {level} evidence type
                  <select
                    value={form[`evidence${level}`] || "PRACTICAL_TASK"}
                    onChange={(e) =>
                      setForm({ ...form, [`evidence${level}`]: e.target.value })
                    }
                  >
                    <option value="PRACTICAL_TASK">Practical task</option>
                    <option value="PROJECT">Project</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="OTHER">Other reviewed evidence</option>
                  </select>
                </label>
                {level > 1 && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(form[`foundation${level}`])}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [`foundation${level}`]: e.target.checked,
                        })
                      }
                    />
                    Requires the previous level’s criterion
                  </label>
                )}
              </div>
            ))}
          </fieldset>
          <button
            className="button button-primary"
            disabled={
              busy ||
              !form.code ||
              !form.name ||
              !form.domain ||
              !form.level1 ||
              !form.level2
            }
            onClick={() =>
              act(
                () =>
                  part2.post("/competencies", {
                    code: form.code,
                    name: form.name,
                    domain: form.domain,
                    description: form.description || "",
                    version: 1,
                    levels: [1, 2, ...(form.level3 ? [3] : [])].map(
                      (value) => ({
                        value,
                        label: `Level ${value}`,
                        definition: form[`level${value}`],
                        criteria: form[`criterion${value}`]
                          ? [
                              {
                                criterionId: `${form.code.toUpperCase()}-L${value}`,
                                description: form[`criterion${value}`],
                                rubricVersion: form.rubricVersion || "",
                                evidenceTypes: [
                                  form[`evidence${value}`] || "PRACTICAL_TASK",
                                ],
                                foundationalCriteria: form[`foundation${value}`]
                                  ? [`${form.code.toUpperCase()}-L${value - 1}`]
                                  : [],
                              },
                            ]
                          : [],
                      }),
                    ),
                    status: "DRAFT",
                    isSynthetic: true,
                  }),
                "Draft competency version created",
              )
            }
          >
            Create draft version
          </button>
        </Card>
      )}
    </div>
  );
}
function RoleList({ data, user, form, setForm, busy, act }) {
  const [catalogue, setCatalogue] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [configurationError, setConfigurationError] = useState("");
  useEffect(() => {
    if (user.role !== "admin") return;
    let active = true;
    Promise.all([
      part2.get("/competencies", { limit: 50 }),
      Promise.all(
        items(data).map((role) =>
          part2
            .get(`/job-roles/${role._id}/requirements`)
            .then((rows) => rows.map((row) => ({ ...row, jobRole: role }))),
        ),
      ),
    ])
      .then(([competencies, grouped]) => {
        if (!active) return;
        setCatalogue(items(competencies));
        setRequirements(grouped.flat());
        setConfigurationError("");
      })
      .catch((error) => {
        if (active) setConfigurationError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [data, user.role]);
  return (
    <div className="dashboard-grid">
      <div className="card-grid span-2">
        {items(data).map((x) => (
          <Card
            key={x._id}
            title={x.title}
            action={<StatusBadge status={x.status} />}
          >
            <p>{x.description}</p>
            <small>
              Professional role; separate from application access role.
            </small>
          </Card>
        ))}
      </div>
      {user.role === "admin" && (
        <Card
          title="Create proposed professional role"
          subtitle="Access roles and professional roles remain separate."
        >
          <label>
            Role title *
            <input
              value={form.roleTitle || ""}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
          </label>
          <label>
            Description *
            <textarea
              value={form.roleDescription || ""}
              onChange={(e) =>
                setForm({ ...form, roleDescription: e.target.value })
              }
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy || !form.roleTitle || !form.roleDescription}
            onClick={() =>
              act(
                () =>
                  part2.post("/job-roles", {
                    title: form.roleTitle,
                    description: form.roleDescription,
                    isSynthetic: true,
                  }),
                "Proposed professional role created",
              )
            }
          >
            Create professional role
          </button>
        </Card>
      )}
      {user.role === "admin" && (
        <Card title="Add versioned requirement">
          {configurationError && (
            <p className="error-banner" role="alert">
              {configurationError}
            </p>
          )}
          <label>
            Professional role *
            <select
              value={form.jobRole || ""}
              onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
            >
              <option value="">Select role</option>
              {items(data).map((role) => (
                <option value={role._id} key={role._id}>
                  {role.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Competency *
            <select
              value={form.competency || ""}
              onChange={(e) => setForm({ ...form, competency: e.target.value })}
            >
              <option value="">Select competency</option>
              {catalogue.map((competency) => (
                <option value={competency._id} key={competency._id}>
                  {competency.code} · {competency.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Required level *
            <select
              value={form.requiredLevel || ""}
              onChange={(e) =>
                setForm({ ...form, requiredLevel: e.target.value })
              }
            >
              <option value="">Select level</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option value={level} key={level}>
                  L{level}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button-primary"
            disabled={
              busy || !form.jobRole || !form.competency || !form.requiredLevel
            }
            onClick={() =>
              act(
                () =>
                  part2.post(`/job-roles/${form.jobRole}/requirements`, {
                    competency: form.competency,
                    competencyVersion:
                      catalogue.find((row) => row._id === form.competency)
                        ?.version || 1,
                    requiredLevel: Number(form.requiredLevel),
                    priority: "HIGH",
                    version: 1,
                    effectiveAt: new Date().toISOString(),
                    isSynthetic: true,
                  }),
                "Professional-role requirement created",
              )
            }
          >
            Add requirement
          </button>
        </Card>
      )}
      {user.role === "admin" && (
        <Card title="Configured requirements" className="span-2">
          <DataTable
            headers={["Professional role", "Competency", "Level", "Version"]}
            rows={requirements.map((row) => [
              row.jobRole?.title,
              row.competency?.name,
              `L${row.requiredLevel}`,
              `v${row.version}`,
            ])}
          />
        </Card>
      )}
    </div>
  );
}
function AuditList({ data }) {
  return (
    <Card title="Decision audit">
      <DataTable
        headers={[
          "Time",
          "Actor",
          "Action",
          "Entity",
          "Transition",
          "Reason",
          "Correlation",
        ]}
        rows={items(data).map((x) => [
          fmt(x.timestamp),
          x.actor?.name,
          x.action,
          x.entityType,
          `${x.previousStatus || "—"} → ${x.newStatus || "—"}`,
          x.reason,
          x.correlationId,
        ])}
      />
    </Card>
  );
}
