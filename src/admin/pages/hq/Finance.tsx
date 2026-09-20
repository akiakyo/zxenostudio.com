import { useState } from 'react';
import { useApi } from '../../lib/api';
import { money, todayIso } from '../../lib/format';
import { Link } from '../../lib/router';
import { ErrorNote, Loading, PageHeader, Panel, Tabs } from '../../ui/ui';
import { Records } from './Records';
import { expenseConfig } from './config';

type Finance={year:string;through:string;revenue:number;expenses:number;outstanding:number;overdue:number;months:{month:string;revenue:number;expenses:number}[];breakdown:{category:string;amount:number}[]};
export function FinancePage(){
 const [tab,setTab]=useState('overview');const [year,setYear]=useState(todayIso().slice(0,4));
 const {data,error,loading,reload}=useApi<Finance>(`finance?year=${year}&view=${tab}`);
 return <div className="page"><PageHeader title="Finance" description="Cash received, expenses and outstanding invoices in Philippine pesos." actions={<Link className="btn btn-secondary btn-md" to="/invoices">Manage invoices</Link>}/>
  <div className="toolbar"><Tabs label="Finance view" value={tab} onChange={setTab} tabs={[{value:'overview',label:'Overview'},{value:'expenses',label:'Expenses'}]}/><label className="field">Year <select aria-label="Financial year" value={year} onChange={e=>setYear(e.target.value)}>{Array.from({length:10},(_,i)=>String(Number(todayIso().slice(0,4))-i)).map(y=><option key={y}>{y}</option>)}</select></label></div>
  {tab==='expenses'?<Records config={expenseConfig}/>:<>{error&&<ErrorNote message={error} onRetry={reload}/>} {loading&&!data&&<Loading/>}{data&&<>
   <p className="muted">Cash basis through {data.through}. Outstanding and overdue reflect all unpaid sent invoices.</p>
   <section className="stats">{[['Revenue YTD',data.revenue],['Expenses YTD',data.expenses],['Outstanding',data.outstanding],['Overdue',data.overdue]].map(([name,value])=><div className="stat" key={String(name)}><strong>{money(Number(value))}</strong><span>{name}</span></div>)}</section>
   <Panel title="Revenue and expenses"><FinanceChart months={data.months}/><div className="table-wrap"><table className="table"><thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Net</th></tr></thead><tbody>{data.months.map((m,i)=><tr key={m.month}><td>{MONTHS[i]}</td><td>{money(m.revenue)}</td><td>{money(m.expenses)}</td><td>{money(m.revenue-m.expenses)}</td></tr>)}</tbody></table></div></Panel>
   <Panel title="Expense breakdown"><div className="hq-stack hq-pad">{data.breakdown.length?data.breakdown.map(b=><div key={b.category}><div className="row-buttons"><strong>{b.category}</strong><span>{money(b.amount)} · {data.expenses?Math.round(b.amount/data.expenses*100):0}%</span></div><progress max={data.expenses||1} value={b.amount} aria-label={b.category}/></div>):<p className="muted">No expenses recorded for this year.</p>}</div></Panel>
  </>}</>}
 </div>;
}

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function FinanceChart({months}:{months:Finance['months']}){
 const max=Math.max(1,...months.flatMap(m=>[m.revenue,m.expenses]));
 return <figure className="hq-pad"><svg viewBox="0 0 720 200" role="img" aria-label="Monthly revenue and expenses. Exact values are in the table below." style={{display:'block',width:'100%'}}>{months.map((m,i)=><g key={m.month}><rect x={i*60+12} y={170-m.revenue/max*150} width="16" height={m.revenue/max*150} fill="var(--accent)"><title>Revenue: {money(m.revenue)}</title></rect><rect x={i*60+30} y={170-m.expenses/max*150} width="16" height={m.expenses/max*150} fill="var(--blue)"><title>Expenses: {money(m.expenses)}</title></rect><text x={i*60+30} y="190" textAnchor="middle" fill="var(--text-2)" fontSize="12">{MONTHS[i]}</text></g>)}</svg><figcaption className="muted">Green: revenue · Blue: expenses</figcaption></figure>;
}
