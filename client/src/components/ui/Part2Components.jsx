import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item}>
          {index > 0 && <i>/</i>}
          {item}
        </span>
      ))}
    </nav>
  );
}
export function Timeline({ events = [] }) {
  if (!events.length)
    return <p className="muted">No status changes recorded.</p>;
  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`}>
          <span className="timeline-marker" />
          <div>
            <strong>{event.to?.replaceAll("_", " ")}</strong>
            <p>{event.reason || "Status updated"}</p>
            <small>
              {event.at
                ? new Date(event.at).toLocaleString("en-IN")
                : "Date unavailable"}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function EligibilityChecklist({ snapshot }) {
  if (!snapshot)
    return (
      <p className="muted">Run an eligibility preview for a selected batch.</p>
    );
  return (
    <div className="eligibility">
      <div className="flex-between">
        <strong>Eligibility preview</strong>
        <StatusBadge status={snapshot.status} />
      </div>
      {snapshot.checks?.map((check, index) => (
        <div className="check-row" key={`${check.rule}-${index}`}>
          <span aria-hidden="true">
            {check.outcome === "PASS"
              ? "✓"
              : check.outcome === "FAIL"
                ? "×"
                : "i"}
          </span>
          <div>
            <strong>{check.rule.replaceAll("_", " ")}</strong>
            <p>{check.explanation}</p>
          </div>
        </div>
      ))}
      <p className="context-note">
        Checked against rule version {snapshot.ruleVersion}. Final eligibility
        is reviewed after submission.
      </p>
    </div>
  );
}
export function CompetencyComparison({ item }) {
  const required = item.requiredLevel || 0,
    current = item.demonstratedLevel;
  const levels = [...(item.competency?.levels || [])]
    .sort((a, b) => a.value - b.value)
    .map((level) => level.value);
  return (
    <div className="comparison">
      <div className="comparison-head">
        <div>
          <strong>{item.competency?.name}</strong>
          <span>{item.competency?.domain}</span>
        </div>
        <StatusBadge status={item.category} />
      </div>
      <div className="level-row">
        <span>Demonstrated</span>
        <div className="level-track">
          {levels.map((n) => (
            <i
              key={n}
              className={current != null && n <= current ? "filled" : ""}
            />
          ))}
        </div>
        <b>{current == null ? "Not assessed" : `L${current}`}</b>
      </div>
      <div className="level-row">
        <span>Required</span>
        <div className="level-track required">
          {levels.map((n) => (
            <i key={n} className={n <= required ? "filled" : ""} />
          ))}
        </div>
        <b>L{required}</b>
      </div>
      <p>{item.explanation}</p>
      {item.criteria?.length ? (
        <details>
          <summary>Observable criteria and evidence status</summary>
          <ul className="criteria-list">
            {item.criteria.map((c) => (
              <li key={c.criterionId}>
                <strong>
                  L{c.level} · {c.description}
                </strong>
                <StatusBadge status={c.status} />
                <small>
                  Rubric {c.rubricVersion} ·{" "}
                  {c.evidenceTypes
                    .join(", ")
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </small>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="muted">
          Criterion-level evidence is not configured for this framework version.
        </p>
      )}
      <details>
        <summary>Relevant learning</summary>
        {item.recommendedCourses?.length ? (
          item.recommendedCourses.map((course) => (
            <article className="activity-item" key={course._id}>
              <strong>{course.title}</strong>
              <p>{course.explanation}</p>
              <small>
                {course.batches.length
                  ? `${course.batches.length} open batch option(s); admission requires approval.`
                  : "No open batch currently recorded."}
              </small>
              <Link
                className="text-button"
                to={`/trainee/courses/${course._id}`}
              >
                View course
              </Link>
            </article>
          ))
        ) : (
          <p>
            No published course mapping is currently available. You can still
            request training.
          </p>
        )}
      </details>
      <Link
        className="button button-secondary"
        to={`/trainee/training-needs?competency=${item.competency?._id}&title=${encodeURIComponent(`Develop ${item.competency?.name} toward L${required}`)}`}
      >
        Request training
      </Link>
      <small>
        {item.assessedAt
          ? `Reviewed source dated ${new Date(item.assessedAt).toLocaleDateString("en-IN")}`
          : item.nextAction}
      </small>
    </div>
  );
}
