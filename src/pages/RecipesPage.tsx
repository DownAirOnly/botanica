import {useState} from 'react';
import {ArrowLeft,ArrowRight,FlaskConical,Plus,Search,Trash2} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,RowItem,SelectField,Tabs} from '../components/UI';
import {calculateBatch,recipeLabel,saveRecipe,stockFormForKind} from '../domain/inventory';
import {formatAmount,makeId,RECIPE_UNIT,unitLabel,type Recipe,type RecipeIngredient,type FormulaKind} from '../types';
import {useApp} from '../state/AppContext';
export function RecipesPage({onMakeBatch}:{onMakeBatch:(id:string)=>void}){
 const {db,setDB,notify,reportError}=useApp();const [selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[edit,setEdit]=useState<Recipe|null>(null);
 const [batchOz,setBatchOz]=useState('16');
 const results=db.recipes.filter(r=>(filter==='all'||r.kind===filter)&&r.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 const recipe=db.recipes.find(r=>r.id===selected);
 const calc=recipe&&Number(batchOz)>0?(()=>{try{return calculateBatch(db,recipe,Number(batchOz));}catch{return []}})():[];
 return <div className="content-stack">
  {recipe?<>
   <div className="page-heading"><div><button className="back-link" onClick={()=>setSelected(null)}><ArrowLeft size={16}/> All recipes</button><h2>{recipe.name}</h2><p>{recipeLabel(recipe)}</p></div><Button variant="secondary" onClick={()=>setEdit(structuredClone(recipe))}>Edit recipe</Button></div>
   <div className="two-columns"><Card title="Scaled ingredients">
    <Field label={`Desired batch size (${unitLabel(RECIPE_UNIT[recipe.kind])})`} type="number" min="0" step="any" value={batchOz} onChange={e=>setBatchOz(e.target.value)}/>
    {calc.length?calc.map(c=>{const h=db.herbs.find(x=>x.id===c.herbId);return <RowItem key={c.herbId+'-'+c.form} title={h?.name||'Missing ingredient'} detail={`${formatAmount(c.parts)} parts · Available: ${formatAmount(c.available)} ${unitLabel(RECIPE_UNIT[recipe.kind])}`} end={<span className={c.enough?'':'text-danger'}>{formatAmount(c.amountOz)} {unitLabel(RECIPE_UNIT[recipe.kind])} {!c.enough&&'· Short'}</span>}/>;}):<EmptyState title="Enter a valid batch size"/>}
    <div className="card-footer"><Button disabled={!calc.length||calc.some(c=>!c.enough)} onClick={()=>onMakeBatch(recipe.id)}><FlaskConical size={17}/> Start production</Button>{calc.some(c=>!c.enough)&&<p className="hint">Not enough of one or more ingredients.</p>}</div>
   </Card><Card title="Formula details"><RowItem title="Type" end={<Badge>{recipe.kind==='tincture'?'Tincture · extracts':'Tea · dry herbs'}</Badge>}/><RowItem title="Ingredients" end={recipe.ingredients.length}/><RowItem title="Total parts" end={formatAmount(recipe.ingredients.reduce((n,i)=>n+i.parts,0))}/><RowItem title="Notes" end={recipe.notes||'—'}/><p className="hint">Parts are proportional. Changing a recipe only affects future batches; old batch records preserve their ingredient amounts.</p></Card></div>
  </>:<>
   <div className="page-heading"><div><h2>Recipes & formulas</h2><p>Reuse exact ingredient proportions and calculate any batch size.</p></div><Button onClick={()=>setEdit({id:makeId(),name:'',kind:'tincture',active:true,ingredients:[]})}><Plus size={18}/> New recipe</Button></div>
   <div className="toolbar"><label className="search-field"><Search size={18}/><input aria-label="Search recipes" placeholder="Find a recipe..." value={query} onChange={e=>setQuery(e.target.value)}/></label><Tabs value={filter} onChange={setFilter} options={[{id:'all',label:'All'},{id:'tincture',label:'Tinctures'},{id:'tea',label:'Teas'}]}/></div>
   <Card className="list-card">{results.length?results.map(r=><RowItem key={r.id} title={r.name} detail={`${recipeLabel(r)} · ${r.ingredients.length} ingredients`} end={<ArrowRight size={17}/>} onClick={()=>{setSelected(r.id);setBatchOz('16');}}/>):<EmptyState title="No recipes found" description="Add a recipe or import a tincture/tea workbook."/>}</Card>
  </>}
  {edit&&<RecipeEditor initial={edit} onClose={()=>setEdit(null)} onSave={r=>{try{const next=saveRecipe(db,r);setDB(()=>next);setEdit(null);setSelected(r.id);notify('Recipe saved.');}catch(e){reportError(e);}}}/>}
 </div>;
}
function RecipeEditor({initial,onClose,onSave}:{initial:Recipe;onClose:()=>void;onSave:(r:Recipe)=>void}){
 const {db}=useApp();const [value,setValue]=useState(initial);
 const form=stockFormForKind(value.kind);
 const update=(patch:Partial<Recipe>)=>setValue(v=>({...v,...patch}));
 function add(){if(!db.herbs.length)return;setValue(v=>({...v,ingredients:[...v.ingredients,{herbId:db.herbs[0].id,form:stockFormForKind(v.kind),parts:1}]}));}
 function changeIngredient(index:number,patch:Partial<RecipeIngredient>){setValue(v=>({...v,ingredients:v.ingredients.map((i,n)=>n===index?{...i,...patch}:i)}));}
 return <Modal title={initial.name?'Edit recipe':'New recipe'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={()=>onSave(value)}>Save recipe</Button></>}>
  <Field label="Formula name" value={value.name} onChange={e=>update({name:e.target.value})}/>
  <SelectField label="Formula type" value={value.kind} onChange={e=>{const kind=e.target.value as FormulaKind;update({kind,ingredients:value.ingredients.map(i=>({...i,form:stockFormForKind(kind)}))});}}><option value="tincture">Tincture · liquid extract ingredients</option><option value="tea">Tea · dried ingredients</option></SelectField>
  <h3 className="subheading">Ingredients & proportional parts</h3>
  {value.ingredients.map((item,index)=><div className="ingredient-edit" key={index}>
    <SelectField label={`Ingredient ${index+1}`} value={item.herbId} onChange={e=>changeIngredient(index,{herbId:e.target.value})}>{db.herbs.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</SelectField>
    <Field label="Parts" type="number" min="0.001" step="any" value={item.parts} onChange={e=>changeIngredient(index,{parts:Number(e.target.value)})}/>
    <button className="icon-btn" aria-label={`Remove ingredient ${index+1}`} onClick={()=>update({ingredients:value.ingredients.filter((_,i)=>i!==index)})}><Trash2 size={17}/></button>
  </div>)}
  <Button variant="secondary" disabled={!db.herbs.length} onClick={add}><Plus size={16}/> Add ingredient</Button>
  <Field label="Formula notes" value={value.notes||''} onChange={e=>update({notes:e.target.value})} placeholder="Optional preparation details"/>
  <p className="hint">All {value.kind} ingredients use {form==='extract'?'liquid extract in fluid ounces':'dried herb in ounces by weight'}. Actual material conversion requires a separate extraction record.</p>
 </Modal>;
}
