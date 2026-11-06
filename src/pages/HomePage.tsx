import {ArrowRight,BookOpen,Boxes,CalendarClock,ClipboardCheck,FlaskConical,Package,PackageCheck,ShoppingBasket,ShoppingCart} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Metric,RowItem} from '../components/UI';
import {restockQueue,stockCountQueue,productionQueue,localDate,productionStepLabels} from '../domain/workflow';
import {FORM_LABEL,formatAmount,unitLabel,type PageId,type RestockTab} from '../types';
import {restockReviewQueue,pendingRestockFollowups} from '../domain/restockPlans';
import {getProductionSummary} from '../domain/productionInsights';
import {useAccount} from '../state/AccountContext';
import {useApp} from '../state/AppContext';

export function HomePage({onNavigate,onOpenHerb,onOpenRestock}:{
 onNavigate:(p:PageId)=>void;onOpenHerb:(id:string)=>void;onOpenRestock:(tab:RestockTab)=>void;
}){
 const {db}=useApp();const {active}=useAccount();
 if(active?.kind==='general')return <GeneralHome onNavigate={onNavigate}/>;
 const unverified=stockCountQueue(db),needsRestock=restockQueue(db),tasks=productionQueue(db);
 const productCounts=db.products.filter(p=>!p.countCheckedAt);
 const bulk=Object.entries(db.bulk).filter(([,qty])=>qty>0);
 const today=localDate();
 const due=tasks.filter(t=>t.step==='ready'||(t.dueOn&&t.dueOn<=today));
 const dueReviews=restockReviewQueue(db,today).filter(x=>x.due);
 const pendingFollowups=pendingRestockFollowups(db);
 const finishedThisMonth=getProductionSummary(db,'finished','month',today);
 const tincturesThisMonth=getProductionSummary(db,'tincture','month',today);
 const madeNow=finishedThisMonth.bars[finishedThisMonth.bars.length-1].value;
 const mixedNow=tincturesThisMonth.bars[tincturesThisMonth.bars.length-1].value;
 const containerCounts=db.packagingSupplies.filter(c=>!c.countCheckedAt);
 const lowContainers=db.packagingSupplies.filter(c=>c.countCheckedAt&&c.threshold>0&&c.count<=c.threshold);
 const totalCounts=unverified.length+productCounts.length+containerCounts.length;
 const urgent=needsRestock.length+due.length+lowContainers.length+dueReviews.length+pendingFollowups.length;
 return <div className="today-page">
   <section className="today-hero">
     <div className="today-hero-copy"><span className="eyebrow">YOUR WORKBENCH</span>
       <h2>Pick up where you left off.</h2>
       <p>What's ready, what needs attention, and where to go next.</p>
     </div>
     <div className="today-hero-actions">
       <Button onClick={()=>onOpenRestock('verify')}><ClipboardCheck size={17}/> Check inventory</Button>
       <Button variant="secondary" onClick={()=>onNavigate('work')}><FlaskConical size={17}/> Open production</Button>
     </div>
   </section>
   <div className="today-stats">
     <button className="today-stat" onClick={()=>onOpenRestock('verify')}>
       <span><ClipboardCheck size={20}/><strong>{totalCounts}</strong></span>
       <span>Counts to verify</span><small>Herbs, containers and products</small>
     </button>
     <button className="today-stat" onClick={()=>onOpenRestock('reorder')}>
       <span><ShoppingCart size={20}/><strong>{needsRestock.length}</strong></span>
       <span>Need restocking</span><small>Confirmed shortages</small>
     </button>
     <button className="today-stat" onClick={()=>onNavigate('work')}>
       <span><FlaskConical size={20}/><strong>{tasks.length}</strong></span>
       <span>Active production</span><small>Work in progress</small>
     </button>
     <button className="today-stat" onClick={()=>onNavigate('bottling')}>
       <span><PackageCheck size={20}/><strong>{bulk.length}</strong></span>
       <span>Unpackaged bulk</span><small>Recorded mixtures</small>
     </button>
   </div>
   <div className="today-main-grid">
     <Card className="today-action-card" title="Needs your attention"
       action={<Badge tone={urgent?'warning':'neutral'}>{urgent} to review</Badge>}>
       {due.slice(0,3).map(t=><RowItem key={t.id} title={t.name}
         detail={t.dueOn&&t.dueOn<=today?`Production target ${t.dueOn}`:productionStepLabels[t.step]}
         end={<Badge tone="warning">Production</Badge>} onClick={()=>onNavigate('work')}/>)}
       {dueReviews.slice(0,3).map(({plan,herb})=><RowItem key={plan.id}
         title={herb?.name||'Herb'} detail={'Scheduled restock review · '+plan.nextReviewOn}
         end={<Badge tone="warning">Review</Badge>} onClick={()=>onOpenRestock('schedule')}/>)}
       {needsRestock.slice(0,3).map(x=><RowItem key={x.herb.id+x.form} title={x.herb.name}
         detail={`${FORM_LABEL[x.form]} · ${x.reason}`}
         end={<Badge tone="warning">Restock</Badge>} onClick={()=>onOpenHerb(x.herb.id)}/>)}
       {unverified.slice(0,3).map(x=><RowItem key={x.herb.id+x.form} title={x.herb.name}
         detail={`${FORM_LABEL[x.form]} · physical count needed`}
         end={<Badge>Count</Badge>} onClick={()=>onOpenRestock('verify')}/>)}
       {lowContainers.slice(0,2).map(c=><RowItem key={c.id} title={c.category+' · '+c.variant}
         detail="Packaging supply at or below reorder threshold" end={<Badge tone="warning">Container</Badge>}
         onClick={()=>onNavigate('containers')}/>)}
       {containerCounts.length>0&&<RowItem title="Packaging supplies"
         detail={containerCounts.length+' container types still need a physical count'}
         end={<Badge>Count</Badge>} onClick={()=>onNavigate('containers')}/>}
       {productCounts.slice(0,2).map(p=><RowItem key={p.id} title={p.name}
         detail="Finished product · not counted" end={<Badge>Count</Badge>}
         onClick={()=>onNavigate('products')}/>)}
       {totalCounts===0&&urgent===0&&<EmptyState title="No items flagged"
         description="The app will surface verified shortages, unfinished tasks and stock checks here."/>}
       <div className="card-footer"><Button variant="ghost" onClick={()=>onNavigate('inventory')}>
         Open Inventory <ArrowRight size={16}/></Button>
         <Button variant="ghost" onClick={()=>onOpenRestock('schedule')}>
           <CalendarClock size={16}/> Review schedules{dueReviews.length+pendingFollowups.length>0?' ('+(dueReviews.length+pendingFollowups.length)+' active)':''}
         </Button></div>
     </Card>
     <div className="today-side-stack">
       <Card title="Production in progress" action={<Badge>{tasks.length} open</Badge>}>
         {tasks.length?tasks.slice(0,4).map(t=><RowItem key={t.id} title={t.name}
           detail={t.dueOn?`${productionStepLabels[t.step]} · ${t.dueOn}`:productionStepLabels[t.step]}
           end={<ArrowRight size={15}/>} onClick={()=>onNavigate('work')}/>):
           <EmptyState title="Nothing being tracked" description="Start a production task when you begin preparing something."/>}
         <div className="today-production-pace"><strong>Recorded this month</strong>
           <span>{formatAmount(mixedNow)} fl oz tincture batches · {formatAmount(madeNow)} finished units</span>
         </div>
         <div className="card-footer"><Button variant="secondary" onClick={()=>onNavigate('work')}>
           View production <ArrowRight size={15}/></Button>
           <Button variant="ghost" onClick={()=>onNavigate('history')}>View history <ArrowRight size={15}/></Button></div>
       </Card>
       <Card title="Unpackaged bulk">
         {bulk.length?bulk.slice(0,4).map(([id,amount])=>{
           const recipe=db.recipes.find(r=>r.id===id);
           return <RowItem key={id} title={recipe?.name||'Unlinked mixture'}
             detail="Recorded mixture" end={`${formatAmount(amount)} ${recipe?unitLabel(recipe.kind==='tincture'?'fl_oz':'oz_wt'):'oz'}`}
             onClick={()=>onNavigate('bottling')}/>;
         }):<EmptyState title="No bulk waiting" description="Completed batches will appear here."/>}
         <div className="card-footer"><Button variant="ghost" onClick={()=>onNavigate('bottling')}>
           Open bottling <ArrowRight size={15}/></Button></div>
       </Card>
     </div>
   </div>
   <div className="today-quick-title"><h3>Common tasks</h3><p>One tap to the right work area.</p></div>
   <div className="today-quick-grid">
     <button onClick={()=>onOpenRestock('reorder')}><ShoppingCart size={20}/><span><strong>Restock supplies</strong><small>Supplier list & receipts</small></span><ArrowRight size={16}/></button>
     <button onClick={()=>onNavigate('containers')}><Boxes size={20}/><span><strong>Packaging supplies</strong><small>Bottles, tins and bags</small></span><ArrowRight size={16}/></button>
     <button onClick={()=>onNavigate('recipes')}><BookOpen size={20}/><span><strong>Open recipes</strong><small>Formulas & quantities</small></span><ArrowRight size={16}/></button>
     <button onClick={()=>onNavigate('bottling')}><Package size={20}/><span><strong>Make product</strong><small>Mix or bottle stock</small></span><ArrowRight size={16}/></button>
   </div>
   {db.movements.length>0&&<Card title="Recent changes" action={<ShoppingBasket size={18} className="muted-icon"/>}>
     {db.movements.slice(0,4).map(m=><RowItem key={m.id} title={m.reason} detail={new Date(m.at).toLocaleDateString()}
       end={`${m.delta>0?'+':''}${formatAmount(m.delta)} ${unitLabel(m.unit)}`}/>)}
   </Card>}
 </div>;
}

function GeneralHome({onNavigate}:{onNavigate:(p:PageId)=>void}){
 const {db}=useApp();const low=db.items.filter(i=>i.threshold>0&&i.quantity<=i.threshold);
 return <div className="content-stack"><div className="intro"><div><span className="eyebrow">WORKSPACE SNAPSHOT</span><h2>Your inventory, at a glance.</h2><p>Organize items, check quantities, and find what needs restocking.</p></div></div>
 <div className="metrics-grid compact"><Metric label="Catalog items" value={db.items.length}/><Metric label="Low stock" value={low.length}/><Metric label="Recorded changes" value={db.movements.filter(m=>m.kind==='generic').length}/></div>
 <div className="quick-grid"><button onClick={()=>onNavigate('items')}><Boxes size={20}/><strong>Manage items</strong><ArrowRight size={17}/></button><button onClick={()=>onNavigate('settings')}><Package size={20}/><strong>Backups & settings</strong><ArrowRight size={17}/></button></div>
 <Card title="Needs attention" action={<Badge tone={low.length?'warning':'success'}>{low.length} alerts</Badge>}>{low.length?low.map(i=><RowItem key={i.id} title={i.name} detail={`Reorder at ${formatAmount(i.threshold)} ${unitLabel(i.unit)}`} end={`${formatAmount(i.quantity)} ${unitLabel(i.unit)}`} onClick={()=>onNavigate('items')}/>):<EmptyState title="No reorder alerts" description="Set thresholds on your items to see shortages here."/>}</Card></div>;
}
