import { test, expect, type Page } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { setDriver } from '../api/_lib/db';
import { handle } from '../api/_lib/router';
import { readSession, sessionCookie } from '../api/_lib/auth';
import { schemaStatements } from '../scripts/members';

test.describe.configure({mode:'serial'});
let db:PGlite;
const ORIGIN='http://127.0.0.1:5173';
const names=['exec.test','member.test','other.test'];
const version=123456789;
function cookie(user:string){return sessionCookie(user,version).split(';')[0];}
async function request(path:string,method='GET',body?:unknown,user='exec.test'){
 const response=await handle(new Request(`${ORIGIN}/api/admin/${path}`,{method,headers:{origin:ORIGIN,cookie:cookie(user),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
 return {status:response.status,data:await response.json()};
}
async function create(resource:string,body:unknown,user='exec.test'){
 const result=await request(resource,'POST',body,user);expect(result.status,JSON.stringify(result.data)).toBe(201);return result.data;
}
test.beforeAll(async()=>{
 process.env.ADMIN_SESSION_SECRET='local-test-secret-not-a-production-credential';
 db=new PGlite();setDriver(async(text,params)=>(await db.query(text,params)).rows as any[]);
 for(const sql of schemaStatements())await db.exec(sql);
 for(const sql of schemaStatements())await db.exec(sql); // migrations must be re-runnable
 for(const user of names)await db.query(`INSERT INTO admin_users(username,password_hash,password_changed_at,must_change_password,name,title,access) VALUES($1,'unused',$2,false,$3,'Designer',$4)`,[user,version,user.split('.')[0],user.startsWith('exec')?'executive':'member']);
});
test.afterAll(async()=>{await db.close();});

test('authenticated API, persistent events and correct calendar dates',async()=>{
 expect((await handle(new Request(`${ORIGIN}/api/admin/events`))).status).toBe(401);
 const event=await create('events',{title:'Client presentation',date:'2026-09-21',startTime:'10:00',endTime:'11:00',attendees:['member.test'],location:'Studio A'});
 expect((await request(`events?id=${event.id}`)).data.title).toBe('Client presentation');
 const first=await request('calendar?from=2026-09-21&to=2026-09-27');expect(first.data.some((e:any)=>e.id===event.id)).toBeTruthy();
 const next=await request('calendar?from=2026-09-28&to=2026-10-04');expect(next.data.some((e:any)=>e.id===event.id)).toBeFalsy();
 expect((await request('events','POST',{title:'Invalid',date:'2026-09-21',startTime:'11:00',endTime:'10:00'})).status).toBe(400);
});

test('approval permissions, revision state, resubmission and versioned pins',async()=>{
 const a=await create('approvals',{title:'Brand review',reviewer:'other.test',status:'approved'},'member.test');
 expect(a.status).toBe('pending');
 expect((await request(`approvals?id=${a.id}`,'PATCH',{status:'approved'},'member.test')).status).toBe(403);
 const c=await create('approval-comments',{approvalId:a.id,body:'Move headline',x:20,y:40},'other.test');expect(c.version).toBe(1);
 const revision=await request(`approvals?id=${a.id}`,'PATCH',{status:'revision'},'other.test');expect(revision.data.status).toBe('revision');
 expect((await request(`approvals?id=${a.id}`,'PATCH',{status:'approved'},'other.test')).status).toBe(400);
 const resubmitted=await request(`approvals?id=${a.id}`,'PATCH',{status:'pending'},'member.test');expect(resubmitted.data.version).toBe(2);expect(resubmitted.data.decidedBy).toBeNull();
 const approved=await request(`approvals?id=${a.id}`,'PATCH',{status:'approved'},'other.test');expect(approved.data.status).toBe('approved');
 expect((await request(`approvals?id=${a.id}`,'PATCH',{title:'Change signed-off work'},'member.test')).status).toBe(400);
 expect((await request(`approval-comments?approvalId=${a.id}`)).data[0].version).toBe(1);
});

test('leave privacy and executive decisions prohibit self approval',async()=>{
 const leave=await create('leave',{startDate:'2026-10-01',endDate:'2026-10-02',notes:'Private reason',status:'approved'},'member.test');expect(leave.status).toBe('pending');
 expect((await request(`leave?id=${leave.id}`,'GET',undefined,'other.test')).status).toBe(404);
 expect((await request(`leave?id=${leave.id}`,'PATCH',{status:'approved'},'member.test')).status).toBe(403);
 expect((await request(`leave?id=${leave.id}`,'PATCH',{status:'approved'})).status).toBe(200);
 const own=await create('leave',{startDate:'2026-10-10',endDate:'2026-10-12'});
 expect((await request(`leave?id=${own.id}`,'PATCH',{status:'approved'})).status).toBe(403);
 expect((await request('activity')).data.some((a:any)=>a.entityType==='leave request')).toBeFalsy();
});

test('finance adds months and validates expenses and capacity',async()=>{
 await create('invoices',{title:'January',number:'TEST-JAN',amount:1000,issueDate:'2026-01-01',status:'paid',paidDate:'2026-01-20'});
 await create('invoices',{title:'February',number:'TEST-FEB',amount:2000,issueDate:'2026-02-01',status:'paid',paidDate:'2026-02-20'});
 await create('expenses',{title:'Software',amount:300,date:'2026-01-05',category:'software'});
 await create('expenses',{title:'Production',amount:200,date:'2026-02-05',category:'production'});
 const f=(await request('finance?year=2026')).data;expect(f.revenue).toBe(3000);expect(f.expenses).toBe(500);
 expect((await request('expenses','POST',{title:'No',amount:1,date:'2026-09-21'},'member.test')).status).toBe(403);
 expect((await request('expenses','POST',{title:'Negative',amount:-1,date:'2026-09-21'})).status).toBe(400);
 expect((await request('capacity','POST',{member:'member.test',weekOf:'2026-09-22',hours:32,available:40})).status).toBe(400);
 const plan=await create('capacity',{member:'member.test',weekOf:'2026-09-21',hours:48,available:40});expect(plan.hours/plan.available).toBe(1.2);
});

test('chat channels, direct-message privacy, search, reactions and pins',async()=>{
 const shared=await create('chat',{body:'Design channel only',channel:'design'},'member.test');
 const dm=await create('chat',{body:'Private review',recipient:'other.test'},'member.test');
 expect((await request('chat','GET',undefined,'other.test')).data.messages.some((m:any)=>m.id===shared.id||m.id===dm.id)).toBeFalsy();
 const messages=(await request('chat?recipient=member.test','GET',undefined,'other.test')).data.messages;expect(messages.some((m:any)=>m.id===dm.id)).toBeTruthy();
 expect((await request('chat?recipient=member.test')).data.messages.some((m:any)=>m.id===dm.id)).toBeFalsy();
 expect((await request(`chat?id=${dm.id}`,'DELETE')).status).toBe(404);
 expect((await request('chat-reactions','POST',{messageId:dm.id,reaction:'heart'})).status).toBe(404);
 expect((await request('chat-pins','POST',{messageId:dm.id,pinned:true})).status).toBe(404);
 await create('chat-pins',{messageId:shared.id,pinned:true},'other.test');
 expect((await request('chat?channel=design&pinned=1&q=Design')).data.messages.map((m:any)=>m.id)).toContain(shared.id);
});

async function mount(page:Page,path:string){
 const html=readFileSync('admin/index.html','utf8');
 await page.route('**/*',async route=>{if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});return route.continue();});
 await page.route('**/api/admin/**',async route=>{
  const r=route.request();const req=new Request(r.url(),{method:r.method(),headers:{...r.headers(),origin:ORIGIN,cookie:cookie('exec.test')},body:r.postData()||undefined});
  if(new URL(r.url()).pathname.endsWith('/me'))return route.fulfill({json:await readSession(req)});
  const res=await handle(req);return route.fulfill({status:res.status,contentType:'application/json',body:await res.text()});
 });
 await page.goto(path);
}
test('admin keeps its shell and creates events through the existing modal',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await mount(page,'/calendar?view=agenda');await expect(page.getByRole('heading',{name:'Calendar',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'New event',exact:true}).click();
 const modal=page.getByRole('dialog');await modal.getByLabel('Title').fill('Browser-created event');await modal.getByLabel(/^Date/).fill('2026-10-05');
 await modal.getByRole('button',{name:'Create event'}).click();await expect(modal).not.toBeVisible();await expect(page.getByRole('cell',{name:'Browser-created event',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('cell',{name:'Browser-created event',exact:true})).toBeVisible();
 await expect(page.locator('.sidebar')).toBeVisible();expect(errors).toEqual([]);
});
test('new pages render on desktop and mobile and search is keyboard accessible',async({page})=>{
 test.setTimeout(120000); // eight full page loads against an in-process database
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,'/approvals');
 for(const [path,title] of [['/approvals','Approvals'],['/finance','Finance'],['/workload','Workload'],['/leave','Leave'],['/handbook','Handbook'],['/projects?view=board','Projects'],['/clients','Clients'],['/chat?channel=design','\u0023design']]){
  await page.goto(path);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.getByText('Something went wrong',{exact:true})).toHaveCount(0);
 }
 await page.keyboard.press('Control+k');await expect(page.getByRole('dialog',{name:'Search workspace'})).toBeVisible();await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.goto('/finance');await expect(page.getByRole('heading',{name:'Finance',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/admin-hq-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
test('the chat log, the draft and the scroll position survive searching and filtering',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const body of ['first note','second note','third note']) await request('chat','POST',{body,channel:'general'},'member.test');
 await mount(page,'/chat');
 const draft=page.getByLabel('Message #general');
 await expect(page.getByText('third note')).toBeVisible();
 await page.getByRole('button',{name:'Search messages'}).click();
 const search=page.getByRole('searchbox',{name:/Search #general/});
 await draft.fill('still being written');
 /* the search box narrows the same conversation: it must never tear the log down */
 for(const key of ['s','e','c']){for(let i=0;i<4;i++){await page.waitForTimeout(90);expect(await page.locator('article.chat-message').count()).toBeGreaterThan(0);}await search.press(key);}
 await expect(page.getByText('second note')).toBeVisible();
 await expect(page.getByText('first note')).toHaveCount(0);
 await expect(draft).toHaveValue('still being written');
 /* sending something the filter would hide drops the filter instead of swallowing the message */
 await draft.fill('unrelated line');await draft.press('Enter');
 await expect(search).toHaveValue('');
 await expect(page.getByText('unrelated line')).toBeVisible();
 await expect(page.getByText('first note')).toBeVisible();
 expect(errors).toEqual([]);
});
test('sidebar counts follow what each person can act on',async()=>{
 const before=(await request('badges')).data;
 await create('chat',{body:'counts toward the badge',channel:'design'},'member.test');
 await create('chat',{body:'private to the other member',recipient:'other.test'},'member.test');
 const after=(await request('badges')).data;
 expect(after.chat).toBe(before.chat+1); // the channel message only; the DM is not theirs
 await request('chat?channel=design'); // reading the channel clears it again
 expect((await request('badges')).data.chat).toBe(before.chat);
 const approval=await create('approvals',{title:'Badge review',reviewer:'other.test'},'member.test');
 expect((await request('badges')).data.approvals).toBeGreaterThan(0); // executives see every pending one
 expect((await request('badges','GET',undefined,'other.test')).data.approvals).toBeGreaterThan(0); // the reviewer sees theirs
 expect((await request('badges','GET',undefined,'member.test')).data.approvals).toBe(0); // the submitter cannot decide it
 await request(`approvals?id=${approval.id}`,'PATCH',{status:'approved'},'other.test');
 expect((await request('badges','GET',undefined,'other.test')).data.approvals).toBe(0);
});
test('presence shows on the team directory and the dashboard',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await request('profile','PATCH',{workStatus:'shoot'},'member.test');
 await request('presence','POST',{active:true},'member.test');
 await mount(page,'/team');
 /* the dot says whether they are here; the badge says where they are working */
 await expect(page.locator('.presence-dot.is-active').first()).toBeVisible();
 await expect(page.getByText('On shoot',{exact:true}).first()).toBeVisible();
 await page.goto('/');
 await expect(page.getByRole('heading',{name:"Who's in"})).toBeVisible();
 await expect(page.locator('.presence-grid .presence-person').first()).toBeVisible();
 await expect(page.locator('.presence-legend')).toContainText('on shoot');
 expect(errors).toEqual([]);
});
test('projects get a stable code and a work type',async()=>{
 const first=await create('projects',{name:'Coded project',kind:'video'});
 expect(first.code).toMatch(/^PJ-\d{3,}$/);
 expect(first.kind).toBe('video');
 const second=await create('projects',{name:'Second coded project'});
 expect(second.kind).toBe('other'); // the default, not a guess
 expect(second.code).not.toBe(first.code);
 expect((await request(`projects?id=${first.id}`,'PATCH',{kind:'not-a-type'})).status).toBe(400);
 expect((await request(`projects?id=${first.id}`,'PATCH',{name:'Renamed'})).data.code).toBe(first.code); // editing never moves it
 expect((await request('projects')).data.every((p:any)=>/^PJ-\d{3,}$/.test(p.code))).toBeTruthy();
});
test('the board shows codes, types and client marks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const client=await create('clients',{name:'Kape Studios',industry:'Food & Beverage',palette:'#3E2C1C'});
 const project=await create('projects',{name:'Kape Q4 Launch Kit',clientId:client.id,kind:'poster',status:'active',progress:50});
 await mount(page,'/projects?view=board');
 await expect(page.getByRole('heading',{name:'Projects',exact:true})).toBeVisible();
 await expect(page.getByText(project.code,{exact:true})).toBeVisible();
 await expect(page.getByText('Poster',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('link',{name:'Kape Q4 Launch Kit'})).toBeVisible();
 expect(errors).toEqual([]);
});
test('project rooms are visible only to the people assigned',async()=>{
 const project=await create('projects',{name:'Aurora',lead:'member.test',team:['other.test'],status:'active'});
 const posted=await create('chat',{body:'Aurora kickoff notes',project:project.id},'member.test');
 expect((await request(`chat?project=${project.id}`,'GET',undefined,'other.test')).data.messages.map((m:any)=>m.id)).toContain(posted.id);
 expect((await request(`chat?project=${project.id}`)).status).toBe(404); // an executive who is not assigned
 expect((await request('chat','POST',{body:'peeking',project:project.id})).status).toBe(404);
 expect((await request(`chat?id=${posted.id}`,'DELETE')).status).toBe(404);
 expect((await request('chat-reactions','POST',{messageId:posted.id,reaction:'heart'})).status).toBe(404);
 expect((await request('chat?channel=general','GET',undefined,'member.test')).data.messages.some((m:any)=>m.id===posted.id)).toBeFalsy();
 const rooms=(c:string)=>(request('chat-conversations','GET',undefined,c)).then(r=>r.data.filter((x:any)=>x.conversation.startsWith('project:')));
 expect((await rooms('member.test')).map((r:any)=>r.name)).toContain('Aurora');
 expect(await rooms('exec.test')).toEqual([]);
 expect((await request('badges','GET',undefined,'exec.test')).data.chat).toBe(0); // never counts a room they cannot open
});
test('presence moves from active to idle to offline',async()=>{
 const who=(rows:any[])=>rows.find((m:any)=>m.username==='other.test').presence;
 await request('presence','POST',{active:true},'other.test');
 expect(who((await request('team')).data)).toBe('active');
 await request('presence','POST',{active:false},'other.test');
 expect(who((await request('team')).data)).toBe('active'); // still active: the last interaction was moments ago
 await db.query(`UPDATE admin_users SET last_active_at = now() - interval '10 minutes' WHERE username='other.test'`);
 expect(who((await request('team')).data)).toBe('idle');
 await db.query(`UPDATE admin_users SET last_seen_at = now() - interval '10 minutes' WHERE username='other.test'`);
 expect(who((await request('team')).data)).toBe('offline');
});
