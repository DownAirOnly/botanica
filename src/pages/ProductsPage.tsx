import {useState} from 'react';
import {PackagePlus,Plus,Search} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,SelectField,Tabs} from '../components/UI';
import {adjustProductStock,saveProduct} from '../domain/inventory';
import {formatAmount,makeId,type Product} from '../types';
import {packagingName} from '../data/packaging';
import {useApp} from '../state/AppContext';

const fresh=():Product=>({id:makeId(),name:'',kind:'tincture',packageOz:2,count:0});
export function ProductsPage({onMakeProduct}:{onMakeProduct:(productId:string)=>void}){
 const {db,setDB,notify,reportError}=useApp();
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const [editing,setEditing]=useState<Product|null>(null);
 const [adjustId,setAdjustId]=useState<string|null>(null),[adjustMode,setAdjustMode]=useState<'add'|'use'|'set'>('use'),
   [adjustCount,setAdjustCount]=useState('1'),[adjustReason,setAdjustReason]=useState('');
 const products=db.products.filter(p=>(filter==='all'||(filter==='uncounted'?!p.countCheckedAt:p.kind===filter))&&
   p.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 const adjusted=db.products.find(p=>p.id===adjustId);
 function save(){
   if(!editing)return;
   try{
     const next=saveProduct(db,{...editing,count:0});
     setDB(()=>next);notify('Finished product details saved.');setEditing(null);
   }catch(e){reportError(e);}
 }
 function adjust(){
   if(!adjusted)return;
   try{
     if(!adjustCount.trim())throw new Error('Enter a whole number.');
     const next=adjustProductStock(db,adjusted.id,adjustMode,Number(adjustCount),adjustReason);
     setDB(()=>next);notify('Finished product inventory updated.');setAdjustId(null);setAdjustReason('');
   }catch(e){reportError(e);}
 }
 function beginAdjust(p:Product){
   setAdjustId(p.id);setAdjustMode(p.countCheckedAt?'use':'set');
   setAdjustCount(p.countCheckedAt?'1':'');setAdjustReason(p.countCheckedAt?'':'Physical count confirmed');
 }
 return <div className="content-stack">
   <div className="page-heading"><div><h2>Finished goods</h2>
     <p>Manage product sizes, their containers and recorded stock. Make Product handles ingredients and packaging together.</p></div>
     <Button onClick={()=>setEditing(fresh())}><Plus size={18}/> New product</Button></div>
   <div className="toolbar"><label className="search-field"><Search size={18}/>
     <input aria-label="Search products" placeholder="Search finished products…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
     <Tabs value={filter} onChange={setFilter} options={[
       {id:'all',label:'All'},{id:'uncounted',label:`To count (${db.products.filter(p=>!p.countCheckedAt).length})`},
       {id:'tincture',label:'Tinctures'},{id:'tea',label:'Teas'},{id:'salve',label:'Salves'}
     ]}/></div>
   <Card className="list-card">
     {products.length?products.map(p=>{
       const container=db.packagingSupplies.find(c=>c.id===p.containerSupplyId);
       return <div className="product-row" key={p.id}>
         <div className="row-main"><strong>{p.name}</strong>
           <small>{p.kind} · {formatAmount(p.packageOz)} {p.kind==='tincture'||p.kind==='spray'?'fl oz':'oz wt'} per unit</small>
           <small>{container?`Container: ${packagingName(container)}`:'Container not assigned'}</small>
         </div>
         <Badge tone={!p.countCheckedAt?'neutral':p.count===0?'warning':'neutral'}>
           {p.countCheckedAt?`${p.count} in stock`:`Not counted · ${p.count} recorded`}</Badge>
         <Button size="sm" variant="secondary" onClick={()=>onMakeProduct(p.id)}><PackagePlus size={16}/> Make</Button>
         <Button size="sm" variant="ghost" onClick={()=>setEditing(structuredClone(p))}>Edit</Button>
         <Button size="sm" variant="ghost" onClick={()=>beginAdjust(p)}>{p.countCheckedAt?'Adjust':'Count'}</Button>
       </div>;
     }):<EmptyState title="No products found" description="Add a product or import a catalog, then link its formula and container before making stock."/>}
   </Card>
   {editing&&<Modal title={db.products.some(p=>p.id===editing.id)?'Edit finished product':'New finished product'}
     onClose={()=>setEditing(null)} footer={<><Button variant="ghost" onClick={()=>setEditing(null)}>Cancel</Button>
       <Button onClick={save}>Save product</Button></>}>
     <Field label="Product name" value={editing.name} onChange={e=>setEditing(p=>p&&({...p,name:e.target.value}))}/>
     <SelectField label="Product category" value={editing.kind} onChange={e=>setEditing(p=>p&&({...p,kind:e.target.value as Product['kind']}))}>
       <option value="tincture">Tincture</option><option value="tea">Tea</option><option value="salve">Salve</option>
       <option value="spray">Spray</option><option value="other">Other</option>
     </SelectField>
     <SelectField label="Linked formula" value={editing.recipeId||''} onChange={e=>setEditing(p=>p&&({...p,recipeId:e.target.value||undefined}))}>
       <option value="">Not linked</option>
       {db.recipes.filter(r=>r.kind===editing.kind||(editing.kind==='spray'&&r.kind==='tincture')).map(r=>
         <option key={r.id} value={r.id}>{r.name}</option>)}
     </SelectField>
     <SelectField label="Container for one finished unit" value={editing.containerSupplyId||''}
       onChange={e=>setEditing(p=>p&&({...p,containerSupplyId:e.target.value||undefined}))}>
       <option value="">Not assigned</option>
       {db.packagingSupplies.map(s=><option key={s.id} value={s.id}>{packagingName(s)}</option>)}
     </SelectField>
     <Field label="Size per unit (oz by product type)" type="number" min="0.01" step="any"
       value={editing.packageOz} onChange={e=>setEditing(p=>p&&({...p,packageOz:Number(e.target.value)}))}/>
     <p className="hint">A linked formula and container type are required for Make Product. All existing quantities remain unchanged when product details are edited.</p>
   </Modal>}
   {adjusted&&<Modal title={`Adjust ${adjusted.name}`} onClose={()=>setAdjustId(null)}
     footer={<><Button variant="ghost" onClick={()=>setAdjustId(null)}>Cancel</Button><Button onClick={adjust}>Record change</Button></>}>
     <SelectField label="Adjustment action" value={adjustMode} onChange={e=>setAdjustMode(e.target.value as 'add'|'use'|'set')}>
       <option value="use">Used / sold / removed</option><option value="add">Manual increase (with reason)</option><option value="set">Verified physical count</option>
     </SelectField>
     <Field label="Number of units" type="number" min="0" step="1" value={adjustCount} onChange={e=>setAdjustCount(e.target.value)}/>
     <Field label="Reason" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}/>
     <p className="hint">Current recorded: {adjusted.count}. A physical count verifies this product. Adjustments retain an audit trail.</p>
   </Modal>}
 </div>;
}
