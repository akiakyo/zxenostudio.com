/* A few lines of history-based routing. The middleware serves the admin app
   for every path on admin.zxenostudio.com, so deep links and reloads work. */
import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

const NAVIGATE_EVENT = "zxeno-admin-navigate";

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (to === location.pathname + location.search) return;
  if (options.replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useLocation() {
  const read = () => ({
    path: location.pathname.replace(/\/+$/, "") || "/",
    search: new URLSearchParams(location.search),
  });
  const [current, setCurrent] = useState(read);
  useEffect(() => {
    const update = () => setCurrent(read());
    window.addEventListener("popstate", update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);
  return current;
}

/* Updates one query parameter in place, without a new history entry. */
export function setSearchParam(name: string, value: string | null) {
  const search = new URLSearchParams(location.search);
  if (value === null || value === "") search.delete(name);
  else search.set(name, value);
  const text = search.toString();
  navigate(`${location.pathname}${text ? `?${text}` : ""}`, { replace: true });
}

export function Link({
  to,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  function click(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={click} {...props} />;
}
