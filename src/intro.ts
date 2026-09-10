import { createIntroLogo } from "./logo-scene";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight } from "lucide-react";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => n * n * n * (n * (n * 6 - 15) + 10);
// Phase timeline, in the animation's own elapsed seconds (see frame() below),
// not wall-clock time. WINDOW_START/RAMP line up with logo-scene.ts's own
// fade-out (smoothstep 1.95-2.2), so the word-mark image fades in as a
// plain top-layer element at the same moment the 3D mark fades out — a
// morph from one logo to the other. It holds there, legible, for
// MORPH_HOLD, then FLY_RAMP carries it — shrinking and translating — from
// its centered hold position to the real header logo's own position, a
// shared-element hand-off rather than a generic zoom-out: it lands right
// where the actual (already-rendered, just-covered) nav logo sits, and the
// green field fades out alongside it to reveal the real page underneath.
// FINISH_AT leaves a short settle buffer after that fade completes so the
// page is already fully visible and interactive the instant the intro
// hands off — no flash of the old, still-inert page.
const WINDOW_START = 1.98;
const WINDOW_RAMP = 0.34;
const MORPH_HOLD = 0.5;
const FLY_START = WINDOW_START + WINDOW_RAMP + MORPH_HOLD;
const FLY_RAMP = 0.9;
const FINISH_AT = FLY_START + FLY_RAMP + 0.2;
// An extruded WebGL mark assembles before handing off to the original logo mask.
export function playIntro(
  reduced: boolean,
  onDone: () => void,
  onReveal: () => void = () => {},
) {
  const overlay = document.createElement("div");
  overlay.className = "intro";
  const field =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--brand")
      .trim() || "#55A630";
  overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="mark-cut"><circle id="mark-circle"/></clipPath></defs><rect id="portal-field" width="100%" height="100%" fill="${field}"/><g id="solid-mark" clip-path="url(#mark-cut)"><image href="/assets/mark.svg" width="312" height="320" x="-156" y="-160"/></g></svg><span class="intro-label">ZXENO Studio / Enter the creative world</span><button class="intro-skip">Skip intro ↗</button>`;
  // The word-mark is a plain, unmasked top-layer element (positioned, so it
  // stacks above the static <svg> the same way .intro-logo-scene does — see
  // the CSS comment there) rather than something revealed through a small
  // mark-shaped cutout: that cutout is tiny (~the 3D mark's own footprint)
  // next to this image, so routing it through there just cropped it to an
  // unreadable sliver. Its own scale/opacity are driven directly in frame()
  // below.
  let wordLogo: HTMLImageElement | undefined;
  if (!reduced) {
    wordLogo = document.createElement("img");
    wordLogo.className = "intro-word-logo";
    wordLogo.alt = "";
    wordLogo.setAttribute("aria-hidden", "true");
    wordLogo.src = "/assets/Word%20Logo.png";
    overlay.append(wordLogo);
  }
  document.body.append(overlay);
  const skip = overlay.querySelector<HTMLButtonElement>(".intro-skip")!;
  skip.textContent = "Skip intro ";
  const skipIcon = document.createElement("span");
  skip.append(skipIcon);
  const iconRoot = createRoot(skipIcon);
  iconRoot.render(
    createElement(ArrowUpRight, { "aria-hidden": true, size: 14 }),
  );
  const logoHost = document.createElement("div");
  logoHost.className = "intro-logo-scene";
  logoHost.setAttribute("aria-label", "Three-dimensional ZXENO logo");
  overlay.insertBefore(logoHost, overlay.querySelector(".intro-label"));
  document.body.classList.add("intro-active");
  const main = document.querySelector("main")!;
  const nav = document.querySelector("header")!;
  main.inert = true;
  nav.inert = true;
  const fieldRect = overlay.querySelector<SVGRectElement>("#portal-field")!;
  const solid = overlay.querySelector("#solid-mark")!;
  const circle = overlay.querySelector("#mark-circle")!;
  let raf = 0,
    finished = false;
  let logo: ReturnType<typeof createIntroLogo> | undefined;
  try {
    if (!reduced) {
      logo = createIntroLogo(logoHost);
      logo.render(0, false);
    }
  } catch {
    /* Native mark remains usable without WebGL. */
  }
  const start = performance.now();
  const reducedTimer = reduced ? window.setTimeout(finish, 750) : undefined;
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(reducedTimer);
    queueMicrotask(() => iconRoot.unmount());
    // Everything below makes the real page live immediately (it's already
    // been rendering the whole time, just inert and covered). The overlay
    // itself — field and word-mark, whatever is left of either — dissolves
    // on top of it rather than being torn away instantly, which otherwise
    // reads as a leftover frame flashing then vanishing.
    if (reduced) {
      overlay.remove();
    } else {
      // pointer-events:none first, so the now-live page underneath is
      // actually clickable through the fade rather than blocked by it.
      overlay.style.pointerEvents = "none";
      overlay.style.transition = "opacity .35s ease";
      overlay.style.opacity = "0";
      overlay.addEventListener("transitionend", () => overlay.remove(), {
        once: true,
      });
      window.setTimeout(() => overlay.remove(), 500); // safety net
    }
    document.body.classList.remove("intro-active");
    main.inert = false;
    nav.inert = false;
    // Releasing the GL context and un-inerting the page both force work; let the
    // hand-off animation get its first frames in before paying for the teardown.
    const teardown = logo;
    logo = undefined;
    requestAnimationFrame(() => setTimeout(() => teardown?.dispose(), 0));
    try {
      sessionStorage.setItem("zxeno-intro-3d", "seen");
    } catch {}
    onDone();
    // Avoid compiling another WebGL scene during the hero handoff.
    window.setTimeout(
      () => window.dispatchEvent(new Event("zxeno:intro-complete")),
      reduced ? 0 : 1150,
    );
  }
  overlay.querySelector("button")!.addEventListener("click", finish);
  // Every attribute write below invalidates a full-screen SVG mask, so each one
  // is gated on the phase that actually needs it and skipped when unchanged.
  if (logo) solid.setAttribute("opacity", "0");
  // Computed lazily, once, the first time the fly-in actually needs it —
  // .brand is real, already-rendered page content (just covered, not
  // hidden), so its rect is exactly where the word-mark should land.
  let morphTarget: { dx: number; dy: number; scale: number } | null = null;
  function computeMorphTarget() {
    const brand = document.querySelector<HTMLElement>(".brand");
    if (!brand) return null;
    const b = brand.getBoundingClientRect();
    if (!b.width) return null;
    // .intro-word-logo's own rendered box (see its CSS: width min(560px,
    // 70vw), square), and the fraction of that square the wordmark's actual
    // content (mark + type) occupies — the source PNG is a padded square,
    // not a tight crop.
    const boxSize = Math.min(560, innerWidth * 0.7);
    const contentWidth = boxSize * 0.67;
    return {
      dx: b.left + b.width / 2 - innerWidth / 2,
      dy: b.top + b.height / 2 - innerHeight / 2,
      scale: Math.max(0.04, Math.min(1, b.width / contentWidth)),
    };
  }
  let lastSolid = "",
    lastCircle = "",
    lastSolidCenter = "",
    lastField = "1",
    logoDone = false,
    revealed = false;
  let previous = start,
    elapsed = 0;
  function frame(now: number) {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (!document.hidden) elapsed += dt;
    const t = elapsed;
    const w = innerWidth,
      h = innerHeight;
    const size = Math.min(w / 700, 1) * 0.68;
    if (logo && !logoDone) logoDone = logo.render(t, reduced);
    const reveal = ease(clamp(t / 0.85));
    const windowPhase = ease(clamp((t - WINDOW_START) / WINDOW_RAMP));
    const flyProgress = ease(clamp((t - FLY_START) / FLY_RAMP));
    if (!logo) {
      // Fallback mark: it is the visible one, so it tracks every phase.
      const center = `translate(${w / 2} ${h / 2}) scale(${size.toFixed(4)})`;
      if (center !== lastSolidCenter) {
        solid.setAttribute("transform", center);
        lastSolidCenter = center;
      }
      const r = (240 * reveal).toFixed(2);
      if (r !== lastCircle) {
        circle.setAttribute("r", r);
        lastCircle = r;
      }
      const opacity = (1 - windowPhase).toFixed(3);
      if (opacity !== lastSolid) {
        solid.setAttribute("opacity", opacity);
        lastSolid = opacity;
      }
    }
    if (windowPhase > 0 && !revealed) {
      revealed = true;
      onReveal();
    }
    if (wordLogo) {
      if (flyProgress > 0 && !morphTarget) morphTarget = computeMorphTarget();
      const target = morphTarget ?? { dx: 0, dy: 0, scale: 0.3 };
      const dx = (target.dx * flyProgress).toFixed(1);
      const dy = (target.dy * flyProgress).toFixed(1);
      const s = (1 + (target.scale - 1) * flyProgress).toFixed(4);
      // Visible through nearly the whole flight, then fades fast right at
      // the end as it lands — that fade is what actually cuts it over to
      // the real (identically positioned) header logo underneath.
      const landed = clamp((flyProgress - 0.82) / 0.18);
      wordLogo.style.opacity = (windowPhase * (1 - landed)).toFixed(3);
      wordLogo.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${s})`;
    }
    // The field fades out over the back of the flight so the real page
    // resolves right as the word-mark reaches the header, instead of the
    // green sitting there a beat longer than the thing landing on it.
    const fieldOpacity = (1 - ease(clamp((flyProgress - 0.7) / 0.3))).toFixed(
      3,
    );
    if (fieldOpacity !== lastField) {
      fieldRect.setAttribute("opacity", fieldOpacity);
      lastField = fieldOpacity;
    }
    if (reduced) {
      solid.setAttribute("opacity", logo ? "0" : "1");
      circle.setAttribute("r", "240");
      return;
    } else if (t > FINISH_AT) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return finish;
}
