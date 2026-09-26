import { useState } from "react";
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

function SearchFilter({ placeholder = "Search...", extraFilters = [] }) {
  return (
    <div className="admin-search-filter">
      <div className="admin-search-wrap">
        <Search size={15} className="admin-search-icon" />
        <input className="admin-search-input" placeholder={placeholder} />
      </div>
      {extraFilters.map(({ label, options }) => (
        <select key={label} className="admin-filter-select">
          <option value="">{label}</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ))}
      <button className="admin-filter-btn"><Filter size={14} /> Filter</button>
    </div>
  );
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
  return (
    <Shell
      eyebrow="TRAINERS › Train-the-Trainer"
      title="Train-the-Trainer Candidate Overview"
      desc="Identify potential trainers from employees with strong competency and relevant experience."
      action={<button className="button button-primary"><Plus size={14} /> Nominate Candidate</button>}
    >
      <KpiRow items={[
        [Users, "24", "Potential Candidates", "", "#3b82f6"],
        [CheckCircle2, "18", "Eligible for TTT", "", "#10b981"],
        [Clock3, "4", "Under Review", "", "#f59e0b"],
        [XCircle, "6", "Not Eligible", "", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <SearchFilter
          placeholder="Search employee..."
          extraFilters={[
            { label: "All Departments", options: ["Meteorology", "Climate", "NWP", "IT"] },
            { label: "All Competencies", options: ["Radar Interpretation", "Weather Forecasting", "NWP", "Climate Analysis"] },
            { label: "All Eligibility Status", options: ["Eligible", "Under Review", "Not Eligible"] },
          ]}
        />
        <div className="admin-data-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 0.7fr 1fr 1fr 0.8fr" }}>
            <span>#  Name</span><span>Department</span><span>Current Role</span><span>Key Competency</span><span>Level</span><span>Relevant Exp.</span><span>TTT Eligibility</span><span>Action</span>
          </div>
          {TTT_ROWS.map((r, i) => (
            <div key={i} className="admin-table-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1.5fr 0.7fr 1fr 1fr 0.8fr" }}>
              <span className="ttt-name-cell"><span className="ttt-num">{i + 1}</span> {r[0]}</span>
              <span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span>
              <span className="admin-level-badge">{r[4]}</span>
              <span>{r[5]}</span>
              <span className={`admin-badge ${r[6] === "Eligible" ? "admin-badge-approved" : r[6] === "Under Review" ? "admin-badge-pending" : "admin-badge-rejected"}`}>{r[6]}</span>
              <span className="admin-table-actions">
                <button className="admin-action-btn admin-action-view" onClick={() => onView(i)}><Eye size={12} /> View</button>
              </span>
            </div>
          ))}
        </div>
        <div className="admin-pagination">
          <span>Showing 1–6 of 24 candidates</span>
          <div className="admin-pag-btns">
            {[1,2,3,4].map(n=><button key={n} className={`admin-pag-btn ${n===1?"active":""}`}>{n}</button>)}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 22: CANDIDATE TTT DETAILS
═══════════════════════════════════════════════════════════ */
function TttCandidateDetails({ onBack }) {
  const [tab, setTab] = useState("overview");
  return (
    <Shell
      eyebrow={<Breadcrumb items={[{ label: "Trainers", link: "/admin/trainer-discovery" }, { label: "Train-the-Trainer", link: "/admin/train-the-trainer" }, { label: "Candidate Details" }]} />}
      title=""
      desc=""
    >
      {/* Candidate header */}
      <div className="ttt-candidate-header">
        <div className="ttt-candidate-avatar">RM</div>
        <div className="ttt-candidate-info">
          <h2>Rohan Mehta</h2>
          <p>Scientist B · Meteorology Department</p>
          <span className="ttt-emp-id">Employee ID: MTE-1023</span>
        </div>
        <div className="ttt-candidate-actions">
          <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Back to List</button>
          <button className="button button-primary"><Plus size={14} /> Nominate for TTT</button>
        </div>
      </div>
      <Tabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "competency", label: "Competency Profile" }, { id: "experience", label: "Experience & Achievements" }, { id: "suitability", label: "TTT Suitability" }, { id: "program", label: "Recommended Program" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div className="ttt-detail-grid">
          <div className="admin-panel">
            <h3>Basic Information</h3>
            {[["Department", "Meteorology"], ["Current Role", "Scientist B"], ["Competency Level", "L3 – Proficient"], ["Relevant Experience", "5 years"], ["Previous Training", "Radar Systems, Data Analysis"], ["Location", "IMD Training Centre, Pune"]].map(([k, v]) => (
              <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
            ))}
          </div>
          <div className="admin-panel">
            <h3>Key Competencies</h3>
            <div className="ttt-comp-table-head">
              <span>Competency</span><span>Current Level</span><span>Required for Trainer</span><span>Meets Requirement</span>
            </div>
            {[["Radar Interpretation", "L3", "L3", true], ["Weather Forecasting", "L3", "L3", true], ["Data Visualization", "L2", "L3", false], ["Climate Analysis", "L3", "L3", true]].map(([c, cur, req, ok]) => (
              <div key={c} className="ttt-comp-row">
                <span>{c}</span>
                <span className="admin-level-badge">{cur}</span>
                <span className="admin-level-badge" style={{ background: "#f1f5f9" }}>{req}</span>
                <span>{ok ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}</span>
              </div>
            ))}
          </div>
          <div className="admin-panel ttt-eligibility-panel">
            <h3>TTT Eligibility Assessment</h3>
            <ul className="ttt-eligibility-list">
              {["Strong subject matter expertise", "5+ years of relevant experience", "Good communication skills", "Positive feedback from peers", "Experienced in cross-department projects"].map((item) => (
                <li key={item}><CheckCircle2 size={14} color="#10b981" />{item}</li>
              ))}
            </ul>
            <div className="ttt-eligible-badge">
              <CheckCircle2 size={20} color="#10b981" />
              <div>
                <strong>Eligible for TTT</strong>
                <small>This candidate meets all the eligibility criteria for the Train-the-Trainer program.</small>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === "suitability" && (
        <div className="admin-panel">
          <p className="admin-info-note"><Info size={14} /> Suitability points are coordinator recommendations, not automatic decisions. The coordinator makes and audits the final trainer assignment.</p>
          <div className="ttt-suitability-scores">
            {[["Subject Matter Expertise", 92, "#10b981"], ["Teaching Aptitude", 85, "#3b82f6"], ["Communication Skills", 88, "#8b5cf6"], ["Peer Collaboration", 79, "#f59e0b"], ["Overall Suitability", 86, "#10b981"]].map(([label, score, color]) => (
              <div key={label} className="ttt-suit-row">
                <span>{label}</span>
                <div className="admin-cap-bar-bg" style={{ flex: 1 }}>
                  <div className="admin-cap-bar-fill" style={{ width: `${score}%`, background: color }} />
                </div>
                <span style={{ color, fontWeight: 700, minWidth: 36 }}>{score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(tab === "competency" || tab === "experience" || tab === "program") && (
        <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <Activity size={36} color="#94a3b8" />
          <p style={{ color: "#64748b", marginTop: "1rem" }}>Full {tab.replace(/-/g," ")} details would load from the employee's profile.</p>
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
  if (view === "detail") return <TttCandidateDetails onBack={() => setView("list")} />;
  if (view === "progress") return <TttProgressPage />;
  if (view === "verification") return <TttVerificationPage />;
  return (
    <div className="admin-xp">
      <div className="admin-xp-head">
        <div>
          <span className="admin-xp-eyebrow">TRAIN-THE-TRAINER</span>
          <h1 className="admin-xp-title">TTT Overview</h1>
        </div>
        <div className="admin-xp-actions">
          <button className="button button-secondary" onClick={() => setView("progress")}>View Progress</button>
          <button className="button button-secondary" onClick={() => setView("verification")}>View Verification</button>
        </div>
      </div>
      <TttOverviewPage onView={() => setView("detail")} />
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
  return (
    <Shell
      eyebrow="PEOPLE"
      title="User Management"
      desc="Manage all registered users, their roles, and account status."
      action={<button className="button button-primary"><Plus size={14} /> Add User</button>}
    >
      <KpiRow items={[
        [Users, "248", "Total Users", "", "#3b82f6"],
        [UserRound, "196", "Trainees", "", "#10b981"],
        [UserCheck, "47", "Trainers", "", "#8b5cf6"],
        [ShieldCheck, "5", "Admins", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <SearchFilter
          placeholder="Search by name, email or department..."
          extraFilters={[
            { label: "All Roles", options: ["Trainee", "Trainer", "Admin"] },
            { label: "All Departments", options: ["Forecasting", "Radar", "Climate", "Satellite", "Administration"] },
            { label: "All Status", options: ["Active", "Pending", "Inactive"] },
          ]}
        />
        <Tabs
          tabs={[{ id: "all", label: "All Users", count: 248 }, { id: "pending", label: "Pending Approval", count: 12 }, { id: "trainee", label: "Trainees (196)" }, { id: "trainer", label: "Trainers (47)" }, { id: "admin", label: "Admins (5)" }]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <div className="admin-data-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "0.4fr 2fr 2fr 1fr 1.5fr 1fr 0.8fr" }}>
            <span>#</span><span>Name</span><span>Email</span><span>Role</span><span>Department</span><span>Status</span><span>Action</span>
          </div>
          {USER_ROWS.map((r, i) => (
            <div key={i} className="admin-table-row" style={{ gridTemplateColumns: "0.4fr 2fr 2fr 1fr 1.5fr 1fr 0.8fr" }}>
              <span>{i + 1}</span>
              <span className="user-name-cell"><span className="user-avatar-sm">{r[0][0]}</span>{r[0]}</span>
              <span className="text-muted-sm">{r[1]}</span>
              <span>{r[2]}</span><span>{r[3]}</span>
              <span className={`admin-badge ${r[4] === "Active" ? "admin-badge-approved" : r[4] === "Pending" ? "admin-badge-pending" : "admin-badge-rejected"}`}>{r[4]}</span>
              <span className="admin-table-actions">
                <button className="admin-action-btn admin-action-view" onClick={() => onViewUser(i)}><Eye size={12} /> View</button>
              </span>
            </div>
          ))}
        </div>
        <div className="admin-pagination">
          <span>Showing 1 to 5 of 248 users</span>
          <div className="admin-pag-btns">
            {[1,2,3,4,5].map(n=><button key={n} className={`admin-pag-btn ${n===1?"active":""}`}>{n}</button>)}
            <span>…</span>
            <button className="admin-pag-btn">50</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 26: USER DETAILS
═══════════════════════════════════════════════════════════ */
function UserDetailsPage({ onBack, onManage }) {
  const [tab, setTab] = useState("overview");
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management", link: "/admin/user-roles" }, { label: "User Details" }]} />
      <div className="user-detail-header">
        <div className="user-detail-avatar-wrap">
          <div className="user-detail-avatar">AS</div>
          <div>
            <h2>Asha Sharma <span className="admin-badge admin-badge-approved">Active</span></h2>
            <p>Trainee · Forecasting Department</p>
            <p className="user-detail-contact"><span>asha.sharma@imd.gov.in</span><span>+91 98765 43210</span></p>
          </div>
        </div>
        <button className="button button-primary" onClick={onManage}>Manage Account</button>
      </div>
      <Tabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "training", label: "Training" }, { id: "competencies", label: "Competencies" }, { id: "certificates", label: "Certificates" }, { id: "activity", label: "Activity Log" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div className="user-detail-grid">
          <div className="admin-panel">
            <div className="user-detail-section-head"><h3>Professional Information</h3><button className="admin-action-btn admin-action-edit"><Edit size={12} /> Edit</button></div>
            {[["Full Name", "Asha Sharma"], ["Employee ID", "MET2023015"], ["Designation", "Scientific Assistant"], ["Qualification", "M.Sc. Atmospheric Sciences"], ["Work Experience", "2 years"], ["Interests", "Weather Modeling · Radar Analysis"]].map(([k, v]) => (
              <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
            ))}
          </div>
          <div>
            <div className="admin-panel" style={{ marginBottom: 14 }}>
              <h3>Account Information</h3>
              {[["Role", "Trainee"], ["Status", "Active"], ["Account Created", "12 Jan 2023"], ["Last Login", "18 Mar 2024"], ["Approved By", "Admin"], ["Approve Date", "19 Jan 2023"]].map(([k, v]) => (
                <div key={k} className="admin-detail-row">
                  <span className="admin-detail-key">{k}</span>
                  <span className="admin-detail-val">
                    {k === "Role" ? <span className="admin-badge admin-badge-pending">{v}</span> : k === "Status" ? <span className="admin-badge admin-badge-approved">{v}</span> : v}
                  </span>
                </div>
              ))}
            </div>
            <div className="admin-panel">
              <div className="user-detail-section-head"><h3>Competency Status</h3><button className="admin-action-btn admin-action-view"><Eye size={12} /> View Details</button></div>
              {[["Radar Interpretation", "L2"], ["Weather Modelling", "L2"], ["Climate Analysis", "L2"]].map(([c, l]) => (
                <div key={c} className="user-comp-row">
                  <span>{c}</span>
                  <span className="user-level-chip">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === "training" && (
        <div className="admin-panel">
          <div className="user-training-stats">
            {[["Enrolled Courses", "5"], ["Completed Courses", "3"], ["In Progress", "2"]].map(([l, v]) => (
              <div key={l} className="user-train-stat"><b>{v}</b><span>{l}</span></div>
            ))}
          </div>
        </div>
      )}
      {(tab === "competencies" || tab === "certificates" || tab === "activity") && (
        <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}><Activity size={32} color="#94a3b8" /><p style={{ color: "#64748b" }}>{tab} details.</p></div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 27: MANAGE USER ACCOUNT
═══════════════════════════════════════════════════════════ */
function ManageUserAccountPage({ onBack, onReview }) {
  const [newRole, setNewRole] = useState("trainer");
  const [accountStatus, setAccountStatus] = useState("active");
  const [reason, setReason] = useState("User has completed trainer verification and is now eligible to be promoted to Trainer.");
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management" }, { label: "User Details" }, { label: "Manage User Account" }]} />
      <h1 className="admin-xp-title">Manage User Account</h1>
      <p className="admin-xp-desc">Update user role, account status and related information.</p>
      <div className="manage-account-grid">
        <div>
          <div className="manage-user-card">
            <div className="user-detail-avatar" style={{ width: 52, height: 52, fontSize: 16 }}>AS</div>
            <div>
              <h3>Asha Sharma</h3>
              <p>Trainee · Forecasting Department</p>
              <span className="text-muted-sm">asha.sharma@imd.gov.in</span>
            </div>
          </div>
          <div className="admin-panel" style={{ marginTop: 14 }}>
            <h3>Current Account Details</h3>
            {[["Current Role", "Trainee"], ["Account Status", "Active"], ["Department", "Forecasting"], ["Employee ID", "MET2023015"]].map(([k, v]) => (
              <div key={k} className="admin-detail-row">
                <span className="admin-detail-key">{k}</span>
                <span className="admin-detail-val">
                  {k === "Current Role" ? <span className="admin-badge admin-badge-pending">{v}</span> : k === "Account Status" ? <span className="admin-badge admin-badge-approved">{v}</span> : v}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="admin-info-callout" style={{ marginBottom: 14 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <div>
              <strong>System Recommendation</strong>
              <p style={{ margin: "4px 0 4px", fontSize: 12 }}>This user has completed trainer verification and is eligible to be promoted to Trainer.</p>
              <span className="admin-badge admin-badge-approved">Recommended Role: Trainer</span>
            </div>
          </div>
          <div className="admin-panel">
            <h3>Update Account Information</h3>
            <label className="admin-form-label" style={{ marginBottom: 12 }}>New Role *
              <div className="role-radio-group">
                {[["trainee", "Trainee", "Can enrol in courses and track own development"], ["trainer", "Trainer", "Can create and deliver training, assess trainees"], ["admin", "Admin", "Full system access and administrative privileges"]].map(([val, label, desc]) => (
                  <label key={val} className={`role-radio-card ${newRole === val ? "selected" : ""}`} onClick={() => setNewRole(val)}>
                    <input type="radio" name="role" value={val} checked={newRole === val} onChange={() => setNewRole(val)} />
                    <div><strong>{label}</strong><span>{desc}</span></div>
                  </label>
                ))}
              </div>
            </label>
            <label className="admin-form-label">Account Status *
              <div className="status-radio-group">
                {[["active", "Active — User can log in and access the system"], ["inactive", "Inactive — User cannot log in to the system"]].map(([val, desc]) => (
                  <label key={val} className={`status-radio ${accountStatus === val ? "selected" : ""}`} onClick={() => setAccountStatus(val)}>
                    <input type="radio" name="status" value={val} checked={accountStatus === val} onChange={() => setAccountStatus(val)} />
                    <span>{desc}</span>
                  </label>
                ))}
              </div>
            </label>
            <label className="admin-form-label" style={{ marginTop: 12 }}>Change Reason *
              <textarea className="admin-remarks-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
              <span className="char-count">{reason.length}/500</span>
            </label>
            <div className="admin-form-footer">
              <button className="button button-secondary" onClick={onBack}>Cancel</button>
              <button className="button button-primary" onClick={onReview}>Review Changes</button>
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
function ConfirmUpdatePage({ onBack, onConfirm }) {
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "User Management" }, { label: "User Details" }, { label: "Manage User Account" }, { label: "Review Account Changes" }]} />
      <h1 className="admin-xp-title">Review Account Changes</h1>
      <p className="admin-xp-desc">Please review the changes before updating the user account.</p>
      <div className="confirm-update-grid">
        <div className="admin-panel">
          <div className="manage-user-card" style={{ marginBottom: 16 }}>
            <div className="user-detail-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>AS</div>
            <div><h3 style={{ margin: 0 }}>Asha Sharma</h3><p style={{ margin: 0 }}>Trainee · Forecasting Department</p><span className="text-muted-sm">asha.sharma@imd.gov.in</span></div>
          </div>
          <h3>Change Summary</h3>
          <div className="change-summary-table">
            <div className="change-summary-head"><span>Field</span><span>Current Value</span><span></span><span>New Value</span></div>
            {[["Role", "Trainee", "Trainer"], ["Account Status", "Active", "Active"], ["Department", "Forecasting", "Forecasting"], ["Access Permissions", "Trainee Access", "Trainer Access"]].map(([f, cur, nw]) => (
              <div key={f} className="change-summary-row">
                <span>{f}</span>
                <span className={`admin-badge ${cur === "Active" ? "admin-badge-approved" : "admin-badge-pending"}`}>{cur}</span>
                <ArrowRight size={14} color="#94a3b8" />
                <span className={`admin-badge ${nw === "Trainer" || nw === "Active" ? "admin-badge-approved" : "admin-badge-pending"}`}>{nw}</span>
              </div>
            ))}
          </div>
          <div className="change-reason-display">
            <strong>Change Reason:</strong>
            <p>User has completed trainer verification and is now eligible to be promoted to Trainer.</p>
          </div>
          <div className="admin-info-callout" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e", marginTop: 12 }}>
            <AlertTriangle size={16} color="#d97706" />
            <span><strong>Important: </strong>Changing this user's role will automatically update their access permissions and available features according to the selected role.</span>
          </div>
          <div className="admin-form-footer">
            <button className="button button-secondary" onClick={onBack}><ArrowLeft size={14} /> Edit Changes</button>
            <button className="button button-primary" onClick={onConfirm}>Confirm & Update</button>
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
  const [view, setView] = useState("list");
  const [confirmed, setConfirmed] = useState(false);
  if (confirmed) return (
    <Shell title="Account Updated" desc="">
      <div className="admin-panel admin-success-card">
        <CheckCircle2 size={48} color="#10b981" />
        <h2>Account Updated Successfully</h2>
        <p>Asha Sharma has been promoted to Trainer. Access permissions updated.</p>
        <button className="button button-primary" onClick={() => { setConfirmed(false); setView("list"); }}>Back to User Management</button>
      </div>
    </Shell>
  );
  if (view === "manage") return <ManageUserAccountPage onBack={() => setView("detail")} onReview={() => setView("confirm")} />;
  if (view === "confirm") return <ConfirmUpdatePage onBack={() => setView("manage")} onConfirm={() => setConfirmed(true)} />;
  if (view === "detail") return <UserDetailsPage onBack={() => setView("list")} onManage={() => setView("manage")} />;
  return <UserManagementPage onViewUser={() => setView("detail")} />;
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
  const [view, setView] = useState("list");
  const [activeTab, setActiveTab] = useState("all");

  if (view === "create") return <CreateAnnouncementPage onBack={() => setView("list")} onReview={() => setView("review")} />;
  if (view === "review") return <ReviewPublishPage onBack={() => setView("create")} onPublish={() => setView("published")} />;
  if (view === "published") return <PublishedStatusPage onNew={() => setView("create")} />;

  const typeColor = { Announcement: "#3b82f6", Notification: "#f59e0b", "Learning Update": "#8b5cf6", Achievement: "#f59e0b" };

  return (
    <Shell
      eyebrow="COMMUNICATION"
      title="Communication"
      desc="Publish announcements, notifications, achievements and learning updates."
      action={<button className="button button-primary" onClick={() => setView("create")}><Plus size={14} /> Create Announcement</button>}
    >
      <KpiRow items={[
        [Megaphone, "12", "Announcements", "", "#3b82f6"],
        [Bell, "36", "Notifications", "", "#f59e0b"],
        [BookOpen, "8", "Learning Updates", "", "#8b5cf6"],
        [Award, "5", "Achievements", "", "#10b981"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[{ id: "all", label: "All" }, { id: "announcements", label: "Announcements" }, { id: "notifications", label: "Notifications" }, { id: "learning", label: "Learning Updates" }, { id: "achievements", label: "Achievements" }]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <div className="comm-filter-bar">
          <select className="admin-filter-select"><option>All Status</option><option>Active</option><option>Expired</option><option>Draft</option></select>
        </div>
        <div className="admin-data-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "0.4fr 2.5fr 1.2fr 1fr 1fr 1fr 0.7fr" }}>
            <span>#</span><span>Title</span><span>Type</span><span>Audience</span><span>Date</span><span>Status</span><span>Action</span>
          </div>
          {COMM_ROWS.map((r, i) => (
            <div key={i} className="admin-table-row" style={{ gridTemplateColumns: "0.4fr 2.5fr 1.2fr 1fr 1fr 1fr 0.7fr" }}>
              <span>{i + 1}</span>
              <span style={{ fontWeight: 500 }}>{r[0]}</span>
              <span className="comm-type-badge" style={{ background: (typeColor[r[1]] || "#64748b") + "22", color: typeColor[r[1]] || "#64748b" }}>{r[1]}</span>
              <span>{r[2]}</span><span>{r[3]}</span>
              <span className={`admin-badge ${r[4] === "Active" ? "admin-badge-approved" : "admin-badge-rejected"}`}>{r[4]}</span>
              <span className="admin-table-actions">
                <button className="admin-action-btn admin-action-view"><Eye size={12} /> View</button>
              </span>
            </div>
          ))}
        </div>
        <div className="admin-pagination">
          <span>Showing 1 to 5 of 12 items</span>
          <div className="admin-pag-btns">
            {[1,2,3].map(n=><button key={n} className={`admin-pag-btn ${n===1?"active":""}`}>{n}</button>)}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CreateAnnouncementPage({ onBack, onReview }) {
  const [audience, setAudience] = useState("trainees");
  const [schedule, setSchedule] = useState("now");
  const [title, setTitle] = useState("Advanced Radar Interpretation Training");
  const [message, setMessage] = useState("We are excited to announce the upcoming training program on Advanced Radar Interpretation. This course will be conducted by domain experts and will help enhance your forecasting capabilities.");
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
            <div className="ann-editor-toolbar">
              <button><Bold size={13} /></button><button><Italic size={13} /></button><button><List size={13} /></button><button><Link2 size={13} /></button>
            </div>
            <textarea className="admin-remarks-input" style={{ minHeight: 120 }} value={message} onChange={e => setMessage(e.target.value)} />
            <span className="char-count">{message.length}/1000</span>
          </label>
          <label className="admin-form-label" style={{ marginTop: 14 }}>Schedule *
            <div className="schedule-radio-group">
              {[["now", "Publish Now"], ["later", "Schedule for Later"]].map(([v, l]) => (
                <label key={v} className={`status-radio ${schedule === v ? "selected" : ""}`} onClick={() => setSchedule(v)}>
                  <input type="radio" name="schedule" value={v} checked={schedule === v} onChange={() => setSchedule(v)} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            {schedule === "later" && (
              <div className="schedule-time-row">
                <input type="date" className="admin-form-input" defaultValue="2026-09-15" />
                <input type="time" className="admin-form-input" defaultValue="10:00" />
              </div>
            )}
          </label>
        </div>
        <div>
          <div className="admin-panel" style={{ marginBottom: 14 }}>
            <h3>Audience *</h3>
            <div className="audience-radio-group">
              {[["all", "All Users"], ["trainees", "Trainees"], ["trainers", "Trainers"], ["dept", "Selected Department"]].map(([v, l]) => (
                <label key={v} className={`audience-radio ${audience === v ? "selected" : ""}`} onClick={() => setAudience(v)}>
                  <Radio size={14} /> {l}
                </label>
              ))}
            </div>
          </div>
          <div className="admin-panel" style={{ marginBottom: 14 }}>
            <h3>Department</h3>
            <select className="admin-form-select" style={{ width: "100%" }}><option>Forecasting</option><option>R&D</option><option>Regional Centres</option></select>
          </div>
          <div className="admin-panel">
            <h3>Attachments (Optional)</h3>
            <div className="ann-upload-zone">
              <Upload size={24} color="#94a3b8" />
              <p>Click to upload or drag and drop</p>
              <small>PDF, PPT, DOC (Max 10MB)</small>
            </div>
          </div>
          <div className="admin-form-footer" style={{ marginTop: 14 }}>
            <button className="button button-secondary" onClick={onBack}>Cancel</button>
            <button className="button button-primary" onClick={onReview}>Review Announcement →</button>
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
  const [view, setView] = useState("overview");
  if (view === "configure") return <ConfigureReportPage onBack={() => setView("overview")} onGenerate={() => setView("output")} />;
  if (view === "report") return <ReportOutputPage onBack={() => setView("overview")} onAnother={() => setView("configure")} />;
  if (view === "output") return <ReportOutputPage onBack={() => setView("overview")} onAnother={() => setView("configure")} />;

  const REPORT_TYPES = [
    { title: "Training Participation", icon: Users, desc: "Enrolment, attendance and completion statistics.", color: "#3b82f6" },
    { title: "Course-wise Performance", icon: BarChart3, desc: "Assessment scores and learning outcomes.", color: "#10b981" },
    { title: "Certification Reports", icon: Award, desc: "Certification status and validity details.", color: "#f59e0b" },
    { title: "User Activity Report", icon: Activity, desc: "Login activity and platform usage statistics.", color: "#8b5cf6" },
    { title: "Department-wise Analysis", icon: Building2, desc: "Compare training data across departments.", color: "#ec4899" },
    { title: "Trainer Contribution", icon: UserCheck, desc: "Training sessions and trainee feedback.", color: "#06b6d4" },
  ];

  return (
    <Shell
      eyebrow="REPORTS & ANALYTICS"
      title="Reports & Analytics"
      desc="Monitor training programmes, participation and organizational learning outcomes."
      action={<button className="button button-secondary" onClick={() => setView("configure")}><Download size={14} /> Generate Report</button>}
    >
      <KpiRow items={[
        [BookOpen, "48", "Total Courses", "", "#3b82f6"],
        [Users, "1,284", "Total Enrollments", "", "#10b981"],
        [Award, "836", "Certifications", "", "#f59e0b"],
        [ClipboardCheck, "2,156", "Assessments Taken", "", "#8b5cf6"],
        [Activity, "78%", "Participation Rate", "", "#ec4899"],
      ]} />
      <div className="admin-panel">
        <h3>Report Categories</h3>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Generate and view detailed reports for different areas.</p>
        <div className="report-types-grid">
          {REPORT_TYPES.map(({ title, icon: Icon, desc, color }) => (
            <div key={title} className="report-type-card" onClick={() => setView("configure")} style={{ "--rt-color": color }}>
              <div className="report-type-icon" style={{ background: color + "22", color }}><Icon size={22} /></div>
              <div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
              <ChevronRight size={16} className="report-type-arrow" />
            </div>
          ))}
        </div>
      </div>
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
  if (view === "details") return <FeedbackDetailsPage onBack={() => setView("overview")} onTrends={() => setView("trends")} />;
  if (view === "trends") return <FeedbackTrendsPage onBack={() => setView("details")} onAction={() => setView("action")} />;
  if (view === "action") return <ImprovementActionPage onBack={() => setView("trends")} />;

  const [tab, setTab] = useState("all");
  return (
    <Shell
      eyebrow="FEEDBACK"
      title="Feedback Overview"
      desc="View feedback from trainees to understand their learning experience and identify areas for improvement."
      action={<button className="button button-secondary" onClick={() => setView("details")}><Eye size={14} /> View Detailed Feedback</button>}
    >
      <KpiRow items={[
        [Star, "4.2", "Average Rating", "+0.3 from last period", "#f59e0b"],
        [FileText, "1,248", "Total Feedback", "+17% from last period", "#3b82f6"],
        [ThumbsUp, "86%", "Positive Feedback", "", "#10b981"],
        [ThumbsDown, "14%", "Needs Improvement", "", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[{ id: "all", label: "All Feedback" }, { id: "courses", label: "Courses" }, { id: "trainers", label: "Trainers" }, { id: "content", label: "Learning Content" }, { id: "platform", label: "Platform" }]}
          active={tab}
          onChange={(t) => setTab(t)}
        />
        <DataTable
          columns={["Course / Training", "Average Rating", "Feedback Count", "Status"]}
          rows={FEEDBACK_ROWS}
          onView={() => setView("details")}
          viewLabel="View"
        />
        <div className="admin-pagination">
          <span>Showing 1 to 5 of 12 courses</span>
          <div className="admin-pag-btns">
            {[1,2,3].map(n=><button key={n} className={`admin-pag-btn ${n===1?"active":""}`}>{n}</button>)}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FeedbackDetailsPage({ onBack, onTrends }) {
  const [tab, setTab] = useState("all");
  const REVIEWS = [
    ["A", "Asha Sharma", "★★★★★", "Very well structured content. Helped me understand radar data interpretation clearly.", "15 Sep 2026"],
    ["R", "Rahul Mehta", "★★★★", "Good training overall. More hands-on examples would be helpful.", "14 Sep 2026"],
    ["N", "Neha Patil", "★★★★", "Content was good but the pace was a bit fast.", "14 Sep 2026"],
    ["A", "Amit Joshi", "★★★★★", "Excellent trainer and practical examples.", "13 Sep 2026"],
    ["P", "Priya Singh", "★★★★", "Useful content, but would be great to have more real-world case studies.", "13 Sep 2026"],
  ];
  return (
    <Shell eyebrow="" title="" desc="">
      <Breadcrumb items={[{ label: "Feedback Overview" }, { label: "Feedback Details" }]} />
      <h1 className="admin-xp-title">Feedback Details</h1>
      <p className="admin-xp-desc">View detailed feedback, ratings and comments for the selected course.</p>
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
  const CAP_COMPETENCIES = ["Radar Interp.", "Climate Anl.", "NWP", "Forecasting", "Instrum.", "Hydromet."];
  const CAP_DEPTS = [
    { name: "Forecasting Div.", values: [82, 65, 78, 90, 45, 60] },
    { name: "R&D", values: [70, 88, 72, 65, 55, 75] },
    { name: "Regional Centres", values: [60, 55, 68, 72, 80, 50] },
    { name: "Observatories", values: [45, 40, 55, 48, 90, 62] },
    { name: "Administration", values: [30, 25, 35, 42, 38, 30] },
  ];
  function capColor(v) {
    if (v >= 80) return { bg: "#dcfce7", color: "#15803d" };
    if (v >= 60) return { bg: "#fef9c3", color: "#a16207" };
    if (v >= 40) return { bg: "#ffedd5", color: "#c2410c" };
    return { bg: "#fee2e2", color: "#b91c1c" };
  }
  return (
    <Shell eyebrow="CAPABILITY" title="Organizational Capability Map" desc="View current competency coverage across all departments and identify capability gaps.">
      <KpiRow items={[[Users,"42","Require Training","","#f59e0b"],[CheckCircle2,"28","Verified","This quarter","#10b981"],[Activity,"64%","Overall Coverage","+3% MoM","#3b82f6"],[Bell,"16","Open Gaps","Critical areas","#ef4444"]]} />
      <div className="admin-panel">
        <div className="admin-cap-controls">
          <select className="admin-filter-select"><option>All Departments</option>{CAP_DEPTS.map(d=><option key={d.name}>{d.name}</option>)}</select>
          <select className="admin-filter-select"><option>At or Above Required Level</option><option>Below Required Level</option></select>
        </div>
        <div className="admin-heatmap-table" style={{ marginTop: "1rem" }}>
          <div className="admin-heatmap-header"><div className="admin-heatmap-dept-col">Department</div>{CAP_COMPETENCIES.map(c=><div key={c} className="admin-heatmap-comp-header">{c}</div>)}</div>
          {CAP_DEPTS.map(dept=>(
            <div key={dept.name} className="admin-heatmap-row">
              <div className="admin-heatmap-dept-col">{dept.name}</div>
              {dept.values.map((v,i)=>{const{bg,color}=capColor(v);return<div key={i} className="admin-heatmap-cell" style={{background:bg,color}}>{v}%</div>;})}
            </div>
          ))}
        </div>
        <div className="admin-cap-charts">
          <div className="admin-cap-chart-card"><h4>Required vs. Verified Competency</h4>{[["Required staff",248],["Verified staff",162]].map(([l,n])=>(<div key={l} className="admin-cap-bar-row"><span>{l}</span><div className="admin-cap-bar-bg"><div className="admin-cap-bar-fill" style={{width:`${(n/248)*100}%`,background:l.includes("Verified")?"#10b981":"#3b82f6"}}/></div><span className="admin-cap-bar-val">{n}</span></div>))}</div>
          <div className="admin-cap-chart-card"><h4>Department-wise Overall Coverage</h4>{CAP_DEPTS.map(d=>{const avg=Math.round(d.values.reduce((a,b)=>a+b,0)/d.values.length);const{bg,color}=capColor(avg);return(<div key={d.name} className="admin-cap-bar-row"><span>{d.name}</span><div className="admin-cap-bar-bg"><div className="admin-cap-bar-fill" style={{width:`${avg}%`,background:color}}/></div><span className="admin-cap-bar-val" style={{color}}>{avg}%</span></div>);})}</div>
        </div>
      </div>
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
  const [viewing, setViewing] = useState(false);
  const filtered = activeTab==="all"?COMP_ROWS:activeTab==="core"?COMP_ROWS.filter(r=>r[1].includes("Core")):activeTab==="technical"?COMP_ROWS.filter(r=>r[1].includes("Technical")):COMP_ROWS.filter(r=>r[1].includes("Support"));
  if (viewing) return <CompetencyDetails2 onBack={()=>setViewing(false)}/>;
  return (
    <Shell eyebrow="CAPABILITY" title="Competency Framework" desc="Define and manage competencies, proficiency levels and assessment criteria." action={<button className="button button-primary"><Plus size={14}/> Add Competency</button>}>
      <KpiRow items={[[Fingerprint,"12","Total Competencies","3 categories","#3b82f6"],[CheckCircle2,"6","Core Meteorological","","#10b981"],[Activity,"3","Technical","","#8b5cf6"],[Globe,"3","Support","","#f59e0b"]]}/>
      <div className="admin-panel">
        <Tabs tabs={[{id:"all",label:"All Competencies",count:12},{id:"core",label:"Core Meteorological",count:6},{id:"technical",label:"Technical",count:3},{id:"support",label:"Support",count:3}]} active={activeTab} onChange={setActiveTab}/>
        <SearchFilter placeholder="Search competencies..."/>
        <DataTable columns={["Competency Name","Category","Description","Levels","Mapped Roles","Status"]} rows={filtered} onView={()=>setViewing(true)} viewLabel="View"/>
      </div>
    </Shell>
  );
}

function RoleMappingPage() {
  const [params]=useSearchParams();const stage=params.get("screen");
  if(stage==="edit")return<Shell eyebrow="Role Mapping" title="Edit Role Mapping" desc="Radar Interpretation"><div className="admin-panel"><div className="admin-form-grid">{[["Role","select",["Scientist B","Scientist C","Meteorologist"]],["Current Required Level","text","L2 – Developing"],["New Required Level","select",["L1 – Basic","L2 – Developing","L3 – Proficient","L4 – Advanced"]],["Importance","select",["Low","Medium","High","Critical"]]].map(([label,type,val])=>(<label key={label} className="admin-form-label">{label}{type==="select"?<select className="admin-form-select">{val.map(o=><option key={o}>{o}</option>)}</select>:<input className="admin-form-input" defaultValue={val} readOnly/>}</label>))}</div><div className="admin-form-footer"><Link className="button button-secondary" to="/admin/job-role-requirements">Cancel</Link><Link className="button button-primary" to="/admin/job-role-requirements?screen=confirm">Review Changes →</Link></div></div></Shell>;
  if(stage==="confirm")return<Shell title="Confirm Role Mapping Changes"><div className="admin-panel"><div className="admin-change-table"><b>Role</b><b>Current</b><b>New</b><b>Old Importance</b><b>New Importance</b><span>Scientist B</span><span>L2</span><span className="admin-badge admin-badge-active">L3</span><span>Medium</span><span className="admin-badge admin-badge-active">High</span></div><div className="admin-form-footer"><Link className="button button-secondary" to="/admin/job-role-requirements?screen=edit">← Back</Link><Link className="button button-primary" to="/admin/job-role-requirements?screen=success">Confirm & Update</Link></div></div></Shell>;
  if(stage==="success")return<Shell title="Role Mapping Updated"><div className="admin-panel admin-success-card"><CheckCircle2 size={48} color="#10b981"/><h2>Updated Successfully</h2><Link className="button button-primary" to="/admin/job-role-requirements">View Updated Role Mapping</Link></div></Shell>;
  return(
    <Shell eyebrow="CAPABILITY" title="Role Mapping" desc="View and manage required competency levels for each role." action={<Link className="button button-primary" to="?screen=edit"><Plus size={14}/> Add Role Mapping</Link>}>
      <KpiRow items={[[Users,"6","Roles Mapped","","#3b82f6"],[Target,"40","Total Required","","#8b5cf6"],[CheckCircle2,"24","Currently Verified","","#10b981"],[Bell,"16","Overall Gap","","#ef4444"]]}/>
      <div className="admin-panel"><SearchFilter placeholder="Search by role..."/><DataTable columns={["Role","Department","Required Level","Current Coverage","Gap","Status"]} rows={[["Scientist B","Forecasting Division","L3 – Proficient","69%","6 staff","Active"],["Scientist C","R&D","L3 – Proficient","49%","12 staff","Active"],["Meteorologist","Regional Centre","L3 – Proficient","88%","2 staff","Active"],["Scientific Assistant","Observations","L2 – Developing","72%","8 staff","Active"]]} onEdit={()=>{}} editLabel="Edit"/></div>
    </Shell>
  );
}

function SkillGapPage(){return<Shell eyebrow="CAPABILITY" title="Skill Gap Analysis" desc="Identify gaps between required and current workforce capability."><KpiRow items={[[AlertTriangle,"64","Total Gaps","","#f59e0b"],[Users,"128","Staff Affected","","#ef4444"],[Zap,"4","Critical Gaps","","#ef4444"],[TrendingUp,"12%","Gap Reduction MoM","","#10b981"]]}/><div className="admin-panel"><SearchFilter placeholder="Search..."/><DataTable columns={["Competency","Department","Required Level","Avg. Current Level","Gap Size","Priority"]} rows={[["Radar Interpretation","Forecasting Division","L3","L2.1","28 staff","Critical"],["Climate Analysis","R&D Division","L3","L2.3","22 staff","High"],["NWP","Regional Centres","L3","L2.0","18 staff","High"],["Weather Forecasting","Observatories","L2","L1.5","24 staff","High"]]}/></div></Shell>;}
function TrainingDemandPanel(){return<Shell eyebrow="TRAINING" title="Training Demand Overview" desc="View recorded training demand. This is an application-level indicator, not a workforce forecast." action={<button className="button button-primary"><Plus size={14}/> Create Training Plan</button>}><KpiRow items={[[Users,"128","People Need Training","","#f59e0b"],[BookOpen,"8","Competencies with Demand","","#3b82f6"],[AlertTriangle,"4","High Priority","","#ef4444"],[UserCheck,"12","Available Trainers","","#10b981"]]}/><div className="admin-panel"><DataTable columns={["Competency","Category","Required Level","People Needing Training","Priority","Trainers Available"]} rows={[["Radar Interpretation","Core","L3","28","High","3"],["Climate Analysis","Core","L3","22","High","2"],["NWP","Technical","L3","18","Medium","4"],["Weather Forecasting","Core","L2","24","High","5"]]}/></div></Shell>;}
function TrainerPoolPage(){return<Shell eyebrow="TRAINERS" title="Trainer Pool" desc="Manage verified trainers, their competencies and availability." action={<button className="button button-primary"><Plus size={14}/> Add Trainer</button>}><KpiRow items={[[UserCheck,"24","Verified Trainers","","#10b981"],[Activity,"6","TTT In-Progress","","#8b5cf6"],[Clock3,"18","Active Assignments","","#3b82f6"],[AlertTriangle,"4","Verifications Expiring","","#f59e0b"]]}/><div className="admin-panel"><SearchFilter placeholder="Search trainers..."/><DataTable columns={["Trainer Name","Expertise","Current Load","Verified Competencies","Suitability","Status"]} rows={[["Dr. R. Krishnamurthy","Radar Interpretation, NWP","2/4 batches","3 competencies","High (92 pts)","Verified"],["Prof. S. Mehta","Climate Analysis, Forecasting","1/4 batches","4 competencies","High (88 pts)","Verified"],["Mr. A. Bose","Instrumentation, Hydromet.","3/4 batches","2 competencies","Medium (74 pts)","Verified"]]} onView={()=>{}} viewLabel="View"/></div></Shell>;}
function CoursesPage(){return<Shell eyebrow="TRAINING" title="Course Management" desc="View, manage and monitor all training courses." action={<button className="button button-primary"><Plus size={14}/> Create Course</button>}><KpiRow items={[[Library,"48","Total Courses","","#3b82f6"],[BookOpen,"18","Active Courses","","#10b981"],[Users,"1,284","Total Enrolments","","#8b5cf6"],[Award,"836","Completions","","#f59e0b"]]}/><div className="admin-panel"><DataTable columns={["Course Name","Competency","Level","Trainer","Enrolled","Completion Rate","Status"]} rows={[["Basic Radar Operations","Radar Interpretation","L1","Dr. R. Krishnamurthy","24","88%","Active"],["Radar Pattern Interpretation","Radar Interpretation","L2","Dr. K. Reddy","18","72%","Active"],["Climate Analysis Fundamentals","Climate Analysis","L1","Prof. S. Mehta","32","91%","Active"]]} onView={()=>{}} viewLabel="View"/></div></Shell>;}
function AssessmentsPage(){return<Shell eyebrow="TRAINING" title="Assessments" desc="Manage assessment instruments. Scores are evidence only." action={<button className="button button-primary"><Plus size={14}/> Create Assessment</button>}><div className="admin-info-callout"><ShieldCheck size={16} color="#3b82f6"/>MCQ scoring is server-side. Assessment scores are evidence — competency decisions require authorized human review.</div><KpiRow items={[[ClipboardCheck,"36","Total Assessments","","#3b82f6"],[Users,"284","Submissions","","#10b981"],[Activity,"76%","Avg. Pass Rate","","#8b5cf6"],[AlertTriangle,"8","Pending Review","","#f59e0b"]]}/><div className="admin-panel"><DataTable columns={["Assessment Name","Competency","Level","Type","Submissions","Pass Rate","Status"]} rows={[["Radar L1 Knowledge Test","Radar Interpretation","L1","MCQ","48","88%","Active"],["Radar L2 Practical","Radar Interpretation","L2","Practical","32","75%","Active"],["Climate Analysis MCQ","Climate Analysis","L2","MCQ","28","82%","Active"]]} onView={()=>{}} viewLabel="View"/></div></Shell>;}
function CertificationsPage(){return<Shell eyebrow="TRAINING" title="Certifications" desc="A certificate means course completion, not verified competency."><div className="admin-info-callout"><Info size={16} color="#3b82f6"/>Competency is established only by an explicit, authorized human decision.</div><KpiRow items={[[Award,"836","Certificates Issued","This year","#f59e0b"],[FileCheck2,"124","Credentials Active","","#10b981"],[Clock3,"18","Expiring Soon","Within 60 days","#f59e0b"],[AlertTriangle,"6","Revoked","","#ef4444"]]}/><div className="admin-panel"><DataTable columns={["Employee","Certificate","Course","Issued Date","Expiry","Status"]} rows={[["Asha Sharma","Radar L1 Completion","Basic Radar Operations","Mar 2026","Mar 2028","Active"],["Vikram Nair","Climate Analysis L2","Climate Analysis Fundamentals","Feb 2026","Feb 2028","Active"]]} onView={()=>{}} viewLabel="View"/></div></Shell>;}
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
