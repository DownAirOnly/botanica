import {ArrowRight,AlertTriangle,Boxes,FlaskConical,Leaf,Package,Plus,ShoppingBasket} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Metric,RowItem} from '../components/UI';
import {lowStockItems} from '../domain/inventory';
import {FORM_LABEL,FORM_UNIT,formatAmount,unitLabel,type PageId} from '../types';
import {useAccount} from '../state/AccountContext';
import {useApp} from '../state/AppContext';
export function HomePage({onNavigate,onOpenHerb}:{onNavigate:(p:PageId)=>void;onOpenHerb:(id:string)=>void}){
 const {db}=useApp();const {active}=useAccount();
 if(active?.kind==='general')return <GeneralHome onNavigate={onNavigate}/>;
 const low=lowStockItems(db);const bulkEntries=Object.entries(db.bulk).filter(([,q])=>q>0);
 return <div className="content-stack">
  <div className="intro"><div><span className="eyebrow">WORKSPACE SNAPSHOT</span><h2>Your herbal inventory, at a glance.</h2><p>Spot shortages, receive supplies, and make the next batch without opening multiple spreadsheets.</p></div></div>
  <div className="metrics-grid"><Metric label="Herbs" value={db.herbs.length} meta="Catalog entries"/><Metric label="Low-stock alerts" value={low.length} meta="At or below set threshold"/><Metric label="Recipes" value={db.recipes.length} meta="Reusable formulas"/><Metric label="Finished units" value={db.products.reduce((a,p)=>a+p.count,0)} meta="Across package sizes"/></div>
  <div className="quick-grid">
    <button onClick={()=>onNavigate('herbs')}><Leaf size={20}/><strong>Browse herbs</strong><ArrowRight size={17}/></button>
    <button onClick={()=>onNavigate('batches')}><FlaskConical size={20}/><strong>Make a batch</strong><ArrowRight size={17}/></button>
    <button onClick={()=>onNavigate('products')}><Package size={20}/><strong>Package stock</strong><ArrowRight size={17}/></button>
    <button onClick={()=>onNavigate('settings')}><Plus size={20}/><strong>Import inventory</strong><ArrowRight size={17}/></button>
  </div>
  <div className="two-columns">
   <Card title="Needs attention" action={<Badge tone={low.length?'warning':'success'}>{low.length} alerts</Badge>}>
    {!low.length?<EmptyState title="No reorder alerts" description="Set thresholds on herbs to receive low-stock alerts here."/>:low.slice(0,8).map(({herb,form,stock,threshold})=><RowItem key={herb.id+'-'+form} title={herb.name} detail={`${FORM_LABEL[form]} · Reorder at ${formatAmount(threshold)} ${unitLabel(FORM_UNIT[form])}`} end={<span className="text-warning">{formatAmount(stock)} <ArrowRight size={16}/></span>} onClick={()=>onOpenHerb(herb.id)}/>)}
    {low.length>8&&<div className="card-footer"><Button variant="ghost" onClick={()=>onNavigate('herbs')}>See all herbs <ArrowRight size={15}/></Button></div>}
   </Card>
   <Card title="Production & stock" action={<Boxes size={19} className="muted-icon"/>}>
    {bulkEntries.length?bulkEntries.map(([id,amount])=>{const r=db.recipes.find(x=>x.id===id);return <RowItem key={id} title={r?.name||'Unlinked bulk'} detail="Ready for packaging" end={<strong>{formatAmount(amount)} {r?unitLabel(r.kind==='tincture'?'fl_oz':'oz_wt'):'oz'}</strong>}/>;}):<EmptyState title="No unbottled mixtures" description="Finish a batch to add unbottled stock here."/>}
    <div className="card-footer"><Button variant="secondary" onClick={()=>onNavigate('batches')}><FlaskConical size={16}/> Open production</Button></div>
   </Card>
  </div>
  <div className="two-columns">
   <Card title="Recent stock changes" action={<ShoppingBasket size={18} className="muted-icon"/>}>
    {db.movements.length?db.movements.slice(0,5).map(m=><RowItem key={m.id} title={m.reason} detail={new Date(m.at).toLocaleDateString()} end={<span>{m.delta>0?'+':''}{formatAmount(m.delta)} {unitLabel(m.unit)}</span>}/>):<EmptyState title="No recorded movements" description="Purchases, adjustments, and batches appear here automatically."/>}
   </Card>
   <Card title="Build the habit" action={<AlertTriangle size={18} className="muted-icon"/>}>
    <div className="guidance"><p><strong>1. Check stock.</strong> Confirm real opening counts rather than trusting old spreadsheets.</p><p><strong>2. Set reorder points.</strong> Identify critical herbs before they run out.</p><p><strong>3. Receive purchases.</strong> Record vendor and actual price once and let stock update automatically.</p><p><strong>4. Use recipes.</strong> Scale a formula, verify quantities, then record a batch.</p></div>
   </Card>
  </div>
 </div>;
}

function GeneralHome({onNavigate}:{onNavigate:(p:PageId)=>void}){
 const {db}=useApp();const low=db.items.filter(i=>i.threshold>0&&i.quantity<=i.threshold);
 return <div className="content-stack"><div className="intro"><div><span className="eyebrow">WORKSPACE SNAPSHOT</span><h2>Your inventory, at a glance.</h2><p>Organize items, check quantities, and find what needs restocking.</p></div></div>
 <div className="metrics-grid compact"><Metric label="Catalog items" value={db.items.length}/><Metric label="Low stock" value={low.length}/><Metric label="Recorded changes" value={db.movements.filter(m=>m.kind==='generic').length}/></div>
 <div className="quick-grid"><button onClick={()=>onNavigate('items')}><Boxes size={20}/><strong>Manage items</strong><ArrowRight size={17}/></button><button onClick={()=>onNavigate('settings')}><Plus size={20}/><strong>Backups & settings</strong><ArrowRight size={17}/></button></div>
 <Card title="Needs attention" action={<Badge tone={low.length?'warning':'success'}>{low.length} alerts</Badge>}>{low.length?low.map(i=><RowItem key={i.id} title={i.name} detail={`Reorder at ${formatAmount(i.threshold)} ${unitLabel(i.unit)}`} end={`${formatAmount(i.quantity)} ${unitLabel(i.unit)}`} onClick={()=>onNavigate('items')}/>):<EmptyState title="No reorder alerts" description="Set thresholds on your items to see shortages here."/>}</Card></div>
}
