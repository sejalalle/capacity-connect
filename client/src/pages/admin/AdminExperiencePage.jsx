import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity, Award, BarChart3, Bell, BookOpen, CheckCircle2, Clock3, FileText,
  Plus, Users, UserCheck, ShieldCheck, Fingerprint, Building2, Route, Library,
  ClipboardCheck, FileCheck2, Megaphone, ScrollText, ChartNoAxesColumnIncreasing,
  AlertTriangle, TrendingUp, TrendingDown, Star, Eye, Edit, Filter, Search,
  Download, Upload, ChevronDown, ChevronRight, ArrowRight, XCircle, CheckCircle,
  Info, Zap, Target, Calendar, UserRound, Globe, BarChart2, ArrowLeft,
  Send, Image, Paperclip, Radio, Bold, Italic, List, Link2, AlertCircle,
  ThumbsUp, ThumbsDown, MessageSquare, TrendingDown as Trend2, RefreshCw,
} from "lucide-react";
import DetailModal, { DetailRows } from "../../components/ui/DetailModal";
import useApi, { fmtDate } from "../../hooks/useApi";
import api, { errorMessage } from "../../services/api";
import { part2 } from "../../services/part2Service";
import { part3 } from "../../services/part3Service";
import { userService } from "../../services/userService";
import { useToast } from "../../components/ui/Toast";
import StatusBadge from "../../components/ui/StatusBadge";

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════ */
function Shell({ title, eyebrow, desc, children, action, badge }) {
  return (
    <div className="admin-xp">
      <div className="admin-xp-head">
        <div>
          {eyebrow && <span className="admin-xp-eyebrow">{typeof eyebrow === "string" ? eyebrow : eyebrow}</span>}
          <h1 className="admin-xp-title">{title}</h1>
          {desc && <p className="admin-xp-desc">{desc}</p>}
        </div>
        <div className="admin-xp-actions">
          {badge && <span className="admin-xp-badge">{badge}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function KpiRow({ items }) {
  return (
    <div className="admin-kpi-mini">
      {items.map(([Icon, value, label, sub, color = "#3b82f6"]) => (
        <div key={label} className="admin-kpi-mini-card" style={{ "--kc": color }}>
          <div className="admin-kpi-mini-icon"><Icon size={18} /></div>
          <div>
            <b className="admin-kpi-mini-val">{value}</b>
            <span className="admin-kpi-mini-label">{label}</span>
            {sub && <span className="admin-kpi-mini-sub">{sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows, onView, onEdit, viewLabel = "View", editLabel = "Edit", onAction }) {
  return (
    <div className="admin-data-table">
      <div className="admin-table-head" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(70px, 1fr))` }}>
        {columns.map((c) => <span key={c}>{c}</span>)}
        <span>Actions</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="admin-table-row" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(70px, 1fr))` }}>
          {row.map((cell, j) => (
            <span key={j} className={
              typeof cell === "string" && ["Pending", "Active", "Verified", "Approved", "Eligible", "Completed", "In Progress"].includes(cell) ? `admin-badge admin-badge-${cell.toLowerCase().replace(" ", "-")}` :
              typeof cell === "string" && ["Under Review"].includes(cell) ? "admin-badge admin-badge-pending" :
              typeof cell === "string" && ["Not Eligible", "Rejected", "Inactive"].includes(cell) ? "admin-badge admin-badge-rejected" :
              typeof cell === "string" && ["Excellent", "Good"].includes(cell) ? "admin-badge admin-badge-approved" :
              typeof cell === "string" && ["Needs Improvement"].includes(cell) ? "admin-badge admin-badge-pending" :
              ""
            }>{cell}</span>
          ))}
          <span className="admin-table-actions">
            {onView && <button className="admin-action-btn admin-action-view" onClick={() => onView(i)}><Eye size={12} /> {viewLabel}</button>}
            {onEdit && <button className="admin-action-btn admin-action-edit" onClick={() => onEdit(i)}><Edit size={12} /> {editLabel}</button>}
          </span>
        </div>
      ))}
    </div>
  );
}

function SearchFilter({ placeholder = "Search...", extraFilters = [], value = "", onChange, onSubmit }) {
  return (
    <form
      className="admin-search-filter"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="admin-search-wrap">
        <Search size={15} className="admin-search-icon" />
        <input className="admin-search-input" placeholder={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} />
      </div>
      {extraFilters.map(({ label, options }) => (
        <select key={label} className="admin-filter-select">
          <option value="">{label}</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ))}
      <button type="submit" className="admin-filter-btn"><Filter size={14} /> Filter</button>
    </form>
  );
}

function ListState({ loading, error, empty, onRetry, children }) {
  if (loading) return <div className="admin-panel"><p>Loading…</p></div>;
  if (error)
    return (
      <div className="admin-panel" role="alert">
        <p>{error}</p>
        {onRetry && <button className="button button-secondary" onClick={onRetry}>Retry</button>}
      </div>
    );
  if (empty) return <div className="admin-panel"><p>{empty}</p></div>;
  return children;
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="admin-tabs-bar">
      {tabs.map((t) => (
        <button key={t.id} className={`admin-tab-btn ${active === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="admin-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="admin-breadcrumb-bar">
      {items.map((item, i) => (
        <span key={i} className="admin-bc-item">
          {i > 0 && <ChevronRight size={13} />}
          {item.link ? <Link to={item.link}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 21: TTT CANDIDATE OVERVIEW
═══════════════════════════════════════════════════════════ */
const TTT_ROWS = [
  ["Rohan Mehta", "Meteo", "Scientist B", "Radar Interpretation", "L3", "5 years", "Eligible"],
  ["Sneha Patil", "Climate", "Scientist B", "Weather Forecasting", "L3", "6 years", "Eligible"],
  ["Amit Verma", "NWP", "Scientist B", "Numerical Weather Prediction", "L3", "4 years", "Eligible"],
  ["Priya Nair", "Obs & Analysis", "Scientific Assistant", "Data Visualization", "L4", "5 years", "Under Review"],
  ["Karan Singh", "Data", "Scientist C", "Climate Analysis", "L4", "7 years", "Eligible"],
  ["Neha Sharma", "IT", "Scientist B", "System Tools", "L2", "3 years", "Not Eligible"],
];

function TttOverviewPage({ onView }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [programId, setProgramId] = useState("");
  const programs = useApi(() => part3.get("/ttt/programs"), []);
  const programRows = Array.isArray(programs.data) ? programs.data : [];
  const activeProgram = programRows.find((p) => String(p._id) === String(programId)) || programRows.find((p) => p.status === "ACTIVE") || programRows[0];
  const nominations = useApi(() => part3.get("/ttt/candidates"), []);
  const nominationRows = (Array.isArray(nominations.data) ? nominations.data : []).filter((n) => !query || `${n.candidate?.name} ${n.competency?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  const eligibility = useApi(() => (activeProgram ? part3.get("/ttt/eligibility", { competency: activeProgram.competency?._id || activeProgram.competency, frameworkVersion: activeProgram.frameworkVersion, targetLevel: activeProgram.targetLevel }) : Promise.resolve([])), [activeProgram?._id]);
  const eligibleRows = (Array.isArray(eligibility.data) ? eligibility.data : []).filter((e) => !query || `${e.candidate?.name}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    if (!programId && programRows.length) {
      const first = programRows.find((p) => p.status === "ACTIVE") || programRows[0];
      setProgramId(first._id);
    }
  }, [programRows.length]);
  const nominate = async (candidateId) => {
    if (!activeProgram || !candidateId) return;
    await nominations.run(() => part3.post("/ttt/nominations", { program: activeProgram._id, candidate: candidateId, rationale: "Nominated from the TTT overview after eligibility review.", requestId: crypto.randomUUID() }), toast, "Candidate nominated");
  };
  return (
    <Shell
      eyebrow="TRAINERS › Train-the-Trainer"
      title="Train-the-Trainer Candidate Overview"
      desc="Eligibility-checked candidates and recorded nominations. Verification creates reviewed expertise and promotes a trainee to trainer."
      action={<Link className="button button-primary" to="/admin/train-the-trainer">Open Train the Trainer</Link>}
    >
      <KpiRow items={[
        [Users, String(eligibleRows.length || "—"), "Eligible Candidates", activeProgram?.title || "", "#3b82f6"],
        [CheckCircle2, String(nominationRows.length || "—"), "Recorded Nominations", "", "#10b981"],
        [Clock3, String(nominationRows.filter((n)=>["NOMINATED","ACCEPTED","IN_PROGRESS","TEACHING_PRACTICE","EVALUATED"].includes(n.status)).length), "In Progress", "", "#f59e0b"],
        [Award, String(nominationRows.filter((n)=>n.status==="VERIFIED").length), "Verified", "", "#10b981"],
      ]} />
      <div className="admin-panel">
        <label className="admin-form-label">Programme *
          <select className="admin-form-select" value={programId} onChange={(e)=>setProgramId(e.target.value)}>
            <option value="">Select programme</option>
            {programRows.map((p)=><option key={p._id} value={p._id}>{p.title} · L{p.targetLevel} · {p.status}</option>)}
          </select>
        </label>
        <SearchFilter placeholder="Search employee..." value={query} onChange={setQuery} />
        <ListState loading={eligibility.loading} error={eligibility.error} onRetry={eligibility.reload} empty={eligibleRows.length || eligibility.loading || eligibility.error ? null : "Select a programme to check eligibility."}>
          <div className="admin-data-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr" }}>
              <span>#  Name</span><span>Competency</span><span>Target</span><span>Eligibility</span><span>Action</span>
            </div>
            {eligibleRows.map((e, i) => (
              <div key={e.candidate?._id || i} className="admin-table-row" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr" }}>
                <span className="ttt-name-cell"><span className="ttt-num">{i + 1}</span> {e.candidate?.name} <small className="text-muted-sm">{e.candidate?.department || ""}</small></span>
                <span>{activeProgram?.competency?.name || ""}</span>
                <span className="admin-level-badge">L{activeProgram?.targetLevel}</span>
                <span><StatusBadge status={e.status} /></span>
                <span className="admin-table-actions">
                  <button className="admin-action-btn admin-action-view" disabled={nominations.busy || e.status !== "ELIGIBLE"} onClick={() => nominate(e.candidate?._id)}>Nominate</button>
                </span>
              </div>
            ))}
          </div>
        </ListState>
        <h3 style={{marginTop:16}}>Recorded nominations</h3>
        <ListState loading={nominations.loading} error={nominations.error} onRetry={nominations.reload} empty={nominationRows.length || nominations.loading || nominations.error ? null : "No nominations recorded."}>
          <div className="admin-data-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: "2fr 1.5fr 0.7fr 1fr 0.8fr" }}>
              <span>Candidate</span><span>Programme</span><span>Level</span><span>Status</span><span>Action</span>
            </div>
            {nominationRows.map((n) => (
              <div key={n._id} className="admin-table-row" style={{ gridTemplateColumns: "2fr 1.5fr 0.7fr 1fr 0.8fr" }}>
                <span>{n.candidate?.name}</span><span>{n.program?.title}</span>
                <span className="admin-level-badge">L{n.targetLevel}</span>
                <span><StatusBadge status={n.status} /></span>
                <span className="admin-table-actions">
                  <button className="admin-action-btn admin-action-view" onClick={() => onView(n)}>View</button>
                </span>
              </div>
            ))}
          </div>
        </ListState>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 22: CANDIDATE TTT DETAILS
═══════════════════════════════════════════════════════════ */
function TttCandidateDetails({ nomination, onBack }) {
  const [tab, setTab] = useState("overview");
  const toast = useToast();
  const detail = useApi(() => (nomination?._id ? part3.get(`/ttt/nominations/${nomination._id}`) : Promise.resolve(null)), [nomination?._id]);
  const practices = useApi(() => (nomination?._id ? part3.get(`/ttt/nominations/${nomination._id}/practices`) : Promise.resolve([])), [nomination?._id]);
  const learning = useApi(() => (["ACCEPTED","IN_PROGRESS","TEACHING_PRACTICE"].includes(nomination?.status) ? part3.get(`/ttt/nominations/${nomination._id}/learning`) : Promise.resolve(null)), [nomination?._id]);
  const [reason, setReason] = useState("");
  const n = detail.data || nomination || {};
  const practiceRows = Array.isArray(practices.data) ? practices.data : [];
  const initials = (n.candidate?.name || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const verify = async (outcome) => {
    if (!reason && outcome === "VERIFIED") return;
    await detail.run(() => part3.post(`/ttt/nominations/${n._id}/verify`, { outcome, reason: reason || "Returned for further development", expectedRevision: n.revision }), toast, outcome === "VERIFIED" ? "Trainer verified" : "Returned for further development");
  };
  return (
    <Shell
      eyebrow={<Breadcrumb items={[{ label: "Trainers", link: "/admin/trainer-discovery" }, { label: "Train-the-Trainer", link: "/admin/train-the-trainer" }, { label: n.candidate?.name || "Candidate Details" }]} />}
      title=""
      desc=""
    >
      <div className="ttt-candidate-header">
        <div className="ttt-candidate-avatar">{initials}</div>
        <div className="ttt-candidate-info">
          <h2>{n.candidate?.name}</h2>
          <p className="capitalize">{n.candidate?.role} · {n.candidate?.department || ""}</p>
          <span className="ttt-emp-id">{n.program?.title} · Target L{n.targetLevel}</span>
        </div>
        <div className="ttt-candidate-actions">
          <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Back to List</button>
          <StatusBadge status={n.status} />
        </div>
      </div>
      <Tabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "practice", label: "Teaching Practice" }, { id: "learning", label: "Learning" }, { id: "verification", label: "Verification" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div className="ttt-detail-grid">
          <div className="admin-panel">
            <h3>Nomination</h3>
            <DetailRows rows={[["Programme", n.program?.title || "—"],["Competency", n.competency?.name || "—"],["Target level", n.targetLevel != null ? `L${n.targetLevel}` : "—"],["Status", n.status || "—"],["Rationale", n.rationale || "—"],["Nominated by", n.nominatedBy?.name || "—"]]} />
          </div>
          <div className="admin-panel ttt-eligibility-panel">
            <h3>Eligibility snapshot</h3>
            {(n.eligibilitySnapshot?.checks || []).length ? (
              <ul className="ttt-eligibility-list">
                {n.eligibilitySnapshot.checks.map((c) => (
                  <li key={c.key}>{c.met ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}{c.key}: {c.detail || (c.met ? "met" : "not met")}</li>
                ))}
              </ul>
            ) : <p className="muted">No eligibility snapshot recorded.</p>}
            {(n.eligibilitySnapshot?.missingInformation || []).length ? <p className="muted">Missing: {n.eligibilitySnapshot.missingInformation.map((m)=>m.detail || m.key).join("; ")}</p> : null}
          </div>
          <div className="admin-panel">
            <h3>History</h3>
            {(n.history || []).length ? n.history.map((h, i) => <div key={i} className="admin-detail-row"><span className="admin-detail-key">{fmtDate(h.at, true)}</span><span className="admin-detail-val">{h.from} → {h.to} · {h.reason || ""}</span></div>) : <p className="muted">No transitions recorded.</p>}
          </div>
        </div>
      )}
      {tab === "practice" && (
        <div className="admin-panel">
          {practices.loading ? <p>Loading…</p> : practiceRows.length ? practiceRows.map((p) => (
            <div key={p._id} className="admin-detail-row"><span className="admin-detail-key">v{p.version} {p.sessionTitle}</span><span className="admin-detail-val"><StatusBadge status={p.status} /> {p.evaluation ? `· ${p.evaluation.outcome} ${p.evaluation.score}` : ""}</span></div>
          )) : <p className="muted">No teaching practice submitted. Submission stays in the candidate workspace.</p>}
        </div>
      )}
      {tab === "learning" && (
        <div className="admin-panel">
          {learning.data ? <DetailRows rows={[["Completed", `${learning.data.completed ?? "—"}/${learning.data.total ?? "—"}`],["Gate", learning.data.gate || "—"],["Note", learning.data.note || "—"], ...((learning.data.items||[]).map((it) => [`Course: ${it.course?.title}`, `${it.status} ${it.progressPercent ?? ""}%`]))]} /> : <p className="muted">Learning plan appears once the candidate accepts the nomination.</p>}
        </div>
      )}
      {tab === "verification" && (
        <div className="admin-panel">
          <p className="admin-info-note"><Info size={14} /> Verification creates reviewed expertise and promotes a trainee to trainer. It is a human decision on reviewed practice, never automatic.</p>
          <label className="admin-form-label">Verification reason *<textarea className="admin-remarks-input" value={reason} onChange={(e)=>setReason(e.target.value)} /></label>
          <div className="admin-form-footer">
            <button className="button button-primary" disabled={detail.busy || !reason || n.status !== "EVALUATED"} onClick={() => verify("VERIFIED")}>Verify as trainer</button>
            <button className="button button-secondary" disabled={detail.busy} onClick={() => verify("RETURNED")}>Return for development</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 23: TTT PROGRESS & TEACHING SESSIONS
═══════════════════════════════════════════════════════════ */
function TttProgressPage() {
  const [tab, setTab] = useState("modules");
  return (
    <Shell
      eyebrow={<Breadcrumb items={[{ label: "Trainers" }, { label: "Train-the-Trainer" }, { label: "TTT Progress" }]} />}
      title=""
      desc=""
    >
      <div className="ttt-progress-header">
        <div className="ttt-prog-avatar">RM</div>
        <div className="ttt-prog-info">
          <h2>Rohan Mehta</h2>
          <p>Scientist B · Meteorology Department · Employee ID: MTE-1023</p>
        </div>
        <div className="ttt-prog-meta">
          {[["TTT Program", "Instructor Development Program"], ["Start Date", "15 Apr 2025"], ["End Date", "15 May 2025"], ["Overall Progress", "70%"], ["Status", "In Progress"]].map(([k, v]) => (
            <div key={k} className="ttt-prog-meta-item"><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
      </div>
      <Tabs
        tabs={[{ id: "modules", label: "Module Progress" }, { id: "sessions", label: "Teaching Sessions" }, { id: "assessments", label: "Assessments" }, { id: "feedback", label: "Feedback" }, { id: "resources", label: "Resources" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "modules" && (
        <div className="ttt-prog-grid">
          <div className="admin-panel">
            <h3>TTT Modules</h3>
            <div className="ttt-modules-list">
              {[
                { name: "Module 1: Training Fundamentals", status: "done", date: "16 Apr 2025", pct: 100 },
                { name: "Module 2: Instructional Design", status: "done", date: "22 Apr 2025", pct: 100 },
                { name: "Module 3: Teaching Practice", status: "active", date: "", pct: 70 },
                { name: "Module 4: Assessment & Evaluation", status: "pending", date: "", pct: 0 },
                { name: "Module 5: Use of Training Tools", status: "pending", date: "", pct: 0 },
              ].map((m) => (
                <div key={m.name} className={`ttt-module-item ttt-module-${m.status}`}>
                  <div className="ttt-module-icon">
                    {m.status === "done" ? <CheckCircle2 size={16} color="#10b981" /> : m.status === "active" ? <Activity size={16} color="#3b82f6" /> : <Clock3 size={16} color="#94a3b8" />}
                  </div>
                  <div className="ttt-module-body">
                    <strong>{m.name}</strong>
                    {m.date && <small>Completed on {m.date}</small>}
                    {m.status === "active" && (
                      <div className="ttt-module-progress">
                        <div className="ttt-module-progress-fill" style={{ width: `${m.pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="ttt-upcoming-tasks">
              <h4>Upcoming Tasks</h4>
              <table className="ttt-task-table">
                <thead><tr><th>Task</th><th>Due Date</th></tr></thead>
                <tbody>
                  {[["Submit session recording", "29 Apr 2025"], ["Receive final mentor feedback", "30 Apr 2025"], ["Complete module quiz", "2 May 2025"]].map(([t, d]) => (
                    <tr key={t}><td>{t}</td><td className="ttt-task-date">{d}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="admin-panel ttt-module3-panel">
              <h3>Module 3 Progress</h3>
              <div className="ttt-module3-progress">
                <div className="ttt-m3-bar-bg"><div className="ttt-m3-bar" style={{ width: "70%" }} /></div>
                <span className="ttt-m3-pct">70%</span>
              </div>
              <ul className="ttt-m3-checklist">
                {[["Completed training session plan", true], ["Conducted mock session", true], ["Received initial feedback", true], ["Submit final teaching demonstration", false]].map(([item, done]) => (
                  <li key={item} className={done ? "done" : ""}>{done ? <CheckCircle2 size={13} color="#10b981" /> : <Clock3 size={13} color="#94a3b8" />}{item}</li>
                ))}
              </ul>
            </div>
            <div className="admin-panel ttt-mentor-feedback">
              <h4>Mentor Feedback</h4>
              <div className="ttt-mentor-card">
                <div className="ttt-mentor-avatar">PS</div>
                <div>
                  <strong>Dr. Priya Sharma</strong>
                  <small>Senior Scientist (Mentor) · 25 Apr 2025</small>
                </div>
              </div>
              <blockquote className="ttt-mentor-quote">
                "Good understanding of the content. Needs improvement in engagement techniques and time management."
              </blockquote>
            </div>
            <div className="admin-panel">
              <h4>Quick Actions</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <button className="button button-secondary" style={{ width: "100%" }}><Eye size={14} /> View Teaching Sessions</button>
                <button className="button button-primary" style={{ width: "100%" }}><BarChart3 size={14} /> View Detailed Progress</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab !== "modules" && (
        <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <Activity size={36} color="#94a3b8" />
          <p style={{ color: "#64748b", marginTop: "1rem" }}>{tab.charAt(0).toUpperCase() + tab.slice(1)} details load here.</p>
        </div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 24: TTT VERIFICATION & TRAINER POOL
═══════════════════════════════════════════════════════════ */
function TttVerificationPage() {
  const [tab, setTab] = useState("evaluation");
  const [added, setAdded] = useState(false);
  return (
    <Shell
      eyebrow={<Breadcrumb items={[{ label: "Trainers" }, { label: "Train-the-Trainer" }, { label: "Verification & Trainer Pool" }]} />}
      title=""
      desc=""
    >
      <div className="ttt-progress-header">
        <div className="ttt-prog-avatar">RM</div>
        <div className="ttt-prog-info">
          <h2>Rohan Mehta</h2>
          <p>Scientist B · Meteorology Department · Employee ID: MTE-1023</p>
        </div>
        <div className="ttt-prog-meta">
          {[["TTT Program", "Instructor Development Program"], ["Completion Date", "16 May 2025"], ["Final Status", "Completed"]].map(([k, v]) => (
            <div key={k} className="ttt-prog-meta-item"><span>{k}</span><b className={v === "Completed" ? "ttt-status-done" : ""}>{v}</b></div>
          ))}
        </div>
      </div>
      <Tabs
        tabs={[{ id: "evaluation", label: "Evaluation Summary" }, { id: "sessions", label: "Teaching Session Summary" }, { id: "verification", label: "Verification" }, { id: "pool", label: "Trainer Pool Details" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "evaluation" && (
        <div className="ttt-verif-grid">
          <div className="admin-panel">
            <h3>Evaluation Summary</h3>
            <div className="ttt-eval-table">
              <div className="ttt-eval-head"><span>Component</span><span>Score / Result</span><span>Status</span></div>
              {[["Training Knowledge Test", "85%", "Cleared"], ["Teaching Practice Evaluation", "Good", "Cleared"], ["Verification", "—", "Cleared"], ["Participant Feedback (Avg.)", "4.3 / 5", "Cleared"], ["Final Interview", "—", "Cleared"]].map(([c, s, st]) => (
                <div key={c} className="ttt-eval-row">
                  <span>{c}</span><span>{s}</span>
                  <span className="admin-badge admin-badge-approved">{st}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="admin-panel">
            <h3>Verification & Approval</h3>
            <div className="ttt-verif-block">
              <div className="ttt-verif-row"><span>Verified By</span><b>Dr. Priya Sharma<br/><small>Head, Training & Development</small></b></div>
              <div className="ttt-verif-row"><span>Verification Date</span><b>16 May 2025</b></div>
              <div className="ttt-verif-row"><span>Status</span><span className="admin-badge admin-badge-approved"><ShieldCheck size={12} /> Verified</span></div>
              <div className="ttt-verif-row"><span>Comments</span><b>Demonstrated good subject knowledge, teaching skills and communication. Recommended to be added to trainer pool.</b></div>
            </div>
            {!added ? (
              <button className="button button-primary ttt-add-btn" onClick={() => setAdded(true)}><Plus size={14} /> Add to Trainer Pool</button>
            ) : (
              <div className="ttt-added-success">
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <strong>Candidate Verified and Added to Trainer Pool</strong>
                  <p>The candidate has successfully completed all TTT requirements and has been added to the trainer pool.</p>
                  <Link to="/admin/trainer-discovery" className="button button-secondary" style={{ marginTop: 8 }}>View in Trainer Pool</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "sessions" && (
        <div className="admin-panel">
          <DataTable
            columns={["#", "Topic / Subject", "Date", "Trainees", "Observer", "Result"]}
            rows={[
              ["1", "Radar Basics", "20 Apr 2025", "8", "Dr. Anand Kumar", "Good"],
              ["2", "Doppler Radar", "25 Apr 2025", "6", "Dr. Anand Kumar", "Good"],
              ["3", "Case Study Analysis", "25 Apr 2025", "10", "Dr. Priya Sharma", "Pending"],
              ["4", "Hands-on Data Analysis", "2 May 2025", "7", "Dr. Anand Kumar", "Pending"],
            ]}
          />
        </div>
      )}
      {(tab === "verification" || tab === "pool") && (
        <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <ShieldCheck size={36} color="#10b981" />
          <p style={{ color: "#64748b", marginTop: "1rem" }}>Verification records and pool details are displayed here.</p>
        </div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   TTT ROUTER PAGE
═══════════════════════════════════════════════════════════ */
function TttAdminPage() {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  if (view === "detail") return <TttCandidateDetails nomination={selected} onBack={() => { setSelected(null); setView("list"); }} />;
  return (
    <div className="admin-xp">
      <div className="admin-xp-head">
        <div>
          <span className="admin-xp-eyebrow">TRAIN-THE-TRAINER</span>
          <h1 className="admin-xp-title">TTT Overview</h1>
        </div>
        <div className="admin-xp-actions">
          <Link className="button button-secondary" to="/admin/train-the-trainer">Open Train the Trainer</Link>
        </div>
      </div>
      <TttOverviewPage onView={(n) => { setSelected(n); setView("detail"); }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 25: USER MANAGEMENT
═══════════════════════════════════════════════════════════ */
const USER_ROWS = [
  ["Asha Sharma", "asha.sharma@imd.gov.in", "Trainee", "Forecasting", "Active"],
  ["Rahul Mehta", "rahul.mehta@imd.gov.in", "Trainer", "Radar", "Active"],
  ["Neha Patil", "neha.patil@imd.gov.in", "Trainee", "Climate", "Pending"],
  ["Amit Joshi", "a.m.t.joshi@imd.gov.in", "Trainer", "Satellite", "Active"],
  ["Priya Singh", "priya.singh@imd.gov.in", "Trainee", "Weather Modelling", "Inactive"],
];
function UserManagementPage({ onViewUser }) {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const status = activeTab === "pending" ? "pending" : "";
  const role = ["trainee", "trainer", "admin"].includes(activeTab) ? activeTab : "";
  const list = useApi(() => userService.list({ ...(role && { role }), ...(status && { status }), page, limit: 10 }), [role, status, page]);
  const users = list.data?.users || [];
  const pagination = list.data?.pagination || {};
  const shown = users.filter((u) => !query || `${u.name} ${u.email} ${u.department || ""}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Shell
      eyebrow="PEOPLE"
      title="User Management"
      desc="Registered users with approval actions. Professional-role assignment, previous training and baseline stay in Users."
      action={<Link className="button button-primary" to="/admin/users">Open User Approvals</Link>}
    >
      <KpiRow items={[
        [Users, String(pagination.total ?? users.length), "Total Users", "", "#3b82f6"],
        [UserRound, String(users.filter((u)=>u.role==="trainee").length), "Trainees (page)", "", "#10b981"],
        [UserCheck, String(users.filter((u)=>u.role==="trainer").length), "Trainers (page)", "", "#8b5cf6"],
        [ShieldCheck, String(users.filter((u)=>u.role==="admin").length), "Admins (page)", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <SearchFilter placeholder="Search by name, email or department..." value={query} onChange={setQuery} />
        <Tabs
          tabs={[{ id: "all", label: "All Users" }, { id: "pending", label: "Pending Approval" }, { id: "trainee", label: "Trainees" }, { id: "trainer", label: "Trainers" }, { id: "admin", label: "Admins" }]}
          active={activeTab}
          onChange={(t) => { setActiveTab(t); setPage(1); }}
        />
        <ListState loading={list.loading} error={list.error} onRetry={list.reload} empty={shown.length || list.loading || list.error ? null : "No users found for this filter."}>
          <div className="admin-data-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: "0.4fr 2fr 2fr 1fr 1.5fr 1fr 0.8fr" }}>
              <span>#</span><span>Name</span><span>Email</span><span>Role</span><span>Department</span><span>Status</span><span>Action</span>
            </div>
            {shown.map((u, i) => (
              <div key={u._id} className="admin-table-row" style={{ gridTemplateColumns: "0.4fr 2fr 2fr 1fr 1.5fr 1fr 0.8fr" }}>
                <span>{(page - 1) * 10 + i + 1}</span>
                <span className="user-name-cell"><span className="user-avatar-sm">{u.name?.[0]}</span>{u.name}</span>
                <span className="text-muted-sm">{u.email}</span>
                <span className="capitalize">{u.role}</span><span>{u.department || "—"}</span>
                <span><StatusBadge status={u.accountStatus} /></span>
                <span className="admin-table-actions">
                  <button className="admin-action-btn admin-action-view" onClick={() => onViewUser(u)}><Eye size={12} /> View</button>
                </span>
              </div>
            ))}
          </div>
          <div className="admin-pagination">
            <span>{pagination.total ?? shown.length} users · Page {page} of {Math.max(1, pagination.pages || 1)}</span>
            <div className="admin-pag-btns">
              <button className="admin-pag-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <button className="admin-pag-btn" disabled={page >= (pagination.pages || 1)} onClick={() => setPage(page + 1)}>Next</button>
              <button className="admin-pag-btn" onClick={() => list.reload()}>Refresh</button>
            </div>
          </div>
        </ListState>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 26: USER DETAILS
═══════════════════════════════════════════════════════════ */
function UserDetailsPage({ user, onBack, onManage }) {
  const [tab, setTab] = useState("overview");
  const toast = useToast();
  const profile = useApi(() => (user?._id ? userService.get(user._id) : Promise.resolve(user)), [user?._id]);
  const completions = useApi(() => (user?._id ? part2.get(`/trainees/${user._id}/course-completions`).catch(() => []) : Promise.resolve([])), [user?._id]);
  const row = profile.data?.user || profile.data || user || {};
  const completionRows = Array.isArray(completions.data) ? completions.data : [];
  const initials = (row.name || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const approve = async (status) => {
    await profile.run(() => userService.status(row._id, status), toast, `Account ${status}.`);
  };
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management", link: "/admin/user-roles" }, { label: row.name || "User Details" }]} />
      <div className="user-detail-header">
        <div className="user-detail-avatar-wrap">
          <div className="user-detail-avatar">{initials}</div>
          <div>
            <h2>{row.name} <StatusBadge status={row.accountStatus} /></h2>
            <p className="capitalize">{row.role} · {row.department || "—"}</p>
            <p className="user-detail-contact"><span>{row.email}</span><span>{row.phone || ""}</span></p>
          </div>
        </div>
        <span>
          <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Back to List</button>{" "}
          {row.accountStatus === "pending" && <><button className="button button-primary" disabled={profile.busy} onClick={() => approve("approved")}>Approve</button> <button className="button button-secondary" disabled={profile.busy} onClick={() => approve("rejected")}>Reject</button></>}
          {row.accountStatus === "approved" && <button className="button button-secondary" disabled={profile.busy} onClick={() => approve("suspended")}>Suspend</button>}
        </span>
      </div>
      <Tabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "training", label: "Training" }, { id: "competencies", label: "Competencies" }, { id: "certificates", label: "Certificates" }, { id: "activity", label: "Activity Log" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div className="user-detail-grid">
          <div className="admin-panel">
            <div className="user-detail-section-head"><h3>Professional Information</h3><Link className="admin-action-btn admin-action-view" to="/admin/users">Open in Users</Link></div>
            <DetailRows rows={[["Full Name", row.name || "—"],["Email", row.email || "—"],["Designation", row.designation || "—"],["Department", row.department || "—"],["Phone", row.phone || "—"],["Qualifications", (row.qualifications||[]).join(", ") || "—"],["Skills", (row.skills||[]).join(", ") || "—"]]} />
          </div>
          <div>
            <div className="admin-panel" style={{ marginBottom: 14 }}>
              <h3>Account Information</h3>
              <DetailRows rows={[["Role", row.role || "—"],["Status", row.accountStatus || "—"],["Professional role", row.jobRole?.title || row.jobRole || "Not assigned"]]} />
              <p className="muted">Professional-role assignment, previous training and baseline stay in Users. Access-role changes happen only through TTT verification.</p>
              <button className="button button-secondary" onClick={onManage}>Open in Users</button>
            </div>
            <div className="admin-panel">
              <div className="user-detail-section-head"><h3>Previous training</h3><span className="muted">{completionRows.length} records</span></div>
              {completions.loading ? <p>Loading…</p> : completionRows.length ? completionRows.map((c) => <div key={c._id} className="user-comp-row"><span>{c.course?.title || "Course no longer available"}{c.completedAt ? ` · ${fmtDate(c.completedAt)}` : ""}</span><span className="user-level-chip">{c.sourceReference || ""}</span></div>) : <p className="muted">No previous training recorded.</p>}
            </div>
          </div>
        </div>
      )}
      {tab === "training" && (
        <div className="admin-panel">
          {completions.loading ? <p>Loading…</p> : completionRows.length ? completionRows.map((c) => <div key={c._id} className="user-comp-row"><span>{c.course?.title || "Course no longer available"}</span><span className="user-level-chip">{fmtDate(c.completedAt)}</span></div>) : <p className="muted">No previous training recorded. Recording stays in Users.</p>}
        </div>
      )}
      {(tab === "competencies" || tab === "certificates" || tab === "activity") && (
        <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}><Activity size={32} color="#94a3b8" /><p style={{ color: "#64748b" }}>Full {tab} records stay in their own workspaces (Competency Framework, Certifications, Audit Logs).</p></div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 27: MANAGE USER ACCOUNT
═══════════════════════════════════════════════════════════ */
function ManageUserAccountPage({ user, onBack, onReview }) {
  const [accountStatus, setAccountStatus] = useState("approved");
  const initials = (user?.name || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management" }, { label: user?.name || "User Details" }, { label: "Manage User Account" }]} />
      <h1 className="admin-xp-title">Manage User Account</h1>
      <p className="admin-xp-desc">Approval and suspension only. There is no role-change API; a trainee becomes a trainer only through TTT verification.</p>
      <div className="manage-account-grid">
        <div>
          <div className="manage-user-card">
            <div className="user-detail-avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{initials}</div>
            <div>
              <h3>{user?.name}</h3>
              <p className="capitalize">{user?.role} · {user?.department || "—"}</p>
              <span className="text-muted-sm">{user?.email}</span>
            </div>
          </div>
          <div className="admin-panel" style={{ marginTop: 14 }}>
            <h3>Current Account Details</h3>
            <DetailRows rows={[["Current Role", user?.role || "—"],["Account Status", user?.accountStatus || "—"],["Department", user?.department || "—"]]} />
          </div>
        </div>
        <div>
          <div className="admin-info-callout" style={{ marginBottom: 14 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <div>
              <strong>Boundary</strong>
              <p style={{ margin: "4px 0 4px", fontSize: 12 }}>Approving lets the user sign in. Role promotion happens only through Train-the-Trainer verification.</p>
            </div>
          </div>
          <div className="admin-panel">
            <h3>Update Account Status</h3>
            <label className="admin-form-label">Account Status *
              <div className="status-radio-group">
                {[["approved", "Approved — User can log in and access the system"], ["rejected", "Rejected — User cannot log in"], ["suspended", "Suspended — Approved user loses access"]].map(([val, desc]) => (
                  <label key={val} className={`status-radio ${accountStatus === val ? "selected" : ""}`} onClick={() => setAccountStatus(val)}>
                    <input type="radio" name="status" value={val} checked={accountStatus === val} onChange={() => setAccountStatus(val)} />
                    <span>{desc}</span>
                  </label>
                ))}
              </div>
            </label>
            <div className="admin-form-footer">
              <button className="button button-secondary" onClick={onBack}>Cancel</button>
              <button className="button button-primary" onClick={() => onReview({ status: accountStatus })}>Review Changes</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 28: CONFIRM & UPDATE
═══════════════════════════════════════════════════════════ */
function ConfirmUpdatePage({ user, change, busy, onBack, onConfirm }) {
  const initials = (user?.name || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management" }, { label: user?.name || "User Details" }, { label: "Manage User Account" }, { label: "Review Account Changes" }]} />
      <h1 className="admin-xp-title">Review Account Changes</h1>
      <p className="admin-xp-desc">Please review the changes before updating the user account.</p>
      <div className="confirm-update-grid">
        <div className="admin-panel">
          <div className="manage-user-card" style={{ marginBottom: 16 }}>
            <div className="user-detail-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{initials}</div>
            <div><h3 style={{ margin: 0 }}>{user?.name}</h3><p style={{ margin: 0 }} className="capitalize">{user?.role} · {user?.department || "—"}</p><span className="text-muted-sm">{user?.email}</span></div>
          </div>
          <h3>Change Summary</h3>
          <div className="change-summary-table">
            <div className="change-summary-head"><span>Field</span><span>Current Value</span><span></span><span>New Value</span></div>
            <div className="change-summary-row">
              <span>Account Status</span>
              <span><StatusBadge status={user?.accountStatus} /></span>
              <ArrowRight size={14} color="#94a3b8" />
              <span><StatusBadge status={change?.status} /></span>
            </div>
          </div>
          <div className="admin-info-callout" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e", marginTop: 12 }}>
            <AlertTriangle size={16} color="#d97706" />
            <span><strong>Boundary: </strong>this changes sign-in access only. It never changes an access role or a competency level.</span>
          </div>
          <div className="admin-form-footer">
            <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Edit Changes</button>
            <button className="button button-primary" disabled={busy} onClick={onConfirm}>Confirm & Update</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   USER ROLES ROUTER
═══════════════════════════════════════════════════════════ */
function UsersRolesPage() {
  const toast = useToast();
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [change, setChange] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [busy, setBusy] = useState(false);
  const confirmChange = async () => {
    if (!selected?._id || !change?.status) return;
    setBusy(true);
    try {
      const updated = await userService.status(selected._id, change.status);
      const next = updated?.user || updated;
      setConfirmed(next);
    } catch (e) {
      toast(e?.response?.data?.message || "Unable to update account");
    } finally {
      setBusy(false);
    }
  };
  if (confirmed) return (
    <Shell title="Account Updated" desc="">
      <div className="admin-panel admin-success-card">
        <CheckCircle2 size={48} color="#10b981" />
        <h2>Account Updated Successfully</h2>
        <p>{confirmed.name} is now {confirmed.accountStatus}. Access permissions updated.</p>
        <button className="button button-primary" onClick={() => { setConfirmed(null); setSelected(null); setChange(null); setView("list"); }}>Back to User Management</button>
      </div>
    </Shell>
  );
  if (view === "manage") return <ManageUserAccountPage user={selected} onBack={() => setView("detail")} onReview={(c) => { setChange(c); setView("confirm"); }} />;
  if (view === "confirm") return <ConfirmUpdatePage user={selected} change={change} busy={busy} onBack={() => setView("manage")} onConfirm={confirmChange} />;
  if (view === "detail") return <UserDetailsPage user={selected} onBack={() => { setSelected(null); setView("list"); }} onManage={() => setView("manage")} />;
  return <UserManagementPage onViewUser={(u) => { setSelected(u); setView("detail"); }} />;
}

/* ═══════════════════════════════════════════════════════════
   STEP 29–32: COMMUNICATION
═══════════════════════════════════════════════════════════ */
const COMM_ROWS = [
  ["Advanced Radar Interpretation Training", "Announcement", "Trainees", "15 Sep 2026", "Active"],
  ["Assessment Deadline Reminder", "Notification", "All Users", "12 Sep 2026", "Active"],
  ["New Course: Climate Modelling Basics", "Learning Update", "Trainees", "10 Sep 2026", "Active"],
  ["Top Performer – August 2026", "Achievement", "All Users", "5 Sep 2026", "Active"],
  ["System Maintenance Notice", "Notification", "All Users", "1 Sep 2026", "Expired"],
];

function CommunicationPage() {
  const toast = useToast();
  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("all");
  const [detail, setDetail] = useState(null);
  const list = useApi(() => part2.get("/announcements"), []);
  const rows = (Array.isArray(list.data) ? list.data : []).filter((r) => activeTab === "all" || (r.category || "").toLowerCase().includes(activeTab === "announcements" ? "announce" : activeTab === "learning" ? "new_content" : activeTab));

  if (view === "create") return <CreateAnnouncementPage onBack={() => setView("list")} onReview={() => setView("review")} />;
  if (view === "review") return <ReviewPublishPage onBack={() => setView("create")} onPublish={() => setView("published")} />;
  if (view === "published") return <PublishedStatusPage onNew={() => setView("create")} />;

  const publish = async (row) => {
    await list.run(() => part2.post(`/announcements/${row._id}/publish`, { reason: "Published from the announcements overview" }), toast, "Announcement published");
  };
  const archive = async (row) => {
    await list.run(() => part2.post(`/announcements/${row._id}/archive`, { reason: "Archived from the announcements overview" }), toast, "Announcement archived");
  };

  return (
    <Shell
      eyebrow="COMMUNICATION"
      title="Communication"
      desc="Coordinator-published announcements. Publishing fans out notifications but never changes workflow state."
      action={<Link className="button button-primary" to="/admin/announcements">Open Announcements</Link>}
    >
      <KpiRow items={[
        [Megaphone, String(rows.filter((r)=>r.status==="PUBLISHED").length || rows.length), "Announcements", "", "#3b82f6"],
        [Bell, String(rows.filter((r)=>r.status==="DRAFT").length), "Drafts", "", "#f59e0b"],
        [BookOpen, String(rows.filter((r)=>r.showOnHomepage).length), "Homepage items", "", "#8b5cf6"],
        [Award, String(rows.filter((r)=>r.pinned).length), "Pinned", "", "#10b981"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[{ id: "all", label: "All" }, { id: "announcements", label: "Announcements" }, { id: "notifications", label: "Notifications" }, { id: "learning", label: "Learning Updates" }, { id: "achievements", label: "Achievements" }]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <ListState loading={list.loading} error={list.error} onRetry={list.reload} empty={rows.length || list.loading || list.error ? null : "No announcements recorded."}>
          <div className="admin-data-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: "0.4fr 2.5fr 1.2fr 1fr 1fr 1fr 1.4fr" }}>
              <span>#</span><span>Title</span><span>Category</span><span>Audience</span><span>Date</span><span>Status</span><span>Action</span>
            </div>
            {rows.map((r, i) => (
              <div key={r._id} className="admin-table-row" style={{ gridTemplateColumns: "0.4fr 2.5fr 1.2fr 1fr 1fr 1fr 1.4fr" }}>
                <span>{i + 1}</span>
                <span style={{ fontWeight: 500 }}>{r.pinned ? "📌 " : ""}{r.title}</span>
                <span>{(r.category || "").replaceAll("_", " ")}</span>
                <span>{r.audience}</span><span>{fmtDate(r.publishAt || r.createdAt)}</span>
                <span><StatusBadge status={r.status} /></span>
                <span className="admin-table-actions">
                  <button className="admin-action-btn admin-action-view" onClick={() => setDetail(r)}><Eye size={12} /> View</button>
                  {r.status === "DRAFT" && <button className="admin-action-btn admin-action-edit" disabled={list.busy} onClick={() => publish(r)}>Publish</button>}
                  {r.status !== "ARCHIVED" && <button className="admin-action-btn admin-action-edit" disabled={list.busy} onClick={() => archive(r)}>Archive</button>}
                </span>
              </div>
            ))}
          </div>
        </ListState>
      </div>
      {detail && <DetailModal title={detail.title} subtitle={`${(detail.category || "").replaceAll("_"," ")} · audience ${detail.audience}`} onClose={() => setDetail(null)} wide actions={<Link className="button button-secondary" to="/admin/announcements">Open full workspace</Link>}><p>{detail.body}</p><DetailRows rows={[["Status", detail.status],["Published", fmtDate(detail.publishAt)],["Homepage", detail.showOnHomepage ? "Yes" : "No"],["Pinned", detail.pinned ? "Yes" : "No"],["Author", detail.createdBy?.name || "—"]]} /></DetailModal>}
    </Shell>
  );
}

function CreateAnnouncementPage({ onBack, onReview }) {
  const toast = useToast();
  const [audience, setAudience] = useState("ALL");
  const [category, setCategory] = useState("ANNOUNCEMENT");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title || !message) return;
    setBusy(true);
    try {
      await part2.post("/announcements", { title, body: message, summary: summary || undefined, category, audience, showOnHomepage, pinned });
      toast("Announcement saved as draft");
      onReview();
    } catch (e) {
      toast(e?.response?.data?.message || "Unable to save announcement");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Communication", link: "/admin/announcements" }, { label: "Create Announcement" }]} />
      <h1 className="admin-xp-title">Create Announcement</h1>
      <p className="admin-xp-desc">Share important updates, training information or organisational announcements.</p>
      <div className="create-ann-grid">
        <div className="admin-panel">
          <label className="admin-form-label">Title *
            <input className="admin-form-input" value={title} onChange={e => setTitle(e.target.value)} />
          </label>
          <label className="admin-form-label" style={{ marginTop: 14 }}>Message *
            <textarea className="admin-remarks-input" style={{ minHeight: 120 }} value={message} onChange={e => setMessage(e.target.value)} />
            <span className="char-count">{message.length}/5000</span>
          </label>
          <label className="admin-form-label" style={{ marginTop: 14 }}>Short summary (optional)
            <input className="admin-form-input" value={summary} onChange={e => setSummary(e.target.value)} />
          </label>
          <label className="admin-form-label" style={{ marginTop: 14 }}>Category
            <select className="admin-form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {["ANNOUNCEMENT","NOTIFICATION","ACHIEVEMENT","NEW_CONTENT"].map((c) => <option key={c} value={c}>{c.replaceAll("_"," ")}</option>)}
            </select>
          </label>
        </div>
        <div>
          <div className="admin-panel" style={{ marginBottom: 14 }}>
            <h3>Audience *</h3>
            <div className="audience-radio-group">
              {[["ALL", "All Users"], ["TRAINEE", "Trainees"], ["TRAINER", "Trainers"], ["ADMIN", "Admins"]].map(([v, l]) => (
                <label key={v} className={`audience-radio ${audience === v ? "selected" : ""}`} onClick={() => setAudience(v)}>
                  <Radio size={14} /> {l}
                </label>
              ))}
            </div>
            <label className="admin-form-label" style={{ marginTop: 12 }}><input type="checkbox" checked={showOnHomepage} onChange={(e) => setShowOnHomepage(e.target.checked)} /> Show on the public homepage</label>
            <label className="admin-form-label"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top</label>
          </div>
          <div className="admin-form-footer" style={{ marginTop: 14 }}>
            <button className="button button-secondary" onClick={onBack}>Cancel</button>
            <button className="button button-primary" disabled={busy || !title || !message} onClick={save}>Save draft →</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ReviewPublishPage({ onBack, onPublish }) {
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Communication" }, { label: "Create Announcement" }, { label: "Review Announcement" }]} />
      <h1 className="admin-xp-title">Review Announcement</h1>
      <p className="admin-xp-desc">Please review the details before publishing.</p>
      <div className="review-ann-grid">
        <div className="admin-panel">
          <div className="review-ann-head"><h3>Announcement Preview</h3><button className="admin-action-btn admin-action-edit"><Edit size={12} /> Edit</button></div>
          <div className="ann-preview-card">
            <div className="ann-preview-icon"><Megaphone size={20} color="#3b82f6" /></div>
            <div>
              <strong>Advanced Radar Interpretation Training</strong>
              <div className="ann-preview-meta">
                <span>To: Trainees (Forecasting Department)</span>
                <span>📅 15 Sep 2026 · 🕙 10:00 AM</span>
              </div>
              <p>We are excited to announce the upcoming training program on Advanced Radar Interpretation. This course will be conducted by domain experts and will help enhance your forecasting capabilities.</p>
            </div>
          </div>
        </div>
        <div className="admin-panel">
          <h3>Announcement Details</h3>
          {[["Title", "Advanced Radar Interpretation Training"], ["Type", "Announcement"], ["Audience", "Trainees"], ["Department", "Forecasting"], ["Scheduled Date", "15 Sep 2026"], ["Scheduled Time", "10:00 AM"], ["Attachments", "Training_Details.pdf · 2.4 MB"]].map(([k, v]) => (
            <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
          ))}
          <div className="admin-form-footer" style={{ marginTop: 16 }}>
            <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Edit</button>
            <button className="button button-primary" onClick={onPublish}><Send size={14} /> Publish Announcement</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PublishedStatusPage({ onNew }) {
  return (
    <Shell eyebrow="" title="" desc="">
      <div className="admin-info-callout" style={{ background: "#dcfce7", borderColor: "#86efac", color: "#15803d", marginBottom: 16 }}>
        <CheckCircle2 size={18} />
        <div>
          <strong>Announcement Published Successfully!</strong>
          <span style={{ marginLeft: 8 }}>The announcement has been delivered to the selected audience.</span>
        </div>
        <button className="button button-primary" style={{ marginLeft: "auto" }} onClick={onNew}>Create New Announcement</button>
      </div>
      <div className="published-grid">
        <div className="admin-panel">
          <h3>Announcement Details <span className="admin-badge admin-badge-approved">Active</span></h3>
          {[["Title", "Advanced Radar Interpretation Training"], ["Type", "Announcement"], ["Audience", "Trainees (Forecasting Department)"], ["Published On", "15 Sep 2026, 10:00 AM"], ["Published By", "Admin User"], ["Attachments", "Training_Details.pdf · 2.4 MB"]].map(([k, v]) => (
            <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
          ))}
        </div>
        <div>
          <div className="admin-panel" style={{ marginBottom: 14 }}>
            <h3>Delivery Status</h3>
            <div className="delivery-donut-wrap">
              <svg viewBox="0 0 100 100" width="90" height="90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray="238.76" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x="50" y="50" textAnchor="middle" dy="5" fontSize="14" fontWeight="800" fill="#1e293b">42</text>
              </svg>
              <div className="delivery-legend">
                {[["Delivered", 42, "#10b981", "100%"], ["Read", 31, "#3b82f6", "74%"], ["Unread", 11, "#f59e0b", "26%"]].map(([l, n, c, pct]) => (
                  <div key={l} className="delivery-legend-item">
                    <span style={{ background: c }} className="delivery-dot" />
                    <span>{l}</span>
                    <b>{n} ({pct})</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="admin-panel">
            <div className="user-detail-section-head"><h3>Recent Activity</h3><Link to="#" className="admin-action-btn admin-action-view" style={{ textDecoration: "none" }}>View All</Link></div>
            <div className="admin-data-table">
              <div className="admin-table-head" style={{ gridTemplateColumns: "0.4fr 1.5fr 1fr 1fr" }}>
                <span>#</span><span>User</span><span>Status</span><span>Time</span>
              </div>
              {[["Asha Sharma", "Read", "10:15 AM"], ["Rahul Mehta", "Read", "10:22 AM"], ["Neha Patil", "Delivered", "10:31 AM"], ["Amit Joshi", "Read", "10:18 AM"], ["Priya Singh", "Delivered", "10:32 AM"]].map(([u, s, t], i) => (
                <div key={i} className="admin-table-row" style={{ gridTemplateColumns: "0.4fr 1.5fr 1fr 1fr" }}>
                  <span>{i+1}</span><span>{u}</span>
                  <span className={`admin-badge ${s === "Read" ? "admin-badge-approved" : "admin-badge-pending"}`}>{s}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 33–36: REPORTS & ANALYTICS
═══════════════════════════════════════════════════════════ */
function ReportsPage() {
  const audit = useApi(() => part2.get("/audit"), []);
  const [detail, setDetail] = useState(null);
  const rows = audit.data?.items || audit.data || [];
  return (
    <Shell
      eyebrow="REPORTS & ANALYTICS"
      title="Reports & Analytics"
      desc="Read-only decision audit. There is no single analytics API; capability, demand, capacity and AI activity stay in their own workspaces."
      action={<Link className="button button-secondary" to="/admin/organizational-capability">Open Capability</Link>}
    >
      <KpiRow items={[
        [ScrollText,String(rows.length || "—"),"Audit records","","#3b82f6"],
        [Users,String(new Set(rows.map((r)=>r.actor?.name || r.actor)).size || "—"),"Actors","","#10b981"],
        [Activity,String(new Set(rows.map((r)=>r.action)).size || "—"),"Decision types","","#8b5cf6"],
        [Clock3,String(new Set(rows.map((r)=>r.entityType)).size || "—"),"Entity types","","#ec4899"],
      ]} />
      <div className="admin-panel">
        <ListState loading={audit.loading} error={audit.error} onRetry={audit.reload} empty={rows.length || audit.loading || audit.error ? null : "No audit records yet."}>
          <DataTable columns={["Time","Actor","Action","Entity","Transition"]} rows={rows.slice(0,20).map((r)=>[fmtDate(r.createdAt || r.timestamp, true),r.actor?.name || "—",r.action,r.entityType,`${r.previousStatus || "—"} → ${r.newStatus || "—"}`])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
        </ListState>
        <p className="muted">Charts are not part of the scope; indicators appear on the dashboard, capability, demand, capacity and AI activity pages. <Link to="/admin/training-demand">Training demand</Link> · <Link to="/admin/trainer-capacity">Trainer capacity</Link></p>
      </div>
      {detail && <DetailModal title={detail.action} subtitle={fmtDate(detail.createdAt || detail.timestamp, true)} onClose={()=>setDetail(null)} wide><DetailRows rows={[["Actor", detail.actor?.name || "—"],["Entity", `${detail.entityType || "—"} ${detail.entityId || ""}`],["Transition", `${detail.previousStatus || "—"} → ${detail.newStatus || "—"}`],["Reason", detail.reason || "—"],["Correlation", detail.correlationId || "—"]]} /></DetailModal>}
    </Shell>
  );
}

const TREND_VALS = [42, 55, 68, 72, 80, 88, 76];
const TREND_MONTHS = ["1 Aug", "8 Aug", "15 Aug", "22 Aug", "29 Aug", "5 Sep", "12 Sep"];

function ConfigureReportPage({ onBack, onGenerate }) {
  const [reportType, setReportType] = useState("Training Participation");
  const REPORT_TYPES = ["Training Participation", "Course-wise Performance", "Certification Reports", "User Activity Report", "Department-wise Analysis", "Trainer Contribution"];
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Reports & Analytics", link: "/admin/audit-logs" }, { label: "Configure Report" }]} />
      <h1 className="admin-xp-title">Configure Report</h1>
      <p className="admin-xp-desc">Select report type and apply filters to generate the report.</p>
      <div className="configure-report-grid">
        <div className="admin-panel">
          <label className="admin-form-label">Report Type *
            <select className="admin-form-select" style={{ width: "100%", marginTop: 6 }} value={reportType} onChange={e => setReportType(e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <p className="admin-info-note" style={{ marginTop: 10 }}><Info size={13} /> This report provides insights on enrolments, attendance, completion and participation across courses and departments.</p>
          <label className="admin-form-label" style={{ marginTop: 14 }}>Date Range *
            <div className="date-range-row">
              <input type="date" className="admin-form-input" defaultValue="2026-08-01" />
              <span>–</span>
              <input type="date" className="admin-form-input" defaultValue="2026-09-16" />
            </div>
          </label>
          {[["Department", ["All Departments", "Forecasting Division", "R&D", "Regional Centres"]], ["Course", ["All Courses", "Radar Interpretation", "Climate Analysis"]], ["User Role", ["All Roles", "Trainee", "Trainer"]], ["Status", ["All Status", "Active", "Completed"]]].map(([label, opts]) => (
            <label key={label} className="admin-form-label" style={{ marginTop: 14 }}>{label}
              <select className="admin-form-select" style={{ width: "100%", marginTop: 6 }}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </label>
          ))}
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            <label className="filter-check"><input type="checkbox" defaultChecked /> Include assessment performance</label>
            <label className="filter-check"><input type="checkbox" defaultChecked /> Include department comparison</label>
          </div>
          <button className="button button-primary" style={{ width: "100%", marginTop: 16 }} onClick={onGenerate}>Generate Report →</button>
        </div>
        <div className="admin-panel">
          <h3>Live Preview (Sample Data)</h3>
          <div className="preview-kpi-grid">
            {[["Total Participants", "284", "#3b82f6"], ["Completed", "196", "#10b981"], ["In Progress", "62", "#f59e0b"], ["Not Started", "26", "#ef4444"]].map(([l, v, c]) => (
              <div key={l} className="preview-kpi-card" style={{ borderColor: c + "44", background: c + "11" }}>
                <b style={{ color: c, fontSize: 22 }}>{v}</b>
                <span style={{ fontSize: 11, color: "#64748b" }}>{l}</span>
              </div>
            ))}
          </div>
          <h4 style={{ margin: "16px 0 10px", fontSize: 13, color: "#334155" }}>Participation Trend (Sample)</h4>
          <div className="preview-trend-chart">
            {TREND_VALS.map((v, i) => (
              <div key={i} className="prev-trend-col">
                <div className="prev-trend-bar" style={{ height: `${(v / 100) * 100}px` }} />
                <span className="prev-trend-label">{TREND_MONTHS[i].split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ReportOutputPage({ onBack, onAnother }) {
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Reports & Analytics", link: "/admin/audit-logs" }, { label: "Report Output" }]} />
      <div className="admin-info-callout" style={{ background: "#dcfce7", borderColor: "#86efac", color: "#15803d", marginBottom: 16 }}>
        <CheckCircle2 size={18} />
        <span><strong>Report Generated Successfully!</strong> Your report has been generated and is ready to download.</span>
        <button className="button button-secondary" style={{ marginLeft: "auto" }} onClick={onAnother}>Generate Another Report</button>
      </div>
      <div className="report-output-grid">
        <div className="admin-panel">
          <h3>Report Summary</h3>
          {[["Report Type", "Training Participation"], ["Date Range", "01 Aug 2026 – 15 Sep 2026"], ["Department", "All Departments"], ["Course", "All Courses"], ["Status", "All Status"], ["Generated On", "15 Sep 2026, 10:42 AM"], ["Generated By", "Admin User"]].map(([k, v]) => (
            <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
          ))}
        </div>
        <div>
          <div className="admin-panel" style={{ marginBottom: 14 }}>
            <h3>Download Report</h3>
            <div className="download-options">
              <div className="download-card download-pdf">
                <FileText size={28} color="#ef4444" />
                <div><strong>Download PDF</strong><small>Complete report with charts and tables</small></div>
                <button className="button button-primary" style={{ background: "#ef4444", borderColor: "#ef4444" }}><Download size={13} /> Download PDF</button>
              </div>
              <div className="download-card download-csv">
                <FileText size={28} color="#10b981" />
                <div><strong>Download CSV</strong><small>Raw data in CSV format for further analysis</small></div>
                <button className="button button-primary" style={{ background: "#10b981", borderColor: "#10b981" }}><Download size={13} /> Download CSV</button>
              </div>
            </div>
          </div>
          <div className="admin-panel report-preview-card">
            <h3>Report Preview</h3>
            <div className="report-preview-inner">
              <div className="report-preview-header">
                <div className="report-preview-logo">SAMARTHYA</div>
                <h4>Training Participation Report</h4>
                <small>01 Aug 2026 – 15 Sep 2026</small>
              </div>
              <div className="report-preview-summary">
                {[["284", "Total Enrollments"], ["196", "Completed"], ["78%", "Participation Rate"], ["5", "Courses Included"]].map(([v, l]) => (
                  <div key={l}><b>{v}</b><span>{l}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-panel">
        <h3>Course-wise Details</h3>
        <DataTable
          columns={["Course Name", "Department", "Enrolled", "Completed", "In Progress", "Not Started", "Completion Rate"]}
          rows={[
            ["Advanced Radar Interpretation", "Forecasting", "68", "52", "12", "4", "76%"],
            ["Climate Modelling Basics", "Climate", "38", "24", "10", "4", "63%"],
            ["Satellite Data Analysis", "R&D", "45", "32", "8", "5", "71%"],
            ["Weather Forecasting Systems", "Forecasting", "72", "48", "18", "6", "67%"],
            ["Data Analysis with Python", "Administration", "44", "30", "8", "6", "68%"],
          ]}
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 37–40: FEEDBACK
═══════════════════════════════════════════════════════════ */
const FEEDBACK_ROWS = [
  ["Advanced Radar Interpretation", "★ 4.6", "245", "Excellent"],
  ["Climate Modelling Basics", "★ 4.1", "189", "Good"],
  ["Satellite Data Analysis", "★ 3.8", "156", "Needs Improvement"],
  ["Weather Forecasting Systems", "★ 4.3", "201", "Good"],
  ["Data Analysis with Python", "★ 3.8", "134", "Needs Improvement"],
];

function FeedbackPage() {
  const [view, setView] = useState("overview");
  const [selected, setSelected] = useState(null);
  const fb = useApi(() => part3.get("/feedback"), []);
  const aggregates = fb.data?.aggregates || [];
  const responses = fb.data?.responses || [];
  if (view === "details") return <FeedbackDetailsPage aggregate={selected} responses={responses} privacy={fb.data?.privacy} onBack={() => setView("overview")} />;
  const [tab, setTab] = useState("all");
  const shown = aggregates.filter((a) => tab === "all" || (a.targetType || "").toLowerCase().includes(tab === "courses" ? "course" : tab === "trainers" ? "trainer" : tab));
  return (
    <Shell
      eyebrow="FEEDBACK"
      title="Feedback Overview"
      desc="Scoped participant feedback. Feedback never verifies competency or determines trainer suitability."
      action={<Link className="button button-secondary" to="/admin/feedback">Open Feedback</Link>}
    >
      <KpiRow items={[
        [Star, String(shown.length || "—"), "Feedback targets", "", "#f59e0b"],
        [FileText, String(responses.length || shown.reduce((n,a)=>n+(a.count||0),0)), "Responses", "", "#3b82f6"],
        [ThumbsUp, String(shown.filter((a)=>Number(a.average) >= 4).length), "High-rated targets", "", "#10b981"],
        [ThumbsDown, String(shown.filter((a)=>Number(a.average) < 4).length), "Lower-rated targets", "", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[{ id: "all", label: "All Feedback" }, { id: "courses", label: "Courses" }, { id: "trainers", label: "Trainers" }]}
          active={tab}
          onChange={(t) => setTab(t)}
        />
        <ListState loading={fb.loading} error={fb.error} onRetry={fb.reload} empty={shown.length || fb.loading || fb.error ? null : "No feedback in scope."}>
          <DataTable
            columns={["Target", "Responses", "Average", "Batch"]}
            rows={shown.map((a)=>[a.targetType, String(a.count), `${Number(a.average).toFixed(1)} / 5`, String(a.batch || "—")])}
            onView={(i) => { setSelected(shown[i]); setView("details"); }}
            viewLabel="View"
          />
        </ListState>
        <p className="muted">{fb.data?.privacy || ""}</p>
      </div>
    </Shell>
  );
}

function FeedbackDetailsPage({ aggregate, responses, privacy, onBack }) {
  const rows = (responses || []).filter((r) => !aggregate || String(r.target) === String(aggregate.target));
  const [detail, setDetail] = useState(null);
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Feedback Overview" }, { label: "Feedback Details" }]} />
      <h1 className="admin-xp-title">Feedback Details</h1>
      <p className="admin-xp-desc">{aggregate ? `${aggregate.targetType} · ${aggregate.count} responses · avg ${Number(aggregate.average).toFixed(1)} / 5` : "Identified participant responses."}</p>
      <div className="admin-panel">
        <ListState loading={false} error="" empty={rows.length ? null : "No identified responses in scope."}>
          <DataTable columns={["Participant","Rating","Comment","Date"]} rows={rows.slice(0,20).map((r)=>[r.trainee?.name || r.trainee || "—",`${r.rating} / 5`,(r.comment || "").slice(0,80),fmtDate(r.createdAt)])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
        </ListState>
        <p className="muted">{privacy || ""}</p>
        <div className="admin-form-footer"><button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Back</button></div>
      </div>
      {detail && <DetailModal title={detail.trainee?.name || "Response"} subtitle={`${detail.rating} / 5 · ${fmtDate(detail.createdAt)}`} onClose={()=>setDetail(null)}><p>{detail.comment || "No comment added."}</p></DetailModal>}
    </Shell>
  );
}

function FeedbackLegacyDetails({ onBack, onTrends }) {
  const [tab, setTab] = useState("all");
  const REVIEWS = [
    ["A", "Asha Sharma", "★★★★★", "Very well structured content. Helped me understand radar data interpretation clearly.", "15 Sep 2026"],
    ["R", "Rahul Mehta", "★★★★", "Good training overall. More hands-on examples would be helpful.", "14 Sep 2026"],
    ["N", "Neha Patil", "★★★★", "Content was good but the pace was a bit fast.", "14 Sep 2026"],
    ["A", "Amit Joshi", "★★★★★", "Excellent trainer and practical examples.", "13 Sep 2026"],
    ["P", "Priya Singh", "★★★★", "Useful content, but would be great to have more real-world case studies.", "13 Sep 2026"],
  ];
  return (
    <Shell eyebrow="" title="Feedback sample" desc="Static sample kept for layout reference.">
      <div className="feedback-detail-header">
        <div className="feedback-course-card">
          <div className="feedback-course-icon"><Megaphone size={22} color="#3b82f6" /></div>
          <div>
            <h3>Advanced Radar Interpretation Training</h3>
            <p>Trainers (Forecasting Department)</p>
            <span>15 Sep 2026 · 245 feedback responses</span>
          </div>
        </div>
        <div className="feedback-rating-summary">
          <div className="feedback-big-rating">
            <Star size={28} color="#f59e0b" fill="#f59e0b" />
            <span className="feedback-big-num">4.6</span>
            <span>Average Rating</span>
          </div>
          <div className="feedback-rating-bars">
            {[[5, 63], [4, 24], [3, 8], [2, 4], [1, 2]].map(([stars, pct]) => (
              <div key={stars} className="rating-bar-row">
                <span>{stars}★</span>
                <div className="admin-cap-bar-bg"><div className="admin-cap-bar-fill" style={{ width: `${pct}%`, background: "#f59e0b" }} /></div>
                <span>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Tabs
        tabs={[{ id: "all", label: "All Feedback", count: 245 }, { id: "positive", label: "Positive (210)" }, { id: "neutral", label: "Neutral (25)" }, { id: "negative", label: "Negative (10)" }]}
        active={tab}
        onChange={setTab}
      />
      <div className="admin-panel">
        <div className="feedback-reviews-list">
          {REVIEWS.map(([initial, name, stars, comment, date]) => (
            <div key={name} className="feedback-review-card">
              <div className="feedback-reviewer-avatar">{initial}</div>
              <div className="feedback-review-body">
                <div className="feedback-review-head">
                  <strong>{name}</strong>
                  <span className="feedback-stars">{stars}</span>
                  <span className="feedback-date">{date}</span>
                </div>
                <p>{comment}</p>
              </div>
              <button className="admin-action-btn admin-action-view"><Eye size={12} /> View</button>
            </div>
          ))}
        </div>
        <div className="admin-form-footer">
          <button className="button button-secondary" onClick={onTrends}><TrendingUp size={14} /> View Trends</button>
        </div>
      </div>
    </Shell>
  );
}

function FeedbackTrendsPage({ onBack, onAction }) {
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Feedback Overview" }, { label: "Feedback Trends" }]} />
      <h1 className="admin-xp-title">Feedback Trends</h1>
      <p className="admin-xp-desc">Analyze feedback patterns and trends to identify strengths and areas for improvement.</p>
      <div className="trends-filter-bar">
        <div className="admin-search-filter">
          <label className="admin-form-label" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>Date Range
            <input type="date" className="admin-form-input" defaultValue="2026-08-01" />
            <span>–</span>
            <input type="date" className="admin-form-input" defaultValue="2026-09-15" />
          </label>
          <select className="admin-filter-select"><option>All Departments</option></select>
          <select className="admin-filter-select"><option>All Courses</option></select>
        </div>
      </div>
      <KpiRow items={[
        [Star, "4.2", "Average Rating", "+0.3 from last period", "#f59e0b"],
        [TrendingUp, "+12%", "Feedback Volume", "", "#10b981"],
        [ThumbsUp, "86%", "Positive Feedback", "", "#10b981"],
        [ThumbsDown, "14%", "Negative Feedback", "", "#ef4444"],
      ]} />
      <div className="trends-grid">
        <div className="admin-panel">
          <div className="trends-head"><h3>Average Rating Trend</h3>
            <select className="admin-filter-select"><option>Weekly</option><option>Monthly</option></select>
          </div>
          <div className="rating-trend-chart">
            {[4.0, 4.1, 3.9, 4.2, 4.3, 4.2, 4.4].map((v, i) => (
              <div key={i} className="rat-trend-col">
                <div className="rat-trend-bar" style={{ height: `${(v / 5) * 100}px` }} />
                <span className="prev-trend-label">{TREND_MONTHS[i].split(" ")[0]}</span>
              </div>
            ))}
          </div>
          <div className="trends-themes">
            <div>
              <h4>Top Positive Feedback Themes</h4>
              {[["Clear Content", 62], ["Practical Examples", 45], ["Good Structure", 41], ["Easy to Understand", 38], ["Relevant to Job", 35]].map(([t, v]) => (
                <div key={t} className="theme-row"><span>{t}</span>
                  <div className="admin-cap-bar-bg"><div className="admin-cap-bar-fill" style={{ width: `${v}%`, background: "#10b981" }} /></div>
                  <span>{v}%</span>
                </div>
              ))}
            </div>
            <div>
              <h4>Top Improvement Areas</h4>
              {[["More Hands-on Practice", 48], ["Slower Pace", 32], ["Real-world Case Studies", 28], ["Improved Content Depth", 22], ["Better Visual Materials", 19]].map(([t, v]) => (
                <div key={t} className="theme-row"><span>{t}</span>
                  <div className="admin-cap-bar-bg"><div className="admin-cap-bar-fill" style={{ width: `${v}%`, background: "#ef4444" }} /></div>
                  <span>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="admin-panel">
          <h3>Feedback Distribution</h3>
          <div className="feedback-donut-wrap">
            <svg viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="14"
                strokeDasharray={`${0.86 * 238.76} ${0.14 * 238.76}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#94a3b8" strokeWidth="14"
                strokeDasharray={`${0.08 * 238.76} ${0.92 * 238.76}`} strokeLinecap="round"
                transform={`rotate(${-90 + 0.86 * 360} 50 50)`} />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="14"
                strokeDasharray={`${0.06 * 238.76} ${0.94 * 238.76}`} strokeLinecap="round"
                transform={`rotate(${-90 + 0.94 * 360} 50 50)`} />
              <text x="50" y="47" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1e293b">1,248</text>
              <text x="50" y="57" textAnchor="middle" fontSize="7" fill="#64748b">Total</text>
            </svg>
            <div className="feedback-dist-legend">
              {[["Positive", "86%", "#10b981"], ["Neutral", "8%", "#94a3b8"], ["Negative", "6%", "#ef4444"]].map(([l, p, c]) => (
                <div key={l} className="delivery-legend-item">
                  <span style={{ background: c }} className="delivery-dot" />
                  <span>{l}</span><b>{p}</b>
                </div>
              ))}
            </div>
          </div>
          <button className="button button-primary" style={{ width: "100%", marginTop: 16 }} onClick={onAction}>+ Create Improvement Action</button>
        </div>
      </div>
    </Shell>
  );
}

function ImprovementActionPage({ onBack }) {
  const [saved, setSaved] = useState(false);
  if (saved) return (
    <Shell title="Improvement Action Saved" desc="">
      <div className="admin-panel admin-success-card">
        <CheckCircle2 size={48} color="#10b981" />
        <h2>Improvement Action Created</h2>
        <p>The improvement action has been recorded and assigned to the Training Team.</p>
        <button className="button button-primary" onClick={() => setSaved(false)}>Back to Trends</button>
      </div>
    </Shell>
  );
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Feedback Overview" }, { label: "Feedback Trends" }, { label: "Create Improvement Action" }]} />
      <h1 className="admin-xp-title">Create Improvement Action</h1>
      <p className="admin-xp-desc">Record and track improvement actions based on feedback insights.</p>
      <div className="improvement-action-grid">
        <div className="admin-panel">
          <h3>Action Details</h3>
          <div className="admin-form-grid">
            <label className="admin-form-label">Related Course *
              <select className="admin-form-select"><option>Climate Modelling Basics</option><option>Radar Interpretation</option></select>
            </label>
            <label className="admin-form-label">Target Completion Date *
              <input type="date" className="admin-form-input" defaultValue="2026-09-30" />
            </label>
            <label className="admin-form-label">Feedback Issue *
              <select className="admin-form-select"><option>More Hands-on Practice</option><option>Slower Pace</option></select>
            </label>
            <label className="admin-form-label">Responsible Person
              <select className="admin-form-select"><option>Training Team</option><option>Course Coordinator</option></select>
            </label>
            <label className="admin-form-label" style={{ gridColumn: "span 2" }}>Action Title *
              <input className="admin-form-input" defaultValue="Add hands-on exercises and practice sessions." />
            </label>
            <label className="admin-form-label" style={{ gridColumn: "span 2" }}>Description *
              <textarea className="admin-remarks-input" rows={3} defaultValue="Based on trainee feedback, we will include additional hands-on exercises and real-world case studies in the next batch." />
              <span className="char-count">0/500</span>
            </label>
            <label className="admin-form-label">Status
              <select className="admin-form-select"><option>Planned</option><option>In Progress</option><option>Completed</option></select>
            </label>
            <label className="admin-form-label">Attachments (Optional)
              <div className="ann-upload-zone" style={{ padding: "12px" }}><Upload size={16} color="#94a3b8" /><span style={{ fontSize: 11, color: "#64748b" }}>Click to upload</span></div>
            </label>
          </div>
          <div className="priority-selector">
            <label className="admin-form-label">Priority</label>
            <div className="priority-radio-group">
              {["High", "Medium", "Low"].map((p) => (
                <label key={p} className={`priority-radio priority-${p.toLowerCase()}`}>
                  <input type="radio" name="priority" value={p} defaultChecked={p === "High"} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="admin-form-footer">
            <button className="button button-secondary" onClick={onBack}>Cancel</button>
            <button className="button button-primary" onClick={() => setSaved(true)}>Save Action →</button>
          </div>
        </div>
        <div>
          <div className="admin-panel improvement-insights">
            <h3>Related Insights</h3>
            {[["48%", "of trainees suggested more hands-on practice.", "#ef4444"], ["32%", "mentioned the pace was fast.", "#f59e0b"], ["28%", "requested more real-world examples.", "#8b5cf6"]].map(([pct, text, color]) => (
              <div key={pct} className="insight-card" style={{ borderLeft: `4px solid ${color}` }}>
                <b style={{ color, fontSize: 20 }}>{pct}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="admin-panel" style={{ marginTop: 14 }}>
            <h3>Expected Outcome</h3>
            <div className="expected-outcome">
              <CheckCircle2 size={16} color="#10b981" />
              <p>Improve trainee satisfaction and better practical understanding of concepts.</p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   REMAINING PAGES (from previous implementation)
═══════════════════════════════════════════════════════════ */

/* KPI mini row (re-exported) */
function KpiRowFull({ items }) { return <KpiRow items={items} />; }

function CapabilityMapPage() {
  const capability = useApi(() => part3.get("/capability"), []);
  const [cellDetail, setCellDetail] = useState(null);
  const coverage = capability.data?.coverage || [];
  return (
    <Shell eyebrow="CAPABILITY" title="Organizational Capability Map" desc="Coverage derived from reviewed evidence. Missing evidence is NOT_ASSESSED, not zero ability.">
      <KpiRow items={[[Users,String(coverage.filter((c)=>(c.belowRequiredCount||0) > 0).length || "—"),"Competencies below requirement","","#f59e0b"],[CheckCircle2,String(capability.data?.reviewedTrainerCount ?? capability.data?.pendingReviewCount ?? "—"),"Reviewed trainers / pending","","#10b981"],[Activity,String(capability.data?.label || "Coverage"),"Label","","#3b82f6"],[Bell,String(capability.data?.pendingReviewCount ?? "—"),"Pending reviews","","#ef4444"]]} />
      <div className="admin-panel">
        <ListState loading={capability.loading} error={capability.error} onRetry={capability.reload} empty={coverage.length || capability.loading || capability.error ? null : "No capability coverage recorded."}>
          <div className="admin-data-table">
            <div className="admin-table-head" style={{ gridTemplateColumns: "2fr 1.5fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr" }}>
              <span>Competency</span><span>Role</span><span>Required</span><span>Meeting</span><span>Below</span><span>Not assessed</span><span>Action</span>
            </div>
            {coverage.map((c, i) => (
              <div key={i} className="admin-table-row" style={{ gridTemplateColumns: "2fr 1.5fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr" }}>
                <span>{c.competency?.name || "—"}</span><span>{c.jobRole?.title || "—"}</span>
                <span className="admin-level-badge">{c.requiredLevel != null ? `L${c.requiredLevel}` : "—"}</span>
                <span>{c.meetingCount ?? "—"}</span><span>{c.belowRequiredCount ?? "—"}</span><span>{c.notAssessedCount ?? "—"}</span>
                <span className="admin-table-actions"><button className="admin-action-btn admin-action-view" onClick={() => setCellDetail(c)}><Eye size={12} /> View</button></span>
              </div>
            ))}
          </div>
        </ListState>
        <p className="muted">Application-level indicator over stored records, never a forecast. Full analytics stay in Organizational Capability.</p>
      </div>
      {cellDetail && <DetailModal title={cellDetail.competency?.name || "Coverage detail"} subtitle={`${cellDetail.jobRole?.title || ""} · Required L${cellDetail.requiredLevel}`} onClose={() => setCellDetail(null)} wide actions={<Link className="button button-secondary" to="/admin/organizational-capability">Open capability map</Link>}><DetailRows rows={[["Denominator", String(cellDetail.denominator ?? "—")],["Meeting", String(cellDetail.meetingCount ?? "—")],["Below required", String(cellDetail.belowRequiredCount ?? "—")],["Not assessed", String(cellDetail.notAssessedCount ?? "—")],["Not comparable", String(cellDetail.notComparableCount ?? "—")],["Review due", String(cellDetail.reviewDueCount ?? "—")],["Pending demand", String(cellDetail.pendingTrainingDemand ?? "—")],["Recommended", cellDetail.recommendedAction || "—"]]} /></DetailModal>}
    </Shell>
  );
}

const COMP_ROWS = [["Radar Interpretation","Core Meteorological","Interpreting radar data for weather monitoring.","5 levels","4","Active"],["Climate Analysis","Core Meteorological","Analyzing climate patterns and anomalies.","5 levels","3","Active"],["Numerical Weather Prediction","Technical","Using NWP models for operational forecasting.","4 levels","5","Active"],["Weather Forecasting","Core Meteorological","Preparing and issuing weather forecasts.","5 levels","6","Active"],["Instrumentation","Technical","Operating meteorological instruments.","4 levels","4","Active"],["Hydrometeorology","Core Meteorological","Hydrometeorological analysis.","4 levels","3","Active"]];
const LEVEL_ROWS = [["L1","Basic","Understands basic radar concepts.","MCQ","≥60%"],["L2","Developing","Interprets standard products with guidance.","MCQ+Practical","≥65%"],["L3","Proficient","Interprets independently.","MCQ+Practical+Evidence","≥70%"],["L4","Advanced","Analyzes complex data.","All+Expert Review","≥80%"],["L5","Expert","Leads innovation and mentors.","Comprehensive","Portfolio+review"]];

function CompetencyDetails2({ onBack }) {
  const [tab, setTab] = useState("overview");
  return (
    <Shell eyebrow={<Breadcrumb items={[{label:"Competency Framework"},{label:"Radar Interpretation"}]}/>} title="Radar Interpretation" badge="Active" desc="Interpret radar data for weather monitoring, nowcasting and severe weather detection." action={<button className="button button-primary"><Edit size={14}/> Edit Competency</button>}>
      <Tabs tabs={[{id:"overview",label:"Overview"},{id:"levels",label:"Levels & Criteria"},{id:"methods",label:"Assessment Methods"},{id:"roles",label:"Mapped Roles (4)"},{id:"courses",label:"Related Courses (4)"}]} active={tab} onChange={setTab}/>
      {tab==="overview"&&<div className="detail-grid"><div className="admin-panel"><h3>Basic Information</h3>{[["Category","Core Meteorological"],["Domain","Weather Observation"],["Keywords","Radar · Nowcasting · Precipitation"]].map(([k,v])=>(<div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>))}<h3 style={{marginTop:"1.5rem"}}>Assessment Methods</h3><div className="admin-method-chips">{["MCQ assessment","Practical assessment","Evidence submission","Expert review"].map(m=>(<span key={m} className="admin-method-chip">{m}</span>))}</div></div><div className="admin-panel"><h3>Competency Levels (L1–L5)</h3>{LEVEL_ROWS.map(([l,n,d])=>(<div key={l} className="admin-level-rule"><span className="admin-level-badge-lg">{l}</span><div><strong>{n}</strong><small>{d}</small></div></div>))}</div></div>}
      {tab==="levels"&&<div className="admin-panel"><DataTable columns={["Level","Name","Description","Method","Passing Criteria"]} rows={LEVEL_ROWS}/></div>}
      {(tab==="methods"||tab==="roles"||tab==="courses")&&<div className="admin-panel" style={{textAlign:"center",padding:"3rem"}}><Activity size={36} color="#94a3b8"/><p style={{color:"#64748b",marginTop:"1rem"}}>{tab} details.</p></div>}
    </Shell>
  );
}

function CompetencyFrameworkPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewing, setViewing] = useState(null);
  const [query, setQuery] = useState("");
  const toast = useToast();
  const list = useApi(() => part2.get("/competencies", { limit: 50 }), []);
  const items = list.data?.items || list.data || [];
  const filtered = items.filter((c) => (activeTab === "all" || (c.domain || "").toLowerCase().includes(activeTab === "core" ? "core" : activeTab)) && (!query || `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase())));
  if (viewing) {
    const row = viewing;
    return (
      <Shell eyebrow={<Breadcrumb items={[{label:"Competency Framework", link:"/admin/competencies"},{label: row.name}]}/>} title={row.name} badge={row.status} desc={row.description} action={<button className="button button-secondary" onClick={()=>setViewing(null)}><ArrowLeft size={14}/> Back to list</button>}>
        <Tabs tabs={[{id:"overview",label:"Overview"},{id:"levels",label:"Levels & Criteria"}]} active="overview" onChange={()=>{}}/>
        <div className="detail-grid"><div className="admin-panel"><h3>Basic Information</h3><DetailRows rows={[["Code", row.code || "—"],["Domain", row.domain || "—"],["Version", row.version != null ? `v${row.version}` : "—"],["Status", row.status || "—"]]} /><h3 style={{marginTop:"1.5rem"}}>Assessment Methods</h3><div className="admin-method-chips">{["MCQ assessment","Practical assessment","Evidence submission","Expert review"].map(m=>(<span key={m} className="admin-method-chip">{m}</span>))}</div></div><div className="admin-panel"><h3>Competency Levels</h3>{(row.levels||[]).map((l)=>(<div key={l.value} className="admin-level-rule"><span className="admin-level-badge-lg">L{l.value}</span><div><strong>{l.label}</strong><small>{l.definition}</small></div></div>))}</div></div>
        {row.status === "DRAFT" && <div className="admin-panel"><button className="button button-primary" disabled={list.busy} onClick={() => list.run(() => part2.post(`/competencies/${row._id}/publish`, {}), toast, "Competency published for course mapping")}>Publish competency</button></div>}
      </Shell>
    );
  }
  return (
    <Shell eyebrow="CAPABILITY" title="Competency Framework" desc="Versioned competencies and plain-language levels. Creation stays in Competencies; publishing is audited." action={<Link className="button button-primary" to="/admin/competencies">Open Competencies</Link>}>
      <KpiRow items={[[Fingerprint,String(items.length),"Total Competencies","","#3b82f6"],[CheckCircle2,String(items.filter((c)=>c.status==="PUBLISHED").length),"Published","","#10b981"],[Activity,String(items.filter((c)=>c.status==="DRAFT").length),"Drafts","","#8b5cf6"],[Globe,String(new Set(items.map((c)=>String(c.domain))).size),"Domains","","#f59e0b"]]}/>
      <div className="admin-panel">
        <Tabs tabs={[{id:"all",label:"All Competencies",count:items.length},{id:"core",label:"Core",count:items.filter((c)=>(c.domain||"").toLowerCase().includes("core")).length},{id:"technical",label:"Technical",count:items.filter((c)=>(c.domain||"").toLowerCase().includes("tech")).length}]} active={activeTab} onChange={setActiveTab}/>
        <SearchFilter placeholder="Search competencies..." value={query} onChange={setQuery}/>
        <ListState loading={list.loading} error={list.error} onRetry={list.reload} empty={filtered.length || list.loading || list.error ? null : "No competencies recorded."}>
          <DataTable columns={["Competency Name","Code","Domain","Levels","Status"]} rows={filtered.map((c)=>[c.name,c.code,c.domain,(c.levels||[]).map((l)=>`L${l.value}`).join(" · "),c.status])} onView={(i)=>setViewing(filtered[i])} viewLabel="View"/>
        </ListState>
      </div>
    </Shell>
  );
}

function RoleMappingPage() {
  const [params]=useSearchParams();const stage=params.get("screen");
  const [selected, setSelected] = useState(null);
  const roles = useApi(() => part2.get("/job-roles"), []);
  const competencies = useApi(() => part2.get("/competencies", { limit: 50 }), [selected?._id]);
  const requirements = useApi(() => (selected?._id ? part2.get(`/job-roles/${selected._id}/requirements`) : Promise.resolve([])), [selected?._id]);
  const roleRows = Array.isArray(roles.data) ? roles.data : [];
  const reqRows = Array.isArray(requirements.data) ? requirements.data : [];
  if(stage==="edit")return<Shell eyebrow="Role Mapping" title="Edit Role Mapping" desc="Radar Interpretation"><div className="admin-panel"><div className="admin-form-grid">{[["Role","select",["Scientist B","Scientist C","Meteorologist"]],["Current Required Level","text","L2 – Developing"],["New Required Level","select",["L1 – Basic","L2 – Developing","L3 – Proficient","L4 – Advanced"]],["Importance","select",["Low","Medium","High","Critical"]]].map(([label,type,val])=>(<label key={label} className="admin-form-label">{label}{type==="select"?<select className="admin-form-select">{val.map(o=><option key={o}>{o}</option>)}</select>:<input className="admin-form-input" defaultValue={val} readOnly/>}</label>))}</div><div className="admin-form-footer"><Link className="button button-secondary" to="/admin/job-role-requirements">Cancel</Link><Link className="button button-primary" to="/admin/job-role-requirements?screen=confirm">Review Changes →</Link></div></div></Shell>;
  if(stage==="confirm")return<Shell title="Confirm Role Mapping Changes"><div className="admin-panel"><div className="admin-change-table"><b>Role</b><b>Current</b><b>New</b><b>Old Importance</b><b>New Importance</b><span>Scientist B</span><span>L2</span><span className="admin-badge admin-badge-active">L3</span><span>Medium</span><span className="admin-badge admin-badge-active">High</span></div><div className="admin-form-footer"><Link className="button button-secondary" to="/admin/job-role-requirements?screen=edit">← Back</Link><Link className="button button-primary" to="/admin/job-role-requirements?screen=success">Confirm & Update</Link></div></div></Shell>;
  if(stage==="success")return<Shell title="Role Mapping Updated"><div className="admin-panel admin-success-card"><CheckCircle2 size={48} color="#10b981"/><h2>Updated Successfully</h2><Link className="button button-primary" to="/admin/job-role-requirements">View Updated Role Mapping</Link></div></Shell>;
  return(
    <Shell eyebrow="CAPABILITY" title="Role Mapping" desc="Proposed professional-role requirements, separate from access roles. Role changes happen only through TTT verification." action={<Link className="button button-primary" to="/admin/job-role-requirements">Open Role Mapping</Link>}>
      <KpiRow items={[[Users,String(roleRows.length),"Roles Mapped","","#3b82f6"],[Target,String(reqRows.length),"Requirements (selected role)","","#8b5cf6"],[CheckCircle2,String((competencies.data?.items || competencies.data || []).filter((c)=>c.status==="PUBLISHED").length),"Published competencies","","#10b981"],[Bell,String(roleRows.filter((r)=>r.status!=="ACTIVE").length),"Non-active roles","","#ef4444"]]}/>
      <div className="admin-panel">
        <ListState loading={roles.loading} error={roles.error} onRetry={roles.reload} empty={roleRows.length || roles.loading || roles.error ? null : "No professional roles recorded."}>
          <DataTable columns={["Role","Description","Status"]} rows={roleRows.map((r)=>[r.title,r.description || "—",r.status || "—"])} onView={(i)=>setSelected(roleRows[i])} viewLabel="Requirements"/>
        </ListState>
      </div>
      {selected && <DetailModal title={selected.title} subtitle="Versioned requirements" onClose={()=>setSelected(null)} wide actions={<Link className="button button-secondary" to="/admin/job-role-requirements">Open full workspace</Link>}>
        <ListState loading={requirements.loading} error={requirements.error} onRetry={requirements.reload} empty={reqRows.length || requirements.loading || requirements.error ? null : "No requirements mapped to this role."}>
          <DataTable columns={["Competency","Level","Version"]} rows={reqRows.map((r)=>[r.competency?.name || r.competency,`L${r.requiredLevel}`,`v${r.version}`])}/>
        </ListState>
        <p className="muted">Requirements are versioned application configuration, not IMD standards. Adding or editing stays in Role Mapping.</p>
      </DetailModal>}
    </Shell>
  );
}

function SkillGapPage(){
  const capability = useApi(() => part3.get("/capability"), []);
  const demand = useApi(() => part3.get("/training-demand"), []);
  const [detail, setDetail] = useState(null);
  const coverage = capability.data?.coverage || [];
  const demandRows = demand.data?.rows || [];
  const gapRows = coverage.filter((c) => (c.belowRequiredCount || 0) > 0 || (c.notAssessedCount || 0) > 0);
  return<Shell eyebrow="CAPABILITY" title="Skill Gap Analysis" desc="Coverage gaps derived from reviewed evidence. NOT_ASSESSED is kept separate from below-required."><KpiRow items={[[AlertTriangle,String(gapRows.length),"Competencies with gaps","","#f59e0b"],[Users,String(demand.data?.summary?.totalPeopleNeedingDevelopment ?? "—"),"People needing development","","#ef4444"],[Zap,String(demand.data?.summary?.competenciesWithTrainerCapacityGap ?? "—"),"Trainer capacity gaps","","#ef4444"],[TrendingUp,String(demand.data?.summary?.competenciesWithDemand ?? "—"),"Competencies with demand","","#10b981"]]}/><div className="admin-panel">
    <ListState loading={capability.loading} error={capability.error} onRetry={capability.reload} empty={gapRows.length || capability.loading || capability.error ? null : "No coverage gaps recorded."}>
      <DataTable columns={["Competency","Role","Required","Meeting","Below","Not assessed","Action"]} rows={gapRows.map((c)=>[c.competency?.name || "—",c.jobRole?.title || "—",c.requiredLevel != null ? `L${c.requiredLevel}` : "—",String(c.meetingCount ?? "—"),String(c.belowRequiredCount ?? "—"),String(c.notAssessedCount ?? "—"),c.trainerCapacityGap ? "Capacity gap" : (c.recommendedAction || "Review")])} onView={(i)=>setDetail(gapRows[i])} viewLabel="View"/>
    </ListState></div>
    {detail && <DetailModal title={detail.competency?.name || "Coverage detail"} subtitle={`${detail.jobRole?.title || ""} · Required L${detail.requiredLevel}`} onClose={()=>setDetail(null)} wide actions={<Link className="button button-secondary" to="/admin/training-demand">Open training demand</Link>}><DetailRows rows={[["Denominator", String(detail.denominator ?? "—")],["Meeting", String(detail.meetingCount ?? "—")],["Below required", String(detail.belowRequiredCount ?? "—")],["Not assessed", String(detail.notAssessedCount ?? "—")],["Not comparable", String(detail.notComparableCount ?? "—")],["Review due", String(detail.reviewDueCount ?? "—")],["Pending demand", String(detail.pendingTrainingDemand ?? "—")],["Available trainers", detail.availableTrainerCount ?? "—"],["Coverage", detail.coveragePercent != null ? `${detail.coveragePercent}%` : "—"],["Recommended", (demandRows.find((r)=>String(r.competency?._id)===String(detail.competency?._id))?.recommendedAction) || detail.recommendedAction || "—"]]} /><p className="muted">Derived indicator only, never a forecast.</p></DetailModal>}
  </Shell>;
}
function TrainingDemandPanel(){
  const demand = useApi(() => part3.get("/training-demand"), []);
  const [detail, setDetail] = useState(null);
  const rows = demand.data?.rows || [];
  const summary = demand.data?.summary || {};
  return<Shell eyebrow="TRAINING" title="Training Demand Overview" desc={demand.data?.definition || "Recorded training demand. This is an application-level indicator, not a workforce forecast."} action={<Link className="button button-primary" to="/admin/training-demand">Open Training Demand</Link>}><KpiRow items={[[Users,String(summary.totalPeopleNeedingDevelopment ?? "—"),"People Need Training","","#f59e0b"],[BookOpen,String(summary.competenciesWithDemand ?? "—"),"Competencies with Demand","","#3b82f6"],[AlertTriangle,String(summary.competenciesWithTrainerCapacityGap ?? "—"),"Capacity gaps","","#ef4444"],[UserCheck,String(rows.reduce((n,r)=>n+(r.availableTrainers ?? 0),0)),"Available Trainers","","#10b981"]]}/><div className="admin-panel">
    <ListState loading={demand.loading} error={demand.error} onRetry={demand.reload} empty={rows.length || demand.loading || demand.error ? null : "No training demand recorded."}>
      <DataTable columns={["Competency","Role","Required","Gap","Eligible trainers","Capacity","Action"]} rows={rows.map((r)=>[r.competency?.name,r.jobRole?.title,`L${r.requiredLevel}`,String(r.gapHeadcount ?? r.belowRequiredCount ?? "—"),String(r.eligibleTrainers ?? "—"),r.trainerCapacityGap ? "Gap" : "Covered",r.recommendedAction || "—"])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
    </ListState></div>
    {detail && <DetailModal title={detail.competency?.name} subtitle={`${detail.jobRole?.title || ""} · Required L${detail.requiredLevel}`} onClose={()=>setDetail(null)} wide actions={<Link className="button button-secondary" to="/admin/trainer-capacity">Open trainer capacity</Link>}><DetailRows rows={[["Required headcount", String(detail.requiredHeadcount ?? "—")],["Verified headcount", String(detail.verifiedHeadcount ?? "—")],["Gap headcount", String(detail.gapHeadcount ?? "—")],["Below required", String(detail.belowRequiredCount ?? "—")],["Not assessed", String(detail.notAssessedCount ?? "—")],["Pending needs", String(detail.pendingNeeds ?? "—")],["Eligible trainers", String(detail.eligibleTrainers ?? "—")],["Available trainers", detail.availableTrainers ?? "—"],["Capacity gap", detail.trainerCapacityGap ? "Yes" : "No"],["Recommended", detail.recommendedAction || "—"]]} /></DetailModal>}
  </Shell>;
}
function TrainerPoolPage(){
  const toast = useToast();
  const expertise = useApi(() => part3.get("/expertise"), []);
  const [detail, setDetail] = useState(null);
  const [review, setReview] = useState({ status: "REVIEWED", approvedLevel: "", reason: "", source: "" });
  const rows = Array.isArray(expertise.data) ? expertise.data : [];
  const verified = rows.filter((e)=>e.status === "REVIEWED" || e.status === "APPROVED");
  const submitReview = async () => {
    if (!detail || !review.reason || !review.source || (review.status === "REVIEWED" && !review.approvedLevel)) return;
    await expertise.run(() => part3.post(`/expertise/${detail._id}/review`, { status: review.status, approvedLevel: review.status === "REVIEWED" ? Number(review.approvedLevel) : null, reason: review.reason, source: review.source }), toast, "Expertise review recorded");
    setDetail(null);
    setReview({ status: "REVIEWED", approvedLevel: "", reason: "", source: "" });
  };
  return<Shell eyebrow="TRAINERS" title="Trainer Pool" desc="Reviewed expertise records. Expertise stays self-declared until a reasoned coordinator review." action={<Link className="button button-primary" to="/admin/trainer-discovery">Open Trainer Discovery</Link>}><KpiRow items={[[UserCheck,String(verified.length),"Reviewed expertise","","#10b981"],[Activity,String(rows.filter((e)=>e.status==="PENDING_REVIEW").length),"Pending review","","#8b5cf6"],[Clock3,String(rows.length),"Total records","","#3b82f6"],[ShieldCheck,String(new Set(rows.map((e)=>e.trainer?._id || e.trainer)).size),"Trainers","","#f59e0b"]]}/><div className="admin-panel">
    <ListState loading={expertise.loading} error={expertise.error} onRetry={expertise.reload} empty={rows.length || expertise.loading || expertise.error ? null : "No expertise records yet."}>
      <DataTable columns={["Trainer","Competency","Claimed","Reviewed","Status"]} rows={rows.map((e)=>[e.trainer?.name || "—",e.competency?.name || "—",e.claimedLevel != null ? `L${e.claimedLevel}` : "—",e.approvedLevel != null ? `L${e.approvedLevel}` : "—",e.status])} onView={(i)=>{setDetail(rows[i]); setReview({ status: "REVIEWED", approvedLevel: rows[i].approvedLevel || "", reason: "", source: "" });}} viewLabel="Review"/>
    </ListState></div>
    {detail && <DetailModal title={detail.trainer?.name} subtitle={`${detail.competency?.name || ""} · claimed L${detail.claimedLevel}`} onClose={()=>setDetail(null)} wide actions={<button className="button button-primary" disabled={expertise.busy || !review.reason || !review.source || (review.status === "REVIEWED" && !review.approvedLevel)} onClick={submitReview}>Record review</button>}><DetailRows rows={[["Status", detail.status],["Reviewed level", detail.approvedLevel != null ? `L${detail.approvedLevel}` : "—"],["Review basis", detail.reviewBasis || "—"],["Experience", `${detail.relevantExperienceYears ?? "—"} yrs relevant · ${detail.teachingYears ?? "—"} yrs teaching`],["Reviewed by", detail.reviewedBy?.name || "—"],["Reviewed at", fmtDate(detail.reviewedAt, true)]]} />
      <label className="admin-form-label">Decision<select className="admin-form-select" value={review.status} onChange={(e)=>setReview({...review,status:e.target.value})}><option value="REVIEWED">Reviewed</option><option value="REJECTED">Rejected</option></select></label>
      {review.status === "REVIEWED" && <label className="admin-form-label">Approved level *<select className="admin-form-select" value={review.approvedLevel} onChange={(e)=>setReview({...review,approvedLevel:e.target.value})}><option value="">Select level</option>{[1,2,3,4,5].map((l)=><option key={l} value={l}>L{l}</option>)}</select></label>}
      <label className="admin-form-label">Reason *<textarea className="admin-remarks-input" value={review.reason} onChange={(e)=>setReview({...review,reason:e.target.value})} /></label>
      <label className="admin-form-label">Source *<input className="admin-form-input" value={review.source} onChange={(e)=>setReview({...review,source:e.target.value})} /></label>
      <p className="muted">A review never changes an access role. Promotion happens only through TTT verification.</p></DetailModal>}
  </Shell>;
}
function CoursesPage(){
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const list = useApi(() => part2.get("/courses"), []);
  const rows = (list.data?.items || list.data || []).filter((c) => !query || `${c.title} ${c.code}`.toLowerCase().includes(query.toLowerCase()));
  return<Shell eyebrow="TRAINING" title="Course Management" desc="Published programmes and drafts. Creation, editing and publish/archive stay in Courses." action={<Link className="button button-primary" to="/admin/courses">Open Courses</Link>}><KpiRow items={[[Library,String(rows.length),"Courses in scope","","#3b82f6"],[BookOpen,String(rows.filter((c)=>c.status==="PUBLISHED").length),"Published","","#10b981"],[FileText,String(rows.filter((c)=>c.status==="DRAFT").length),"Drafts","","#8b5cf6"],[Award,String(rows.filter((c)=>c.status==="ARCHIVED").length),"Archived","","#f59e0b"]]}/><div className="admin-panel"><SearchFilter placeholder="Search courses..." value={query} onChange={setQuery}/>
    <ListState loading={list.loading} error={list.error} onRetry={list.reload} empty={rows.length || list.loading || list.error ? null : "No courses recorded."}>
      <DataTable columns={["Course Name","Code","Domain","Status"]} rows={rows.map((c)=>[c.title,c.code,c.domain || "—",c.status])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
    </ListState></div>
    {detail && <DetailModal title={detail.title} subtitle={`${detail.code} · ${detail.status}`} onClose={()=>setDetail(null)} wide actions={<Link className="button button-primary" to={`/admin/courses/${detail._id}`}>Open course</Link>}><DetailRows rows={[["Domain", detail.domain || "—"],["Description", detail.description || "—"],["Outcomes", (detail.competencyOutcomes||[]).map((o)=>`${o.competency?.name || o.competency} L${o.targetLevel}`).join(", ") || "—"]]} /></DetailModal>}
  </Shell>;
}
function AssessmentsPage(){
  const [detail, setDetail] = useState(null);
  const list = useApi(() => part3.get("/assessments"), []);
  const submissions = useApi(() => part3.get("/submissions"), []);
  const rows = Array.isArray(list.data) ? list.data : [];
  const submissionRows = Array.isArray(submissions.data) ? submissions.data : [];
  return<Shell eyebrow="TRAINING" title="Assessments" desc="Assessment instruments and submissions. Scores are evidence only." action={<Link className="button button-primary" to="/admin/assessments">Open Assessments</Link>}><div className="admin-info-callout"><ShieldCheck size={16} color="#3b82f6"/>MCQ scoring is server-side. Assessment scores are evidence — competency decisions require authorized human review.</div><KpiRow items={[[ClipboardCheck,String(rows.length),"Assessments","","#3b82f6"],[Users,String(submissionRows.length),"Submissions","","#10b981"],[FileCheck2,String(rows.filter((a)=>a.status==="PUBLISHED").length),"Published","","#8b5cf6"],[AlertTriangle,String(submissionRows.filter((s)=>["SUBMITTED","UNDER_EVALUATION"].includes(s.status)).length),"Pending review","","#f59e0b"]]}/><div className="admin-panel">
    <ListState loading={list.loading} error={list.error} onRetry={list.reload} empty={rows.length || list.loading || list.error ? null : "No assessments recorded."}>
      <DataTable columns={["Assessment Name","Type","Batch","Status"]} rows={rows.map((a)=>[a.title,a.type,a.batch?.name || "—",a.status])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
    </ListState></div>
    {detail && <DetailModal title={detail.title} subtitle={`${detail.type} v${detail.version} · ${detail.status}`} onClose={()=>setDetail(null)} wide actions={<Link className="button button-primary" to="/admin/assessments">Open assessment</Link>}><DetailRows rows={[["Batch", detail.batch?.name || "—"],["Window", `${fmtDate(detail.opensAt, true)} — ${fmtDate(detail.closesAt, true)}`],["Instructions", detail.instructions || "—"],["Questions", `${detail.questionVersions?.length || 0} frozen versions`]]} /></DetailModal>}
  </Shell>;
}
function CertificationsPage(){
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const certs = useApi(() => part3.get("/certificates"), []);
  const rows = certs.data?.certificates || [];
  const download = async (row) => {
    try {
      const response = await api.get(`/part3/certificates/${row._id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.certificateId}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(errorMessage(e));
    }
  };
  const revoke = async () => {
    if (!detail || !revokeReason) return;
    await certs.run(() => part3.post(`/certificates/${detail._id}/revoke`, { reason: revokeReason }), toast, "Certificate revoked");
    setDetail(null);
    setRevokeReason("");
  };
  return<Shell eyebrow="TRAINING" title="Certifications" desc="Course-completion records. A certificate never establishes verified competency."><div className="admin-info-callout"><Info size={16} color="#3b82f6"/>Competency is established only by an explicit, authorized human decision.</div><KpiRow items={[[Award,String(rows.length),"Certificates","","#f59e0b"],[FileCheck2,String(rows.filter((c)=>c.status==="ISSUED").length),"Issued","","#10b981"],[Clock3,String(rows.filter((c)=>c.status!=="ISSUED" && c.status!=="REVOKED").length),"Other states","","#f59e0b"],[AlertTriangle,String(rows.filter((c)=>c.status==="REVOKED").length),"Revoked","","#ef4444"]]}/><div className="admin-panel">
    <ListState loading={certs.loading} error={certs.error} onRetry={certs.reload} empty={rows.length || certs.loading || certs.error ? null : "No certificates issued."}>
      <DataTable columns={["Employee","Certificate","Course","Issued","Status"]} rows={rows.map((c)=>[c.traineeName,c.certificateId,c.courseTitle,fmtDate(c.completedAt),c.status])} onView={(i)=>setDetail(rows[i])} viewLabel="View"/>
    </ListState></div>
    {detail && <DetailModal title={detail.certificateId} subtitle={`${detail.traineeName} · ${detail.courseTitle}`} onClose={()=>{setDetail(null); setRevokeReason("");}} wide actions={<><button className="button button-secondary" disabled={certs.busy} onClick={() => download(detail)}>Download PDF</button><button className="button button-primary" disabled={certs.busy || !revokeReason} onClick={revoke}>Revoke</button></>}><DetailRows rows={[["Batch", detail.batchName || "—"],["Completed", fmtDate(detail.completedAt)],["Status", detail.status],["History", (detail.history||[]).map((h)=>`${h.action} · ${fmtDate(h.at)} · ${h.reason}`).join("; ") || "—"]]} /><label className="admin-form-label">Revocation reason *<input className="admin-form-input" value={revokeReason} onChange={(e)=>setRevokeReason(e.target.value)} /></label><p className="muted">Issuing stays in Certificates against configured course conditions.</p></DetailModal>}
  </Shell>;
}
function KnowledgeBasePage(){return<Shell eyebrow="KNOWLEDGE CONTINUITY" title="Knowledge Base" desc="Manage organizational knowledge assets, succession planning and capability risk assessment."><KpiRow items={[[FileText,"124","Knowledge Articles","","#3b82f6"],[UserCheck,"18","Subject Matter Experts","","#10b981"],[AlertTriangle,"6","At Risk Roles","","#ef4444"],[Target,"82%","Knowledge Coverage","","#8b5cf6"]]}/><div className="admin-panel"><DataTable columns={["Topic","Category","Expert Owner","Last Reviewed","Risk Level"]} rows={[["Advanced Radar Analysis Techniques","Core Meteorological","Dr. R. Krishnamurthy","Aug 2026","Low"],["NWP Model Configuration","Technical","Prof. S. Mehta","Jul 2026","High"],["Satellite Data Processing","Technical","Mr. A. Bose","Jun 2026","At Risk"]]} onView={()=>{}} viewLabel="View"/></div></Shell>;}
function UserApprovalsPage(){const[tab,setTab]=useState("pending");const[reviewing,setReviewing]=useState(null);const APPROVAL_ROWS=[["Amit Sharma","amit.sharma@imd.gov.in","Trainer","Forecasting Division","20 Aug 2026","Pending"],["Neha Verma","neha.verma@imd.gov.in","Trainer","Regional Centre Mumbai","19 Aug 2026","Pending"],["Rohit Kumar","rohit.kumar@imd.gov.in","Trainee","Climate Research","19 Aug 2026","Pending"],["Kavya Nair","kavya.nair@imd.gov.in","Trainer","Observatory","18 Aug 2026","Pending"],["Suresh Patel","suresh.p@imd.gov.in","Trainee","Administration","17 Aug 2026","Pending"],["Priya Singh","priya.s@imd.gov.in","Trainer","R&D Division","16 Aug 2026","Pending"],["Arjun Das","arjun.d@imd.gov.in","Trainee","Forecasting Division","15 Aug 2026","Pending"]];const APPROVED_ROWS=[["Asha Sharma","asha.sharma@imd.gov.in","Trainee","Forecasting Division","10 Aug 2026","Approved"],["Vikram Nair","vikram.n@imd.gov.in","Trainer","Regional Centre Delhi","08 Aug 2026","Approved"]];const REJECTED_ROWS=[["Ankit Joshi","ankit.j@imd.gov.in","Trainer","Observatories","05 Aug 2026","Rejected"]];const rows=tab==="pending"?APPROVAL_ROWS:tab==="approved"?APPROVED_ROWS:REJECTED_ROWS;return<Shell eyebrow="PEOPLE MANAGEMENT" title="User Approvals" desc="Review new user registration requests, verify details, and assign platform roles." badge="7 Pending"><KpiRow items={[[AlertTriangle,"7","Pending Approvals","","#f59e0b"],[CheckCircle2,"128","Approved Users","","#10b981"],[XCircle,"12","Rejected Requests","","#ef4444"],[Activity,"96%","Profile Completion","","#3b82f6"]]}/><div className="admin-panel"><Tabs tabs={[{id:"pending",label:"Pending Requests",count:7},{id:"approved",label:"Approved",count:128},{id:"rejected",label:"Rejected",count:12}]} active={tab} onChange={setTab}/><SearchFilter placeholder="Search by name, email or department..." extraFilters={[{label:"All Roles",options:["Trainee","Trainer","Admin"]},{label:"All Departments",options:["Forecasting Division","R&D","Regional Centres","Observatories"]}]}/><DataTable columns={["Name","Email","Requested Role","Department","Request Date","Status"]} rows={rows} onView={(i)=>setReviewing(i)} viewLabel="Review"/></div></Shell>;}

/* ═══════════════════════════════════════════════════════════
   MAIN ROUTER
═══════════════════════════════════════════════════════════ */
export default function AdminExperiencePage({ view }) {
  const k = view || useLocation().pathname.split("/").at(-1);

  if (!k || k === "dashboard") return null;
  if (k === "users") return <UserApprovalsPage />;
  if (k === "user-roles") return <UsersRolesPage />;
  if (k === "organizational-capability") return <CapabilityMapPage />;
  if (k === "competencies") return <CompetencyFrameworkPage />;
  if (k === "job-role-requirements") return <RoleMappingPage />;
  if (k === "skill-gap-analysis") return <SkillGapPage />;
  if (k === "training-demand") return <TrainingDemandPanel />;
  if (k === "courses") return <CoursesPage />;
  if (k === "assessments") return <AssessmentsPage />;
  if (k === "certificates") return <CertificationsPage />;
  if (k === "trainer-discovery" || k === "trainer-verification") return <TrainerPoolPage />;
  if (k === "train-the-trainer" || k === "ttt-candidates" || k === "ttt-programme" || k === "ttt-verification") return <TttAdminPage />;
  if (k === "announcements" || k === "notifications") return <CommunicationPage />;
  if (k === "audit-logs" || k === "training-reports" || k === "competency-reports") return <ReportsPage />;
  if (k === "feedback" || k === "feedback-trends") return <FeedbackPage />;
  if (k === "improvement-actions") return <ImprovementActionPage onBack={() => {}} />;
  if (k === "knowledge-base" || k === "succession-planning" || k === "risk-assessment") return <KnowledgeBasePage />;

  return (
    <Shell title={k.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} desc="This section is part of the implementation roadmap." eyebrow="SAMARTHYA">
      <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}>
        <Activity size={40} color="#94a3b8" />
        <p style={{ color: "#64748b", marginTop: "1rem" }}>Coming soon.</p>
      </div>
    </Shell>
  );
}
