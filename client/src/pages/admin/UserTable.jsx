import { useCallback, useEffect, useState } from "react";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";
import { userService } from "../../services/userService";
import { part2 } from "../../services/part2Service";
import { errorMessage } from "../../services/api";
export default function UserTable({ users, refresh }) {
  const [selection, setSelection] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(null),
    [roles, setRoles] = useState([]),
    [roleDraft, setRoleDraft] = useState(""),
    [roleBusy, setRoleBusy] = useState(false),
    [roleError, setRoleError] = useState(""),
    [courses, setCourses] = useState([]),
    [competencies, setCompetencies] = useState([]),
    [completions, setCompletions] = useState(null),
    [recordDraft, setRecordDraft] = useState({
      course: "",
      completedAt: "",
      sourceReference: "",
    }),
    [baselineDraft, setBaselineDraft] = useState({
      competency: "",
      demonstratedLevel: "",
      sourceReference: "",
    }),
    [recordBusy, setRecordBusy] = useState(false),
    [recordError, setRecordError] = useState("");
  const notify = useToast();
  useEffect(() => {
    let active = true;
    Promise.all([
      part2.get("/job-roles"),
      part2.get("/courses", { limit: 50 }),
      part2.get("/competencies", { limit: 50 }),
    ])
      .then(([roleRows, courseRows, competencyRows]) => {
        if (!active) return;
        setRoles(roleRows);
        setCourses(courseRows?.items || courseRows || []);
        setCompetencies(competencyRows?.items || competencyRows || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const roleTitle = (id) =>
    roles.find((r) => r._id === (id?._id || id))?.title || "—";
  const close = useCallback(() => {
    if (!busy) {
      setSelection(null);
      setError("");
    }
  }, [busy]);
  const closeProfile = useCallback(() => {
    setProfile(null);
    setRoleError("");
    setRecordError("");
    setCompletions(null);
  }, []);
  const loadCompletions = useCallback((id) => {
    part2
      .get(`/trainees/${id}/course-completions`)
      .then((rows) => setCompletions(Array.isArray(rows) ? rows : []))
      .catch(() => setCompletions([]));
  }, []);
  async function assignRole() {
    setRoleBusy(true);
    setRoleError("");
    try {
      const updated = await userService.jobRole(profile._id, roleDraft || null);
      notify(roleDraft ? "Professional role assigned." : "Professional role cleared.");
      setProfile(updated);
      refresh();
    } catch (e) {
      setRoleError(errorMessage(e));
    } finally {
      setRoleBusy(false);
    }
  }
  async function recordTraining() {
    setRecordBusy(true);
    setRecordError("");
    try {
      await part2.post(`/trainees/${profile._id}/course-completions`, {
        course: recordDraft.course,
        ...(recordDraft.completedAt && { completedAt: recordDraft.completedAt }),
        sourceReference: recordDraft.sourceReference,
      });
      notify("Previous training recorded.");
      setRecordDraft({ course: "", completedAt: "", sourceReference: "" });
      loadCompletions(profile._id);
    } catch (e) {
      setRecordError(errorMessage(e));
    } finally {
      setRecordBusy(false);
    }
  }
  async function recordBaseline() {
    setRecordBusy(true);
    setRecordError("");
    try {
      await part2.post(`/competency-records/${profile._id}/baseline`, {
        competency: baselineDraft.competency,
        demonstratedLevel: Number(baselineDraft.demonstratedLevel),
        sourceReference: baselineDraft.sourceReference,
      });
      notify("Baseline level recorded from reviewed evidence.");
      setBaselineDraft({
        competency: "",
        demonstratedLevel: "",
        sourceReference: "",
      });
      refresh();
    } catch (e) {
      setRecordError(errorMessage(e));
    } finally {
      setRecordBusy(false);
    }
  }
  async function changeStatus() {
    setBusy(true);
    setError("");
    try {
      await userService.status(selection.user._id, selection.status);
      notify(`Account ${selection.status}.`);
      setSelection(null);
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const action = (user, status, label) => (
    <Button
      key={status}
      variant={status === "approved" ? "secondary" : "quiet"}
      onClick={() => {
        setSelection({ user, status });
        setError("");
      }}
    >
      {label}
    </Button>
  );
  return (
    <>
      <Table
        caption="Registered platform users"
        rows={users}
        columns={[
          {
            key: "name",
            label: "User",
            render: (u) => (
              <button
                className="table-user"
                onClick={() => {
                  setProfile(u);
                  setRoleDraft(u.jobRole?._id || u.jobRole || "");
                  setRoleError("");
                  setRecordError("");
                  setCompletions(null);
                  loadCompletions(u._id);
                }}
              >
                <span className="avatar">{u.name[0]}</span>
                <span>
                  <strong>{u.name}</strong>
                  <small>{u.email}</small>
                </span>
              </button>
            ),
          },
          {
            key: "role",
            label: "Role",
            render: (u) => <span className="capitalize">{u.role}</span>,
          },
          {
            key: "jobRole",
            label: "Professional role",
            render: (u) =>
              u.jobRole ? (
                <span>{roleTitle(u.jobRole)}</span>
              ) : (
                <span className="muted text-xs">Not assigned</span>
              ),
          },
          { key: "department", label: "Department" },
          {
            key: "accountStatus",
            label: "Status",
            render: (u) => <StatusBadge status={u.accountStatus} />,
          },
          {
            key: "actions",
            label: "Actions",
            render: (u) => (
              <div className="table-actions">
                {u.role === "admin" ? (
                  <span className="muted text-xs">Protected account</span>
                ) : u.accountStatus === "pending" ? (
                  <>
                    {action(u, "approved", "Approve")}
                    {action(u, "rejected", "Reject")}
                  </>
                ) : u.accountStatus === "approved" ? (
                  action(u, "suspended", "Suspend")
                ) : (
                  <span className="muted text-xs">No further actions</span>
                )}
              </div>
            ),
          },
        ]}
      />
      {selection && (
        <Modal
          title={`${selection.status === "approved" ? "Approve" : selection.status === "rejected" ? "Reject" : "Suspend"} account`}
          onClose={close}
        >
          <p>
            Update access for <strong>{selection.user.name}</strong> (
            {selection.user.email})?
          </p>
          <p className="muted mt-4">
            {selection.status === "approved"
              ? "This user will be able to sign in to their role workspace."
              : "This user will not be able to sign in. Reinstatement is not supported in this release."}
          </p>
          {error && (
            <p className="error-banner mt-4" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button loading={busy} onClick={changeStatus}>
              Confirm{" "}
              {selection.status === "approved"
                ? "approval"
                : selection.status === "rejected"
                  ? "rejection"
                  : "suspension"}
            </Button>
          </div>
        </Modal>
      )}
      {profile && (
        <Modal title="User profile" onClose={closeProfile}>
          <h3>{profile.name}</h3>
          <dl className="details">
            {[
              ["Email", profile.email],
              ["Role", profile.role],
              ["Department", profile.department],
              ["Designation", profile.designation],
              ["Phone", profile.phone],
              ["Qualifications", profile.qualifications?.join(", ")],
              ["Skills", profile.skills?.join(", ")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
          <StatusBadge status={profile.accountStatus} />
          <div className="mt-4 border-t pt-4">
            <Select
              label="Professional role"
              value={roleDraft}
              disabled={profile.role === "admin"}
              onChange={(e) => setRoleDraft(e.target.value)}
            >
              <option value="">No professional role</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title}
                </option>
              ))}
            </Select>
            <p className="muted text-xs mt-2">
              Competency requirements are mapped against this role. It is
              separate from the application access role, and changing it never
              changes a recorded competency level.
            </p>
            {roleError && (
              <p className="error-banner mt-2" role="alert">
                {roleError}
              </p>
            )}
            <div className="modal-actions">
              <Button
                loading={roleBusy}
                disabled={profile.role === "admin"}
                onClick={assignRole}
              >
                Save professional role
              </Button>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <h4>Previous training</h4>
            <p className="muted text-xs">
              Historical evidence only. A recorded completion never sets a
              competency level on its own.
            </p>
            {completions === null ? (
              <p className="muted text-xs">Loading records…</p>
            ) : completions.length ? (
              <ul className="text-xs">
                {completions.map((row) => (
                  <li key={row._id}>
                    {row.course?.title || "Course no longer available"}
                    {row.completedAt
                      ? ` · ${String(row.completedAt).slice(0, 10)}`
                      : ""}
                    {row.sourceReference ? ` · ${row.sourceReference}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted text-xs">No previous training recorded.</p>
            )}
            <Select
              label="Course"
              value={recordDraft.course}
              onChange={(e) =>
                setRecordDraft({ ...recordDraft, course: e.target.value })
              }
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Input
              label="Completed on"
              type="date"
              value={recordDraft.completedAt}
              onChange={(e) =>
                setRecordDraft({ ...recordDraft, completedAt: e.target.value })
              }
            />
            <Input
              label="Source reference"
              value={recordDraft.sourceReference}
              onChange={(e) =>
                setRecordDraft({
                  ...recordDraft,
                  sourceReference: e.target.value,
                })
              }
            />
            <div className="modal-actions">
              <Button
                loading={recordBusy}
                disabled={
                  !recordDraft.course || !recordDraft.sourceReference.trim()
                }
                onClick={recordTraining}
              >
                Record previous training
              </Button>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <h4>Baseline level</h4>
            <p className="muted text-xs">
              A coordinator records a reviewed level from historical evidence.
              This is a human record, not an assessment score.
            </p>
            <Select
              label="Competency"
              value={baselineDraft.competency}
              onChange={(e) =>
                setBaselineDraft({
                  ...baselineDraft,
                  competency: e.target.value,
                  demonstratedLevel: "",
                })
              }
            >
              <option value="">Select a competency</option>
              {competencies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Reviewed level"
              value={baselineDraft.demonstratedLevel}
              disabled={!baselineDraft.competency}
              onChange={(e) =>
                setBaselineDraft({
                  ...baselineDraft,
                  demonstratedLevel: e.target.value,
                })
              }
            >
              <option value="">Select a level</option>
              {(
                competencies.find((c) => c._id === baselineDraft.competency)
                  ?.levels || []
              ).map((level) => (
                <option key={level.value} value={level.value}>
                  L{level.value} — {level.label}
                </option>
              ))}
            </Select>
            <Input
              label="Evidence reference"
              value={baselineDraft.sourceReference}
              onChange={(e) =>
                setBaselineDraft({
                  ...baselineDraft,
                  sourceReference: e.target.value,
                })
              }
            />
            {recordError && (
              <p className="error-banner mt-2" role="alert">
                {recordError}
              </p>
            )}
            <div className="modal-actions">
              <Button
                loading={recordBusy}
                disabled={
                  !baselineDraft.competency ||
                  !baselineDraft.demonstratedLevel ||
                  !baselineDraft.sourceReference.trim()
                }
                onClick={recordBaseline}
              >
                Record baseline level
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
