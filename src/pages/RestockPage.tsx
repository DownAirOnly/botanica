import {useState} from 'react';
import {ArrowLeft,ClipboardCheck,PackagePlus,Search,ShoppingCart} from 'lucide-react';
import {Button,Card,EmptyState,Field,Modal,Tabs} from '../components/UI';
import {adjustStock,ensureVendor,receivePurchase} from '../domain/inventory';
import {quoteVendor,latestPriceQuote} from '../domain/pricing';
import {restockQueue,stockCountQueue} from '../domain/workflow';
import {FORM_LABEL,FORM_UNIT,formatAmount,makeId,unitLabel,type Purchase,type StockForm} from '../types';
import {useApp} from '../state/AppContext';

export function RestockPage({onBack,onOpenHerb,initialTab,embedded=false}:{onBack:()=>void;onOpenHerb:(id:string)=>void;initialTab:'verify'|'reorder';embedded?:boolean}){
 const {db,setDB,notify,reportError}=useApp();
 const [tab,setTab]=useState<'verify'|'reorder'>(initialTab);
 const [query,setQuery]=useState('');
 const [countTarget,setCountTarget]=useState<{herbId:string;form:StockForm}|null>(null);
 const [countQty,setCountQty]=useState(''),[countReason,setCountReason]=useState('Physical count confirmed');
 const [receiveTarget,setReceiveTarget]=useState<{herbId:string;form:'dry'|'powder'}|null>(null);
 const [supplier,setSupplier]=useState(''),[quantity,setQuantity]=useState('16'),[price,setPrice]=useState(''),[shipping,setShipping]=useState('0'),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[time,setTime]=useState('');
 const unchecked=stockCountQueue(db),restock=restockQueue(db);
 const matches=(name:string)=>name.toLowerCase().includes(query.trim().toLowerCase());
 const visibleUnchecked=unchecked.filter(x=>matches(x.herb.name));
 const visibleRestock=restock.filter(x=>matches(x.herb.name));
 function beginCount(herbId:string,form:StockForm){
   const h=db.herbs.find(x=>x.id===herbId);if(!h)return;
   setCountTarget({herbId,form});setCountQty('');setCountReason('Physical count confirmed');
 }
 function applyCount(){
   if(!countTarget)return;
   try{
     if(countQty.trim()==='')throw new Error('Enter a measured quantity, including zero if none is present.');
     const next=adjustStock(db,countTarget.herbId,countTarget.form,'set',Number(countQty),countReason);
     setDB(()=>next);notify('Physical stock count recorded.');setCountTarget(null);
   }catch(e){reportError(e);}
 }
 function beginReceive(herbId:string,form:'dry'|'powder'){
   const herb=db.herbs.find(h=>h.id===herbId);if(!herb)return;
   const q=latestPriceQuote(db,herbId,form);
   setReceiveTarget({herbId,form});setSupplier(q?quoteVendor(db,q):'');
   setPrice(q?String(q.pricePerLb):'');setQuantity('16');setShipping('0');setDate(new Date().toISOString().slice(0,10));setTime('');
 }
 function applyReceipt(){
   if(!receiveTarget)return;
   try{
     if(!supplier.trim())throw new Error('Enter the actual supplier.');
     if(!quantity.trim()||!price.trim()||!shipping.trim()||!date)throw new Error('Complete the purchase details.');
     const vendor=ensureVendor(db,supplier);
     const p:Purchase={id:makeId(),herbId:receiveTarget.herbId,vendorId:vendor.id,
       form:receiveTarget.form,quantityOz:Number(quantity),pricePerLb:Number(price),shipping:Number(shipping),date,receivedTime:time||undefined};
     const next=receivePurchase(vendor.db,p);setDB(()=>next);notify('Received purchase recorded; stock increased.');setReceiveTarget(null);
   }catch(e){reportError(e);}
 }
 const byVendor=new Map<string,typeof visibleRestock>();
 for(const item of visibleRestock){
   const q=item.form==='extract'?undefined:latestPriceQuote(db,item.herb.id,item.form);
   const supplierName=q?quoteVendor(db,q):item.form==='extract'?'Prepare extract':'Supplier not set';
   byVendor.set(supplierName,[...(byVendor.get(supplierName)||[]),item]);
 }
 const countedHerb=countTarget&&db.herbs.find(h=>h.id===countTarget.herbId);
 const receivingHerb=receiveTarget&&db.herbs.find(h=>h.id===receiveTarget.herbId);
 return <div className="content-stack">
   <div className="page-heading"><div>{!embedded&&<button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back</button>}<h2>Check & restock</h2>
     <p>Check what is physically present, then work from a reliable supplier list.</p></div></div>
   <div className="metrics-grid compact">
     <div className="metric"><span className="metric-label">Needs physical count</span><strong className="metric-value">{unchecked.length}</strong><small className="metric-meta">Ingredient forms not yet verified</small></div>
     <div className="metric"><span className="metric-label">Needs replenishing</span><strong className="metric-value">{restock.length}</strong><small className="metric-meta">Confirmed shortages or reorder points</small></div>
     <div className="metric"><span className="metric-label">Suppliers</span><strong className="metric-value">{new Set([...byVendor.keys()].filter(x=>x!=='Supplier not set'&&x!=='Prepare extract')).size}</strong><small className="metric-meta">In the current restock list</small></div>
   </div>
   <div className="toolbar"><Tabs value={tab} onChange={v=>setTab(v as 'verify'|'reorder')}
     options={[{id:'verify',label:`Verify counts (${unchecked.length})`},{id:'reorder',label:`Restock (${restock.length})`}]}/>
     <label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ingredients…" aria-label="Filter ingredient list"/></label>
   </div>
   {tab==='verify'?<Card title="Unverified ingredient amounts">
     <p className="hint">Imported amounts are historical until checked. These rows are not labeled as out of stock. Priority is given to ingredients used in active formulas.</p>
     {visibleUnchecked.length?visibleUnchecked.map(({herb,form,active})=>
       <div className="row-item" key={herb.id+'-'+form}>
         <div className="row-main"><strong>{herb.name}</strong><small>{FORM_LABEL[form]} · Imported/displayed: {formatAmount(herb.stock[form])} {unitLabel(FORM_UNIT[form])} · Not counted{active?' · Used in a recipe':''}</small></div>
         <Button size="sm" variant="secondary" onClick={()=>beginCount(herb.id,form)}><ClipboardCheck size={15}/> Count</Button>
       </div>):<EmptyState title="Nothing to verify" description={query?'No matching unverified ingredients.':'All currently relevant ingredient forms have physical counts.'}/>}
   </Card>:<>
     <p className="hint">These are confirmed low or empty ingredient amounts. “Gap to threshold” is the minimum to reach the alert threshold, not a recommended order quantity. Verify supplier quotes before purchasing.</p>
     {!visibleRestock.length&&<Card><EmptyState title="No confirmed restocking items" description={unchecked.length?'Physical counts are still pending, so no shortages are assumed.':'Set alert thresholds to identify restocking needs.'}/></Card>}
     {[...byVendor.entries()].map(([vendor,rows])=><Card key={vendor} title={vendor}>
       {rows.map(({herb,form,value,threshold,gap,reason})=>{
         const quote=form==='extract'?undefined:latestPriceQuote(db,herb.id,form);
         return <div className="row-item" key={herb.id+'-'+form}>
           <div className="row-main">
             <strong>{herb.name} · {FORM_LABEL[form]}</strong>
             <small>{reason} · {formatAmount(value)} {unitLabel(FORM_UNIT[form])} on hand{threshold>0?` · Alert at ${formatAmount(threshold)}`:''}</small>
             <small>{gap>0?`Gap to threshold: ${formatAmount(gap)} ${unitLabel(FORM_UNIT[form])}`:''}
               {quote?` · Last recorded: $${quote.pricePerLb.toFixed(2)}/lb${quote.quotedOn?' · '+quote.quotedOn:' · undated'}`:' · No applicable supplier price'}
             </small>
           </div>
           {form!=='extract'?<Button size="sm" variant="secondary" onClick={()=>beginReceive(herb.id,form)}><PackagePlus size={15}/> Receive</Button>:
             <Button size="sm" variant="ghost" onClick={()=>onOpenHerb(herb.id)}>View</Button>}
         </div>;
       })}
     </Card>)}
   </>}
   {countTarget&&countedHerb&&<Modal title={`Count ${countedHerb.name}`} onClose={()=>setCountTarget(null)}
     footer={<><Button variant="ghost" onClick={()=>setCountTarget(null)}>Cancel</Button><Button onClick={applyCount}>Save verified count</Button></>}>
     <p className="body-copy">{FORM_LABEL[countTarget.form]} · {unitLabel(FORM_UNIT[countTarget.form])}. Enter the amount physically present, including 0 if empty.</p>
     <Field label="Physical quantity" type="number" step="any" min="0" value={countQty} onChange={e=>setCountQty(e.target.value)}/>
     <Field label="Reason" value={countReason} onChange={e=>setCountReason(e.target.value)}/>
     <p className="hint">This replaces the previous displayed quantity. A before/after adjustment is saved in the movement ledger.</p>
   </Modal>}
   {receiveTarget&&receivingHerb&&<Modal title={`Receive ${receivingHerb.name}`} onClose={()=>setReceiveTarget(null)}
     footer={<><Button variant="ghost" onClick={()=>setReceiveTarget(null)}>Cancel</Button><Button onClick={applyReceipt}><ShoppingCart size={16}/> Record receipt</Button></>}>
     <p className="hint">Receiving a shipment increases recorded stock and saves the actual paid price. It does not certify the existing total as a physical count.</p>
     <Field label="Supplier" value={supplier} onChange={e=>setSupplier(e.target.value)}/>
     <div className="form-grid"><Field label="Received quantity (oz wt)" type="number" step="any" min="0.001" value={quantity} onChange={e=>setQuantity(e.target.value)}/>
       <Field label="Actual price / lb ($)" type="number" step="any" min="0" value={price} onChange={e=>setPrice(e.target.value)}/></div>
     <div className="form-grid"><Field label="Shipping ($)" type="number" step="any" min="0" value={shipping} onChange={e=>setShipping(e.target.value)}/>
       <Field label="Received on" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
       <Field label="Received time (optional)" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
   </Modal>}
 </div>;
}
