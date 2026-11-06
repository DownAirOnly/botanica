import {useState} from 'react';
import {Boxes,CheckCircle,ClipboardCheck,Plus,ShoppingCart} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,Tabs} from '../components/UI';
import {adjustPackagingSupply,receivePackagingSupply,savePackagingSupply} from '../domain/making';
import {PACKAGING_CATEGORIES,packagingName} from '../data/packaging';
import {useApp} from '../state/AppContext';
import type {PackagingSupply} from '../types';

export function PackagingPage(){
 const {db,setDB,notify,reportError}=useApp();
 const [group,setGroup]=useState('All');
 const [chosen,setChosen]=useState<string|null>(null),[operation,setOperation]=useState<'count'|'receive'|'edit'>('count');
 const [quantity,setQuantity]=useState(''),[reason,setReason]=useState('Physical count verified');
 const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[vendor,setVendor]=useState('');
 const [threshold,setThreshold]=useState('0'),[notes,setNotes]=useState('');
 const [countQueue,setCountQueue]=useState<string[]>([]),[countTotal,setCountTotal]=useState(0);
 const supplies=db.packagingSupplies.filter(s=>group==='All'||s.category===group);
 const current=db.packagingSupplies.find(s=>s.id===chosen);
 function open(s:PackagingSupply,mode:'count'|'receive'|'edit'){
   setCountQueue([]);setChosen(s.id);setOperation(mode);setQuantity('');
   setReason('Physical count verified');
   setDate(new Date().toISOString().slice(0,10));
   setVendor(s.vendor||'');setThreshold(String(s.threshold));setNotes(s.notes||'');
 }
 function countAll(){
   if(!db.packagingSupplies.length)return;
   open(db.packagingSupplies[0],'count');
   setCountTotal(db.packagingSupplies.length);
   setCountQueue(db.packagingSupplies.map(s=>s.id));
 }
 function close(){
   setChosen(null);setCountQueue([]);
 }
 function submit(){
   if(!current)return;
   try{
     let next;
     if(operation==='count'){
       if(!quantity.trim())throw new Error('Enter the physically counted number, including zero.');
       next=adjustPackagingSupply(db,current.id,'set',Number(quantity),reason);
     }else if(operation==='receive'){
       if(!quantity.trim())throw new Error('Enter the quantity received.');
       next=receivePackagingSupply(db,{supplyId:current.id,quantity:Number(quantity),date,
         vendor:vendor.trim()||undefined,notes:notes.trim()||undefined});
     }else{
       next=savePackagingSupply(db,{...current,threshold:Number(threshold),vendor:vendor.trim()||undefined,notes:notes.trim()||undefined});
     }
     setDB(()=>next);
     notify(operation==='receive'?'Container receipt recorded.':operation==='count'?'Container count verified.':'Packaging details saved.');
     if(operation==='count'&&countQueue.length>1){
       const remaining=countQueue.slice(1);
       setCountQueue(remaining);setChosen(remaining[0]);setQuantity('');setReason('Physical count verified');
     }else close();
   }catch(e){reportError(e);}
 }
 const unchecked=db.packagingSupplies.filter(s=>!s.countCheckedAt).length;
 const low=db.packagingSupplies.filter(s=>s.countCheckedAt&&s.threshold>0&&s.count<=s.threshold).length;
 return <div className="content-stack">
   <div className="page-heading"><div><h2>Packaging supplies</h2><p>Bottles, tins, and bags are counted here and automatically consumed when making finished products.</p></div>
     <Button variant="secondary" disabled={!db.packagingSupplies.length} onClick={countAll}><ClipboardCheck size={16}/> Count all containers</Button></div>
   <div className="metrics-grid compact">
     <div className="metric"><span className="metric-label">Types</span><strong className="metric-value">{db.packagingSupplies.length}</strong></div>
     <div className="metric"><span className="metric-label">To count</span><strong className="metric-value">{unchecked}</strong></div>
     <div className="metric"><span className="metric-label">Low supplies</span><strong className="metric-value">{low}</strong></div>
   </div>
   <Tabs value={group} onChange={setGroup} options={[{id:'All',label:'All'},...PACKAGING_CATEGORIES.map(n=>({id:n,label:n}))]}/>
   {PACKAGING_CATEGORIES.filter(category=>group==='All'||category===group).map(category=><Card key={category} title={category} action={<Boxes size={18} className="muted-icon"/>}>
     {supplies.filter(s=>s.category===category).map(s=><div className="packaging-supply-row" key={s.id}>
       <div className="row-main"><strong>{s.variant}</strong>
         <small>{s.countCheckedAt?`${s.count} on hand`:'Not counted · no verified opening quantity'}
           {s.threshold>0?` · Reorder at ${s.threshold}`:''}
         </small></div>
       {s.countCheckedAt&&s.threshold>0&&s.count<=s.threshold&&<Badge tone="warning">Low</Badge>}
       {!s.countCheckedAt&&<Badge>Unverified</Badge>}
       <div className="packaging-supply-actions">
         <Button size="sm" variant="secondary" onClick={()=>open(s,'count')}><ClipboardCheck size={15}/> Count</Button>
         <Button size="sm" variant="ghost" onClick={()=>open(s,'receive')}><Plus size={15}/> Receive</Button>
         <Button size="sm" variant="ghost" onClick={()=>open(s,'edit')}>Edit</Button>
       </div>
     </div>)}
   </Card>)}
   {current&&<Modal title={`${operation==='count'?'Count':operation==='receive'?'Receive':'Edit'} ${packagingName(current)}`}
     onClose={close} footer={<><Button variant="ghost" onClick={close}>{countQueue.length?'Stop counting':'Cancel'}</Button>
       <Button onClick={submit}>{operation==='count'?<CheckCircle size={16}/>:operation==='receive'?<ShoppingCart size={16}/>:null}
         {operation==='count'?(countQueue.length>1?'Save & next':'Save physical count'):operation==='receive'?'Receive containers':'Save details'}</Button></>}> 
     {countQueue.length>0&&<p className="hint">Container {countTotal-countQueue.length+1} of {countTotal}. Each count is saved separately; stopping keeps those already recorded.</p>}
     {operation!=='edit'&&<Field autoFocus label={operation==='count'?'Actual physical count':'Received quantity'} type="number"
       min="0" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/>}
     {operation==='count'&&<><Field label="Reason" value={reason} onChange={e=>setReason(e.target.value)}/>
       <p className="hint">Sets the verified on-hand count. Existing recorded balance: {current.count}. This records an adjustment in the history.</p></>}
     {operation==='receive'&&<>
       <Field label="Supplier (optional)" value={vendor} onChange={e=>setVendor(e.target.value)}/>
       <Field label="Received date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
       <Field label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/>
       <p className="hint">Receipt adds units to the recorded balance. An opening count still requires physical confirmation.</p>
     </>}
     {operation==='edit'&&<>
       <Field label="Reorder threshold" type="number" min="0" step="1" value={threshold} onChange={e=>setThreshold(e.target.value)}/>
       <Field label="Preferred supplier (optional)" value={vendor} onChange={e=>setVendor(e.target.value)}/>
       <Field label="Notes" value={notes} onChange={e=>setNotes(e.target.value)}/>
     </>}
   </Modal>}
   {!db.packagingSupplies.length&&<EmptyState title="No packaging types" description="Older workspaces will get the packaging catalog automatically through schema migration."/>}
 </div>;
}
