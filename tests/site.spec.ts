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
  await page.evaluate(() => sessionStorage.removeItem("zxeno-intro-3d"));
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
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator("#replay-intro")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to top" })).toHaveCount(0);
  await expect(page.locator(".team-member .lucide-mail")).toHaveCount(10);
  await expect(page.locator(".studio-address .lucide-map-pin")).toHaveCount(1);
  await page.screenshot({ path: "test-results/footer-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/footer-mobile.png" });
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
test("theme toggle switches, persists, and follows the system by default", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  // No stored choice: the system preference decides.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle .icon-dark")).toBeVisible();
  await expect(page.locator("#theme-toggle .icon-light")).toBeHidden();

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme-toggle .icon-light")).toBeVisible();

  // An explicit choice wins over the system and survives a reload.
  const toggle = page.locator("#theme-toggle");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Section tones resolve per theme rather than staying frozen.
  const hero = page.locator("#top");
  await expect(hero).toHaveCSS("background-color", "rgb(16, 23, 16)");
  await toggle.click();
  await expect(hero).toHaveCSS("background-color", "rgb(242, 241, 236)");
});
test("themes differ only in colour, never in layout or typography", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("zxeno-intro-3d", "seen");
    localStorage.setItem("zxeno-theme", "light");
  });
  await page.goto("/");
  // Settle the entrance motion first: this compares resting styles, not
  // whichever frame of a reveal each snapshot happened to catch. Transitions
  // stay enabled so a dropped --ease still shows up as a difference.
  const settle = async () => {
    await page.evaluate(() =>
      document
        .querySelectorAll(".reveal-fade, .reveal-lines")
        .forEach((el) => el.classList.add("is-in")),
    );
    await page.waitForTimeout(1500);
  };
  await settle();
  const PROPS = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "width",
    "height",
    "display",
    "position",
    "gap",
    "borderTopWidth",
    "borderBottomWidth",
    "borderRadius",
    "opacity",
    "textTransform",
    "transitionTimingFunction",
  ];
  const snap = () =>
    page.evaluate(
      (props) =>
        [...document.querySelectorAll("body *")]
          // The toggle's own icons are meant to swap.
          .filter((el) => !el.closest(".theme-toggle"))
          .map((el) => {
            const cs = getComputedStyle(el);
            return props.map((p) => cs[p]).join("|");
          }),
      PROPS,
    );
  const light = await snap();
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await settle();
  const dark = await snap();
  expect(dark).toEqual(light);
});
test("accent words carry the serif voice in green", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  const green = "rgb(74, 146, 39)";
  for (const [selector, word] of [
    [".creative h2 .accent", "MOTION"],
    [".about h2 .accent", "POSSIBILITIES"],
    [".contact-title em", "MATTER."],
  ] as const) {
    const el = page.locator(selector);
    await expect(el).toHaveText(word);
    await expect(el).toHaveCSS("color", green);
    await expect(el).toHaveCSS("font-family", "Georgia, serif");
  }
});

test("display headings reveal line by line and nothing stays hidden", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  // The two headings the animation was asked for keep their words after splitting.
  await expect(page.locator(".hero h1 .line")).toHaveCount(2);
  await expect(page.locator(".hero h1")).toHaveText(
    /MOTION WITH\s*INTENTION\./,
  );
  await expect(page.locator(".creative h2 .line")).toHaveCount(3);
  await expect(page.locator(".creative h2")).toHaveText(
    /IDEAS IN\.\s*MOTION\s*OUT\./,
  );
  await expect(page.locator(".hero h1")).toHaveClass(/is-in/);

  // Jumping straight to the end must not strand content at opacity 0 — neither
  // the last screenful nor anything scrolled past on the way.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  const stranded = await page.evaluate(
    () =>
      [...document.querySelectorAll(".reveal-fade, .reveal-lines")].filter(
        (el) =>
          !el.classList.contains("is-in") ||
          Number(getComputedStyle(el).opacity) < 0.99,
      ).length,
  );
  expect(stranded).toBe(0);
});

test("tools spread across the section and each one moves on its own", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/");
  const scene = page.locator("#tools-scene");
  await page.locator("#creative").scrollIntoViewIfNeeded();
  await expect(scene.locator("canvas")).toBeVisible();
  // The scene fills the stage rather than sitting in a right-hand column.
  const stage = await page.locator(".creative-stage").boundingBox();
  const box = await scene.boundingBox();
  if (!stage || !box) throw Error("Missing stage");
  expect(box.width).toBeGreaterThan(stage.width * 0.97);
  await page.waitForTimeout(1200);

  let grabbed: string | null = null;
  for (const [fx, fy] of [
    [0.5, 0.5],
    [0.35, 0.35],
    [0.65, 0.6],
    [0.3, 0.72],
    [0.7, 0.28],
    [0.55, 0.8],
  ] as const) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
    await page.mouse.down();
    grabbed = await scene.getAttribute("data-grabbing");
    if (grabbed) break;
    await page.mouse.up();
  }
  expect(grabbed).toBeTruthy();
  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.15, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-moved", "1");
  await page.locator("[data-reset-tools]").click();
  await expect(scene).toHaveAttribute("data-moved", "0");
});
