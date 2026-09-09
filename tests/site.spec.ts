import { test, expect } from "@playwright/test";
test("logo portal reveals site, remembers session, and can be skipped", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".intro")).toBeVisible();
  await expect(page.locator(".intro-logo-scene canvas")).toBeVisible();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: "test-results/intro-portal.png" });
  await expect(page.locator(".intro")).toHaveCount(0, { timeout: 7000 });
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await page.reload();
  await expect(page.locator(".intro")).toHaveCount(0);
  await page.evaluate(()=>sessionStorage.removeItem('zxeno-intro-3d'));
  await page.reload();
  await expect(page.locator(".intro")).toBeVisible();
  await page.locator(".intro-skip").click();
  await expect(page.locator(".intro")).toHaveCount(0);
});
test("responsive composition, lazy media, WebGL and film controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  await expect(page.locator("#project-list video").first()).not.toHaveAttribute(
    "src",
  );
  for (const width of [1920, 1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `test-results/home-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#creative").scrollIntoViewIfNeeded();
  await expect(page.locator("#tools-scene canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/creative-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#creative").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/creative-mobile.png" });
  await page.screenshot({
    path: "test-results/full-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/about-desktop.png" });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#replay-intro')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Back to top'})).toHaveCount(0);
  await expect(page.locator('.team-member .lucide-mail')).toHaveCount(10);
  await expect(page.locator('.studio-address .lucide-map-pin')).toHaveCount(1);
  await page.screenshot({path:'test-results/footer-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/footer-mobile.png'});
  await page.locator('[data-film="0"]').first().click();
  await expect(page.locator("#film-dialog")).toBeVisible();
  await expect(page.locator("#film-player")).toHaveJSProperty("paused", false);
  await page.locator("#toggle-film").click();
  await expect(page.locator("#film-player")).toHaveJSProperty("paused", true);
  await page.locator("#mute-film").click();
  await expect(page.locator("#film-player")).toHaveJSProperty("muted", true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#film-dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("organic screening transition and all project sources work", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  await page.locator(".reel-transition").evaluate((el) =>
    scrollTo({
      top: el.getBoundingClientRect().top + scrollY + innerHeight * 0.7,
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/reel-transition.png" });
  for (const slug of ["ncfp", "redline"]) {
    const response = await page.request.get(`/media/${slug}.mp4`, {
      headers: { Range: "bytes=0-1023" },
    });
    expect(response.status()).toBe(206);
    expect(response.headers()["content-type"]).toContain("video/mp4");
  }
});
test("reduced motion and keyboard navigation remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".intro")).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator("#hero-video")).toHaveJSProperty("paused", true);
  await page.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page.locator("#service-list")).toBeInViewport();
  await page.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page.locator("#contact")).toBeInViewport();
  expect(await page.locator(".contact-title").getAttribute("href")).toBe(
    "mailto:zxenostudio@gmail.com",
  );
});
test("in-page navigation never puts a fragment in the address bar", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  for (const name of ["Work", "About", "Team", "Services"]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).hash).toBe("");
  }
  await expect(page.locator("#services")).toBeInViewport();
  await page.getByRole("link", { name: "ZXENO Studio home" }).click();
  await expect(page.locator("#top")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("");
  // A shared /#section link still lands on the section, then drops the hash.
  await page.goto("/#team");
  await expect(page.locator("#team")).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("");
});
