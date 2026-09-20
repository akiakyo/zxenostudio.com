import { useEffect, useState } from "react";
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
  Copy,
  Eye,
} from "lucide-react";
import { del, query, useApi } from "../lib/api";
import { label, options, timeAgo } from "../lib/format";
import { Link, useLocation } from "../lib/router";
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
  Modal,
  Tabs,
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
  const {search}=useLocation();const [selected,setSelected]=useState<string|null>(search.get('id'));
  const selectedId=search.get('id');useEffect(()=>setSelected(selectedId),[selectedId]);
  const [view,setView]=useState('grid'),[folder,setFolder]=useState('');
  const { session, isExecutive, projects } = useWorkspace();
  const [kind, setKind] = useState("");
  const [projectId, setProjectId] = useState("");
  const [text, setText] = useState("");
  const q = useDebounced(text);
  const { data, error, loading, reload } = useApi<Asset[]>(`assets${query({ kind, projectId, q })}`);
  const editor = useAssetEditor(() => reload());
  const run = useAction();
  const { confirm } = useUi();
  const rows=(data??[]).filter(a=>!folder||a.folder===folder);
  const preview=data?.find(a=>a.id===selected);

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
        <Tabs label="Asset view" value={view} onChange={setView} tabs={[{value:'grid',label:'Grid'},{value:'list',label:'List'}]}/>
        <SearchInput value={text} onChange={setText} placeholder="Search names and tags" />
        <SelectFilter label="Type" allLabel="All types" value={kind} onChange={setKind} options={options(["image", "video", "document", "3d", "audio", "design", "other"])} />
        <SelectFilter label="Project" allLabel="All projects" value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        <SelectFilter label="Folder" allLabel="All folders" value={folder} onChange={setFolder} options={[...new Set((data??[]).map(a=>a.folder).filter(Boolean))].map(f=>({value:f,label:f}))}/>
      </FilterBar>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && !data.length && (
        <EmptyState icon={Images} title={q || kind || projectId ? "No assets match" : "The library is empty"}>
          Add links to files in Google Drive, Dropbox or Frame.io so everyone can find them.
        </EmptyState>
      )}
      {view==='list'?<div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Type</th><th>Folder</th><th>Size</th><th>Added by</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><button className="text-btn cell-title" onClick={()=>setSelected(a.id)}>{a.name}</button></td><td>{label(a.kind)}</td><td>{a.folder||'—'}</td><td>{a.sizeLabel||'—'}</td><td>{a.createdByName}</td></tr>)}</tbody></table></div>:<div className="asset-grid">
        {rows.map((asset) => {
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
                    {label:'Preview',icon:Eye,onSelect:()=>setSelected(asset.id)},
                    {label:'Copy link',icon:Copy,onSelect:()=>{run(()=>navigator.clipboard.writeText(asset.url),'Link copied');}},
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
      </div>}
      {preview&&<Modal open title={preview.name} onClose={()=>setSelected(null)} size="lg" footer={<><Button onClick={()=>{run(()=>navigator.clipboard.writeText(preview.url),'Link copied');}}>Copy link</Button><a className="btn btn-primary btn-md" href={preview.url} target="_blank" rel="noopener noreferrer">Open / download original</a></>}><div className="hq-stack">{preview.kind==='image'?<img className="hq-media" src={preview.url} alt={preview.name}/>:preview.kind==='video'?<video className="hq-media" controls preload="metadata" src={preview.url}/>:preview.kind==='audio'?<audio controls src={preview.url}/>:<p>Open the original file to preview this format.</p>}<p className="muted">Hosted file links may require access from their provider.</p><p>{preview.description}</p><p>{preview.folder||'No folder'} · {preview.sizeLabel||'Size not specified'}</p></div></Modal>}
      {editor.element}
    </div>
  );
}
