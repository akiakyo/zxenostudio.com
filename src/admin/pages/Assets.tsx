import { useState } from "react";
import {
  Box,
  ExternalLink,
  File,
  Image,
  Images,
  Music,
  Palette,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { del, query, useApi } from "../lib/api";
import { label, options, timeAgo } from "../lib/format";
import { Link } from "../lib/router";
import type { Asset, AssetKind } from "../lib/types";
import { useWorkspace } from "../lib/workspace";
import { useAssetEditor } from "../ui/editors";
import {
  Button,
  EmptyState,
  ErrorNote,
  FilterBar,
  Loading,
  Menu,
  PageHeader,
  SearchInput,
  SelectFilter,
  useAction,
  useDebounced,
  useUi,
} from "../ui/ui";

const KIND_ICONS: Record<AssetKind, typeof Image> = {
  image: Image,
  video: Video,
  document: File,
  "3d": Box,
  audio: Music,
  design: Palette,
  other: Paperclip,
};

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function AssetsPage() {
  const { session, isExecutive, projects } = useWorkspace();
  const [kind, setKind] = useState("");
  const [projectId, setProjectId] = useState("");
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Asset[]>(`assets${query({ kind, projectId, q })}`);
  const editor = useAssetEditor(() => reload());
  const run = useAction();
  const { confirm } = useUi();

  async function remove(asset: Asset) {
    if (
      (await confirm({ title: "Remove this asset?", body: "Only the link is removed; the file itself stays where it is.", confirmLabel: "Remove", danger: true })) &&
      (await run(() => del(`assets?id=${asset.id}`), "Asset removed"))
    ) {
      reload();
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Asset library"
        description="Links to the studio's files: renders, footage, design sources and documents."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.openNew({ kind: "image", projectId })}>Add asset link</Button>}
      />
      <FilterBar>
        <SearchInput value={text} onChange={setText} placeholder="Search names and tags" />
        <SelectFilter label="Type" allLabel="All types" value={kind} onChange={setKind} options={options(["image", "video", "document", "3d", "audio", "design", "other"])} />
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Images} title={q || kind || projectId ? "No assets match" : "The library is empty"}>
          Add links to files in Google Drive, Dropbox or Frame.io so everyone can find them.
        </EmptyState>
      )}
      <div className="asset-grid">
        {data?.map((asset) => {
          const Icon = KIND_ICONS[asset.kind];
          return (
            <article key={asset.id} className="asset-card">
              <div className={`asset-thumb kind-${asset.kind}`}>
                <Icon size={28} aria-hidden />
                <span>{label(asset.kind)}</span>
              </div>
              <div className="asset-body">
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="asset-name">
                  {asset.name} <ExternalLink size={12} aria-hidden />
                </a>
                <span className="cell-sub">{host(asset.url)}</span>
                {asset.projectId && (
                  <Link to={`/projects/${asset.projectId}?tab=assets`} className="asset-project">{asset.projectName}</Link>
                )}
                {asset.tags && (
                  <div className="tags">
                    {asset.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                )}
                <span className="cell-sub">Added by {asset.createdByName} · {timeAgo(asset.createdAt)}</span>
              </div>
              <div className="asset-menu">
                <Menu
                  items={[
                    { label: "Edit", icon: Pencil, onSelect: () => editor.openEdit(asset) },
                    (asset.createdBy === session.username || isExecutive) && {
                      label: "Remove",
                      icon: Trash2,
                      danger: true,
                      onSelect: () => remove(asset),
                    },
                  ]}
                />
              </div>
            </article>
          );
        })}
      </div>
      {editor.element}
    </div>
  );
}
