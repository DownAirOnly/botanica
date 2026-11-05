import {ArrowRight,Boxes,ClipboardCheck,FlaskConical,Leaf,Package,PackagePlus,ShoppingCart,ShoppingBasket} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Metric,RowItem} from '../components/UI';
import {restockQueue,stockCountQueue,productionQueue,localDate,productionStepLabels} from '../domain/workflow';
import {latestPriceQuote,quoteVendor} from '../domain/pricing';
import {FORM_LABEL,FORM_UNIT,formatAmount,unitLabel,type PageId} from '../types';
import {useAccount} from '../state/AccountContext';
import {useApp} from '../state/AppContext';

export function HomePage({onNavigate,onOpenHerb,onOpenRestock}:{onNavigate:(p:PageId)=>void;onOpenHerb:(id:string)=>void;onOpenRestock:(tab:'verify'|'reorder')=>void}){
 const {db}=useApp();const {active}=useAccount();
 if(active?.kind==='general')return <GeneralHome onNavigate={onNavigate}/>;
 const counts=stockCountQueue(db),restock=restockQueue(db),tasks=productionQueue(db);
 const uncountedProducts=db.products.filter(p=>!p.countCheckedAt);
 const bulk=Object.entries(db.bulk).filter(([,amount])=>amount>0);
 const today=localDate();
 const readyTasks=tasks.filter(t=>t.step==='ready'||(t.dueOn&&t.dueOn<=today));
 const firstActions=readyTasks.length+restock.length+counts.length+uncountedProducts.length;
 return <div className="content-stack">
   <div className="intro"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>What needs doing?</h2>
     <p>Start with stock that needs a count, supplies to replenish, and work already underway. Catalog totals and history remain available in their sections.</p></div></div>
   <div className="metrics-grid">
     <Metric label="Physical counts to verify" value={counts.length+uncountedProducts.length} meta={`${counts.length} ingredient forms · ${uncountedProducts.length} product SKUs`}/>
     <Metric label="Replenish" value={restock.length} meta="Confirmed low or empty items"/>
     <Metric label="Production underway" value={tasks.length} meta="Open tasks"/>
     <Metric label="Bulk ready to package" value={bulk.length} meta="Recorded bulk mixtures"/>
   </div>
   <div className="quick-grid">
     <button onClick={()=>onOpenRestock('verify')}><ClipboardCheck size={20}/><strong>Check stock</strong><ArrowRight size={17}/></button>
     <button onClick={()=>onOpenRestock('reorder')}><ShoppingCart size={20}/><strong>Restock supplies</strong><ArrowRight size={17}/></button>
     <button onClick={()=>onNavigate('batches')}><FlaskConical size={20}/><strong>Track production</strong><ArrowRight size={17}/></button>
     <button onClick={()=>onNavigate('products')}><PackagePlus size={20}/><strong>Package products</strong><ArrowRight size={17}/></button>
   </div>
   <div className="two-columns">
     <Card title="Needs attention" action={<Badge tone={firstActions?'warning':'success'}>{firstActions} to review</Badge>}>
       {readyTasks.slice(0,3).map(t=><RowItem key={t.id}
         title={t.name} detail={t.dueOn&&t.dueOn<=today?`Production target: ${t.dueOn}`:'Production ready for next step'}
         end={<Badge tone="warning">Production</Badge>} onClick={()=>onNavigate('batches')}/>)}
       {restock.slice(0,4).map(({herb,form,reason})=><RowItem key={herb.id+form}
         title={herb.name} detail={`${FORM_LABEL[form]} · ${reason}`}
         end={<Badge tone="warning">Replenish</Badge>} onClick={()=>onOpenHerb(herb.id)}/>)}
       {counts.slice(0,4).map(({herb,form})=><RowItem key={herb.id+form}
         title={herb.name} detail={`${FORM_LABEL[form]} · no verified physical count`}
         end={<Badge>Count</Badge>} onClick={()=>onOpenRestock('verify')}/>)}
       {uncountedProducts.slice(0,2).map(p=><RowItem key={p.id} title={p.name} detail="Finished product · physical count not verified" end={<Badge>Count</Badge>} onClick={()=>onNavigate('products')}/>)}
       {!firstActions&&<EmptyState title="No flagged actions" description="Counts and thresholds determine restocking alerts. Add production tasks to track ongoing work."/>}
       {firstActions>0&&<div className="card-footer">
         <Button variant="secondary" onClick={()=>onOpenRestock('verify')}>Verify ingredients <ArrowRight size={15}/></Button>
         {uncountedProducts.length>0&&<Button variant="ghost" onClick={()=>onNavigate('products')}>Verify finished goods <ArrowRight size={15}/></Button>}
       </div>}
     </Card>
     <Card title="Production in progress" action={<Badge>{tasks.length} active</Badge>}>
       {tasks.length?tasks.slice(0,5).map(t=><RowItem key={t.id} title={t.name}
         detail={t.dueOn?`${productionStepLabels[t.step]} · Target ${t.dueOn}`:productionStepLabels[t.step]}
         end={<ArrowRight size={16}/>} onClick={()=>onNavigate('batches')}/>):
         <EmptyState title="Nothing being tracked" description="Track a tincture being prepared, a mix that's waiting, or work that's ready to bottle."/>}
       {bulk.length>0&&<div className="home-section-divider"><strong>Recorded bulk ready for packaging</strong>
         {bulk.slice(0,4).map(([id,amount])=>{
           const r=db.recipes.find(x=>x.id===id);
           return <RowItem key={id} title={r?.name||'Unlinked bulk'} detail="Unpackaged mixture"
             end={`${formatAmount(amount)} ${r?unitLabel(r.kind==='tincture'?'fl_oz':'oz_wt'):'oz'}`}
             onClick={()=>onNavigate('products')}/>;
         })}
       </div>}
       <div className="card-footer"><Button variant="secondary" onClick={()=>onNavigate('batches')}>
         <FlaskConical size={16}/> View production</Button></div>
     </Card>
   </div>
   <div className="two-columns">
     <Card title="Shopping & restocking" action={<ShoppingBasket size={18} className="muted-icon"/>}>
       {restock.length?restock.slice(0,6).map(({herb,form,value,threshold})=>{
         const quote=form==='extract'?undefined:latestPriceQuote(db,herb.id,form);
         return <RowItem key={herb.id+form} title={herb.name}
           detail={`${FORM_LABEL[form]} · ${formatAmount(value)} ${unitLabel(FORM_UNIT[form])} counted${threshold>0?' · alert at '+formatAmount(threshold):''}`}
           end={quote?<span>{quoteVendor(db,quote)} · $${quote.pricePerLb.toFixed(2)}/lb</span>:'Quote unavailable'}
           onClick={()=>onOpenRestock('reorder')}/>;
       }):<EmptyState title="No confirmed restocking needs" description={counts.length?'Some ingredient quantities still need physical verification.':'Configure reorder thresholds on frequently used herbs.'}/>}
       <div className="card-footer"><Button variant="ghost" onClick={()=>onOpenRestock('reorder')}>Review restock list <ArrowRight size={15}/></Button></div>
     </Card>
     <Card title="Recent inventory activity" action={<Leaf size={18} className="muted-icon"/>}>
       {db.movements.length?db.movements.slice(0,6).map(m=><RowItem key={m.id} title={m.reason}
         detail={new Date(m.at).toLocaleDateString()} end={`${m.delta>0?'+':''}${formatAmount(m.delta)} ${unitLabel(m.unit)}`}/>):
         <EmptyState title="No activity recorded" description="Physical counts, purchases, production, and packaging create a stock history."/>}
       <div className="card-footer"><Button variant="ghost" onClick={()=>onNavigate('herbs')}><Leaf size={16}/> Browse ingredient catalog</Button></div>
     </Card>
   </div>
 </div>;
}
function GeneralHome({onNavigate}:{onNavigate:(p:PageId)=>void}){
 const {db}=useApp();const low=db.items.filter(i=>i.threshold>0&&i.quantity<=i.threshold);
 return <div className="content-stack"><div className="intro"><div><span className="eyebrow">WORKSPACE SNAPSHOT</span><h2>Your inventory, at a glance.</h2><p>Organize items, check quantities, and find what needs restocking.</p></div></div>
 <div className="metrics-grid compact"><Metric label="Catalog items" value={db.items.length}/><Metric label="Low stock" value={low.length}/><Metric label="Recorded changes" value={db.movements.filter(m=>m.kind==='generic').length}/></div>
 <div className="quick-grid"><button onClick={()=>onNavigate('items')}><Boxes size={20}/><strong>Manage items</strong><ArrowRight size={17}/></button><button onClick={()=>onNavigate('settings')}><Package size={20}/><strong>Backups & settings</strong><ArrowRight size={17}/></button></div>
 <Card title="Needs attention" action={<Badge tone={low.length?'warning':'success'}>{low.length} alerts</Badge>}>{low.length?low.map(i=><RowItem key={i.id} title={i.name} detail={`Reorder at ${formatAmount(i.threshold)} ${unitLabel(i.unit)}`} end={`${formatAmount(i.quantity)} ${unitLabel(i.unit)}`} onClick={()=>onNavigate('items')}/>):<EmptyState title="No reorder alerts" description="Set thresholds on your items to see shortages here."/>}</Card></div>;
}
