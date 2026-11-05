import {
  FORM_UNIT,RECIPE_UNIT,makeId,type BotanicaDB,type PackagingSupply,
  type PackagingReceipt,type ProductionRun,type MakeProductSource,type BatchIngredient,
  type StockMovement,type HerbRestockNote
} from '../types';
import {calculateBatch,StockError} from './inventory';
import {packagingName} from '../data/packaging';

const whole=(n:number)=>Number.isSafeInteger(n)&&n>0;
const when=()=>new Date().toISOString();
const change=(db:BotanicaDB)=>({...db,updatedAt:when()});
const movement=(kind:StockMovement['kind'],itemId:string,before:number,after:number,
  reason:string,sourceId:string,unit:StockMovement['unit']='units',form?:StockMovement['form'],
  action:StockMovement['action']='packaging'):StockMovement=>({
    id:makeId(),at:when(),action,kind,itemId,before,after,delta:after-before,
    unit,reason,form,sourceId
  });
export function adjustPackagingSupply(db:BotanicaDB,id:string,mode:'set'|'add'|'use',
  quantity:number,reason:string):BotanicaDB{
  const item=db.packagingSupplies.find(p=>p.id===id);
  if(!item)throw new StockError('Packaging supply not found.');
  if(!Number.isSafeInteger(quantity)||quantity<0||(mode!=='set'&&quantity===0))
    throw new StockError('Enter a nonnegative whole count.');
  if(!reason.trim())throw new StockError('Enter a reason.');
  const count=mode==='set'?quantity:mode==='add'?item.count+quantity:item.count-quantity;
  if(count<0)throw new StockError('Not enough containers available.');
  const verified=mode==='set'?when():item.countCheckedAt;
  return change({...db,packagingSupplies:db.packagingSupplies.map(p=>p.id===id?
    {...p,count,countCheckedAt:verified}:p),movements:[
      movement('container',id,item.count,count,reason,makeId(),'units',undefined,'adjustment'),...db.movements
    ]});
}
export function savePackagingSupply(db:BotanicaDB,entry:PackagingSupply):BotanicaDB{
  if(!db.packagingSupplies.some(x=>x.id===entry.id))throw new StockError('Packaging type not found.');
  if(!Number.isSafeInteger(entry.threshold)||entry.threshold<0)throw new StockError('Enter a valid reorder threshold.');
  return change({...db,packagingSupplies:db.packagingSupplies.map(x=>x.id===entry.id?
    {...x,threshold:entry.threshold,notes:entry.notes,vendor:entry.vendor}:x)});
}
export function receivePackagingSupply(db:BotanicaDB,input:Omit<PackagingReceipt,'id'>):BotanicaDB{
  const p=db.packagingSupplies.find(x=>x.id===input.supplyId);
  if(!p)throw new StockError('Packaging type not found.');
  if(!whole(input.quantity)||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    throw new StockError('Enter a valid received quantity and date.');
  const receipt:PackagingReceipt={...input,id:makeId()};
  const after=p.count+input.quantity;
  return change({...db,
    packagingSupplies:db.packagingSupplies.map(x=>x.id===p.id?{...x,count:after}:x),
    packagingReceipts:[receipt,...db.packagingReceipts],
    movements:[movement('container',p.id,p.count,after,
      `Received ${packagingName(p)}${input.vendor?' from '+input.vendor:''}`,
      receipt.id,'units',undefined,'purchase'),...db.movements]
  });
}
export interface MakePreview {
 productId:string;productName:string;count:number;source:MakeProductSource;recipeId:string;
 containerSupplyId:string;containerName:string;amountOz:number;availableBulkOz:number;
 containerRequired:number;containerAvailable:number;containerVerified:boolean;
 ingredients:(BatchIngredient&{name:string;available:number;verified:boolean;enough:boolean})[];
 issues:string[];ready:boolean;
}
/** Preflight is read-only. All supply/stock checks repeat at commit time. */
export function previewMakeProduct(db:BotanicaDB,productId:string,count:number,source:MakeProductSource):MakePreview{
  if(!whole(count))throw new StockError('Enter a positive whole number of finished units.');
  const p=db.products.find(x=>x.id===productId);
  if(!p)throw new StockError('Choose an existing finished product.');
  if(!p.recipeId)throw new StockError('Link a saved formula to this product in Inventory first.');
  const recipe=db.recipes.find(x=>x.id===p.recipeId);
  if(!recipe)throw new StockError('Linked formula was not found.');
  if((p.kind==='tea'&&recipe.kind!=='tea')||(p.kind!=='tea'&&recipe.kind!=='tincture')||
     !['tea','tincture','spray'].includes(p.kind))
    throw new StockError('This product and formula are not a supported matching tea or tincture combination.');
  if(!Number.isFinite(p.packageOz)||p.packageOz<=0)
    throw new StockError('Product size must be a positive number.');
  if(!p.containerSupplyId)throw new StockError('Assign a container type to this product in Inventory → Finished goods.');
  const container=db.packagingSupplies.find(x=>x.id===p.containerSupplyId);
  if(!container)throw new StockError('The assigned container type was not found.');
  const amountOz=p.packageOz*count;
  if(!Number.isFinite(amountOz)||amountOz<=0)throw new StockError('Invalid total product amount.');
  const requirements=source==='ingredients'?calculateBatch(db,recipe,amountOz):[];
  const ingredients=requirements.map(i=>{
    const h=db.herbs.find(x=>x.id===i.herbId);
    return {herbId:i.herbId,form:i.form,amountOz:i.amountOz,name:h?.name||'Unknown ingredient',
      available:i.available,verified:i.verified,enough:i.enough};
  });
  const availableBulkOz=db.bulk[recipe.id]||0;
  const issues:string[]=[];
  if(!container.countCheckedAt)issues.push(`Verify the physical count of ${packagingName(container)}.`);
  if(container.count<count)issues.push(`Need ${count} ${packagingName(container)}; recorded: ${container.count}.`);
  if(source==='bulk'&&availableBulkOz+1e-9<amountOz)issues.push(
    `Need ${amountOz.toFixed(3)} ${RECIPE_UNIT[recipe.kind]} bulk; recorded: ${availableBulkOz.toFixed(3)}.`);
  for(const i of ingredients){
    if(!i.verified)issues.push(`Verify the physical count of ${i.name} (${i.form}).`);
    else if(!i.enough)issues.push(`Not enough ${i.name} (${i.form}): need ${i.amountOz.toFixed(3)}; counted ${i.available.toFixed(3)}.`);
  }
  return {productId:p.id,productName:p.name,count,source,recipeId:recipe.id,containerSupplyId:container.id,
    containerName:packagingName(container),amountOz,availableBulkOz,containerRequired:count,
    containerAvailable:container.count,containerVerified:Boolean(container.countCheckedAt),
    ingredients,issues,ready:issues.length===0};
}
export function makeFinishedProduct(db:BotanicaDB,productId:string,count:number,
  source:MakeProductSource):BotanicaDB{
  const preview=previewMakeProduct(db,productId,count,source);
  if(!preview.ready)throw new StockError(preview.issues.join(' '));
  const p=db.products.find(x=>x.id===productId)!;
  const r=db.recipes.find(x=>x.id===preview.recipeId)!;
  const container=db.packagingSupplies.find(x=>x.id===preview.containerSupplyId)!;
  const runId=makeId(),date=when();
  const moves:StockMovement[]=[];
  if(source==='bulk'){
    const before=db.bulk[r.id]||0,after=Math.max(0,before-preview.amountOz);
    moves.push(movement('bulk',r.id,before,after,`Bottled ${count} × ${p.name}`,
      runId,RECIPE_UNIT[r.kind]));
  }else{
    for(const i of preview.ingredients){
      const h=db.herbs.find(h=>h.id===i.herbId)!;
      moves.push(movement('ingredient',h.id,h.stock[i.form],
        Math.max(0,h.stock[i.form]-i.amountOz),`Mixed ${count} × ${p.name}`,
        runId,FORM_UNIT[i.form],i.form));
    }
  }
  moves.push(movement('container',container.id,container.count,container.count-count,
    `Used for ${count} × ${p.name}`,runId));
  moves.push(movement('product',p.id,p.count,p.count+count,
    `Made ${count} × ${p.name}`,runId));
  const run:ProductionRun={id:runId,at:date,productId:p.id,productName:p.name,
    recipeId:r.id,count,packageOz:p.packageOz,source,containerSupplyId:container.id,
    containerName:packagingName(container),bulkUsedOz:source==='bulk'?preview.amountOz:0,
    ingredients:preview.ingredients.map(i=>({herbId:i.herbId,form:i.form,amountOz:i.amountOz}))};
  return change({...db,
    herbs:source==='ingredients'?db.herbs.map(h=>{
      const entries=preview.ingredients.filter(i=>i.herbId===h.id);
      if(!entries.length)return h;
      const stock={...h.stock};
      for(const entry of entries)stock[entry.form]=Math.max(0,stock[entry.form]-entry.amountOz);
      return {...h,stock};
    }):db.herbs,
    bulk:source==='bulk'?{...db.bulk,[r.id]:Math.max(0,(db.bulk[r.id]||0)-preview.amountOz)}:db.bulk,
    packagingSupplies:db.packagingSupplies.map(x=>x.id===container.id?{...x,count:x.count-count}:x),
    products:db.products.map(x=>x.id===p.id?{...x,count:x.count+count}:x),
    movements:[...moves,...db.movements],productionRuns:[run,...db.productionRuns]
  });
}
export function recordHistoricalHerbRestock(db:BotanicaDB,note:Omit<HerbRestockNote,'id'>):BotanicaDB{
  if(!db.herbs.some(h=>h.id===note.herbId)||!['dry','powder'].includes(note.form)||
     !/^\d{4}-\d{2}-\d{2}$/.test(note.date)||
     (note.vendorId&&!db.vendors.some(v=>v.id===note.vendorId)))
    throw new StockError('Choose an herb, a valid date, and a known supplier.');
  return change({...db,herbRestockNotes:[{...note,id:makeId()},...db.herbRestockNotes]});
}
export function confirmCurrentHerbSource(db:BotanicaDB,herbId:string,
  form:'dry'|'powder',vendorId:string,notes=''):BotanicaDB{
  const herb=db.herbs.find(h=>h.id===herbId);
  if(!herb)throw new StockError('Herb not found.');
  if(vendorId&&!db.vendors.some(v=>v.id===vendorId))
    throw new StockError('Choose a known supplier.');
  return change({...db,herbs:db.herbs.map(h=>h.id===herbId?{
    ...h,currentStockSource:{...h.currentStockSource,
      [form]:vendorId?{vendorId,notedAt:when(),notes:notes.trim()||undefined}:undefined}
  }:h)});
}
