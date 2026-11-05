import {useState} from 'react';
import {ArrowLeft,ClipboardList,Plus,Search,SlidersHorizontal} from 'lucide-react';
import {adjustGeneralItem,saveGeneralItem} from '../domain/generic';
import {Badge,Button,Card,EmptyState,Field,Metric,Modal,RowItem,SelectField} from '../components/UI';
import {formatAmount,makeId,unitLabel,type GeneralItem,type GeneralUnit} from '../types';
import {useApp} from '../state/AppContext';
const UNITS:GeneralUnit[]=['units','g','kg','oz_wt','lb','ml','fl_oz','l'];
const fresh=():GeneralItem=>({id:makeId(),name:'',category:'',sku:'',unit:'units',quantity:0,threshold:0});
export function ItemsPage(){
 const {db,setDB,notify,reportError}=useApp();const [selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState('');
 const [editor,setEditor]=useState<GeneralItem|null>(null),[adjust,setAdjust]=useState(false);
 const [op,setOp]=useState<'add'|'use'|'set'>('add'),[qty,setQty]=useState('1'),[reason,setReason]=useState('');
 const item=db.items.find(i=>i.id===selected);
 const low=db.items.filter(i=>i.threshold>0&&i.quantity<=i.threshold);
 const filtered=db.items.filter(i=>[i.name,i.category,i.sku].some(x=>x.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name));
 function save(){if(!editor)return;try{const next=saveGeneralItem(db,editor);setDB(()=>next);setSelected(editor.id);setEditor(null);notify('Item saved; syncing to cloud.');}catch(e){reportError(e);}}
 function change(){if(!item)return;try{if(!qty.trim())throw new Error('Enter a quantity.');const next=adjustGeneralItem(db,item.id,op,Number(qty),reason);setDB(()=>next);setAdjust(false);setReason('');notify('Inventory updated; syncing to cloud.');}catch(e){reportError(e);}}
 const history=item?db.movements.filter(m=>m.kind==='generic'&&m.itemId===item.id):[];
 return <div className="content-stack">
 {item?<>
   <button className="back-link" onClick={()=>{setSelected(null);setAdjust(false);}}><ArrowLeft size={17}/> All items</button>
   <div className="page-heading"><div><h2>{item.name}</h2><p>{[item.sku,item.category].filter(Boolean).join(' · ')||'Inventory item'}</p></div><Button variant="secondary" onClick={()=>setEditor({...item})}><SlidersHorizontal size={17}/> Edit details</Button></div>
   <div className="metrics-grid compact"><Metric label="On hand" value={`${formatAmount(item.quantity)} ${unitLabel(item.unit)}`}/><Metric label="Reorder at" value={`${formatAmount(item.threshold)} ${unitLabel(item.unit)}`}/><Metric label="Unit cost" value={item.unitCost===undefined?'—':`$${item.unitCost.toFixed(2)}`}/></div>
   {item.threshold>0&&item.quantity<=item.threshold&&<div className="alert warning">Stock is at or below its reorder threshold.</div>}
   <div className="action-bar"><Button onClick={()=>setAdjust(true)}><Plus size={17}/> Adjust stock</Button></div>
   <div className="two-columns"><Card title="Item details"><RowItem title="Vendor" end={item.vendor||'Not set'}/><RowItem title="Category" end={item.category||'Uncategorized'}/><RowItem title="SKU" end={item.sku||'Not set'}/>{item.notes&&<p className="body-copy">{item.notes}</p>}</Card>
   <Card title="Movement history" action={<ClipboardList size={18}/>}>{history.length?history.slice(0,20).map(m=><RowItem key={m.id} title={m.reason} detail={new Date(m.at).toLocaleString()} end={`${m.delta>0?'+':''}${formatAmount(m.delta)} ${unitLabel(m.unit)}`}/>):<EmptyState title="No movements yet" description="Stock edits appear here with a reason and timestamp."/>}</Card></div>
 </>:<>
   <div className="page-heading"><div><h2>Items</h2><p>Manage any type of supply, product, or household item with its own unit and reorder threshold.</p></div><Button onClick={()=>{setSelected(null);setEditor(fresh());}}><Plus size={17}/> Add item</Button></div>
   <div className="metrics-grid compact"><Metric label="Catalog items" value={db.items.length}/><Metric label="Need reorder" value={low.length}/><Metric label="Total stock adjustments" value={db.movements.filter(m=>m.kind==='generic').length}/></div>
   <label className="search-field"><Search size={18}/><input placeholder="Search item, category or SKU" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <Card title="Inventory">{!filtered.length?<EmptyState title="No matching items" description="Add your first item or try a different search."/>:filtered.map(i=><RowItem key={i.id} onClick={()=>setSelected(i.id)} title={i.name} detail={[i.category,i.sku].filter(Boolean).join(' · ')||'No category'} end={<span>{formatAmount(i.quantity)} {unitLabel(i.unit)} {i.threshold>0&&i.quantity<=i.threshold&&<Badge tone="warning">Low</Badge>}</span>}/>)}</Card>
 </>}
 {editor&&<Modal title={db.items.some(i=>i.id===editor.id)?'Edit item':'New item'} onClose={()=>setEditor(null)} footer={<><Button variant="ghost" onClick={()=>setEditor(null)}>Cancel</Button><Button onClick={save}>Save item</Button></>}>
  <div className="content-stack"><Field label="Name" value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})}/><div className="form-grid"><Field label="Category" value={editor.category} onChange={e=>setEditor({...editor,category:e.target.value})}/><Field label="SKU / barcode" value={editor.sku} onChange={e=>setEditor({...editor,sku:e.target.value})}/></div>
  <SelectField label="Stock unit" value={editor.unit} onChange={e=>setEditor({...editor,unit:e.target.value as GeneralUnit})}>{UNITS.map(u=><option key={u} value={u}>{unitLabel(u)}</option>)}</SelectField>
  <div className="form-grid"><Field label="Opening stock (new items only)" type="number" min="0" step="any" disabled={db.items.some(i=>i.id===editor.id)} value={editor.quantity} onChange={e=>setEditor({...editor,quantity:Number(e.target.value)})}/><Field label="Reorder at" type="number" min="0" step="any" value={editor.threshold} onChange={e=>setEditor({...editor,threshold:Number(e.target.value)})}/></div>
  <div className="form-grid"><Field label="Vendor" value={editor.vendor||''} onChange={e=>setEditor({...editor,vendor:e.target.value})}/><Field label="Cost per stock unit ($)" type="number" min="0" step="any" value={editor.unitCost??''} onChange={e=>setEditor({...editor,unitCost:e.target.value===''?undefined:Number(e.target.value)})}/></div><Field label="Notes" value={editor.notes||''} onChange={e=>setEditor({...editor,notes:e.target.value})}/></div>
 </Modal>}
 {adjust&&item&&<Modal title={`Adjust ${item.name}`} onClose={()=>setAdjust(false)} footer={<><Button variant="ghost" onClick={()=>setAdjust(false)}>Cancel</Button><Button onClick={change}>Record adjustment</Button></>}>
  <div className="content-stack"><SelectField label="Change type" value={op} onChange={e=>setOp(e.target.value as typeof op)}><option value="add">Add to stock</option><option value="use">Use / remove stock</option><option value="set">Set verified count</option></SelectField><Field label={`Amount (${unitLabel(item.unit)})`} type="number" min="0" step={item.unit==='units'?'1':'any'} value={qty} onChange={e=>setQty(e.target.value)}/><Field label="Reason (required)" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Received, consumed, corrected count…"/></div>
 </Modal>}
 </div>;
}
