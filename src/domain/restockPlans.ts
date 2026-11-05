import {makeId,type BotanicaDB,type HerbRestockPlan,type RestockCadence,
  type RestockReviewResult} from '../types';
import {localDate} from './workflow';

export const cadenceLabels:Record<RestockCadence,string>={
  weekly:'Every week',biweekly:'Every 2 weeks',monthly:'Every month',quarterly:'Every 3 months'
};
export const reviewResultLabels:Record<RestockReviewResult,string>={
  consider_order:'Needs an order / follow-up',no_order_needed:'No order needed this time'
};

function parseDate(value:string):Date{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Choose a valid calendar date.');
  const [y,m,d]=value.split('-').map(Number);
  if(y<1970||y>2100||m<1||m>12||d<1||d>31)throw new Error('Choose a date from 1970 to 2100.');
  const parsed=new Date(Date.UTC(y,m-1,d));
  if(parsed.getUTCFullYear()!==y||parsed.getUTCMonth()!==m-1||parsed.getUTCDate()!==d)
    throw new Error('Choose a valid calendar date.');
  return parsed;
}
function fmt(date:Date):string{return date.toISOString().slice(0,10);}
function addMonths(original:Date,months:number,anchor:number):Date{
  const y=original.getUTCFullYear(),m=original.getUTCMonth()+months;
  const lastDay=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  return new Date(Date.UTC(y,m,Math.min(anchor,lastDay)));
}
export function nextReviewDate(nextOn:string,cadence:RestockCadence,
  today=localDate(),anchorDay?:number):string{
  const initial=parseDate(nextOn),now=parseDate(today);
  if(!['weekly','biweekly','monthly','quarterly'].includes(cadence))throw new Error('Select a review cadence.');
  if(cadence==='weekly'||cadence==='biweekly'){
    const days=cadence==='weekly'?7:14;
    const periods=Math.max(1,Math.floor((now.getTime()-initial.getTime())/(days*86400000))+1);
    return fmt(new Date(initial.getTime()+periods*days*86400000));
  }
  const months=cadence==='monthly'?1:3;
  const anchor=anchorDay??initial.getUTCDate();
  if(!Number.isInteger(anchor)||anchor<1||anchor>31)throw new Error('Invalid calendar anchor.');
  let next=addMonths(initial,months,anchor);
  for(let i=0;next<=now&&i<1600;i++)next=addMonths(initial,months*(i+2),anchor);
  if(next<=now)throw new Error('Review date is too far in the past.');
  return fmt(next);
}
export function restockReviewQueue(db:BotanicaDB,today=localDate()){
  return db.restockPlans.filter(p=>p.active)
    .map(plan=>({plan,herb:db.herbs.find(h=>h.id===plan.herbId),
      due:plan.nextReviewOn<=today}))
    .filter(x=>Boolean(x.herb))
    .sort((a,b)=>a.plan.nextReviewOn.localeCompare(b.plan.nextReviewOn)||
      (a.herb?.name||'').localeCompare(b.herb?.name||''));
}
export function saveRestockPlan(db:BotanicaDB,input:{
  id?:string;herbId:string;form:'dry'|'powder';cadence:RestockCadence;
  nextReviewOn:string;active:boolean;vendorId?:string;targetQuantityOz?:number;
  notes?:string;
}):BotanicaDB{
  if(!db.herbs.some(h=>h.id===input.herbId))throw new Error('Choose an existing herb.');
  if(!['dry','powder'].includes(input.form))throw new Error('Choose dried herb or powder.');
  if(!['weekly','biweekly','monthly','quarterly'].includes(input.cadence))
    throw new Error('Select a review cadence.');
  const due=parseDate(input.nextReviewOn);
  if(input.vendorId&&!db.vendors.some(v=>v.id===input.vendorId))throw new Error('Choose a known supplier.');
  if(input.targetQuantityOz!==undefined&&(!Number.isFinite(input.targetQuantityOz)||input.targetQuantityOz<=0))
    throw new Error('A reference order quantity must be greater than zero.');
  const existing=input.id?db.restockPlans.find(p=>p.id===input.id):undefined;
  if(input.id&&!existing)throw new Error('Restock plan was not found.');
  if(db.restockPlans.some(p=>p.herbId===input.herbId&&p.form===input.form&&p.id!==existing?.id))
    throw new Error('This ingredient and form already has a restock plan. Edit or resume it instead.');
  const now=new Date().toISOString();
  const sameCalendar=existing?.nextReviewOn===input.nextReviewOn&&existing?.cadence===input.cadence;
  const plan:HerbRestockPlan={
    ...input,id:existing?.id||makeId(),notes:input.notes?.trim()||undefined,
    vendorId:input.vendorId||undefined,anchorDay:sameCalendar?existing?.anchorDay:due.getUTCDate(),
    createdAt:existing?.createdAt||now,updatedAt:now
  };
  return {...db,updatedAt:now,restockPlans:existing?
    db.restockPlans.map(p=>p.id===existing.id?plan:p):[plan,...db.restockPlans]};
}
export function reviewRestockPlan(db:BotanicaDB,id:string,result:RestockReviewResult,
  notes='',today=localDate()):BotanicaDB{
  const plan=db.restockPlans.find(p=>p.id===id);
  if(!plan||!plan.active)throw new Error('Active restock schedule not found.');
  if(!['consider_order','no_order_needed'].includes(result))throw new Error('Choose a review result.');
  parseDate(today);
  const now=new Date().toISOString();
  const next=nextReviewDate(plan.nextReviewOn,plan.cadence,today,plan.anchorDay);
  return {...db,updatedAt:now,
    restockPlans:db.restockPlans.map(p=>p.id===id?{...p,nextReviewOn:next,updatedAt:now}:p),
    restockReviews:[{id:makeId(),planId:id,herbId:plan.herbId,form:plan.form,
      reviewedOn:today,result,notes:notes.trim()||undefined},...db.restockReviews]};
}
