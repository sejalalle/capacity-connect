import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award, BookOpen, CalendarDays, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, FileCheck2, GraduationCap, Headphones, PlayCircle, ShieldCheck,
  Sparkles, Target, TrendingUp, UserRound, Users, ArrowRight,
} from "lucide-react";
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
import FeedbackPage from "../feedback/FeedbackPage";
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
  if (["competency-passport","skill-gaps","learning-paths"].includes(key)) return <Competencies view={key}/>;
  if (["training-needs","courses","nominations","batches","calendar","notifications","competencies","job-role-requirements","audit-logs"].includes(key)) return <Part2Page view={key}/>;
  if (["competency-history","follow-ups","follow-up-oversight","skill-suggestions","evidence","evidence-review","review-oversight","competency-decisions","organizational-capability","ai-question-drafts","ai-activity"].includes(key)) return <Part3BPage/>;
  if (["learning","assessments","results","evaluations","trainer-assignments","trainer-discovery","availability","assigned-batches","training-sessions","trainer-profile","question-bank"].includes(key)) return <Part3ModulePage/>;
  if (key === "certificates") return <CertificatesPage/>;
  if (key === "feedback") return <FeedbackPage/>;
  if (key === "announcements") return <AnnouncementsPage/>;
  if (key === "achievements") return <AchievementsPage/>;
  if (key === "trainer-match") return <TrainerMatchPage/>;
  if (key === "training-demand") return <TrainingDemandPage/>;
  if (key === "media-library") return <MediaLibraryPage/>;
  if (["ttt-dashboard","ttt-program","ttt-modules","ttt-practice","ttt-submissions","ttt-progress"].includes(key)) return <TttTraineePage/>;
  return <Dashboard/>;
}
