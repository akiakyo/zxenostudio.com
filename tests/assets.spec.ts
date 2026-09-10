import { test, expect } from "@playwright/test";
test("portfolio galleries, transparent artwork, icons and footer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("zxeno-intro-3d", "seen"),
  );
  await page.goto("/work");
  await expect(page.locator(".portfolio-grid article")).toHaveCount(4);
  for (const name of ["3D VFX", "iPhone", "JBL Headset", "Sauvage Dior"]) {
    const trigger = page.getByRole("button", { name: `View ${name} gallery` });
    await trigger.click();
    await expect(page.locator(".gallery-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Next image" }).click();
    await expect(page.locator(".gallery-full")).toHaveAttribute(
      "src",
      /-2.png$/,
    );
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  // The tilt artwork moved from the Services page onto the home hero, which
  // shows one discipline's cutout at a time (cycling every 3s, or on tab
  // click) rather than all four in a grid.
  await page.goto("/services");
  await expect(page.locator(".artwork-tilt")).toHaveCount(0);
  await page.goto("/");
  const tilt = page.locator(".hero-showcase-stage .artwork-tilt");
  await tilt.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tilt.locator("img")).toHaveAttribute("style", /rotateY\(3deg\)/);
  await page.keyboard.press("Home");
  await expect(tilt.locator("img")).toHaveAttribute("style", /rotateY\(0deg\)/);
  for (const name of [
    "Graphic design",
    "Merchandise",
    "Motion graphics",
    "Website design & development",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    // No scrollIntoViewIfNeeded here: the hero is already in view on a
    // freshly loaded page, and that call's own multi-frame "wait for
    // stable" polling is exactly what can straddle the showcase's 3s
    // auto-advance remount and throw on a node that's mid-replacement.
    const img = page.locator(".hero-showcase-stage .artwork-tilt img");
    await expect
      .poll(() =>
        img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
      )
      .toBeTruthy();
    await expect
      .poll(() =>
        img.evaluate((e: HTMLImageElement) => {
          const c = document.createElement("canvas");
          c.width = e.naturalWidth;
          c.height = e.naturalHeight;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(e, 0, 0);
          return ctx.getImageData(0, 0, 1, 1).data[3];
        }),
      )
      .toBe(0);
  }
  await expect(page.locator(".approach-icon img")).toHaveCount(6);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page
      .locator(".site-footer")
      .screenshot({ path: `test-results/footer-${width}.png` });
  }
  await expect(
    page.locator(".site-footer").getByRole("link", { name: "Book a call" }),
  ).toHaveAttribute("href", "/book");
  expect(errors).toEqual([]);
});
