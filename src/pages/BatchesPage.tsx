import {useState} from 'react';
import {CheckCircle,FlaskConical,History,TriangleAlert,SlidersHorizontal} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,RowItem,SelectField,Modal} from '../components/UI';
import {adjustBulkStock,calculateBatch,completeBatch,recipeLabel} from '../domain/inventory';
import {formatAmount,unitLabel,RECIPE_UNIT} from '../types';
import {useApp} from '../state/AppContext';
import {ProductionTasks} from '../components/ProductionTasks';
export function BatchesPage({selectedRecipe,onOpenRestock,showTasks=true}:{selectedRecipe:string|null;onOpenRestock:()=>void;showTasks?:boolean}){
 const {db,setDB,notify,reportError}=useApp();const [chosen,setChosen]=useState(selectedRecipe||''),[qty,setQty]=useState('16'),[notes,setNotes]=useState('');const [adjustId,setAdjustId]=useState<string|null>(null),[adjustMode,setAdjustMode]=useState<'add'|'use'|'set'>('set'),[adjustQty,setAdjustQty]=useState(''),[adjustReason,setAdjustReason]=useState('');
 const recipe=db.recipes.find(r=>r.id===chosen);
 const calc=recipe&&Number(qty)>0?(()=>{try{return calculateBatch(db,recipe,Number(qty));}catch{return []}})():[];
 const unknown=calc.filter(c=>!c.verified);
 const missing=calc.filter(c=>c.verified&&!c.enough);
 function applyBulk(){if(!adjustId)return;try{if(!adjustQty.trim())throw new Error('Enter a stock amount.');const next=adjustBulkStock(db,adjustId,adjustMode,Number(adjustQty),adjustReason);setDB(()=>next);notify('Bulk stock adjustment recorded.');setAdjustId(null);}catch(e){reportError(e);}}
 function submit(){if(!recipe)return;try{const next=completeBatch(db,recipe.id,Number(qty),notes);setDB(()=>next);notify(`Recorded ${formatAmount(Number(qty))} ${unitLabel(RECIPE_UNIT[recipe.kind])} of ${recipe.name}.`);setNotes('');setQty('16');}catch(e){reportError(e);}}
 return <div className="content-stack">
  <div className="page-heading"><div><h2>Production</h2><p>Check ingredients, complete a batch, and add unbottled mixture stock.</p></div><Badge>Measured output</Badge></div>
  {showTasks&&<ProductionTasks selectedRecipe={selectedRecipe}/>}
  <div className="two-columns"><Card title="New production batch">
    <SelectField label="Choose a saved recipe" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Select a formula...</option>{db.recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
    {recipe&&<><p className="hint">{recipeLabel(recipe)}</p><Field label={`Amount to prepare (${unitLabel(RECIPE_UNIT[recipe.kind])})`} type="number" min="0" step="any" value={qty} onChange={e=>setQty(e.target.value)}/><Field label="Batch notes / reference" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional lot reference, process notes..."/>
    <div className="section-heading"><strong>Ingredient check</strong>{unknown.length?<Badge tone="warning">{unknown.length} need a count</Badge>:missing.length?<Badge tone="warning">{missing.length} shortage(s)</Badge>:calc.length?<Badge tone="success">Available</Badge>:null}</div>
    {calc.map(c=><RowItem key={c.herbId+'-'+c.form} title={db.herbs.find(h=>h.id===c.herbId)?.name||'Unknown herb'} detail={c.verified?`Counted: ${formatAmount(c.available)} ${unitLabel(RECIPE_UNIT[recipe.kind])}`:'Not counted · displayed quantity is unverified'} end={<span className={c.enough?'':'text-danger'}>{formatAmount(c.amountOz)} {c.enough?<CheckCircle size={14}/>:<TriangleAlert size={14}/>}</span>}/>)}
    {calc.length===0&&<EmptyState title="Enter a valid target amount"/>}
    <div className="card-footer">{unknown.length>0&&<Button variant="secondary" onClick={onOpenRestock}>Verify ingredient stock</Button>}<Button disabled={!calc.length||missing.length>0||unknown.length>0} onClick={submit}><FlaskConical size={16}/> Complete batch</Button><p className="hint">Confirm only after ingredients are actually consumed and output is measured. This action updates ingredient stock and creates bulk mixture stock.</p></div></>}
    {!recipe&&<EmptyState title="Choose a formula" description="Saved recipes can be reused for any batch size."/>}
   </Card>
   <div className="content-stack"><Card title="Bulk mixture inventory">
    {Object.entries(db.bulk).filter(([,q])=>q>0).length?Object.entries(db.bulk).filter(([,q])=>q>0).map(([id,amount])=>{const r=db.recipes.find(x=>x.id===id);return <div className="row-item" key={id}><div className="row-main"><strong>{r?.name||'Unlinked recipe'}</strong><small>Not yet packaged</small></div><span className="row-end">{formatAmount(amount)} {r?unitLabel(RECIPE_UNIT[r.kind]):'oz'}</span><button className="icon-btn" aria-label={`Correct bulk count for ${r?.name||id}`} onClick={()=>{setAdjustId(id);setAdjustQty(String(amount));}}><SlidersHorizontal size={17}/></button></div>;}):<EmptyState title="No bulk mixture in stock"/>}
   </Card>
   <Card title="Recent production" action={<History size={18}/>}>
    {db.batches.length?db.batches.slice(0,12).map(b=><RowItem key={b.id} title={b.recipeName} detail={new Date(b.date).toLocaleString()} end={`${formatAmount(b.amountOz)} ${unitLabel(b.unit)}`}/>):<EmptyState title="No batches recorded" description="Completed batches appear here with a frozen ingredient-use record."/>}
   </Card></div></div>
  {adjustId&&<Modal title="Adjust bulk mixture stock" onClose={()=>setAdjustId(null)} footer={<><Button variant="ghost" onClick={()=>setAdjustId(null)}>Cancel</Button><Button onClick={applyBulk}>Record adjustment</Button></>}>
    <SelectField label="Adjustment type" value={adjustMode} onChange={e=>setAdjustMode(e.target.value as 'add'|'use'|'set')}><option value="set">Set verified measured amount</option><option value="add">Add (documented)</option><option value="use">Remove / discard</option></SelectField>
    <Field label="Bulk quantity" type="number" min="0" step="any" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)}/>
    <Field label="Reason (required)" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}/>
    <p className="hint">Adjustments record the original and resulting amounts. Use packaging for converting bulk stock into finished units.</p>
  </Modal>}

 </div>;
}
