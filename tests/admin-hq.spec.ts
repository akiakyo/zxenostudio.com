import { test, expect, type Page } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { setDriver } from '../api/_lib/db';
import { handle } from '../api/_lib/router';
import { readSession, sessionCookie } from '../api/_lib/auth';
import { schemaStatements } from '../scripts/members';
import { POST as inquiryPost } from '../api/inquiry';
import { POST as resetPost } from '../api/admin/password-reset';
import { hashPassword, verifyPassword } from '../api/_lib/password';

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
test('your own message makes a sent sound; someone else’s plays the message tone',async({page})=>{
 /* count oscillators and read the sound log instead of listening: the page cannot make real sound here */
 await page.addInitScript(()=>{
  (window as any).__tones=0;(window as any).__sfxLog=[];
  class FakeContext{
   state='running';currentTime=0;destination={};
   resume(){return Promise.resolve();}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(n:any){return n;}};}
   createOscillator(){return {type:'',frequency:{value:0},connect(n:any){return n;},start(){(window as any).__tones++;},stop(){}};}
  }
  (window as any).AudioContext=FakeContext;
 });
 await mount(page,'/chat?channel=wins');
 await expect(page.getByRole('heading',{name:'#wins'})).toBeVisible();
 await page.waitForTimeout(600);
 const tones=()=>page.evaluate(()=>(window as any).__tones as number);
 const before=await tones();
 const log=()=>page.evaluate(()=>(window as any).__sfxLog as string[]);
 /* your own message: the sent sound, never the incoming-message tone */
 const box=page.getByLabel('Message #wins');
 await box.fill('my own message');await box.press('Enter');
 await expect(page.getByText('my own message')).toBeVisible();
 await page.waitForTimeout(2500);
 expect(await log()).toContain('sent');expect(await log()).not.toContain('message');
 expect(await tones()).toBeGreaterThan(before);
 /* somebody else posting into the same room: the message tone */
 await create('chat',{body:'from a teammate',channel:'wins'},'member.test');
 await expect(page.getByText('from a teammate')).toBeVisible();
 await page.waitForTimeout(400);
 expect(await log()).toContain('message');
 /* interface sounds can be switched off on their own */
 await page.evaluate(()=>localStorage.setItem('zxeno-admin-sfx','off'));
 const sentBefore=(await log()).filter(n=>n==='sent').length;
 await box.fill('quiet now');await box.press('Enter');await expect(page.getByText('quiet now')).toBeVisible();
 expect((await log()).filter(n=>n==='sent').length).toBe(sentBefore);
});
test('a hidden tab still hears a message and keeps its unread badge',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__tones=0;
  class FakeContext{
   state='running';currentTime=0;destination={};
   resume(){return Promise.resolve();}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(n:any){return n;}};}
   createOscillator(){return {type:'',frequency:{value:0},connect(n:any){return n;},start(){(window as any).__tones++;},stop(){}};}
  }
  (window as any).AudioContext=FakeContext;
 });
 await mount(page,'/chat?channel=briefs');
 await expect(page.getByRole('heading',{name:'#briefs'})).toBeVisible();
 await page.waitForTimeout(600);
 const before=await page.evaluate(()=>(window as any).__tones as number);
 /* the reader looks away */
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await create('chat',{body:'posted while they were away',channel:'briefs'},'member.test');
 await expect.poll(async()=>page.evaluate(()=>(window as any).__tones as number),{timeout:20000}).toBeGreaterThan(before);
 /* and the badge still says it is unread, because they never actually looked */
 expect((await request('badges')).data.chat).toBeGreaterThan(0);
});

test('announcement emails: the list, send to all, send to chosen addresses',async()=>{
 const calls:any[]=[];const realFetch=globalThis.fetch;const realKey=process.env.RESEND_API_KEY;
 process.env.RESEND_API_KEY='re_test_not_a_real_key';
 globalThis.fetch=(async(url:any,init:any)=>{calls.push({url:String(url),headers:init.headers,body:JSON.parse(init.body)});return new Response(JSON.stringify({data:[]}),{status:200});}) as any;
 try{
  const a=await create('announcements',{title:'Studio <closed> Friday',body:'No shoots.\n\nEnjoy the long weekend.'});
  expect((await request('announcement-emails','GET',undefined,'member.test')).status).toBe(403);
  expect((await request('announcement-send','POST',{id:a.id,to:'all'},'member.test')).status).toBe(403);
  expect((await request('announcement-send','POST',{id:a.id,to:'all'})).status).toBe(400); // nobody has an address yet
  expect((await request('announcement-emails','PATCH',{emails:{'member.test':'not-an-email'}})).status).toBe(400);
  const saved=await request('announcement-emails','PATCH',{emails:{'exec.test':'exec@example.com','member.test':'member@example.com'}});
  expect(saved.data.filter((c:any)=>c.email).length).toBe(2);
  const all=await request('announcement-send','POST',{id:a.id,to:'all'});expect(all.data.sent).toBe(2);
  expect(calls.map(c=>c.url)).toEqual(['https://api.resend.com/emails','https://api.resend.com/emails']);
  expect(calls[0].headers.authorization).toBe('Bearer re_test_not_a_real_key');
  expect(calls.map(c=>c.body.to[0]).sort()).toEqual(['exec@example.com','member@example.com']); // one message each
  const m=calls.find(c=>c.body.to[0]==='member@example.com').body;
  expect(m.from).toBe('exec · ZXENO Studio <announcement@zxenostudio.com>'); // in the poster's name
  expect(m.reply_to).toEqual(['exec@example.com']);
  expect(m.html).toContain('Hi member,');expect(m.text).toContain('Hi member,');
  expect(m.html).toContain('Studio &#60;closed&#62; Friday');
  expect(m.html).toContain('src="cid:zxeno-logo"');expect(m.attachments[0].content_id).toBe('zxeno-logo');expect(m.attachments[0].content.length).toBeGreaterThan(1000);
  const some=await request('announcement-send','POST',{id:a.id,to:['member@example.com','MEMBER@example.com','guest@example.org']});
  expect(some.data.sent).toBe(2);
  expect((await request('announcement-send','POST',{id:a.id,to:['nope']})).status).toBe(400);
  const listed=(await request('announcements')).data.find((x:any)=>x.id===a.id);expect(listed.emailedCount).toBe(2);expect(listed.emailedAt).toBeTruthy();
  /* members keep their own address from Settings */
  expect((await request('profile','PATCH',{email:'bad'},'other.test')).status).toBe(400);
  expect((await request('profile','PATCH',{email:'other@example.com'},'other.test')).data.email).toBe('other@example.com');
  /* a Resend refusal reaches the person sending */
  globalThis.fetch=(async()=>new Response(JSON.stringify({message:'The zxenostudio.com domain is not verified.'}),{status:403})) as any;
  const refused=await request('announcement-send','POST',{id:a.id,to:'all'});expect(refused.status).toBe(502);expect(refused.data.error).toContain('not verified');
 }finally{globalThis.fetch=realFetch;if(realKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=realKey;}
});

test('posting an announcement leads straight to sending it by email',async({page})=>{
 const sent:any[]=[];const realFetch=globalThis.fetch;process.env.RESEND_API_KEY='re_test_not_a_real_key';
 globalThis.fetch=(async(_url:any,init:any)=>{sent.push(JSON.parse(init.body));return new Response('{"data":[]}',{status:200});}) as any;
 try{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page,'/announcements');await expect(page.getByRole('heading',{name:'Announcements',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'New announcement'}).click();
  const form=page.getByRole('dialog');await form.getByLabel('Title').fill('Town hall on Monday');await form.getByLabel(/^Message/).fill('10am in Studio A.');
  await form.getByRole('button',{name:'Create announcement'}).click();
  const send=page.getByRole('dialog',{name:'Send by email'});await expect(send).toBeVisible();
  await expect(send.getByText(/Everyone on the email list/)).toBeVisible();
  await page.screenshot({path:'test-results/announcement-send-all.png'});
  await send.getByRole('radio',{name:'Send to email'}).click();
  await send.getByLabel('member').check();await send.getByLabel('Other email addresses').fill('client@example.org');
  await page.screenshot({path:'test-results/announcement-send-some.png'});
  /* sending takes a press and hold */
  const hold=send.getByRole('button',{name:/Hold to send to 2 people/});await hold.hover();await page.mouse.down();await page.waitForTimeout(1300);await page.mouse.up();await expect(send).not.toBeVisible();
  expect(sent.map(m=>m.to[0]).sort()).toEqual(['client@example.org','member@example.com']);
  await expect(page.getByText(/Emailed to 2 people/).first()).toBeVisible();
  await page.getByRole('button',{name:'Email list'}).click();const list=page.getByRole('dialog',{name:'Email list'});
  await expect(list.getByLabel(/^exec/)).toHaveValue('exec@example.com');await page.screenshot({path:'test-results/announcement-email-list.png'});
  expect(errors).toEqual([]);
 }finally{globalThis.fetch=realFetch;}
});

test('website inquiries reach the workspace, alert executives and become clients',async()=>{
 const sent:any[]=[];const realFetch=globalThis.fetch;const realKey=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='re_test_not_a_real_key';
 globalThis.fetch=(async(_url:any,init:any)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});}) as any;
 const submit=(body:unknown,ip='203.0.113.7',origin=ORIGIN)=>inquiryPost(new Request(ORIGIN+'/api/inquiry',{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)}));
 try{
  await db.query(`UPDATE admin_users SET email='exec@example.com' WHERE username='exec.test'`);
  expect((await submit({name:'Ana'},'203.0.113.7','https://evil.example')).status).toBe(403);
  expect((await submit({name:'Ana',email:'not-an-email',message:'Hi'})).status).toBe(400);
  expect((await submit({name:'',email:'ana@example.com',message:'Hi'})).status).toBe(400);
  /* the hidden field: a bot is thanked and nothing is stored */
  expect((await submit({name:'Bot',email:'bot@example.com',message:'spam',website:'http://spam'})).status).toBe(201);
  const ok=await submit({name:'Ana Cruz',email:'ana@example.com',company:'Kape Co',service:'Brand Identity',message:'We need a rebrand.',budget:'PHP 200k'});
  expect(ok.status).toBe(201);
  const list=(await request('inquiries?status=open')).data;expect(list).toHaveLength(1);expect(list[0].name).toBe('Ana Cruz');expect(list[0].status).toBe('new');
  expect((await request('badges')).data.inquiries).toBe(1);
  expect(sent.some(m=>m.to[0]==='exec@example.com'&&m.reply_to?.[0]==='ana@example.com'&&m.subject.includes('Kape Co'))).toBeTruthy();
  /* nobody creates one from inside the workspace, and members can't delete */
  expect((await request('inquiries','POST',{status:'new'})).status).toBe(403);
  expect((await request('inquiries?id='+list[0].id,'DELETE',undefined,'member.test')).status).toBe(403);
  const contacted=await request('inquiries?id='+list[0].id,'PATCH',{status:'contacted',notes:'Replied by email'},'member.test');expect(contacted.data.status).toBe('contacted');
  const converted=(await request('inquiry-convert','POST',{id:list[0].id},'member.test')).data;
  expect(converted.status).toBe('converted');expect(converted.clientName).toBe('Ana Cruz');expect(converted.owner).toBe('member.test');
  expect((await request('inquiry-convert','POST',{id:list[0].id})).status).toBe(409);
  const deal=(await request('deals')).data.find((d:any)=>d.clientId===converted.clientId);expect(deal.stage).toBe('lead');
  /* five an hour from one address */
  for(let i=0;i<4;i++)expect((await submit({name:'Ana',email:'ana@example.com',message:'again'})).status).toBe(201);
  expect((await submit({name:'Ana',email:'ana@example.com',message:'again'})).status).toBe(429);
 }finally{globalThis.fetch=realFetch;if(realKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=realKey;}
});

test('forgotten passwords: emailed one-time links and executive resets',async()=>{
 const sent:any[]=[];const realFetch=globalThis.fetch;const realKey=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='re_test_not_a_real_key';
 globalThis.fetch=(async(_url:any,init:any)=>{sent.push(JSON.parse(init.body));return new Response('{}',{status:200});}) as any;
 const reset=(body:unknown,ip='198.51.100.4')=>resetPost(new Request(ORIGIN+'/api/admin/password-reset',{method:'POST',headers:{origin:ORIGIN,'content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)}));
 try{
  await db.query(`UPDATE admin_users SET email='member@example.com', password_hash=$1 WHERE username='member.test'`,[hashPassword('old-password-123')]);
  await db.query(`UPDATE admin_users SET email='' WHERE username='other.test'`);
  /* the same answer for a real account, an unknown one and one without email */
  for(const username of ['member.test','nobody.here','other.test'])expect((await reset({username})).status).toBe(200);
  expect(sent).toHaveLength(1);expect(sent[0].to).toEqual(['member@example.com']);
  const token=String(sent[0].text).match(/reset-password#([A-Za-z0-9_-]+)/)![1];
  expect((await (await reset({token})).json()).valid).toBe(true);
  expect((await reset({token,newPassword:'short'})).status).toBe(400);
  expect((await reset({token,newPassword:'member.test123'})).status).toBe(400);
  const done=await reset({token,newPassword:'a-brand-new-password'});expect(done.status).toBe(200);
  expect(done.headers.get('set-cookie')).toContain('__Host-zxeno_admin=');
  const row=(await db.query<any>(`SELECT password_hash, must_change_password FROM admin_users WHERE username='member.test'`)).rows[0];
  expect(verifyPassword('a-brand-new-password',row.password_hash)).toBeTruthy();expect(row.must_change_password).toBe(false);
  /* once only */
  expect((await reset({token,newPassword:'another-new-password'})).status).toBe(400);
  expect((await (await reset({token})).json()).valid).toBe(false);
  /* three requests per account every 15 minutes */
  for(let i=0;i<2;i++)await reset({username:'member.test'},'198.51.100.9');
  expect((await reset({username:'member.test'},'198.51.100.9')).status).toBe(429);
  /* executives put an account back to its starting password; members can't */
  /* the reset ended the sessions member.test had */
  expect((await request('profile','GET',undefined,'member.test')).status).toBe(401);
  expect((await request('member-password','POST',{username:'member.test'},'other.test')).status).toBe(403);
  expect((await request('member-password','POST',{username:'exec.test'})).status).toBe(400);
  const back=await request('member-password','POST',{username:'member.test'});expect(back.data.startingPassword).toBe('member.test123');
  const after=(await db.query<any>(`SELECT password_hash, must_change_password FROM admin_users WHERE username='member.test'`)).rows[0];
  expect(verifyPassword('member.test123',after.password_hash)).toBeTruthy();expect(after.must_change_password).toBe(true);
 }finally{
  globalThis.fetch=realFetch;if(realKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=realKey;
  await db.query(`UPDATE admin_users SET password_hash='unused', must_change_password=false, password_changed_at=$1 WHERE username='member.test'`,[version]);
 }
});

test('inquiries, fuse and hold buttons, swipe notifications and the forgot-password screen in the browser',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await db.query(`INSERT INTO admin_inquiries(name,email,company,service,message,budget) VALUES('Bea Santos','bea@example.com','Halo Labs','Motion graphics','Launch film for our app, 60 seconds.','PHP 120k')`);
 await create('announcements',{title:'Studio closed Friday',body:'Holiday.'},'member.test').catch(()=>{});
 await create('tasks',{title:'Ping the printer',status:'todo'},'member.test');
 await mount(page,'/');
 await expect(page.getByRole('heading',{name:/New inquiries/})).toBeVisible();
 await expect(page.locator('.nav-link',{hasText:'Inquiries'}).locator('.nav-badge')).toBeVisible();
 await page.screenshot({path:'test-results/micro-dashboard.png',fullPage:false});
 await page.goto('/inquiries');await expect(page.getByRole('heading',{name:'Inquiries',exact:true})).toBeVisible();
 await expect(page.getByText('Launch film for our app')).toBeVisible();
 /* tabs are a sliding segmented control */
 await expect(page.getByRole('radiogroup',{name:'Inquiry status'})).toBeVisible();
 await page.screenshot({path:'test-results/micro-inquiries.png',fullPage:true});
 /* archive burns a fuse with an undo first; undo keeps it */
 const card=page.locator('.inquiry-card',{hasText:'Bea Santos'});
 await card.getByRole('button',{name:'Archive'}).click();await expect(card.getByRole('button',{name:'Undo'})).toBeVisible();
 await page.screenshot({path:'test-results/micro-fuse.png'});
 await card.getByRole('button',{name:'Undo'}).click();await page.waitForTimeout(4500);
 expect((await db.query<any>(`SELECT status FROM admin_inquiries WHERE name='Bea Santos'`)).rows[0].status).toBe('new');
 await card.getByRole('button',{name:'Add as client'}).click();
 /* toasts are swipe toasts */
 await expect(page.locator('.swipe-toast').first()).toBeVisible();await page.screenshot({path:'test-results/micro-toast.png'});
 expect((await db.query<any>(`SELECT status FROM admin_inquiries WHERE name='Bea Santos'`)).rows[0].status).toBe('converted');
 /* warm tooltip on icon buttons */
 await page.locator('.icon-btn[aria-label="Create new"]').hover();await expect(page.getByRole('tooltip')).toBeVisible({timeout:3000});
 await page.screenshot({path:'test-results/micro-tooltip.png'});
 /* spring check on tasks */
 await page.goto('/tasks/overview');await page.waitForTimeout(500);
 /* notifications: unread ones are swipe rows */
 await page.getByRole('button',{name:/^Notifications/}).click();const panel=page.getByRole('dialog',{name:'Notifications'});
 await expect(panel.locator('.swipe-row').first()).toBeVisible();await expect(panel.getByRole('button',{name:'Notification sounds'})).toBeVisible();
 await page.screenshot({path:'test-results/micro-notifications.png'});
 await panel.getByRole('button',{name:'Close'}).click();
 /* delete confirmations take a press and hold */
 await page.goto('/roles');await page.getByRole('row',{name:/member/}).getByRole('button',{name:'Reset password'}).click();
 const reset=page.getByRole('dialog',{name:/Reset password/});const hold=reset.getByRole('button',{name:/Hold to reset/});
 await hold.click();await page.waitForTimeout(400);await expect(reset.getByText(/starting password/)).toBeVisible();
 await hold.hover();await page.mouse.down();await page.waitForTimeout(1500);await page.mouse.up();
 await expect(reset.getByText('member.test123')).toBeVisible();await page.screenshot({path:'test-results/micro-reset.png'});
 await reset.getByRole('button',{name:'Done'}).click();
 /* settings: theme segment and sound bell */
 await page.goto('/settings');await expect(page.getByRole('radiogroup',{name:'Theme'})).toBeVisible();await expect(page.getByRole('button',{name:'Notification sounds'})).toBeVisible();
 await page.screenshot({path:'test-results/micro-settings.png',fullPage:true});
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});for(const path of ['/inquiries','/']){await page.goto(path);await page.waitForTimeout(400);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),path+' at '+width).toBeTruthy();}}
 await page.screenshot({path:'test-results/micro-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
 await db.query(`UPDATE admin_users SET password_hash='unused', must_change_password=false, password_changed_at=$1 WHERE username='member.test'`,[version]);
});

test('the sign-in page offers a forgot-password flow',async({page})=>{
 const html=readFileSync('admin/index.html','utf8');
 await page.route('**/*',async route=>{if(route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:html});return route.continue();});
 await page.route('**/api/admin/me',route=>route.fulfill({status:401,json:{error:'Unauthorized'}}));
 const asked:any[]=[];await page.route('**/api/admin/password-reset',async route=>{const body=route.request().postDataJSON();asked.push(body);await route.fulfill({json:body.token?{valid:false}:{ok:true}});});
 await page.goto('/');await page.getByRole('button',{name:'Forgot password?'}).click();
 await page.getByLabel('Username').fill('james.zxeno');await page.getByRole('button',{name:'Email me a reset link'}).click();
 await expect(page.getByText(/reset link is on its way/)).toBeVisible();expect(asked[0]).toEqual({username:'james.zxeno'});
 await page.screenshot({path:'test-results/forgot-sent.png'});
 await page.goto('/reset-password#not-a-real-token-value-123');await expect(page.getByText(/expired or was already used/)).toBeVisible();
 expect(page.url()).not.toContain('#');
});

test('interface sounds: taps, checks, fuse undo and hold to confirm',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__sfxLog=[];
  class FakeContext{
   state='running';currentTime=0;destination={};
   resume(){return Promise.resolve();}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(n:any){return n;}};}
   createOscillator(){return {type:'',frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(n:any){return n;},start(){},stop(){}};}
  }
  (window as any).AudioContext=FakeContext;
 });
 await create('tasks',{title:'Sound check task',status:'todo',assignee:'exec.test'});
 await db.query(`INSERT INTO admin_inquiries(name,email,message) VALUES('Cara Lim','cara@example.com','Poster series')`);
 const log=()=>page.evaluate(()=>(window as any).__sfxLog as string[]);
 await mount(page,'/tasks/mine');await expect(page.getByText('Sound check task')).toBeVisible();
 await page.getByRole('button',{name:'Search'}).click();await page.keyboard.press('Escape');
 expect(await log()).toContain('tap');
 await page.getByRole('checkbox',{name:'Done: Sound check task'}).click();
 await expect.poll(log).toContain('check');
 await page.goto('/inquiries');const card=page.locator('.inquiry-card',{hasText:'Cara Lim'});
 await card.getByRole('button',{name:'Archive'}).click();await card.getByRole('button',{name:'Undo'}).click();
 await expect.poll(log).toContain('undo');
 await card.getByRole('button',{name:/More actions/}).click();await page.getByRole('menuitem',{name:'Delete'}).click();
 const hold=page.getByRole('dialog').getByRole('button',{name:/Hold to delete/});await hold.hover();await page.mouse.down();await page.waitForTimeout(1200);await page.mouse.up();
 await expect.poll(log).toContain('confirm');
 expect((await log()).filter(n=>n==='tap').length).toBeGreaterThan(1);
});
