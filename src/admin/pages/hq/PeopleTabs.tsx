import { Link, useLocation } from "../../lib/router";

const PAGES = [
  { path: "/team", label: "Directory" },
  { path: "/workload", label: "Workload" },
  { path: "/leave", label: "Leave" },
];

/* Directory, workload and leave are three separate pages that read as one
   section, so each carries the same strip. They are links rather than tabs
   because each one is its own page. */
export function PeopleTabs() {
  const { path } = useLocation();
  return (
    <nav className="tabs" aria-label="People">
      {PAGES.map((page) => (
        <Link
          key={page.path}
          to={page.path}
          aria-current={path === page.path ? "page" : undefined}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
