import { createIntroLogo } from "./logo-scene";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight } from "lucide-react";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => n * n * n * (n * (n * 6 - 15) + 10);
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
  overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs><mask id="portal" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><g id="logo-hole" opacity="0"><image href="/assets/Main%20Logo.png" x="-156" y="-160" width="312" height="320"/></g><g id="organic-holes" fill="black"><path/><path/><path/><path/></g></mask><clipPath id="mark-cut"><circle id="mark-circle"/></clipPath></defs><rect width="100%" height="100%" fill="${field}" mask="url(#portal)"/><g id="solid-mark" clip-path="url(#mark-cut)"><image href="/assets/mark.svg" width="312" height="320" x="-156" y="-160"/></g></svg><span class="intro-label">ZXENO Studio / Enter the creative world</span><button class="intro-skip">Skip intro ↗</button>`;
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
  const hole = overlay.querySelector("#logo-hole")!;
  const solid = overlay.querySelector("#solid-mark")!;
  const circle = overlay.querySelector("#mark-circle")!;
  const paths = overlay.querySelectorAll("#organic-holes path");
  // Keep the curved geometry cached. Only its transform changes during reveal.
  paths.forEach((path) =>
    path.setAttribute(
      "d",
      "M -1 0 C -1.1 -.8,-.25 -1.1,.3 -.85 S 1.15 -.2,1 .35 S .1 1.2,-.5 .75 S -1 .3,-1 0 Z",
    ),
  );
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
    overlay.remove();
    document.body.classList.remove("intro-active");
    main.inert = false;
    nav.inert = false;
    // Releasing the GL context and un-inerting the page both force work; let the
    // hand-off animation get its first frames in before paying for the teardown.
    const teardown = logo;
    logo = undefined;
    requestAnimationFrame(() => setTimeout(() => teardown?.dispose(), 0));
    const film = document.querySelector<HTMLElement>(".hero-film")!;
    if (!reduced) {
      const rect = film.getBoundingClientRect();
      film.style.zIndex = "30";
      const animation = film.animate(
        [
          {
            transformOrigin: "0 0",
            transform: `translate(${-rect.left}px,${-rect.top}px) scale(${innerWidth / rect.width},${innerHeight / rect.height})`,
          },
          { transformOrigin: "0 0", transform: "none" },
        ],
        { duration: 1100, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      animation.onfinish = () => {
        film.style.zIndex = "";
      };
      animation.oncancel = () => {
        film.style.zIndex = "";
      };
    }
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
  let lastSolid = "",
    lastCircle = "",
    lastSolidCenter = "",
    lastHole = "0",
    lastHoleCenter = "",
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
    const windowPhase = ease(clamp((t - 1.98) / 0.34));
    const expand = ease(clamp((t - 2.45) / 1.05));
    const scale = size * (1 + expand * 4.5);
    const center = `translate(${w / 2} ${h / 2}) scale(${scale.toFixed(4)})`;
    if (!logo) {
      // Fallback mark: it is the visible one, so it tracks every phase.
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
    const holeOpacity = windowPhase.toFixed(3);
    if (holeOpacity !== lastHole) {
      hole.setAttribute("opacity", holeOpacity);
      lastHole = holeOpacity;
    }
    if (windowPhase > 0 && center !== lastHoleCenter) {
      hole.setAttribute("transform", center);
      lastHoleCenter = center;
      if (!revealed) {
        revealed = true;
        onReveal();
      }
    }
    const organic = expand;
    if (organic > 0)
      paths.forEach((p, i) => {
        const angle = (i * Math.PI) / 2 + 0.4;
        const r = organic * Math.hypot(w, h) * 0.83;
        const cx = w / 2 + Math.cos(angle) * w * 0.26 * organic;
        const cy = h / 2 + Math.sin(angle) * h * 0.22 * organic;
        p.setAttribute(
          "transform",
          `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${r.toFixed(2)})`,
        );
      });
    if (reduced) {
      hole.setAttribute("opacity", "0");
      solid.setAttribute("opacity", logo ? "0" : "1");
      circle.setAttribute("r", "240");
      return;
    } else if (t > 3.55) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return finish;
}
