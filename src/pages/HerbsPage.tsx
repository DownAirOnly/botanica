import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle,FlaskConical,Plus,Search,ShoppingCart,SlidersHorizontal} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Metric,Modal,RowItem,SelectField,Tabs} from '../components/UI';
import {adjustStock,ensureVendor,extractStock,receivePurchase,saveHerb,lowStockItems,totalCost} from '../domain/inventory';
import {FORM_LABEL,FORM_UNIT,FORMS,formatAmount,makeId,unitLabel,zeroStock,zeroThresholds,type Herb,type StockForm,type Purchase} from '../types';
import {useApp} from '../state/AppContext';
import {CostsPanel,CostsSummary} from '../components/Pricing';
import {latestPriceQuote,quoteVendor} from '../domain/pricing';
import {isCountVerified} from '../domain/workflow';

export function HerbsPage({selected,onSelect,onOpenRestock}:{selected:string|null;onSelect:(id:string|null)=>void;onOpenRestock:()=>void}){
 const {db,setDB,notify,reportError}=useApp();const [query,setQuery]=useState('');const [filter,setFilter]=useState<'all'|'low'>('all');const [create,setCreate]=useState(false);const [name,setName]=useState('');
 const lowIds=new Set(lowStockItems(db).map(x=>x.herb.id));
 const filtered=useMemo(()=>db.herbs.filter(h=>(filter==='all'||lowIds.has(h.id))&&(h.name.toLowerCase().includes(query.toLowerCase())||h.aliases.some(a=>a.toLowerCase().includes(query.toLowerCase())))).sort((a,b)=>a.name.localeCompare(b.name)),[db.herbs,filter,query]);
 function add(){try {if(!name.trim())throw new Error('Enter an herb name.');if(db.herbs.some(h=>h.name.trim().toLowerCase()===name.trim().toLowerCase()))throw new Error('This herb already exists.');const h:Herb={id:makeId(),name:name.trim(),aliases:[],category:'herb',stock:zeroStock(),thresholds:zeroThresholds()};setDB(()=>saveHerb(db,h));notify('Herb created.');setCreate(false);setName('');onSelect(h.id);}catch(e){reportError(e);}}
 if(selected){const herb=db.herbs.find(x=>x.id===selected);if(herb)return <HerbDetail key={selected} herb={herb} onBack={()=>onSelect(null)}/>;}
 return <div className="content-stack">
  <div className="page-heading"><div><h2>Ingredient catalog</h2><p>Search raw herbs, powders, prepared extracts, and supplier details.</p></div><div className="action-bar"><Button variant="secondary" onClick={onOpenRestock}>Check stock & restock</Button><Button onClick={()=>setCreate(true)}><Plus size={18}/> Add herb</Button></div></div>
  <div className="toolbar"><label className="search-field"><Search size={18}/><input aria-label="Search herbs" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ingredients or aliases..."/></label><Tabs value={filter} onChange={v=>setFilter(v as 'all'|'low')} options={[{id:'all',label:'All herbs'},{id:'low',label:`Low stock (${lowIds.size})`}]}/></div>
  <Card className="list-card">
   {filtered.length?filtered.map(h=>{
    const low=lowIds.has(h.id);const active=FORMS.filter(f=>h.stock[f]!==0||h.thresholds[f]>0);return <RowItem key={h.id} title={h.name} detail={active.length?active.map(f=>`${FORM_LABEL[f]} ${formatAmount(h.stock[f])} ${unitLabel(FORM_UNIT[f])}${isCountVerified(h,f)?'':' · not counted'}`).join(' · '):'Not counted · no active stock forms'} end={<span className="row-status">{low&&<Badge tone="warning">Low</Badge>}<ArrowRight size={17}/></span>} onClick={()=>onSelect(h.id)}/>;
   }):<EmptyState title="No matching herbs" description="Try a different search, import a workbook, or add a new ingredient."/>}
  </Card>
  {create&&<Modal title="New herb" onClose={()=>setCreate(false)} footer={<><Button variant="ghost" onClick={()=>setCreate(false)}>Cancel</Button><Button onClick={add}><Plus size={16}/> Create herb</Button></>}><Field label="Herb name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Chamomile"/><p className="hint">New ingredients start with zero stock. Receive a purchase or record a verified count to add inventory.</p></Modal>}
 </div>;
}
function HerbDetail({herb,onBack}:{herb:Herb;onBack:()=>void}){
 const {db,setDB,notify,reportError}=useApp();const [tab,setTab]=useState('stock');
 const [adjust,setAdjust]=useState(false),[buy,setBuy]=useState(false),[extract,setExtract]=useState(false),[editing,setEditing]=useState(false);
 const [form,setForm]=useState<StockForm>('dry'),[mode,setMode]=useState<'add'|'use'|'set'>('add'),[qty,setQty]=useState(''),[reason,setReason]=useState('');
 const [pVendor,setPVendor]=useState(db.vendors.find(v=>v.id===herb.preferredVendorId)?.name||''),[pForm,setPForm]=useState<'dry'|'powder'>('dry'),[pQty,setPQty]=useState('16'),[pPrice,setPPrice]=useState(herb.quotedPricePerLb?.toString()||''),[pShipping,setPShipping]=useState('0'),[pDate,setPDate]=useState(new Date().toISOString().slice(0,10));
 const [eForm,setEForm]=useState<'dry'|'powder'>('dry'),[eInput,setEInput]=useState(''),[eOutput,setEOutput]=useState(''),[eNotes,setENotes]=useState('');
 const [editName,setEditName]=useState(herb.name),[aliases,setAliases]=useState(herb.aliases.join(', ')),[thresholds,setThresholds]=useState({...herb.thresholds}),[vendorId,setVendorId]=useState(herb.preferredVendorId||'');
 const moves=db.movements.filter(m=>m.kind==='ingredient'&&m.itemId===herb.id).sort((a,b)=>b.at.localeCompare(a.at));
 const purchases=db.purchases.filter(p=>p.herbId===herb.id).sort((a,b)=>b.date.localeCompare(a.date));
 const connections=db.recipes.filter(r=>r.ingredients.some(i=>i.herbId===herb.id));
 function run(fn:()=>typeof db,success:string){try{const next=fn();setDB(()=>next);notify(success);}catch(e){reportError(e);}}
 function applyAdjust(){if(!qty.trim()){reportError(new Error('Enter an amount.'));return;}run(()=>adjustStock(db,herb.id,form,mode,Number(qty),reason),'Stock adjustment recorded.');if(reason.trim()&&qty.trim())setAdjust(false);}
 function applyBuy(){try{if(!pVendor.trim())throw new Error('Enter a supplier name.');if(!pQty.trim()||!pPrice.trim()||!pShipping.trim()||!pDate)throw new Error('Complete the quantity, price, shipping and date fields.');const vendor=ensureVendor(db,pVendor);const purchase:Purchase={id:makeId(),herbId:herb.id,vendorId:vendor.id,form:pForm,quantityOz:Number(pQty),pricePerLb:Number(pPrice),shipping:Number(pShipping),date:pDate};const updated=receivePurchase(vendor.db,purchase);setDB(()=>updated);notify('Purchase received and stock updated.');setBuy(false);}catch(e){reportError(e);}}
 function applyExtract(){try{const next=extractStock(db,herb.id,eForm,Number(eInput),Number(eOutput),eNotes);setDB(()=>next);notify('Extraction recorded with measured input and output.');setExtract(false);}catch(e){reportError(e);}}
 function applyEdit(){try{const next=saveHerb(db,{...herb,name:editName.trim(),aliases:aliases.split(',').map(s=>s.trim()).filter(Boolean),thresholds,preferredVendorId:vendorId||undefined});setDB(()=>next);notify('Herb details updated.');setEditing(false);}catch(e){reportError(e);}}
 return <div className="content-stack">
  <div className="page-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> All herbs</button><h2>{herb.name}</h2><p>Herb profile · stock, purchasing, and connected recipes</p></div><Button variant="secondary" onClick={()=>setEditing(true)}><SlidersHorizontal size={17}/> Edit</Button></div>
  <div className="stock-metrics">{FORMS.map(f=><Metric key={f} label={FORM_LABEL[f]} value={<>{formatAmount(herb.stock[f])} <span className="unit">{unitLabel(FORM_UNIT[f])}</span></>} meta={!isCountVerified(herb,f)?'Physical count not verified':herb.thresholds[f]>0?`Reorder at ${formatAmount(herb.thresholds[f])}`:'Verified count · no alert threshold'}/>)}</div>
  <div className="action-bar"><Button onClick={()=>setAdjust(true)}><Plus size={17}/> Adjust stock</Button><Button variant="secondary" onClick={()=>setBuy(true)}><ShoppingCart size={17}/> Receive purchase</Button><Button variant="secondary" onClick={()=>setExtract(true)}><FlaskConical size={17}/> Record extraction</Button></div>
  <Tabs value={tab} onChange={setTab} options={[{id:'stock',label:'Overview'},{id:'recipes',label:`Recipes (${connections.length})`},{id:'costs',label:'Costs'},{id:'history',label:'History'}]}/>
  {tab==='stock'&&<div className="two-columns">
   <Card title="Reorder thresholds">
    {FORMS.map(f=><RowItem key={f} title={FORM_LABEL[f]} detail={herb.thresholds[f]>0?`${formatAmount(herb.thresholds[f])} ${unitLabel(FORM_UNIT[f])} threshold`:'Not configured'} end={!isCountVerified(herb,f)?<Badge tone="neutral">Not counted</Badge>:herb.thresholds[f]>0&&herb.stock[f]<=herb.thresholds[f]?<Badge tone="warning">Reorder</Badge>:<CheckCircle size={17} className="positive-icon"/>}/>)}
    <div className="card-footer"><Button variant="ghost" onClick={()=>setEditing(true)}>Edit thresholds</Button></div>
   </Card>
   <CostsSummary herb={herb} onMore={()=>setTab('costs')} onReceive={()=>setBuy(true)}/>
   <Card title="Latest activity">
    {moves.length?moves.slice(0,5).map(m=><RowItem key={m.id} title={m.reason} detail={new Date(m.at).toLocaleString()} end={`${m.delta>0?'+':''}${formatAmount(m.delta)} ${unitLabel(m.unit)}`}/>):<EmptyState title="No movements recorded" description="Inventory changes will appear here with amounts, timestamps and reasons."/>}
   </Card>
   <Card title="Herb notes"><p className="body-copy">{herb.notes||'No notes have been added to this herb yet.'}</p>{herb.aliases.length>0&&<p className="hint">Also known as: {herb.aliases.join(', ')}</p>}</Card>
  </div>}
  {tab==='costs'&&<CostsPanel herb={herb}/>}
  {tab==='recipes'&&<Card title="Recipes using this herb">
   {connections.length?connections.map(r=>{const ing=r.ingredients.filter(i=>i.herbId===herb.id);return <RowItem key={r.id} title={r.name} detail={r.kind==='tea'?'Tea · dried herb':'Tincture · liquid extract'} end={`${formatAmount(ing.reduce((n,i)=>n+i.parts,0))} parts`}/>;}):<EmptyState title="No connected recipes" description="Adding a herb to a recipe automatically links it here."/>}
  </Card>}
  {tab==='history'&&<div className="two-columns"><Card title="Purchases">
    {purchases.length?purchases.map(p=><RowItem key={p.id} title={db.vendors.find(v=>v.id===p.vendorId)?.name||'Supplier'} detail={`${p.date} · ${formatAmount(p.quantityOz)} oz wt · $${p.pricePerLb.toFixed(2)}/lb`} end={`$${totalCost(p).toFixed(2)}`}/>):<EmptyState title="No purchases yet" description="Record a received shipment to build purchasing history."/>}
   </Card><Card title="Movement ledger">
    {moves.length?moves.map(m=><RowItem key={m.id} title={m.reason} detail={`${new Date(m.at).toLocaleString()} · ${FORM_LABEL[m.form||'dry']}`} end={<span>{formatAmount(m.before)} → {formatAmount(m.after)} {unitLabel(m.unit)}</span>}/>):<EmptyState title="No stock movements"/>}
   </Card></div>}
  {adjust&&<Modal title="Adjust inventory" onClose={()=>setAdjust(false)} footer={<><Button variant="ghost" onClick={()=>setAdjust(false)}>Cancel</Button><Button onClick={applyAdjust}>Record adjustment</Button></>}>
   <SelectField label="Inventory form" value={form} onChange={e=>setForm(e.target.value as StockForm)}>{FORMS.map(f=><option key={f} value={f}>{FORM_LABEL[f]} ({unitLabel(FORM_UNIT[f])})</option>)}</SelectField>
   <SelectField label="Adjustment type" value={mode} onChange={e=>setMode(e.target.value as 'add'|'use'|'set')}><option value="add">Add to stock</option><option value="use">Use / remove stock</option><option value="set">Set verified physical count</option></SelectField>
   <Field label={mode==='set'?'New verified quantity':'Amount'} type="number" min="0" step="any" value={qty} onChange={e=>setQty(e.target.value)}/>
   <Field label="Reason (required)" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Count correction, spoiled material..."/>
   <p className="hint">Current displayed: {formatAmount(herb.stock[form])} {unitLabel(FORM_UNIT[form])}. {mode==='set'?'Setting a measured physical count marks this form as verified.':'Receiving or changing an amount does not certify an unverified historical count.'} All corrections retain before/after values.</p>
  </Modal>}
  {buy&&<Modal title="Receive purchase" onClose={()=>setBuy(false)} footer={<><Button variant="ghost" onClick={()=>setBuy(false)}>Cancel</Button><Button onClick={applyBuy}><ShoppingCart size={16}/> Receive stock</Button></>}>
   <Field label="Supplier name" value={pVendor} onChange={e=>setPVendor(e.target.value)} placeholder="Preferred supplier"/>
   <SelectField label="Purchased form" value={pForm} onChange={e=>{const selectedForm=e.target.value as 'dry'|'powder';setPForm(selectedForm);const q=latestPriceQuote(db,herb.id,selectedForm);setPPrice(q?String(q.pricePerLb):'');if(q)setPVendor(quoteVendor(db,q));}}><option value="dry">Dried herb · oz weight</option><option value="powder">Powder · oz weight</option></SelectField>
   <div className="form-grid"><Field label="Quantity (oz wt)" type="number" min="0" step="any" value={pQty} onChange={e=>setPQty(e.target.value)}/><Field label="Price per pound ($)" type="number" min="0" step="any" value={pPrice} onChange={e=>setPPrice(e.target.value)}/></div>
   <div className="form-grid"><Field label="Shipping / extra cost ($)" type="number" min="0" step="any" value={pShipping} onChange={e=>setPShipping(e.target.value)}/><Field label="Received date" type="date" value={pDate} onChange={e=>setPDate(e.target.value)}/></div>
   <p className="cost-preview">Total cost: <strong>{pPrice&&pQty&&pShipping!==''&&Number(pPrice)>=0&&Number(pQty)>0?`$${(Number(pQty)/16*Number(pPrice)+Number(pShipping)).toFixed(2)}`:'—'}</strong></p>
  </Modal>}
  {extract&&<Modal title="Record tincture extraction" onClose={()=>setExtract(false)} footer={<><Button variant="ghost" onClick={()=>setExtract(false)}>Cancel</Button><Button onClick={applyExtract}>Record extraction</Button></>}>
   <p className="hint">Record actual dry ingredient used and measured finished liquid. The app does not assume a dry-to-liquid conversion ratio.</p>
   <SelectField label="Source material" value={eForm} onChange={e=>setEForm(e.target.value as 'dry'|'powder')}><option value="dry">Dried herb</option><option value="powder">Powder</option></SelectField>
   <div className="form-grid"><Field label="Material used (oz wt)" type="number" min="0" step="any" value={eInput} onChange={e=>setEInput(e.target.value)}/><Field label="Extract yielded (fl oz)" type="number" min="0" step="any" value={eOutput} onChange={e=>setEOutput(e.target.value)}/></div>
   <Field label="Preparation details (required)" value={eNotes} onChange={e=>setENotes(e.target.value)} placeholder="Batch reference, solvent, date..."/>
  </Modal>}
  {editing&&<Modal title="Edit herb details" onClose={()=>setEditing(false)} footer={<><Button variant="ghost" onClick={()=>setEditing(false)}>Cancel</Button><Button onClick={applyEdit}>Save details</Button></>}>
   <Field label="Herb name" value={editName} onChange={e=>setEditName(e.target.value)}/>
   <Field label="Aliases (comma-separated)" value={aliases} onChange={e=>setAliases(e.target.value)}/>
   <SelectField label="Preferred supplier" value={vendorId} onChange={e=>setVendorId(e.target.value)}><option value="">No preferred supplier</option>{db.vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</SelectField>
   <h3 className="subheading">Reorder thresholds</h3>
   {FORMS.map(f=><Field key={f} label={`${FORM_LABEL[f]} · ${unitLabel(FORM_UNIT[f])}`} type="number" min="0" step="any" value={thresholds[f]} onChange={e=>setThresholds(old=>({...old,[f]:Number(e.target.value)}))}/>)}
   <p className="hint">Use the Costs tab to record supplier quotes by herb form. Stock counts require a logged adjustment.</p>
  </Modal>}
 </div>;
}
