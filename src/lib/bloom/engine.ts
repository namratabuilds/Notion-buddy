import { addDays, format, startOfWeek } from 'date-fns';
export const dayKey = (d = new Date()) => format(d, 'yyyy-MM-dd');
export const weekDays = (d = new Date()) => Array.from({length:7}, (_,i)=>dayKey(addDays(startOfWeek(d,{weekStartsOn:1}),i)));
export type Task = {id:string; title:string; description:string; category:string; priority:string; date:string; time:string; deadline:string; minutes:number; done:boolean; demo?:boolean};
export type Skill = {id:string; name:string; goal:string; target:string; hours:number; notes:string; resource:string; milestones:{id:string;title:string;major:boolean;done:boolean}[];demo?:boolean};
export type Event = {id:string; type:string; at:number; entity?:string; minutes?:number;demo?:boolean};
export type Timer = {id:string; mode:string; target:number; elapsed:number; started:number|null; entity:string};
export type State = {id:string; tasks:Task[]; skills:Skill[]; events:Event[]; rests:{date:string;start:string;end:string;health:number;demo?:boolean}[]; name:string; intention:string; capacity:number; focusTarget:number; onboarded:boolean; timer:Timer|null};
export const initial:State = {id:'bloom', tasks:[],skills:[],events:[],rests:[],name:'',intention:'Make space for what matters.',capacity:20,focusTarget:60,onboarded:false,timer:null};
export const activeSeconds = (t:Timer, now=Date.now()) => Math.min(t.target, t.elapsed + (t.started === null ? 0 : Math.max(0,(now-t.started)/1000)));
export function summary(s:State, days=weekDays()) {
 const tasks=s.tasks.filter(t=>days.includes(t.date));
 const focus=s.events.filter(e=>e.type==='focus-completed' && days.includes(dayKey(new Date(e.at)))).reduce((a,e)=>a+(e.minutes||0),0);
 const completed=tasks.reduce((a,t)=>a+Math.min(t.minutes,t.done?t.minutes:s.events.filter(e=>e.type==='focus-completed'&&e.entity===t.id).reduce((n,e)=>n+(e.minutes||0),0)),0);
 const planned=tasks.reduce((a,t)=>a+t.minutes,0)/60;
 return {planned,focus,completed:completed/60,remaining:tasks.filter(t=>!t.done).length,excess:Math.max(0,planned-s.capacity)};
}
export function plantState(s:State, now=new Date()) {
 const today=dayKey(now); const days=Array.from({length:7},(_,i)=>dayKey(addDays(now,-6+i)));
 const applicable=days.filter(d=>!s.rests.some(r=>r.date===d&&r.start==='00:00'&&r.end==='23:59'));
 const tasks=s.tasks.filter(t=>applicable.includes(t.date));
 const planned=tasks.reduce((a,t)=>a+t.minutes,0); const credited=tasks.reduce((a,t)=>a+Math.min(t.minutes,t.done?t.minutes:s.events.filter(e=>e.type==='focus-completed'&&e.entity===t.id).reduce((n,e)=>n+(e.minutes||0),0)),0);
 const adherence=planned?100*credited/planned:0;
 const focus=s.events.filter(e=>e.type==='focus-completed'&&applicable.includes(dayKey(new Date(e.at)))).reduce((a,e)=>a+(e.minutes||0),0);
 const activeDays=applicable.filter(d=>s.tasks.some(t=>t.date===d)||s.events.some(e=>dayKey(new Date(e.at))===d&&['focus-completed','task-completed','milestone-completed'].includes(e.type)));
 const consistent=activeDays.filter(d=>s.events.some(e=>dayKey(new Date(e.at))===d&&['focus-completed','task-completed','milestone-completed'].includes(e.type))).length;
 const consistency=activeDays.length?consistent/activeDays.length*100:0;
 const focusScore=Math.min(100,focus/Math.max(1,s.focusTarget*activeDays.length)*100);
 const raw=Math.max(40,Math.round(adherence*.4+focusScore*.3+consistency*.3));
 // Replay each day's valid progress to preserve the daily downward limit, without blocking recovery.
 let health=40;
 for(const d of days){
  const rest=s.rests.find(r=>r.date===d);
  const ev=s.events.filter(e=>dayKey(new Date(e.at))===d&&['focus-completed','task-completed','milestone-completed'].includes(e.type));
  const dayTasks=tasks.filter(t=>t.date<=d);
  const a=dayTasks.length?dayTasks.filter(t=>t.done&&s.events.some(e=>e.entity===t.id&&e.type==='task-completed'&&dayKey(new Date(e.at))<=d)).reduce((n,t)=>n+t.minutes,0)/Math.max(1,dayTasks.reduce((n,t)=>n+t.minutes,0))*100:0;
  if(rest){health=Math.max(health,rest.health);continue;}
  if(ev.length) health=Math.max(health,Math.min(100,Math.round(a*.4+Math.min(100,ev.filter(e=>e.type==='focus-completed').reduce((n,e)=>n+(e.minutes||0),0)/s.focusTarget*100)*.3+100*.3)));
 }
 health=Math.max(raw,health-10);
 const rest=s.rests.find(r=>r.date===today);
 if(rest) health=Math.max(health,rest.health);
 const growth=s.events.filter(e=>['task-completed','focus-completed','milestone-completed'].includes(e.type)).length;
 return {health,adherence:Math.round(adherence),focus:Math.round(focusScore),consistency:Math.round(consistency),growth,provisional:activeDays.length<3,state:rest?'Resting':health>=75?'Thriving':health>=50||activeDays.length<3?'Growing':'Needs Attention'};
}
export function rebalance(s:State, days=weekDays()):{tasks:Task[];conflicts:string[]} {
 const result=s.tasks.map(t=>({...t}));const conflicts:string[]=[];
 const working=days.filter(d=>!s.rests.some(r=>r.date===d&&r.start==='00:00'&&r.end==='23:59'));
 const budget=s.capacity*60/Math.max(1,working.length);const used:Record<string,number>={};
 const fixed=result.filter(t=>days.includes(t.date)&&(t.category==='Exams'||t.done));
 for(const t of fixed){used[t.date]=(used[t.date]||0)+t.minutes;if((used[t.date]||0)>budget)conflicts.push(`${t.title}: fixed work exceeds the daily budget.`);}
 const rank:Record<string,number>={Urgent:0,High:1,Medium:2,Low:3};
 const flexible=result.filter(t=>days.includes(t.date)&&!t.done&&t.category!=='Exams').sort((a,b)=>(rank[a.priority]??2)-(rank[b.priority]??2)||a.deadline.localeCompare(b.deadline)||a.id.localeCompare(b.id));
 for(const t of flexible){
  const candidates=[t.date,...working.filter(d=>d!==t.date)].filter(d=>working.includes(d)&&(!t.deadline||d<=t.deadline));
  const date=candidates.find(d=>(used[d]||0)+t.minutes<=budget);
  if(date){t.date=date;t.time='09:00';used[date]=(used[date]||0)+t.minutes;continue;}
  // Only defer beyond the current week when the hard deadline allows it.
  let deferred=''; for(let i=1;i<=21;i++){const d=dayKey(addDays(new Date(days[6]+'T12:00:00'),i));if(t.deadline&&d>t.deadline)break;if(s.rests.some(r=>r.date===d))continue;const other=result.filter(x=>x.id!==t.id&&x.date===d).reduce((n,x)=>n+x.minutes,0);if(other+t.minutes<=budget){deferred=d;break;}}
  if(deferred){t.date=deferred;t.time='09:00';}else conflicts.push(`${t.title}: cannot fit before ${t.deadline||'the planning horizon'}. Shorten or split this task, or increase available hours.`);
 }
 // Allocate non-overlapping times around fixed examinations and partial rest periods.
 for(const d of [...new Set(result.map(t=>t.date))]){const locks=result.filter(t=>t.date===d&&(t.category==='Exams'||t.done)).map(t=>({start:Number(t.time.slice(0,2))*60+Number(t.time.slice(3)),end:Number(t.time.slice(0,2))*60+Number(t.time.slice(3))+t.minutes}));const rests=s.rests.filter(r=>r.date===d).map(r=>({start:Number(r.start.slice(0,2))*60+Number(r.start.slice(3)),end:Number(r.end.slice(0,2))*60+Number(r.end.slice(3))}));let cursor=540;for(const t of result.filter(t=>t.date===d&&!t.done&&t.category!=='Exams')){for(let tries=0;tries<50;tries++){const block=[...locks,...rests].find(b=>cursor<b.end&&cursor+t.minutes>b.start);if(!block)break;cursor=block.end;}if(cursor+t.minutes>1440){conflicts.push(`${t.title}: no uninterrupted time outside rest periods.`);continue;}t.time=`${String(Math.floor(cursor/60)).padStart(2,'0')}:${String(cursor%60).padStart(2,'0')}`;cursor+=t.minutes;}}
 return {tasks:result,conflicts};
}
export const skillProgress = (skill:Skill) => skill.milestones.length ? Math.round(skill.milestones.filter(m=>m.done).length/skill.milestones.length*100):0;
