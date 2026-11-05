import {recordPriceQuote} from './pricing';
import { FORM_UNIT, RECIPE_UNIT, makeId, type BotanicaDB, type FormulaKind, type Herb, type Purchase, type Recipe, type StockForm, type StockMovement, type Product } from '../types';

export class StockError extends Error {}
const okQuantity = (n:number) => Number.isFinite(n) && n > 0;
const updated = (db:BotanicaDB):BotanicaDB => ({...db,updatedAt:new Date().toISOString()});
function herbById(db:BotanicaDB,id:string):Herb {const h=db.herbs.find(x=>x.id===id);if(!h)throw new StockError('Ingredient not found.');return h;}
function movement(action:StockMovement['action'],kind:StockMovement['kind'],itemId:string,before:number,after:number,unit:StockMovement['unit'],reason:string,form?:StockForm,sourceId?:string):StockMovement {
  return {id:makeId(),at:new Date().toISOString(),action,kind,itemId,form,delta:after-before,before,after,unit,reason,sourceId};
}
export function adjustStock(db:BotanicaDB,herbId:string,form:StockForm,mode:'add'|'use'|'set',amount:number,reason:string):BotanicaDB {
  if(!Number.isFinite(amount)||amount<0||((mode==='add'||mode==='use')&&amount===0))throw new StockError('Enter a valid positive amount.');
  if(!reason.trim())throw new StockError('A reason is required for inventory adjustments.');
  const h=herbById(db,herbId),before=h.stock[form];
  const after=mode==='set'?amount:mode==='add'?before+amount:before-amount;
  if(after<0)throw new StockError('Not enough stock. Use a verified count correction if the inventory is wrong.');
  const herbs=db.herbs.map(x=>x.id===herbId?{...x,stock:{...x.stock,[form]:after}}:x);
  return updated({...db,herbs,movements:[movement('adjustment','ingredient',herbId,before,after,FORM_UNIT[form],reason,form),...db.movements]});
}
export function saveHerb(db:BotanicaDB,h:Herb):BotanicaDB {
  if(!h.name.trim())throw new StockError('Ingredient name is required.');
  if(Object.values(h.stock).some(v=>v<0||!Number.isFinite(v)))throw new StockError('Invalid stock quantities.');
  if(Object.values(h.thresholds).some(v=>v<0||!Number.isFinite(v)))throw new StockError('Invalid thresholds.');
  const exists=db.herbs.some(x=>x.id===h.id);
  return updated({...db,herbs:exists?db.herbs.map(x=>x.id===h.id?{...h,stock:x.stock}:x):[...db.herbs,h]});
}
export function receivePurchase(db:BotanicaDB,p:Purchase):BotanicaDB {
  if(!okQuantity(p.quantityOz)||!Number.isFinite(p.pricePerLb)||p.pricePerLb<0||!Number.isFinite(p.shipping)||p.shipping<0)throw new StockError('Purchase quantity and price must be valid.');
  if(!db.vendors.some(v=>v.id===p.vendorId))throw new StockError('Select a valid vendor.');
  const h=herbById(db,p.herbId),before=h.stock[p.form],after=before+p.quantityOz;
  const vendorName=db.vendors.find(v=>v.id===p.vendorId)!.name;
  const received=updated({...db,purchases:[p,...db.purchases],
    herbs:db.herbs.map(x=>x.id===h.id?{...x,stock:{...x.stock,[p.form]:after}}:x),
    movements:[movement('purchase','ingredient',h.id,before,after,FORM_UNIT[p.form],
      `Received from ${vendorName}`,p.form,p.id),...db.movements]});
  // A received purchase is a real paid unit price, recorded distinctly from supplier quotes.
  // Purchasing powder must never overwrite the dried-herb price.
  return p.pricePerLb>0?recordPriceQuote(received,{herbId:h.id,form:p.form,
    vendorName,pricePerLb:p.pricePerLb,quotedOn:p.date,source:'purchase',notes:'Purchase receipt'}):received;
}
export function saveRecipe(db:BotanicaDB,r:Recipe):BotanicaDB {
  if(!r.name.trim()||!r.ingredients.length)throw new StockError('Recipe needs a name and at least one ingredient.');
  for(const i of r.ingredients){if(!db.herbs.some(h=>h.id===i.herbId)||!okQuantity(i.parts))throw new StockError('Every ingredient requires a valid amount and linked herb.');if(RECIPE_UNIT[r.kind]!==FORM_UNIT[i.form])throw new StockError('For this recipe type, ingredients must have compatible weight/volume units.');}
  if(new Set(r.ingredients.map(i=>i.herbId+'-'+i.form)).size!==r.ingredients.length)throw new StockError('Combine duplicate recipe ingredients first.');
  return updated({...db,recipes:db.recipes.some(x=>x.id===r.id)?db.recipes.map(x=>x.id===r.id?r:x):[...db.recipes,r]});
}
export function calculateBatch(db:BotanicaDB,recipe:Recipe,totalOz:number){
  if(!okQuantity(totalOz))throw new StockError('Enter a positive batch amount.');
  const parts=recipe.ingredients.reduce((a,i)=>a+i.parts,0);
  if(!parts||!Number.isFinite(parts))throw new StockError('This recipe has no valid ratios.');
  return recipe.ingredients.map(i=>{
    const available=herbById(db,i.herbId).stock[i.form];
    const need=totalOz*i.parts/parts;
    return {...i,amountOz:need,available,enough:available+1e-9>=need};
  });
}
export function completeBatch(db:BotanicaDB,recipeId:string,totalOz:number,notes=''):BotanicaDB {
  const recipe=db.recipes.find(r=>r.id===recipeId);if(!recipe)throw new StockError('Recipe not found.');
  const amounts=calculateBatch(db,recipe,totalOz);if(amounts.some(x=>!x.enough))throw new StockError('Insufficient ingredient stock.');
  const batchId=makeId(),date=new Date().toISOString();
  let herbs=db.herbs.map(h=>({...h,stock:{...h.stock}}));
  const movements:StockMovement[]=[];
  for(const item of amounts){
    const h=herbs.find(x=>x.id===item.herbId)!;
    const before=h.stock[item.form],after=Math.max(0,before-item.amountOz);
    h.stock[item.form]=after;
    movements.push(movement('batch','ingredient',h.id,before,after,FORM_UNIT[item.form],`Used in ${recipe.name}`,item.form,batchId));
  }
  const before=db.bulk[recipeId]||0,after=before+totalOz;
  movements.push(movement('batch','bulk',recipeId,before,after,RECIPE_UNIT[recipe.kind],`Produced ${recipe.name}`,undefined,batchId));
  return updated({...db,herbs,bulk:{...db.bulk,[recipeId]:after},batches:[{id:batchId,recipeId,recipeName:recipe.name,amountOz:totalOz,unit:RECIPE_UNIT[recipe.kind],ingredients:amounts.map(i=>({herbId:i.herbId,form:i.form,amountOz:i.amountOz})),date,notes},...db.batches],movements:[...movements,...db.movements]});
}
export function saveProduct(db:BotanicaDB,p:Product):BotanicaDB {
  if(!p.name.trim()||!okQuantity(p.packageOz)||p.count<0||!Number.isInteger(p.count))throw new StockError('Enter a product name, valid package size, and nonnegative whole count.');
  if(p.recipeId&&!db.recipes.some(r=>r.id===p.recipeId))throw new StockError('Linked recipe not found.');
  const existing=db.products.find(x=>x.id===p.id);
  const count=existing?.count ?? p.count;
  return updated({...db,products:existing?db.products.map(x=>x.id===p.id?{...p,count}:x):[...db.products,p]});
}
export function packageProduct(db:BotanicaDB,productId:string,count:number):BotanicaDB {
  const p=db.products.find(x=>x.id===productId);if(!p||!p.recipeId)throw new StockError('Product must be linked to a recipe for packaging.');
  if(!Number.isInteger(count)||count<=0)throw new StockError('Enter a positive whole number of packages.');
  const r=db.recipes.find(x=>x.id===p.recipeId);if(!r)throw new StockError('Recipe not found.');
  const before=db.bulk[r.id]||0,amount=p.packageOz*count;if(amount>before+1e-9)throw new StockError('Not enough bulk stock for this packaging run.');
  const after=Math.max(0,before-amount),runId=makeId();
  return updated({...db,bulk:{...db.bulk,[r.id]:after},products:db.products.map(x=>x.id===p.id?{...x,count:x.count+count}:x),movements:[movement('packaging','bulk',r.id,before,after,RECIPE_UNIT[r.kind],`Packed ${count} × ${p.name}`,undefined,runId),movement('packaging','product',p.id,p.count,p.count+count,'units',`Packaged ${p.name}`,undefined,runId),...db.movements]});
}
export function extractStock(db:BotanicaDB,herbId:string,form:'dry'|'powder',inputOz:number,outputFluidOz:number,notes:string):BotanicaDB {
  if(!okQuantity(inputOz)||!okQuantity(outputFluidOz)||!notes.trim())throw new StockError('Record positive ingredient input, measured liquid output, and processing notes.');
  const h=herbById(db,herbId);if(h.stock[form]<inputOz)throw new StockError('Not enough raw material.');
  const beforeRaw=h.stock[form],beforeExtract=h.stock.extract,source=makeId();
  return updated({...db,herbs:db.herbs.map(x=>x.id!==herbId?x:{...x,stock:{...x.stock,[form]:beforeRaw-inputOz,extract:beforeExtract+outputFluidOz}}),movements:[movement('extraction','ingredient',herbId,beforeRaw,beforeRaw-inputOz,'oz_wt',notes,form,source),movement('extraction','ingredient',herbId,beforeExtract,beforeExtract+outputFluidOz,'fl_oz',notes,'extract',source),...db.movements]});
}
export function ensureVendor(db:BotanicaDB,name:string):{db:BotanicaDB;id:string}{
 const existing=db.vendors.find(v=>v.name.toLowerCase()===name.trim().toLowerCase());if(existing)return {db,id:existing.id};
 const id=makeId();return {db:updated({...db,vendors:[...db.vendors,{id,name:name.trim()}]}),id};
}
export const lowStockItems=(db:BotanicaDB)=>db.herbs.flatMap(h=>(['dry','powder','extract'] as StockForm[]).filter(f=>h.thresholds[f]>0&&h.stock[f]<=h.thresholds[f]).map(f=>({herb:h,form:f,stock:h.stock[f],threshold:h.thresholds[f]})));
export function totalCost(p:Purchase){return p.quantityOz/16*p.pricePerLb+p.shipping;}
export function recipeLabel(r:Recipe){return r.kind==='tincture'?'Tincture · fl oz':'Tea · oz wt';}
export function stockFormForKind(kind:FormulaKind):StockForm{return kind==='tincture'?'extract':'dry';}
export function adjustProductStock(db:BotanicaDB,productId:string,mode:'add'|'use'|'set',amount:number,reason:string):BotanicaDB {
 const p=db.products.find(x=>x.id===productId);if(!p)throw new StockError('Product not found.');
 if(!Number.isInteger(amount)||amount<0||((mode==='add'||mode==='use')&&amount===0))throw new StockError('Package quantity must be a whole number.');
 if(!reason.trim())throw new StockError('A reason is required.');
 const before=p.count,after=mode==='set'?amount:mode==='add'?before+amount:before-amount;
 if(after<0)throw new StockError('Not enough units available.');
 return updated({...db,products:db.products.map(x=>x.id===p.id?{...x,count:after}:x),movements:[movement('adjustment','product',p.id,before,after,'units',reason),...db.movements]});
}
export function adjustBulkStock(db:BotanicaDB,recipeId:string,mode:'add'|'use'|'set',amount:number,reason:string):BotanicaDB {
 const r=db.recipes.find(x=>x.id===recipeId);if(!r)throw new StockError('Linked recipe not found.');
 if(!Number.isFinite(amount)||amount<0||((mode==='add'||mode==='use')&&amount===0))throw new StockError('Enter a valid quantity.');
 if(!reason.trim())throw new StockError('A reason is required for bulk stock adjustments.');
 const before=db.bulk[recipeId]||0,after=mode==='set'?amount:mode==='add'?before+amount:before-amount;
 if(after<0)throw new StockError('Not enough bulk stock.');
 return updated({...db,bulk:{...db.bulk,[recipeId]:after},movements:[movement('adjustment','bulk',r.id,before,after,RECIPE_UNIT[r.kind],reason),...db.movements]});
}
