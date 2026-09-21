const { test, expect } = require("@playwright/test");

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

test("Part 3A role screens remain available alongside scoped Part 3B modules", async ({
  page,
}) => {
  await login(page, "trainer2@example.test");
  await page.goto("/trainer/trainer-profile");
  await expect(
    page.getByRole("heading", { name: "Trainer Profile & Expertise" }),
  ).toBeVisible();
  await expect(page.getByText("Radar Product Interpretation")).toBeVisible();
  await page.goto("/trainer/availability");
  await expect(
    page.getByText("Synthetic confirmed session availability."),
  ).toBeVisible();
  await page.goto("/trainer/assigned-batches");
  await expect(
    page.getByText(/Sample Radar Interpretation.*guided session/),
  ).toBeVisible();
  await page.goto("/trainer/learning");
  await expect(
    page.getByText("Sample Radar Product Foundations"),
  ).toBeVisible();
  await page.goto("/trainer/question-bank");
  await expect(
    page.getByRole("heading", { name: "Question Bank", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("AI Question Drafts")).toBeVisible();
  await expect(page.getByText("Evidence Review")).toBeVisible();
  await expect(page.getByText("Organizational Capability")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/part3a-trainer-profile-1440.png",
    fullPage: true,
  });
});

test("complete Part 3A journey reaches a human-controlled published result", async ({
  page,
  request,
}) => {
  await login(page, "asha.sharma@example.test");
  const traineeToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const dashboardResponse = await request.get("/api/part3/dashboard", {
    headers: { Authorization: `Bearer ${traineeToken}` },
  });
  expect(dashboardResponse.status()).toBe(200);
  const dashboard = (await dashboardResponse.json()).data;
  const enrollmentId = dashboard.enrollments[0]._id;

  await page.goto("/trainee/learning");
  await expect(
    page.getByText("Sample Radar Product Foundations"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark completed" }).first().click();
  await expect(
    page.getByRole("button", { name: "Completed" }).first(),
  ).toBeDisabled();

  await page.goto("/trainee/assessments");
  const mcq = page
    .locator(".card")
    .filter({ hasText: "Sample Radar Interpretation Knowledge Check" });
  await mcq.getByRole("button", { name: "Start or resume attempt" }).click();
  await expect(page.getByText(/Deadline/)).toBeVisible();
  await page.getByLabel("Quality-control context").check();
  await page.getByRole("button", { name: "Save answers" }).click();
  await expect(page.locator(".toast-region")).toContainText("Answers saved");
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Attempt submitted",
  );

  const practical = page
    .locator(".card")
    .filter({ hasText: "Sample Radar Interpretation Practical" });
  await practical.getByRole("button", { name: "Prepare submission" }).click();
  await page
    .getByLabel("Response *")
    .fill(
      "Synthetic practical response with stated interpretation uncertainty.",
    );
  await page.getByRole("button", { name: "Submit practical work" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Submission receipt created",
  );

  await changeUser(page, "trainer2@example.test");
  await page.goto("/trainer/evaluations");
  const ashaSubmission = page
    .getByRole("row")
    .filter({ hasText: "Asha Sharma" });
  await expect(ashaSubmission).toContainText(
    "Sample Radar Interpretation Practical",
  );
  await ashaSubmission.getByRole("button", { name: "Evaluate" }).click();
  await page.getByLabel("Observation (0–40)").fill("35");
  await page.getByLabel("Reasoning (0–60)").fill("45");
  await page
    .getByLabel("Comments *")
    .fill("Synthetic rubric evaluation completed by the assigned trainer.");
  await page.getByRole("button", { name: "Complete evaluation" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Human evaluation recorded",
  );

  await changeUser(page, "admin@example.test");
  await page.goto("/admin/results");
  await page.getByLabel("Enrollment ID *").fill(enrollmentId);
  await page
    .getByLabel("Reason *")
    .fill("Required components and human evaluation were checked.");
  await page.getByRole("button", { name: "Prepare result" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Result prepared for review",
  );
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator(".toast-region")).toContainText("Result published");

  await changeUser(page, "asha.sharma@example.test");
  await page.goto("/trainee/results");
  await expect(
    page.locator(".badge").filter({ hasText: "PASS" }),
  ).toBeVisible();
  await expect(page.getByText(/81\.82%/)).toBeVisible();
  await page.screenshot({
    path: "test-results/part3a-published-result-1440.png",
    fullPage: true,
  });
});

test("coordinator suitability is explained and Part 3A remains responsive on mobile", async ({
  page,
  request,
}) => {
  await login(page, "admin@example.test");
  const token = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const response = await request.get("/api/part3/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashboard = (await response.json()).data;
  const assignment = dashboard.assignments.find(
    (item) => item.status === "ACTIVE",
  );
  const batchResponse = await request.get(
    `/api/batches/${assignment.batch._id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const batch = (await batchResponse.json()).data.batch;
  const practiceSession = batch.sessions.find(
    (item) => item.title === "Sample Radar Interpretation — practice review",
  );
  const sessionId = practiceSession._id;
  await page.goto("/admin/trainer-discovery");
  await page.getByLabel("Batch ID *").fill(assignment.batch._id);
  await page.getByLabel("Session ID *").fill(sessionId);
  await page.getByRole("button", { name: "Calculate suitability" }).click();
  await expect(page.getByText("94 recommendation points")).toBeVisible();
  await expect(
    page.locator(".badge").filter({ hasText: "NEEDS INFORMATION" }),
  ).toBeVisible();
  const recommended = page
    .locator(".recommendation")
    .filter({ hasText: "Synthetic Trainer 1" });
  await recommended.getByRole("button", { name: "Assign trainer" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Trainer assignment confirmed",
  );
  await expect(
    page.getByText("Sample Radar Interpretation — practice review"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/part3a-suitability-1440.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/assessments");
  await expect(
    page.getByRole("heading", { name: "Assessments" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: "test-results/part3a-assessments-390.png",
    fullPage: true,
  });
});
