import {useState} from 'react';
import {Package,PackagePlus,Plus,Search} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,SelectField,Tabs} from '../components/UI';
import {adjustProductStock,packageProduct,saveProduct} from '../domain/inventory';
import {formatAmount,makeId,unitLabel,RECIPE_UNIT,type Product} from '../types';
import {useApp} from '../state/AppContext';
export function ProductsPage({mode='inventory'}:{mode?:'inventory'|'packaging'}){
 const packaging=mode==='packaging';
 const {db,setDB,notify,reportError}=useApp();const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');const [packageId,setPackageId]=useState<string|null>(null),[count,setCount]=useState('1');const [create,setCreate]=useState(false),[newProduct,setNewProduct]=useState<Product>({id:makeId(),name:'',kind:'tincture',packageOz:2,count:0});
 const [adjustId,setAdjustId]=useState<string|null>(null),[adjustMode,setAdjustMode]=useState<'add'|'use'|'set'>('use'),[adjustCount,setAdjustCount]=useState('1'),[adjustReason,setAdjustReason]=useState('');
 const products=db.products
   .filter(p=>(!packaging||Boolean(p.recipeId))&&(filter==='all'||(filter==='uncounted'?!p.countCheckedAt:p.kind===filter))&&p.name.toLowerCase().includes(query.toLowerCase()))
   .sort((a,b)=>packaging?Number((db.bulk[b.recipeId||'']||0)>0)-Number((db.bulk[a.recipeId||'']||0)>0)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
 const chosen=db.products.find(p=>p.id===packageId),adjusted=db.products.find(p=>p.id===adjustId);
 const bulk=chosen?.recipeId?db.bulk[chosen.recipeId]||0:0;
 function packageNow(){if(!chosen)return;try{const next=packageProduct(db,chosen.id,Number(count));setDB(()=>next);notify(`${count} finished package(s) added.`);setPackageId(null);}catch(e){reportError(e);}}
 function adjustNow(){if(!adjusted)return;try{if(!adjustCount.trim())throw new Error('Enter a package count.');const next=adjustProductStock(db,adjusted.id,adjustMode,Number(adjustCount),adjustReason);setDB(()=>next);notify('Finished product inventory updated.');setAdjustId(null);setAdjustReason('');}catch(e){reportError(e);}}
 function createNow(){try{const next=saveProduct(db,{...newProduct,count:0});setDB(()=>next);notify('Product SKU saved.');setCreate(false);setNewProduct({id:makeId(),name:'',kind:'tincture',packageOz:2,count:0});}catch(e){reportError(e);}}
 return <div className="content-stack">
   <div className="page-heading"><div><h2>{packaging?'Bottle & package':'Finished goods'}</h2><p>{packaging?'Turn recorded bulk mixtures into finished bottles and packages.':'Review finished stock, verify quantities and manage product details.'}</p></div>
    {!packaging&&<Button onClick={()=>{setNewProduct({id:makeId(),name:'',kind:'tincture',packageOz:2,count:0});setCreate(true);}}><Plus size={18}/> New SKU</Button>}</div>
   <div className="toolbar"><label className="search-field"><Search size={18}/><input aria-label="Search products" placeholder={packaging?'Find a product to bottle...':'Search finished products...'} value={query} onChange={e=>setQuery(e.target.value)}/></label><Tabs value={filter} onChange={setFilter} options={packaging?[{id:'all',label:'All linked products'},{id:'tincture',label:'Tinctures'},{id:'tea',label:'Teas'}]:[{id:'all',label:'All'},{id:'uncounted',label:`To count (${db.products.filter(p=>!p.countCheckedAt).length})`},{id:'tincture',label:'Tinctures'},{id:'tea',label:'Teas'},{id:'salve',label:'Salves'}]}/></div>
   <Card className="list-card">
     {products.length?products.map(p=><div className="product-row" key={p.id}><div className="row-main"><strong>{p.name}</strong><small>{p.kind} · {formatAmount(p.packageOz)} {p.kind==='tincture'||p.kind==='spray'?'fl oz':'oz wt'} per unit</small></div>{packaging?<Badge tone={(db.bulk[p.recipeId||'']||0)>0?'success':'neutral'}>{formatAmount(db.bulk[p.recipeId||'']||0)} bulk oz</Badge>:
       <Badge tone={!p.countCheckedAt?'neutral':p.count===0?'warning':'neutral'}>{p.countCheckedAt?`${p.count} in stock`:`Not counted · ${p.count} recorded`}</Badge>}
       <Button variant={packaging?'primary':'secondary'} size="sm" disabled={!p.recipeId||(packaging&&(db.bulk[p.recipeId||'']||0)<p.packageOz)} onClick={()=>{setPackageId(p.id);setCount('1');}}><PackagePlus size={16}/> {packaging?'Bottle':'Pack'}</Button>
       {!packaging&&<Button variant="ghost" size="sm" onClick={()=>{setNewProduct(structuredClone(p));setCreate(true);}}>Edit</Button>}
       {!packaging&&<Button variant="ghost" size="sm" onClick={()=>{setAdjustId(p.id);setAdjustMode(p.countCheckedAt?'use':'set');setAdjustCount(p.countCheckedAt?'1':'');setAdjustReason(p.countCheckedAt?'':'Physical count confirmed');}}>{p.countCheckedAt?'Adjust':'Count'}</Button></div>):<EmptyState title={packaging?'No linked products available':'No products found'} description={packaging?'Link a product to a recipe from Inventory → Finished goods first.':'Create product variants or import a finished-goods catalog.'}/>}
   </Card>
   <p className="hint">{packaging?'Only SKUs linked to a formula appear here. Edit product details and verify finished counts in Inventory → Finished goods. Bulk is deducted and finished units increase only when bottling is recorded.':'Existing finished-goods stock can be set through a documented physical count. Newly produced units should be added by packaging from measured bulk.'}</p>
   {chosen&&<Modal title={`Package ${chosen.name}`} onClose={()=>setPackageId(null)} footer={<><Button variant="ghost" onClick={()=>setPackageId(null)}>Cancel</Button><Button onClick={packageNow}><Package size={16}/> Record packaging</Button></>}>
    <div className="stock-metrics"><div className="metric"><span className="metric-label">Unbottled bulk</span><strong className="metric-value">{formatAmount(bulk)} <span className="unit">{unitLabel(RECIPE_UNIT[db.recipes.find(r=>r.id===chosen.recipeId)?.kind||'tincture'])}</span></strong></div><div className="metric"><span className="metric-label">Finished units</span><strong className="metric-value">{chosen.count}</strong></div></div>
    <Field label="Number of packages" type="number" min="1" step="1" value={count} onChange={e=>setCount(e.target.value)}/>
    <p className="cost-preview">Bulk to use: <strong>{formatAmount(Number(count)*chosen.packageOz)} {chosen.kind==='tincture'?'fl oz':'oz wt'}</strong></p>
    <p className="hint">Packaging deducts bulk stock and adds completed units, with linked ledger records.</p>
   </Modal>}
   {create&&<Modal title={db.products.some(p=>p.id===newProduct.id)?'Edit product SKU':'Create product SKU'} onClose={()=>setCreate(false)} footer={<><Button variant="ghost" onClick={()=>setCreate(false)}>Cancel</Button><Button onClick={createNow}>Save SKU</Button></>}>
     <Field label="Product name (including size if helpful)" value={newProduct.name} onChange={e=>setNewProduct(p=>({...p,name:e.target.value}))} placeholder="e.g. Calming Blend · 2 fl oz"/>
     <SelectField label="Product category" value={newProduct.kind} onChange={e=>setNewProduct(p=>({...p,kind:e.target.value as Product['kind']}))}><option value="tincture">Tincture</option><option value="tea">Tea</option><option value="salve">Salve</option><option value="spray">Spray</option><option value="other">Other</option></SelectField>
     <SelectField label="Linked formula (optional)" value={newProduct.recipeId||''} onChange={e=>setNewProduct(p=>({...p,recipeId:e.target.value||undefined}))}><option value="">Not linked</option>{db.recipes.filter(r=>r.kind===newProduct.kind).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
     <Field label="Size per unit (oz by kind)" type="number" min="0.01" step="any" value={newProduct.packageOz} onChange={e=>setNewProduct(p=>({...p,packageOz:Number(e.target.value)}))}/>
     <p className="hint">New SKUs start at zero count. A formula link is required for stock-conserving packaging.</p>
   </Modal>}
   {adjusted&&<Modal title={`Adjust ${adjusted.name}`} onClose={()=>setAdjustId(null)} footer={<><Button variant="ghost" onClick={()=>setAdjustId(null)}>Cancel</Button><Button onClick={adjustNow}>Record change</Button></>}>
     <SelectField label="Adjustment action" value={adjustMode} onChange={e=>setAdjustMode(e.target.value as 'add'|'use'|'set')}><option value="use">Used / sold / removed</option><option value="add">Manual increase (document reason)</option><option value="set">Verified physical count</option></SelectField>
     <Field label="Number of units" type="number" min="0" step="1" value={adjustCount} onChange={e=>setAdjustCount(e.target.value)}/>
     <Field label="Reason (required)" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Sale, damage, count correction..."/>
     <p className="hint">Recorded amount: {adjusted.count} packages. {adjustMode==='set'?'Saving a physical count marks this SKU as verified.':'Imported or unverified quantities must not be treated as confirmed stock.'} Adjustments retain a before/after history.</p>
   </Modal>}
 </div>;
}
