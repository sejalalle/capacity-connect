import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, BarChart3, BookOpen, UserCheck, AlertTriangle,
  TrendingUp, TrendingDown, ArrowRight, Bell, CheckCircle2,
  Clock, Activity, Shield, ChevronRight, AlertCircle,
} from "lucide-react";

const HEATMAP_COMPETENCIES = [
  "Radar Interp.",
  "Climate Analysis",
  "NWP",
  "Forecasting",
  "Instrumentation",
  "Hydromet.",
];
const HEATMAP_DEPTS = [
  { name: "Forecasting Div.", values: [82, 65, 78, 90, 45, 60] },
  { name: "R&D", values: [70, 88, 72, 65, 55, 75] },
  { name: "Regional Centres", values: [60, 55, 68, 72, 80, 50] },
  { name: "Observatories", values: [45, 40, 55, 48, 90, 62] },
  { name: "Administration", values: [30, 25, 35, 42, 38, 30] },
];

function heatColor(pct) {
  if (pct >= 80) return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  if (pct >= 60) return { bg: "#fef9c3", text: "#a16207", border: "#fde047" };
  if (pct >= 40) return { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" };
  return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
}

const TREND_DATA = [
  { month: "Mar", enrollments: 42, completions: 28 },
  { month: "Apr", enrollments: 55, completions: 38 },
  { month: "May", enrollments: 48, completions: 35 },
  { month: "Jun", enrollments: 67, completions: 50 },
  { month: "Jul", enrollments: 72, completions: 55 },
  { month: "Aug", enrollments: 85, completions: 68 },
  { month: "Sep", enrollments: 78, completions: 62 },
];

const maxVal = Math.max(...TREND_DATA.flatMap((d) => [d.enrollments, d.completions]));

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("heatmap");

  return (
    <div className="admin-dashboard">
      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <div className="admin-dash-banner">
        <div className="admin-dash-banner-left">
          <span className="admin-dash-eyebrow">SAMARTHYA · SYSTEM ADMINISTRATION</span>
          <h1 className="admin-dash-title">Welcome back, Admin</h1>
          <p className="admin-dash-subtitle">
            Organizational view of workforce capability, training activity, and trainer capacity across IMD.
          </p>
          <div className="admin-dash-meta">
            <span><Clock size={13} /> Last updated: Today, 09:30 AM</span>
            <span><Shield size={13} /> National Meteorological Institute</span>
          </div>
        </div>
        <div className="admin-dash-banner-graphic">
          {/* SVG radar graphic */}
          <svg viewBox="0 0 200 200" width="160" height="160">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="15" fill="rgba(255,255,255,0.2)"/>
            <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <path d="M100 100 L100 10 A90 90 0 0 1 190 100 Z" fill="rgba(255,255,255,0.15)"/>
            <circle cx="135" cy="55" r="6" fill="#4ade80"/>
            <circle cx="155" cy="120" r="4" fill="#60a5fa"/>
            <circle cx="80" cy="45" r="5" fill="#facc15"/>
          </svg>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="admin-kpi-grid">
        {[
          {
            icon: Users, value: "248", label: "Total Users",
            sub: "+12 this month", trend: "up",
            color: "#3b82f6", bg: "#eff6ff", link: "/admin/users",
          },
          {
            icon: BarChart3, value: "76%", label: "Overall Capability Coverage",
            sub: "+3% from last quarter", trend: "up",
            color: "#10b981", bg: "#ecfdf5", link: "/admin/organizational-capability",
          },
          {
            icon: BookOpen, value: "18", label: "Training Activity",
            sub: "Active courses running", trend: "neutral",
            color: "#8b5cf6", bg: "#f5f3ff", link: "/admin/courses",
          },
          {
            icon: UserCheck, value: "24", label: "Trainer Capacity",
            sub: "6 TTT in-progress", trend: "up",
            color: "#f59e0b", bg: "#fffbeb", link: "/admin/trainer-discovery",
          },
        ].map(({ icon: Icon, value, label, sub, trend, color, bg, link }) => (
          <Link key={label} to={link} className="admin-kpi-card" style={{ "--kpi-accent": color, "--kpi-bg": bg }}>
            <div className="admin-kpi-icon-wrap">
              <Icon size={22} color={color} />
            </div>
            <div className="admin-kpi-body">
              <span className="admin-kpi-value">{value}</span>
              <span className="admin-kpi-label">{label}</span>
              <span className="admin-kpi-sub">
                {trend === "up" ? <TrendingUp size={11} color="#10b981" /> : trend === "down" ? <TrendingDown size={11} color="#ef4444" /> : null}
                {sub}
              </span>
            </div>
            <ChevronRight size={16} className="admin-kpi-arrow" />
          </Link>
        ))}
      </div>

      {/* ── Pending Approvals Alert ───────────────────────────────── */}
      <Link to="/admin/users" className="admin-pending-alert">
        <AlertTriangle size={18} color="#d97706" />
        <span>
          <strong>7 pending user approvals</strong> — Review and approve new registration requests.
        </span>
        <span className="admin-pending-badge">7 Pending</span>
        <ArrowRight size={16} />
      </Link>

      {/* ── Main Content Grid ─────────────────────────────────────── */}
      <div className="admin-dash-grid">
        {/* Left: Heatmap + Chart */}
        <div className="admin-dash-main">
          {/* Tab switcher */}
          <div className="admin-dash-tabs">
            {[
              { id: "heatmap", label: "Competency Coverage Heatmap" },
              { id: "trend", label: "Training Participation Trend" },
            ].map((t) => (
              <button
                key={t.id}
                className={`admin-dash-tab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "heatmap" ? (
            <div className="admin-heatmap-wrap">
              <div className="admin-heatmap-legend">
                {[
                  { label: "≥ 80%", ...heatColor(85) },
                  { label: "60–79%", ...heatColor(65) },
                  { label: "40–59%", ...heatColor(50) },
                  { label: "< 40%", ...heatColor(30) },
                ].map((l) => (
                  <span key={l.label} className="admin-heatmap-legend-item" style={{ background: l.bg, color: l.text, border: `1px solid ${l.border}` }}>
                    {l.label}
                  </span>
                ))}
              </div>
              <div className="admin-heatmap-table">
                <div className="admin-heatmap-header">
                  <div className="admin-heatmap-dept-col" />
                  {HEATMAP_COMPETENCIES.map((c) => (
                    <div key={c} className="admin-heatmap-comp-header">{c}</div>
                  ))}
                </div>
                {HEATMAP_DEPTS.map((dept) => (
                  <div key={dept.name} className="admin-heatmap-row">
                    <div className="admin-heatmap-dept-col">{dept.name}</div>
                    {dept.values.map((v, i) => {
                      const colors = heatColor(v);
                      return (
                        <div
                          key={i}
                          className="admin-heatmap-cell"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {v}%
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="admin-heatmap-filter">
                <select>
                  <option>All Departments</option>
                  {HEATMAP_DEPTS.map((d) => <option key={d.name}>{d.name}</option>)}
                </select>
                <select>
                  <option>All Competencies</option>
                  {HEATMAP_COMPETENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="admin-trend-wrap">
              {/* Bar chart */}
              <div className="admin-trend-legend">
                <span className="trend-enroll">■ Enrollments</span>
                <span className="trend-complete">■ Completions</span>
              </div>
              <div className="admin-trend-chart">
                {TREND_DATA.map((d) => (
                  <div key={d.month} className="trend-col">
                    <div className="trend-bars">
                      <div
                        className="trend-bar enroll"
                        style={{ height: `${(d.enrollments / maxVal) * 160}px` }}
                        title={`Enrollments: ${d.enrollments}`}
                      />
                      <div
                        className="trend-bar complete"
                        style={{ height: `${(d.completions / maxVal) * 160}px` }}
                        title={`Completions: ${d.completions}`}
                      />
                    </div>
                    <span className="trend-month">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Needs Attention + Quick Actions */}
        <div className="admin-dash-side">
          {/* Needs Attention */}
          <div className="admin-side-panel">
            <h3 className="admin-side-title">
              <AlertCircle size={16} color="#ef4444" /> Needs Attention
            </h3>
            <ul className="admin-attention-list">
              {[
                { text: "8 employees below Radar Interpretation L3 target", type: "critical" },
                { text: "4 trainer verifications expiring in 30 days", type: "warning" },
                { text: "3 TTT candidates awaiting coordinator review", type: "warning" },
                { text: "Forecasting Div. NWP coverage at 45%", type: "critical" },
                { text: "12 pending evidence reviews older than 7 days", type: "info" },
              ].map(({ text, type }, i) => (
                <li key={i} className={`admin-attention-item admin-attention-${type}`}>
                  <span className="attention-dot" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="admin-side-panel">
            <h3 className="admin-side-title">
              <Activity size={16} color="#8b5cf6" /> Quick Actions
            </h3>
            <div className="admin-quick-actions">
              {[
                { label: "Review Pending Users", link: "/admin/users", color: "#3b82f6" },
                { label: "View Capability Map", link: "/admin/organizational-capability", color: "#10b981" },
                { label: "Training Demand Report", link: "/admin/training-demand", color: "#f59e0b" },
                { label: "Trainer Pool", link: "/admin/trainer-discovery", color: "#8b5cf6" },
                { label: "Manage Announcements", link: "/admin/announcements", color: "#ec4899" },
              ].map(({ label, link, color }) => (
                <Link key={label} to={link} className="admin-quick-action-btn" style={{ "--qa-color": color }}>
                  <ChevronRight size={14} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="admin-side-panel">
            <h3 className="admin-side-title">
              <CheckCircle2 size={16} color="#10b981" /> Platform Summary
            </h3>
            <div className="admin-platform-stats">
              {[
                { label: "Verified trainers", value: "24", sub: "6 TTT pipeline" },
                { label: "Active courses", value: "18", sub: "3 ending soon" },
                { label: "Competencies mapped", value: "12", sub: "6 core, 3 tech, 3 support" },
                { label: "Certificates issued", value: "836", sub: "This year" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="admin-pstat">
                  <span className="admin-pstat-value">{value}</span>
                  <span className="admin-pstat-label">{label}</span>
                  <span className="admin-pstat-sub">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
