import { playIntro } from "./intro";
import { projects } from "./content";
export function setupExperience() {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches;
  const cleanups: (() => void)[] = [];
  const controller = new AbortController();
  const signal = controller.signal;
  // In-page navigation scrolls without ever writing a fragment to the address
  // bar, so the site stays on a bare "/" no matter which section you are in.
  const initialHash = location.hash.slice(1);
  const bareUrl = location.pathname + location.search;
  const focusSection = (section: HTMLElement) => {
    if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
    section.focus({ preventScroll: true });
  };
  if (location.hash) history.replaceState(null, "", bareUrl);
  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = (event.target as HTMLElement | null)?.closest?.(
        `a[href^="#"]`,
      ) as HTMLAnchorElement | null;
      const id = link?.getAttribute("href")?.slice(1);
      if (!id) return;
      const section = document.getElementById(decodeURIComponent(id));
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView();
      focusSection(section);
    },
    { signal },
  );
  addEventListener(
    "hashchange",
    () => {
      if (location.hash) history.replaceState(null, "", bareUrl);
    },
    { signal },
  );
  if (initialHash) {
    // Landing on a shared /#section still lands you at that section, minus the
    // fragment: the app mounts after parse, so the jump is ours to make.
    const landing = document.getElementById(decodeURIComponent(initialHash));
    if (landing) {
      landing.scrollIntoView({ behavior: "instant", block: "start" });
      focusSection(landing);
    }
  }
  const videos = [
    ...document.querySelectorAll<HTMLVideoElement>("video[data-src]"),
  ];
  const visible = new Set<HTMLVideoElement>();
  const dialog = document.querySelector<HTMLDialogElement>("#film-dialog")!;
  const player = document.querySelector<HTMLVideoElement>("#film-player")!;
  let introBusy = false;
  function syncVideos() {
    videos.forEach((v) => {
      if (
        visible.has(v) &&
        !document.hidden &&
        !dialog.open &&
        !reduced &&
        !introBusy
      ) {
        if (!v.src) {
          v.src = v.dataset.src!;
          v.load();
        }
        v.play().catch(() => {});
      } else v.pause();
    });
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const v = entry.target as HTMLVideoElement;
        entry.isIntersecting ? visible.add(v) : visible.delete(v);
      });
      syncVideos();
    },
    { threshold: 0.12 },
  );
  videos.forEach((v) => observer.observe(v));
  cleanups.push(() => observer.disconnect());
  motion.addEventListener(
    "change",
    () => {
      reduced = motion.matches;
      syncVideos();
      updateScroll();
    },
    { signal },
  );
  document.addEventListener("visibilitychange", syncVideos, { signal });
  const hero = document.querySelector<HTMLVideoElement>("#hero-video")!;
  hero.src = hero.dataset.src!;
  hero.load();
  const releaseVideo = () => {
    introBusy = false;
    syncVideos();
    if (!reduced) hero.play().catch(() => {});
  };
  let introCleanup: (() => void) | undefined;
  let seen = false;
  try {
    seen = sessionStorage.getItem("zxeno-intro-3d") === "seen";
  } catch {}
  function startIntro() {
    introBusy = true;
    syncVideos();
    // The hero sits behind the mask until the portal opens; starting its decode
    // any earlier just steals frames from the assembling mark.
    return playIntro(reduced, releaseVideo, releaseVideo);
  }
  if (!seen && !initialHash) introCleanup = startIntro();
  else releaseVideo();
  let returnFocus: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>("[data-film]").forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        const project = projects[Number(button.dataset.film)];
        if (!project) return;
        returnFocus = button;
        player.src = `/media/${project.slug}.mp4`;
        document.querySelector("#film-title")!.textContent = project.name;
        dialog.showModal();
        document.body.style.overflow = "hidden";
        syncVideos();
        player.muted = false;
        player.play().catch(() => {});
        document.querySelector<HTMLButtonElement>("#close-film")!.focus();
      },
      { signal },
    ),
  );
  document
    .querySelector("#close-film")!
    .addEventListener("click", () => dialog.close(), { signal });
  dialog.addEventListener(
    "close",
    () => {
      player.pause();
      player.removeAttribute("src");
      player.load();
      document.body.style.overflow = "";
      syncVideos();
      returnFocus?.focus();
    },
    { signal },
  );
  const toggle = document.querySelector("#toggle-film")!;
  const mute = document.querySelector("#mute-film")!;
  const seek = document.querySelector<HTMLInputElement>("#film-seek")!;
  toggle.addEventListener(
    "click",
    () => {
      if (player.paused) player.play().catch(() => {});
      else player.pause();
    },
    { signal },
  );
  player.addEventListener(
    "play",
    () => {
      toggle.querySelector("span")!.textContent = "Pause";
      toggle.setAttribute("data-state", "playing");
    },
    { signal },
  );
  player.addEventListener(
    "pause",
    () => {
      toggle.querySelector("span")!.textContent = "Play";
      toggle.setAttribute("data-state", "paused");
    },
    { signal },
  );
  mute.addEventListener(
    "click",
    () => {
      player.muted = !player.muted;
    },
    { signal },
  );
  player.addEventListener(
    "volumechange",
    () => {
      mute.querySelector("span")!.textContent = player.muted
        ? "Unmute"
        : "Mute";
      mute.setAttribute("data-state", player.muted ? "muted" : "audible");
    },
    { signal },
  );
  player.addEventListener(
    "timeupdate",
    () => {
      seek.value = String(
        player.duration ? (100 * player.currentTime) / player.duration : 0,
      );
    },
    { signal },
  );
  seek.addEventListener(
    "input",
    () => {
      if (Number.isFinite(player.duration))
        player.currentTime = (Number(seek.value) * player.duration) / 100;
    },
    { signal },
  );
  document.querySelector("#fullscreen-film")!.addEventListener(
    "click",
    () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else dialog.requestFullscreen?.().catch(() => {});
    },
    { signal },
  );
  const nav = document.querySelector("header")!;
  const sections = [
    ...document.querySelectorAll<HTMLElement>("main > section[data-tone]"),
  ];
  const reel = document.querySelector<HTMLElement>(".reel-transition")!;
  const reelWindow = document.querySelector<HTMLElement>(".reel-window")!;
  const reelShape =
    document.querySelector<SVGPathElement>("#reel-portal-shape")!;
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const rect = reel.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -rect.top / (rect.height - innerHeight)));
    const eased = p * p * (3 - 2 * p);
    reel.style.setProperty("--reel-progress", String(p));
    reelShape.setAttribute(
      "transform",
      `translate(.5 .5) rotate(${(-18 + eased * 30).toFixed(2)}) scale(${(eased * 3.5).toFixed(4)}) translate(-.5 -.5)`,
    );
    reelWindow.style.clipPath = reduced ? "none" : "url(#reel-portal)";
    const navEdge = nav.getBoundingClientRect().bottom + 32;
    const section = sections.find((section) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= navEdge && bounds.bottom > navEdge;
    });
    const tone =
      section === reel && rect.top < 0 && (p > 0.5 || reduced)
        ? "dark"
        : (section?.dataset.tone ?? "paper");
    nav.classList.toggle("dark", tone === "dark");
    nav.classList.toggle("paper", tone === "paper");
  }
  addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true, signal },
  );
  addEventListener("resize", updateScroll, { signal });
  updateScroll();
  const host = document.querySelector<HTMLElement>("#tools-scene")!;
  let sceneDispose: (() => void) | undefined;
  let disposed = false;
  let sceneStarted = false;
  const lazy = new IntersectionObserver(
    (entries) => {
      if (
        sceneStarted ||
        disposed ||
        document.body.classList.contains("intro-active")
      )
        return;
      if (entries.some((e) => e.isIntersecting)) {
        sceneStarted = true;
        lazy.disconnect();
        import("./tools-scene")
          .then(async (module) => {
            if (disposed) return;
            sceneDispose = await module.createToolsScene(host, motion);
          })
          .catch(() => {
            host.dataset.fallback = "true";
          });
      }
    },
    { rootMargin: "250px" },
  );
  lazy.observe(host);
  window.addEventListener(
    "zxeno:intro-complete",
    () => {
      lazy.unobserve(host);
      lazy.observe(host);
    },
    { signal },
  );
  document.querySelector("#year")!.textContent = String(
    new Date().getFullYear(),
  );
  return () => {
    disposed = true;
    controller.abort();
    observer.disconnect();
    lazy.disconnect();
    sceneDispose?.();
    introCleanup?.();
    cancelAnimationFrame(scrollFrame);
    cleanups.forEach((c) => c());
    videos.forEach((v) => v.pause());
  };
}
