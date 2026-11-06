import {useState} from 'react';
import {CalendarClock,CheckCircle2,ClipboardCheck,Pause,Play,Plus} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,RowItem,SelectField} from './UI';
import {cadenceLabels,restockReviewQueue,reviewRestockPlan,
  reviewResultLabels,saveRestockPlan,pendingRestockFollowups,resolveRestockFollowup} from '../domain/restockPlans';
import {localDate,isCountVerified} from '../domain/workflow';
import {FORM_LABEL,formatAmount,type HerbRestockPlan,type RestockCadence,
  type RestockReviewResult} from '../types';
import {useApp} from '../state/AppContext';

type Draft={id?:string;herbId:string;form:'dry'|'powder';cadence:RestockCadence;
 nextReviewOn:string;active:boolean;vendorId:string;quantity:string;notes:string};
function initial():Draft{return {herbId:'',form:'dry',cadence:'monthly',nextReviewOn:localDate(),
 active:true,vendorId:'',quantity:'',notes:''};}
export function RestockPlansPanel({onReceive}:{onReceive:(herbId:string,form:'dry'|'powder',plan?:{vendorId?:string;referenceQty?:number})=>void}){
 const {db,setDB,notify,reportError}=useApp();
 const [draft,setDraft]=useState<Draft|null>(null);
 const [reviewId,setReviewId]=useState<string|null>(null);
 const [result,setResult]=useState<RestockReviewResult>('consider_order');
 const [reviewNotes,setReviewNotes]=useState('');
 const queue=restockReviewQueue(db),today=localDate();
 const due=queue.filter(x=>x.due);
 const paused=db.restockPlans.filter(p=>!p.active);
 const pending=pendingRestockFollowups(db);
 const sorted=[...queue.map(x=>x.plan),...paused];
 const reviewing=db.restockPlans.find(p=>p.id===reviewId);
 function edit(plan?:HerbRestockPlan){
   setDraft(plan?{id:plan.id,herbId:plan.herbId,form:plan.form,cadence:plan.cadence,
    nextReviewOn:plan.nextReviewOn,active:plan.active,vendorId:plan.vendorId||'',
    quantity:plan.targetQuantityOz?.toString()||'',notes:plan.notes||''}:initial());
 }
 function save(){
   if(!draft)return;
   try{
     const qty=draft.quantity.trim()===''?undefined:Number(draft.quantity);
     const next=saveRestockPlan(db,{id:draft.id,herbId:draft.herbId,form:draft.form,
       cadence:draft.cadence,nextReviewOn:draft.nextReviewOn,active:draft.active,
       vendorId:draft.vendorId||undefined,targetQuantityOz:qty,notes:draft.notes});
     setDB(()=>next);notify('Restock review schedule saved. No purchase was created.');setDraft(null);
   }catch(e){reportError(e);}
 }
 function toggle(plan:HerbRestockPlan){
   try{
     const next=saveRestockPlan(db,{...plan,active:!plan.active});
     setDB(()=>next);notify(plan.active?'Review schedule paused.':'Review schedule resumed.');
   }catch(e){reportError(e);}
 }
 function resolve(reviewId:string){
   try{
     const next=resolveRestockFollowup(db,reviewId);
     setDB(()=>next);notify('Follow-up marked addressed. No purchase or stock movement was created.');
   }catch(e){reportError(e);}
 }
 function noOrderNeeded(id:string){
   try{
     const next=reviewRestockPlan(db,id,'no_order_needed');
     setDB(()=>next);notify('No-order review recorded. Next date scheduled. No purchase or stock change was made.');
   }catch(e){reportError(e);}
 }
 function startReview(id:string){setReviewId(id);setResult('consider_order');setReviewNotes('');}
 function confirmReview(){
   if(!reviewing)return;
   try{
     const next=reviewRestockPlan(db,reviewing.id,result,reviewNotes);
     setDB(()=>next);notify('Review logged. Next date advanced. No order or stock change was made.');
     setReviewId(null);
   }catch(e){reportError(e);}
 }
 return <div className="content-stack">
   <Card title="Recurring herb restock reviews"
     action={<Button size="sm" onClick={()=>edit()}><Plus size={15}/> Schedule herb</Button>}>
     <p className="hint">Choose how often to review an herb for ordering. These are reminders inside Botanica—not automatic orders, calendar events, push alerts, or stock receipts. Reorder thresholds still work independently.</p>
     <div className="restock-overview">
       <div><strong>{due.length}</strong><span>Due for review</span></div>
       <div><strong>{queue.length-due.length}</strong><span>Upcoming</span></div>
       <div><strong>{paused.length}</strong><span>Paused</span></div>
       <div><strong>{pending.length}</strong><span>Follow-ups</span></div>
     </div>
     {!sorted.length&&<EmptyState title="No scheduled reviews yet"
       description="Start with a frequently ordered dried herb. Set a first review date and choose a repeat interval."/>}
     {sorted.map(p=>{
       const h=db.herbs.find(h=>h.id===p.herbId);
       const supplier=db.vendors.find(v=>v.id===p.vendorId)?.name;
       const isDue=p.active&&p.nextReviewOn<=today;
       const physicallyCounted=h?isCountVerified(h,p.form):false;
       const lastReceipt=db.purchases.filter(q=>q.herbId===p.herbId&&q.form===p.form)
         .sort((a,b)=>b.date.localeCompare(a.date))[0];
       return <div key={p.id} className="restock-plan-row">
         <div className="row-main">
           <strong>{h?.name||'Unknown herb'} · {FORM_LABEL[p.form]}</strong>
           <small>{cadenceLabels[p.cadence]} · Next review {p.nextReviewOn}
             {supplier?' · '+supplier:''}
             {p.targetQuantityOz!==undefined?' · Reference '+formatAmount(p.targetQuantityOz)+' oz wt':''}
           </small>
           <small>{physicallyCounted?'Counted on hand: '+formatAmount(h!.stock[p.form])+' oz wt':'Physical stock count not verified'}
             {lastReceipt?' · Last received '+lastReceipt.date:''}</small>
           {p.notes&&<small>{p.notes}</small>}
         </div>
         <Badge tone={isDue?'warning':'neutral'}>{!p.active?'Paused':isDue?'Due':'Scheduled'}</Badge>
         <div className="restock-plan-actions">
           {p.active&&isDue&&<Button size="sm" variant="secondary" onClick={()=>noOrderNeeded(p.id)}>
             <CheckCircle2 size={15}/> No order</Button>}
           {p.active&&<Button size="sm" variant={isDue?'primary':'secondary'} onClick={()=>startReview(p.id)}>
             <ClipboardCheck size={15}/> Review</Button>}
           <Button size="sm" variant="ghost" onClick={()=>onReceive(p.herbId,p.form,{
             vendorId:p.vendorId,referenceQty:p.targetQuantityOz})}>Receive</Button>
           <Button size="sm" variant="ghost" onClick={()=>edit(p)}>Edit</Button>
           <Button size="sm" variant="ghost" onClick={()=>toggle(p)}>
             {p.active?<Pause size={14}/>:<Play size={14}/>} {p.active?'Pause':'Resume'}</Button>
         </div>
       </div>;
     })}
   </Card>
   {pending.length>0&&<Card title="Follow-ups awaiting action" action={<Badge tone="warning">{pending.length} open</Badge>}>
     <p className="hint">You marked these reviews as needing an order or another action. They stay here until you mark them addressed. Receiving actual stock must still be recorded separately.</p>
     {pending.map(r=><div className="restock-plan-row" key={r.id}>
       <div className="row-main"><strong>{db.herbs.find(h=>h.id===r.herbId)?.name||'Herb'} · {FORM_LABEL[r.form]}</strong>
         <small>Reviewed {r.reviewedOn}{r.notes?' · '+r.notes:''}</small></div>
       <div className="restock-plan-actions">
         <Button size="sm" variant="secondary" onClick={()=>{
           const plan=db.restockPlans.find(p=>p.id===r.planId);
           onReceive(r.herbId,r.form,plan?{vendorId:plan.vendorId,referenceQty:plan.targetQuantityOz}:undefined);
         }}>Receive delivery</Button>
         <Button size="sm" variant="ghost" onClick={()=>resolve(r.id)}>
           <CheckCircle2 size={15}/> Mark addressed</Button>
       </div>
     </div>)}
   </Card>}
   <Card title="Recent review decisions" action={<CalendarClock size={18} className="muted-icon"/>}>
     {db.restockReviews.length?db.restockReviews.slice(0,8).map(r=>{
       const herb=db.herbs.find(h=>h.id===r.herbId);
       return <RowItem key={r.id} title={herb?.name||'Unknown herb'}
         detail={r.reviewedOn+' · '+FORM_LABEL[r.form]+(r.notes?' · '+r.notes:'')}
         end={r.resolvedOn?'Addressed '+r.resolvedOn:reviewResultLabels[r.result]}/>;
     }):<EmptyState title="No reviews recorded" description="Reviews appear here once you confirm whether an order or follow-up is needed."/>}
   </Card>
   {draft&&<Modal title={draft.id?'Edit restock schedule':'Schedule restock review'}
     onClose={()=>setDraft(null)}
     footer={<><Button variant="ghost" onClick={()=>setDraft(null)}>Cancel</Button>
       <Button onClick={save}>Save schedule</Button></>}>
     <SelectField label="Herb" value={draft.herbId}
       onChange={e=>setDraft(d=>d?{...d,herbId:e.target.value}:d)}>
       <option value="">Choose an herb…</option>
       {[...db.herbs].sort((a,b)=>a.name.localeCompare(b.name)).map(h=><option value={h.id} key={h.id}>{h.name}</option>)}
     </SelectField>
     <SelectField label="Herb form" value={draft.form}
       onChange={e=>setDraft(d=>d?{...d,form:e.target.value as 'dry'|'powder'}:d)}>
       <option value="dry">Dried herb</option><option value="powder">Powder</option>
     </SelectField>
     <SelectField label="Review frequency" value={draft.cadence}
       onChange={e=>setDraft(d=>d?{...d,cadence:e.target.value as RestockCadence}:d)}>
       {Object.entries(cadenceLabels).map(([id,name])=><option key={id} value={id}>{name}</option>)}
     </SelectField>
     <Field type="date" label="Next review date" value={draft.nextReviewOn}
       onChange={e=>setDraft(d=>d?{...d,nextReviewOn:e.target.value}:d)}/>
     <SelectField label="Preferred supplier for this review (optional)" value={draft.vendorId}
       onChange={e=>setDraft(d=>d?{...d,vendorId:e.target.value}:d)}>
       <option value="">No supplier selected</option>
       {db.vendors.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}
     </SelectField>
     <Field type="number" min="0.001" step="any" label="Typical order quantity (oz weight, optional)"
       value={draft.quantity} onChange={e=>setDraft(d=>d?{...d,quantity:e.target.value}:d)}/>
     <Field label="Notes (optional)" value={draft.notes}
       onChange={e=>setDraft(d=>d?{...d,notes:e.target.value}:d)}
       placeholder="Supplier lead time or what to check"/>
     <label className="restock-plan-checkbox">
       <input type="checkbox" checked={draft.active}
         onChange={e=>setDraft(d=>d?{...d,active:e.target.checked}:d)}/>
       Schedule active
     </label>
     <p className="hint">The suggested quantity is a reminder, not an automatic purchase or a deduction. When reviewed, the next review date moves to the next future occurrence.</p>
   </Modal>}
   {reviewing&&<Modal title="Review scheduled restock" onClose={()=>setReviewId(null)}
     footer={<><Button variant="ghost" onClick={()=>setReviewId(null)}>Cancel</Button>
       <Button onClick={confirmReview}><CheckCircle2 size={15}/> Save review</Button></>}>
     <p className="body-copy">{db.herbs.find(h=>h.id===reviewing.herbId)?.name||'Herb'} · {FORM_LABEL[reviewing.form]}</p>
     <p className="hint">{db.herbs.find(h=>h.id===reviewing.herbId)?.stockCheckedAt?.[reviewing.form]?
       'Counted on hand: '+formatAmount(db.herbs.find(h=>h.id===reviewing.herbId)!.stock[reviewing.form])+' oz wt':
       'Physical count not verified'}{reviewing.targetQuantityOz?' · Typical order reference: '+formatAmount(reviewing.targetQuantityOz)+' oz wt':''}</p>
     <p className="hint">You are acknowledging a review. No purchase or stock movement will be created.</p>
     <SelectField label="Decision" value={result}
       onChange={e=>setResult(e.target.value as RestockReviewResult)}>
       {Object.entries(reviewResultLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
     </SelectField>
     <Field label="Review notes (optional)" value={reviewNotes}
       onChange={e=>setReviewNotes(e.target.value)} placeholder="Check supplier, waiting for delivery, plenty on hand…"/>
     <p className="hint">The next review date follows the existing schedule. If an order is needed, record the actual receipt separately when supplies arrive.</p>
   </Modal>}
 </div>;
}
