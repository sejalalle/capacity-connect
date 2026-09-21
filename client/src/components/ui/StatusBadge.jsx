const tones = {
  // Pending / Under review / Draft / Open / Scheduled
  pending: "amber",
  approved: "teal",
  rejected: "red",
  suspended: "red",
  demonstrated: "teal",
  "under-review": "amber",
  "pending-review": "amber",
  "ready-for-review": "amber",
  "needs-practice": "amber",
  "in-progress": "blue",
  scheduled: "blue",
  "not-assessed": "neutral",
  "not-comparable": "neutral",
  "requirement-met": "teal",
  "needs-information": "amber",
  "needs-revision": "amber",
  "one-level-gap": "amber",
  "two-level-gap": "amber",
  "three-or-more-level-gap": "red",
  "under-review": "amber",
  returned: "amber",
  "returned-for-revision": "amber",
  waitlisted: "amber",
  submitted: "amber",
  open: "amber",
  draft: "neutral",

  // Success / Verified / Approved / Published / Completed
  approved: "teal",
  demonstrated: "teal",
  "requirement-met": "teal",
  accepted: "teal",
  pass: "teal",
  fail: "red",
  unavailable: "red",
  available: "teal",
  eligible: "teal",
  ineligible: "red",
  "needs-information": "amber",
  reviewed: "teal",
  "self-declared": "neutral",
  "pending-review": "amber",
  "ready-for-review": "amber",
  superseded: "neutral",
  "timed-out": "red",
  "returned-for-revision": "amber",
  active: "teal",
  published: "teal",
  draft: "neutral",
  submitted: "amber",
  evaluated: "teal",
  verified: "teal",
  "needs-revision": "amber",
  disabled: "neutral",
  succeeded: "teal",
  completed: "teal",

  // Danger / Suspended / Rejected / Ineligible / Timed out / Fail
  rejected: "red",
  suspended: "red",
  "three-or-more-level-gap": "red",
  fail: "red",
  failed: "red",
  unavailable: "red",
  ineligible: "red",
  "timed-out": "red",
  "invalid-output": "red",
  revoked: "red",
  open: "amber",
  completed: "teal",

  // Neutral / Info / Progress
  "in-progress": "blue",
  scheduled: "blue",
  "not-assessed": "neutral",
  "not-comparable": "neutral",
  "self-declared": "neutral",
  superseded: "neutral",
  disabled: "neutral",
  cancelled: "neutral",
};

export default function StatusBadge({ status }) {
  const safeStatus = status || "NOT_ASSESSED";
  const normalized = safeStatus.toLowerCase().replaceAll("_", "-");
  const tone = tones[normalized] || "neutral";

  return (
    <span className={`badge ${tones[normalized] || "blue"}`}>
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {safeStatus.replaceAll("_", " ").replaceAll("-", " ")}
    </span>
  );
}
