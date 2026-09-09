import { test, expect } from "@playwright/test";
test("team directory, supplied roles, and homepage exclusions", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  await expect(page.locator(".project").nth(2)).toContainText("DITO MAXX");
  await expect(page.locator('.project')).toHaveCount(3);
  await expect(page.locator('.project').nth(1)).toContainText('RED LINE');
  await expect(page.locator('.hero')).not.toContainText('DITO');
  await expect(page.locator('#hero-video')).toHaveAttribute('data-src','/media/redline-preview.mp4');
  await expect(page.locator(".section-top")).not.toContainText([/\b0[1-9]\b/]);
  await expect(page.locator(".team-member")).toHaveCount(12);
  await expect(page.locator(".team-member a")).toHaveCount(10);
  await expect(
    page
      .locator(".team-member")
      .filter({ hasText: "Kierre Paolo" })
      .locator("a"),
  ).toHaveAttribute("href", "mailto:zaevara.zxeno@gmail.com");
  await expect(page.locator("#service-list")).toContainText(
    "Software engineering",
  );
  await expect(page.locator("#service-list")).not.toContainText("AI pipelines");
  await page.getByRole("link", { name: "Team", exact: true }).click();
  await expect(page.locator("#team")).toBeInViewport();
  await page.screenshot({ path: "test-results/team-desktop.png" });
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#team").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({ path: `test-results/team-${width}.png` });
  }
  expect(requested.some((url) => url.endsWith("/media/dito.webp"))).toBeTruthy();
});
test("mobile 3D selection, drag, keyboard and reset", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#creative").scrollIntoViewIfNeeded();
  const scene = page.locator("#tools-scene");
  await expect(scene.locator("canvas")).toBeVisible();
  await expect(page.locator('[data-tool]')).toHaveCount(7);
  await expect(page.locator('.lucide-asterisk')).toHaveCount(0);
  for(const [index,name] of [[4,'Photoshop'],[5,'DaVinci Resolve'],[6,'Illustrator']] as const){
    await page.locator(`[data-tool="${index}"]`).click();
    await expect(page.locator('.tool-status')).toHaveText(name);
    await expect(scene).toHaveAttribute('data-selected',String(index));
  }
  await page.locator('[data-tool="3"]').click();
  await expect(page.locator('[data-tool="3"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".tool-status")).toHaveText("Blender");
  await scene.focus();
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-rotation", "0.120");
  await page.keyboard.press("Home");
  await expect(scene).toHaveAttribute("data-selected", "-1");
  const box = await scene.boundingBox();
  if (!box) throw Error("Missing 3D viewport");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(scene).not.toHaveAttribute("data-rotation", "0.000");
  await page.screenshot({ path: "test-results/interactive-mobile.png" });
  await page.locator("[data-reset-tools]").click();
  await expect(page.locator(".tool-status")).toHaveText("The creative toolkit");
});

test("touchscreen intro and tool controls preserve mobile scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const time = new Date("2026-09-10T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator(".intro-logo-scene canvas")).toBeVisible();
  await page.clock.runFor(1000);
  await page.screenshot({ path: "test-results/intro-3d-mobile.png" });
  await page.clock.runFor(1800);
  await page.screenshot({ path: "test-results/intro-organic-mobile.png" });
  await page.clock.runFor(1900);
  await page.clock.resume();
  await expect(page.locator(".intro")).toHaveCount(0, { timeout: 7000 });
  await page.locator("#creative").scrollIntoViewIfNeeded();
  await expect(page.locator("#tools-scene canvas")).toBeVisible();
  await page.locator('[data-tool="0"]').tap();
  await expect(page.locator('[data-tool="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#tools-scene")).toHaveCSS("touch-action", "pan-y");
  const scene = page.locator("#tools-scene");
  await scene.scrollIntoViewIfNeeded();
  const rect = await scene.boundingBox();
  if (!rect) throw Error("Missing scene");
  const cdp = await context.newCDPSession(page);
  const y = Math.min(700, rect.y + rect.height * 0.6),
    x = rect.x + rect.width * 0.5;
  const before = await page.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let offset = 20; offset <= 140; offset += 20)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - offset }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await context.close();
});
