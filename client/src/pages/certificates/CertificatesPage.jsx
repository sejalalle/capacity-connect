import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import api, { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
export default function CertificatesPage() {
  const { user } = useAuth(),
    toast = useToast();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [enrollment, setEnrollment] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState({});
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await part3.get("/certificates"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function action(path, body) {
    setBusy(true);
    try {
      await part3.post(path, body);
      toast("Certificate record saved");
      await load();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function download(row) {
    setBusy(true);
    try {
      const response = await api.get(`/part3/certificates/${row._id}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.certificateId}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(
        "Unable to download this certificate. Refresh to check its current status.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Course-completion Certificates"
        description="Issued against configured course conditions. Completion certificates do not establish demonstrated competency."
      />
      {error ? (
        <div role="alert" className="error-banner">
          {error}
          <Button onClick={load}>Retry</Button>
        </div>
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {user.role !== "trainee" && (
            <Card title="Issue a completion certificate">
              <form
                className="auth-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  action("/certificates/issue", { enrollment });
                }}
              >
                <label>
                  Confirmed enrollment
                  <select
                    required
                    value={enrollment}
                    onChange={(e) => setEnrollment(e.target.value)}
                  >
                    <option value="">Select participant and batch</option>
                    {data.enrollments.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.trainee?.name} · {e.batch?.name} ·{" "}
                        {e.batch?.course?.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  The batch’s pinned rules must enable certificates. All
                  configured conditions are checked by the server.
                </p>
                <Button type="submit" disabled={!enrollment} loading={busy}>
                  Check conditions and issue
                </Button>
              </form>
            </Card>
          )}
          <Card title="Certificate records">
            {!data.certificates.length ? (
              <EmptyState
                title="No certificates issued"
                description="An authorized publisher can issue a certificate after the configured completion conditions are satisfied."
              />
            ) : (
              data.certificates.map((row) => (
                <article key={row._id} className="activity-item">
                  <strong>{row.courseTitle}</strong>
                  <p>
                    {row.traineeName} · {row.batchName}
                  </p>
                  <StatusBadge status={row.status} />
                  <p>{row.certificateId}</p>
                  {row.status === "ISSUED" && (
                    <Button loading={busy} onClick={() => download(row)}>
                      Download PDF
                    </Button>
                  )}
                  <details>
                    <summary>Issuance history</summary>
                    {row.history.map((h, i) => (
                      <p key={i}>
                        {h.action} · {new Date(h.at).toLocaleDateString()} ·{" "}
                        {h.reason}
                      </p>
                    ))}
                  </details>
                  {user.role === "admin" && row.status === "ISSUED" && (
                    <form
                      className="auth-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        action(`/certificates/${row._id}/revoke`, {
                          reason: reason[row._id],
                        });
                      }}
                    >
                      <label>
                        Revocation reason
                        <input
                          required
                          minLength={4}
                          maxLength={2000}
                          value={reason[row._id] || ""}
                          onChange={(e) =>
                            setReason({ ...reason, [row._id]: e.target.value })
                          }
                        />
                      </label>
                      <Button type="submit" loading={busy} variant="secondary">
                        Revoke certificate
                      </Button>
                    </form>
                  )}
                </article>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
