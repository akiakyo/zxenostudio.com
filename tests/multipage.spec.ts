import { test, expect } from "@playwright/test";
test("separate pages, font, booking and responsive layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/",
    "/services",
    "/work",
    "/about",
    "/pricing",
    "/book",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() =>
        document.fonts.check('400 16px "Bricolage Grotesque"'),
      ),
    ).toBeTruthy();
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.goto("/services");
  await expect(page.locator(".discipline-grid article")).toHaveCount(11);
  await page
    .locator(".discipline-grid article")
    .first()
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/book\?service=/);
  await expect(page.locator(".booking-panel")).toContainText(
    "Website Development / Design",
  );
  await expect(
    page.getByRole("link", { name: "Request a call by email" }),
  ).toHaveAttribute("href", /^mailto:zxenostudio@gmail.com\?subject=/);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator(".price-note")).toContainText(
    "Temporary placeholder",
  );
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/\/work$/);
  await nav.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await page.goto("/");
  await expect(
    page.locator(".hero").getByRole("link", { name: "Book a call" }),
  ).toBeVisible();
  await expect(page.locator(".team-member")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/multipage-home.png",
    fullPage: true,
  });
  await page.goto("/services");
  await page.screenshot({
    path: "test-results/multipage-services.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
