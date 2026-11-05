import { DB_VERSION, type BotanicaDB } from '../types';
// The legacy local-only key is deliberately not read in the account-based application.
// Import a v1 JSON backup through Settings if you have older data.
export function validateBackup(value:unknown):BotanicaDB {
  if(!value||typeof value!=='object')throw new Error('Not a Botanica backup.');
  const v=value as Partial<BotanicaDB>;
  if((v.schemaVersion!==DB_VERSION&&v.schemaVersion!==1)||!Array.isArray(v.herbs)||!Array.isArray(v.recipes)||!Array.isArray(v.movements)||!Array.isArray(v.vendors)||!Array.isArray(v.purchases)||!Array.isArray(v.products)||!Array.isArray(v.batches)||!v.bulk||typeof v.bulk!=='object')throw new Error('Unsupported or incomplete Botanica backup.');
  if(v.herbs.some(h=>!h||typeof h.id!=='string'||typeof h.name!=='string'||!h.stock||Object.values(h.stock).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0)))throw new Error('The backup contains invalid ingredient stock values.');
  if(v.products.some(p=>!p||typeof p.id!=='string'||!Number.isInteger(p.count)||p.count<0))throw new Error('The backup contains invalid products.');
  if(Object.values(v.bulk).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))throw new Error('The backup contains invalid bulk stock values.');
  if(v.schemaVersion===1)return {...v,items:[],schemaVersion:DB_VERSION,appVersion:2} as BotanicaDB;
  if(!Array.isArray(v.items)||v.items.some(i=>!i||typeof i.name!=='string'||!Number.isFinite(i.quantity)||i.quantity<0||!Number.isFinite(i.threshold)||i.threshold<0))throw new Error('Invalid general inventory items.');
  return v as BotanicaDB;
}
export function downloadJSON(db:BotanicaDB){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`botanica-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export async function importJSON(file:File){return validateBackup(JSON.parse(await file.text()));}
