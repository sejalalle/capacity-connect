const { test, expect } = require("@playwright/test");

async function login(page, role) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}

test("registration, approval, JWT, role redirect and profile editing remain functional", async ({
  page,
  request,
}) => {
  const email = `flow-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Full Name").fill("Synthetic Flow Trainee");
  await page.getByLabel("Official / Professional Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByLabel("Confirm Password").fill("DemoOnly!2026");
  await page.getByLabel("Department").fill("Synthetic Meteorology");
  await page.getByLabel("Designation").fill("Demonstration Trainee");
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(
    page.getByText("Your registration has been submitted for approval.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to login" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Your account is pending approval.",
  );
  await login(page, "admin");
  await page
    .getByRole("link", { name: "User & Role Management", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("/trainee");
  const token = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  expect(token.split(".")).toHaveLength(3);
  expect(
    (
      await request.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/trainee/profile");
  await page.getByRole("button", { name: "Edit Profile" }).click();
  await page
    .getByLabel("Designation", { exact: true })
    .fill("Updated Synthetic Forecaster");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(
    page.getByText("Updated Synthetic Forecaster", { exact: true }),
  ).toBeVisible();
});

test("SAMARTHYA-only branding and role-specific trainer navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Turn training needs into demonstrated capability/ }),
  ).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/SIH|PS\s*26075|Capacity Connect|hackathon/i);
  await login(page, "trainer");
  await expect(
    page.getByRole("link", { name: "Course Management" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Assessments" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Trainer Suitability" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Organizational Capability" }),
  ).toHaveCount(0);
  await page.goto("/trainer/courses");
  await expect(
    page.getByText("Sample Radar Interpretation Foundations"),
  ).toBeVisible();
});

test("approved trainer authors and publishes an owned course without coordinator intervention", async ({
  page,
  request,
}) => {
  const code = `SYN-TRAINER-${Date.now()}`;
  await login(page, "trainer");
  await page.getByRole("link", { name: "Course Management" }).click();
  await page
    .getByLabel("Course title *")
    .fill("Synthetic Trainer Authored Programme");
  await page.getByLabel("Course code *").fill(code);
  await page.getByRole("button", { name: "Create Course" }).click();
  await expect(
    page.getByRole("heading", { name: "Course editor" }),
  ).toBeVisible();
  await page.getByLabel("Domain *").fill("Synthetic Radar Learning");
  await page.getByLabel("Category *").fill("Professional learning");
  await page
    .locator("label")
    .filter({ hasText: "Duration *" })
    .locator('input[type="number"]')
    .fill("8");
  await page
    .getByLabel("Description *")
    .fill(
      "Synthetic trainer-owned learning programme for browser verification.",
    );
  await page.getByLabel("Published competency").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add mapping" }).click();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Course draft saved",
  );
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Course published without additional approval",
  );
  await page.reload();
  await expect(
    page.getByText("PUBLISHED", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Module title").fill("Synthetic owned module");
  await page
    .getByLabel("Summary")
    .fill("A private synthetic module authored by the course owner.");
  await page.getByLabel("Private learning file").setInputFiles({
    name: "synthetic-learning.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nSynthetic browser learning resource"),
  });
  await page.getByRole("button", { name: "Add module draft" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Learning module draft created",
  );
  await page.reload();
  await expect(page.getByText("1. Synthetic owned module")).toBeVisible();
  await page.getByRole("button", { name: "Publish content" }).click();
  await expect(page.locator(".toast-region")).toContainText("Module published");

  const trainerToken = await page.evaluate(() =>
    sessionStorage.getItem("samarthya.token"),
  );
  const catalogue = await request.get("/api/courses", {
    headers: { Authorization: `Bearer ${trainerToken}` },
  });
  expect(catalogue.ok()).toBeTruthy();
  expect(
    (await catalogue.json()).data.items.some(
      (item) => item.code === code && item.status === "PUBLISHED",
    ),
  ).toBeTruthy();
});

test("admin configures a synthetic competency and professional-role requirement through the UI", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/competencies");
  await page.getByLabel("Code *").fill("SYN-DEMO-UI");
  await page
    .getByLabel("Competency name *")
    .fill("Synthetic UI Configured Task");
  await page.getByLabel("Domain *").fill("Demonstration Integration");
  await page
    .getByLabel("Level 1 definition *")
    .fill("Can complete the synthetic task with documented guidance.");
  await page
    .getByLabel("Level 2 definition *")
    .fill("Can complete the synthetic task independently in a routine case.");
  await page.getByRole("button", { name: "Create draft version" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Draft competency version created",
  );
  await expect(page.getByText("SYN-DEMO-UI", { exact: true })).toBeVisible();

  await page
    .getByRole("row")
    .filter({ hasText: "SYN-DEMO-UI" })
    .getByRole("button", { name: "Publish competency" })
    .click();
  await expect(page.locator(".toast-region")).toContainText(
    "Competency published for course mapping",
  );

  await page.goto("/admin/job-role-requirements");
  await page
    .getByLabel("Role title *")
    .fill("Synthetic Demo Configuration Role");
  await page
    .getByLabel("Description *")
    .fill(
      "Proposed professional role created only for the browser demonstration.",
    );
  await page.getByRole("button", { name: "Create professional role" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Proposed professional role created",
  );
  await page
    .getByLabel("Professional role *")
    .selectOption({ label: "Synthetic Demo Configuration Role" });
  await page
    .getByLabel("Competency *")
    .selectOption({ label: "SYN-DEMO-UI · Synthetic UI Configured Task" });
  await page.getByLabel("Required level *").selectOption("2");
  await page.getByRole("button", { name: "Add requirement" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Professional-role requirement created",
  );
  await expect(
    page.getByRole("row").filter({ hasText: "Synthetic UI Configured Task" }),
  ).toContainText("L2");

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic Demo Configuration Role",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "admin");
  await page.goto("/admin/job-role-requirements");
  await expect(
    page.getByRole("heading", {
      name: "Synthetic Demo Configuration Role",
      exact: true,
    }),
  ).toBeVisible();
});

test("trainer mapping explains an empty catalogue and recovers after refresh", async ({
  page,
}) => {
  await login(page, "trainer");
  await page.goto("/trainer/courses");
  await page
    .getByLabel("Course title *")
    .fill("Synthetic mapping recovery course");
  await page.getByLabel("Course code *").fill(`SYN-RECOVERY-${Date.now()}`);
  await page.route("**/api/competencies?**", (route) =>
    route.fulfill({
      json: { success: true, data: { items: [], pagination: { pages: 0 } } },
    }),
  );
  await page
    .getByRole("button", { name: "Create Course", exact: true })
    .click();
  await expect(
    page.getByText("No published competencies are available.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.unroute("**/api/competencies?**");
  await page.getByRole("button", { name: "Refresh competencies" }).click();
  await page.getByLabel("Published competency").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add mapping", exact: true }).click();
  await page.getByRole("button", { name: "Save competency mappings" }).click();
  await expect(page.locator(".toast-region")).toContainText(
    "Competency mappings saved",
  );
  await page.reload();
  await expect(page.getByText(/target L1/).first()).toBeVisible();
});
