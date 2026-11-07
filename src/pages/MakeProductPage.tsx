import {useState} from 'react';
import {AlertCircle,ArrowRight,CheckCircle2,PackageCheck,Plus,ShoppingCart} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,RowItem,SelectField,Tabs} from '../components/UI';
import {adjustPackagingSupply,makeFinishedProduct,previewMakeProduct,type MakePreview} from '../domain/making';
import {IngredientCountDialog} from '../components/IngredientCountDialog';
import {useApp} from '../state/AppContext';
import {formatAmount,unitLabel,RECIPE_UNIT,type MakeProductDraft,type MakeProductSource,type StockForm} from '../types';

export function MakeProductPage({onEditProduct,onCreateProduct,onPackaging,draft,onDraftChange}:{
 onEditProduct:(productId:string)=>void;onCreateProduct:()=>void;onPackaging:()=>void;
 draft:MakeProductDraft;onDraftChange:(draft:MakeProductDraft)=>void;
}){
 const {db,setDB,notify,reportError}=useApp();
 const {productId,count,source,query}=draft;
 const change=(patch:Partial<MakeProductDraft>)=>onDraftChange({...draft,...patch});
 const [verifyContainer,setVerifyContainer]=useState(false),[containerCount,setContainerCount]=useState('');
 const [verifyIngredient,setVerifyIngredient]=useState<{herbId:string;form:StockForm}|null>(null);
 const product=db.products.find(x=>x.id===productId);
 const recipe=db.recipes.find(x=>x.id===product?.recipeId);
 const eligible=db.products.filter(p=>p.recipeId&&['tea','tincture','spray'].includes(p.kind)&&
   p.name.toLowerCase().includes(query.trim().toLowerCase()))
   .sort((a,b)=>a.name.localeCompare(b.name));
 let preview:MakePreview|null=null,error='';
 if(productId){
   try{
     if(count.trim()==='')error='Enter a number of units to make.';
     else preview=previewMakeProduct(db,productId,Number(count),source);
   }catch(e){error=e instanceof Error?e.message:'Invalid production request.';}
 }
 function make(){
   if(!preview?.ready)return;
   try{
     const next=makeFinishedProduct(db,productId,Number(count),source);
     setDB(()=>next);
     change({completed:{productName:preview.productName,count:preview.count,source}});
     notify(`Made ${count} × ${preview.productName}. Ingredients, containers and finished stock were updated together.`);
   }catch(e){reportError(e);}
 }
 function saveContainerCount(){
   if(!preview)return;
   try{
     if(!containerCount.trim())throw new Error('Enter the physical number of containers on hand, including zero.');
     const next=adjustPackagingSupply(db,preview.containerSupplyId,'set',Number(containerCount),'Physical count verified');
     setDB(()=>next);notify('Container count verified.');setVerifyContainer(false);setContainerCount('');
   }catch(e){reportError(e);}
 }
 const recent=db.productionRuns.slice(0,8);
 if(draft.completed)return <div className="content-stack">
   <Card title="Product run recorded">
     <div className="alert success"><CheckCircle2 size={18}/> Made {draft.completed.count} × {draft.completed.productName} from {draft.completed.source==='bulk'?'prepared bulk':'individual ingredients'}.</div>
     <p className="body-copy">Ingredients or bulk, containers, and finished stock were updated as one recorded run. No further production will be recorded until you start another.</p>
     <div className="action-bar"><Button onClick={()=>change({count:'1',completed:undefined})}>Make another</Button>
       <Button variant="secondary" onClick={onPackaging}>View containers</Button></div>
   </Card>
 </div>;
 return <div className="content-stack">
   <div className="page-heading"><div><h2>Make product</h2>
     <p>One step updates ingredients or bulk, packaging supplies, and the finished product count.</p></div>
     <Button variant="secondary" onClick={onPackaging}><ShoppingCart size={16}/> Packaging supplies</Button></div>
   <div className="two-columns">
     <Card title="1 · What are you making?">
       <Field label="Find a finished product" value={query} onChange={e=>change({query:e.target.value})} placeholder="Search by product name…"/>
       <SelectField label="Product" value={productId} onChange={e=>change({productId:e.target.value,count:'1',completed:undefined})}>
         <option value="">Choose a product…</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
         {product&&!eligible.some(p=>p.id===product.id)&&<option value={product.id}>{product.name}</option>}
       </SelectField>
       {eligible.length===0&&<p className="hint">No matching formula-linked products. Clear the search or create a product.</p>}
        <div className="action-bar"><Button size="sm" variant="secondary" onClick={onCreateProduct}>
          <Plus size={15}/> New finished product</Button></div>
        <Field label="Number of finished units" type="number" min="1" step="1" value={count} onChange={e=>change({count:e.target.value})}/>
       <div className="section-heading"><strong>2 · Where will the contents come from?</strong></div>
       <Tabs value={source} onChange={v=>change({source:v as MakeProductSource})}
         options={[{id:'ingredients',label:'Single herb ingredients'},{id:'bulk',label:'Prepared bulk'}]}/>
       <p className="hint">{source==='ingredients'?
         'Mix directly using measured ingredient quantities from the saved formula; nothing is subtracted from existing bulk.':
         'Bottle previously prepared bulk. Individual ingredients were already consumed when that batch was recorded, so they will not be deducted again.'}</p>
       {product&&<div className="make-product-summary">
         <RowItem title="Selected product" end={product.name}/>
         <RowItem title="Formula" end={recipe?.name||'Not linked'}/>
         <RowItem title="Contents required" end={preview?formatAmount(preview.amountOz)+' '+unitLabel(RECIPE_UNIT[recipe?.kind||'tincture']):'—'}/>
       </div>}
     </Card>
     <Card title="3 · Review inventory impact">
       {!productId?<EmptyState title="Choose a product" description="The app will calculate quantities and check supplies before allowing you to confirm."/>:
       error?<div className="content-stack"><div className="alert warning"><AlertCircle size={16}/>{error}</div>
         <Button variant="secondary" onClick={()=>onEditProduct(productId)}>Edit finished product <ArrowRight size={15}/></Button></div>:
       preview&&<>
         <div className="make-product-summary">
           {source==='bulk'?<RowItem title={`Prepared ${recipe?.name||'bulk'}`}
             detail={`Available: ${formatAmount(preview.availableBulkOz)} ${unitLabel(RECIPE_UNIT[recipe?.kind||'tincture'])}`}
             end={<strong>−{formatAmount(preview.amountOz)}</strong>}/>:
             preview.ingredients.map(i=><RowItem key={i.herbId+'-'+i.form} title={i.name}
               detail={i.verified?`${i.form} · counted ${formatAmount(i.available)} ${unitLabel(i.form==='extract'?'fl_oz':'oz_wt')}`:'Physical count not verified'}
               end={<div className="make-count-actions"><span className={!i.enough?'text-danger':''}>−{formatAmount(i.amountOz)} {unitLabel(i.form==='extract'?'fl_oz':'oz_wt')}</span>
                 {(!i.verified||!i.enough)&&<Button size="sm" variant="secondary" onClick={()=>setVerifyIngredient({herbId:i.herbId,form:i.form})}>{i.verified?'Recount':'Count'}</Button>}</div>}/>)}
           <RowItem title={preview.containerName}
             detail={preview.containerVerified?`Counted: ${preview.containerAvailable}`:'Physical count not verified'}
             end={<strong>−{preview.containerRequired} containers</strong>}/>
           <RowItem title={preview.productName} detail="Finished products added" end={<strong>+{preview.count} units</strong>}/>
         </div>
         {preview.issues.length>0&&<div className="alert warning make-issues">
           <AlertCircle size={18}/><div><strong>Cannot record this yet</strong>
             {preview.issues.map((item,i)=><p key={i}>{item}</p>)}
           </div></div>}
         <div className="make-confirm">
           <Button disabled={!preview.ready} onClick={make}><PackageCheck size={17}/> Make {preview.count} {preview.count===1?'unit':'units'}</Button>
           {(!preview.containerVerified||preview.containerAvailable<preview.count)&&<Button variant="secondary" onClick={()=>{setContainerCount('');setVerifyContainer(true);}}>Count {preview.containerName}</Button>}
           <p className="hint">Confirmation records one linked production run with all stock movements. This cannot be undone automatically; corrections are recorded separately.</p>
         </div>
       </>}
     </Card>
   </div>
   <Card title="Recent product-making history" action={<Badge>{db.productionRuns.length} runs</Badge>}>
     {recent.length?recent.map(r=><RowItem key={r.id} title={`${r.count} × ${r.productName}`}
       detail={`${new Date(r.at).toLocaleString()} · ${r.source==='bulk'?'Prepared bulk':'Single herb ingredients'}`}
       end={<CheckCircle2 size={17} className="positive-icon"/>}/>):
       <EmptyState title="No combined product runs yet" description="Existing batch and packaging movements remain in the original ledger. New Make Product operations will appear here."/>}
   </Card>
   {verifyIngredient&&<IngredientCountDialog key={verifyIngredient.herbId+'-'+verifyIngredient.form}
     herbId={verifyIngredient.herbId} form={verifyIngredient.form} onClose={()=>setVerifyIngredient(null)}/>}
   {verifyContainer&&preview&&<Modal title={`Count ${preview.containerName}`} onClose={()=>setVerifyContainer(false)}
     footer={<><Button variant="ghost" onClick={()=>setVerifyContainer(false)}>Cancel</Button><Button onClick={saveContainerCount}>Save count and return</Button></>}>
     <Field autoFocus label="Containers physically on hand" type="number" min="0" step="1" value={containerCount} onChange={e=>setContainerCount(e.target.value)}/>
     <p className="hint">Recorded: {preview.containerAvailable}. Enter the physical count, including zero. Saving records a stock adjustment, not a purchase receipt.</p>
   </Modal>}
   {db.products.filter(p=>!p.recipeId).length>0&&<p className="hint">
     Products without a linked formula are not included in Make Product. Link one in Inventory → Finished goods first.
   </p>}
 </div>;
}
