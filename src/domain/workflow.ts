import {makeId,type BotanicaDB,type Herb,type ProductionStep,type ProductionTask,type StockForm} from '../types';

export const productionStepLabels:Record<ProductionStep,string>={
  planned:'Planned',preparing:'Preparing',waiting:'Waiting',ready:'Ready for next step',done:'Finished'
};
export const productionStepOrder:ProductionStep[]=['planned','preparing','waiting','ready','done'];
export function localDate():string {
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function isCountVerified(herb:Herb,form:StockForm):boolean {
  return Boolean(herb.stockCheckedAt?.[form]);
}
/** Include only used, recorded, or configured forms; otherwise start with dried herb. */
export function relevantForms(db:BotanicaDB,herb:Herb):StockForm[]{
  const kinds=new Set<StockForm>();
  for(const f of ['dry','powder','extract'] as const)
    if(herb.stock[f]>0||herb.thresholds[f]>0)kinds.add(f);
  for(const r of db.recipes)
    if(r.active)for(const ingredient of r.ingredients)
      if(ingredient.herbId===herb.id)kinds.add(ingredient.form);
  if(kinds.size===0)kinds.add('dry');
  return [...kinds];
}
export function stockCountQueue(db:BotanicaDB) {
  const active=new Set(db.recipes.filter(r=>r.active).flatMap(r=>r.ingredients.map(i=>i.herbId+'|'+i.form)));
  return db.herbs.flatMap(herb=>relevantForms(db,herb)
    .filter(form=>!isCountVerified(herb,form))
    .map(form=>({herb,form,active:active.has(herb.id+'|'+form)})))
    .sort((a,b)=>Number(b.active)-Number(a.active)||Number(b.herb.stock[b.form]>0)-Number(a.herb.stock[a.form]>0)||a.herb.name.localeCompare(b.herb.name));
}
export function restockQueue(db:BotanicaDB){
  const used=new Set(db.recipes.filter(r=>r.active).flatMap(r=>r.ingredients.map(i=>i.herbId+'|'+i.form)));
  return db.herbs.flatMap(herb=>relevantForms(db,herb).flatMap(form=>{
    if(!isCountVerified(herb,form))return [];
    const value=herb.stock[form],threshold=herb.thresholds[form],usedInFormula=used.has(herb.id+'|'+form);
    if(threshold>0&&value<=threshold)return [{herb,form,value,threshold,usedInFormula,gap:Math.max(0,threshold-value),reason:value===0?'Out of stock':'At or below reorder point'}];
    if(value===0&&usedInFormula)return [{herb,form,value,threshold,usedInFormula,gap:0,reason:'Out of stock · no reorder threshold'}];
    return [];
  })).sort((a,b)=>Number(b.value===0)-Number(a.value===0)||Number(b.usedInFormula)-Number(a.usedInFormula)||a.herb.name.localeCompare(b.herb.name));
}
export function productionQueue(db:BotanicaDB):ProductionTask[]{
  return db.productionTasks.filter(t=>t.step!=='done').sort((a,b)=>{
    const dueA=a.dueOn||'9999-12-31',dueB=b.dueOn||'9999-12-31';
    return dueA.localeCompare(dueB)||Number(b.step==='ready')-Number(a.step==='ready')||b.updatedAt.localeCompare(a.updatedAt);
  });
}
export function saveProductionTask(db:BotanicaDB,input:{id?:string;name:string;step:ProductionStep;recipeId?:string;dueOn?:string;notes?:string;}):BotanicaDB{
  if(!input.name.trim())throw new Error('Name the production task.');
  if(!productionStepOrder.includes(input.step))throw new Error('Invalid production stage.');
  if(input.dueOn&&!/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn))throw new Error('Enter a valid target date.');
  const now=new Date().toISOString();
  const existing=db.productionTasks.find(t=>t.id===input.id);
  const task:ProductionTask={
    id:existing?.id||makeId(),name:input.name.trim(),step:input.step,
    recipeId:input.recipeId||undefined,dueOn:input.dueOn||undefined,
    notes:input.notes?.trim()||undefined,createdAt:existing?.createdAt||now,updatedAt:now
  };
  return {...db,updatedAt:now,productionTasks:existing?
    db.productionTasks.map(t=>t.id===task.id?task:t):[task,...db.productionTasks]};
}
export function advanceProductionTask(db:BotanicaDB,id:string,step:ProductionStep):BotanicaDB{
  const task=db.productionTasks.find(t=>t.id===id);
  if(!task)throw new Error('Production task not found.');
  return saveProductionTask(db,{...task,step});
}
