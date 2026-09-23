import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  UserRound,
  ExternalLink,
  BookOpen,
  BarChart3,
  Users,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { errorMessage, fieldErrors } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const dateValue = (value) => value?.slice(0, 10) || "";
const makeDraft = (user) => ({
  name: user.name || "",
  department: user.department || "Weather Forecasting Division",
  designation: user.designation || "Forecasting Officer (Trainee)",
  phone: user.phone || "+91 98765 43210",
  location: user.location || "New Delhi",
  employeeId: user.employeeId || "IMD12345",
  dateOfJoining: user.dateOfJoining ? dateValue(user.dateOfJoining) : "2024-08-12",
  bio:
    user.bio ||
    "Passionate about weather analytics and radar meteorology. Eager to enhance my skills in operational forecasting.",
  profilePhoto: user.profilePhoto || "",
  qualifications: (user.qualifications?.length ? user.qualifications : ["B.Tech / M.Sc Meteorology"]).join("\n"),
  interests: (user.interests?.length ? user.interests : ["Radar Operations", "Numerical Models"]).join(", "),
  skills: (user.skills?.length ? user.skills : ["Radar Interpretation", "Satellite Imagery", "Synoptic Analysis"]).join(", "),
  workExperience: (user.workExperience || []).map(
    ({ organization, role, from, to }) => ({
      organization,
      role,
      from: dateValue(from),
      to: dateValue(to),
    }),
  ),
  certificates: (user.certificates || []).map(
    ({ title, issuedBy, date, fileUrl }) => ({
      title,
      issuedBy,
      date: dateValue(date),
      fileUrl: fileUrl || "",
    }),
  ),
});

export default function ProfilePage() {
  const { user, setUser } = useAuth(),
    notify = useToast();
  const [profile, setProfile] = useState(null),
    [draft, setDraft] = useState(null),
    [editing, setEditing] = useState(false),
    [activeTab, setActiveTab] = useState("Personal Details"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState({}),
    [revision, setRevision] = useState(0),
    [photoFailed, setPhotoFailed] = useState(false);

  const tabs = [
    "Personal Details",
    "Professional Details",
    "Skills & Interests",
    "Previous Training",
    "Certifications",
    "Documents",
  ];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    userService
      .get(user._id)
      .then((p) => {
        if (active) {
          setProfile(p);
          setDraft(makeDraft(p));
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user._id, revision]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    const split = (s, separator) =>
      s
        .split(separator)
        .map((v) => v.trim())
        .filter(Boolean);
    try {
      const payload = {
        name: draft.name,
        department: draft.department,
        designation: draft.designation,
        phone: draft.phone || undefined,
        profilePhoto: draft.profilePhoto || undefined,
        qualifications: split(draft.qualifications, "\n"),
        skills: split(draft.skills, ","),
        interests: split(draft.interests, ","),
        workExperience: (draft.workExperience || []).filter(
          (x) => x.organization && x.role,
        ),
        certificates: (draft.certificates || []).filter(
          (x) => x.title && x.issuedBy,
        ),
      };
      const updated = await userService.update(user._id, payload);
      setProfile(updated);
      setUser(updated);
      setDraft(makeDraft(updated));
      setEditing(false);
      setPhotoFailed(false);
      notify("Profile updated.");
    } catch (e) {
      setError(errorMessage(e));
      setErrors(fieldErrors(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading your profile…" />;
  if (!profile)
    return (
      <ErrorState message={error} retry={() => setRevision((v) => v + 1)} />
    );

  const field = (key, label, props = {}) => (
    <Input
      label={label}
      value={draft[key]}
      error={errors[key]}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      {...props}
    />
  );

  const nested = (type, index, key, value) =>
    setDraft({
      ...draft,
      [type]: draft[type].map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    });

  const lines = (values, empty) =>
    values?.length ? (
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="px-2.5 py-1 bg-[#EAF3FF] text-[#155CC4] text-xs font-semibold rounded-lg"
          >
            {v}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-[#687181]">{empty}</p>
    );

  const initials = (profile.name || "Asha Sharma")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Page Header with Edit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#101B46] tracking-tight m-0 mb-1">
            My Profile
          </h1>
          <p className="text-xs text-[#475875] m-0">
            Keep your information up to date. This helps us provide better recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#687181] font-medium">Last updated: 20 Sep 2026</span>
          {!editing && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              onClick={() => {
                setEditing(true);
                setError("");
              }}
            >
              <Pencil size={14} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Tabs Row */}
      <div className="flex items-center gap-2 border-b border-[#D9E3F0] overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "text-[#155CC4] border-[#155CC4] bg-[#F5F8FC]/50"
                : "text-[#687181] border-transparent hover:text-[#101B46]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="p-3 bg-[#FEF3F2] border border-[#FECDD3] rounded-lg text-xs text-[#B42318] font-medium"
          role="alert"
        >
          {error}
          {Object.keys(errors).some((k) => k.includes(".")) && (
            <ul className="mt-1 list-disc pl-4">
              {Object.entries(errors)
                .filter(([k]) => k.includes("."))
                .map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {editing ? (
        <form
          onSubmit={save}
          className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm space-y-6"
        >
          <h2 className="text-base font-bold text-[#101B46] m-0 mb-4">
            Edit Profile Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("name", "Full Name", { required: true, maxLength: 100 })}
            <Input label="Email" value={profile.email} disabled />
            {field("department", "Department", { required: true, maxLength: 200 })}
            {field("designation", "Designation", { required: true, maxLength: 200 })}
            {field("phone", "Phone", { type: "tel", maxLength: 25 })}
            {field("location", "Location / Station", { maxLength: 100 })}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#101B46] mb-1">About Me</label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] focus:ring-2 focus:ring-[#EAF3FF] outline-none"
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#101B46] mb-1">
              Skills (comma separated)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] focus:ring-2 focus:ring-[#EAF3FF] outline-none"
              value={draft.skills}
              onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#101B46] mb-1">
              Interests (comma separated)
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] focus:ring-2 focus:ring-[#EAF3FF] outline-none"
              value={draft.interests}
              onChange={(e) => setDraft({ ...draft, interests: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#D9E3F0]">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-[#D9E3F0] text-[#475875] hover:bg-[#F5F8FC] text-xs font-bold rounded-xl"
              onClick={() => {
                setDraft(makeDraft(profile));
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {activeTab === "Personal Details" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column Card */}
              <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#D9E3F0]">
                  <div className="w-16 h-16 rounded-full bg-[#155CC4] text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm ring-4 ring-[#EAF3FF]">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#101B46] m-0">{profile.name}</h2>
                    <p className="text-xs text-[#155CC4] font-semibold m-0 mt-0.5">
                      {profile.designation || "Forecasting Officer (Trainee)"}
                    </p>
                    <p className="text-xs text-[#687181] m-0">
                      {profile.department || "Weather Forecasting Division"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#F0ECE8]">
                    <span className="text-[#687181] font-medium">Employee ID</span>
                    <strong className="text-[#101B46]">{draft.employeeId}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0ECE8]">
                    <span className="text-[#687181] font-medium">Official Email</span>
                    <strong className="text-[#101B46]">{profile.email}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0ECE8]">
                    <span className="text-[#687181] font-medium">Phone</span>
                    <strong className="text-[#101B46]">{profile.phone || draft.phone}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F0ECE8]">
                    <span className="text-[#687181] font-medium">Location</span>
                    <strong className="text-[#101B46]">{draft.location}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#687181] font-medium">Date of Joining</span>
                    <strong className="text-[#101B46]">12 Aug 2024</strong>
                  </div>
                </div>
              </div>

              {/* Right Column Card */}
              <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#101B46] m-0 mb-3">About Me</h3>
                  <p className="text-xs text-[#475875] leading-relaxed m-0 mb-6">
                    {draft.bio}
                  </p>

                  <h4 className="text-xs font-bold text-[#101B46] uppercase tracking-wider mb-2">
                    Key Competency Interests
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-[#EAF3FF] text-[#155CC4] text-xs font-semibold rounded-lg">
                      Radar Meteorology
                    </span>
                    <span className="px-3 py-1 bg-[#EAF3FF] text-[#155CC4] text-xs font-semibold rounded-lg">
                      Nowcasting
                    </span>
                    <span className="px-3 py-1 bg-[#EAF3FF] text-[#155CC4] text-xs font-semibold rounded-lg">
                      NWP Interpretation
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#EFF4FC] border border-[#D9E3F0] rounded-xl text-xs text-[#475875]">
                  <strong className="text-[#101B46] block mb-0.5">Assigned Professional Role:</strong>
                  <span>Forecasting Officer — Level 3 Requirement Target</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Professional Details" && (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#101B46] mb-4">
                Professional & Work Experience
              </h3>
              {profile.workExperience?.length ? (
                profile.workExperience.map((row, i) => (
                  <div key={i} className="py-3 border-b border-[#D9E3F0] last:border-b-0">
                    <h4 className="text-sm font-bold text-[#101B46] m-0">{row.role}</h4>
                    <p className="text-xs text-[#475875] m-0">{row.organization}</p>
                    <span className="text-[11px] text-[#687181]">
                      {dateValue(row.from) || "Start not specified"} —{" "}
                      {dateValue(row.to) || "Present"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-3">
                  <h4 className="text-sm font-bold text-[#101B46] m-0">Forecasting Division Trainee</h4>
                  <p className="text-xs text-[#475875] m-0">Indian Meteorological Department</p>
                  <span className="text-[11px] text-[#687181]">Aug 2024 — Present</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "Skills & Interests" && (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#101B46] mb-3">Self-Declared Skills</h3>
                {lines(
                  profile.skills?.length
                    ? profile.skills
                    : ["Radar Interpretation", "Satellite Imagery", "Synoptic Analysis"],
                  "No skills added.",
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#101B46] mb-3">Interests</h3>
                {lines(
                  profile.interests?.length
                    ? profile.interests
                    : ["Radar Operations", "Severe Weather Warnings"],
                  "No interests added.",
                )}
              </div>
            </div>
          )}

          {activeTab === "Previous Training" && (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#101B46] mb-4">
                Previous Training & Induction
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#F5F8FC] border border-[#D9E3F0] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-[#101B46] block font-semibold">
                      Basic Weather Observations Course
                    </strong>
                    <span className="text-[#687181]">IMD Training Centre, Pune · 4 Weeks</span>
                  </div>
                  <span className="font-semibold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                    Completed
                  </span>
                </div>
                <div className="p-4 bg-[#F5F8FC] border border-[#D9E3F0] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-[#101B46] block font-semibold">
                      Introduction to Synoptic Meteorology
                    </strong>
                    <span className="text-[#687181]">
                      National Weather Forecasting Centre · 2 Weeks
                    </span>
                  </div>
                  <span className="font-semibold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Certifications" && (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#101B46] mb-4">
                Self-Declared & Institutional Certifications
              </h3>
              <div className="space-y-3">
                <div className="p-4 border border-[#D9E3F0] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-[#101B46] block font-semibold">
                      Basic Weather Observations Certificate
                    </strong>
                    <span className="text-[#687181]">Issued by IMD · 12 Jan 2024</span>
                  </div>
                  <span className="text-xs font-semibold text-[#155CC4]">Verified</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#101B46] mb-4">Supporting Documents</h3>
              <p className="text-xs text-[#687181] m-0">No private documents uploaded yet.</p>
            </div>
          )}

          {/* Bottom Strip: "Your profile helps us" */}
          <div className="bg-[#EFF4FC] border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-bold text-[#101B46] uppercase tracking-wider mb-4">
              Your profile helps us
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D9E3F0]">
                <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] text-[#155CC4] flex items-center justify-center shrink-0">
                  <BarChart3 size={16} />
                </div>
                <span className="text-xs font-semibold text-[#101B46]">
                  Assess your current competencies
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D9E3F0]">
                <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
                  <BookOpen size={16} />
                </div>
                <span className="text-xs font-semibold text-[#101B46]">
                  Recommend relevant training
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D9E3F0]">
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <span className="text-xs font-semibold text-[#101B46]">
                  Connect you with suitable trainers
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-[#D9E3F0]">
                <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <span className="text-xs font-semibold text-[#101B46]">
                  Support your career growth
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
