import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { del, useApi } from '../../lib/api';
import { useWorkspace } from '../../lib/workspace';
import { useEditor } from '../../ui/editors';
import type { FieldDef } from '../../ui/form';
import { useLocation } from '../../lib/router';
import { Button, EmptyState, ErrorNote, Loading, Menu, SearchInput, useAction, useUi } from '../../ui/ui';

export type RecordRow = {id:string; createdBy:string; [key:string]:any};
export type RecordConfig = {
 resource:string; noun:string; fields:FieldDef[];
 columns:{label:string; render:(r:RecordRow)=>ReactNode}[];
 defaults?:Record<string,unknown>; executiveOnly?:boolean;
 canEdit?:(r:RecordRow,me:string,executive:boolean)=>boolean;
 canDelete?:(r:RecordRow,me:string,executive:boolean)=>boolean;
};

/** Uses the same table, editor, confirmation and error handling as existing admin pages. */
export function Records({config, extra, onSelect, refresh=0}:{config:RecordConfig;extra?:(r:RecordRow,reload:()=>void)=>ReactNode;onSelect?:(r:RecordRow)=>void;refresh?:number}) {
 const {session,isExecutive}=useWorkspace();
 const {data,error,loading,reload}=useApi<RecordRow[]>(`${config.resource}?refresh=${refresh}`);
 const [text,setText]=useState('');const run=useAction();const {confirm}=useUi();
 const editor=useEditor<RecordRow>(config,()=>reload());
  const allowed=!config.executiveOnly||isExecutive;
 const {search}=useLocation();const opened=useRef<string|null>(null);const selected=search.get('id');
 useEffect(()=>{const row=data?.find(r=>r.id===selected);if(row&&opened.current!==selected&&allowed&&(config.canEdit?.(row,session.username,isExecutive)??true)){opened.current=selected;if(onSelect)onSelect(row);else editor.openEdit(row);}},[data,selected,allowed]);
 const rows=(data??[]).filter(r=>!text||Object.values(r).some(v=>typeof v==='string'&&v.toLowerCase().includes(text.toLowerCase())));
 return <>
  <div className="toolbar"><SearchInput value={text} onChange={setText} placeholder={`Search ${config.noun}`} />{allowed&&<Button variant="primary" icon={Plus} onClick={()=>editor.openNew(config.defaults)}>New {config.noun}</Button>}</div>
  {error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}
  {data&&!rows.length&&<EmptyState icon={FileText} title={text?'No matches':`No ${config.noun} records yet`}/>}
  {!!rows.length&&<div className="table-wrap"><table className="table"><thead><tr>{config.columns.map(c=><th key={c.label} scope="col">{c.label}</th>)}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
   {rows.map(r=><tr key={r.id}>{config.columns.map((c,i)=><td key={c.label}>{i===0&&onSelect?<button className="text-btn cell-title" onClick={()=>onSelect(r)}>{c.render(r)}</button>:c.render(r)}</td>)}<td><div className="row-buttons">{extra?.(r,reload)}<Menu items={[
    allowed&&(config.canEdit?.(r,session.username,isExecutive)??true)&&{label:'Edit',icon:Pencil,onSelect:()=>editor.openEdit(r)},
    allowed&&(config.canDelete?.(r,session.username,isExecutive)??(r.createdBy===session.username||isExecutive))&&{label:'Delete',icon:Trash2,danger:true,onSelect:async()=>{
     if(await confirm({title:`Delete ${config.noun}?`,body:'This cannot be undone.',confirmLabel:'Delete',danger:true})){
      if(await run(()=>del(`${config.resource}?id=${r.id}`),'Deleted'))reload();
     }
    }},
   ]}/></div></td></tr>)}
  </tbody></table></div>}{editor.element}
 </>;
}
