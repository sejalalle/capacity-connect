import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity, Award, BarChart3, Bell, BookOpen, CheckCircle2, Clock3, FileText,
  Plus, Users, UserCheck, ShieldCheck, Fingerprint, Building2, Route, Library,
  ClipboardCheck, FileCheck2, Megaphone, ScrollText, ChartNoAxesColumnIncreasing,
  AlertTriangle, TrendingUp, TrendingDown, Star, Eye, Edit, Filter, Search,
  Download, Upload, ChevronDown, ChevronRight, ArrowRight, XCircle, CheckCircle,
  Info, Zap, Target, Calendar, UserRound, Globe, BarChart2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════ */
function Shell({ title, eyebrow, desc, children, action, badge }) {
  return (
    <div className="admin-xp">
      <div className="admin-xp-head">
        <div>
          {eyebrow && <span className="admin-xp-eyebrow">{eyebrow}</span>}
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

function DataTable({ columns, rows, onView, onEdit, viewLabel = "Review", editLabel = "Edit" }) {
  return (
    <div className="admin-data-table">
      <div className="admin-table-head">
        {columns.map((c) => <span key={c}>{c}</span>)}
        <span>Actions</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="admin-table-row">
          {row.map((cell, j) => (
            <span key={j} className={
              typeof cell === "string" && ["Pending", "Active", "Verified", "Approved", "High", "Critical", "At Risk"].includes(cell)
                ? `admin-badge admin-badge-${cell.toLowerCase().replace(" ", "-")}`
                : ""
            }>
              {cell}
            </span>
          ))}
          <span className="admin-table-actions">
            {onView && <button className="admin-action-btn admin-action-view" onClick={() => onView(i)}><Eye size={13} /> {viewLabel}</button>}
            {onEdit && <button className="admin-action-btn admin-action-edit" onClick={() => onEdit(i)}><Edit size={13} /> {editLabel}</button>}
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
        <button
          key={t.id}
          className={`admin-tab-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="admin-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   USER APPROVALS (Steps 2–4 + 25–28)
═══════════════════════════════════════════════════════════ */
const APPROVAL_ROWS = [
  ["Amit Sharma", "amit.sharma@imd.gov.in", "Trainer", "Forecasting Division", "20 Aug 2026", "Pending"],
  ["Neha Verma", "neha.verma@imd.gov.in", "Trainer", "Regional Centre Mumbai", "19 Aug 2026", "Pending"],
  ["Rohit Kumar", "rohit.kumar@imd.gov.in", "Trainee", "Climate Research", "19 Aug 2026", "Pending"],
  ["Kavya Nair", "kavya.nair@imd.gov.in", "Trainer", "Observatory", "18 Aug 2026", "Pending"],
  ["Suresh Patel", "suresh.p@imd.gov.in", "Trainee", "Administration", "17 Aug 2026", "Pending"],
  ["Priya Singh", "priya.s@imd.gov.in", "Trainer", "R&D Division", "16 Aug 2026", "Pending"],
  ["Arjun Das", "arjun.d@imd.gov.in", "Trainee", "Forecasting Division", "15 Aug 2026", "Pending"],
];
const APPROVED_ROWS = [
  ["Asha Sharma", "asha.sharma@imd.gov.in", "Trainee", "Forecasting Division", "10 Aug 2026", "Approved"],
  ["Vikram Nair", "vikram.n@imd.gov.in", "Trainer", "Regional Centre Delhi", "08 Aug 2026", "Approved"],
];
const REJECTED_ROWS = [
  ["Ankit Joshi", "ankit.j@imd.gov.in", "Trainer", "Observatories", "05 Aug 2026", "Rejected"],
];

function ReviewModal({ user, onClose }) {
  const [tab, setTab] = useState("profile");
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState(null);
  if (decision === "approved") return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-success-banner">
          <CheckCircle2 size={32} color="#10b981" />
          <h2>User approved successfully</h2>
          <p>{user[0]} has been approved as a {user[2]}. Access to the platform has been granted.</p>
          <button className="button button-primary" onClick={onClose}>Back to Approvals</button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-avatar">{user[0][0]}{user[0].split(" ")[1]?.[0]}</div>
          <div>
            <h2 className="admin-modal-name">{user[0]}</h2>
            <p className="admin-modal-email">{user[1]}</p>
            <span className="admin-badge admin-badge-pending">{user[2]} Request</span>
          </div>
          <button className="admin-modal-close" onClick={onClose}><XCircle size={20} /></button>
        </div>
        <Tabs
          tabs={[
            { id: "profile", label: "Profile Details" },
            { id: "docs", label: "Documents" },
            { id: "competencies", label: "Requested Competencies" },
            { id: "activity", label: "Activity Log" },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="admin-modal-body">
          {tab === "profile" && (
            <div className="admin-detail-grid">
              <section className="admin-detail-section">
                <h3>Personal Information</h3>
                {[["Full Name", user[0]], ["Email", user[1]], ["Employee ID", "IMD-2025-" + (1000 + Math.floor(Math.random() * 999))], ["Designation", user[2] === "Trainer" ? "Senior Scientist" : "Scientist B"], ["Phone", "+91 98765 43210"], ["Location", user[3]]].map(([k, v]) => (
                  <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
                ))}
              </section>
              <section className="admin-detail-section">
                <h3>Additional Information</h3>
                {[["Experience", "6 years"], ["Highest Qualification", "M.Sc. Meteorology"], ["Current Role", user[3]], ["Request Date", user[4]], ["Reason for Access", "Assigned to new forecasting division training programme"]].map(([k, v]) => (
                  <div key={k} className="admin-detail-row"><span className="admin-detail-key">{k}</span><span className="admin-detail-val">{v}</span></div>
                ))}
              </section>
            </div>
          )}
          {tab === "docs" && (
            <div className="admin-docs-list">
              {[["Employee ID Card", "Verified"], ["Qualification Certificate", "Verified"], ["Experience Certificate", "Pending Review"], ["Government ID", "Verified"]].map(([doc, status]) => (
                <div key={doc} className="admin-doc-row">
                  <FileText size={16} />
                  <span>{doc}</span>
                  <span className={`admin-badge admin-badge-${status === "Verified" ? "approved" : "pending"}`}>{status}</span>
                  <button className="admin-action-btn admin-action-view"><Eye size={12} /> View</button>
                </div>
              ))}
            </div>
          )}
          {tab === "competencies" && (
            <div className="admin-comp-request">
              <p className="admin-info-note"><Info size={14} /> Requested competency access — to be verified after approval.</p>
              {[["Radar Interpretation", "L2"], ["Weather Forecasting", "L3"], ["Satellite Meteorology", "L2"]].map(([c, l]) => (
                <div key={c} className="admin-comp-req-row">
                  <Fingerprint size={14} />
                  <span>{c}</span>
                  <span className="admin-level-badge">{l}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "activity" && (
            <div className="admin-activity-log">
              {[["Registration submitted", user[4]], ["Profile auto-verified", user[4]], ["Assigned for manual review", "21 Aug 2026"]].map(([ev, date]) => (
                <div key={ev} className="admin-activity-item">
                  <span className="admin-activity-dot" />
                  <span>{ev}</span>
                  <span className="admin-activity-date">{date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="admin-modal-footer">
          <textarea
            className="admin-remarks-input"
            placeholder="Add remarks (optional)..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <div className="admin-modal-btns">
            <button className="button button-danger" onClick={onClose}><XCircle size={14} /> Reject</button>
            <button className="button button-primary" onClick={() => setDecision("approved")}><CheckCircle size={14} /> Approve</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [reviewing, setReviewing] = useState(null);
  const rows = activeTab === "pending" ? APPROVAL_ROWS : activeTab === "approved" ? APPROVED_ROWS : REJECTED_ROWS;

  return (
    <Shell
      eyebrow="PEOPLE MANAGEMENT"
      title="User Approvals"
      desc="Review new user registration requests, verify details, and assign platform roles."
      badge="7 Pending"
    >
      {reviewing !== null && (
        <ReviewModal user={rows[reviewing]} onClose={() => setReviewing(null)} />
      )}
      <KpiRow items={[
        [AlertTriangle, "7", "Pending Approvals", "Requires review", "#f59e0b"],
        [CheckCircle2, "128", "Approved Users", "This year", "#10b981"],
        [XCircle, "12", "Rejected Requests", "", "#ef4444"],
        [Activity, "96%", "Profile Completion", "Avg.", "#3b82f6"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[
            { id: "pending", label: "Pending Requests", count: 7 },
            { id: "approved", label: "Approved", count: 128 },
            { id: "rejected", label: "Rejected", count: 12 },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <SearchFilter
          placeholder="Search by name, email or department..."
          extraFilters={[
            { label: "All Roles", options: ["Trainee", "Trainer", "Admin"] },
            { label: "All Departments", options: ["Forecasting Division", "R&D", "Regional Centres", "Observatories"] },
          ]}
        />
        <DataTable
          columns={["Name", "Email", "Requested Role", "Department", "Request Date", "Status"]}
          rows={rows}
          onView={(i) => setReviewing(i)}
          viewLabel="Review"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAPABILITY MAP (Step 5)
═══════════════════════════════════════════════════════════ */
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

function CapabilityMapPage() {
  const [dept, setDept] = useState("all");
  const displayed = dept === "all" ? CAP_DEPTS : CAP_DEPTS.filter((d) => d.name === dept);
  return (
    <Shell
      eyebrow="CAPABILITY"
      title="Organizational Capability Map"
      desc="View current competency coverage across all departments and identify capability gaps."
    >
      <KpiRow items={[
        [Users, "42", "Require Training", "", "#f59e0b"],
        [CheckCircle2, "28", "Verified", "This quarter", "#10b981"],
        [Activity, "64%", "Overall Coverage", "+3% MoM", "#3b82f6"],
        [Bell, "16", "Open Gaps", "Critical areas", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <div className="admin-cap-controls">
          <select className="admin-filter-select" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All Departments</option>
            {CAP_DEPTS.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select className="admin-filter-select">
            <option>At or Above Required Level</option>
            <option>Below Required Level</option>
          </select>
        </div>
        <div className="admin-heatmap-table" style={{ marginTop: "1rem" }}>
          <div className="admin-heatmap-header">
            <div className="admin-heatmap-dept-col">Department</div>
            {CAP_COMPETENCIES.map((c) => <div key={c} className="admin-heatmap-comp-header">{c}</div>)}
          </div>
          {displayed.map((dept) => (
            <div key={dept.name} className="admin-heatmap-row">
              <div className="admin-heatmap-dept-col">{dept.name}</div>
              {dept.values.map((v, i) => {
                const { bg, color } = capColor(v);
                return (
                  <div key={i} className="admin-heatmap-cell" style={{ background: bg, color }}>
                    {v}%
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="admin-cap-charts">
          <div className="admin-cap-chart-card">
            <h4>Required vs. Verified Competency</h4>
            {[["Required staff", 248], ["Verified staff", 162]].map(([l, n]) => (
              <div key={l} className="admin-cap-bar-row">
                <span>{l}</span>
                <div className="admin-cap-bar-bg">
                  <div className="admin-cap-bar-fill" style={{ width: `${(n / 248) * 100}%`, background: l.includes("Verified") ? "#10b981" : "#3b82f6" }} />
                </div>
                <span className="admin-cap-bar-val">{n}</span>
              </div>
            ))}
          </div>
          <div className="admin-cap-chart-card">
            <h4>Department-wise Overall Coverage</h4>
            {CAP_DEPTS.map((d) => {
              const avg = Math.round(d.values.reduce((a, b) => a + b, 0) / d.values.length);
              const { bg, color } = capColor(avg);
              return (
                <div key={d.name} className="admin-cap-bar-row">
                  <span>{d.name}</span>
                  <div className="admin-cap-bar-bg">
                    <div className="admin-cap-bar-fill" style={{ width: `${avg}%`, background: color }} />
                  </div>
                  <span className="admin-cap-bar-val" style={{ color }}>{avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPETENCY FRAMEWORK (Steps 6–7)
═══════════════════════════════════════════════════════════ */
const COMP_ROWS = [
  ["Radar Interpretation", "Core Meteorological", "Interpreting radar data for weather monitoring and severe weather detection.", "5 levels", "4", "Active"],
  ["Climate Analysis", "Core Meteorological", "Analyzing climate patterns, trends and anomalies.", "5 levels", "3", "Active"],
  ["Numerical Weather Prediction", "Technical", "Using NWP models for operational forecasting.", "4 levels", "5", "Active"],
  ["Weather Forecasting", "Core Meteorological", "Preparing and issuing weather forecasts.", "5 levels", "6", "Active"],
  ["Instrumentation", "Technical", "Operating and maintaining meteorological instruments.", "4 levels", "4", "Active"],
  ["Hydrometeorology", "Core Meteorological", "Hydrometeorological analysis and flood forecasting.", "4 levels", "3", "Active"],
  ["Remote Sensing", "Technical", "Satellite remote sensing interpretation.", "3 levels", "2", "Active"],
  ["Data Quality", "Support", "Ensuring data quality in meteorological records.", "3 levels", "3", "Active"],
  ["Communication", "Support", "Technical communication of weather information.", "3 levels", "5", "Active"],
  ["Research Methods", "Support", "Scientific research and documentation methods.", "3 levels", "2", "Active"],
  ["Disaster Management", "Core Meteorological", "Early warning systems and disaster response.", "4 levels", "4", "Active"],
  ["Coastal Meteorology", "Core Meteorological", "Coastal weather patterns and maritime forecasting.", "4 levels", "3", "Active"],
];

const LEVEL_ROWS = [
  ["L1", "Basic", "Understands basic radar concepts and products.", "MCQ Assessment", "≥ 60% score"],
  ["L2", "Developing", "Interprets standard radar products with guidance.", "MCQ + Practical", "≥ 65% + supervisor sign-off"],
  ["L3", "Proficient", "Interprets radar data independently for routine operations.", "MCQ + Practical + Evidence", "≥ 70% + 3 evidence items"],
  ["L4", "Advanced", "Analyzes complex radar data and develops products.", "All + Expert Review", "≥ 80% + expert panel review"],
  ["L5", "Expert", "Leads operational innovation and mentors others.", "Comprehensive review", "Portfolio + senior review"],
];

function CompetencyDetails({ onBack }) {
  const [tab, setTab] = useState("overview");
  return (
    <Shell
      eyebrow={<span className="admin-breadcrumb"><button onClick={onBack}>Competency Framework</button> › Radar Interpretation</span>}
      title="Radar Interpretation"
      badge="Active"
      desc="Interpret radar data for weather monitoring, nowcasting and severe weather detection."
      action={<button className="button button-primary"><Edit size={14} /> Edit Competency</button>}
    >
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "levels", label: "Levels & Criteria" },
          { id: "methods", label: "Assessment Methods" },
          { id: "roles", label: "Mapped Roles (4)" },
          { id: "courses", label: "Related Courses (4)" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && (
        <div className="detail-grid">
          <div className="admin-panel">
            <h3>Basic Information</h3>
            <dl className="admin-info-dl">
              {[["Category", "Core Meteorological"], ["Domain", "Weather Observation"], ["Scope", "Operational meteorology and weather analysis"], ["Keywords", "Radar · Nowcasting · Precipitation · Severe weather"], ["Status", "Active"], ["Created", "Jan 2024"], ["Last Updated", "Aug 2026"]].map(([k, v]) => (
                <div key={k} className="admin-dl-row"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <h3 style={{ marginTop: "1.5rem" }}>Assessment Methods</h3>
            <div className="admin-method-chips">
              {["MCQ assessment", "Practical assessment", "Evidence submission", "Expert review"].map((m) => (
                <span key={m} className="admin-method-chip">{m}</span>
              ))}
            </div>
          </div>
          <div className="admin-panel">
            <h3>Competency Levels (L1–L5)</h3>
            {LEVEL_ROWS.map(([l, n, d]) => (
              <div key={l} className="admin-level-rule">
                <span className="admin-level-badge-lg">{l}</span>
                <div>
                  <strong>{n}</strong>
                  <small>{d}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "levels" && (
        <div className="admin-panel">
          <DataTable
            columns={["Level", "Name", "Description", "Assessment Method", "Passing Criteria"]}
            rows={LEVEL_ROWS}
          />
        </div>
      )}
      {tab === "methods" && (
        <div className="admin-panel">
          <p className="admin-info-note"><Info size={14} /> Assessment scores are evidence only. Competency decisions require authorized human review.</p>
          {[["Knowledge Test (MCQ)", "Tests theoretical understanding", "Server-side graded", "Quarterly"],
            ["Practical Assessment", "Evaluates operational skills", "Supervisor observation", "Bi-annually"],
            ["Evidence Submission", "Portfolio of real work examples", "Coordinator reviewed", "Ongoing"],
            ["Expert Panel Review", "Holistic evaluation by senior meteorologists", "Panel decision", "Annually"]].map(([name, desc, grading, freq]) => (
            <div key={name} className="admin-method-card">
              <div>
                <strong>{name}</strong>
                <p>{desc}</p>
              </div>
              <div className="admin-method-meta">
                <span><Shield size={12} /> {grading}</span>
                <span><Calendar size={12} /> {freq}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "roles" && (
        <div className="admin-panel">
          <DataTable
            columns={["Role", "Department", "Required Level", "Current Coverage", "Gap"]}
            rows={[
              ["Scientist B", "Forecasting Division", "L3 – Proficient", "69%", "6 staff"],
              ["Scientist C", "R&D", "L3 – Proficient", "49%", "12 staff"],
              ["Meteorologist", "Regional Centre", "L3 – Proficient", "88%", "2 staff"],
              ["Scientific Assistant", "Observatories", "L2 – Developing", "72%", "8 staff"],
            ]}
          />
        </div>
      )}
      {tab === "courses" && (
        <div className="admin-panel">
          <DataTable
            columns={["Course", "Level Target", "Duration", "Enrolled", "Status"]}
            rows={[
              ["Basic Radar Operations", "L1", "8 hours", "24", "Active"],
              ["Radar Pattern Interpretation", "L2", "16 hours", "18", "Active"],
              ["Advanced Radar Analysis", "L3", "24 hours", "12", "Active"],
              ["Severe Weather Radar Techniques", "L4", "32 hours", "6", "Active"],
            ]}
          />
        </div>
      )}
    </Shell>
  );
}

function CompetencyFrameworkPage() {
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [viewing, setViewing] = useState(params.get("screen") === "details");

  const filtered = activeTab === "all" ? COMP_ROWS
    : activeTab === "core" ? COMP_ROWS.filter((r) => r[1].includes("Core"))
    : activeTab === "technical" ? COMP_ROWS.filter((r) => r[1].includes("Technical"))
    : COMP_ROWS.filter((r) => r[1].includes("Support"));

  if (viewing) return <CompetencyDetails onBack={() => setViewing(false)} />;

  return (
    <Shell
      eyebrow="CAPABILITY"
      title="Competency Framework"
      desc="Define and manage competencies, proficiency levels and assessment criteria."
      action={<button className="button button-primary"><Plus size={14} /> Add Competency</button>}
    >
      <KpiRow items={[
        [Fingerprint, "12", "Total Competencies", "3 categories", "#3b82f6"],
        [CheckCircle2, "6", "Core Meteorological", "", "#10b981"],
        [Activity, "3", "Technical", "", "#8b5cf6"],
        [Globe, "3", "Support", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[
            { id: "all", label: "All Competencies", count: 12 },
            { id: "core", label: "Core Meteorological", count: 6 },
            { id: "technical", label: "Technical", count: 3 },
            { id: "support", label: "Support", count: 3 },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
        <SearchFilter placeholder="Search competencies..." />
        <DataTable
          columns={["Competency Name", "Category", "Description", "Levels", "Mapped Roles", "Status"]}
          rows={filtered}
          onView={() => setViewing(true)}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROLE MAPPING (Steps 8–12)
═══════════════════════════════════════════════════════════ */
function RoleMappingPage() {
  const [params] = useSearchParams();
  const stage = params.get("screen");

  if (stage === "edit") return (
    <Shell eyebrow={<span className="admin-breadcrumb"><Link to="/admin/job-role-requirements">Role Mapping</Link> › Edit</span>} title="Edit Role Mapping" desc="Radar Interpretation">
      <div className="admin-panel mapping-summary-card">
        <div className="mapping-comp-info">
          <Fingerprint size={20} color="#3b82f6" />
          <div><b>Radar Interpretation</b><span>Ability to interpret radar data and products for weather analysis and forecasting.</span></div>
        </div>
        <div className="mapping-comp-meta">
          <span>Total levels <b>5 (L1–L5)</b></span>
          <span>Methods <b>Knowledge test, practical assessment</b></span>
        </div>
      </div>
      <div className="admin-panel">
        <h3>Edit Mapping for Role</h3>
        <div className="admin-form-grid">
          {[["Role", "select", ["Scientist B", "Scientist C", "Meteorologist", "Scientific Assistant"]],
            ["Current Required Level", "text", "L2 – Developing"],
            ["New Required Level", "select", ["L1 – Basic", "L2 – Developing", "L3 – Proficient", "L4 – Advanced", "L5 – Expert"]],
            ["Importance", "select", ["Low", "Medium", "High", "Critical"]]].map(([label, type, val]) => (
            <label key={label} className="admin-form-label">
              {label}
              {type === "select"
                ? <select className="admin-form-select">{(val).map((o) => <option key={o}>{o}</option>)}</select>
                : <input className="admin-form-input" defaultValue={val} readOnly={type === "text"} />}
            </label>
          ))}
        </div>
        <div className="admin-mapping-descriptions">
          <p><b>Role description: </b>Involved in advanced weather analysis and operational forecasting.</p>
          <p><b>Level definitions: </b>L1 Basic · L2 Developing · L3 Proficient · L4 Advanced · L5 Expert</p>
        </div>
        <div className="admin-form-footer">
          <Link className="button button-secondary" to="/admin/job-role-requirements">Cancel</Link>
          <Link className="button button-primary" to="/admin/job-role-requirements?screen=confirm">Review Changes →</Link>
        </div>
      </div>
    </Shell>
  );

  if (stage === "confirm") return (
    <Shell eyebrow="Role Mapping" title="Confirm Role Mapping Changes" desc="Review changes before updating the role mapping.">
      <div className="admin-info-callout">
        <AlertTriangle size={16} color="#d97706" />
        Changing this role requirement will recalculate organizational capability gaps and training demand.
      </div>
      <div className="admin-panel">
        <h3>Summary of Changes</h3>
        <div className="admin-change-table">
          <b>Role</b><b>Current Required Level</b><b>New Required Level</b><b>Current Importance</b><b>New Importance</b>
          <span>Scientist B</span><span>L2 – Developing</span><span className="admin-badge admin-badge-active">L3 – Proficient</span><span>Medium</span><span className="admin-badge admin-badge-active">High</span>
        </div>
        <h3>Impact of Changes</h3>
        <ul className="admin-impact-list">
          <li>Organizational capability gaps will be recalculated.</li>
          <li>Training demand may be updated based on the new requirement.</li>
          <li>18 employees in this role will be assessed against the new requirement.</li>
        </ul>
        <div className="admin-form-footer">
          <Link className="button button-secondary" to="/admin/job-role-requirements?screen=edit">← Back</Link>
          <Link className="button button-primary" to="/admin/job-role-requirements?screen=success">Confirm & Update</Link>
        </div>
      </div>
    </Shell>
  );

  if (stage === "success") return (
    <Shell title="Role Mapping Updated" desc="">
      <div className="admin-panel admin-success-card">
        <CheckCircle2 size={48} color="#10b981" />
        <h2>Role Mapping Updated Successfully</h2>
        <p>Organizational capability data has been recalculated.</p>
        <div className="admin-success-details">
          {[["Competency", "Radar Interpretation"], ["Updated Roles", "1 role updated"], ["Changes Made", "Scientist B: L2 → L3 (Importance: Medium → High)"], ["Updated By", "Admin User"]].map(([k, v]) => (
            <div key={k}><b>{k}:</b> {v}</div>
          ))}
        </div>
        <Link className="button button-primary" to="/admin/job-role-requirements">View Updated Role Mapping</Link>
      </div>
    </Shell>
  );

  return (
    <Shell
      eyebrow="CAPABILITY"
      title="Role Mapping — Radar Interpretation"
      desc="View and manage required competency levels for each organizational role."
      action={<Link className="button button-primary" to="?screen=edit"><Plus size={14} /> Add Role Mapping</Link>}
    >
      <KpiRow items={[
        [Users, "6", "Roles Mapped", "", "#3b82f6"],
        [Target, "40", "Total Required", "across roles", "#8b5cf6"],
        [CheckCircle2, "24", "Currently Verified", "", "#10b981"],
        [Bell, "16", "Overall Gap", "needs action", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <SearchFilter placeholder="Search by role or department..." />
        <DataTable
          columns={["Role", "Department / Division", "Required Level", "Current Coverage", "Gap", "Status"]}
          rows={[
            ["Scientist B", "Forecasting Division", "L3 – Proficient", "69%", "6 staff", "Active"],
            ["Scientist C", "Research & Development", "L3 – Proficient", "49%", "12 staff", "Active"],
            ["Meteorologist", "Regional Centre", "L3 – Proficient", "88%", "2 staff", "Active"],
            ["Scientific Assistant", "Observations Division", "L2 – Developing", "72%", "8 staff", "Active"],
            ["Research Associate", "R&D", "L2 – Developing", "61%", "5 staff", "Active"],
            ["Section Head", "All Divisions", "L4 – Advanced", "42%", "14 staff", "Active"],
          ]}
          onEdit={() => {}}
          editLabel="Edit"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAINING DEMAND (Steps 13–14)
═══════════════════════════════════════════════════════════ */
function TrainingDemandPanel() {
  const [tab, setTab] = useState("demand");
  return (
    <Shell
      eyebrow="TRAINING"
      title="Training Demand Overview"
      desc="View recorded training demand by competency and role. This is an application-level indicator, not a workforce forecast."
      action={<button className="button button-primary"><Plus size={14} /> Create Training Plan</button>}
    >
      <KpiRow items={[
        [Users, "128", "People Need Training", "", "#f59e0b"],
        [BookOpen, "8", "Competencies with Demand", "", "#3b82f6"],
        [AlertTriangle, "4", "High Priority", "Requires action", "#ef4444"],
        [UserCheck, "12", "Available Trainers", "", "#10b981"],
      ]} />
      <Tabs
        tabs={[{ id: "demand", label: "Demand Overview" }, { id: "plan", label: "Training Planning" }]}
        active={tab}
        onChange={setTab}
      />
      {tab === "demand" ? (
        <div className="admin-panel">
          <SearchFilter
            placeholder="Search by competency..."
            extraFilters={[{ label: "Priority", options: ["High", "Medium", "Low"] }, { label: "Department", options: ["Forecasting", "R&D", "Regional", "Observatories"] }]}
          />
          <DataTable
            columns={["Competency", "Category", "Required Level", "People Needing Training", "Priority", "Trainers Available"]}
            rows={[
              ["Radar Interpretation", "Core", "L3", "28", "High", "3"],
              ["Climate Analysis", "Core", "L3", "22", "High", "2"],
              ["Numerical Weather Prediction", "Technical", "L3", "18", "Medium", "4"],
              ["Weather Forecasting", "Core", "L2", "24", "High", "5"],
              ["Instrumentation", "Technical", "L2", "14", "Medium", "3"],
              ["Hydrometeorology", "Core", "L3", "22", "Medium", "2"],
            ]}
          />
        </div>
      ) : (
        <div className="admin-panel">
          <p className="admin-info-note"><Info size={14} /> Training plans group demand into actionable batches for coordinator review and scheduling.</p>
          <DataTable
            columns={["Plan Name", "Competency", "Target Group", "Start Date", "Capacity", "Status"]}
            rows={[
              ["Radar L3 Batch A", "Radar Interpretation", "Scientist B, Forecasting Div.", "Oct 2026", "15 seats", "Planning"],
              ["Climate Analysis Refresher", "Climate Analysis", "All divisions", "Nov 2026", "20 seats", "Draft"],
              ["NWP Foundations", "NWP", "New Meteorologists", "Dec 2026", "12 seats", "Approved"],
            ]}
            onView={() => {}}
            viewLabel="View"
          />
        </div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRAINER POOL (Step 15–20)
═══════════════════════════════════════════════════════════ */
function TrainerPoolPage() {
  const [tab, setTab] = useState("pool");
  return (
    <Shell
      eyebrow="TRAINERS"
      title="Trainer Pool"
      desc="Manage verified trainers, their competencies and availability for training assignments."
      action={<button className="button button-primary"><Plus size={14} /> Add Trainer</button>}
    >
      <KpiRow items={[
        [UserCheck, "24", "Verified Trainers", "", "#10b981"],
        [Activity, "6", "TTT In-Progress", "", "#8b5cf6"],
        [Clock3, "18", "Active Assignments", "", "#3b82f6"],
        [AlertTriangle, "4", "Verifications Expiring", "Within 30 days", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <SearchFilter
          placeholder="Search trainers..."
          extraFilters={[
            { label: "Competency", options: ["Radar Interpretation", "Climate Analysis", "NWP", "Forecasting"] },
            { label: "Availability", options: ["Available", "Partially Available", "Unavailable"] },
          ]}
        />
        <DataTable
          columns={["Trainer Name", "Expertise", "Current Load", "Verified Competencies", "Suitability", "Status"]}
          rows={[
            ["Dr. R. Krishnamurthy", "Radar Interpretation, NWP", "2/4 batches", "3 competencies", "High (92 pts)", "Verified"],
            ["Prof. S. Mehta", "Climate Analysis, Forecasting", "1/4 batches", "4 competencies", "High (88 pts)", "Verified"],
            ["Mr. A. Bose", "Instrumentation, Hydromet.", "3/4 batches", "2 competencies", "Medium (74 pts)", "Verified"],
            ["Dr. K. Reddy", "Weather Forecasting, Radar", "0/4 batches", "3 competencies", "High (95 pts)", "Verified"],
            ["Ms. P. Sharma", "Climate Analysis, Remote Sensing", "2/4 batches", "2 competencies", "Medium (78 pts)", "At Risk"],
          ]}
          onView={() => {}}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORTS & ANALYTICS
═══════════════════════════════════════════════════════════ */
function ReportsPage() {
  return (
    <Shell
      eyebrow="REPORTS & ANALYTICS"
      title="Reports & Analytics"
      desc="Monitor training programmes, participation and organizational learning outcomes."
      action={<button className="button button-secondary"><Download size={14} /> Export All</button>}
    >
      <KpiRow items={[
        [BookOpen, "48", "Total Courses", "", "#3b82f6"],
        [Users, "1,284", "Total Enrolments", "", "#10b981"],
        [Award, "836", "Certificates Issued", "", "#f59e0b"],
        [BarChart3, "78%", "Participation Rate", "+5% YoY", "#8b5cf6"],
      ]} />
      <div className="admin-report-grid">
        {[
          { title: "Training Participation", icon: Users, desc: "Enrolment trends, completion rates, dropout analysis.", color: "#3b82f6" },
          { title: "Course-wise Performance", icon: Star, desc: "Per-course metrics, pass rates, assessment scores.", color: "#10b981" },
          { title: "Certification Reports", icon: Award, desc: "Certificates issued, expiry alerts, credential summary.", color: "#f59e0b" },
          { title: "User Activity Report", icon: Activity, desc: "Login frequency, module engagement, time-on-platform.", color: "#8b5cf6" },
          { title: "Department-wise Analysis", icon: Building2, desc: "Capability coverage breakdown by department.", color: "#ec4899" },
          { title: "Trainer Contribution", icon: UserCheck, desc: "Trainer workload, effectiveness, trainee outcomes.", color: "#06b6d4" },
        ].map(({ title, icon: Icon, desc, color }) => (
          <div key={title} className="admin-report-card">
            <div className="admin-report-card-icon" style={{ background: color + "22", color }}>
              <Icon size={22} />
            </div>
            <div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
            <div className="admin-report-card-actions">
              <button className="admin-action-btn admin-action-view"><Eye size={12} /> View</button>
              <button className="admin-action-btn admin-action-edit"><Download size={12} /> Export</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEEDBACK
═══════════════════════════════════════════════════════════ */
function FeedbackOverviewPage() {
  const [tab, setTab] = useState("overview");
  return (
    <Shell
      eyebrow="FEEDBACK"
      title="Feedback Overview"
      desc="View feedback from trainees and trainers to identify learning programme improvements."
    >
      <KpiRow items={[
        [Star, "4.2", "Avg. Rating", "From 1,248 submissions", "#f59e0b"],
        [FileText, "1,248", "Total Feedback", "This year", "#3b82f6"],
        [CheckCircle2, "86%", "Positive Feedback", "", "#10b981"],
        [Bell, "14%", "Needs Improvement", "14 flagged", "#ef4444"],
      ]} />
      <Tabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "trends", label: "Trends" }, { id: "actions", label: "Improvement Actions" }]}
        active={tab}
        onChange={setTab}
      />
      <div className="admin-panel">
        {tab === "overview" && (
          <DataTable
            columns={["Course", "Trainer", "Avg. Rating", "Responses", "Positive", "Flagged"]}
            rows={[
              ["Radar L3 Programme", "Dr. R. Krishnamurthy", "4.6 ★", "18", "95%", "0"],
              ["Climate Analysis", "Prof. S. Mehta", "4.1 ★", "22", "82%", "2"],
              ["NWP Foundations", "Mr. A. Bose", "3.8 ★", "12", "75%", "4"],
              ["Weather Forecasting", "Dr. K. Reddy", "4.4 ★", "24", "88%", "1"],
            ]}
          />
        )}
        {tab === "trends" && (
          <div className="admin-feedback-trends">
            {["Radar Interpretation", "Climate Analysis", "NWP", "Weather Forecasting"].map((comp) => {
              const rating = (3.5 + Math.random() * 1).toFixed(1);
              return (
                <div key={comp} className="admin-trend-row">
                  <span>{comp}</span>
                  <div className="admin-rating-bar-bg">
                    <div className="admin-rating-bar-fill" style={{ width: `${(parseFloat(rating) / 5) * 100}%` }} />
                  </div>
                  <span>{rating} / 5.0</span>
                </div>
              );
            })}
          </div>
        )}
        {tab === "actions" && (
          <DataTable
            columns={["Issue Identified", "Course / Area", "Priority", "Assigned To", "Status"]}
            rows={[
              ["NWP course lacks practical examples", "NWP Foundations", "High", "Mr. A. Bose", "In Progress"],
              ["Assessment questions too theoretical", "Climate Analysis", "Medium", "Prof. S. Mehta", "Planned"],
              ["Session recordings unavailable", "Radar L3", "Low", "Admin", "Pending"],
            ]}
          />
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   SKILL GAP ANALYSIS
═══════════════════════════════════════════════════════════ */
function SkillGapPage() {
  return (
    <Shell
      eyebrow="CAPABILITY"
      title="Skill Gap Analysis"
      desc="Identify gaps between required competency levels and current workforce capability."
    >
      <KpiRow items={[
        [AlertTriangle, "64", "Total Gaps Identified", "", "#f59e0b"],
        [Users, "128", "Staff Affected", "", "#ef4444"],
        [Zap, "4", "Critical Gaps", "Immediate action", "#ef4444"],
        [TrendingUp, "12%", "Gap Reduction MoM", "", "#10b981"],
      ]} />
      <div className="admin-panel">
        <SearchFilter
          placeholder="Search by competency or department..."
          extraFilters={[{ label: "Priority", options: ["Critical", "High", "Medium", "Low"] }]}
        />
        <DataTable
          columns={["Competency", "Department", "Required Level", "Avg. Current Level", "Gap Size", "Priority"]}
          rows={[
            ["Radar Interpretation", "Forecasting Division", "L3", "L2.1", "28 staff", "Critical"],
            ["Climate Analysis", "R&D Division", "L3", "L2.3", "22 staff", "High"],
            ["NWP", "Regional Centres", "L3", "L2.0", "18 staff", "High"],
            ["Weather Forecasting", "Observatories", "L2", "L1.5", "24 staff", "High"],
            ["Instrumentation", "All Divisions", "L2", "L1.8", "14 staff", "Medium"],
            ["Hydrometeorology", "Forecasting Division", "L3", "L2.2", "22 staff", "Medium"],
          ]}
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   COURSES (Admin view)
═══════════════════════════════════════════════════════════ */
function CoursesPage() {
  const [tab, setTab] = useState("all");
  return (
    <Shell
      eyebrow="TRAINING"
      title="Course Management"
      desc="View, manage and monitor all training courses in the platform."
      action={<button className="button button-primary"><Plus size={14} /> Create Course</button>}
    >
      <KpiRow items={[
        [Library, "48", "Total Courses", "", "#3b82f6"],
        [BookOpen, "18", "Active Courses", "", "#10b981"],
        [Users, "1,284", "Total Enrolments", "", "#8b5cf6"],
        [Award, "836", "Completions", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <Tabs
          tabs={[{ id: "all", label: "All Courses", count: 48 }, { id: "active", label: "Active", count: 18 }, { id: "draft", label: "Draft", count: 6 }, { id: "archived", label: "Archived", count: 24 }]}
          active={tab}
          onChange={setTab}
        />
        <SearchFilter placeholder="Search courses..." extraFilters={[{ label: "Competency", options: ["Radar", "Climate", "NWP", "Forecasting"] }]} />
        <DataTable
          columns={["Course Name", "Competency", "Level", "Trainer", "Enrolled", "Completion Rate", "Status"]}
          rows={[
            ["Basic Radar Operations", "Radar Interpretation", "L1", "Dr. R. Krishnamurthy", "24", "88%", "Active"],
            ["Radar Pattern Interpretation", "Radar Interpretation", "L2", "Dr. K. Reddy", "18", "72%", "Active"],
            ["Climate Analysis Fundamentals", "Climate Analysis", "L1", "Prof. S. Mehta", "32", "91%", "Active"],
            ["Advanced NWP Modelling", "NWP", "L3", "Mr. A. Bose", "12", "65%", "Active"],
            ["Weather Forecasting Operations", "Weather Forecasting", "L2", "Dr. K. Reddy", "28", "79%", "Active"],
          ]}
          onView={() => {}}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ASSESSMENTS (Admin view)
═══════════════════════════════════════════════════════════ */
function AssessmentsPage() {
  return (
    <Shell
      eyebrow="TRAINING"
      title="Assessments"
      desc="Manage assessment instruments. Scoring is always server-side; scores are evidence only."
      action={<button className="button button-primary"><Plus size={14} /> Create Assessment</button>}
    >
      <div className="admin-info-callout">
        <ShieldCheck size={16} color="#3b82f6" />
        MCQ scoring is server-side. Assessment scores are evidence — competency decisions require authorized human review.
      </div>
      <KpiRow items={[
        [ClipboardCheck, "36", "Total Assessments", "", "#3b82f6"],
        [Users, "284", "Submissions", "This quarter", "#10b981"],
        [Activity, "76%", "Avg. Pass Rate", "", "#8b5cf6"],
        [AlertTriangle, "8", "Pending Review", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <SearchFilter placeholder="Search assessments..." />
        <DataTable
          columns={["Assessment Name", "Competency", "Level", "Type", "Submissions", "Pass Rate", "Status"]}
          rows={[
            ["Radar L1 Knowledge Test", "Radar Interpretation", "L1", "MCQ", "48", "88%", "Active"],
            ["Radar L2 Practical", "Radar Interpretation", "L2", "Practical", "32", "75%", "Active"],
            ["Climate Analysis MCQ", "Climate Analysis", "L2", "MCQ", "28", "82%", "Active"],
            ["NWP Foundations Test", "NWP", "L1", "MCQ", "22", "68%", "Active"],
            ["Weather Forecasting Assessment", "Weather Forecasting", "L2", "Mixed", "18", "72%", "Active"],
          ]}
          onView={() => {}}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   CERTIFICATIONS (Admin)
═══════════════════════════════════════════════════════════ */
function CertificationsPage() {
  return (
    <Shell
      eyebrow="TRAINING"
      title="Certifications"
      desc="Track course completion certificates. Certificates reflect course completion, not verified competency."
    >
      <div className="admin-info-callout">
        <Info size={16} color="#3b82f6" />
        A certificate means course completion. It is not verified competency. Competency is established only by an explicit, authorized human decision.
      </div>
      <KpiRow items={[
        [Award, "836", "Certificates Issued", "This year", "#f59e0b"],
        [FileCheck2, "124", "Credentials Active", "", "#10b981"],
        [Clock3, "18", "Expiring Soon", "Within 60 days", "#f59e0b"],
        [AlertTriangle, "6", "Revoked", "", "#ef4444"],
      ]} />
      <div className="admin-panel">
        <SearchFilter placeholder="Search certificates..." extraFilters={[{ label: "Status", options: ["Active", "Expired", "Revoked"] }]} />
        <DataTable
          columns={["Employee", "Certificate", "Course", "Issued Date", "Expiry", "Status"]}
          rows={[
            ["Asha Sharma", "Radar L1 Completion", "Basic Radar Operations", "Mar 2026", "Mar 2028", "Active"],
            ["Vikram Nair", "Climate Analysis L2", "Climate Analysis Fundamentals", "Feb 2026", "Feb 2028", "Active"],
            ["Rohit Kumar", "NWP Foundations", "Advanced NWP Modelling", "Jan 2026", "Jan 2027", "Active"],
            ["Priya Singh", "Weather Forecasting L2", "Weather Forecasting Operations", "Dec 2025", "Dec 2026", "Active"],
          ]}
          onView={() => {}}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   USERS & ROLES
═══════════════════════════════════════════════════════════ */
function UsersRolesPage() {
  return (
    <Shell
      eyebrow="PEOPLE"
      title="Users & Roles"
      desc="Manage all platform users, their organizational roles and access levels."
      action={<button className="button button-primary"><Plus size={14} /> Invite User</button>}
    >
      <KpiRow items={[
        [Users, "248", "Total Users", "Platform-wide", "#3b82f6"],
        [UserRound, "186", "Trainees", "", "#10b981"],
        [UserCheck, "24", "Trainers", "", "#8b5cf6"],
        [ShieldCheck, "8", "Admins", "", "#f59e0b"],
      ]} />
      <div className="admin-panel">
        <SearchFilter
          placeholder="Search users..."
          extraFilters={[
            { label: "Role", options: ["Trainee", "Trainer", "Admin"] },
            { label: "Status", options: ["Active", "Pending", "Suspended"] },
            { label: "Department", options: ["Forecasting Division", "R&D", "Regional Centres", "Observatories"] },
          ]}
        />
        <DataTable
          columns={["Name", "Email", "Platform Role", "Job Role", "Department", "Status"]}
          rows={[
            ["Asha Sharma", "asha.sharma@imd.gov.in", "Trainee", "Forecasting Officer", "Forecasting Division", "Active"],
            ["Dr. R. Krishnamurthy", "r.krishna@imd.gov.in", "Trainer", "Senior Scientist", "Forecasting Division", "Active"],
            ["Prof. S. Mehta", "s.mehta@imd.gov.in", "Trainer", "Scientist C", "Climate Research", "Active"],
            ["Vikram Nair", "vikram.n@imd.gov.in", "Trainee", "Scientific Assistant", "Regional Centre Delhi", "Active"],
            ["Rohit Kumar", "rohit.k@imd.gov.in", "Trainee", "Scientist B", "Climate Research", "Active"],
          ]}
          onView={() => {}}
          viewLabel="Manage"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE CONTINUITY
═══════════════════════════════════════════════════════════ */
function KnowledgeBasePage() {
  return (
    <Shell
      eyebrow="KNOWLEDGE CONTINUITY"
      title="Knowledge Base"
      desc="Manage organizational knowledge assets, succession planning and capability risk assessment."
    >
      <KpiRow items={[
        [FileText, "124", "Knowledge Articles", "", "#3b82f6"],
        [UserCheck, "18", "Subject Matter Experts", "", "#10b981"],
        [AlertTriangle, "6", "At Risk Roles", "Succession needed", "#ef4444"],
        [Target, "82%", "Knowledge Coverage", "", "#8b5cf6"],
      ]} />
      <div className="admin-panel">
        <DataTable
          columns={["Topic", "Category", "Expert Owner", "Last Reviewed", "Risk Level"]}
          rows={[
            ["Advanced Radar Analysis Techniques", "Core Meteorological", "Dr. R. Krishnamurthy", "Aug 2026", "Low"],
            ["NWP Model Configuration", "Technical", "Prof. S. Mehta", "Jul 2026", "High"],
            ["Cyclone Track Prediction Methods", "Core Meteorological", "Dr. K. Reddy", "Jun 2026", "Medium"],
            ["Satellite Data Processing", "Technical", "Mr. A. Bose", "Jun 2026", "At Risk"],
          ]}
          onView={() => {}}
          viewLabel="View"
        />
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANNOUNCEMENTS
═══════════════════════════════════════════════════════════ */
function AnnouncementsPanel() {
  return (
    <Shell
      eyebrow="COMMUNICATION"
      title="Announcements"
      desc="Publish announcements to trainees, trainers and administrators. Publishing is content distribution and does not change workflow state."
      action={<button className="button button-primary"><Plus size={14} /> New Announcement</button>}
    >
      <div className="admin-info-callout">
        <Info size={16} color="#3b82f6" />
        Announcements are published content, not transactional notices. Publishing fans out notifications but never changes workflow state.
      </div>
      <div className="admin-panel">
        <SearchFilter placeholder="Search announcements..." extraFilters={[{ label: "Audience", options: ["All", "Trainees", "Trainers", "Admins"] }]} />
        <div className="admin-announcements-list">
          {[
            { title: "New Radar Training Programme Available", date: "Sep 20, 2026", audience: "Trainees", status: "Published", urgent: true },
            { title: "Trainer Verification Renewal Reminder", date: "Sep 15, 2026", audience: "Trainers", status: "Published", urgent: false },
            { title: "Platform Maintenance — Sep 28, 02:00–04:00 IST", date: "Sep 10, 2026", audience: "All", status: "Published", urgent: true },
            { title: "TTT Programme Nominations Open", date: "Sep 5, 2026", audience: "Trainers", status: "Draft", urgent: false },
          ].map((ann) => (
            <div key={ann.title} className={`admin-announcement-card ${ann.urgent ? "admin-announcement-urgent" : ""}`}>
              <div className="admin-ann-body">
                {ann.urgent && <span className="admin-ann-urgent-tag"><Zap size={11} /> Urgent</span>}
                <h4>{ann.title}</h4>
                <div className="admin-ann-meta">
                  <span><Calendar size={12} /> {ann.date}</span>
                  <span><Users size={12} /> {ann.audience}</span>
                  <span className={`admin-badge admin-badge-${ann.status === "Published" ? "approved" : "pending"}`}>{ann.status}</span>
                </div>
              </div>
              <div className="admin-ann-actions">
                <button className="admin-action-btn admin-action-view"><Eye size={12} /> View</button>
                <button className="admin-action-btn admin-action-edit"><Edit size={12} /> Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════════════════ */
export default function AdminExperiencePage({ view }) {
  const k = view || useLocation().pathname.split("/").at(-1);

  if (!k || k === "dashboard") return null; // handled by AdminDashboard
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
  if (k === "trainer-discovery") return <TrainerPoolPage />;
  if (k === "announcements") return <AnnouncementsPanel />;
  if (k === "audit-logs" || k === "training-reports" || k === "competency-reports") return <ReportsPage />;
  if (k === "feedback" || k === "feedback-trends" || k === "improvement-actions") return <FeedbackOverviewPage />;
  if (k === "knowledge-base" || k === "succession-planning" || k === "risk-assessment") return <KnowledgeBasePage />;

  // Fallback
  return (
    <Shell title={k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} desc="This section is under development." eyebrow="SAMARTHYA">
      <div className="admin-panel" style={{ textAlign: "center", padding: "3rem" }}>
        <Activity size={40} color="#94a3b8" />
        <p style={{ color: "#64748b", marginTop: "1rem" }}>This page is part of the implementation roadmap.</p>
      </div>
    </Shell>
  );
}
