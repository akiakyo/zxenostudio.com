import { useState } from "react";
import { Phone, Users } from "lucide-react";
import { useApi } from "../lib/api";
import { presenceLabel, workStatus, WORK_TONES } from "../lib/format";
import { Link } from "../lib/router";
import { PeopleTabs } from "./hq/PeopleTabs";
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
  SelectFilter,
} from "../ui/ui";

export function TeamPage() {
  const { data, error, loading, reload } = useApi<Member[]>("team");
  const [text, setText] = useState("");
  const [department,setDepartment]=useState('');
  const needle = text.trim().toLowerCase();
  const members = (data ?? []).filter(
    (m) =>
      (!department||m.department===department)&&(!needle ||
      [m.name, m.title, m.username].some((v) => v.toLowerCase().includes(needle))),
  );

  /* grouped the way the studio is organised; anyone without a department
     recorded still has a home at the end */
  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))].sort();
  const groups = [
    ...departments.map((name) => ({ name, people: members.filter((m) => m.department === name) })),
    { name: "No department set", people: members.filter((m) => !m.department) },
  ].filter((group) => group.people.length);

  return (
    <div className="page">
      <PageHeader
        title="Team"
        description={
          data
            ? `${data.length} ${data.length === 1 ? "person" : "people"} across ${new Set(data.map((m) => m.department).filter(Boolean)).size} departments.`
            : "Everyone at ZXENO Studio and how to reach them."
        }
      />
      <PeopleTabs />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search name or role" />
        <SelectFilter label="Department" allLabel="All departments" value={department} onChange={setDepartment} options={[...new Set((data??[]).map(m=>m.department).filter(Boolean))].map(d=>({value:d,label:d}))}/>
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !members.length && <EmptyState icon={Users} title="No one matches" />}
      {groups.map((group) => (
        <section key={group.name}>
          <h2 className="section-heading">{group.name}</h2>
          <div className="team-grid">
            {group.people.map((member) => (
              <article key={member.username} className="member-card">
                <Avatar name={member.name || member.username} size={56} status={member.presence} />
                <span className="sr-only">{presenceLabel(member.presence)}.</span>
                <h3>{member.name || member.username}</h3>
                <p className="member-title">{member.title}</p>
                <div className="member-badges">
                  <Badge tone={WORK_TONES[member.workStatus] ?? "neutral"}>{workStatus(member.workStatus)}</Badge>
                  {member.access === "executive" && <Badge tone="green">Executive</Badge>}
                </div>
                {member.bio && <p className="member-bio">{member.bio}</p>}
                <div className="member-foot">
                  <Link to={`/chat?dm=${encodeURIComponent(member.username)}`} className="contact-link">Message</Link>
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
        </section>
      ))}
    </div>
  );
}
