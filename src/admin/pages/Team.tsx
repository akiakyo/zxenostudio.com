import { useState } from "react";
import { Phone, Users } from "lucide-react";
import { useApi } from "../lib/api";
import { Link } from "../lib/router";
import type { Member } from "../lib/types";
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  PageHeader,
  SearchInput,
} from "../ui/ui";

export function TeamPage() {
  const { data, error, loading, reload } = useApi<Member[]>("team");
  const [text, setText] = useState("");
  const needle = text.trim().toLowerCase();
  const members = (data ?? []).filter(
    (m) =>
      !needle ||
      [m.name, m.title, m.username].some((v) => v.toLowerCase().includes(needle)),
  );

  return (
    <div className="page">
      <PageHeader title="Team directory" description="Everyone at ZXENO Studio and how to reach them." />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search name or role" />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !members.length && <EmptyState icon={Users} title="No one matches" />}
      <div className="team-grid">
        {members.map((member) => (
          <article key={member.username} className="member-card">
            <Avatar name={member.name || member.username} size={56} />
            <h2>{member.name || member.username}</h2>
            <p className="member-title">{member.title}</p>
            <div className="member-badges">
              {member.access === "executive" && <Badge tone="green">Executive</Badge>}
              <span className="muted">@{member.username}</span>
            </div>
            {member.bio && <p className="member-bio">{member.bio}</p>}
            <div className="member-foot">
              {member.phone ? (
                <a href={`tel:${member.phone.replace(/[^\d+]/g, "")}`} className="contact-link">
                  <Phone size={13} aria-hidden /> {member.phone}
                </a>
              ) : (
                <span className="muted">No phone listed</span>
              )}
              <Link to="/tasks/overview" className="muted">{member.openTasks} open task{member.openTasks === 1 ? "" : "s"}</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
