import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import DetailModal, { DetailRows } from "../../components/ui/DetailModal";
import useApi, { fmtDate } from "../../hooks/useApi";
import { errorMessage } from "../../services/api";
import { part2 } from "../../services/part2Service";
import { part3 } from "../../services/part3Service";
import StatusBadge from "../../components/ui/StatusBadge";
import Part2Page from "../part2/Part2Page";
import Part3ModulePage from "../part3/Part3ModulePage";
import Part3BPage from "../part3/Part3BPage";
import FeedbackPage from "../feedback/FeedbackPage";
import TttPage from "../ttt/TttPage";

function Shell({title,description,children,action}){return <div className="trainer-experience"><div className="trainer-heading"><div><span>TRAINER PORTAL · SAMARTHYA</span><h1>{title}</h1><p>{description}</p></div>{action}</div>{children}</div>}
function PanelState({ loading, error, empty, onRetry, children }) {
  if (loading) return <section className="trainer-panel"><p>Loading…</p></section>;
  if (error) return <section className="trainer-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={onRetry}>Retry</button></section>;
  if (empty) return <section className="trainer-panel"><p>{empty}</p></section>;
  return children;
}

function Dashboard(){
  const {user}=useAuth();const name=user?.name||"Trainer";
  const dash = useApi(() => part3.get("/dashboard"), []);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const assignments = dash.data?.assignments || [];
  const active = assignments.filter((a) => a.status === "ACTIVE");
  const submissions = dash.data?.submissions || [];
  const pending = submissions.filter((s) => ["SUBMITTED","UNDER_EVALUATION"].includes(s.status));
  const upcoming = active.slice(0, 3);
  return <Shell title={`Good morning, ${name}!`} description="Assigned sessions, authored content and pending evaluations." action={<small>{fmtDate(new Date())}</small>}>
    <PanelState loading={dash.loading} error={dash.error} onRetry={dash.reload} empty={null}>
      <div className="trainer-stats">
        {[["Assigned sessions", active.length],["Authored questions", (dash.data?.questions||[]).length],["Assessments", (dash.data?.assessments||[]).length],["Pending evaluations", pending.length]].map(([t,n])=><div key={t}><b>{n}</b><span>{t}</span></div>)}
      </div>
      <div className="trainer-columns">
        <section className="trainer-panel"><div className="panel-title"><div><h2>Upcoming sessions</h2><p>Coordinator-assigned sessions in your scope.</p></div><Link to="/trainer/training-sessions">View all</Link></div>
          {upcoming.length ? upcoming.map((a)=><div className="session-row" key={a._id}><span><strong>{a.batch?.name || a.scopeTitle}</strong><small>{fmtDate(a.start, true)} · {a.batch?.course?.title || ""}</small></span><StatusBadge status={a.status} /><button onClick={() => setAssignmentDetail(a)}>View</button></div>) : <p className="muted">No assigned sessions in your scope.</p>}
        </section>
        <section className="trainer-panel"><div className="panel-title"><h2>Pending actions</h2><Link to="/trainer/evaluations">View all</Link></div>
          {pending.length ? pending.slice(0,4).map((s)=><p className="action-row" key={s._id}><b>1</b>{s.assessment?.title} · {s.trainee?.name}<Link to="/trainer/evaluations"><ArrowRight size={14}/></Link></p>) : <p className="muted">Nothing waiting on you.</p>}
          <p className="muted">Profile review: {dash.data?.profile?.reviewStatus || "SELF_DECLARED"} · Expertise records: {(dash.data?.expertise||[]).length}</p>
        </section>
      </div>
    </PanelState>
    {assignmentDetail && <DetailModal title={assignmentDetail.batch?.name || assignmentDetail.scopeTitle} subtitle={`${fmtDate(assignmentDetail.start, true)} · ${assignmentDetail.batch?.course?.title || ""}`} onClose={() => setAssignmentDetail(null)} actions={<Link className="button button-secondary" to="/trainer/training-sessions">Open sessions</Link>}><DetailRows rows={[["Status", assignmentDetail.status],["Decision reason", assignmentDetail.decisionReason || "—"],["Assigned at", fmtDate(assignmentDetail.assignedAt, true)]]}/></DetailModal>}
  </Shell>;
}

function CourseManagement(){
  const courses = useApi(() => part2.get("/courses"), []);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const rows = (courses.data?.items || courses.data || []).filter((c) => !query || c.title?.toLowerCase().includes(query.toLowerCase()));
  return <Shell title="Course management" description="Owned courses you may deliver. Creation stays in Courses; publishing rules are enforced server-side." action={<Link className="button button-primary" to="/trainer/courses">Open Courses</Link>}>
    <section className="trainer-panel"><div className="trainer-filters"><input placeholder="Search courses..." value={query} onChange={(e) => setQuery(e.target.value)}/></div>
      <PanelState loading={courses.loading} error={courses.error} onRetry={courses.reload} empty={rows.length || courses.loading || courses.error ? null : "No courses in your scope."}>
        <div className="trainer-table"><div className="tr-head">{["Course title","Code","Status","Action"].map(x=><b key={x}>{x}</b>)}</div>{rows.map((c)=><div className="tr-row" key={c._id}><span><i className="thumb">◌</i>{c.title}</span><span>{c.code}</span><StatusBadge status={c.status} /><button onClick={() => setDetail(c)}>Manage</button></div>)}</div>
      </PanelState></section>
    {detail && <DetailModal title={detail.title} subtitle={`${detail.code} · ${detail.status}`} onClose={() => setDetail(null)} actions={<Link className="button button-primary" to={`/trainer/courses/${detail._id}`}>Open course</Link>}><DetailRows rows={[["Domain", detail.domain || "—"],["Description", detail.description || "—"],["Outcomes", (detail.competencyOutcomes||[]).map((o)=>`${o.competency?.name || o.competency} L${o.targetLevel}`).join(", ") || "—"]]}/></DetailModal>}
  </Shell>;
}

function Assigned(){
  const roster = useApi(() => part3.get("/trainees"), []);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState("");
  const rows = (roster.data?.rows || []).filter((r) => !query || r.trainee?.name?.toLowerCase().includes(query.toLowerCase()));
  const batches = roster.data?.batches || [];
  return <Shell title="Assigned trainees" description="Confirmed admissions in batches you may deliver. Progress is recorded activity, not competency.">
    <section className="trainer-panel"><div className="trainer-filters"><input placeholder="Search trainees..." value={query} onChange={(e) => setQuery(e.target.value)}/><span className="muted">{batches.length} batches · {rows.length} trainees</span></div>
      <PanelState loading={roster.loading} error={roster.error} onRetry={roster.reload} empty={rows.length || roster.loading || roster.error ? null : "No confirmed trainees in your scope."}>
        <div className="trainer-table"><div className="tr-head">{["Name","Batch","Learning","Assessments","Result","Action"].map(x=><b key={x}>{x}</b>)}</div>{rows.map((r)=><div className="tr-row" key={r.enrollment}><span><i className="avatar">{(r.trainee?.name||"?").split(" ").map(x=>x[0]).join("")}</i>{r.trainee?.name}</span><span>{r.batch?.name}</span><span className="table-progress"><i style={{width:`${r.learning?.percent||0}%`}}/>{r.learning?.completed||0}/{r.learning?.total||0}</span><span>{r.assessments?.submitted ? `${r.assessments.submitted} submitted${r.assessments.bestPercentage != null ? ` · best ${r.assessments.bestPercentage}%` : ""}` : "Not attempted"}</span><span>{r.result ? `${r.result.outcome} ${r.result.percentage}%` : "Not published"}</span><button onClick={() => setDetail(r)}>View</button></div>)}</div>
      </PanelState></section>
    {detail && <DetailModal title={detail.trainee?.name} subtitle={`${detail.batch?.name} · ${detail.trainee?.designation || ""}`} onClose={() => setDetail(null)} wide actions={<Link className="button button-secondary" to="/trainer/evaluations">Open evaluations</Link>}><DetailRows rows={[["Email", detail.trainee?.email || "—"],["Learning", `${detail.learning?.completed||0}/${detail.learning?.total||0} modules (${detail.learning?.percent||0}%)`],["Assessments", detail.assessments?.submitted ? `${detail.assessments.submitted} submitted · best ${detail.assessments.bestPercentage ?? "—"}%` : "Not attempted"],["Evaluations", `pending ${detail.evaluations?.pending||0} · returned ${detail.evaluations?.returned||0} · evaluated ${detail.evaluations?.evaluated||0}`],["Result", detail.result ? `${detail.result.outcome} ${detail.result.percentage}% v${detail.result.version}` : "Not published"],["Evidence", `${detail.evidence?.verified||0} verified · ${detail.evidence?.pending||0} pending of ${detail.evidence?.total||0}`],["Last activity", fmtDate(detail.lastActivityAt, true)]]}/></DetailModal>}
  </Shell>;
}

function Resources(){
  const media = useApi(() => part3.media.list(), []);
  const [detail, setDetail] = useState(null);
  const assets = media.data?.assets || [];
  return <Shell title="Resource library" description="Recorded lectures you own or may deliver. Upload and moderation stay in Learning; playback never creates evidence." action={<Link className="button button-primary" to="/trainer/learning">Open learning</Link>}>
    <PanelState loading={media.loading} error={media.error} onRetry={media.reload} empty={assets.length || media.loading || media.error ? null : "No recordings in your scope."}>
      <section className="trainer-panel">{assets.map((a)=><div className="resource-row" key={a._id}><span><b>{a.title}</b><small>{a.course?.title} · {Math.round((a.size||0)/1024)} KB</small></span><StatusBadge status={a.status} /><button onClick={() => setDetail(a)}>⋮</button></div>)}</section>
    </PanelState>
    {detail && <DetailModal title={detail.title} subtitle={`${detail.course?.title || ""} · ${detail.status}`} onClose={() => setDetail(null)} actions={<Link className="button button-secondary" to="/trainer/learning">Open in learning</Link>}><DetailRows rows={[["Owner", detail.owner?.name || "—"],["Size", `${Math.round((detail.size||0)/1024)} KB`],["Status", detail.status],["Moderation", detail.moderationReason || "—"]]}/></DetailModal>}
  </Shell>;
}

function Assessments(){
  const list = useApi(() => part3.get("/assessments"), []);
  const bank = useApi(() => part3.get("/questions"), []);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [questionDetail, setQuestionDetail] = useState(null);
  const rows = Array.isArray(list.data) ? list.data : [];
  const questions = Array.isArray(bank.data) ? bank.data : [];
  return <Shell title="Assessment creation" description="Drafts, independent question review and publication. MCQ scoring is server-side; scores are evidence only." action={<Link className="button button-primary" to="/trainer/assessments">Open assessments</Link>}>
    <PanelState loading={list.loading} error={list.error} onRetry={list.reload} empty={rows.length || list.loading || list.error ? null : "No assessments in your scope."}>
      <section className="trainer-panel">{rows.map((a)=><div className="assessment-row" key={a._id}><span>{a.title}</span><span>{a.type}</span><span>{a.batch?.name}</span><span>{fmtDate(a.closesAt)}</span><StatusBadge status={a.status} /><button onClick={() => setAssessmentDetail(a)}>View</button></div>)}</section>
    </PanelState>
    <section className="trainer-panel"><h2>Question bank ({questions.length})</h2>{questions.slice(0,5).map((q)=><div className="assessment-row" key={q._id}><span>{q.questionKey}</span><span>{q.text?.slice(0,60)}</span><StatusBadge status={q.status} /><button onClick={() => setQuestionDetail(q)}>View</button></div>)}<Link to="/trainer/question-bank">Open question bank</Link></section>
    {assessmentDetail && <DetailModal title={assessmentDetail.title} subtitle={`${assessmentDetail.type} v${assessmentDetail.version} · ${assessmentDetail.status}`} onClose={() => setAssessmentDetail(null)} wide actions={<Link className="button button-primary" to="/trainer/assessments">Open assessment</Link>}><DetailRows rows={[["Batch", assessmentDetail.batch?.name || "—"],["Window", `${fmtDate(assessmentDetail.opensAt, true)} — ${fmtDate(assessmentDetail.closesAt, true)}`],["Instructions", assessmentDetail.instructions || "—"],["Questions", `${assessmentDetail.questionVersions?.length || 0} frozen versions`]]}/></DetailModal>}
    {questionDetail && <DetailModal title={questionDetail.questionKey} subtitle={`${questionDetail.course?.title || ""} v${questionDetail.version} · ${questionDetail.status}`} onClose={() => setQuestionDetail(null)}><DetailRows rows={[["Question", questionDetail.text || "—"],["Source", questionDetail.sourceReference || "—"],["Reviewer", questionDetail.reviewer?.name || "Awaiting independent review"]]}/></DetailModal>}
  </Shell>;
}

function Schedule({session=false}){
  const list = useApi(() => part3.get("/training-sessions"), []);
  const avail = useApi(() => part3.get("/availability"), []);
  const toast = { toast: (m) => m };
  const [sessionDetail, setSessionDetail] = useState(null);
  const [availDetail, setAvailDetail] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const batches = list.data?.batches || [];
  const summary = list.data?.summary || {};
  const sessions = batches.flatMap((b) => (b.sessions||[]).map((s) => ({ ...s, batchName: b.name, courseName: b.course?.title })));
  const shownSessions = session ? sessions.filter((s) => s.assignment?.status === "ACTIVE") : sessions;
  const saveAvailability = async () => {
    if (!form.start || !form.end || !form.reason) return;
    setSaving(true);
    try {
      await part3.post("/availability", { start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), available: form.available !== "false", reason: form.reason, deliveryModes: ["ONLINE","BLENDED"], locations: ["Demonstration Training Centre"], preferenceScore: 1 });
      setForm({});
      avail.reload();
      list.reload();
    } catch (e) { /* surfaced on reload */ } finally { setSaving(false); }
  };
  return <Shell title={session?"Training sessions":"Availability & capacity"} description={session?"Coordinator-assigned sessions. You cannot schedule or assign yourself.":"Declare availability; overlapping ACTIVE assignments flag for coordinator review."}>
    <PanelState loading={list.loading} error={list.error} onRetry={list.reload} empty={shownSessions.length || list.loading || list.error ? null : "No sessions in your scope."}>
      <p className="muted">Assigned {summary.assigned ?? "—"} of {summary.total ?? "—"} · unavailable {summary.unavailable ?? "—"} · upcoming {summary.upcoming ?? "—"}</p>
      <section className="trainer-panel">{shownSessions.map((s)=><div className="session-row" key={s._id}><span><strong>{s.title}</strong><small>{fmtDate(s.start, true)} · {s.batchName} · {s.assignment ? s.assignment.status : "Not assigned"}</small></span><button onClick={() => setSessionDetail(s)}>View</button></div>)}</section>
    </PanelState>
    {!session && <>
      <section className="trainer-panel"><h2>Availability windows</h2>
        <PanelState loading={avail.loading} error={avail.error} onRetry={avail.reload} empty={(avail.data||[]).length || avail.loading || avail.error ? null : "No availability declared."}>
          {(avail.data||[]).slice(0,5).map((a)=><div className="session-row" key={a._id}><span><strong>{fmtDate(a.start, true)} → {fmtDate(a.end, true)}</strong><small>{a.available ? "Available" : "Unavailable"} · {a.reason}</small></span><button onClick={() => setAvailDetail(a)}>View</button></div>)}
        </PanelState></section>
      <section className="trainer-panel"><h2>Declare availability</h2><label>Start *<input type="datetime-local" value={form.start||""} onChange={(e)=>setForm({...form,start:e.target.value})}/></label><label>End *<input type="datetime-local" value={form.end||""} onChange={(e)=>setForm({...form,end:e.target.value})}/></label><label>Availability<select value={form.available ?? "true"} onChange={(e)=>setForm({...form,available:e.target.value})}><option value="true">Available</option><option value="false">Unavailable</option></select></label><label>Reason *<textarea value={form.reason||""} onChange={(e)=>setForm({...form,reason:e.target.value})}/></label><button className="button button-primary" disabled={saving || !form.start || !form.end || !form.reason} onClick={saveAvailability}>Save availability</button></section>
    </>}
    {sessionDetail && <DetailModal title={sessionDetail.title} subtitle={`${fmtDate(sessionDetail.start, true)} · ${sessionDetail.batchName}`} onClose={() => setSessionDetail(null)}><DetailRows rows={[["Course", sessionDetail.courseName || "—"],["Competency", sessionDetail.competency?.name || "—"],["Required level", sessionDetail.requiredProficiency != null ? `L${sessionDetail.requiredProficiency}` : "—"],["Assignment", sessionDetail.assignment ? `${sessionDetail.assignment.status} · ${sessionDetail.assignment.decisionReason || ""}` : "Not assigned"],["Availability", sessionDetail.availability ? `${fmtDate(sessionDetail.availability.start, true)} (${sessionDetail.availability.available ? "available" : "unavailable"})` : "Not declared"]]}/></DetailModal>}
    {availDetail && <DetailModal title="Availability window" subtitle={fmtDate(availDetail.start, true)} onClose={() => setAvailDetail(null)}><DetailRows rows={[["End", fmtDate(availDetail.end, true)],["Available", availDetail.available ? "Yes" : "No"],["Reason", availDetail.reason || "—"],["Modes", (availDetail.deliveryModes||[]).join(", ") || "—"]]}/></DetailModal>}
  </Shell>;
}

function Monitoring(){
  const results = useApi(() => part3.get("/results"), []);
  const [detail, setDetail] = useState(null);
  const rows = Array.isArray(results.data) ? results.data : [];
  const published = rows.filter((r) => r.status === "PUBLISHED");
  return <Shell title="Assessment results" description="Published results in batches you may deliver. Preparation and publication stay in Results.">
    <PanelState loading={results.loading} error={results.error} onRetry={results.reload} empty={rows.length || results.loading || results.error ? null : "No published results in your scope."}>
      <p className="muted">{published.length} published of {rows.length}</p>
      <section className="trainer-panel">{rows.slice(0,10).map((r)=><div className="session-row" key={r._id}><span><strong>{r.trainee?.name}</strong><small>{r.batch?.name} · v{r.version} · {r.percentage}%</small></span><StatusBadge status={r.outcome} /><button onClick={() => setDetail(r)}>View</button></div>)}</section>
    </PanelState>
    <p className="muted">Scores are recorded activity and evidence only. Competency requires a separate authorized decision. <Link to="/trainer/evaluations">Open evaluation queue</Link></p>
    {detail && <DetailModal title={detail.trainee?.name} subtitle={`${detail.batch?.name} · v${detail.version}`} onClose={() => setDetail(null)} actions={<Link className="button button-secondary" to="/trainer/results">Open results</Link>}><DetailRows rows={[["Outcome", detail.outcome],["Score", `${detail.totalScore}/${detail.maximumScore} (${detail.percentage}%)`],["Status", detail.status],["Published", fmtDate(detail.publishedAt, true)]]}/></DetailModal>}
  </Shell>;
}

function TrainerFeedback(){
  const fb = useApi(() => part3.get("/feedback"), []);
  const aggs = fb.data?.aggregates || [];
  return <Shell title="Training feedback" description="Scoped rating aggregates for your sessions. Participant names and comments stay hidden from trainers.">
    <PanelState loading={fb.loading} error={fb.error} onRetry={fb.reload} empty={aggs.length || fb.loading || fb.error ? null : "No feedback in your scope yet."}>
      <section className="trainer-panel">{aggs.map((a,i)=><p className="action-row" key={i}><b>{a.count}</b>{a.targetType} · avg {Number(a.average).toFixed(1)} / 5</p>)}</section>
      <p className="muted">{fb.data?.privacy || ""}</p>
    </PanelState>
    <p className="muted">Give platform feedback from <Link to="/trainer/feedback">Feedback</Link>. Feedback never verifies competency.</p>
  </Shell>;
}

function Ttt({candidates=false}){
  const list = useApi(() => part3.get("/ttt/candidates"), []);
  const [detail, setDetail] = useState(null);
  const [learningDetail, setLearningDetail] = useState(null);
  const noms = Array.isArray(list.data) ? list.data : [];
  const openLearning = async (n) => {
    try { setLearningDetail({ nomination: n, learning: await part3.get(`/ttt/nominations/${n._id}/learning`) }); }
    catch (e) { setLearningDetail({ nomination: n, error: errorMessage(e) }); }
  };
  return <Shell title={candidates?"Train the Trainer — candidates":"Train the Trainer dashboard"} description={candidates?"Candidates in programmes you evaluate. Nomination and verification are coordinator decisions.":"Programmes you evaluate; candidates progress through learning, practice and evaluation."} action={candidates?null:<Link className="button button-primary" to="/trainer/ttt-candidates">View TTT candidates <ArrowRight size={15}/></Link>}>
    <PanelState loading={list.loading} error={list.error} onRetry={list.reload} empty={noms.length || list.loading || list.error ? null : "No candidates in programmes you evaluate."}>
      <section className="trainer-panel"><div className="tr-head"><b>Candidate</b><b>Competency</b><b>Level</b><b>Status</b><b>Action</b></div>{noms.map((n)=><div className="tr-row" key={n._id}><span><i className="avatar">{(n.candidate?.name||"?").split(" ").map(x=>x[0]).join("")}</i>{n.candidate?.name}</span><span>{n.competency?.name}</span><span>L{n.targetLevel}</span><StatusBadge status={n.status} /><span><button onClick={() => setDetail(n)}>View</button> <button onClick={() => openLearning(n)}>Learning</button></span></div>)}</section>
    </PanelState>
    {detail && <DetailModal title={detail.candidate?.name} subtitle={`${detail.program?.title || ""} · ${detail.status}`} onClose={() => setDetail(null)} wide actions={<Link className="button button-primary" to="/trainer/ttt-candidates">Open candidates</Link>}><DetailRows rows={[["Competency", detail.competency?.name || "—"],["Target level", `L${detail.targetLevel}`],["Rationale", detail.rationale || "—"],["Nominated by", detail.nominatedBy?.name || "—"],["Eligibility", (detail.eligibilitySnapshot?.checks||[]).map((c)=>`${c.key}: ${c.met ? "met" : "not met"}`).join("; ") || "—"]]}/></DetailModal>}
    {learningDetail && <DetailModal title={`Learning — ${learningDetail.nomination.candidate?.name}`} subtitle={learningDetail.learning?.gate || learningDetail.error || ""} onClose={() => setLearningDetail(null)}><DetailRows rows={[["Completed", `${learningDetail.learning?.completed ?? "—"}/${learningDetail.learning?.total ?? "—"}`],["Note", learningDetail.learning?.note || "—"], ...((learningDetail.learning?.items||[]).map((it) => [`Course: ${it.course?.title}`, `${it.status} ${it.progressPercent ?? ""}%`]))]}/></DetailModal>}
  </Shell>;
}

export default function TrainerExperiencePage({view}){
  const key=view||useLocation().pathname.split("/").at(-1);
  if(!key||key==="dashboard")return <Dashboard/>;
  if(key==="courses")return <CourseManagement/>;
  if(key==="assigned-batches")return <Assigned/>;
  if(key==="learning")return <Resources/>;
  if(key==="assessments"||key==="question-bank")return <Assessments/>;
  if(key==="training-sessions")return <Schedule session/>;
  if(key==="availability")return <Schedule/>;
  if(key==="calendar")return <Part2Page view="calendar"/>;
  if(key==="results")return <Monitoring/>;
  if(key==="evaluations")return <Part3ModulePage/>;
  if(key==="evidence-review")return <Part3BPage/>;
  if(key==="feedback")return <TrainerFeedback/>;
  if(key==="train-the-trainer")return <Ttt/>;
  if(key==="ttt-candidates")return <Ttt candidates/>;
  return <Dashboard/>;
}
