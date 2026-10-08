/* Skeleton shimmer behind artwork while it loads. Opt-in: an <img> or a
   <video> with a poster marks itself with data-skeleton, and its parent
   shimmers until the image (or the video's poster frame) has arrived, then
   the media fades in. Images that are already cached skip all of it. A
   MutationObserver picks up media React adds later, such as the gallery's
   full-size view as someone steps through it. */

function settle(holder: HTMLElement, media: HTMLElement) {
  holder.classList.remove("media-loading");
  media.classList.remove("media-pending");
}

function watch(media: HTMLImageElement | HTMLVideoElement) {
  const holder = media.parentElement;
  if (!holder) return;
  if (media instanceof HTMLImageElement) {
    /* the gallery reuses one <img> and swaps its src, so listen every time */
    if (media.complete && media.naturalWidth) return settle(holder, media);
    holder.classList.add("media-loading");
    media.classList.add("media-pending");
    const done = () => settle(holder, media);
    media.addEventListener("load", done, { once: true });
    media.addEventListener("error", done, { once: true });
    return;
  }
  /* a video shows its poster long before any video data loads, so watch the
     poster image itself */
  if (!media.poster || media.dataset.skeletonSeen) return;
  media.dataset.skeletonSeen = "1";
  const probe = new Image();
  probe.src = media.poster;
  if (probe.complete && probe.naturalWidth) return;
  holder.classList.add("media-loading");
  media.classList.add("media-pending");
  const done = () => settle(holder, media);
  probe.addEventListener("load", done, { once: true });
  probe.addEventListener("error", done, { once: true });
}

function scan(root: ParentNode) {
  root
    .querySelectorAll<HTMLImageElement | HTMLVideoElement>("img[data-skeleton], video[data-skeleton]")
    .forEach(watch);
}

export function setupMediaSkeletons() {
  scan(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        const target = record.target as HTMLElement;
        if (target.matches("img[data-skeleton]")) watch(target as HTMLImageElement);
        continue;
      }
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("img[data-skeleton], video[data-skeleton]")) watch(node as HTMLImageElement);
        scan(node);
      });
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
  return () => observer.disconnect();
}
