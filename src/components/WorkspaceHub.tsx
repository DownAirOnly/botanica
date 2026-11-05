import type {LucideIcon} from 'lucide-react';
import {ArrowRight,BookOpen,ClipboardCheck,FlaskConical,Leaf,Package,PackageCheck,PackagePlus} from 'lucide-react';
import {Badge,Button,Card,EmptyState,RowItem} from './UI';
import {HerbsPage} from '../pages/HerbsPage';
import {RestockPage} from '../pages/RestockPage';
import {ProductsPage} from '../pages/ProductsPage';
import {BatchesPage} from '../pages/BatchesPage';
import {RecipesPage} from '../pages/RecipesPage';
import {ProductionTasks} from './ProductionTasks';
import {PackagingPage} from '../pages/PackagingPage';
import {MakeProductPage} from '../pages/MakeProductPage';
import {stockCountQueue,restockQueue,productionQueue} from '../domain/workflow';
import {formatAmount,RECIPE_UNIT,unitLabel} from '../types';
import {useApp} from '../state/AppContext';

export type InventorySection='check'|'herbs'|'packaging'|'products';
export type ProductionSection='queue'|'formulas'|'batch'|'bottle';

type SectionOption<Id extends string>={id:Id;title:string;description:string;Icon:LucideIcon};
function WorkspaceSwitcher<Id extends string>({label,options,value,onChange}:{
  label:string;options:SectionOption<Id>[];value:Id;onChange:(next:Id)=>void
}){
 return <nav className={`workspace-switcher workspace-switcher-${options.length}`} aria-label={label}>
  {options.map(({id,title,description,Icon})=><button type="button" key={id}
    className={value===id?'workspace-switch active':'workspace-switch'}
    aria-current={value===id?'page':undefined} onClick={()=>onChange(id)}>
    <span className="workspace-switch-icon"><Icon size={19} strokeWidth={1.9}/></span>
    <span className="workspace-switch-copy"><strong>{title}</strong><small>{description}</small></span>
  </button>)}
 </nav>;
}
const INVENTORY_SECTIONS:SectionOption<InventorySection>[]=[
 {id:'check',title:'Check & restock',description:'Counts and supplier needs',Icon:ClipboardCheck},
 {id:'herbs',title:'Ingredients',description:'Herbs, extracts and costs',Icon:Leaf},
 {id:'packaging',title:'Containers',description:'Bottles, tins and tea bags',Icon:PackageCheck},
 {id:'products',title:'Finished goods',description:'Bottles, teas and stock',Icon:Package},
];
const PRODUCTION_SECTIONS:SectionOption<ProductionSection>[]=[
 {id:'queue',title:'In progress',description:'Your current work',Icon:FlaskConical},
 {id:'formulas',title:'Recipes',description:'Ingredients and ratios',Icon:BookOpen},
 {id:'batch',title:'Make a batch',description:'Record measured output',Icon:PackagePlus},
 {id:'bottle',title:'Make Product',description:'Mix or bottle finished stock',Icon:PackageCheck},
];
export function InventoryHub({section,onSectionChange,restockTab,selectedHerb,onSelectHerb,onOpenRestock,onMakeProduct}:{
 section:InventorySection;onSectionChange:(s:InventorySection)=>void;
 restockTab:'verify'|'reorder';selectedHerb:string|null;onSelectHerb:(id:string|null)=>void;
 onOpenRestock:(tab:'verify'|'reorder')=>void;onMakeProduct:(id:string)=>void;
}){
 const {db}=useApp();const count=stockCountQueue(db).length+db.products.filter(p=>!p.countCheckedAt).length+db.packagingSupplies.filter(p=>!p.countCheckedAt).length;
 const reorder=restockQueue(db).length;
 return <div className="workspace-hub">
  <div className="workspace-hub-top"><div><span className="eyebrow">STOCK & SUPPLIES</span>
    <p>Check quantities, manage ingredients and track finished stock in one place.</p></div>
    <div className="workspace-hub-stats"><span><strong>{count}</strong> to count</span><span><strong>{reorder}</strong> to restock</span></div>
  </div>
  <WorkspaceSwitcher label="Inventory sections" options={INVENTORY_SECTIONS} value={section} onChange={onSectionChange}/>
  <div className="workspace-content">
   {section==='check'&&<RestockPage key={restockTab} embedded initialTab={restockTab}
     onBack={()=>onSectionChange('herbs')} onOpenHerb={id=>{onSelectHerb(id);onSectionChange('herbs');}}/>}
   {section==='herbs'&&<HerbsPage selected={selectedHerb} onSelect={onSelectHerb}
     onOpenRestock={()=>onOpenRestock('verify')}/>}
   {section==='packaging'&&<PackagingPage/>}
   {section==='products'&&<ProductsPage onMakeProduct={onMakeProduct}/>}
  </div>
 </div>;
}
export function ProductionHub({section,onSectionChange,selectedRecipe,onMakeBatch,onOpenRestock,selectedProductId,onEditProduct,onPackaging}:{
 section:ProductionSection;onSectionChange:(s:ProductionSection)=>void;
 selectedRecipe:string|null;onMakeBatch:(id:string)=>void;onOpenRestock:()=>void;
 selectedProductId:string|null;onEditProduct:()=>void;onPackaging:()=>void;
}){
 const {db}=useApp();const tasks=productionQueue(db);
 const bulk=Object.entries(db.bulk).filter(([,amount])=>amount>0);
 return <div className="workspace-hub">
  <div className="workspace-hub-top"><div><span className="eyebrow">PRODUCTION & RECIPES</span>
    <p>Keep track of ongoing work, plan formulas, make batches, and bottle stock.</p></div>
    <div className="workspace-hub-stats"><span><strong>{tasks.length}</strong> open tasks</span><span><strong>{bulk.length}</strong> bulk mixes</span></div>
  </div>
  <WorkspaceSwitcher label="Production sections" options={PRODUCTION_SECTIONS} value={section} onChange={onSectionChange}/>
  <div className="workspace-content">
   {section==='queue'&&<div className="content-stack">
     <div className="page-heading"><div><h2>Current work</h2><p>Pick up where you left off, or start something new.</p></div>
       <Button onClick={()=>onSectionChange('batch')}><PackagePlus size={16}/> Make a batch</Button></div>
     <ProductionTasks/>
     <div className="two-columns">
       <Card title="Unpackaged bulk stock" action={<Badge>{bulk.length} mixtures</Badge>}>
         {bulk.length?bulk.slice(0,10).map(([id,qty])=>{
           const recipe=db.recipes.find(r=>r.id===id);
           return <RowItem key={id} title={recipe?.name||'Unlinked bulk'}
             detail="Recorded mixture · check linked products in Bottling"
             end={`${formatAmount(qty)} ${recipe?unitLabel(RECIPE_UNIT[recipe.kind]):'oz'}`}/>;
         }):<EmptyState title="Nothing ready to bottle" description="Recorded batches appear here once they create bulk stock."/>}
         <div className="card-footer"><Button variant="secondary" onClick={()=>onSectionChange('bottle')}>
           <PackageCheck size={16}/> Open bottling <ArrowRight size={15}/></Button></div>
       </Card>
       <Card title="Recently completed batches">
         {db.batches.length?db.batches.slice(0,5).map(b=><RowItem key={b.id} title={b.recipeName}
           detail={new Date(b.date).toLocaleDateString()} end={`${formatAmount(b.amountOz)} ${unitLabel(b.unit)}`}/>):
           <EmptyState title="No completed batches yet" description="Production history appears when you record a finished measured batch."/>}
         <div className="card-footer"><Button variant="ghost" onClick={()=>onSectionChange('batch')}>
           View batch records <ArrowRight size={15}/></Button></div>
       </Card>
     </div>
   </div>}
   {section==='formulas'&&<RecipesPage onMakeBatch={onMakeBatch} onOpenRestock={onOpenRestock}/>}
   {section==='batch'&&<BatchesPage key={selectedRecipe||'new'} selectedRecipe={selectedRecipe}
     showTasks={false} onOpenRestock={onOpenRestock}/>}
   {section==='bottle'&&<MakeProductPage key={selectedProductId||'new'} selectedProductId={selectedProductId} onEditProduct={onEditProduct} onPackaging={onPackaging}/>}
  </div>
 </div>;
}
