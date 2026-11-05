import { DB_VERSION, type BotanicaDB } from '../types';
import {defaultPackagingSupplies} from '../data/packaging';
// The legacy local-only key is deliberately not read in the account-based application.
// Import a v1 JSON backup through Settings if you have older data.
export function validateBackup(value:unknown):BotanicaDB {
  if(!value||typeof value!=='object')throw new Error('Not a Botanica backup.');
  const v=value as Partial<BotanicaDB>;
  if(![1,2,3,4,5,DB_VERSION].includes(v.schemaVersion as number)||
     !Array.isArray(v.herbs)||!Array.isArray(v.recipes)||!Array.isArray(v.movements)||
     !Array.isArray(v.vendors)||!Array.isArray(v.purchases)||!Array.isArray(v.products)||
     !Array.isArray(v.batches)||!v.bulk||typeof v.bulk!=='object')
    throw new Error('Unsupported or incomplete Botanica backup.');
  if(v.herbs.some(h=>!h||typeof h.id!=='string'||typeof h.name!=='string'||!h.stock||
    Object.values(h.stock).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0)))
    throw new Error('The backup contains invalid ingredient stock values.');
  if(v.products.some(p=>!p||typeof p.id!=='string'||!Number.isInteger(p.count)||p.count<0))
    throw new Error('The backup contains invalid products.');
  if(Object.values(v.bulk).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))
    throw new Error('The backup contains invalid bulk stock values.');
  if(v.schemaVersion!==1&&(!Array.isArray(v.items)||v.items.some(i=>!i||typeof i.name!=='string'||
    !Number.isFinite(i.quantity)||i.quantity<0||!Number.isFinite(i.threshold)||i.threshold<0)))
    throw new Error('Invalid general inventory items.');
  if((v.schemaVersion as number)>=3){
    if(!Array.isArray(v.priceQuotes)||v.priceQuotes.some(q=>!q||
      typeof q.id!=='string'||typeof q.herbId!=='string'||typeof q.vendorId!=='string'||
      !['dry','powder'].includes(q.form)||!Number.isFinite(q.pricePerLb)||q.pricePerLb<=0||
      typeof q.recordedAt!=='string'||!['manual','workbook','purchase','legacy'].includes(q.source)))
      throw new Error('Invalid supplier quote history.');
  }
  if((v.schemaVersion as number)>=4){
    if(!Array.isArray(v.productionTasks)||v.productionTasks.some(t=>!t||typeof t.id!=='string'||
      typeof t.name!=='string'||!['planned','preparing','waiting','ready','done'].includes(t.step)||
      typeof t.createdAt!=='string'||typeof t.updatedAt!=='string'))
      throw new Error('Invalid production task records.');
  }
  if((v.schemaVersion as number)>=5){
    if(!Array.isArray(v.packagingSupplies)||!Array.isArray(v.packagingReceipts)||
       !Array.isArray(v.productionRuns)||!Array.isArray(v.herbRestockNotes)||
       v.packagingSupplies.some(p=>!p||typeof p.id!=='string'||typeof p.variant!=='string'||
         !Number.isInteger(p.count)||p.count<0||!Number.isInteger(p.threshold)||p.threshold<0)||
       v.productionRuns.some(r=>!r||typeof r.id!=='string'||!Number.isInteger(r.count)||r.count<=0))
      throw new Error('Invalid packaging supply or production records.');
  }
  if(v.schemaVersion===DB_VERSION){
    if(!Array.isArray(v.restockPlans)||!Array.isArray(v.restockReviews)||
      v.restockPlans.some(p=>!p||typeof p.id!=='string'||typeof p.herbId!=='string'||
        !['dry','powder'].includes(p.form)||!['weekly','biweekly','monthly','quarterly'].includes(p.cadence)||
        !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p.nextReviewOn)||typeof p.active!=='boolean'||
        (p.targetQuantityOz!==undefined&&(!Number.isFinite(p.targetQuantityOz)||p.targetQuantityOz<=0))||
        typeof p.createdAt!=='string'||typeof p.updatedAt!=='string')||
      v.restockReviews.some(r=>!r||typeof r.id!=='string'||typeof r.planId!=='string'||
        !['consider_order','no_order_needed'].includes(r.result)||typeof r.reviewedOn!=='string'||(r.resolvedOn!==undefined&&typeof r.resolvedOn!=='string')))
      throw new Error('Invalid recurring restock plan history.');
    return v as BotanicaDB;
  }
  if(v.schemaVersion===5){
    return {...v,restockPlans:[],restockReviews:[],schemaVersion:DB_VERSION,appVersion:8} as BotanicaDB;
  }
  if(v.schemaVersion===4){
    return {...v,packagingSupplies:defaultPackagingSupplies(),packagingReceipts:[],
      productionRuns:[],herbRestockNotes:[],restockPlans:[],restockReviews:[],schemaVersion:DB_VERSION,appVersion:8} as BotanicaDB;
  }
  if(v.schemaVersion===3){
    return {...v,productionTasks:[],packagingSupplies:defaultPackagingSupplies(),
      packagingReceipts:[],productionRuns:[],herbRestockNotes:[],restockPlans:[],restockReviews:[],schemaVersion:DB_VERSION,appVersion:8} as BotanicaDB;
  }
  // Migrate v1/v2 backups without changing stock or erasing unknown source archives.
  // Old quotedPricePerLb is an undated dry-herb price, NOT a purchase.
  const quotes:BotanicaDB['priceQuotes']=[];
  const vendors=v.vendors;
  for(const h of v.herbs){
    if(h.quotedPricePerLb!=null&&Number.isFinite(h.quotedPricePerLb)&&h.quotedPricePerLb>0&&
       h.preferredVendorId&&vendors.some(x=>x.id===h.preferredVendorId)){
      quotes.push({id:`legacy-${h.id}`,herbId:h.id,form:'dry',vendorId:h.preferredVendorId,
        pricePerLb:h.quotedPricePerLb,recordedAt:new Date().toISOString(),source:'legacy'});
    }
  }
  return {...v,items:v.schemaVersion===1?[]:v.items!,priceQuotes:quotes,productionTasks:[],
    packagingSupplies:defaultPackagingSupplies(),packagingReceipts:[],productionRuns:[],herbRestockNotes:[],restockPlans:[],restockReviews:[],
    schemaVersion:DB_VERSION,appVersion:8} as BotanicaDB;
}
export function downloadJSON(db:BotanicaDB){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`botanica-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export async function importJSON(file:File){return validateBackup(JSON.parse(await file.text()));}
