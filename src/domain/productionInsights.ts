import type {BotanicaDB} from '../types';
import {localDate} from './workflow';

export type ProductionMetric='tincture'|'extract'|'tea'|'finished';
export type ProductionPeriod='week'|'month';
export interface ProductionEvent{
  id:string;at:string;name:string;subjectId:string;quantity:number;metric:ProductionMetric;
  source:'batch'|'extraction'|'make-product'|'legacy-packaging';
}
export const productionMetricLabels:Record<ProductionMetric,string>={
  tincture:'Tincture batches',extract:'Single-herb extractions',
  tea:'Tea batches',finished:'Finished product units'
};
export const productionMetricUnits:Record<ProductionMetric,string>={
  tincture:'fl oz',extract:'fl oz',tea:'oz wt',finished:'units'
};
export function eventDay(value:string):string|null{
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))return null;
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-');
}
export function productionEvents(db:BotanicaDB):ProductionEvent[]{
  const runIds=new Set(db.productionRuns.map(r=>r.id));
  const entries:ProductionEvent[]=[];
  for(const b of db.batches){
    if(!Number.isFinite(b.amountOz)||b.amountOz<=0||!eventDay(b.date))continue;
    entries.push({id:b.id,at:b.date,subjectId:b.recipeId,
      name:b.recipeName||db.recipes.find(r=>r.id===b.recipeId)?.name||'Unnamed mixture',
      quantity:b.amountOz,metric:b.unit==='fl_oz'?'tincture':'tea',source:'batch'});
  }
  for(const m of db.movements){
    if(m.action==='extraction'&&m.kind==='ingredient'&&m.form==='extract'&&m.delta>0&&eventDay(m.at)){
      entries.push({id:m.id,at:m.at,subjectId:m.itemId,
        name:db.herbs.find(h=>h.id===m.itemId)?.name||'Single-herb extract',
        quantity:m.delta,metric:'extract',source:'extraction'});
    }
    // Legacy packaging is only included when not represented by a newer linked run.
    if(m.action==='packaging'&&m.kind==='product'&&m.delta>0&&
       (!m.sourceId||!runIds.has(m.sourceId))&&eventDay(m.at)){
      entries.push({id:m.id,at:m.at,subjectId:m.itemId,
        name:db.products.find(p=>p.id===m.itemId)?.name||'Finished product',
        quantity:m.delta,metric:'finished',source:'legacy-packaging'});
    }
  }
  for(const r of db.productionRuns){
    if(!Number.isFinite(r.count)||r.count<=0||!eventDay(r.at))continue;
    entries.push({id:r.id,at:r.at,subjectId:r.productId,
      name:r.productName,quantity:r.count,metric:'finished',source:'make-product'});
  }
  return entries.sort((a,b)=>b.at.localeCompare(a.at));
}
function parse(day:string):Date{
  const [y,m,d]=day.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d));
}
function dateKey(d:Date):string{return d.toISOString().slice(0,10);}
export function productionBucketStart(day:string,period:ProductionPeriod):string{
  const d=parse(day);
  if(period==='month')return dateKey(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)));
  const dow=(d.getUTCDay()+6)%7;
  return dateKey(new Date(d.getTime()-dow*86400000));
}
function shiftPeriod(start:string,period:ProductionPeriod,offset:number):string{
  const d=parse(start);
  return period==='week'?dateKey(new Date(d.getTime()+offset*7*86400000)):
    dateKey(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+offset,1)));
}
function labelBucket(day:string,period:ProductionPeriod):string{
  const d=parse(day);
  return new Intl.DateTimeFormat('en-US',{month:'short',day:period==='week'?'numeric':undefined,
    timeZone:'UTC'}).format(d);
}
export function listProductionSubjects(db:BotanicaDB,metric:ProductionMetric){
  const subjects=new Map<string,{id:string;name:string;events:number}>();
  for(const e of productionEvents(db).filter(e=>e.metric===metric)){
    const entry=subjects.get(e.subjectId)||{id:e.subjectId,name:e.name,events:0};
    subjects.set(e.subjectId,{...entry,events:entry.events+1});
  }
  return [...subjects.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function getProductionSummary(db:BotanicaDB,metric:ProductionMetric,
  period:ProductionPeriod,today=localDate(),subjectId?:string){
  const all=productionEvents(db).filter(e=>e.metric===metric&&(!subjectId||e.subjectId===subjectId));
  const end=productionBucketStart(today,period),periods=period==='month'?6:8;
  const starts=Array.from({length:periods},(_,i)=>shiftPeriod(end,period,i-periods+1));
  const visible=all.filter(e=>{
    const day=eventDay(e.at);
    return day!==null&&day>=starts[0]&&day<=today;
  });
  const bars=starts.map(start=>({
    start,label:labelBucket(start,period),
    value:visible.filter(e=>productionBucketStart(eventDay(e.at)!,period)===start)
      .reduce((sum,e)=>sum+e.quantity,0)
  }));
  const total=visible.reduce((sum,e)=>sum+e.quantity,0);
  const grouped=new Map<string,{subjectId:string;name:string;quantity:number;events:number}>();
  for(const e of visible){
    const current=grouped.get(e.subjectId)||{subjectId:e.subjectId,name:e.name,quantity:0,events:0};
    grouped.set(e.subjectId,{...current,name:e.name,quantity:current.quantity+e.quantity,events:current.events+1});
  }
  const leaders=[...grouped.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name)).slice(0,6);
  return {bars,total,average:total/periods,records:visible.length,leaders,visible,
    recent:visible.slice(0,15),firstRecorded:all.length?all[all.length-1].at:null,
    periods,unit:productionMetricUnits[metric]};
}
