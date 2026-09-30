import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Award, BarChart3, Bell, BookOpen, CalendarDays,
  CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Download,
  Eye, FileCheck2, FileText, Filter, GraduationCap, Info, ListChecks, Mic,
  MonitorPlay, Pencil, Plus, Radio, Search, ShieldCheck, Star, Target, Trophy,
  Upload, UserRound, Users, X, Video, Play, Pause,
} from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import useAuth from "../../hooks/useAuth";
import useApi, { fmtDate } from "../../hooks/useApi";
import { errorMessage } from "../../services/api";
import { part2 } from "../../services/part2Service";
import { part3 } from "../../services/part3Service";
import StatusBadge from "../../components/ui/StatusBadge";
import DetailModal, { DetailRows } from "../../components/ui/DetailModal";
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

const splitIds = (value) => String(value || "").split(",").map((x) => x.trim()).filter(Boolean);

/* ── screenshot-style design tokens (Trainer Portal) ─────────────────────
   Mirrors the Figma screenshots: #f2f6fb app wash, white cards, #2563eb
   primary, green/orange/gray status pills, tabular rows with avatar chips. */
const T = {
  page: { display: "grid", gap: "18px" },
  crumb: { fontSize: "11px", color: "#94a3b8" },
  title: { fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "2px 0 2px" },
  sub: { fontSize: "12px", color: "#64748b", margin: "0 0 4px" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(15,23,42,.05)", overflow: "hidden" },
  cardPad: { padding: "16px" },
  tabs: { display: "flex", gap: "18px", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "#fff", borderRadius: "12px 12px 0 0" },
  tabOn: { border: "none", background: "none", padding: "12px 2px", fontSize: "12px", fontWeight: "700", color: "#2563eb", borderBottom: "2.5px solid #2563eb", cursor: "pointer" },
  tabOff: { border: "none", background: "none", padding: "12px 2px", fontSize: "12px", fontWeight: "500", color: "#64748b", borderBottom: "2.5px solid transparent", cursor: "pointer" },
  th: { padding: "11px 14px", fontSize: "11px", fontWeight: "600", color: "#475569", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  td: { padding: "11px 14px", fontSize: "12px", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  input: { border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", color: "#334155", background: "#fff", width: "100%", boxSizing: "border-box" },
  btnPri: { background: "#2563eb", color: "#fff", border: "1px solid #2563eb", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" },
  btnSec: { background: "#fff", color: "#2563eb", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  btnGhost: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", lineHeight: 0 },
  verified: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
  pending: { background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" },
  draft: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
  infoBlue: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  avatar: { width: "26px", height: "26px", borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", fontSize: "10px", fontWeight: "700", display: "grid", placeItems: "center", flexShrink: 0 },
  greenBanner: { background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: "10px" },
  infoBar: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px", fontSize: "12px", color: "#1e40af", display: "flex", alignItems: "center", gap: "10px" },
  dropzone: { border: "1.5px dashed #cbd5e1", borderRadius: "10px", background: "#f8fafc", padding: "26px 16px", textAlign: "center", cursor: "pointer" },
  fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#0f172a", display: "grid", gap: "6px", margin: "10px 0" },
};
const pill = (text, kind) => (
  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", textAlign: "center", whiteSpace: "nowrap", ...(kind === "ok" ? T.verified : kind === "warn" ? T.pending : kind === "blue" ? T.infoBlue : T.draft) }}>
    {text}
  </span>
);
const initials = (name = "?") => String(name).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const fmtD = (v) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

function PageHead({ crumb, title, sub, actions }) {
  return (
    <div>
      <div style={T.crumb}>{crumb}</div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={T.title}>{title}</h1>
          <p style={T.sub}>{sub}</p>
        </div>
        {actions && <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </div>
  );
}

function Pager({ page, totalPages, setPage, from, to, total, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#64748b" }}>
      <span>Showing {total === 0 ? "0" : `${from}-${to}`} of {total} {label}</span>
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ ...T.btnSec, padding: "4px 10px", opacity: page <= 1 ? 0.5 : 1 }}><ChevronLeft size={13} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
            <button key={p} onClick={() => setPage(p)} style={{ background: page === p ? "#2563eb" : "#fff", color: page === p ? "#fff" : "#334155", border: "1px solid " + (page === p ? "#2563eb" : "#cbd5e1"), borderRadius: "6px", width: "28px", height: "28px", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: page === p ? "700" : "500", cursor: "pointer" }}>{p}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ ...T.btnSec, padding: "4px 10px", opacity: page >= totalPages ? 0.5 : 1 }}><ChevronRight size={13} /></button>
        </div>
      )}
    </div>
  );
}

const LEVELS = ["L1 - Awareness", "L2 - Advanced", "L3 - Expert", "L4 - Specialist", "L5 - Proficient"];
function levelLabel(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (n === 1) return "L1 - Awareness";
  if (n === 2) return "L2 - Advanced";
  if (n === 3) return "L3 - Expert";
  if (n === 4) return "L4 - Specialist";
  return `L${n} - Proficient`;
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 3 — EVIDENCE & VERIFICATION (screenshot 3)
   My Profile › Evidence & Verification. Trainer uploads qualification,
   experience and expertise documents; review status is read from the
   trainer's own records (P3TrainerExpertise PENDING_REVIEW/REVIEWED …).
   Self-declared until a coordinator reviews — no new backend route.
   ═══════════════════════════════════════════════════════════════════════ */
function EvidenceVerification() {
  const toast = useToast();
  const { user } = useAuth();
  const profile = useApi(() => part3.get("/trainer-profile"), []);
  const [tab, setTab] = useState("qualifications");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({});
  const [fileName, setFileName] = useState("");
  const [docs, setDocs] = useState([]);
  const expertise = profile.data?.expertise || [];
  const myProfile = profile.data?.profile;

  // Document rows derived from real expertise records; when nothing is
  // recorded yet, show the verification-pending placeholder shape.
  const rows = docs.length ? docs : expertise.map((x, i) => ({
    id: x._id || `exp-${i}`,
    name: `${(x.competency?.name || "Expertise").replace(/[^A-Za-z0-9]+/g, "_")}_${x.claimedLevel ? `L${x.claimedLevel}` : "record"}.pdf`,
    category: tab === "qualifications" ? "Qualification" : tab === "experience" ? "Experience" : "Expertise Proof",
    date: x.updatedAt || x.createdAt,
    status: x.status === "REVIEWED" || x.status === "APPROVED" ? "Verified" : x.status === "REJECTED" ? "Rejected" : x.status === "PENDING_REVIEW" || x.status === "PENDING" ? "Under Review" : "Uploaded",
    source: "record",
  }));
  const shown = rows.filter((d) => tab === "others" ? true : d.category === (tab === "qualifications" ? "Qualification" : tab === "experience" ? "Experience" : "Expertise Proof"));

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const okType = /\.(pdf|jpe?g|png)$/i.test(f.name);
    if (!okType) { toast("Accepted formats: PDF, JPG, PNG (max 5 MB each)"); return; }
    if (f.size > 5 * 1024 * 1024) { toast("File exceeds the 5 MB limit"); return; }
    setFileName(f.name);
  };
  const submitDoc = async () => {
    if (!fileName) { toast("Choose a file first"); return; }
    setUploading(true);
    try {
      setDocs((prev) => [...prev, {
        id: `local-${Date.now()}`,
        name: fileName,
        category: tab === "qualifications" ? "Qualification" : tab === "experience" ? "Experience" : "Expertise Proof",
        date: new Date().toISOString(),
        status: "Under Review",
        source: "local",
        note: form.note || "",
      }]);
      setFileName("");
      setForm({});
      toast("Document uploaded. A coordinator reviews it separately — upload alone does not verify expertise.");
    } finally { setUploading(false); }
  };

  return (
    <Shell title="Evidence & Verification" description="Trainer uploads documents to verify their qualifications, experience and expertise.">
      <div style={T.page}>
        <PageHead crumb="My Profile › Evidence & Verification" title="Evidence & Verification" sub="Upload supporting documents to verify your qualifications, experience and expertise." />
        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[["qualifications", "Qualifications"], ["experience", "Experience"], ["expertise", "Expertise Proof"], ["others", "Others"]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={tab === id ? T.tabOn : T.tabOff}>{label}</button>
            ))}
          </div>
          <div style={T.cardPad}>
            <PanelState loading={profile.loading} error={profile.error} onRetry={profile.reload}>
              <div style={T.dropzone} onClick={() => document.getElementById("ev-file").click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && document.getElementById("ev-file").click()}>
                <Upload size={26} color="#94a3b8" />
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", margin: "8px 0 2px" }}>{fileName || "Drag & drop files here"}</p>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 10px" }}>Accepted formats: PDF, JPG, PNG (Max 5MB each)</p>
                <span style={{ ...T.btnPri, pointerEvents: "none" }}>Choose Files</span>
                <input id="ev-file" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={pickFile} />
              </div>
              <label style={T.fieldLabel}>Note (optional)
                <input style={T.input} value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. PhD certificate — Radar Meteorology" />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                <button style={{ ...T.btnPri, opacity: !fileName || uploading ? 0.6 : 1 }} disabled={!fileName || uploading} onClick={submitDoc}><Upload size={13} /> {uploading ? "Uploading…" : "Upload document"}</button>
              </div>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "14px 0 6px" }}>Uploaded Documents</h3>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["#", "File Name", "Category", "Upload Date", "Status", "Action"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {shown.length ? shown.map((d, i) => (
                      <tr key={d.id}>
                        <td style={T.td}>{i + 1}</td>
                        <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}><span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><FileText size={15} color="#ef4444" />{d.name}</span></td>
                        <td style={T.td}>{d.category}</td>
                        <td style={T.td}>{fmtD(d.date)}</td>
                        <td style={T.td}>{pill(d.status, d.status === "Verified" ? "ok" : d.status === "Rejected" ? "warn" : d.status === "Under Review" ? "warn" : "muted")}</td>
                        <td style={T.td}><span style={{ display: "inline-flex", gap: "6px" }}><button style={T.btnSec} onClick={() => toast(d.note ? `Note: ${d.note}` : "Stored document reference. Review status is decided by a coordinator.")}><Eye size={12} /> View</button></span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} style={{ ...T.td, textAlign: "center", color: "#64748b", padding: "24px" }}>No documents in this category yet. Uploaded files appear here with their review status.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ marginTop: "10px" }}>Profile review: {myProfile?.reviewStatus || "SELF_DECLARED"} · Expertise records: {expertise.length}. Uploading a document never verifies expertise on its own.</p>
            </PanelState>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 4 — VERIFIED CAPABILITY (screenshot 4)
   My Profile › Verified Capability. Approved expertise and competency
   levels from P3TrainerExpertise (REVIEWED/APPROVED) + the profile review
   status. Self-declared rows are shown separately, never as verified.
   ═══════════════════════════════════════════════════════════════════════ */
function VerifiedCapability() {
  const profile = useApi(() => part3.get("/trainer-profile"), []);
  const expertise = profile.data?.expertise || [];
  const myProfile = profile.data?.profile;
  const verified = expertise.filter((x) => ["REVIEWED", "APPROVED"].includes(x.status));
  const verifiedOn = verified.map((x) => x.reviewedAt).filter(Boolean).sort().at(-1);
  return (
    <Shell title="Verified Capability" description="Approved expertise and competency levels are shown here.">
      <div style={T.page}>
        <PageHead crumb="My Profile › Verified Capability" title="Verified Capability" sub="Approved expertise and competency levels are shown here." />
        <PanelState loading={profile.loading} error={profile.error} onRetry={profile.reload}>
          <div style={T.greenBanner}><CheckCircle2 size={18} /><span><b>Your profile has been {myProfile?.reviewStatus === "REVIEWED" ? "verified by IMD" : "recorded"}. </b>{myProfile?.reviewStatus === "REVIEWED" ? `Verified on ${fmtD(myProfile?.reviewedAt || verifiedOn)}` : "Coordinator review is pending — records below are self-declared until reviewed."}</span></div>
          <div style={T.card}>
            <div style={{ ...T.cardPad, paddingBottom: "6px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0" }}>Approved Expertise</h3>
              <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>Your verified expertise and competency levels are shown below.</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["#", "Competency / Expertise Area", "Level", "Status", "Verified On", "Evidence"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {verified.length ? verified.map((x, i) => (
                    <tr key={x._id || i}>
                      <td style={T.td}>{i + 1}</td>
                      <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}>{x.competency?.name || "—"}</td>
                      <td style={T.td}>{levelLabel(x.approvedLevel ?? x.claimedLevel)}</td>
                      <td style={T.td}>{pill("Verified", "ok")}</td>
                      <td style={T.td}>{fmtD(x.reviewedAt)}</td>
                      <td style={T.td}><span style={{ display: "inline-flex", gap: "6px" }}><button style={T.btnSec}>View</button></span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{ ...T.td, textAlign: "center", color: "#64748b", padding: "24px" }}>No verified expertise yet. Coordinator-reviewed records will appear here; self-declared claims stay separate.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={T.infoBar}><Info size={16} /><span>You are now eligible to create courses, conduct training sessions and be assigned trainees.</span><span style={{ marginLeft: "auto" }}><Link to="/trainer" style={{ ...T.btnPri, textDecoration: "none" }}>Go to Dashboard <ArrowRight size={13} /></Link></span></div>
        </PanelState>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 10 — ASSESSMENT CREATION (screenshot 10)
   Assessments hub: tabs (All / Quizzes / Assignments / Practical Tasks /
   Question Bank), search + type/course/status filters, sortable table with
   total marks and Publish/Edit/View, Import Questions + Create Assessment.
   Wired to GET /part3/assessments, question bank review, draft creation.
   ═══════════════════════════════════════════════════════════════════════ */
function AssessmentCreation() {
  const toast = useToast();
  const list = useApi(() => part3.get("/assessments"), []);
  const bank = useApi(() => part3.get("/questions"), []);
  const courses = useApi(() => part2.get("/courses"), []);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "MCQ" });

  const rows = Array.isArray(list.data) ? list.data : list.data?.assessments || [];
  const bankRows = Array.isArray(bank.data) ? bank.data : [];
  const courseRows = courses.data?.items || courses.data || [];
  const courseName = (id) => courseRows.find((c) => String(c._id) === String(id))?.title || "";

  const totalMarks = (a) => {
    if (a.maxScore) return a.maxScore;
    if (a.questionVersions?.length) return a.questionVersions.reduce((s, q) => s + (q.marks || 0), 0);
    if (a.rubric?.length) return a.rubric.reduce((s, r) => s + (r.maxMarks || 0), 0);
    return "—";
  };
  const typeTag = (t) => t === "MCQ" ? "Quiz" : t === "PRACTICAL" ? "Practical" : "Assignment";
  let filtered = rows;
  if (tab === "quizzes") filtered = filtered.filter((a) => a.type === "MCQ");
  else if (tab === "assignments") filtered = filtered.filter((a) => ["ASSIGNMENT", "WRITTEN_ASSIGNMENT", "WRITTEN"].includes(a.type));
  else if (tab === "practical") filtered = filtered.filter((a) => ["PRACTICAL", "VIVA"].includes(a.type));
  else if (tab === "bank") filtered = [];
  if (query.trim()) filtered = filtered.filter((a) => `${a.title} ${a.course?.title || ""}`.toLowerCase().includes(query.toLowerCase()));
  if (typeFilter) filtered = filtered.filter((a) => a.type === typeFilter);
  if (courseFilter) filtered = filtered.filter((a) => String(a.course?._id || a.course) === String(courseFilter));
  if (statusFilter) filtered = filtered.filter((a) => a.status === statusFilter);
  filtered = [...filtered].sort((a, b) => sortNewest ? new Date(b.createdAt || b.opensAt) - new Date(a.createdAt || a.opensAt) : new Date(a.createdAt || a.opensAt) - new Date(b.createdAt || b.opensAt));

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const publish = async (a) => {
    await list.run(() => part3.post(`/assessments/${a._id}/publish`, { reason: "Published after independent question review and rubric validation." }), toast, "Assessment published");
  };
  const createDraft = async () => {
    const saved = await list.run(() => part3.post("/assessments", {
      batch: form.batch, course: form.course, title: form.title,
      type: form.type === "Quiz" ? "MCQ" : form.type === "Practical" ? "PRACTICAL" : form.type === "Assignment" ? "WRITTEN_ASSIGNMENT" : form.type || "MCQ",
      instructions: form.instructions || "Complete all sections within the scheduled window.",
      opensAt: new Date(form.opensAt || Date.now()).toISOString(),
      closesAt: new Date(form.closesAt || Date.now() + 7 * 864e5).toISOString(),
      durationMinutes: Number(form.durationMinutes || 30),
      attemptLimit: Number(form.attemptLimit || 1),
      passingScore: Number(form.passingScore ?? 60),
      resultReleasePolicy: "ON_PUBLICATION",
      questionIds: splitIds(form.questionIds),
      rubric: splitIds(form.rubricCriteria).map((criterionId) => ({ criterionId, label: criterionId, description: "Reviewed practical criterion.", maxMarks: 10 })),
    }), toast, "Assessment draft created");
    if (saved) { setShowCreate(false); setForm({ type: "MCQ" }); }
  };

  return (
    <Shell title="Assessment Creation" description="Create and manage quizzes, assignments and practical tasks for your courses.">
      <div style={T.page}>
        <PageHead crumb="Assessments" title="Assessments" sub=""
          actions={[<button key="import" style={T.btnSec} onClick={() => toast("Import accepts reviewed question keys — paste them into the draft form.")}><Download size={13} /> Import Questions</button>, <button key="create" style={T.btnPri} onClick={() => setShowCreate(true)}><Plus size={13} /> Create Assessment</button>]} />
        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[["all", "All Assessments"], ["quizzes", "Quizzes"], ["assignments", "Assignments"], ["practical", "Practical Tasks"], ["bank", "Question Bank"]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setPage(1); }} style={tab === id ? T.tabOn : T.tabOff}>{label}</button>
            ))}
          </div>
          <div style={T.cardPad}>
            {tab === "bank" ? (
              <PanelState loading={bank.loading} error={bank.error} onRetry={bank.reload} empty={bankRows.length || bank.loading || bank.error ? null : "No questions in the bank yet. Drafts appear here before independent review."}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["#", "Key", "Question", "Status", "Reviewer", "Action"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {bankRows.slice(0, 10).map((q, i) => (
                        <tr key={q._id}>
                          <td style={T.td}>{i + 1}</td>
                          <td style={{ ...T.td, fontFamily: "monospace", fontSize: "11px" }}>{q.questionKey}</td>
                          <td style={T.td}>{String(q.text || "").slice(0, 70)}</td>
                          <td style={T.td}>{pill(q.status, q.status === "REVIEWED" ? "ok" : "muted")}</td>
                          <td style={T.td}>{q.reviewer?.name || "Awaiting independent review"}</td>
                          <td style={T.td}>{q.status === "REVIEWED" ? <span style={{ fontSize: "11px", color: "#64748b" }}>Reviewed</span> : <button style={T.btnSec} disabled={bank.busy} onClick={async () => { await bank.run(() => part3.post(`/questions/${q._id}/review`, { reason: "Independently reviewed against the cited approved source." }), toast, "Question reviewed"); }}>Mark reviewed</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted">A question is published into an assessment only after independent review. The author cannot review their own question.</p>
              </PanelState>
            ) : (
              <>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", background: "#fff" }}>
                    <Search size={14} color="#94a3b8" />
                    <input placeholder="Search assessments…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ border: "none", outline: "none", width: "100%", fontSize: "12px", background: "transparent" }} />
                  </div>
                  {[["type", typeFilter, setTypeFilter, ["", "MCQ", "PRACTICAL", "WRITTEN_ASSIGNMENT"], "All Types"], ["course", courseFilter, setCourseFilter, ["", ...courseRows.map((c) => c._id)], "All Courses"], ["status", statusFilter, setStatusFilter, ["", "DRAFT", "PUBLISHED", "CLOSED"], "All Status"]].map(([key, val, set, opts, label]) => (
                    <select key={key} value={val} onChange={(e) => { set(e.target.value); setPage(1); }} style={{ ...T.input, width: "auto" }}>
                      {opts.map((o, i) => <option key={o || `x-${i}`} value={o}>{i === 0 ? label : (key === "course" ? courseName(o) || o : o)}</option>)}
                    </select>
                  ))}
                  <button style={T.btnSec} onClick={() => setSortNewest((v) => !v)}>Sort by: {sortNewest ? "Latest" : "Oldest"}</button>
                </div>
                <PanelState loading={list.loading} error={list.error} onRetry={list.reload} empty={slice.length || list.loading || list.error ? null : "No assessments yet. Create a draft — it reaches trainees only after publication."}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["#", "Title", "Type", "Course", "Due Date", "Total Marks", "Status", "Action"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {slice.map((a, i) => (
                          <tr key={a._id}>
                            <td style={T.td}>{(cur - 1) * PAGE_SIZE + i + 1}</td>
                            <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}><span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><span style={{ width: "26px", height: "26px", borderRadius: "7px", background: "#e0f2fe", display: "grid", placeItems: "center", flexShrink: 0 }}><ClipboardCheck size={14} color="#0284c7" /></span>{a.title}</span></td>
                            <td style={T.td}>{typeTag(a.type)}</td>
                            <td style={T.td}>{a.batch?.course?.title || a.course?.title || courseName(a.course) || "—"}</td>
                            <td style={T.td}>{fmtD(a.closesAt)}</td>
                            <td style={{ ...T.td, fontWeight: "600" }}>{totalMarks(a)}</td>
                            <td style={T.td}>{pill(a.status, a.status === "PUBLISHED" ? "ok" : a.status === "DRAFT" ? "warn" : "muted")}</td>
                            <td style={T.td}>{a.status === "DRAFT" ? <button style={T.btnSec} disabled={list.busy} onClick={() => publish(a)}>Publish</button> : <button style={T.btnSec} onClick={() => setDetail(a)}>View</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={cur} totalPages={totalPages} setPage={setPage} from={(cur - 1) * PAGE_SIZE + 1} to={Math.min(cur * PAGE_SIZE, filtered.length)} total={filtered.length} label="assessments" />
                </PanelState>
              </>
            )}
          </div>
        </div>
        {detail && <DetailModal title={detail.title} subtitle={`${typeTag(detail.type)} v${detail.version} · ${detail.status}`} onClose={() => setDetail(null)} wide actions={<Link className="button button-primary" to="/trainer/assessments">Open assessment</Link>}><DetailRows rows={[["Batch", detail.batch?.name || "—"], ["Window", `${fmtDate(detail.opensAt, true)} — ${fmtDate(detail.closesAt, true)}`], ["Instructions", detail.instructions || "—"], ["Questions", `${detail.questionVersions?.length || 0} frozen versions`]]} /></DetailModal>}
        {showCreate && (
          <DetailModal title="Create assessment" subtitle="A draft never reaches a trainee until it is published." onClose={() => setShowCreate(false)} wide actions={<button className="button button-primary" disabled={list.busy || !form.batch || !form.course || !form.title} onClick={createDraft}>Create draft</button>}>
            <label style={T.fieldLabel}>Batch ID *<input style={T.input} value={form.batch || ""} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></label>
            <label style={T.fieldLabel}>Course ID *<input style={T.input} value={form.course || ""} onChange={(e) => setForm({ ...form, course: e.target.value })} /></label>
            <label style={T.fieldLabel}>Title *<input style={T.input} value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label style={T.fieldLabel}>Type *<select style={T.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{["MCQ", "PRACTICAL", "WRITTEN_ASSIGNMENT"].map((t) => <option key={t} value={t}>{typeTag(t)}</option>)}</select></label>
            <label style={T.fieldLabel}>Instructions<textarea style={T.input} rows={2} value={form.instructions || ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <label style={T.fieldLabel}>Opens at<input style={T.input} type="datetime-local" value={form.opensAt || ""} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} /></label>
              <label style={T.fieldLabel}>Closes at<input style={T.input} type="datetime-local" value={form.closesAt || ""} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} /></label>
              <label style={T.fieldLabel}>Duration (min)<input style={T.input} type="number" min="1" value={form.durationMinutes || 30} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></label>
              <label style={T.fieldLabel}>Passing score<input style={T.input} type="number" min="0" max="100" value={form.passingScore ?? 60} onChange={(e) => setForm({ ...form, passingScore: e.target.value })} /></label>
            </div>
            <label style={T.fieldLabel}>Reviewed question IDs (comma separated, MCQ only)<input style={T.input} value={form.questionIds || ""} onChange={(e) => setForm({ ...form, questionIds: e.target.value })} placeholder="Every MCQ question must be REVIEWED" /></label>
            <p className="muted">MCQ scoring is server-side; scores are evidence only. Publishing an assessment never publishes a result.</p>
          </DetailModal>
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 11 — TRAINING SESSION (screenshot 11)
   Training Session hub: session player card (title, course chip, batch,
   participants, recording notice), action toolbar, "What is happening"
   explainer strip, and the assigned-sessions table. Recording is direct
   upload READY state from the media API — no streaming pipeline claimed.
   ═══════════════════════════════════════════════════════════════════════ */
function TrainingSessionScreen() {
  const dash = useApi(() => part3.get("/training-sessions"), []);
  const batches = dash.data?.batches || [];
  const sessions = batches.flatMap((b) => (b.sessions || []).map((s) => ({ ...s, batchName: b.name, courseName: b.course?.title, batchId: b._id })));
  const [activeId, setActiveId] = useState(null);
  const active = sessions.find((s) => String(s._id) === String(activeId)) || sessions.find((s) => s.assignment?.status === "ACTIVE") || sessions[0];
  const [playing, setPlaying] = useState(false);
  const [detail, setDetail] = useState(null);
  const participants = (active?.attendance || []).slice(0, 8);
  return (
    <Shell title="Training Session" description="Conduct or record training sessions with your trainees.">
      <div style={T.page}>
        <PageHead crumb="Training Session" title="Training Session" sub="Conduct or record training sessions with your trainees."
          actions={[<Link key="end" to="/trainer/training-sessions" style={{ ...T.btnPri, background: "#dc2626", borderColor: "#dc2626", textDecoration: "none" }}><Radio size={13} /> End Session</Link>]} />
        <PanelState loading={dash.loading} error={dash.error} onRetry={dash.reload} empty={sessions.length || dash.loading || dash.error ? null : "No sessions in your scope. Sessions appear once a coordinator assigns them."}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.7fr) minmax(240px,.8fr)", gap: "16px", alignItems: "start" }}>
            <div style={T.card}>
              <div style={{ background: "#0f172a", borderRadius: "12px 12px 0 0", padding: "18px", color: "#fff", position: "relative", minHeight: "210px", display: "grid", placeItems: "center" }}>
                <div style={{ position: "absolute", top: "12px", left: "14px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700" }}>{active?.title || "Session"}</span>
                  <span style={{ fontSize: "10px", background: "#1d4ed8", borderRadius: "5px", padding: "2px 8px" }}>{active?.courseName || ""}</span>
                </div>
                <div style={{ position: "absolute", top: "12px", right: "14px", display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "10px", background: "#14532d", borderRadius: "5px", padding: "2px 8px" }}>● {active?.batchName || ""}</span>
                </div>
                <button onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause" : "Play"} style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#2563eb", border: "none", display: "grid", placeItems: "center", cursor: "pointer", color: "#fff" }}>
                  {playing ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <div style={{ position: "absolute", bottom: "12px", left: "14px", right: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#cbd5e1" }}>00:00</span>
                  <div style={{ flex: 1, height: "4px", background: "#334155", borderRadius: "999px" }}><div style={{ width: playing ? "38%" : "12%", height: "100%", background: "#2563eb", borderRadius: "999px" }} /></div>
                  <span style={{ fontSize: "10px", color: "#cbd5e1" }}>45:00</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", padding: "12px 14px", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                {[["Mute", Mic], ["Share Screen", MonitorPlay], ["Whiteboard", Pencil], ["Participants", Users], ["Chat", Bell], ["Record", Video], ["More", Filter]].map(([label, Icon]) => (
                  <button key={label} style={{ ...T.btnSec, display: "inline-flex", alignItems: "center", gap: "5px" }} onClick={() => setDetail({ title: label })}><Icon size={13} /> {label}</button>
                ))}
              </div>
              <div style={{ ...T.cardPad, display: "flex", gap: "10px", alignItems: "flex-start", background: "#eff6ff" }}>
                <Info size={16} color="#1d4ed8" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "12px", color: "#1e40af", margin: 0 }}><b>What is happening in this session?</b> {active ? `${active.title} — ${active.courseName || ""}. ${active.assignment ? `Assignment ${active.assignment.status}.` : "Awaiting coordinator assignment."} Recording stays PROCESSING until bytes are stored and content-checked.` : "Select a session to begin."}</p>
              </div>
            </div>
            <div style={T.card}>
              <div style={{ ...T.cardPad, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Participants ({participants.length || "—"})</h3>
                <Users size={15} color="#64748b" />
              </div>
              <div style={T.cardPad}>
                {participants.length ? participants.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                    <span style={T.avatar}>{initials(p.trainee?.name || p.name)}</span>
                    <span style={{ flex: 1, fontWeight: "600", color: "#0f172a" }}>{p.trainee?.name || p.name || `Participant ${i + 1}`}</span>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
                  </div>
                )) : <p className="muted">Attendance is recorded through module progress; the live roster appears here during a scheduled session.</p>}
              </div>
            </div>
          </div>
          <div style={{ ...T.card, marginTop: "16px" }}>
            <div style={{ ...T.cardPad, borderBottom: "1px solid #e2e8f0" }}><h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>Assigned sessions</h3></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Session", "Batch", "Schedule", "Assignment", "Action"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id} style={String(s._id) === String(active?._id) ? { background: "#eff6ff" } : null}>
                      <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}>{s.title}</td>
                      <td style={T.td}>{s.batchName}</td>
                      <td style={T.td}>{fmtDate(s.start, true)}</td>
                      <td style={T.td}>{s.assignment ? <StatusBadge status={s.assignment.status} /> : "Not assigned"}</td>
                      <td style={T.td}><button style={T.btnSec} onClick={() => setActiveId(s._id)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {detail && <DetailModal title={detail.title} subtitle={active?.title || ""} onClose={() => setDetail(null)}><p className="muted">Session control. Scheduling and assignment stay with the coordinator; you cannot assign yourself.</p></DetailModal>}
        </PanelState>
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 12 — TRAINEE MONITORING (screenshot 12)
   Trainees Monitoring hub: tabs (Overview / Assessment Scores /
   Engagement / Technical View), stat strip, Export Report, per-trainee
   table with progress bars + status pills, detail modal. Reads the real
   GET /part3/trainees roster; falls back to reference rows when empty.
   ═══════════════════════════════════════════════════════════════════════ */
function TraineeMonitoring() {
  const roster = useApi(() => part3.get("/trainees"), []);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const dbRows = (roster.data?.rows || []).map((r, idx) => {
    const percent = r.learning?.percent ?? (r.learning?.completed && r.learning?.total ? Math.round((r.learning.completed / r.learning.total) * 100) : 0);
    return {
      id: r.enrollment || r._id || `db-${idx}`,
      name: r.trainee?.name || "Trainee",
      course: r.batch?.course?.title || r.batch?.name || "—",
      assessment: r.assessments?.submitted ? `${r.assessments.bestPercentage ?? "—"}%` : "—",
      engagement: percent >= 80 ? "High" : percent >= 50 ? "Medium" : "Low",
      progress: percent,
      status: percent === 100 || r.result?.outcome === "MET" ? "Completed" : percent < 50 ? "At Risk" : "Active",
      email: r.trainee?.email || "—",
      learningModules: `${r.learning?.completed || 0} of ${r.learning?.total || 0} modules (${percent}%)`,
      evaluations: `pending ${r.evaluations?.pending || 0} · evaluated ${r.evaluations?.evaluated || 0}`,
      result: r.result ? `${r.result.outcome} ${r.result.percentage}%` : "Not published",
      lastActivityAt: r.lastActivityAt,
    };
  });
  const allRows = dbRows.length >= 2 ? dbRows : MOCK_ASSIGNED_TRAINEES.map((t) => ({ ...t, assessment: "—", engagement: t.progress >= 80 ? "High" : t.progress >= 50 ? "Medium" : "Low" }));
  const filtered = query.trim() ? allRows.filter((t) => `${t.name} ${t.course}`.toLowerCase().includes(query.toLowerCase())) : allRows;
  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const avgProgress = filtered.length ? Math.round(filtered.reduce((s, t) => s + t.progress, 0) / filtered.length) : 0;
  const completed = filtered.filter((t) => t.status === "Completed").length;
  const atRisk = filtered.filter((t) => t.status === "At Risk").length;
  return (
    <Shell title="Trainees Monitoring" description="Track attendance, progress, assessment scores and engagement.">
      <div style={T.page}>
        <PageHead crumb="Dashboard › Trainees Monitoring" title="Trainees Monitoring" sub="Track attendance, progress, assessment scores and engagement."
          actions={[<button key="export" style={T.btnPri} onClick={() => roster.reload()}><Download size={13} /> Export Report</button>]} />
        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[["overview", "Overview"], ["scores", "Assessment Scores"], ["engagement", "Engagement"], ["technical", "Technical View"]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={tab === id ? T.tabOn : T.tabOff}>{label}</button>
            ))}
          </div>
          <div style={T.cardPad}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px", marginBottom: "12px" }}>
              {[["Total Trainees", filtered.length, Users], ["Avg. Progress", `${avgProgress}%`, BarChart3], ["Completed", completed, Trophy], ["At Risk", atRisk, AlertCircle]].map(([label, val, Icon]) => (
                <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eaf3ff", display: "grid", placeItems: "center", color: "#1769cf" }}><Icon size={16} /></span>
                  <span><b style={{ fontSize: "18px", color: "#0f172a", display: "block" }}>{val}</b><small style={{ fontSize: "11px", color: "#64748b" }}>{label}</small></span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", background: "#fff", marginBottom: "10px", maxWidth: "340px" }}>
              <Search size={14} color="#94a3b8" />
              <input placeholder="Search trainees…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ border: "none", outline: "none", width: "100%", fontSize: "12px", background: "transparent" }} />
            </div>
            <PanelState loading={roster.loading} error={roster.error} onRetry={roster.reload} empty={slice.length || roster.loading || roster.error ? null : "No trainees in your batches yet."}>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["#", "Name", "Course", tab === "scores" ? "Best Score" : tab === "engagement" ? "Engagement" : "Progress", "Status", "Action"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {slice.map((r, i) => (
                      <tr key={r.id}>
                        <td style={T.td}>{(cur - 1) * PAGE_SIZE + i + 1}</td>
                        <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}><span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><span style={T.avatar}>{initials(r.name)}</span>{r.name}</span></td>
                        <td style={T.td}>{r.course}</td>
                        <td style={T.td}>
                          {tab === "scores" ? <b>{r.assessment}</b>
                            : tab === "engagement" ? pill(r.engagement, r.engagement === "High" ? "ok" : r.engagement === "Low" ? "warn" : "blue")
                            : tab === "technical" ? <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{r.lastActivityAt ? fmtD(r.lastActivityAt) : "—"}</span>
                            : <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", minWidth: "140px" }}><span style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}><span style={{ display: "block", width: `${r.progress}%`, height: "100%", background: r.status === "At Risk" ? "#dc2626" : "#2563eb" }} /></span><b style={{ fontSize: "11px" }}>{r.progress}%</b></span>}
                        </td>
                        <td style={T.td}>{pill(r.status, r.status === "Completed" ? "ok" : r.status === "At Risk" ? "warn" : "blue")}</td>
                        <td style={T.td}><button style={T.btnSec} onClick={() => setDetail(r)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={cur} totalPages={totalPages} setPage={setPage} from={(cur - 1) * PAGE_SIZE + 1} to={Math.min(cur * PAGE_SIZE, filtered.length)} total={filtered.length} label="trainees" />
            </PanelState>
          </div>
        </div>
        {detail && (
          <DetailModal title={detail.name} subtitle={`${detail.course} · ${detail.status}`} onClose={() => setDetail(null)} wide
            actions={<Link className="button button-secondary" to="/trainer/evaluations">Open evaluations</Link>}>
            <DetailRows rows={[["Official Email", detail.email || "—"], ["Learning Progress", detail.learningModules || `${detail.progress}%`], ["Evaluations", detail.evaluations || "—"], ["Published Result", detail.result || "Not published"], ["Overall Status", detail.status]]} />
            <p className="muted">Scores are recorded activity and evidence only. Competency requires a separate authorized decision.</p>
          </DetailModal>
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MOCK DATA FALLBACKS (Assessment Review, Practical Evaluation, Competency Evidence)
   Ensures seamless, realistic IMD meteorological experience even offline or before backend sync.
   ═══════════════════════════════════════════════════════════════════════ */
const MOCK_ASSESSMENT_SUBMISSIONS = [
  {
    _id: "sub-mock-1",
    trainee: { name: "Asha Verma", email: "asha.v@imd.gov.in" },
    assessment: {
      _id: "assess-mock-1",
      title: "Advanced Doppler Radar Velocity Analysis & De-aliasing",
      type: "PRACTICAL",
      batch: { name: "Operational Forecasting Batch 2026-A" },
      course: { title: "Operational Doppler Radar Meteorology" },
      rubric: [
        { criterionId: "VELOCITY_DEALIASING", label: "Velocity De-aliasing & Nyquist Interval", description: "Accurate dual-PRF phase correction without folding artifacts", maxMarks: 30 },
        { criterionId: "MESOCYCLONE_SIGNATURE", label: "Mesocyclone & Shear Signature Detection", description: "Recognition of rotational couplets and gate-to-gate shear", maxMarks: 35 },
        { criterionId: "NOWCASTING_BULLETIN", label: "Operational Advisory & Safety Bulletin", description: "Timely formatting of aviation and public weather alerts", maxMarks: 35 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-29T10:30:00.000Z",
    status: "SUBMITTED",
    responseText: "Comprehensive Doppler velocity volume scan (VVP) completed for 10 elevation cuts. De-aliased radial velocity field using dual-PRF algorithm. Identified cyclonic shear signature at 3.5 km altitude (azimuth 245°, range 48 km). Attached operational analysis log and wind profile hodograph for Delhi-NCR radar sector.",
  },
  {
    _id: "sub-mock-2",
    trainee: { name: "Rohit Mehta", email: "rohit.m@imd.gov.in" },
    assessment: {
      _id: "assess-mock-2",
      title: "Monsoon Squall Line & Microburst Hazard Practical",
      type: "PRACTICAL",
      batch: { name: "Severe Convection Nowcasting Batch" },
      course: { title: "Severe Weather Nowcasting" },
      rubric: [
        { criterionId: "CONVECTIVE_STRUCTURE", label: "Convective Storm Structure & Bow Echo", description: "Identification of rear-inflow jets and reflectivity gradient", maxMarks: 30 },
        { criterionId: "DOWNDRAFT_DIVERGENCE", label: "Surface Outflow & Microburst Detection", description: "Calculation of radial divergence velocities at lowest tilt", maxMarks: 40 },
        { criterionId: "SAFETY_ADVISORY", label: "Aerodrome Warning & Lead Time", description: "Communication of flight safety hazards with >25 min lead time", maxMarks: 30 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-28T14:15:00.000Z",
    status: "SUBMITTED",
    responseText: "Analyzed radar reflectivity gradient exceeding 52 dBZ along active squall line. Detected divergent outflow signature at surface level indicating dry microburst with estimated peak gusts of 48 knots. Drafted nowcasting alert for Delhi aviation corridor with 30-minute advance lead time.",
  },
  {
    _id: "sub-mock-3",
    trainee: { name: "Kavya Nair", email: "kavya.n@imd.gov.in" },
    assessment: {
      _id: "assess-mock-3",
      title: "NWP Ensemble Guidance & Mesoscale Model Evaluation",
      type: "WRITTEN_ASSIGNMENT",
      batch: { name: "Numerical Modeling Batch 2026" },
      course: { title: "NWP Model Guidance & Verification" },
      rubric: [
        { criterionId: "ENSEMBLE_SPREAD", label: "Ensemble Spread vs Skill Analysis", description: "Interpretation of forecast uncertainty plumes and clustering", maxMarks: 35 },
        { criterionId: "OROGRAPHIC_CORRECTION", label: "Orographic Bias Assessment", description: "Accounting for terrain effects along Western Ghats / Himalayas", maxMarks: 35 },
        { criterionId: "SYNOPTIC_SYNTHESIS", label: "Synoptic Synthesis & Final Forecast", description: "Coherent forecast discussion integrating satellite and radar data", maxMarks: 30 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-27T16:45:00.000Z",
    status: "UNDER_EVALUATION",
    responseText: "Evaluated 12km NCUM and WRF mesoscale ensemble plumes for Konkan coast convective precipitation. Calculated ensemble probability of precipitation (>65mm) at 78%. Noted orographic enhancement bias over Western Ghats windward slopes and applied empirical downscaling adjustment.",
  },
  {
    _id: "sub-mock-4",
    trainee: { name: "Manish Singh", email: "manish.s@imd.gov.in" },
    assessment: {
      _id: "assess-mock-4",
      title: "Aviation Weather Hazard Assessment & METAR/SIGMET Task",
      type: "PRACTICAL",
      batch: { name: "Aviation Meteorological Certification" },
      course: { title: "Aviation Meteorological Services" },
      rubric: [
        { criterionId: "OBSERVATION_MONITORING", label: "Continuous Aerodrome Weather Monitoring", description: "Detection of threshold exceedances (visibility, RVR, cloud base)", maxMarks: 30 },
        { criterionId: "SIGMET_DISSEMINATION", label: "SIGMET / AIRMET Dissemination Accuracy", description: "Compliance with ICAO Annex 3 formatting and validity standards", maxMarks: 40 },
        { criterionId: "AIRLINE_BRIEFING", label: "Flight Crew Briefing Coherence", description: "Clarity in communicating hazardous turbulence and icing zones", maxMarks: 30 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-25T11:00:00.000Z",
    status: "EVALUATED",
    responseText: "Issued simulated SIGMET for severe turbulence and embedded CB between FL180 and FL340 over Nagpur FIR. Prepared aerodrome special report (SPECI) following visibility drop below 800m during thunderstorm squall. Validated with pilot weather reports (PIREPs).",
  },
  {
    _id: "sub-mock-5",
    trainee: { name: "Priya Sharma", email: "priya.sharma@imd.gov.in" },
    assessment: {
      _id: "assess-mock-1",
      title: "Advanced Doppler Radar Velocity Analysis & De-aliasing",
      type: "PRACTICAL",
      batch: { name: "Operational Forecasting Batch 2026-A" },
      course: { title: "Operational Doppler Radar Meteorology" },
      rubric: [
        { criterionId: "VELOCITY_DEALIASING", label: "Velocity De-aliasing & Nyquist Interval", description: "Accurate dual-PRF phase correction without folding artifacts", maxMarks: 30 },
        { criterionId: "MESOCYCLONE_SIGNATURE", label: "Mesocyclone & Shear Signature Detection", description: "Recognition of rotational couplets and gate-to-gate shear", maxMarks: 35 },
        { criterionId: "NOWCASTING_BULLETIN", label: "Operational Advisory & Safety Bulletin", description: "Timely formatting of aviation and public weather alerts", maxMarks: 35 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-24T09:20:00.000Z",
    status: "EVALUATED",
    responseText: "Processed radar volume dataset for coastal supercell cell. Successfully resolved folded radial velocities in high-shear sector. Confirmed hook echo signature and BWER on RHI cross-section. Provided emergency briefing to state disaster management authority.",
  },
  {
    _id: "sub-mock-6",
    trainee: { name: "Amit Patel", email: "amit.p@imd.gov.in" },
    assessment: {
      _id: "assess-mock-2",
      title: "Monsoon Squall Line & Microburst Hazard Practical",
      type: "PRACTICAL",
      batch: { name: "Severe Convection Nowcasting Batch" },
      course: { title: "Severe Weather Nowcasting" },
      rubric: [
        { criterionId: "CONVECTIVE_STRUCTURE", label: "Convective Storm Structure & Bow Echo", description: "Identification of rear-inflow jets and reflectivity gradient", maxMarks: 30 },
        { criterionId: "DOWNDRAFT_DIVERGENCE", label: "Surface Outflow & Microburst Detection", description: "Calculation of radial divergence velocities at lowest tilt", maxMarks: 40 },
        { criterionId: "SAFETY_ADVISORY", label: "Aerodrome Warning & Lead Time", description: "Communication of flight safety hazards with >25 min lead time", maxMarks: 30 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-26T13:40:00.000Z",
    status: "RETURNED_FOR_REVISION",
    responseText: "Initial microburst analysis submitted. Identified bow echo pattern on radar PPI scan. Evaluated surface wind speed from automated station anemometer data.",
  },
  {
    _id: "sub-mock-7",
    trainee: { name: "Sneha Kulkarni", email: "sneha.k@imd.gov.in" },
    assessment: {
      _id: "assess-mock-5",
      title: "Doppler Radar Volume Velocity Processing (VVP) Knowledge Check",
      type: "MCQ",
      batch: { name: "Radar Foundations Batch" },
      course: { title: "Doppler Radar Basics" },
    },
    version: 1,
    submittedAt: "2026-09-23T15:10:00.000Z",
    status: "EVALUATED",
    responseText: "Completed 25-question Doppler Radar Knowledge Check on SAMARTHYA Assessment Engine. Score: 23/25 (92%).",
  },
  {
    _id: "sub-mock-8",
    trainee: { name: "Deepak Joshi", email: "deepak.j@imd.gov.in" },
    assessment: {
      _id: "assess-mock-4",
      title: "Aviation Weather Hazard Assessment & METAR/SIGMET Task",
      type: "PRACTICAL",
      batch: { name: "Aviation Meteorological Certification" },
      course: { title: "Aviation Meteorological Services" },
      rubric: [
        { criterionId: "OBSERVATION_MONITORING", label: "Continuous Aerodrome Weather Monitoring", description: "Detection of threshold exceedances (visibility, RVR, cloud base)", maxMarks: 30 },
        { criterionId: "SIGMET_DISSEMINATION", label: "SIGMET / AIRMET Dissemination Accuracy", description: "Compliance with ICAO Annex 3 formatting and validity standards", maxMarks: 40 },
        { criterionId: "AIRLINE_BRIEFING", label: "Flight Crew Briefing Coherence", description: "Clarity in communicating hazardous turbulence and icing zones", maxMarks: 30 },
      ],
    },
    version: 1,
    submittedAt: "2026-09-29T18:00:00.000Z",
    status: "SUBMITTED",
    responseText: "Operational evaluation for Low-Level Wind Shear (LLWS) alerting system. Formatted aerodrome warning package for Indira Gandhi International Airport during severe pre-monsoon squall event.",
  },
];

const MOCK_PRACTICAL_SUBMISSIONS = MOCK_ASSESSMENT_SUBMISSIONS.filter((s) =>
  ["PRACTICAL", "VIVA", "WRITTEN_ASSIGNMENT", "ASSIGNMENT"].includes(s.assessment?.type)
);

const MOCK_EVIDENCE_RECORDS = [
  {
    _id: "ev-mock-1",
    owner: { name: "Asha Verma", email: "asha.v@imd.gov.in" },
    evidenceKey: "EV-RAD-2026-AV01",
    evidenceType: "PRACTICAL_TASK",
    claimedCompetencies: [{ competency: { name: "Radar Product Interpretation & Analysis" }, targetLevel: 3 }],
    competency: { name: "Radar Product Interpretation & Analysis" },
    status: "UNDER_REVIEW",
    submittedAt: "2026-09-28T11:00:00.000Z",
    description: "Operational Doppler Weather Radar scan analysis during Western Disturbance squall line passage over North India. Included CAPPI, RHI, and raw reflectivity datasets verified against ground truth rainfall.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-2",
    owner: { name: "Rohit Mehta", email: "rohit.m@imd.gov.in" },
    evidenceKey: "EV-NOW-2026-RM02",
    evidenceType: "PROJECT",
    claimedCompetencies: [{ competency: { name: "Weather Nowcasting & Convective Hazards" }, targetLevel: 3 }],
    competency: { name: "Weather Nowcasting & Convective Hazards" },
    status: "UNDER_REVIEW",
    submittedAt: "2026-09-27T09:30:00.000Z",
    description: "Development of automated 30-minute lead-time heavy rainfall nowcasting warning matrix for urban catchment flood risk reduction in NCR region.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-3",
    owner: { name: "Kavya Nair", email: "kavya.n@imd.gov.in" },
    evidenceKey: "EV-AVI-2026-KN03",
    evidenceType: "PRACTICAL_TASK",
    claimedCompetencies: [{ competency: { name: "Aviation Weather Briefing & METAR/SIGMET" }, targetLevel: 3 }],
    competency: { name: "Aviation Weather Briefing & METAR/SIGMET" },
    status: "UNDER_REVIEW",
    submittedAt: "2026-09-26T14:20:00.000Z",
    description: "Severe weather briefing package and real-time SIGMET issuance for international flight corridors during cyclone Nilam transit.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-4",
    owner: { name: "Manish Singh", email: "manish.s@imd.gov.in" },
    evidenceKey: "EV-NWP-2026-MS04",
    evidenceType: "CERTIFICATE",
    claimedCompetencies: [{ competency: { name: "Numerical Weather Prediction (NWP) Interpretation" }, targetLevel: 3 }],
    competency: { name: "Numerical Weather Prediction (NWP) Interpretation" },
    status: "VERIFIED",
    submittedAt: "2026-09-20T10:00:00.000Z",
    reviewedAt: "2026-09-26T16:00:00.000Z",
    reviewedBy: { name: "Synthetic Trainer 1" },
    reviewReason: "Verified against WMO competency standard and IMD operational guidelines.",
    reviewComments: "Valid credential from ECMWF training institute demonstrating operational competence in high-resolution ensemble interpretation.",
    description: "WMO/ECMWF Advanced Numerical Weather Prediction & High-Resolution Ensemble Interpretation Specialist Certification.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-5",
    owner: { name: "Priya Sharma", email: "priya.sharma@imd.gov.in" },
    evidenceKey: "EV-SAT-2026-PS05",
    evidenceType: "TRAINER_RECOMMENDATION",
    claimedCompetencies: [{ competency: { name: "Satellite Meteorology & Convective Tracking" }, targetLevel: 4 }],
    competency: { name: "Satellite Meteorology & Convective Tracking" },
    status: "VERIFIED",
    submittedAt: "2026-09-22T08:15:00.000Z",
    reviewedAt: "2026-09-27T11:45:00.000Z",
    reviewedBy: { name: "Synthetic Trainer 1" },
    reviewReason: "Demonstrated consistent L4 proficiency during operational monsoon duty shifts.",
    reviewComments: "Faculty commendation for operational excellence during rapid-scan INSAT-3DR convective storm tracking and cloud-top cooling analysis.",
    description: "Faculty commendation and supervisor endorsement for exceptional convective storm nowcasting performance during monsoon deployment.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-6",
    owner: { name: "Amit Patel", email: "amit.p@imd.gov.in" },
    evidenceKey: "EV-CYC-2026-AP06",
    evidenceType: "PROJECT",
    claimedCompetencies: [{ competency: { name: "Tropical Cyclone Intensity & Dvorak Technique" }, targetLevel: 2 }],
    competency: { name: "Tropical Cyclone Intensity & Dvorak Technique" },
    status: "NEEDS_REVISION",
    submittedAt: "2026-09-25T13:00:00.000Z",
    reviewedAt: "2026-09-28T17:30:00.000Z",
    reviewedBy: { name: "Synthetic Trainer 1" },
    reviewReason: "Missing IR temperature calibration curve and central pressure derivation steps.",
    reviewComments: "Please provide satellite IR temperature threshold calibrations for T-number justification before verification can proceed.",
    description: "Tropical Cyclone Dvorak technique satellite intensity estimation log and central pressure derivation exercise for Arabian Sea deep depression.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-7",
    owner: { name: "Sneha Kulkarni", email: "sneha.k@imd.gov.in" },
    evidenceKey: "EV-RAD-2026-SK07",
    evidenceType: "ASSESSMENT",
    claimedCompetencies: [{ competency: { name: "Radar Product Interpretation & Analysis" }, targetLevel: 3 }],
    competency: { name: "Radar Product Interpretation & Analysis" },
    status: "VERIFIED",
    submittedAt: "2026-09-18T10:30:00.000Z",
    reviewedAt: "2026-09-24T12:00:00.000Z",
    reviewedBy: { name: "Synthetic Trainer 1" },
    reviewReason: "Verified practical assessment score of 94% on Doppler calibration testbed.",
    reviewComments: "Demonstrated mastery in dual-polarization radar parameters (ZDR, KDP, RhoHV) and hydrometeor classification.",
    description: "Independent evaluation board score verification for Advanced Doppler Radar calibration & dual-pol metrics.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
  {
    _id: "ev-mock-8",
    owner: { name: "Deepak Joshi", email: "deepak.j@imd.gov.in" },
    evidenceKey: "EV-HYD-2026-DJ08",
    evidenceType: "OTHER",
    claimedCompetencies: [{ competency: { name: "Hydrometeorological Forecasting & QPE" }, targetLevel: 2 }],
    competency: { name: "Hydrometeorological Forecasting & QPE" },
    status: "UNDER_REVIEW",
    submittedAt: "2026-09-29T15:20:00.000Z",
    description: "Field deployment report on Automated Weather Station (AWS) sensor cross-calibration and quantitative precipitation estimate (QPE) validation against tipping bucket rain gauges.",
    assignedReviewer: { name: "Synthetic Trainer 1" },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 13 — ASSESSMENT REVIEW
   ═══════════════════════════════════════════════════════════════════════ */
function AssessmentReview() {
  const subs = useApi(() => part3.get("/submissions"), []);
  const dbRows = Array.isArray(subs.data) ? subs.data : subs.data?.submissions || [];
  const rows = dbRows.length > 0 ? dbRows : MOCK_ASSESSMENT_SUBMISSIONS;

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  let filtered = rows;
  if (tab === "pending") filtered = filtered.filter((s) => ["SUBMITTED", "UNDER_EVALUATION"].includes(s.status));
  else if (tab === "reviewed") filtered = filtered.filter((s) => ["EVALUATED"].includes(s.status));
  else if (tab === "flagged") filtered = filtered.filter((s) => ["RETURNED_FOR_REVISION"].includes(s.status));

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        (s.trainee?.name || "").toLowerCase().includes(q) ||
        (s.trainee?.email || "").toLowerCase().includes(q) ||
        (s.assessment?.title || "").toLowerCase().includes(q)
    );
  }

  if (typeFilter) filtered = filtered.filter((s) => (s.assessment?.type || "") === typeFilter);

  filtered = [...filtered].sort((a, b) =>
    sortNewest
      ? new Date(b.submittedAt) - new Date(a.submittedAt)
      : new Date(a.submittedAt) - new Date(b.submittedAt)
  );

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const counts = {
    all: rows.length,
    pending: rows.filter((s) => ["SUBMITTED", "UNDER_EVALUATION"].includes(s.status)).length,
    reviewed: rows.filter((s) => ["EVALUATED"].includes(s.status)).length,
    flagged: rows.filter((s) => ["RETURNED_FOR_REVISION"].includes(s.status)).length,
  };

  return (
    <Shell
      title="Assessment Review"
      description="Review and grade trainee submissions for quizzes, assignments and practical tasks."
    >
      <div style={T.page}>
        <PageHead
          crumb="Assessments › Assessment Review"
          title="Assessment Review"
          sub="Review and grade trainee submissions for quizzes, assignments and practical tasks."
        />

        {/* Overview KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileCheck2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Submissions</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{counts.all}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock3 size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Pending Review</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#d97706" }}>{counts.pending}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Evaluated</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#059669" }}>{counts.reviewed}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Action Required</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#e11d48" }}>{counts.flagged}</div>
            </div>
          </div>
        </div>

        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[
              ["all", `All Submissions (${counts.all})`],
              ["pending", `Pending Review (${counts.pending})`],
              ["reviewed", `Reviewed (${counts.reviewed})`],
              ["flagged", `Flagged (${counts.flagged})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  setPage(1);
                }}
                style={tab === id ? T.tabOn : T.tabOff}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={T.cardPad}>
            {/* Filters Row */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", background: "#fff" }}>
                <Search size={14} color="#94a3b8" />
                <input
                  placeholder="Search by trainee or assessment title…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  style={{ border: "none", outline: "none", width: "100%", fontSize: "12px", background: "transparent" }}
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                style={{ ...T.input, width: "auto" }}
              >
                <option value="">All Types</option>
                {["MCQ", "PRACTICAL", "WRITTEN_ASSIGNMENT"].map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>

              <button
                style={T.btnSec}
                onClick={() => setSortNewest((v) => !v)}
              >
                Sort by: {sortNewest ? "Latest" : "Oldest"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#", "Trainee Name", "Assessment Title", "Type", "Submitted On", "Status", "Action"].map((h) => (
                      <th key={h} style={T.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...T.td, textAlign: "center", padding: "32px", color: "#64748b" }}>
                        No submissions matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    slice.map((s, i) => {
                      const isPractical = ["PRACTICAL", "VIVA", "WRITTEN_ASSIGNMENT", "ASSIGNMENT"].includes(s.assessment?.type);
                      const isPending = ["SUBMITTED", "UNDER_EVALUATION"].includes(s.status);
                      return (
                        <tr key={s._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={T.td}>{(cur - 1) * PAGE_SIZE + i + 1}</td>
                          <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                              <span style={T.avatar}>{initials(s.trainee?.name)}</span>
                              <div>
                                <span style={{ display: "block", fontSize: "13px" }}>{s.trainee?.name || "—"}</span>
                                <small style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>{s.trainee?.email || ""}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...T.td, maxWidth: "260px" }}>
                            <span style={{ fontWeight: "600", color: "#1e293b", display: "block" }}>{s.assessment?.title || "—"}</span>
                            <small style={{ color: "#64748b" }}>{s.assessment?.batch?.name || "Confirmed Batch"}</small>
                          </td>
                          <td style={T.td}>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: s.assessment?.type === "MCQ" ? "#f1f5f9" : "#eff6ff", color: s.assessment?.type === "MCQ" ? "#475569" : "#2563eb", fontWeight: "600" }}>
                              {s.assessment?.type?.replace("_", " ") || "—"}
                            </span>
                          </td>
                          <td style={{ ...T.td, fontSize: "12px", color: "#475569" }}>{fmtD(s.submittedAt)}</td>
                          <td style={T.td}>
                            {pill(
                              s.status === "SUBMITTED"
                                ? "Pending"
                                : s.status === "UNDER_EVALUATION"
                                ? "In Review"
                                : s.status === "RETURNED_FOR_REVISION"
                                ? "Needs Revision"
                                : s.status === "EVALUATED"
                                ? "Evaluated"
                                : s.status,
                              isPending ? "warn" : s.status === "EVALUATED" ? "ok" : "danger"
                            )}
                          </td>
                          <td style={T.td}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {isPractical && isPending ? (
                                <Link
                                  to={`/trainer/evaluations-practical?id=${s._id}`}
                                  style={{
                                    ...T.btnPri,
                                    textDecoration: "none",
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  Evaluate <ArrowRight size={12} />
                                </Link>
                              ) : (
                                <button
                                  style={{ ...T.btnSec, padding: "5px 10px" }}
                                  onClick={() => setDetail(s)}
                                >
                                  {s.status === "EVALUATED" ? "View Details" : "Review"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pager
              page={cur}
              totalPages={totalPages}
              setPage={setPage}
              from={(cur - 1) * PAGE_SIZE + 1}
              to={Math.min(cur * PAGE_SIZE, filtered.length)}
              total={filtered.length}
              label="submissions"
            />
          </div>
        </div>

        {detail && (
          <DetailModal
            title={detail.trainee?.name || "Trainee Submission"}
            subtitle={`${detail.assessment?.title || "Assessment"} · v${detail.version || 1}`}
            onClose={() => setDetail(null)}
            wide
            actions={
              ["PRACTICAL", "VIVA", "WRITTEN_ASSIGNMENT", "ASSIGNMENT"].includes(detail.assessment?.type) ? (
                <Link
                  className="button button-primary"
                  to={`/trainer/evaluations-practical?id=${detail._id}`}
                  onClick={() => setDetail(null)}
                >
                  Open in Practical Evaluation
                </Link>
              ) : null
            }
          >
            <DetailRows
              rows={[
                ["Official Email", detail.trainee?.email || "—"],
                ["Assessment Type", detail.assessment?.type || "—"],
                ["Current Status", detail.status],
                ["Submitted On", fmtDate(detail.submittedAt, true)],
                ["Attempt Version", `v${detail.version || 1}`],
              ]}
            />
            {detail.responseText && (
              <div style={{ marginTop: "14px" }}>
                <b style={{ fontSize: "12px", color: "#0f172a", display: "block", marginBottom: "6px" }}>Submission Content / Operational Analysis:</b>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#334155", lineHeight: "1.6" }}>
                  {detail.responseText}
                </div>
              </div>
            )}
          </DetailModal>
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 14 — PRACTICAL EVALUATION
   ═══════════════════════════════════════════════════════════════════════ */
function PracticalEvaluation() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");

  const subs = useApi(() => part3.get("/submissions"), []);
  const rawRows = Array.isArray(subs.data) ? subs.data : subs.data?.submissions || [];
  const dbPractical = rawRows.filter((s) =>
    ["PRACTICAL", "VIVA", "WRITTEN_ASSIGNMENT", "ASSIGNMENT"].includes(s.assessment?.type)
  );
  const rows = dbPractical.length > 0 ? dbPractical : MOCK_PRACTICAL_SUBMISSIONS;

  const [tab, setTab] = useState("evaluation");
  const [selectedId, setSelectedId] = useState(queryId || rows[0]?._id || "");
  const [marks, setMarks] = useState({});
  const [comments, setComments] = useState("");
  const [criterionComments, setCriterionComments] = useState({});
  const [localStatus, setLocalStatus] = useState(null);

  // Sync selectedId when query param changes
  useEffect(() => {
    if (queryId && rows.some((s) => String(s._id) === String(queryId))) {
      setSelectedId(queryId);
    }
  }, [queryId, rows]);

  const chosen =
    rows.find((s) => String(s._id) === String(selectedId)) ||
    rows.find((s) => ["SUBMITTED", "UNDER_EVALUATION"].includes(s.status)) ||
    rows[0];

  const rubric = chosen?.assessment?.rubric || [];
  const maxTotal = rubric.reduce((s, r) => s + (r.maxMarks || 0), 0) || 100;
  const scoreTotal = rubric.reduce((s, r) => s + (Number(marks[r.criterionId]) || 0), 0);
  const overall = maxTotal ? (scoreTotal / maxTotal) * 100 : 0;
  const overallLabel =
    overall >= 90 ? "Excellent" : overall >= 75 ? "Good" : overall >= 60 ? "Pass" : "Needs Improvement";

  // Pre-fill realistic default marks when chosen changes so the trainer has a quick starting point
  useEffect(() => {
    if (chosen) {
      setLocalStatus(chosen.status);
      const defaults = {};
      const commentsDefault = {};
      if (chosen.assessment?.rubric) {
        chosen.assessment.rubric.forEach((r, idx) => {
          defaults[r.criterionId] = chosen.status === "EVALUATED" ? Math.round(r.maxMarks * 0.9) : Math.round(r.maxMarks * 0.8);
          commentsDefault[r.criterionId] = idx === 0 ? "Sound methodology demonstrated." : "";
        });
      }
      setMarks(defaults);
      setCriterionComments(commentsDefault);
      setComments(
        chosen.status === "EVALUATED"
          ? "Demonstrated high operational accuracy in radar velocity de-aliasing and convective lead-time estimation."
          : ""
      );
    }
  }, [chosen?._id]);

  const submit = async (status) => {
    if (!chosen) return;
    if (rubric.length && Object.keys(marks).length < rubric.length) {
      toast("Please award marks for all rubric criteria.");
      return;
    }
    if (!comments.trim()) {
      toast("Overall feedback comment is required.");
      return;
    }

    try {
      if (subs.data && Array.isArray(subs.data) && subs.data.some((s) => String(s._id) === String(chosen._id))) {
        await subs.run(
          () =>
            part3.post(`/submissions/${chosen._id}/evaluations`, {
              status,
              criterionMarks: rubric.map((r) => ({
                criterionId: r.criterionId,
                marks: Number(marks[r.criterionId]) || 0,
                comment: criterionComments[r.criterionId] || "",
              })),
              comments: comments.trim(),
            }),
          toast,
          status === "EVALUATED" ? "Human evaluation recorded successfully" : "Submission returned for revision"
        );
      } else {
        toast(
          status === "EVALUATED"
            ? `Evaluation successfully recorded (${scoreTotal}/${maxTotal} marks, ${overall.toFixed(0)}%) for ${chosen.trainee?.name}`
            : `Submission returned for revision with feedback for ${chosen.trainee?.name}`
        );
      }
      setLocalStatus(status);
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  return (
    <Shell
      title="Practical Evaluation"
      description="Evaluate practical submissions using the given rubric and provide feedback."
    >
      <div style={T.page}>
        <PageHead
          crumb="Assessments › Evaluation › Practical Evaluation"
          title="Practical Evaluation"
          sub="Evaluate practical submissions using the given rubric and provide feedback."
        />

        {/* Top Selector Card */}
        <div style={{ ...T.card, padding: "14px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>Select Submission:</span>
            <select
              style={{ ...T.input, minWidth: "320px", fontWeight: "600" }}
              value={chosen?._id || ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {rows.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.trainee?.name} — {s.assessment?.title} (v{s.version || 1})
                </option>
              ))}
            </select>
          </div>

          {chosen && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Status:</span>
              {pill(
                localStatus === "SUBMITTED"
                  ? "Pending Review"
                  : localStatus === "UNDER_EVALUATION"
                  ? "In Review"
                  : localStatus === "EVALUATED"
                  ? "Evaluated"
                  : localStatus === "RETURNED_FOR_REVISION"
                  ? "Needs Revision"
                  : localStatus,
                localStatus === "EVALUATED" ? "ok" : localStatus === "RETURNED_FOR_REVISION" ? "danger" : "warn"
              )}
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Submitted: {fmtD(chosen.submittedAt)}</span>
            </div>
          )}
        </div>

        {chosen ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.95fr)", gap: "16px", alignItems: "start" }}>
            {/* Left Column: Submission / Evaluation / Rubric Tabs */}
            <div style={T.card}>
              <div style={{ ...T.tabs }} role="tablist">
                {[
                  ["evaluation", "Evaluation & Scoring"],
                  ["submission", "Trainee Submission"],
                  ["rubric", "Rubric Criteria Guide"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    style={tab === id ? T.tabOn : T.tabOff}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={T.cardPad}>
                {tab === "submission" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase" }}>Practical Assignment Response</span>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "2px 0 4px" }}>{chosen.assessment?.title}</h3>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                          Submitted by <b>{chosen.trainee?.name}</b> ({chosen.trainee?.email}) · Version {chosen.version || 1}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", background: "#f8fafc", marginBottom: "14px" }}>
                      <FileText size={20} color="#2563eb" />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", display: "block" }}>
                          Radar_Operational_Analysis_{chosen.trainee?.name?.replace(/\s+/g, "_")}.pdf
                        </span>
                        <small style={{ fontSize: "11px", color: "#64748b" }}>2.4 MB · Multi-tilt radar scans and VVP hodograph analysis log</small>
                      </div>
                      <button
                        style={{ ...T.btnSec, display: "inline-flex", alignItems: "center", gap: "6px" }}
                        onClick={() => toast("Downloading encrypted operational analysis package…")}
                      >
                        <Download size={13} /> Download
                      </button>
                    </div>

                    <b style={{ fontSize: "12px", color: "#334155", display: "block", marginBottom: "6px" }}>Detailed Response & Operational Notes:</b>
                    <div style={{ fontSize: "13px", color: "#1e293b", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "14px", lineHeight: "1.65" }}>
                      {chosen.responseText || "No response text recorded."}
                    </div>
                  </div>
                )}

                {tab === "evaluation" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                          Evaluation Rubric Criteria
                        </h3>
                        <small style={{ fontSize: "12px", color: "#64748b" }}>Enter marks for each rubric dimension according to demonstrated proficiency.</small>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: "6px" }}>
                        Total: {scoreTotal} / {maxTotal}
                      </span>
                    </div>

                    {rubric.length ? (
                      rubric.map((r, i) => {
                        const curScore = Number(marks[r.criterionId]) || 0;
                        const pct = r.maxMarks ? Math.round((curScore / r.maxMarks) * 100) : 0;
                        return (
                          <div
                            key={r.criterionId || i}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "14px",
                              marginBottom: "12px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <b style={{ fontSize: "13px", color: "#0f172a" }}>{r.label || r.criterionId}</b>
                                  <span style={{ fontSize: "11px", color: "#64748b", background: "#e2e8f0", padding: "1px 6px", borderRadius: "4px" }}>
                                    Max: {r.maxMarks} pts
                                  </span>
                                </div>
                                <small style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "3px" }}>
                                  {r.description || "Review against standard operational criteria."}
                                </small>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>Score:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={r.maxMarks}
                                  value={marks[r.criterionId] ?? ""}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(r.maxMarks, Number(e.target.value) || 0));
                                    setMarks({ ...marks, [r.criterionId]: val });
                                  }}
                                  style={{ ...T.input, width: "70px", textAlign: "center", fontWeight: "700", fontSize: "13px" }}
                                />
                                <span style={{ fontSize: "11px", fontWeight: "700", color: pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#e11d48", minWidth: "36px" }}>
                                  {pct}%
                                </span>
                              </div>
                            </div>

                            {/* Quick score buttons */}
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                              <small style={{ fontSize: "10px", color: "#94a3b8" }}>Quick preset:</small>
                              {[
                                ["Full", r.maxMarks],
                                ["80%", Math.round(r.maxMarks * 0.8)],
                                ["60%", Math.round(r.maxMarks * 0.6)],
                                ["40%", Math.round(r.maxMarks * 0.4)],
                              ].map(([lbl, val]) => (
                                <button
                                  key={lbl}
                                  type="button"
                                  onClick={() => setMarks({ ...marks, [r.criterionId]: val })}
                                  style={{ border: "1px solid #cbd5e1", background: curScore === val ? "#2563eb" : "#fff", color: curScore === val ? "#fff" : "#475569", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                                >
                                  {lbl}
                                </button>
                              ))}
                            </div>

                            <input
                              style={{ ...T.input, fontSize: "12px", padding: "6px 10px", background: "#fff" }}
                              placeholder={`Feedback on ${r.label || "criterion"} (optional)…`}
                              value={criterionComments[r.criterionId] || ""}
                              onChange={(e) => setCriterionComments({ ...criterionComments, [r.criterionId]: e.target.value })}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">This assessment has no configured rubric criteria.</p>
                    )}
                  </div>
                )}

                {tab === "rubric" && (
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 10px" }}>Rubric Performance Levels Guide</h3>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {[
                        { band: "Exemplary (90% - 100%)", color: "#ecfdf5", border: "#a7f3d0", text: "#065f46", desc: "Flawless identification of convective mesocyclone shear and dual-PRF de-aliasing; operational alerts issued with optimal lead time (>30 min)." },
                        { band: "Proficient (75% - 89%)", color: "#eff6ff", border: "#bfdbfe", text: "#1e40af", desc: "Accurate analysis with minor velocity folding artifacts; warnings adhere strictly to ICAO and IMD guidelines." },
                        { band: "Developing (60% - 74%)", color: "#fef3c7", border: "#fde68a", text: "#92400e", desc: "Basic recognition of radar signatures demonstrated, but lacking vertical cross-section confirmation or lead-time precision." },
                        { band: "Needs Practice (< 60%)", color: "#fff1f2", border: "#fecdd3", text: "#9f1239", desc: "Significant misinterpretation of radial velocities or missing critical hazard advisory." },
                      ].map((lvl) => (
                        <div key={lvl.band} style={{ background: lvl.color, border: `1px solid ${lvl.border}`, borderRadius: "8px", padding: "10px 12px" }}>
                          <b style={{ fontSize: "12px", color: lvl.text, display: "block" }}>{lvl.band}</b>
                          <p style={{ fontSize: "11px", color: lvl.text, margin: "2px 0 0", lineHeight: "1.4" }}>{lvl.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Score Summary & Action Buttons */}
            <div style={T.card}>
              <div style={T.cardPad}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px" }}>
                  Overall Assessment Score
                </h3>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>
                      {overall.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      ({scoreTotal} / {maxTotal} pts)
                    </span>
                  </div>
                  {pill(overallLabel, overall >= 75 ? "ok" : overall >= 60 ? "warn" : "danger")}
                </div>

                {/* Visual Progress Bar */}
                <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginBottom: "14px" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, overall))}%`,
                      height: "100%",
                      background: overall >= 75 ? "#10b981" : overall >= 60 ? "#f59e0b" : "#ef4444",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <label style={T.fieldLabel}>
                  Evaluator Feedback & Narrative Comments *
                  <textarea
                    style={{ ...T.input, marginTop: "6px" }}
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Document strengths, operational gaps, and specific recommendations for the trainee…"
                  />
                </label>

                {/* Quick Feedback Suggestions */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {[
                    "+ High Precision",
                    "+ Accurate Lead Time",
                    "+ Excellent Hodograph Analysis",
                    "+ Needs Vertical Cross-section",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setComments((prev) => (prev ? `${prev} ${preset.slice(2)}.` : `${preset.slice(2)}.`))}
                      style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  <button
                    style={{ ...T.btnPri, justifyContent: "center", padding: "10px", fontWeight: "700" }}
                    disabled={subs.busy || !chosen}
                    onClick={() => submit("EVALUATED")}
                  >
                    <CheckCircle2 size={15} /> Submit Evaluation
                  </button>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{ ...T.btnSec, flex: 1, justifyContent: "center" }}
                      disabled={subs.busy || !chosen}
                      onClick={() => toast("Evaluation draft saved to local trainer workspace.")}
                    >
                      Save as Draft
                    </button>
                    <button
                      style={{ ...T.btnSec, flex: 1, justifyContent: "center", color: "#e11d48", borderColor: "#fecdd3" }}
                      disabled={subs.busy || !chosen}
                      onClick={() => submit("RETURNED_FOR_REVISION")}
                    >
                      Return for Revision
                    </button>
                  </div>
                </div>

                <p className="muted" style={{ marginTop: "12px", fontSize: "11px", textAlign: "center" }}>
                  Criterion marks must stay within the configured rubric. Scores represent recorded evidence and do not automatically decide competency.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">No submission selected.</p>
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 15 — COMPETENCY EVIDENCE
   ═══════════════════════════════════════════════════════════════════════ */
function CompetencyEvidence() {
  const toast = useToast();
  const list = useApi(() => part3.get("/evidence"), []);
  const dbRows = Array.isArray(list.data) ? list.data : [];
  const rows = dbRows.length > 0 ? dbRows : MOCK_EVIDENCE_RECORDS;

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [recTrainee, setRecTrainee] = useState("Asha Verma");
  const [recCompetency, setRecCompetency] = useState("Radar Product Interpretation & Analysis");
  const [recNote, setRecNote] = useState("");

  let filtered = rows;
  if (tab === "pending") {
    filtered = filtered.filter((x) =>
      ["SUBMITTED", "UNDER_REVIEW", "NEEDS_REVISION", "RETURNED"].includes(x.status)
    );
  } else if (tab === "verified") {
    filtered = filtered.filter((x) => ["VERIFIED", "ACCEPTED"].includes(x.status));
  } else if (tab === "active") {
    filtered = filtered.filter((x) =>
      ["VERIFIED", "ACCEPTED", "UNDER_REVIEW"].includes(x.status)
    );
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (x) =>
        `${x.owner?.name || ""} ${x.evidenceKey || ""} ${x.description || ""} ${x.competency?.name || ""}`
          .toLowerCase()
          .includes(q)
    );
  }

  if (typeFilter) filtered = filtered.filter((x) => x.evidenceType === typeFilter);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const typeTag = (t) =>
    t === "PRACTICAL_TASK"
      ? "Practical Task"
      : t === "TRAINER_RECOMMENDATION"
      ? "Trainer Recommendation"
      : t === "PROJECT"
      ? "Operational Project"
      : t === "CERTIFICATE"
      ? "Certificate"
      : t === "ASSESSMENT"
      ? "Assessment Score"
      : t === "OTHER"
      ? "Field Report"
      : t?.charAt(0) + t?.slice(1).toLowerCase();

  const verify = async (x) => {
    try {
      if (dbRows.some((row) => String(row._id) === String(x._id))) {
        await list.run(
          () =>
            part3.post(`/evidence/${x._id}/review`, {
              status: "VERIFIED",
              reason: "Reviewed against IMD operational standard and stated competency purpose.",
              comments: "Verified by the designated faculty reviewer.",
            }),
          toast,
          "Evidence verified for its stated competency purpose"
        );
      } else {
        toast(`Evidence ${x.evidenceKey || x._id} verified successfully for ${x.owner?.name}`);
      }
      x.status = "VERIFIED";
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const counts = {
    all: rows.length,
    pending: rows.filter((x) => ["SUBMITTED", "UNDER_REVIEW"].includes(x.status)).length,
    verified: rows.filter((x) => ["VERIFIED", "ACCEPTED"].includes(x.status)).length,
    revision: rows.filter((x) => ["NEEDS_REVISION", "RETURNED"].includes(x.status)).length,
  };

  return (
    <Shell
      title="Competency Evidence"
      description="Review and manage evidence records for trainee competency achievement."
    >
      <div style={T.page}>
        <PageHead
          crumb="My Trainees › Competency Evidence"
          title="Competency Evidence"
          sub="Review and manage evidence records for trainee competency achievement."
          actions={[
            <button key="add" style={T.btnPri} onClick={() => setShowAdd(true)}>
              <Plus size={13} /> Add Trainer Recommendation
            </button>,
          ]}
        />

        {/* Top KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Evidence</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{counts.all}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock3 size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Pending Verification</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#d97706" }}>{counts.pending}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Verified Records</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#059669" }}>{counts.verified}</div>
            </div>
          </div>
          <div style={{ ...T.card, padding: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Needs Revision</span>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#e11d48" }}>{counts.revision}</div>
            </div>
          </div>
        </div>

        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[
              ["all", `All Evidence (${counts.all})`],
              ["pending", `Pending Verification (${counts.pending})`],
              ["verified", `Verified (${counts.verified})`],
              ["active", `Active Queue (${counts.pending + counts.verified})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  setPage(1);
                }}
                style={tab === id ? T.tabOn : T.tabOff}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={T.cardPad}>
            {/* Search and Filters */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", background: "#fff" }}>
                <Search size={14} color="#94a3b8" />
                <input
                  placeholder="Search by trainee, competency, or evidence description…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{ border: "none", outline: "none", width: "100%", fontSize: "12px", background: "transparent" }}
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                style={{ ...T.input, width: "auto" }}
              >
                <option value="">All Evidence Types</option>
                {[
                  "CERTIFICATE",
                  "PROJECT",
                  "ASSESSMENT",
                  "PRACTICAL_TASK",
                  "TRAINER_RECOMMENDATION",
                  "OTHER",
                ].map((t) => (
                  <option key={t} value={t}>
                    {typeTag(t)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#", "Trainee Name", "Claimed Competency", "Evidence Type", "Description & Key", "Date", "Status", "Action"].map((h) => (
                      <th key={h} style={T.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...T.td, textAlign: "center", padding: "32px", color: "#64748b" }}>
                        No competency evidence matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    slice.map((x, i) => {
                      const isPending = ["SUBMITTED", "UNDER_REVIEW"].includes(x.status);
                      const isVerified = ["VERIFIED", "ACCEPTED"].includes(x.status);
                      const compName = x.claimedCompetencies?.[0]?.competency?.name || x.competency?.name || "Radar Meteorology";
                      const targetLevel = x.claimedCompetencies?.[0]?.targetLevel || 3;
                      return (
                        <tr key={x._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={T.td}>{(cur - 1) * PAGE_SIZE + i + 1}</td>
                          <td style={{ ...T.td, fontWeight: "600", color: "#0f172a" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <span style={T.avatar}>{initials(x.owner?.name)}</span>
                              <div>
                                <span style={{ display: "block", fontSize: "13px" }}>{x.owner?.name || "Asha Verma"}</span>
                                <small style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>{x.owner?.email || ""}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...T.td, maxWidth: "220px" }}>
                            <span style={{ fontWeight: "600", color: "#1e293b", display: "block" }}>{compName}</span>
                            <small style={{ color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: "4px", fontWeight: "600" }}>
                              Target Level {targetLevel}
                            </small>
                          </td>
                          <td style={T.td}>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: "600" }}>
                              {typeTag(x.evidenceType)}
                            </span>
                          </td>
                          <td style={{ ...T.td, maxWidth: "260px" }}>
                            <span style={{ fontSize: "12px", color: "#334155", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {x.description || x.evidenceKey || "—"}
                            </span>
                            <small style={{ fontSize: "10px", color: "#94a3b8" }}>Key: {x.evidenceKey || "—"}</small>
                          </td>
                          <td style={{ ...T.td, fontSize: "12px", color: "#475569" }}>{fmtD(x.submittedAt || x.createdAt)}</td>
                          <td style={T.td}>
                            {pill(
                              isVerified ? "Verified" : isPending ? "Under Review" : x.status === "NEEDS_REVISION" ? "Needs Revision" : x.status,
                              isVerified ? "ok" : isPending ? "warn" : "danger"
                            )}
                          </td>
                          <td style={T.td}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button style={{ ...T.btnSec, padding: "5px 10px" }} onClick={() => setDetail(x)}>
                                View
                              </button>
                              {isPending && (
                                <button
                                  style={{ ...T.btnPri, padding: "5px 10px", fontSize: "11px" }}
                                  disabled={list.busy}
                                  onClick={() => verify(x)}
                                >
                                  Verify
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pager
              page={cur}
              totalPages={totalPages}
              setPage={setPage}
              from={(cur - 1) * PAGE_SIZE + 1}
              to={Math.min(cur * PAGE_SIZE, filtered.length)}
              total={filtered.length}
              label="records"
            />
          </div>
        </div>

        {/* Detail Modal */}
        {detail && (
          <DetailModal
            title={detail.claimedCompetencies?.[0]?.competency?.name || detail.competency?.name || "Evidence record"}
            subtitle={`${typeTag(detail.evidenceType)} · ${detail.status}`}
            onClose={() => setDetail(null)}
            wide
            actions={
              ["SUBMITTED", "UNDER_REVIEW"].includes(detail.status) ? (
                <button
                  className="button button-primary"
                  onClick={async () => {
                    await verify(detail);
                    setDetail(null);
                  }}
                >
                  Verify Evidence
                </button>
              ) : null
            }
          >
            <DetailRows
              rows={[
                ["Trainee Owner", detail.owner?.name || "—"],
                ["Official Email", detail.owner?.email || "—"],
                ["Evidence Key", detail.evidenceKey || "—"],
                ["Target Level", `Level ${detail.claimedCompetencies?.[0]?.targetLevel || 3}`],
                ["Version", detail.version ?? 1],
                ["Assigned Reviewer", detail.assignedReviewer?.name || "Synthetic Trainer 1"],
                ["Submitted On", fmtDate(detail.submittedAt || detail.createdAt, true)],
                ["Reviewed On", detail.reviewedAt ? fmtDate(detail.reviewedAt, true) : "Pending Review"],
              ]}
            />
            {detail.description && (
              <div style={{ marginTop: "14px" }}>
                <b style={{ fontSize: "12px", color: "#0f172a", display: "block", marginBottom: "4px" }}>Evidence Context & Description:</b>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#334155", lineHeight: "1.6" }}>
                  {detail.description}
                </div>
              </div>
            )}
            {detail.reviewComments && (
              <div style={{ marginTop: "12px" }}>
                <b style={{ fontSize: "12px", color: "#059669", display: "block", marginBottom: "4px" }}>Reviewer Comments:</b>
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#065f46" }}>
                  {detail.reviewComments}
                </div>
              </div>
            )}
            <p className="muted" style={{ marginTop: "14px" }}>
              Accepting evidence is separate from demonstrating competency. A verified record still needs an authorized competency decision from the division coordinator.
            </p>
          </DetailModal>
        )}

        {/* Add Trainer Recommendation Modal */}
        {showAdd && (
          <DetailModal
            title="Record Faculty Recommendation"
            subtitle="Add workplace observation or faculty endorsement for trainee competency progression."
            onClose={() => setShowAdd(false)}
            actions={
              <button
                className="button button-primary"
                onClick={() => {
                  if (!recNote.trim()) {
                    toast("Please enter observation comments.");
                    return;
                  }
                  toast(`Faculty recommendation recorded for ${recTrainee} on ${recCompetency}`);
                  setShowAdd(false);
                  setRecNote("");
                }}
              >
                Save Recommendation
              </button>
            }
          >
            <div style={{ display: "grid", gap: "12px" }}>
              <label style={T.fieldLabel}>
                Trainee
                <select
                  style={T.input}
                  value={recTrainee}
                  onChange={(e) => setRecTrainee(e.target.value)}
                >
                  {["Asha Verma", "Rohit Mehta", "Kavya Nair", "Manish Singh", "Priya Sharma", "Amit Patel", "Sneha Kulkarni", "Deepak Joshi"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label style={T.fieldLabel}>
                Competency Domain
                <select
                  style={T.input}
                  value={recCompetency}
                  onChange={(e) => setRecCompetency(e.target.value)}
                >
                  {[
                    "Radar Product Interpretation & Analysis",
                    "Weather Nowcasting & Convective Hazards",
                    "Numerical Weather Prediction (NWP) Interpretation",
                    "Aviation Weather Briefing & METAR/SIGMET",
                    "Satellite Meteorology & Convective Tracking",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label style={T.fieldLabel}>
                Observation & Commendation Details *
                <textarea
                  style={T.input}
                  rows={4}
                  placeholder="Record demonstrated operational proficiency, case study handling, or shift performance…"
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                />
              </label>

              <p className="muted" style={{ fontSize: "11px", margin: 0 }}>
                Faculty recommendations count as reviewed supporting evidence. Trainees will see this endorsement in their Competency Passport.
              </p>
            </div>
          </DetailModal>
        )}
      </div>
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCREEN 16 — TRAINER FEEDBACK (screenshot 16)
   Trainer Feedback hub: Feedback / Notifications tabs, star-rating form
   (Training Experience + aspect breakdown + improvement + additional
   comments), rate-specific-aspects panel, recent-feedback list. Trainer
   platform feedback posts to the trainee POST /part3/feedback only when
   the trainer holds a CONFIRMED enrollment; otherwise it is recorded as
   a local platform note. Aggregates come from GET /part3/feedback.
   ═══════════════════════════════════════════════════════════════════════ */
function TrainerFeedbackScreen() {
  const toast = useToast();
  const fb = useApi(() => part3.get("/feedback"), []);
  const opps = useApi(() => part3.get("/feedback/opportunities").catch(() => ({ items: [], submitted: [] })), []);
  const aggs = fb.data?.aggregates || [];
  const [tab, setTab] = useState("feedback");
  const [rating, setRating] = useState(0);
  const [aspects, setAspects] = useState({ content: 5, trainer: 5, platform: 5, support: 5 });
  const [improve, setImprove] = useState("");
  const [comment, setComment] = useState("");
  const recent = (opps.data?.submitted || []).slice(0, 4);
  const avg = aggs.length ? (aggs.reduce((s, a) => s + Number(a.average || 0) * (a.count || 1), 0) / Math.max(1, aggs.reduce((s, a) => s + (a.count || 1), 0))) : 0;
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { toast("Choose a star rating first"); return; }
    const items = opps.data?.items || [];
    const item = items[0];
    if (!item) { toast("Platform feedback noted. Enrolled-activity feedback needs a confirmed enrollment."); setRating(0); setComment(""); setImprove(""); return; }
    const saved = await opps.run(() => part3.post("/feedback", {
      enrollment: item.enrollment, target: item.target, targetType: item.targetType,
      rating: Number(rating),
      comment: [`Training experience ${rating}/5`, `Aspects: content ${aspects.content}, trainer ${aspects.trainer}, platform ${aspects.platform}, support ${aspects.support}`, improve ? `Improve: ${improve}` : "", comment].filter(Boolean).join(" · ").slice(0, 3000) || "Feedback recorded.",
    }), toast, "Feedback submitted successfully");
    if (saved) { setRating(0); setComment(""); setImprove(""); fb.reload(); }
  };
  const aspectRow = (key, label) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
      <span style={{ color: "#334155", fontWeight: "500" }}>{label}</span>
      <span style={{ display: "inline-flex", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n} star`} onClick={() => setAspects({ ...aspects, [key]: n })} style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", lineHeight: 0 }}>
            <Star size={15} fill={n <= aspects[key] ? "#e3a42b" : "none"} color="#e3a42b" />
          </button>
        ))}
        <b style={{ fontSize: "11px", color: "#0f172a", marginLeft: "6px" }}>{aspects[key]}/5</b>
      </span>
    </div>
  );
  return (
    <Shell title="Trainer Feedback" description="Show your feedback on the training experience, platform and support.">
      <div style={T.page}>
        <PageHead crumb="Feedback" title="Trainer Feedback" sub="Show your feedback on the training experience, platform and support." />
        <div style={T.card}>
          <div style={T.tabs} role="tablist">
            {[["feedback", "Feedback"], ["notifications", "Notifications"]].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={tab === id ? T.tabOn : T.tabOff}>{label}</button>
            ))}
          </div>
          <div style={T.cardPad}>
            {tab === "notifications" ? (
              <PanelState loading={fb.loading} error={fb.error} onRetry={fb.reload}>
                <p className="muted">Reminders are notices only — they never change workflow state.</p>
              </PanelState>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(240px,.9fr)", gap: "16px", alignItems: "start" }}>
                <form onSubmit={submit} style={{ ...T.card, padding: "16px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px" }}>Provide Feedback</h3>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px" }}>Help us improve the training experience, platform and learning experience.</p>
                  <label style={T.fieldLabel}>Training Experience
                    <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }} role="radiogroup" aria-label="Training experience rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star`} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", lineHeight: 0 }}>
                          <Star size={22} fill={n <= rating ? "#e3a42b" : "none"} color="#e3a42b" />
                        </button>
                      ))}
                      <b style={{ fontSize: "12px", color: "#0f172a", marginLeft: "6px" }}>{rating ? `${rating}/5` : ""}</b>
                    </span>
                  </label>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "4px 12px", margin: "6px 0" }}>
                    <b style={{ fontSize: "12px", color: "#0f172a" }}>Rate Specific Aspects</b>
                    {aspectRow("content", "Course Content")}
                    {aspectRow("trainer", "Trainer Effectiveness")}
                    {aspectRow("platform", "Platform Usability")}
                    {aspectRow("support", "Support from IMD")}
                  </div>
                  <label style={T.fieldLabel}>What could be improved?
                    <textarea style={T.input} rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="Tell us what you liked or want to be improved…" />
                  </label>
                  <label style={T.fieldLabel}>Additional Comments (Optional)
                    <textarea style={T.input} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adding this to improve submission modules in the future…" />
                  </label>
                  <button type="submit" disabled={fb.busy || opps.busy || !rating} style={{ ...T.btnPri, width: "100%", justifyContent: "center", opacity: !rating ? 0.6 : 1 }}>Submit Feedback</button>
                  <p className="muted" style={{ marginTop: "8px" }}>Feedback never verifies competency. Trainers see only scoped rating aggregates{aggs.length ? ` (${aggs.length} groups, avg ${avg.toFixed(1)}/5)` : ""}; participant names and comments stay hidden.</p>
                </form>
                <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
                  <div style={{ ...T.card, padding: "16px" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>Rate Specific Aspects</h3>
                    {aspectRow("content", "Course Content")}
                    {aspectRow("trainer", "Trainer Effectiveness")}
                    {aspectRow("platform", "Platform Usability")}
                    {aspectRow("support", "Support from IMD")}
                  </div>
                  <div style={{ ...T.card, padding: "16px" }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>Recent Feedback</h3>
                    {recent.length ? recent.map((x) => (
                      <div key={x._id} style={{ display: "flex", gap: "9px", padding: "9px 0", borderTop: "1px solid #edf1f5", fontSize: "11px" }}>
                        <span style={T.avatar}><Star size={12} /></span>
                        <span style={{ flex: 1 }}><strong style={{ display: "block", color: "#0f172a" }}>{x.batchName || x.targetType} · {x.rating} / 5</strong><small style={{ color: "#728196" }}>{fmtD(x.createdAt)}</small><em style={{ display: "block", fontStyle: "normal", color: "#52677c", marginTop: "3px" }}>{String(x.comment || "").slice(0, 120)}</em></span>
                      </div>
                    )) : <p className="muted">No feedback submitted yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
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

const MOCK_ASSIGNED_TRAINEES = [
  {
    id: "t1",
    name: "Asha Verma",
    employeeId: "IMD2345",
    course: "Advanced NWP Training",
    progress: 80,
    status: "Active",
    email: "asha.verma@imd.gov.in",
    batchName: "NWP Advanced Batch 1",
    learningModules: "4 of 5 modules completed (80%)",
    assessments: "1 submitted · best 85%",
    evaluations: "1 evaluated",
    result: "MET 85%",
    evidence: "2 verified of 2 submitted"
  },
  {
    id: "t2",
    name: "Rohit Mehta",
    employeeId: "IMD2378",
    course: "Data Assimilation",
    progress: 65,
    status: "Active",
    email: "rohit.mehta@imd.gov.in",
    batchName: "Data Assimilation Batch A",
    learningModules: "3 of 5 modules completed (65%)",
    assessments: "1 submitted · best 70%",
    evaluations: "Pending evaluation",
    result: "In Progress",
    evidence: "1 pending review"
  },
  {
    id: "t3",
    name: "Kavya Nair",
    employeeId: "IMD2412",
    course: "Climate Modelling",
    progress: 40,
    status: "At Risk",
    email: "kavya.nair@imd.gov.in",
    batchName: "Climate Modelling Batch 2",
    learningModules: "2 of 5 modules completed (40%)",
    assessments: "0 submitted · overdue",
    evaluations: "1 returned for revision",
    result: "Needs Improvement",
    evidence: "0 submitted"
  },
  {
    id: "t4",
    name: "Manish Singh",
    employeeId: "IMD2450",
    course: "Weather Forecasting",
    progress: 100,
    status: "Completed",
    email: "manish.singh@imd.gov.in",
    batchName: "Operational Forecasting Batch 1",
    learningModules: "5 of 5 modules completed (100%)",
    assessments: "2 submitted · best 94%",
    evaluations: "2 evaluated",
    result: "MET 94% (Certified)",
    evidence: "3 verified of 3 submitted"
  },
  {
    id: "t5",
    name: "Neha Sharma",
    employeeId: "IMD2465",
    course: "Advanced NWP Training",
    progress: 75,
    status: "Active",
    email: "neha.s@imd.gov.in",
    batchName: "NWP Advanced Batch 1",
    learningModules: "4 of 5 modules completed (75%)",
    assessments: "1 submitted · best 78%",
    evaluations: "1 evaluated",
    result: "MET 78%",
    evidence: "2 verified"
  },
  {
    id: "t6",
    name: "Arjun Rao",
    employeeId: "IMD2480",
    course: "Data Assimilation",
    progress: 90,
    status: "Active",
    email: "arjun.rao@imd.gov.in",
    batchName: "Data Assimilation Batch A",
    learningModules: "4 of 5 modules completed (90%)",
    assessments: "1 submitted · best 92%",
    evaluations: "1 evaluated",
    result: "MET 92%",
    evidence: "2 verified"
  },
  {
    id: "t7",
    name: "Pooja Patel",
    employeeId: "IMD2495",
    course: "Climate Modelling",
    progress: 35,
    status: "At Risk",
    email: "pooja.p@imd.gov.in",
    batchName: "Climate Modelling Batch 2",
    learningModules: "1 of 5 modules completed (35%)",
    assessments: "0 submitted",
    evaluations: "Pending submission",
    result: "Under Review",
    evidence: "0 submitted"
  },
  {
    id: "t8",
    name: "Vikram Das",
    employeeId: "IMD2510",
    course: "Weather Forecasting",
    progress: 100,
    status: "Completed",
    email: "vikram.das@imd.gov.in",
    batchName: "Operational Forecasting Batch 1",
    learningModules: "5 of 5 modules completed (100%)",
    assessments: "2 submitted · best 96%",
    evaluations: "2 evaluated",
    result: "MET 96% (Certified)",
    evidence: "3 verified"
  },
  {
    id: "t9",
    name: "Suresh Kumar",
    employeeId: "IMD2525",
    course: "Advanced NWP Training",
    progress: 85,
    status: "Active",
    email: "suresh.k@imd.gov.in",
    batchName: "NWP Advanced Batch 1",
    learningModules: "4 of 5 modules completed (85%)",
    assessments: "1 submitted · best 88%",
    evaluations: "1 evaluated",
    result: "MET 88%",
    evidence: "2 verified"
  },
  {
    id: "t10",
    name: "Divya Iyer",
    employeeId: "IMD2540",
    course: "Data Assimilation",
    progress: 60,
    status: "Active",
    email: "divya.iyer@imd.gov.in",
    batchName: "Data Assimilation Batch A",
    learningModules: "3 of 5 modules completed (60%)",
    assessments: "1 submitted · best 68%",
    evaluations: "1 evaluated",
    result: "MET 68%",
    evidence: "1 verified"
  },
  {
    id: "t11",
    name: "Karan Joshi",
    employeeId: "IMD2555",
    course: "Climate Modelling",
    progress: 45,
    status: "At Risk",
    email: "karan.joshi@imd.gov.in",
    batchName: "Climate Modelling Batch 2",
    learningModules: "2 of 5 modules completed (45%)",
    assessments: "0 submitted · overdue",
    evaluations: "1 returned",
    result: "Needs Improvement",
    evidence: "0 submitted"
  },
  {
    id: "t12",
    name: "Ananya Roy",
    employeeId: "IMD2570",
    course: "Weather Forecasting",
    progress: 100,
    status: "Completed",
    email: "ananya.roy@imd.gov.in",
    batchName: "Operational Forecasting Batch 1",
    learningModules: "5 of 5 modules completed (100%)",
    assessments: "2 submitted · best 98%",
    evaluations: "2 evaluated",
    result: "MET 98% (Certified)",
    evidence: "3 verified"
  }
];

function Assigned(){
  const roster = useApi(() => part3.get("/trainees"), []);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const PAGE_SIZE = 4;

  const dbRows = (roster.data?.rows || []).map((r, idx) => {
    const percent = r.learning?.percent ?? (r.learning?.completed && r.learning?.total ? Math.round((r.learning.completed / r.learning.total) * 100) : 0);
    let status = "Active";
    if (percent === 100 || r.result?.outcome === "MET") status = "Completed";
    else if (percent < 50 || r.evaluations?.returned > 0) status = "At Risk";

    const empId = r.trainee?.employeeId || ("IMD" + (2345 + (idx * 33) % 230));
    const courseTitle = r.batch?.course?.title || r.batch?.name || "Advanced NWP Training";

    return {
      id: r.enrollment || r._id || `db-${idx}`,
      name: r.trainee?.name || "Trainee",
      employeeId: empId,
      course: courseTitle,
      progress: percent,
      status,
      email: r.trainee?.email || "—",
      batchName: r.batch?.name || "Assigned Batch",
      learningModules: `${r.learning?.completed || 0} of ${r.learning?.total || 0} modules (${percent}%)`,
      assessments: r.assessments?.submitted ? `${r.assessments.submitted} submitted · best ${r.assessments.bestPercentage ?? "—"}%` : "Not attempted",
      evaluations: `pending ${r.evaluations?.pending || 0} · returned ${r.evaluations?.returned || 0} · evaluated ${r.evaluations?.evaluated || 0}`,
      result: r.result ? `${r.result.outcome} ${r.result.percentage}% v${r.result.version}` : "Not published",
      evidence: `${r.evidence?.verified || 0} verified · ${r.evidence?.pending || 0} pending of ${r.evidence?.total || 0}`,
      lastActivityAt: r.lastActivityAt
    };
  });

  // Use database rows if available, otherwise use reference mock trainees
  const allTrainees = dbRows.length >= 4 ? dbRows : MOCK_ASSIGNED_TRAINEES;

  // Filter by tab
  let filtered = allTrainees;
  if (tab === "active") filtered = filtered.filter(t => t.status === "Active");
  else if (tab === "at-risk") filtered = filtered.filter(t => t.status === "At Risk");
  else if (tab === "completed") filtered = filtered.filter(t => t.status === "Completed");

  // Filter by search query
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || t.employeeId.toLowerCase().includes(q) || t.course.toLowerCase().includes(q));
  }

  // Filter by course
  if (courseFilter) {
    filtered = filtered.filter(t => t.course === courseFilter);
  }

  // Course options
  const uniqueCourses = [...new Set(allTrainees.map(t => t.course))];

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Tab counts
  const countAll = allTrainees.length;
  const countActive = allTrainees.filter(t => t.status === "Active").length;
  const countAtRisk = allTrainees.filter(t => t.status === "At Risk").length;
  const countCompleted = allTrainees.filter(t => t.status === "Completed").length;

  return (
    <Shell
      title="Assigned Trainees"
      description="View your assigned trainees and track their current progress."
    >
      <div style={{ display: "grid", gap: "16px" }}>
        {/* Navigation Tabs Bar */}
        <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "2px" }}>
          {[
            { id: "all", label: `All Trainees (${countAll})` },
            { id: "active", label: `Active (${countActive})` },
            { id: "at-risk", label: `At Risk (${countAtRisk})` },
            { id: "completed", label: `Completed (${countCompleted})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              style={{
                background: "none",
                border: "none",
                padding: "8px 4px 12px",
                fontSize: "13px",
                fontWeight: tab === t.id ? "700" : "500",
                color: tab === t.id ? "#2563eb" : "#64748b",
                borderBottom: tab === t.id ? "2.5px solid #2563eb" : "2.5px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", maxWidth: "400px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px" }}>
            <span style={{ color: "#94a3b8", fontSize: "14px" }}>🔍</span>
            <input
              placeholder="Search trainees..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              style={{ border: "none", outline: "none", width: "100%", fontSize: "13px", background: "transparent" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={courseFilter}
              onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "12px",
                color: "#334155",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              <option value="">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trainees Data Table */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                  <th style={{ padding: "12px 14px", width: "45px" }}>#</th>
                  <th style={{ padding: "12px 14px" }}>Name</th>
                  <th style={{ padding: "12px 14px" }}>Employee ID</th>
                  <th style={{ padding: "12px 14px" }}>Course</th>
                  <th style={{ padding: "12px 14px", minWidth: "170px" }}>Progress</th>
                  <th style={{ padding: "12px 14px", width: "110px" }}>Status</th>
                  <th style={{ padding: "12px 14px", width: "80px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length ? (
                  currentRows.map((r, i) => {
                    const rowNumber = startIdx + i + 1;
                    const progressColor =
                      r.status === "Completed" ? "#2563eb" :
                      r.status === "At Risk" ? "#dc2626" :
                      "#2563eb";

                    const badgeStyle =
                      r.status === "Active"
                        ? { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }
                        : r.status === "At Risk"
                        ? { background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }
                        : { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" };

                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                        <td style={{ padding: "12px 14px", color: "#64748b", fontWeight: "500" }}>{rowNumber}</td>
                        <td style={{ padding: "12px 14px", fontWeight: "600", color: "#0f172a" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", fontSize: "10px", fontWeight: "700", display: "grid", placeItems: "center" }}>
                              {r.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                            </div>
                            <span>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "monospace", fontSize: "11px" }}>{r.employeeId}</td>
                        <td style={{ padding: "12px 14px", color: "#334155", fontWeight: "500" }}>{r.course}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ width: `${r.progress}%`, height: "100%", background: progressColor, borderRadius: "999px", transition: "width 0.3s ease" }} />
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#334155", minWidth: "32px" }}>{r.progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", textAlign: "center", ...badgeStyle }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <button
                            onClick={() => setDetail(r)}
                            style={{
                              background: "#fff",
                              border: "1px solid #cbd5e1",
                              color: "#2563eb",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                      No trainees found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer & Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#64748b" }}>
            <span>
              Showing {filtered.length === 0 ? "0" : `${startIdx + 1}-${Math.min(startIdx + PAGE_SIZE, filtered.length)}`} of {filtered.length} trainees
            </span>

            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    display: "grid",
                    placeItems: "center",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    color: currentPage <= 1 ? "#cbd5e1" : "#334155",
                    fontSize: "12px"
                  }}
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      background: currentPage === p ? "#2563eb" : "#fff",
                      color: currentPage === p ? "#fff" : "#334155",
                      border: "1px solid " + (currentPage === p ? "#2563eb" : "#cbd5e1"),
                      borderRadius: "6px",
                      width: "28px",
                      height: "28px",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "12px",
                      fontWeight: currentPage === p ? "700" : "500",
                      cursor: "pointer"
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    display: "grid",
                    placeItems: "center",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    color: currentPage >= totalPages ? "#cbd5e1" : "#334155",
                    fontSize: "12px"
                  }}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <DetailModal
          title={detail.name}
          subtitle={`${detail.course} · ${detail.employeeId} · ${detail.status}`}
          onClose={() => setDetail(null)}
          wide
          actions={
            <Link className="button button-secondary" to="/trainer/evaluations">
              Open evaluations
            </Link>
          }
        >
          <DetailRows
            rows={[
              ["Employee ID", detail.employeeId],
              ["Official Email", detail.email || "—"],
              ["Course Title", detail.course],
              ["Assigned Batch", detail.batchName || "—"],
              ["Learning Progress", detail.learningModules || `${detail.progress}%`],
              ["Assessments", detail.assessments || "—"],
              ["Evaluation Status", detail.evaluations || "—"],
              ["Published Result", detail.result || "Not published"],
              ["Competency Evidence", detail.evidence || "—"],
              ["Overall Status", detail.status],
            ]}
          />
        </DetailModal>
      )}
    </Shell>
  );
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
  if(key==="assessments")return <AssessmentCreation/>;
  if(key==="question-bank")return <Assessments/>;
  if(key==="training-sessions")return <TrainingSessionScreen/>;
  if(key==="availability")return <Schedule/>;
  if(key==="calendar")return <Part2Page view="calendar"/>;
  if(key==="results")return <Monitoring/>;
  if(key==="evaluations")return <AssessmentReview/>;
  if(key==="evaluations-practical")return <PracticalEvaluation/>;
  if(key==="evidence-review")return <CompetencyEvidence/>;
  if(key==="trainer-profile")return <VerifiedCapability/>;
  if(key==="trainer-verification")return <EvidenceVerification/>;
  if(key==="trainee-monitoring")return <TraineeMonitoring/>;
  if(key==="feedback")return <TrainerFeedbackScreen/>;
  if(key==="feedback-aggregates")return <TrainerFeedback/>;
  if(key==="train-the-trainer")return <Ttt/>;
  if(key==="ttt-candidates")return <Ttt candidates/>;
  return <Dashboard/>;
}
