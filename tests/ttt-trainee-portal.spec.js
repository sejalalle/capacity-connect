const { test, expect } = require("@playwright/test");

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("/trainee");
}

const SECTIONS = [
  ["/trainee/ttt-dashboard", "TTT Dashboard"],
  ["/trainee/ttt-program", "Train-the-Trainer Program"],
  ["/trainee/ttt-modules", "TTT Learning Modules"],
  ["/trainee/ttt-practice", "Teaching Practice"],
  ["/trainee/ttt-submissions", "Teaching Practice Submission"],
  ["/trainee/ttt-progress", "Progress & Evaluation"],
];

test("a nominated trainee gets the TTT workspace and every section renders", async ({
  page,
}) => {
  // asha.sharma@example.test is seeded with an active TTT nomination.
  await login(page, "asha.sharma@example.test");
  await expect(
    page.getByRole("button", { name: "TRAIN-THE-TRAINER" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "TTT Dashboard" }),
  ).toBeVisible();

  await page.goto("/trainee");
  await expect(
    page.getByRole("heading", { name: "Train-the-Trainer Programme" }),
  ).toBeVisible();

  for (const [path, heading] of SECTIONS) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }
});

test("a trainee without a nomination never sees the TTT workspace", async ({
  page,
}) => {
  // trainee3@example.test is seeded without a nomination.
  await login(page, "trainee3@example.test");
  await expect(
    page.getByRole("button", { name: "TRAIN-THE-TRAINER" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "TTT Dashboard" })).toHaveCount(0);
  await page.goto("/trainee");
  await expect(
    page.getByRole("heading", { name: "Train-the-Trainer Programme" }),
  ).toHaveCount(0);

  // Direct navigation is refused with an explicit state, not the workspace.
  await page.goto("/trainee/ttt-dashboard");
  await expect(
    page.getByRole("heading", { name: "No Train-the-Trainer nomination" }),
  ).toBeVisible();
});
