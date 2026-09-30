import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award, Bell, BookOpen, Briefcase, CalendarDays, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, FileCheck2, FileText, GraduationCap, Headphones, LifeBuoy, Lightbulb, ListChecks, PlayCircle, ShieldCheck,
  Sparkles, Star, Target, TrendingUp, Upload, UserRound, Users, ArrowRight,
} from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { part3 } from "../../services/part3Service";
import useAuth from "../../hooks/useAuth";
import useTttNomination from "../../hooks/useTttNomination";
import StatusBadge from "../../components/ui/StatusBadge";
import DetailModal, { DetailRows, PanelState } from "../../components/ui/DetailModal";
import useApi, { fmtDate } from "../../hooks/useApi";
import { part2 } from "../../services/part2Service";
import Part2Page from "../part2/Part2Page";
import Part3ModulePage from "../part3/Part3ModulePage";
import Part3BPage from "../part3/Part3BPage";
import CertificatesPage from "../certificates/CertificatesPage";
import AnnouncementsPage from "../announcements/AnnouncementsPage";
import AchievementsPage from "../achievements/AchievementsPage";
import TrainerMatchPage from "../trainer/TrainerMatchPage";
import TrainingDemandPage from "../demand/TrainingDemandPage";
import MediaLibraryPage from "../media/MediaLibraryPage";
import TttTraineePage from "../ttt/TttTraineePage";

function Breadcrumb({ children }) { return <div className="experience-breadcrumb">My Learning <ChevronRight size={14}/>{children}</div>; }
function CourseArt() { return <div className="course-art"><span>◌</span><i/><b>RADAR</b></div>; }
function Shell({ title, description, children, actions }) { return <div className="experience-page"><div className="experience-title"><div><span className="xp-kicker">SAMARTHYA · TRAINEE PORTAL</span><h1>{title}</h1><p>{description}</p></div>{actions}</div>{children}</div>; }

function Dashboard() {
  const { user } = useAuth(); const name = user?.name || "Asha Sharma";
  const { nomination } = useTttNomination();
  const dash = useApi(() => part2.get("/dashboard"), []);
  const gaps = useApi(() => part2.get("/gaps/me"), []);
  const calendar = useApi(() => part2.get("/calendar"), []);
  const notifs = useApi(() => part2.get("/notifications"), []);
  const [gapDetail, setGapDetail] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);
  const [notifDetail, setNotifDetail] = useState(null);
  const gapRows = Array.isArray(gaps.data) ? gaps.data : [];
  const topGaps = gapRows.slice(0, 4);
  const recommended = gapRows.find((g) => g.recommendedCourses?.length)?.recommendedCourses?.[0];
  const upcoming = Array.isArray(calendar.data) ? calendar.data : dash.data?.upcoming || [];
  const recentNotifs = (notifs.data?.items || notifs.data || []).slice(0, 4);
  const kpis = dash.data?.kpis || {};
  const actionItems = dash.data?.actionItems || [];
  return <Shell title={`Good morning, ${name}`} description={`${user?.jobRole?.title || user?.designation || "Forecasting Officer (Trainee)"} · ${user?.department || "Weather Forecasting Division"}`}>
    <div className="welcome-strip"><div><span>YOUR LEARNING SPACE</span><h2>Build capability. Strengthen every forecast.</h2><p>Your progress, learning plan and upcoming commitments in one place.</p></div><div className="weather-orb">☁<i>✦</i></div></div>
    {nomination && <section className="ttt-callout"><div className="ttt-callout-main"><StatusBadge status={nomination.status} /><h2>Train-the-Trainer Programme</h2><p>You have been nominated for the Train-the-Trainer programme{nomination.competency?.name ? ` in ${nomination.competency.name}` : ""} at target level L{nomination.targetLevel}. Supporting your strong subject competence and experience.</p></div><div className="ttt-callout-actions"><Link className="button button-primary" to="/trainee/ttt-dashboard">View programme <ArrowRight size={15}/></Link></div></section>}
    <div className="xp-layout"><div className="xp-main-stack"><section className="xp-panel"><div className="xp-panel-head"><div><h2>My competency status</h2><p>Required levels compared with reviewed capability.</p></div><Link to="/trainee/competency-passport">View all <ArrowRight size={14}/></Link></div>
      <PanelState loading={gaps.loading} error={gaps.error} onRetry={gaps.reload} empty={gapRows.length || gaps.loading || gaps.error ? null : "No role requirements yet. Ask a coordinator to assign a professional role."}>
        {topGaps.map((g)=><div className="competency-row" key={g.competency?._id || g.competency?.name}><div className="comp-symbol"><Target size={17}/></div><strong>{g.competency?.name}</strong><div className="mini-level"><i style={{width:`${g.demonstratedLevel != null && g.requiredLevel ? (g.demonstratedLevel/g.requiredLevel)*100 : 0}%`}}/></div><span>{g.demonstratedLevel == null ? "Not assessed" : `L${g.demonstratedLevel}`} / L{g.requiredLevel}</span><em className={g.category === "NO_GAP" ? "good" : g.demonstratedLevel == null ? "quiet" : "risk"}>{g.category?.replaceAll("_"," ")}</em><button className="button button-secondary" onClick={() => setGapDetail(g)}>Details</button></div>)}
      </PanelState></section>
      <section className="xp-panel recommendation"><div className="xp-panel-head"><div><h2>Recommended for you</h2><p>Matched to your current development need.</p></div></div>{recommended ? <div className="recommended-course"><CourseArt/><div><span className="xp-tag">RECOMMENDED PATH</span><h3>{recommended.title}</h3><p>{recommended.explanation || "Matched to your competency gap."}</p></div><button className="button button-primary" onClick={() => setCourseDetail(recommended)}>View course</button></div> : <p>{gaps.loading ? "Loading…" : "No course recommendation yet. Request training from a skill gap."}</p>}</section>
      <section className="xp-panel"><div className="xp-panel-head"><div><h2>Your recent activity</h2><p>Learning and evidence activity from your journey.</p></div><Link to="/trainee/evidence">View all <ArrowRight size={14}/></Link></div>
        <PanelState loading={dash.loading} error={dash.error} onRetry={dash.reload} empty={actionItems.length || dash.loading || dash.error ? null : "No recent activity recorded."}>
          <div className="activity-timeline">{actionItems.slice(0,5).map((a,i)=><div key={a.path || i}><i className="live"/><span><strong>{a.title}</strong><small>{a.message}</small></span><Link to={a.path}>Open</Link></div>)}</div>
        </PanelState>
        <p className="muted">Active needs: {kpis.activeNeeds ?? "—"} · Known gaps: {kpis.knownGaps ?? "—"} · Not assessed: {kpis.notAssessed ?? "—"} · Upcoming batches: {kpis.upcomingEnrolledBatches ?? "—"}</p></section></div>
      <aside className="xp-side-stack"><section className="xp-panel journey"><h2>My journey</h2>{[["1","Understand","Know your starting point"],["2","Learn","Follow a personalized path"],["3","Demonstrate","Show what you can do"],["4","Grow","Take on higher responsibilities"]].map(([n,t,d],i)=><div key={n} className={i<2?"journey-done":""}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span>{i<2&&<CheckCircle2 size={15}/>}</div>)}</section>
      <section className="xp-panel upcoming"><div className="xp-panel-head"><h2>Upcoming</h2><CalendarDays size={17}/></div>
        <PanelState loading={calendar.loading} error={calendar.error} onRetry={calendar.reload} empty={upcoming.length || calendar.loading || calendar.error ? null : "No upcoming sessions."}>
          {upcoming.slice(0,3).map((b)=><p key={b._id}><b>{fmtDate(b.startDate, true)}</b><span>{b.course?.title || b.name} · {(b.deliveryMode||"").replaceAll("_"," ")}</span></p>)}
        </PanelState>
        <Link to="/trainee/calendar">Full calendar <ArrowRight size={14}/></Link></section>
      <section className="xp-panel notification-card"><div className="xp-panel-head"><h2>Notifications</h2><Link to="/trainee/notifications">View all</Link></div>
        <PanelState loading={notifs.loading} error={notifs.error} onRetry={notifs.reload} empty={recentNotifs.length || notifs.loading || notifs.error ? null : "No notifications."}>
          {recentNotifs.map((n)=><p key={n._id}>● {n.title}<small>{fmtDate(n.createdAt)}</small> <button className="text-button" onClick={() => setNotifDetail(n)}>Details</button></p>)}
        </PanelState></section>
      <Link className="help-card" to="/trainee/support"><Headphones size={22}/><span><strong>Need help?</strong><small>Find answers or contact support.</small></span><ArrowRight size={16}/></Link></aside></div>
    {gapDetail && <DetailModal title={gapDetail.competency?.name} subtitle={`Required L${gapDetail.requiredLevel} · ${gapDetail.demonstratedLevel == null ? "Not assessed" : `Demonstrated L${gapDetail.demonstratedLevel}`} · ${gapDetail.category?.replaceAll("_"," ")}`} onClose={() => setGapDetail(null)}><DetailRows rows={[["Explanation", gapDetail.explanation || "—"],["Next action", gapDetail.nextAction || "—"],["Evidence status", gapDetail.evidenceStatus || "—"],["Recommended courses", (gapDetail.recommendedCourses||[]).map((c)=>c.title).join(", ") || "None recorded"]]}/></DetailModal>}
    {courseDetail && <DetailModal title={courseDetail.title} subtitle="Recommended course" onClose={() => setCourseDetail(null)} actions={<Link className="button button-primary" to={courseDetail._id ? `/trainee/courses/${courseDetail._id}` : "/trainee/courses"}>Open course</Link>}><DetailRows rows={[["About", courseDetail.explanation || "—"],["Open batches", (courseDetail.batches||[]).map((b)=>`${b.name}${b.seatAvailable === false ? " (full)" : ""}`).join(", ") || "No open batch recorded"]]}/></DetailModal>}
    {notifDetail && <DetailModal title={notifDetail.title} subtitle={fmtDate(notifDetail.createdAt, true)} onClose={() => setNotifDetail(null)} actions={<button className="button button-secondary" onClick={async () => { try { await part2.patch(`/notifications/${notifDetail._id}/read`, {}); notifs.reload(); } catch (e) { /* surfaced on reload */ } setNotifDetail(null); }}>Mark read</button>}><p>{notifDetail.message}</p></DetailModal>}
  </Shell>;
}

function Competencies({ view }) {
  const gaps = useApi(() => part2.get("/gaps/me"), []);
  const records = useApi(() => part2.get("/competency-records/me"), []);
  const paths = useApi(() => part2.get("/learning-paths/assignments/me"), []);
  const gapRows = Array.isArray(gaps.data) ? gaps.data : [];
  const recordRows = Array.isArray(records.data) ? records.data : [];
  const [gapDetail, setGapDetail] = useState(null);
  const [recordDetail, setRecordDetail] = useState(null);
  const findGap = (id) => gapRows.find((g) => String(g.competency?._id) === String(id));
  if (view === "skill-gaps") return <Shell title="Skill gap analysis" description="Compare proposed job-role requirements with reviewed records. Missing evidence is NOT_ASSESSED, not zero ability." actions={<Link className="button button-secondary" to="/trainee/competency-passport">View framework</Link>}><Breadcrumb>My Competencies <ChevronRight size={14}/> Skill Gap</Breadcrumb>
    <PanelState loading={gaps.loading} error={gaps.error} onRetry={gaps.reload} empty={gapRows.length || gaps.loading || gaps.error ? null : "No role requirements available. Ask a coordinator to assign a professional role."}>
      {gapRows.map((g) => <section className="xp-competency-hero" key={g.competency?._id}><div className="comp-symbol large"><Target size={25}/></div><div><h2>{g.competency?.name}</h2><p>{g.explanation || g.nextAction || ""}</p><p className="muted">{g.demonstratedLevel == null ? "Not assessed" : `Demonstrated L${g.demonstratedLevel}`} → required L{g.requiredLevel} · {g.category?.replaceAll("_"," ")} · Evidence: {g.evidenceStatus || "—"}</p></div><StatusBadge status={g.category} /><button className="button button-secondary" onClick={() => setGapDetail(g)}>Details</button></section>)}
    </PanelState>
    {gapDetail && <DetailModal title={gapDetail.competency?.name} subtitle={`Required L${gapDetail.requiredLevel}`} onClose={() => setGapDetail(null)} actions={<Link className="button button-primary" to={`/trainee/training-needs?competency=${gapDetail.competency?._id}&title=${encodeURIComponent(`Develop ${gapDetail.competency?.name} toward L${gapDetail.requiredLevel}`)}`}>Request training</Link>}><DetailRows rows={[["Demonstrated", gapDetail.demonstratedLevel == null ? "Not assessed" : `L${gapDetail.demonstratedLevel}`],["Category", gapDetail.category?.replaceAll("_"," ") || "—"],["Explanation", gapDetail.explanation || "—"],["Next action", gapDetail.nextAction || "—"],["Evidence status", gapDetail.evidenceStatus || "—"],["Recommended courses", (gapDetail.recommendedCourses||[]).map((c)=>c.title).join(", ") || "None"]]} />
      {gapDetail.criteria?.length ? <details><summary>Observable criteria and evidence status</summary><ul className="criteria-list">{gapDetail.criteria.map((c) => <li key={c.criterionId}><strong>L{c.level} · {c.description}</strong> <StatusBadge status={c.status} /></li>)}</ul></details> : null}</DetailModal>}
  </Shell>;
  const development = view === "learning-paths";
  const pathRows = Array.isArray(paths.data) ? paths.data : [];
  if (development) return <Shell title="Development recommendation" description="Published course sequences linked to approved development goals."><Breadcrumb>My Competencies <ChevronRight size={14}/> Development</Breadcrumb>
    <PanelState loading={paths.loading} error={paths.error} onRetry={paths.reload} empty={pathRows.length || paths.loading || paths.error ? null : "No learning path assigned yet."}>
      {pathRows.map((a) => { const lp = a.learningPath || a; return <section className="xp-panel" key={a._id || lp._id}><h2>{lp.title}</h2><p>{lp.description || ""}</p>{(lp.orderedCourseSteps||[]).map((s) => <div className="course-line" key={s._id || s.order}><div><h3>{s.order}. {s.course?.title}</h3><p>{s.explanation || ""}</p></div><Link className="button button-secondary" to={`/trainee/courses/${s.course?._id || s.course}`}>View course</Link></div>)}<p className="muted">Version {a.learningPathVersion || lp.version}</p></section>; })}
    </PanelState></Shell>;
  return <Shell title="Role & competencies" description="Reviewed records and self-declared information are shown separately."><Breadcrumb>My Competencies <ChevronRight size={14}/> Role & Requirements</Breadcrumb>
    <PanelState loading={records.loading} error={records.error} onRetry={records.reload} empty={recordRows.length || records.loading || records.error ? null : "No reviewed competency records yet."}>
      <div className="role-grid"><section className="xp-panel"><h2>Required competencies for this role</h2>{gapRows.map((g)=><div className="requirement" key={g.competency?._id}><span>{g.competency?.name}</span><b>L{g.requiredLevel}</b></div>)}</section><section className="xp-panel"><h2>My current status</h2>{recordRows.map((r)=><div className="compact-status" key={r._id}><span>{r.competency?.name}</span><b>{r.demonstratedLevel == null ? "Not assessed" : `L${r.demonstratedLevel}`}</b><StatusBadge status={r.status} /><button className="button button-secondary" onClick={() => setRecordDetail(r)}>Details</button></div>)}</section></div>
    </PanelState>
    {recordDetail && <DetailModal title={recordDetail.competency?.name} subtitle={recordDetail.demonstratedLevel == null ? "Not assessed" : `Demonstrated L${recordDetail.demonstratedLevel}`} onClose={() => setRecordDetail(null)}><DetailRows rows={[["Status", recordDetail.status || "—"],["Required", findGap(recordDetail.competency?._id)?.requiredLevel != null ? `L${findGap(recordDetail.competency?._id).requiredLevel}` : "No role requirement"],["Source", recordDetail.sourceReference || "No reviewed source"],["Assessed", fmtDate(recordDetail.assessedAt)]]}/></DetailModal>}
  </Shell>;
}

export default function TraineeExperiencePage({ view }) {
  const path = useLocation().pathname;
  const key = view || path.split("/").at(-1);
  if (!key || key === "trainee") return <Dashboard/>;
  if (["competency-passport","skill-gaps","learning-paths","competency-history"].includes(key)) return <Competencies view={key}/>;
  if (["training-needs","courses","nominations","batches","calendar","notifications","competencies","job-role-requirements","audit-logs"].includes(key)) return <Part2Page view={key}/>;
  if (key === "workplace-application") return <WorkplaceApplication/>;
  if (key === "competency-updated") return <CompetencyUpdated/>;
  if (key === "feedback") return <TraineeLegacyFeedback/>;
  if (key === "feedback-notifications") return <FeedbackNotifications/>;
  if (["follow-ups","follow-up-oversight","skill-suggestions","evidence","evidence-review","review-oversight","competency-decisions","organizational-capability","ai-question-drafts","ai-activity"].includes(key)) return <Part3BPage/>;
  if (["learning","assessments","results","evaluations","trainer-assignments","trainer-discovery","availability","assigned-batches","training-sessions","trainer-profile","question-bank"].includes(key)) return <Part3ModulePage/>;
  if (key === "certificates") return <CertificatesPage/>;
  if (key === "announcements") return <AnnouncementsPage/>;
  if (key === "achievements") return <AchievementsPage/>;
  if (key === "trainer-match") return <TrainerMatchPage/>;
  if (key === "training-demand") return <TrainingDemandPage/>;
  if (key === "media-library") return <MediaLibraryPage/>;
  if (["ttt-dashboard","ttt-program","ttt-modules","ttt-practice","ttt-submissions","ttt-progress"].includes(key)) return <TttTraineePage/>;
  return <Dashboard/>;
}

/* ═══════════════════════════════════════════════════════════
   WORKPLACE APPLICATION & FOLLOW-UP (screenshot 14)
   Delivered through P3FollowUp: trainee APPLICATION entries +
   supervisor OBSERVATION entries, status progression only.
   ═══════════════════════════════════════════════════════════ */
function WorkplaceApplication() {
  const toast = useToast();
  const followups = useApi(() => part3.get("/follow-ups"), []);
  const [activeId, setActiveId] = useState(null);
  const [entryText, setEntryText] = useState("");
  const [detail, setDetail] = useState(null);
  const rows = Array.isArray(followups.data) ? followups.data : [];
  const openRows = rows.filter((x) => !["COMPLETED", "CANCELLED"].includes(x.status));
  const selected = rows.find((x) => String(x._id) === String(activeId)) || openRows[0] || rows[0];
  const saveEntry = async () => {
    if (!selected || entryText.trim().length < 4) return;
    const saved = await followups.run(
      () => part3.post(`/follow-ups/${selected._id}/workplace-entries`, { type: "APPLICATION", text: entryText.trim(), requestId: crypto.randomUUID() }),
      toast,
      "Workplace application recorded. A reviewer verifies it separately.",
    );
    if (saved) setEntryText("");
  };
  const advance = async (status, comments) => {
    if (!selected) return;
    await followups.run(
      () => part3.patch(`/follow-ups/${selected._id}`, { status, comments }),
      toast,
      status === "COMPLETED" ? "Follow-up marked complete" : "Follow-up started",
    );
  };
  return (
    <Shell title="Workplace Application & Follow-up" description="Apply what you learned in your work and submit evidence for real-world impact. Workplace records are supporting information; competency is verified by an authorized reviewer.">
      <Breadcrumb>My Learning <ChevronRight size={14} /> Workplace Application</Breadcrumb>
      <PanelState loading={followups.loading} error={followups.error} onRetry={followups.reload} empty={rows.length || followups.loading || followups.error ? null : "No follow-up actions assigned yet. They appear after a competency decision or training need creates one."}>
        <div className="xp-task-grid">
          <section className="xp-panel xp-task-card">
            <div className="xp-panel-head">
              <div className="xp-task-icon"><Briefcase size={22} /></div>
              <div>
                <h2>Workplace Application Task</h2>
                <p>Demonstrate how you have applied your learning in a real work scenario.</p>
              </div>
            </div>
            {selected ? (
              <>
                <h3 className="xp-task-title">Task: Apply {selected.competency?.name || "learning"} in a Real Scenario</h3>
                <p>{selected.recommendedAction || selected.explanation || "Record how you applied this learning in operations."}</p>
                <div className="xp-task-meta">
                  <div><span>Submission Deadline</span><b>{fmtDate(selected.dueDate)}</b></div>
                  <div><span>Status</span><StatusBadge status={selected.status} /></div>
                  <div><span>Goal level</span><b>{selected.goalLevel != null ? `L${selected.goalLevel}` : "—"}</b></div>
                </div>
                <label className="field">How did you apply this learning?
                  <textarea value={entryText} onChange={(e) => setEntryText(e.target.value)} maxLength={5000} placeholder="Describe the event, data used, decision taken and outcome…" />
                </label>
                <div className="button-row xp-task-actions">
                  {selected.status === "OPEN" && <button className="button button-secondary" disabled={followups.busy} onClick={() => advance("IN_PROGRESS", "Follow-up started by the trainee.")}>Start</button>}
                  <button className="button button-primary" disabled={followups.busy || entryText.trim().length < 4} onClick={saveEntry}><Upload size={14} /> Submit Evidence</button>
                  {selected.status === "IN_PROGRESS" && <button className="button button-secondary" disabled={followups.busy} onClick={() => advance("COMPLETED", "Trainee marked the application record complete.")}>Mark complete</button>}
                </div>
                <p className="muted">Supervisor observations appear under Your Submissions once recorded. Completing this record does not itself demonstrate competency.</p>
              </>
            ) : <p className="muted">No follow-up selected.</p>}
          </section>
          <aside className="xp-side-stack">
            <section className="xp-panel">
              <h2>Guidelines</h2>
              <ul className="xp-guidelines">
                <li><CheckCircle2 size={14} /> Use real or past weather data</li>
                <li><CheckCircle2 size={14} /> Include analysis and key insights</li>
                <li><CheckCircle2 size={14} /> Show decision-making process</li>
                <li><CheckCircle2 size={14} /> Upload report / presentation / screenshots</li>
                <li><CheckCircle2 size={14} /> You can add remarks if needed</li>
              </ul>
              <div className="help-card"><LifeBuoy size={20} /><span><strong>Need help?</strong><small>Refer to the sample report and guidelines before submitting.</small></span><Link to="/trainee/evidence">View Resources <ArrowRight size={14} /></Link></div>
            </section>
            <section className="xp-panel">
              <h2>Follow-ups ({rows.length})</h2>
              {rows.slice(0, 5).map((x) => (
                <div className="compact-status" key={x._id}>
                  <span>{x.competency?.name || "Follow-up"}</span>
                  <StatusBadge status={x.status} />
                  <button className={`button ${String(selected?._id) === String(x._id) ? "button-primary" : "button-secondary"}`} onClick={() => setActiveId(x._id)}>Open</button>
                </div>
              ))}
            </section>
          </aside>
        </div>
        <section className="xp-panel">
          <div className="xp-panel-head"><div><h2>Your Submissions</h2><p>Application records and supervisor observations.</p></div></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Submission</th><th>Date</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {rows.flatMap((x) => (x.workplaceEntries || []).map((e) => ({ x, e }))).slice(0, 20).map(({ x, e }, i) => (
                  <tr key={`${x._id}-${i}`}>
                    <td>{(e.text || "").slice(0, 60) || `${x.competency?.name || "Follow-up"} entry`}</td>
                    <td>{fmtDate(e.recordedAt)}</td>
                    <td><StatusBadge status={e.type} /></td>
                    <td><StatusBadge status={x.status} /></td>
                    <td><button className="text-button" onClick={() => setDetail({ followUp: x, entry: e })}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.some((x) => (x.workplaceEntries || []).length) && <p className="muted">No workplace records submitted yet.</p>}
          </div>
        </section>
      </PanelState>
      {detail && <DetailModal title={detail.followUp.competency?.name || "Workplace record"} subtitle={`${detail.entry.type} · ${fmtDate(detail.entry.recordedAt, true)}`} onClose={() => setDetail(null)}><p>{detail.entry.text}</p><DetailRows rows={[["Follow-up status", detail.followUp.status], ["Goal level", detail.followUp.goalLevel != null ? `L${detail.followUp.goalLevel}` : "—"], ["Recorded by", detail.entry.type === "APPLICATION" ? "Trainee application" : "Supervisor observation"]]} /><p className="muted">Supporting information, not competency verification.</p></DetailModal>}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   UPDATED COMPETENCY & NEXT DEVELOPMENT (screenshot 15)
   Read-only view over reviewed passport records + gaps +
   recommended courses. Never writes a level.
   ═══════════════════════════════════════════════════════════ */
function CompetencyUpdated() {
  const passport = useApi(() => part3.get("/competency-passport"), []);
  const gaps = useApi(() => part2.get("/gaps/me"), []);
  const [recordDetail, setRecordDetail] = useState(null);
  const data = passport.data || {};
  const records = data.records || [];
  const decisions = data.decisions || [];
  const history = data.history || [];
  const gapRows = Array.isArray(gaps.data) ? gaps.data : data.gaps || [];
  const latest = [...history].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0]
    || [...decisions].sort((a, b) => new Date(b.decidedAt || b.createdAt) - new Date(a.decidedAt || a.createdAt))[0];
  const latestRecord = latest ? records.find((r) => String(r.competency?._id) === String(latest.competency?._id)) : records[0];
  const demonstrated = latest?.newLevel ?? latestRecord?.demonstratedLevel;
  const competencyName = latest?.competency?.name || latestRecord?.competency?.name || "Your competency";
  const levels = latest?.competency?.levels || latestRecord?.competency?.levels || [];
  const nextSteps = gapRows.filter((g) => g.category !== "NO_GAP").slice(0, 3);
  return (
    <Shell title="Updated Competency & Next Development" description="See your updated competency level and get personalized recommendations for further growth. Levels shown are reviewed records only.">
      <Breadcrumb>My Competencies <ChevronRight size={14} /> Updated Status</Breadcrumb>
      <PanelState loading={passport.loading || gaps.loading} error={passport.error || gaps.error} onRetry={() => { passport.reload(); gaps.reload(); }} empty={records.length || passport.loading || passport.error ? null : "No reviewed competency records yet."}>
        <div className="xp-task-grid">
          <section className="xp-panel xp-task-card">
            <div className="xp-task-updated"><CheckCircle2 size={22} color="#16a34a" /><div><h2>Competency Updated</h2><p>Your competency level has been updated based on course completion, assessments and practical application.</p></div><button className="button button-secondary" onClick={() => setRecordDetail(latestRecord || latest)}>View Competency Details</button></div>
            <div className="xp-level-hero">
              <div className="comp-symbol large"><Target size={25} /></div>
              <div><h3>{competencyName}</h3><p>Interpret and analyze weather radar data for forecasting and warning.</p></div>
              <div className="xp-level-chip"><span>Current Level</span><b>L{demonstrated ?? "—"}</b><em>Updated</em></div>
            </div>
            <div className="level-dots" role="img" aria-label={`Demonstrated level ${demonstrated ?? "not assessed"}`}>
              {[1, 2, 3, 4, 5].map((l) => (
                <span key={l} className={demonstrated != null && l <= demonstrated ? "current" : ""}><b>{demonstrated != null && l <= demonstrated ? "✓" : `L${l}`}</b><small>L{l}</small></span>
              ))}
            </div>
            <div className="level-labels">
              {(levels.length ? levels : [{ value: 1, label: "Basic Concepts" }, { value: 2, label: "Pattern Interpretation" }, { value: 3, label: "Complex Analysis" }, { value: 4, label: "Advanced Application" }, { value: 5, label: "Expert Practice" }]).slice(0, 5).map((l) => (
                <span key={l.value || l}><b>L{l.value ?? l}</b>{l.label || ""}</span>
              ))}
            </div>
          </section>
          <aside className="xp-side-stack">
            <section className="xp-panel xp-journey-card">
              <h2>Your Learning Journey</h2>
              {[1, 2, 3, 4, 5].map((l) => (
                <p key={l} className={demonstrated != null && l <= demonstrated ? "done" : ""}>{demonstrated != null && l <= demonstrated ? <CheckCircle2 size={14} /> : <span className="xp-journey-dot" />} {demonstrated != null && l <= demonstrated ? `Completed L${l}` : l === (demonstrated ?? 0) + 1 ? `Work on L${l}` : `L${l}`}</p>
              ))}
              <blockquote>“Continuous learning strengthens a safer tomorrow.”</blockquote>
            </section>
          </aside>
        </div>
        <section className="xp-panel">
          <div className="xp-panel-head"><div><h2>What&apos;s Next?</h2><p>Based on your progress, we recommend the following to further enhance your capabilities.</p></div></div>
          {nextSteps.length ? nextSteps.map((g) => (
            <div className="course-line" key={g.competency?._id || g.competency?.name}>
              <div><h3>{g.recommendedCourses?.[0]?.title || `Advance ${g.competency?.name}`}</h3><p>{g.nextAction || g.explanation || `Develop ${g.competency?.name} toward L${g.requiredLevel}.`}</p><div className="course-meta"><span>4 weeks</span><span>·</span><span>L{g.demonstratedLevel ?? "—"} → L{g.requiredLevel}</span></div></div>
              <Link className="button button-secondary" to={g.recommendedCourses?.[0]?._id ? `/trainee/courses/${g.recommendedCourses[0]._id}` : "/trainee/learning-paths"}>View Course</Link>
            </div>
          )) : <p className="muted">No further development steps. Your reviewed levels meet current role requirements.</p>}
          <p className="muted">Course completion alone does not establish demonstrated competency.</p>
        </section>
      </PanelState>
      {recordDetail && <DetailModal title={recordDetail.competency?.name || competencyName} subtitle={demonstrated == null ? "Not assessed" : `Demonstrated L${demonstrated}`} onClose={() => setRecordDetail(null)}><DetailRows rows={[["Status", recordDetail.status || "—"], ["Source", recordDetail.sourceReference || "No reviewed source"], ["Assessed", fmtDate(recordDetail.assessedAt)], ["Review due", fmtDate(recordDetail.reviewDueAt)]]} /><p className="muted">Reviewed records and self-declared information are shown separately.</p></DetailModal>}
    </Shell>
  );
}

/* Trainee-scoped legacy feedback surface: the enrolled-activity form the
   /trainee/feedback nav item pointed at before the screenshot-16 page was
   added. Kept intact so the original route keeps working. */
function TraineeLegacyFeedback() {
  const toast = useToast();
  const opportunities = useApi(() => part3.get("/feedback/opportunities"), []);
  const [selected, setSelected] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const data = opportunities.data || {};
  const pending = (data.items || []).filter((x) => !(data.submitted || []).some((r) => r.enrollment === x.enrollment && r.targetType === x.targetType && r.target === x.target));
  const submitted = data.submitted || [];
  const submit = async (e) => {
    e.preventDefault();
    const item = pending.find((x) => `${x.enrollment}:${x.targetType}:${x.target}` === selected);
    if (!item || !rating) return;
    const saved = await opportunities.run(
      () => part3.post("/feedback", { enrollment: item.enrollment, target: item.target, targetType: item.targetType, rating: Number(rating), comment: comment || "Feedback recorded." }),
      toast,
      "Feedback submitted successfully",
    );
    if (saved) { setSelected(""); setRating(""); setComment(""); }
  };
  return (
    <Shell title="Training Feedback" description="Share your training experience. Feedback does not verify competency or determine trainer suitability.">
      <Breadcrumb>My Learning <ChevronRight size={14} /> Feedback</Breadcrumb>
      <PanelState loading={opportunities.loading} error={opportunities.error} onRetry={opportunities.reload}>
        <div className="feedback-grid">
          <section className="xp-panel">
            <div className="xp-panel-head"><div className="xp-task-icon"><ListChecks size={20} /></div><div><h2>Give Feedback</h2><p>{data.privacy || "Select an activity and rate your learning experience."}</p></div></div>
            {pending.length ? null : <p className="muted mb-3">No pending feedback opportunities yet. Your saved responses appear below.</p>}
            <form onSubmit={submit}>
              <label>Feedback opportunity
                <select value={selected} onChange={(e) => setSelected(e.target.value)} required={!pending.length}>
                  <option value="">Select a training activity</option>
                  {pending.map((x) => { const k = `${x.enrollment}:${x.targetType}:${x.target}`; return <option key={k} value={k}>{x.batchName} · {String(x.targetType).toLowerCase()} · {x.title}</option>; })}
                </select>
              </label>
              <label>Rating
                <select value={rating} onChange={(e) => setRating(e.target.value)} required={!pending.length}>
                  <option value="">Choose a rating</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label>Comments (optional)
                <textarea rows={3} maxLength={3000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience, what went well, or what could be improved…" />
              </label>
              <button className="button button-primary" type="submit" disabled={opportunities.busy || !selected || !rating}>Submit feedback</button>
            </form>
          </section>
          <aside>
            <section className="xp-panel">
              <h2>Your submitted feedback</h2>
              {submitted.slice(0, 5).map((x) => (
                <div className="feedback-row" key={x._id}>
                  <span className="comp-symbol"><Star size={14} /></span>
                  <span><strong>{x.batchName || x.targetType} · {x.rating} / 5</strong><small>{new Date(x.createdAt).toLocaleDateString("en-IN")}</small><em>{x.comment || "No comment added"}</em></span>
                </div>
              ))}
              {!submitted.length && <p className="muted">No feedback submitted yet.</p>}
            </section>
          </aside>
        </div>
      </PanelState>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEEDBACK & NOTIFICATIONS (screenshot 16)
   Reuses GET /part3/feedback/opportunities (submit once per
   enrolled activity) + GET /api/notifications (mark read).
   Star input is a 1–5 rating control for the same payload.
   ═══════════════════════════════════════════════════════════ */
function FeedbackNotifications() {
  const toast = useToast();
  const opportunities = useApi(() => part3.get("/feedback/opportunities"), []);
  const notifs = useApi(() => part2.get("/notifications"), []);
  const [tab, setTab] = useState("feedback");
  const [selected, setSelected] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const data = opportunities.data || {};
  const pending = (data.items || []).filter((x) => !(data.submitted || []).some((r) => r.enrollment === x.enrollment && r.targetType === x.targetType && r.target === x.target));
  const submitted = data.submitted || [];
  const notifRows = notifs.data?.items || notifs.data || [];
  const unread = notifRows.filter((n) => !n.readAt);
  const markRead = async (id) => {
    await notifs.run(() => part2.patch(`/notifications/${id}/read`, {}), toast, "Notification marked read");
  };
  const submit = async (e) => {
    e.preventDefault();
    const item = pending.find((x) => `${x.enrollment}:${x.targetType}:${x.target}` === selected);
    if (!item || !rating) return;
    const saved = await opportunities.run(
      () => part3.post("/feedback", { enrollment: item.enrollment, target: item.target, targetType: item.targetType, rating: Number(rating), comment: comment || "Feedback recorded." }),
      toast,
      "Feedback submitted successfully",
    );
    if (saved) { setSelected(""); setRating(0); setComment(""); }
  };
  return (
    <Shell title="Feedback & Notifications" description="Share your feedback and stay updated with important alerts and announcements. Feedback does not verify competency or determine trainer suitability.">
      <Breadcrumb>My Learning <ChevronRight size={14} /> Feedback & Notifications</Breadcrumb>
      <div className="course-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "feedback"} className={tab === "feedback" ? "" : "xp-tab-idle"} onClick={() => setTab("feedback")}><b>Feedback</b></button>
        <button type="button" role="tab" aria-selected={tab === "notifications"} className={tab === "notifications" ? "" : "xp-tab-idle"} onClick={() => setTab("notifications")}><b>Notifications{unread.length ? ` (${unread.length})` : ""}</b></button>
      </div>
      {tab === "feedback" ? (
        <PanelState loading={opportunities.loading} error={opportunities.error} onRetry={opportunities.reload}>
          <div className="feedback-grid">
            <section className="xp-panel">
              <div className="xp-panel-head"><div className="xp-task-icon"><ListChecks size={20} /></div><div><h2>Give Feedback</h2><p>{data.privacy || "Select an activity and rate your learning experience."}</p></div></div>
              {pending.length ? null : <p className="muted mb-3">No pending feedback opportunities yet.</p>}
              <form onSubmit={submit}>
                <label>Select what you want to give Feedback for
                  <select value={selected} onChange={(e) => setSelected(e.target.value)} required={!pending.length}>
                    <option value="">Select a training activity</option>
                    {pending.map((x) => { const k = `${x.enrollment}:${x.targetType}:${x.target}`; return <option key={k} value={k}>{x.batchName} · {String(x.targetType).toLowerCase()} · {x.title}</option>; })}
                  </select>
                </label>
                <label>Rate your experience
                  <span className="stars" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star`} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}><Star size={22} fill={n <= rating ? "#e3a42b" : "none"} color="#e3a42b" /></button>
                    ))}
                  </span>
                </label>
                <label>Your Feedback (Optional)
                  <textarea rows={3} maxLength={3000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what you liked or want to be improved…" />
                </label>
                <button className="button button-primary" type="submit" disabled={opportunities.busy || !selected || !rating}>Submit Feedback</button>
              </form>
            </section>
            <aside>
              <section className="xp-panel">
                <h2>Recent Feedback</h2>
                {submitted.slice(0, 5).map((x) => (
                  <div className="feedback-row" key={x._id}>
                    <span className="comp-symbol"><Star size={14} /></span>
                    <span><strong>{x.batchName || x.targetType} · {x.rating} / 5</strong><small>{new Date(x.createdAt).toLocaleDateString("en-IN")}</small><em>{x.comment || "No comment added"}</em></span>
                  </div>
                ))}
                {!submitted.length && <p className="muted">No feedback submitted yet.</p>}
              </section>
            </aside>
          </div>
        </PanelState>
      ) : (
        <PanelState loading={notifs.loading} error={notifs.error} onRetry={notifs.reload} empty={notifRows.length || notifs.loading || notifs.error ? null : "No notifications."}>
          <section className="xp-panel">
            <div className="xp-panel-head"><div className="xp-task-icon"><Bell size={20} /></div><div><h2>Notifications</h2><p>Reminders, announcements and workflow updates. Reminders are notices only.</p></div></div>
            {notifRows.map((n) => (
              <div className={`notification-row${n.readAt ? "" : " unread"}`} key={n._id}>
                <Bell size={15} />
                <span><strong>{n.title}</strong><p>{n.message}</p><small>{fmtDate(n.createdAt, true)}</small></span>
                {!n.readAt && <button className="button button-quiet" disabled={notifs.busy} onClick={() => markRead(n._id)}>Mark read</button>}
              </div>
            ))}
          </section>
        </PanelState>
      )}
    </Shell>
  );
}

