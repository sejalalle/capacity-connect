import { useCallback, useState } from "react";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { userService } from "../../services/userService";
import { errorMessage } from "../../services/api";
export default function UserTable({ users, refresh }) {
  const [selection, setSelection] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(null);
  const notify = useToast();
  const close = useCallback(() => {
    if (!busy) {
      setSelection(null);
      setError("");
    }
  }, [busy]);
  const closeProfile = useCallback(() => setProfile(null), []);
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
              <button className="table-user" onClick={() => setProfile(u)}>
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
        </Modal>
      )}
    </>
  );
}
