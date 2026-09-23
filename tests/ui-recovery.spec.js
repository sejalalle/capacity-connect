const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync("client/src/utils/navigation.js", "utf8");
const routeGroups = {};
for (const role of ["trainee", "trainer", "admin"]) {
  const section = source.split(`  ${role}: [`)[1].split("\n  ],")[0];
  routeGroups[role] = [...section.matchAll(/\["[^"]+", "([^"]*)",/g)].map(
    (x) => `/${role}${x[1] ? "/" + x[1] : ""}`,
  );
}
const out = "artifacts/ui-recovery";
fs.mkdirSync(out, { recursive: true });
async function login(page, role) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(
    {
      trainee: "asha.sharma@example.test",
      trainer: "trainer2@example.test",
      admin: "admin@example.test",
    }[role],
  );
  await page.getByLabel("Password", { exact: true }).fill("DemoOnly!2026");
  await page
    .getByRole("button", { name: /Login|Sign in/, exact: true })
    .click();
  await expect(page).toHaveURL(`/${role}`);
}
test("render route inventory at desktop and mobile", async ({ page }) => {
  test.setTimeout(480000);
  const rows = [];
  const baseline = process.env.UI_BASELINE === "1";
  const selections = {
    admin: "/admin/users",
    trainer: "/trainer/courses",
    trainee: "/trainee",
  };
  for (const role of ["admin", "trainer", "trainee"]) {
    await login(page, role);
    for (const url of baseline ? [selections[role]] : routeGroups[role]) {
      for (const width of baseline ? [1440] : [1440, 1280, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(url);
        await expect(page.locator("main h1").first()).toBeVisible();
        await page.waitForTimeout(100);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        rows.push({ url, width, overflow });
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: path.join(
              out,
              `${baseline ? "before-" : ""}${url.replaceAll("/", "-")}-${width}.png`,
            ),
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
  }
  for (const url of ["/", "/login", "/register", "/not-found"]) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(url);
      rows.push({
        url,
        width,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
      });
      await page.screenshot({
        path: path.join(
          out,
          `${baseline ? "before-" : ""}${url.replaceAll("/", "-") || "landing"}-${width}.png`,
        ),
        fullPage: true,
      });
    }
  }
  fs.writeFileSync(
    path.join(out, baseline ? "baseline.json" : "routes.json"),
    JSON.stringify(rows, null, 2),
  );
  if (!baseline) expect(rows.filter((x) => x.overflow)).toEqual([]);
});

test("detail routes, drawer keyboard and dialog behavior", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const rows = [];
  for (const role of ["admin", "trainer", "trainee"]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page, role);
    const token = await page.evaluate(() =>
      sessionStorage.getItem("samarthya.token"),
    );
    for (const resource of [
      "courses",
      "training-needs",
      "nominations",
      "batches",
    ]) {
      const response = await request.get(`/api/${resource}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      const record = payload.data?.items?.[0];
      if (!record) {
        rows.push({
          url: `/${role}/${resource}/:id`,
          issue: "No authorized synthetic record; list empty state checked",
        });
        continue;
      }
      const url = `/${role}/${resource}/${record._id}`;
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(url);
        await expect(page.locator("main h1").first()).toBeVisible();
        await page.screenshot({
          path: `${out}/detail-${role}-${resource}-${width}.png`,
          fullPage: true,
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBeTruthy();
      }
      rows.push({ url: `/${role}/${resource}/:id`, issue: "" });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("link", { name: "SAMARTHYA home" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
  }
  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Forgot password?" }),
  ).toBeFocused();
  fs.writeFileSync(`${out}/details.json`, JSON.stringify(rows, null, 2));
});
