const { test, expect } = require("@playwright/test");

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/(trainee|trainer|admin)$/);
}

test("Asha sees precise gaps, corrects a returned nomination and receives confirmed admission", async ({
  page,
  request,
}) => {
  await login(page, "asha.sharma@example.test");
  await page.goto("/trainee/skill-gaps");
  await expect(page.getByText("TWO LEVEL GAP", { exact: true })).toBeVisible();
  await expect(
    page.getByText("NOT ASSESSED", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/skill-gaps-1440.png",
    fullPage: true,
  });

  const traineeToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const roles = await request.get("/api/job-roles", {
    headers: { Authorization: `Bearer ${traineeToken}` },
  });
  const roleId = (await roles.json()).data[0]._id;
  const needTitle = "Synthetic end-to-end radar practice request";
  await page.goto("/trainee/training-needs");
  await page.getByLabel("Title *").fill(needTitle);
  await page
    .getByLabel("Justification *")
    .fill("The reviewed level is below the proposed radar task requirement.");
  await page.getByLabel("Job role ID *").fill(roleId);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Draft training need saved",
  );
  await page.getByRole("link", { name: needTitle }).click();
  await page.getByRole("button", { name: "SUBMITTED", exact: true }).click();
  await expect(
    page.locator(".badge").filter({ hasText: "SUBMITTED" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await login(page, "admin@example.test");
  await page.goto("/admin/training-needs");
  await page.getByRole("link", { name: needTitle }).click();
  await page.getByRole("button", { name: "UNDER REVIEW", exact: true }).click();
  await page
    .getByLabel("Decision reason *")
    .fill(
      "The synthetic radar development request is relevant and reviewable.",
    );
  await page.getByRole("button", { name: "APPROVED", exact: true }).click();
  await expect(
    page.locator(".badge").filter({ hasText: "APPROVED" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "asha.sharma@example.test");

  await page.goto("/trainee/nominations");
  await page
    .getByRole("link", { name: "Sample Radar Interpretation Foundations" })
    .click();
  await expect(
    page
      .getByText("Please clarify how this batch supports the stated task goal.")
      .first(),
  ).toBeVisible();
  await page
    .getByLabel("Correction response *")
    .fill(
      "This batch provides guided radar interpretation practice before the advanced course step.",
    );
  await page.getByRole("button", { name: "Correct and resubmit" }).click();
  await expect(
    page.locator(".badge").filter({ hasText: "RESUBMITTED" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await login(page, "admin@example.test");
  await page.goto("/admin/nominations");
  await page
    .getByRole("row")
    .filter({ hasText: "Asha Sharma" })
    .getByRole("link", { name: "Sample Radar Interpretation Foundations" })
    .click();
  await page.getByRole("button", { name: "UNDER REVIEW", exact: true }).click();
  await page
    .getByLabel("Decision reason *")
    .fill(
      "Eligibility confirmed against pinned rule version and one seat is available.",
    );
  await page.getByRole("button", { name: "APPROVED", exact: true }).click();
  await expect(
    page.locator(".badge").filter({ hasText: "APPROVED" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/nomination-timeline-1440.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "asha.sharma@example.test");
  await expect(
    page.getByText("Sample Radar Interpretation Foundations"),
  ).toBeVisible();
});

test("institutional screens render at desktop, tablet and mobile without overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/login-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await login(page, "asha.sharma@example.test");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Competency Passport", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Competency Passport", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/competency-passport-390.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/trainee");
  await page.screenshot({
    path: "test-results/trainee-dashboard-1440.png",
    fullPage: true,
  });
  await page.goto("/trainee/competency-passport");
  await page.screenshot({
    path: "test-results/competency-passport-1440.png",
    fullPage: true,
  });
  await page.goto("/trainee/courses");
  await page
    .getByRole("link", { name: "Sample Radar Interpretation Foundations" })
    .click();
  await page.getByRole("button", { name: "Check eligibility" }).click();
  await expect(page.getByText("Eligibility preview")).toBeVisible();
  await page.screenshot({
    path: "test-results/course-eligibility-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "admin@example.test");
  await page.screenshot({
    path: "test-results/admin-review-queue-1440.png",
    fullPage: true,
  });
  await page.goto("/admin/batches");
  await page.getByRole("link", { name: "Demonstration Batch 1" }).click();
  await page.screenshot({
    path: "test-results/batch-detail-1440.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
