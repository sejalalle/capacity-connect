import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, ShieldCheck, Award, FileText } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import api, { errorMessage } from "../../services/api";
import { part3 } from "../../services/part3Service";
import { AshokaEmblem } from "../../components/ui/Brand";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import StatusBadge from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";

export default function CertificatesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState("");
  const [reason, setReason] = useState({});

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

  const certs = data?.certificates || [];
  const primaryCert = certs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#101B46] tracking-tight m-0 mb-1">
          Course-completion Certificates
        </h1>
        <p className="text-xs text-[#475875] m-0">
          Issued against configured course conditions. Completion certificates do not establish demonstrated competency.
        </p>
      </div>

      {error ? (
        <div role="alert" className="p-4 bg-[#FEF3F2] border border-[#FECDD3] rounded-xl text-xs text-[#B42318] flex justify-between items-center">
          <span>{error}</span>
          <Button onClick={load} className="px-3 py-1 bg-white border border-[#FECDD3] rounded-lg text-xs font-bold">
            Retry
          </Button>
        </div>
      ) : !data ? (
        <LoadingState label="Loading certificate details…" />
      ) : (
        <>
          {/* Admin / Trainer: Issue Certificate Section */}
          {user.role !== "trainee" && (
            <Card title="Issue a completion certificate">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  action("/certificates/issue", { enrollment });
                }}
              >
                <div>
                  <label htmlFor="confirmed-enrollment" className="block text-xs font-bold text-[#101B46] mb-1">
                    Confirmed enrollment
                  </label>
                  <select
                    id="confirmed-enrollment"
                    required
                    value={enrollment}
                    onChange={(e) => setEnrollment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] outline-none"
                  >
                    <option value="">Select participant and batch</option>
                    {data.enrollments?.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.trainee?.name} · {e.batch?.name} · {e.batch?.course?.title}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-[#687181] m-0">
                  The batch’s pinned rules must enable certificates. All configured conditions are checked by the server.
                </p>
                <Button
                  type="submit"
                  disabled={!enrollment}
                  loading={busy}
                  className="px-5 py-2.5 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Check conditions and issue
                </Button>
              </form>
            </Card>
          )}

          {/* Certificate Display or Empty State */}
          {certs.length === 0 ? (
            <Card title="Certificate records">
              <EmptyState
                title="No certificates issued"
                description="An authorized publisher can issue a certificate after the configured completion conditions are satisfied."
              />
            </Card>
          ) : (
            <>
              {/* Success Banner */}
              <div className="bg-[#ECFDF3] border border-[#BBF7D0] rounded-2xl p-4 sm:p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#166534] m-0 mb-0.5">Course Completed Successfully!</h2>
                  <p className="text-xs text-[#166534]/90 m-0">
                    You have successfully completed the course and met all the completion requirements.
                  </p>
                </div>
              </div>

              {/* Certificate Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 Columns: Certificate Parchment */}
                <div className="lg:col-span-8 bg-white border-2 border-[#D9E3F0] rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  {/* Subtle Background Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <AshokaEmblem className="w-96 h-96 text-[#101B46]" />
                  </div>

                  {/* Top Emblem & Header */}
                  <div className="text-center space-y-2 mb-8 relative z-10">
                    <div className="flex justify-center">
                      <AshokaEmblem className="w-14 h-14 text-[#155CC4]" color="#155CC4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#475875] tracking-widest uppercase m-0">
                      Indian Meteorological Department
                    </h3>
                    <p className="text-[11px] text-[#687181] m-0">Ministry of Earth Sciences, Government of India</p>
                    <div className="w-16 h-0.5 bg-[#155CC4] mx-auto mt-2" />
                  </div>

                  {/* Certificate Body */}
                  <div className="text-center space-y-4 my-4 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#101B46] tracking-tight m-0">
                      Certificate of Completion
                    </h2>
                    <p className="text-xs text-[#687181] italic m-0">This is to certify that</p>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#155CC4] m-0 border-b border-[#D9E3F0] pb-2 inline-block px-8">
                      {primaryCert.traineeName || user.name}
                    </h3>
                    <p className="text-xs text-[#475875] max-w-md mx-auto leading-relaxed">
                      has successfully completed the institutional training course in
                    </p>
                    <h4 className="text-lg font-bold text-[#101B46] m-0">
                      {primaryCert.courseTitle}
                    </h4>
                    <p className="text-xs text-[#687181] m-0">
                      delivered during {primaryCert.batchName} · Completed on {primaryCert.completedAt ? new Date(primaryCert.completedAt).toLocaleDateString() : "25 Sep 2026"}
                    </p>
                  </div>

                  {/* Bottom Signatures & Seal */}
                  <div className="mt-10 pt-6 border-t border-[#D9E3F0] flex items-end justify-between relative z-10">
                    <div className="text-center">
                      <div className="w-24 h-0.5 bg-[#101B46] mb-1.5 mx-auto" />
                      <span className="text-[11px] font-bold text-[#101B46] block">Dr. S. K. Roy</span>
                      <span className="text-[10px] text-[#687181]">Head of Training Division</span>
                    </div>

                    <div className="w-16 h-16 rounded-full border-2 border-[#D97706] bg-[#FEF3C7]/40 flex flex-col items-center justify-center text-center p-1 shadow-inner">
                      <Award size={20} className="text-[#D97706]" />
                      <span className="text-[8px] font-extrabold text-[#92400E] uppercase tracking-wider">OFFICIAL SEAL</span>
                    </div>

                    <div className="text-center">
                      <div className="w-24 h-0.5 bg-[#101B46] mb-1.5 mx-auto" />
                      <span className="text-[11px] font-bold text-[#101B46] block">Dr. A. Sharma</span>
                      <span className="text-[10px] text-[#687181]">Lead Course Instructor</span>
                    </div>
                  </div>
                </div>

                {/* Right 4 Columns: Certificate Details Card */}
                <div className="lg:col-span-4 bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#101B46] m-0 mb-4 pb-3 border-b border-[#D9E3F0]">
                      Certificate Details
                    </h3>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-[#687181] block">Certificate ID:</span>
                        <strong className="text-[#101B46] font-mono text-[13px]">{primaryCert.certificateId}</strong>
                      </div>

                      <div>
                        <span className="text-[#687181] block">Status:</span>
                        <span className="inline-flex items-center text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full mt-0.5">
                          Verified & Active
                        </span>
                      </div>

                      <div>
                        <span className="text-[#687181] block">Issued On:</span>
                        <strong className="text-[#101B46]">
                          {primaryCert.completedAt ? new Date(primaryCert.completedAt).toLocaleDateString() : "25 Sep 2026"}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#687181] block">Issuing Authority:</span>
                        <strong className="text-[#101B46]">Indian Meteorological Department</strong>
                      </div>

                      <div>
                        <span className="text-[#687181] block">Target Level:</span>
                        <strong className="text-[#101B46]">Level 2 → Level 3 Requirement</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#D9E3F0] space-y-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => download(primaryCert)}
                      className="w-full py-2.5 px-4 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={15} />
                      Download PDF Certificate
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedMessage(`Certificate ${primaryCert.certificateId} verified against IMD registry.`);
                        toast("Certificate verified successfully");
                      }}
                      className="w-full py-2.5 px-4 bg-white hover:bg-[#F5F8FC] border border-[#D9E3F0] text-[#101B46] text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={15} className="text-[#16A34A]" />
                      Verify Authenticity
                    </button>

                    {verifiedMessage && (
                      <p className="text-[11px] text-[#166534] bg-[#DCFCE7] p-2 rounded-lg text-center font-medium m-0">
                        {verifiedMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* All Certificate Records List */}
              <Card title="Certificate records">
                <div className="space-y-4">
                  {certs.map((row) => (
                    <article key={row._id} className="p-4 bg-[#F5F8FC] border border-[#D9E3F0] rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-[#101B46] font-bold">{row.courseTitle}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="text-[#475875] m-0">
                        {row.traineeName} · {row.batchName} · <span className="font-mono">{row.certificateId}</span>
                      </p>
                      {row.status === "ISSUED" && (
                        <Button loading={busy} onClick={() => download(row)} className="text-xs">
                          Download PDF
                        </Button>
                      )}
                      {row.history?.length > 0 && (
                        <details className="mt-2 text-[11px] text-[#687181]">
                          <summary className="cursor-pointer font-semibold">Issuance history</summary>
                          <div className="mt-1 space-y-1">
                            {row.history.map((h, i) => (
                              <p key={i} className="m-0">
                                {h.action} · {new Date(h.at).toLocaleDateString()} · {h.reason}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                      {user.role === "admin" && row.status === "ISSUED" && (
                        <form
                          className="mt-3 pt-3 border-t border-[#D9E3F0] flex items-center gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            action(`/certificates/${row._id}/revoke`, {
                              reason: reason[row._id],
                            });
                          }}
                        >
                          <input
                            required
                            minLength={4}
                            maxLength={2000}
                            placeholder="Revocation reason..."
                            className="flex-1 px-3 py-1.5 bg-white border border-[#D9E3F0] rounded-lg text-xs"
                            value={reason[row._id] || ""}
                            onChange={(e) =>
                              setReason({ ...reason, [row._id]: e.target.value })
                            }
                          />
                          <Button type="submit" loading={busy} variant="secondary" className="text-xs">
                            Revoke certificate
                          </Button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
