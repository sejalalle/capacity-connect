import { HttpError } from "../middleware/errorHandler.js";
const fail = (message) => {
  throw new HttpError(400, message);
};
export function validateCriterionDecision(framework, data, evidenceType) {
  const catalogue = framework.levels.flatMap((level) =>
    (level.criteria || []).map((c) => ({ ...c, level: level.value })),
  );
  if (!catalogue.length) return { configured: false };
  const target = framework.levels.find((l) => l.value === data.targetLevel);
  if (!target) fail("Target level is not defined in this framework");
  const available = catalogue.filter(
    (c) =>
      c.level <= data.targetLevel && c.rubricVersion === data.rubricVersion,
  );
  const byId = new Map(available.map((c) => [c.criterionId, c]));
  const results = new Map(data.criterionResults.map((r) => [r.criterionId, r]));
  if (results.size !== data.criterionResults.length)
    fail("Duplicate criterion results are not allowed");
  for (const [key] of results)
    if (!byId.has(key))
      fail("Criterion is unrelated to the target framework or rubric version");
  const targetCriteria = (target.criteria || []).filter(
    (c) => c.rubricVersion === data.rubricVersion,
  );
  if (!targetCriteria.length)
    fail("No applicable criteria are configured for the target rubric");
  const required = new Set(targetCriteria.map((c) => c.criterionId));
  function expand(key) {
    const criterion = byId.get(key);
    if (!criterion) fail("Foundational criterion has an incompatible rubric");
    for (const dependency of criterion.foundationalCriteria || []) {
      if (!required.has(dependency)) {
        required.add(dependency);
        expand(dependency);
      }
    }
  }
  for (const key of [...required]) expand(key);
  for (const key of required)
    if (!results.has(key))
      fail(
        "Every target and foundational criterion needs an explicit assessment outcome",
      );
  if (data.outcome === "DEMONSTRATED") {
    const level = framework.levels.find(
      (l) => l.value === data.demonstratedLevel,
    );
    if (!level || level.value > data.targetLevel)
      fail("Demonstrated level must be defined and not exceed the target");
    const checks = (level.criteria || []).filter(
      (c) => c.rubricVersion === data.rubricVersion,
    );
    if (!checks.length) fail("Demonstrated level has no compatible criteria");
    const visited = new Set();
    function satisfied(key) {
      if (visited.has(key)) return;
      visited.add(key);
      const c = byId.get(key);
      if (!c || !results.get(key)?.met)
        fail(
          "Demonstrated level requires reviewed evidence for every applicable criterion",
        );
      if (!c.evidenceTypes.includes(evidenceType))
        fail("Evidence type does not meet the criterion requirement");
      for (const dependency of c.foundationalCriteria || [])
        satisfied(dependency);
    }
    for (const c of checks) satisfied(c.criterionId);
  }
  return { configured: true };
}
export function criterionGaps(
  framework,
  requiredLevel,
  decisions,
  frameworkVersion,
) {
  return framework.levels
    .filter((l) => l.value <= requiredLevel)
    .flatMap((level) =>
      (level.criteria || []).map((c) => {
        const applicable = decisions.filter(
          (d) =>
            d.frameworkVersion === frameworkVersion &&
            d.rubricVersion === c.rubricVersion &&
            d.status === "ACTIVE",
        );
        const demonstrated = applicable.find(
          (d) =>
            d.outcome === "DEMONSTRATED" &&
            d.demonstratedLevel >= level.value &&
            d.criterionResults.some(
              (r) => r.criterionId === c.criterionId && r.met,
            ),
        );
        const attempted = applicable.find((d) =>
          d.criterionResults.some(
            (r) => r.criterionId === c.criterionId && !r.met,
          ),
        );
        return {
          criterionId: c.criterionId,
          description: c.description,
          level: level.value,
          rubricVersion: c.rubricVersion,
          evidenceTypes: c.evidenceTypes,
          status: demonstrated
            ? "DEMONSTRATED"
            : attempted
              ? "NEEDS_PRACTICE"
              : "NOT_ASSESSED",
          sourceDecision: demonstrated?._id || attempted?._id || null,
        };
      }),
    );
}
