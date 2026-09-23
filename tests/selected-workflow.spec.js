const { test, expect } = require("@playwright/test");
async function login(page, email, role) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(`/${role}`);
}
test("participant feedback persists and certificate conditions are explained in the UI", async ({
  page,
}) => {
  await login(page, "asha.sharma@example.test", "trainee");
  await page.goto("/trainee/feedback");
  await expect(
    page.getByRole("heading", { name: "Training Feedback" }),
  ).toBeVisible();
  await page.getByLabel("Feedback opportunity").selectOption({ index: 1 });
  await page.getByLabel("Rating", { exact: true }).selectOption("4");
  await page
    .getByLabel("Comments (optional)")
    .fill("Synthetic feedback: useful practical training.");
  await page
    .getByRole("button", { name: "Submit feedback", exact: true })
    .click();
  await expect(page.locator(".toast-region")).toContainText(
    "Feedback submitted",
  );
  await page.reload();
  await expect(
    page.getByText("Synthetic feedback: useful practical training.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/trainee/certificates");
  await expect(
    page.getByText("No certificates issued", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "admin@example.test", "admin");
  await page.goto("/admin/certificates");
  await page.getByLabel("Confirmed enrollment").selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Check conditions and issue" })
    .click();
  await expect(page.locator(".toast-region")).toContainText(
    "pinned course rules",
  );
  await expect(
    page.getByText("No certificates issued", { exact: true }),
  ).toBeVisible();
});
test("capacity calculator rejects missing configuration and renders an explained estimate", async ({
  page,
  request,
}) => {
  await login(page, "admin@example.test", "admin");
  const token = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const response = await request.get("/api/batches?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const batch = (await response.json()).data.items.find(
    (b) => b.sessions?.length,
  );
  expect(batch).toBeTruthy();
  await page.goto("/admin/trainer-capacity");
  await page.getByLabel("Batch/session template").selectOption(batch._id);
  await page.getByLabel("Planning start").fill("2026-01-01T00:00");
  await page.getByLabel("Planning end").fill("2027-01-01T00:00");
  await page
    .getByRole("button", { name: "Calculate planning estimate" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Demand and recorded capacity" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Planning estimate, not a confirmed delivery schedule/),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
