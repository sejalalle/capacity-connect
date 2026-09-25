const tones = {
  // Pending / Under review / Draft / Open / Scheduled
  pending: "amber",
  "under-review": "amber",
  "pending-review": "amber",
  "ready-for-review": "amber",
  "needs-practice": "amber",
  "needs-information": "amber",
  "needs-revision": "amber",
  "one-level-gap": "amber",
  "two-level-gap": "amber",
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
  available: "teal",
  eligible: "teal",
  reviewed: "teal",
  active: "teal",
  published: "teal",
  evaluated: "teal",
  verified: "teal",
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

  // Neutral / Info / Progress
  "in-progress": "blue",
  scheduled: "blue",
  nominated: "blue",
  "teaching-practice": "blue",
  assigned: "teal",
  recommended: "blue",
  "none-available": "neutral",
  withdrawn: "neutral",
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
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {safeStatus.replaceAll("_", " ").replaceAll("-", " ")}
    </span>
  );
}
