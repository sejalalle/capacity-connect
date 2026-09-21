const { test, expect } = require("@playwright/test");
const crypto = require("node:crypto");

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/(trainee|trainer|admin)$/);
}
async function changeUser(page, email) {
  await page.evaluate(() => sessionStorage.clear());
  await login(page, email);
}
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

test("complete lifecycle continues from published result to evidence, human decision, gap and coverage", async ({
  page,
  request,
}) => {
  await login(page, "asha.sharma@example.test");
  const traineeToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const dashboard = (
    await (
      await request.get("/api/part3/dashboard", {
        headers: bearer(traineeToken),
      })
    ).json()
  ).data;
  expect(dashboard.results.length).toBeGreaterThan(0);
  expect(dashboard.submissions.length).toBeGreaterThan(0);
  const practical = dashboard.assessments.find((x) => x.type === "PRACTICAL");
  const submission = dashboard.submissions.find(
    (x) => String(x.assessment) === String(practical._id),
  );
  const evidenceResponse = await request.post("/api/part3/evidence", {
    headers: bearer(traineeToken),
    data: {
      enrollment: dashboard.enrollments[0]._id,
      evidenceType: "PRACTICAL_TASK",
      claimedCompetencies: [
        {
          competency: practical.competency,
          frameworkVersion: practical.frameworkVersion,
          rubricVersion: practical.rubricVersion,
          targetLevel: 3,
        },
      ],
      assessmentSubmission: submission._id,
      resultVersion: dashboard.results[0]._id,
      privateResources: [],
      description:
        "Synthetic practical task, evaluation and published result submitted together for an explicit competency review.",
    },
  });
  expect(evidenceResponse.status()).toBe(201);
  const evidence = (await evidenceResponse.json()).data;
  await page.goto("/trainee/evidence");
  await expect(page.getByText("PRACTICAL_TASK").first()).toBeVisible();
  await expect(
    page.locator(".badge").filter({ hasText: "SUBMITTED" }),
  ).toBeVisible();

  await changeUser(page, "admin@example.test");
  const adminToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const trainerUsers = (
    await (
      await request.get("/api/users?role=trainer&limit=20", {
        headers: bearer(adminToken),
      })
    ).json()
  ).data.users;
  const reviewer = trainerUsers.find(
    (x) => x.email === "trainer2@example.test",
  );
  const assigned = await request.post(
    `/api/part3/evidence/${evidence._id}/assign-reviewer`,
    {
      headers: bearer(adminToken),
      data: {
        reviewer: reviewer._id,
        reason:
          "Assign the reviewed synthetic radar specialist for this batch.",
      },
    },
  );
  expect(assigned.status()).toBe(200);

  await changeUser(page, "trainer2@example.test");
  const reviewerToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  await page.goto("/trainer/evidence-review");
  await expect(page.getByText("PRACTICAL_TASK").first()).toBeVisible();
  await page.locator("select").selectOption(evidence._id);
  await page
    .getByLabel("Reason/comments *")
    .fill(
      "Accepted for the stated synthetic practical task; competency is decided separately.",
    );
  await page.getByRole("button", { name: "Verify evidence" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Evidence verified",
  );

  const decision = await request.post(
    `/api/part3/evidence/${evidence._id}/competency-decisions`,
    {
      headers: bearer(reviewerToken),
      data: {
        competency: practical.competency,
        frameworkVersion: practical.frameworkVersion,
        rubricVersion: practical.rubricVersion,
        targetLevel: 3,
        demonstratedLevel: 3,
        outcome: "DEMONSTRATED",
        criterionResults: practical.rubric.map((criterion) => ({
          criterionId: criterion.criterionId,
          met: true,
          comments:
            "The assigned reviewer confirmed this configured synthetic criterion.",
        })),
        evidenceVersion: 1,
        reason:
          "The authorized subject reviewer confirmed the complete synthetic L3 task rubric.",
        idempotencyKey: crypto.randomUUID(),
        followUpComments: "",
      },
    },
  );
  expect(decision.status()).toBe(201);

  await changeUser(page, "asha.sharma@example.test");
  await page.goto("/trainee/competency-history");
  await expect(
    page.getByText("Radar Product Interpretation").first(),
  ).toBeVisible();
  await expect(
    page.locator(".badge").filter({ hasText: "DEMONSTRATED" }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".badge").filter({ hasText: "DEMONSTRATED" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "asha.sharma@example.test");
  await page.goto("/trainee/competency-history");
  await expect(
    page.getByText("Radar Product Interpretation").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/part3b-competency-history-1440.png",
    fullPage: true,
  });

  await changeUser(page, "admin@example.test");
  await page.goto("/admin/organizational-capability");
  await expect(
    page.getByRole("heading", { name: "Organizational Capability" }),
  ).toBeVisible();
  await expect(
    page.getByText("Insufficient evidence coverage").first(),
  ).toBeVisible();
  await expect(page.getByText("10").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/part3b-capability-1440.png",
    fullPage: true,
  });
});

test("higher-level needs-practice history preserves Asha's valid lower level and follow-up", async ({
  page,
}) => {
  await login(page, "asha.sharma@example.test");
  await page.goto("/trainee/competency-history");
  const radarRows = page
    .locator("tbody tr")
    .filter({ hasText: "Radar Product Interpretation" });
  await expect(radarRows.first()).toContainText("2");
  await expect(
    page.locator("tbody tr").filter({ hasText: "NEEDS PRACTICE" }),
  ).toContainText("2");
  await page.goto("/trainee/follow-ups");
  await expect(
    page.getByText(/guided radar interpretation practice/i),
  ).toBeVisible();
  await expect(page.getByText(/valid L2|reviewed L2/i)).toBeVisible();
});

test("AI-disabled mobile screen preserves deterministic search and manual workflows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "asha.sharma@example.test");
  await page.goto("/trainee/skill-suggestions");
  await expect(page.getByText(/AI assistance is disabled/)).toBeVisible();
  await page
    .getByLabel("Authorized source text *")
    .fill("radar interpretation quality context");
  await page.getByRole("button", { name: "Search approved catalogue" }).click();
  await expect(page.getByText("Radar Product Interpretation")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: "test-results/part3b-ai-fallback-390.png",
    fullPage: true,
  });
});
