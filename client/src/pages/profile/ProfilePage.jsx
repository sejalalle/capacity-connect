import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UserRound, ExternalLink } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { errorMessage, fieldErrors } from "../../services/api";
import { useToast } from "../../components/ui/Toast";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
const dateValue = (value) => value?.slice(0, 10) || "";
const makeDraft = (user) => ({
  name: user.name,
  department: user.department || "",
  designation: user.designation || "",
  phone: user.phone || "",
  profilePhoto: user.profilePhoto || "",
  qualifications: (user.qualifications || []).join("\n"),
  interests: (user.interests || []).join(", "),
  skills: (user.skills || []).join(", "),
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
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState({}),
    [revision, setRevision] = useState(0),
    [photoFailed, setPhotoFailed] = useState(false);
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
      const updated = await userService.update(user._id, {
        ...draft,
        qualifications: split(draft.qualifications, "\n"),
        skills: split(draft.skills, ","),
        interests: split(draft.interests, ","),
      });
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
      <div className="tags">
        {values.map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>
    ) : (
      <p className="muted">{empty}</p>
    );
  return (
    <>
      <PageHeader
        eyebrow="PROFESSIONAL IDENTITY"
        title="My profile"
        description="Access role controls permissions. Designation is your proposed professional role; self-declared skills and certificate links do not verify competency."
        action={
          !editing && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(true);
                setError("");
              }}
            >
              <Pencil size={16} />
              Edit Profile
            </Button>
          )
        }
      />
      <div className="profile-summary card">
        <div className="profile-avatar">
          {profile.profilePhoto && !photoFailed ? (
            <img
              src={profile.profilePhoto}
              alt={`${profile.name}'s profile`}
              onError={() => setPhotoFailed(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserRound size={36} />
          )}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p className="muted">
            {profile.designation || "Designation not added"} ·{" "}
            {profile.department || "Department not added"}
          </p>
          <div className="flex gap-3 items-center mt-2">
            <span className="role-label">{profile.role}</span>
            <StatusBadge status={profile.accountStatus} />
          </div>
        </div>
      </div>
      <nav className="profile-tabs" aria-label="Profile sections">
        <span aria-current="page">Professional Profile</span>
      </nav>
      {error && (
        <div className="error-banner mb-6" role="alert">
          {error}
          {Object.keys(errors).some((k) => k.includes(".")) && (
            <ul>
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
        <form onSubmit={save}>
          <fieldset disabled={busy} className="profile-fieldset">
            <Card title="Professional Information">
              <div className="form-grid">
                {field("name", "Full Name", { required: true, maxLength: 100 })}
                <Input label="Email" value={profile.email} disabled />
                {field("department", "Department", {
                  required: true,
                  maxLength: 200,
                })}
                {field("designation", "Designation", {
                  required: true,
                  maxLength: 200,
                })}
                {field("phone", "Phone", { type: "tel", maxLength: 25 })}
                {field("profilePhoto", "Profile photo URL", {
                  type: "url",
                  placeholder: "https://…",
                  hint: "Use a publicly accessible image URL.",
                })}
              </div>
            </Card>
            <Card title="Qualifications" className="mt-6">
              <label className="field">
                Qualifications (one per line)
                <textarea
                  rows="3"
                  value={draft.qualifications}
                  onChange={(e) =>
                    setDraft({ ...draft, qualifications: e.target.value })
                  }
                />
              </label>
            </Card>
            <Card title="Experience" className="mt-6">
              {draft.workExperience.map((row, i) => (
                <div className="repeating-row" key={i}>
                  <div className="form-grid">
                    {[
                      ["organization", "Organization", "text"],
                      ["role", "Role", "text"],
                      ["from", "From", "date"],
                      ["to", "To (leave blank if current)", "date"],
                    ].map(([key, label, type]) => (
                      <Input
                        key={key}
                        label={label}
                        type={type}
                        required={type === "text"}
                        value={row[key]}
                        error={errors[`workExperience.${i}.${key}`]}
                        onChange={(e) =>
                          nested("workExperience", i, key, e.target.value)
                        }
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        workExperience: draft.workExperience.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                    Remove experience {i + 1}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={draft.workExperience.length >= 30}
                onClick={() =>
                  setDraft({
                    ...draft,
                    workExperience: [
                      ...draft.workExperience,
                      { organization: "", role: "", from: "", to: "" },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add experience
              </Button>
            </Card>
            <Card title="Self-declared Skills & Interests" className="mt-6">
              <div className="form-grid">
                {field("skills", "Skills", {
                  hint: "Separate skills with commas.",
                })}
                {field("interests", "Interests", {
                  hint: "Separate interests with commas.",
                })}
              </div>
            </Card>
            <Card
              title="Self-declared certificates (unreviewed)"
              className="mt-6"
            >
              {draft.certificates.map((row, i) => (
                <div className="repeating-row" key={i}>
                  <div className="form-grid">
                    {[
                      ["title", "Certificate title", "text"],
                      ["issuedBy", "Issued by", "text"],
                      ["date", "Issue date", "date"],
                      ["fileUrl", "Certificate URL", "url"],
                    ].map(([key, label, type]) => (
                      <Input
                        key={key}
                        label={label}
                        type={type}
                        required={type === "text"}
                        value={row[key]}
                        error={errors[`certificates.${i}.${key}`]}
                        onChange={(e) =>
                          nested("certificates", i, key, e.target.value)
                        }
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        certificates: draft.certificates.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  >
                    <Trash2 size={15} />
                    Remove certificate {i + 1}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={draft.certificates.length >= 30}
                onClick={() =>
                  setDraft({
                    ...draft,
                    certificates: [
                      ...draft.certificates,
                      { title: "", issuedBy: "", date: "", fileUrl: "" },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add certificate
              </Button>
            </Card>
            <div className="profile-save">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft(makeDraft(profile));
                  setEditing(false);
                  setError("");
                  setErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save changes
              </Button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div className="profile-grid">
          <div>
            <Card title="Professional Information">
              <dl className="details">
                {[
                  ["Full Name", profile.name],
                  ["Email", profile.email],
                  ["Department", profile.department],
                  ["Designation", profile.designation],
                  ["Phone", profile.phone],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "Not added"}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Experience" className="mt-6">
              {profile.workExperience.length ? (
                profile.workExperience.map((row, i) => (
                  <div key={i} className="profile-entry">
                    <h3>{row.role}</h3>
                    <p>{row.organization}</p>
                    <small className="muted">
                      {dateValue(row.from) || "Start not specified"} —{" "}
                      {dateValue(row.to) || "Present"}
                    </small>
                  </div>
                ))
              ) : (
                <p className="muted">No work experience added yet.</p>
              )}
            </Card>
            <Card
              title="Self-declared certificates (unreviewed)"
              className="mt-6"
            >
              {profile.certificates.length ? (
                profile.certificates.map((row, i) => (
                  <div key={i} className="profile-entry">
                    <h3>{row.title}</h3>
                    <p className="muted">
                      {row.issuedBy} ·{" "}
                      {dateValue(row.date) || "Date not specified"}
                    </p>
                    {row.fileUrl && (
                      <a
                        className="text-button"
                        href={row.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View certificate <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted">No certificates added yet.</p>
              )}
            </Card>
          </div>
          <div>
            <Card title="Qualifications">
              {lines(profile.qualifications, "No qualifications added yet.")}
            </Card>
            <Card title="Self-declared skills" className="mt-6">
              {lines(profile.skills, "No skills added yet.")}
            </Card>
            <Card title="Interests" className="mt-6">
              {lines(profile.interests, "No interests added yet.")}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
