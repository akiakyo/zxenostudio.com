import type { Session } from './auth.js';
import { type Resource, type Values, isDate } from './crud.js';
import { one, type Row } from './db.js';
import { HttpError, isExecutive } from './http.js';

const own = (s: Session, r: Row) => r.createdBy === s.username || isExecutive(s);
const executive = (s: Session) => isExecutive(s);
const base = (table: string, entity: string): Resource => ({
 table, entity, fields: {}, select: 't.*, u.name AS created_by_name',
 joins: 'LEFT JOIN admin_users u ON u.username = t.created_by',
 order: 't.updated_at DESC', title: r => r.title || entity,
 canDelete: own,
 filters: {
  q: (v,p) => `t.title ILIKE ${p.add('%'+v.replace(/[\\%_]/g,'\\$&')+'%')}`,
  status: (v,p) => `t.status = ${p.add(v)}`,
 },
});
function dates(v: Values, r: Row = {}) {
 const start = v.get('start_date') ?? r.startDate;
 const end = v.get('end_date') ?? r.endDate;
 if (start && end && String(end) < String(start)) throw new HttpError(400,'End date must be on or after start date');
}

const events = base('admin_events','event');
events.fields = {
 title: {kind:'text',label:'Event',required:true}, projectId:{kind:'uuid',label:'Project'},
 date:{kind:'date',label:'Date',required:true}, startTime:{kind:'text',label:'Start time',required:true}, endTime:{kind:'text',label:'End time',required:true},
 kind:{kind:'enum',label:'Type',values:['meeting','review','shoot','deadline','internal']},
 location:{kind:'text',label:'Location'}, attendees:{kind:'users',label:'Attendees'}, notes:{kind:'longtext',label:'Notes'},
};
const eventTime = (_s:Session,v:Values,r:Row={}) => {
 const start=String(v.get('start_time')??r.startTime),end=String(v.get('end_time')??r.endTime);
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start) throw new HttpError(400,'Choose valid start and end times on the same day');
};
events.prepareCreate=eventTime; events.prepareUpdate=eventTime;
events.filters={date:(v,p)=>`t.date = ${p.add(v)}`,from:(v,p)=>`t.date >= ${p.add(v)}`,to:(v,p)=>`t.date <= ${p.add(v)}`};
events.order='t.date, t.start_time';

const approvals = base('admin_approvals','approval');
approvals.optimistic=true;
approvals.fields={title:{kind:'text',label:'Title',required:true},projectId:{kind:'uuid',label:'Project'},assetId:{kind:'uuid',label:'Asset'},reviewer:{kind:'user',label:'Reviewer',required:true},dueDate:{kind:'date',label:'Due date'},notes:{kind:'longtext',label:'Notes'},status:{kind:'enum',label:'Status',values:['pending','revision','approved']}};
approvals.select += ', p.name AS project_name, a.name AS asset_name, a.url AS asset_url, a.kind AS asset_kind, reviewer.name AS reviewer_name';
approvals.joins += ' LEFT JOIN admin_projects p ON p.id=t.project_id LEFT JOIN admin_assets a ON a.id=t.asset_id LEFT JOIN admin_users reviewer ON reviewer.username=t.reviewer';
approvals.prepareCreate=(_s,v)=>{v.set('status','pending');};
approvals.canUpdate=(s,r)=>own(s,r)||r.reviewer===s.username;
approvals.prepareUpdate=(s,v,r)=>{
 const status=v.get('status');
 if ([...v.keys()].some(k=>k!=='status') && !own(s,r)) throw new HttpError(403,'Only the submitter or an executive can edit this submission');
 if (status && status!==r.status) {
  if (status==='pending') {
   if(!own(s,r)||r.status!=='revision') throw new HttpError(400,'Only a revision can be resubmitted by its submitter');
   v.set('version',Number(r.version)+1);v.set('decided_by',null);v.set('decided_at',null);
  } else {
   if(r.status!=='pending') throw new HttpError(400,'This version has already been reviewed');
   if(s.username!==r.reviewer&&!isExecutive(s)) throw new HttpError(403,'Only the assigned reviewer or an executive can decide');
   v.set('decided_by',s.username);v.set('decided_at',new Date().toISOString());
  }
 }
 if(r.status==='approved'&&[...v.keys()].some(k=>k!=='status')) throw new HttpError(400,'Approved submissions cannot be changed');
};
const comments=base('admin_approval_comments','approval comment');
comments.fields={approvalId:{kind:'uuid',label:'Approval',required:true},body:{kind:'longtext',label:'Comment',required:true},x:{kind:'int',label:'Pin X',min:0,max:100},y:{kind:'int',label:'Pin Y',min:0,max:100}};
comments.filters={approvalId:(v,p)=>`t.approval_id = ${p.add(v)}`};comments.order='t.created_at';comments.canUpdate=()=>false;
comments.prepareCreate=async(_s,v)=>{
 const a=await one('SELECT version FROM admin_approvals WHERE id=$1',[v.get('approval_id')]);
 if(!a) throw new HttpError(404,'Approval not found');
 if(v.has('x')!==v.has('y')) throw new HttpError(400,'Both pin coordinates are required');
 v.set('version',a.version);
};
comments.title=()=> 'Approval comment';

const expenses=base('admin_expenses','expense');
expenses.fields={title:{kind:'text',label:'Description',required:true},projectId:{kind:'uuid',label:'Project'},amount:{kind:'money',label:'Amount',required:true},date:{kind:'date',label:'Date',required:true},category:{kind:'enum',label:'Category',values:['payroll','software','office','production','marketing','other']},notes:{kind:'longtext',label:'Notes'}};
expenses.select+=', t.amount::float8 AS amount';expenses.filters={};expenses.canCreate=executive;expenses.canUpdate=executive;expenses.canDelete=executive;
expenses.prepareCreate=(_s,v)=>{if(Number(v.get('amount'))<=0)throw new HttpError(400,'Amount must be greater than zero');};
expenses.prepareUpdate=(_s,v)=>{if(v.has('amount')&&Number(v.get('amount'))<=0)throw new HttpError(400,'Amount must be greater than zero');};

const deals=base('admin_deals','deal');
deals.fields={title:{kind:'text',label:'Opportunity',required:true},clientId:{kind:'uuid',label:'Client'},owner:{kind:'user',label:'Owner'},amount:{kind:'money',label:'Value',required:true},stage:{kind:'enum',label:'Stage',values:['lead','discovery','proposal','negotiation','won','lost']},nextStep:{kind:'longtext',label:'Next step'},dueDate:{kind:'date',label:'Follow-up date'}};
deals.select+=', t.amount::float8 AS amount, c.name AS client_name';deals.joins+=' LEFT JOIN admin_clients c ON c.id=t.client_id';deals.filters={};

const leave=base('admin_leave','leave request');
leave.optimistic=true;
leave.fields={startDate:{kind:'date',label:'Start',required:true},endDate:{kind:'date',label:'End',required:true},kind:{kind:'enum',label:'Type',values:['vacation','sick','personal','half_day']},notes:{kind:'longtext',label:'Notes'},status:{kind:'enum',label:'Status',values:['pending','approved','declined','cancelled']}};
leave.filters={};leave.visible=(s,p)=>isExecutive(s)?'true':`t.created_by=${p.add(s.username)}`;
leave.logged=()=>false;leave.canUpdate=own;leave.canDelete=()=>false;
leave.prepareCreate=(_s,v)=>{dates(v);v.set('status','pending');};
leave.prepareUpdate=(s,v,r)=>{
 dates(v,r);
 const status=v.get('status');
 if(status&&status!==r.status){
  if(r.status!=='pending')throw new HttpError(400,'This request has already been decided');
  if(status==='cancelled'&&r.createdBy!==s.username)throw new HttpError(403,'Only the requester can cancel');
  if(status!=='cancelled'&&(!isExecutive(s)||s.username===r.createdBy))throw new HttpError(403,'Another executive must review this request');
  if(!['approved','declined','cancelled'].includes(String(status)))throw new HttpError(400,'Invalid decision');
  v.set('decided_by',s.username);v.set('decided_at',new Date().toISOString());
 }
 if([...v.keys()].some(k=>!['status','decided_by','decided_at'].includes(k))&&(r.createdBy!==s.username||r.status!=='pending'))throw new HttpError(403,'Only your own pending request can be edited');
};
leave.title=r=>`${r.kind} leave`;

const capacity=base('admin_capacity','capacity');
capacity.fields={member:{kind:'user',label:'Member',required:true},weekOf:{kind:'date',label:'Week of',required:true},hours:{kind:'int',label:'Planned hours',min:0,max:168,required:true},available:{kind:'int',label:'Available hours',min:1,max:168,required:true}};
capacity.filters={};capacity.canCreate=executive;capacity.canUpdate=executive;capacity.canDelete=executive;capacity.title=r=>`${r.member} / ${r.weekOf}`;
const monday=(_s:Session,v:Values)=>{const d=v.get('week_of');if(d&&(!isDate(d)||new Date(d+'T00:00:00Z').getUTCDay()!==1))throw new HttpError(400,'Week of must be a Monday');};
capacity.prepareCreate=monday;capacity.prepareUpdate=monday;

const handbook=base('admin_handbook','document');
handbook.fields={title:{kind:'text',label:'Title',required:true},category:{kind:'text',label:'Category',required:true},body:{kind:'longtext',label:'Content',required:true}};
handbook.filters={q:(v,p)=>`(t.title || ' ' || t.category || ' ' || t.body) ILIKE ${p.add('%'+v.replace(/[\\%_]/g,'\\$&')+'%')}`};
handbook.canCreate=executive;handbook.canUpdate=executive;handbook.canDelete=executive;

export const HQ_RESOURCES:Record<string,Resource>={events,approvals,'approval-comments':comments,expenses,deals,leave,capacity,handbook};
