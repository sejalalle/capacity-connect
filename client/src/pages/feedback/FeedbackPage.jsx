import { useCallback, useEffect, useState } from "react";
import { Star, MessageSquare, CheckCircle2, AlertCircle, Info, Send, Bell } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { part3 } from "../../services/part3Service";
import { errorMessage } from "../../services/api";
import Card from "../../components/ui/Card";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

export default function FeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Feedback");
  const [selected, setSelected] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(
        await part3.get(
          user.role === "trainee" ? "/feedback/opportunities" : "/feedback",
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [user.role]);

  useEffect(() => {
    load();
  }, [load]);

  const opportunities = (data?.items || []).filter(
    (x) =>
      !data.submitted?.some(
        (r) =>
          r.enrollment === x.enrollment &&
          r.targetType === x.targetType &&
          r.target === x.target,
      ),
  );

  async function submit(e) {
    e.preventDefault();
    const item = opportunities.find(
      (x) => `${x.enrollment}:${x.targetType}:${x.target}` === selected,
    );
    if (!item || !rating) return;
    setBusy(true);
    try {
      await part3.post("/feedback", {
        enrollment: item.enrollment,
        target: item.target,
        targetType: item.targetType,
        rating: Number(rating),
        comment: comment || "Feedback recorded.",
      });
      toast("Feedback submitted successfully");
      setSelected("");
      setRating("");
      setComment("");
      await load();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const sampleNotifications = [
    {
      id: "n1",
      title: "Your certificate is now available!",
      date: "25 Sep 2026",
      type: "success",
    },
    {
      id: "n2",
      title: "Submission under review",
      date: "28 Sep 2026",
      type: "info",
    },
    {
      id: "n3",
      title: "New course recommendation for you",
      date: "22 Sep 2026",
      type: "info",
    },
    {
      id: "n4",
      title: "Assessment deadline reminder",
      date: "10 Oct 2026",
      type: "warning",
    },
  ];

  const visibleResponses =
    user.role === "trainee"
      ? data?.submitted || []
      : user.role === "admin"
        ? data?.responses || []
        : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#101B46] tracking-tight m-0 mb-1">
            Training Feedback
          </h1>
          <p className="text-xs text-[#475875] m-0">
            Share your training experience. Feedback does not verify competency or determine trainer suitability.
          </p>
        </div>
      </div>

      {/* Header Tabs */}
      <div className="flex items-center gap-4 border-b border-[#D9E3F0] pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("Feedback")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "Feedback"
              ? "text-[#155CC4] border-[#155CC4]"
              : "text-[#687181] border-transparent hover:text-[#101B46]"
          }`}
        >
          Feedback
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Notifications")}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
            activeTab === "Notifications"
              ? "text-[#155CC4] border-[#155CC4]"
              : "text-[#687181] border-transparent hover:text-[#101B46]"
          }`}
        >
          Notifications
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-[#FEF3F2] border border-[#FECDD3] rounded-xl text-xs text-[#B42318] flex justify-between items-center" role="alert">
          <span>{error}</span>
          <Button onClick={load} className="px-3 py-1 bg-white border border-[#FECDD3] rounded-lg text-xs font-bold">
            Retry
          </Button>
        </div>
      ) : !data ? (
        <LoadingState label="Loading feedback details…" />
      ) : activeTab === "Notifications" ? (
        <div className="bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D9E3F0]">
            <div className="w-10 h-10 rounded-xl bg-[#EFF4FC] text-[#155CC4] flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101B46] m-0">Notifications</h2>
              <p className="text-xs text-[#475875] m-0">System alerts, batch reminders and updates.</p>
            </div>
          </div>
          <div className="divide-y divide-[#D9E3F0]">
            {sampleNotifications.map((notif) => (
              <div key={notif.id} className="py-3.5 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#155CC4] mt-1.5 shrink-0" />
                <div className="flex-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#101B46]">{notif.title}</span>
                  <span className="text-[11px] text-[#687181]">{notif.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Give Feedback Form */}
          <div className="lg:col-span-7 bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D9E3F0]">
              <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] text-[#155CC4] flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#101B46] m-0">Give Feedback</h2>
                <p className="text-xs text-[#475875] m-0">
                  {data.privacy || "Your feedback helps us improve institutional training delivery."}
                </p>
              </div>
            </div>

            {user.role === "trainee" ? (
              opportunities.length ? (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label htmlFor="feedback-opportunity" className="block text-xs font-bold text-[#101B46] mb-1">
                      Feedback opportunity
                    </label>
                    <select
                      id="feedback-opportunity"
                      required
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] outline-none"
                    >
                      <option value="">Select a training activity</option>
                      {opportunities.map((x) => {
                        const key = `${x.enrollment}:${x.targetType}:${x.target}`;
                        return (
                          <option key={key} value={key}>
                            {x.batchName} · {x.targetType.toLowerCase()} · {x.title}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feedback-rating" className="block text-xs font-bold text-[#101B46] mb-1">
                      Rating
                    </label>
                    <select
                      id="feedback-rating"
                      required
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] outline-none"
                    >
                      <option value="">Choose a rating</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feedback-comment" className="block text-xs font-bold text-[#101B46] mb-1">
                      Comments (optional)
                    </label>
                    <textarea
                      id="feedback-comment"
                      rows={3}
                      maxLength={3000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 bg-white border border-[#D9E3F0] rounded-xl text-xs text-[#101B46] focus:border-[#155CC4] outline-none"
                      placeholder="Share your experience, what went well, or what could be improved..."
                    />
                  </div>

                  <Button
                    type="submit"
                    loading={busy}
                    disabled={!selected || !rating}
                    className="w-full py-2.5 bg-[#155CC4] hover:bg-[#104A9E] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    Submit feedback
                  </Button>
                </form>
              ) : (
                <EmptyState
                  title="No pending feedback opportunities"
                  description="Feedback becomes available for confirmed training enrollments. Each opportunity accepts one response."
                />
              )
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#101B46]">Response summary</h3>
                {data.aggregates?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#D9E3F0] text-[#687181]">
                          <th className="py-2">Target</th>
                          <th className="py-2">Responses</th>
                          <th className="py-2">Average rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9E3F0]">
                        {data.aggregates.map((x, i) => (
                          <tr key={i}>
                            <td className="py-2 font-semibold text-[#101B46]">{x.targetType}</td>
                            <td className="py-2 text-[#475875]">{x.count}</td>
                            <td className="py-2 text-[#155CC4] font-bold">{x.average.toFixed(1)} / 5</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No feedback in your scope"
                    description="Participant responses will appear for authorized training activities."
                  />
                )}
              </div>
            )}
          </div>

          {/* Right 5 Columns: Scoped feedback detail */}
          <div className="lg:col-span-5 bg-white border border-[#D9E3F0] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#101B46] m-0 mb-4 pb-4 border-b border-[#D9E3F0]">
              {user.role === "admin"
                ? "Identified responses"
                : "Your submitted feedback"}
            </h2>
            {visibleResponses.length ? (
              <div className="space-y-4">
                {visibleResponses.map((x) => (
                  <div key={x._id} className="p-3.5 bg-[#F5F8FC] border border-[#D9E3F0] rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#101B46] font-semibold">{x.targetType}</strong>
                      <span className="font-bold text-[#155CC4]">{x.rating} / 5</span>
                    </div>
                    <p className="text-[#475875] m-0">{x.comment || "No comment added"}</p>
                    <span className="text-[11px] text-[#687181] block pt-1">
                      {new Date(x.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  user.role === "trainee"
                    ? "No feedback submitted"
                    : "No responses in your scope"
                }
                description={
                  user.role === "trainee"
                    ? "Your saved responses will appear here."
                    : data.privacy ||
                      "You see scoped rating aggregates. Participant names and comments remain hidden."
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
