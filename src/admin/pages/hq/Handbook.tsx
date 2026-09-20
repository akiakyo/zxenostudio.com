import { useState } from 'react';
import { Modal, MultilineText, PageHeader } from '../../ui/ui';
import { Records, type RecordRow } from './Records';
import { handbookConfig } from './config';
import { useApi } from '../../lib/api';
import { useLocation, setSearchParam } from '../../lib/router';
export function HandbookPage(){
 const [selected,setSelected]=useState<RecordRow|null>(null);
 const {search}=useLocation();const doc=useApi<RecordRow>(search.get('id')?`handbook?id=${search.get('id')}`:null);const active=selected|| (search.get('id')?doc.data:null);
 return <div className="page"><PageHeader title="Handbook" description="Studio processes, brand guidance and team reference documents."/><Records config={handbookConfig} onSelect={setSelected}/>{active&&<Modal open title={active.title} size="lg" onClose={()=>{setSelected(null);setSearchParam('id',null);}}><p className="muted">{active.category}</p><MultilineText text={active.body}/></Modal>}</div>;
}
