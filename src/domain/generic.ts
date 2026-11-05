import {makeId,type BotanicaDB,type GeneralItem,type GeneralUnit,type StockMovement} from '../types';
import {StockError} from './inventory';
const hasValue=(n:number)=>Number.isFinite(n)&&n>=0;
const moved=(item:GeneralItem,before:number,after:number,reason:string):StockMovement=>({
 id:makeId(),at:new Date().toISOString(),action:'adjustment',kind:'generic',itemId:item.id,delta:after-before,before,after,unit:item.unit,reason
});
export function saveGeneralItem(db:BotanicaDB,item:GeneralItem):BotanicaDB{
 if(!item.name.trim()||!hasValue(item.quantity)||!hasValue(item.threshold)||!(['units','g','kg','oz_wt','lb','ml','fl_oz','l'] as GeneralUnit[]).includes(item.unit))throw new StockError('Enter a name, nonnegative quantity and reorder level, and valid unit.');
 if(item.unit==='units'&&!Number.isInteger(item.quantity))throw new StockError('Counted units must be whole numbers.');
 if(item.unitCost!==undefined&&!hasValue(item.unitCost))throw new StockError('Unit cost must be nonnegative.');
 const existing=db.items.find(i=>i.id===item.id);
 if(existing&&existing.unit!==item.unit&&existing.quantity!==0)throw new StockError('Set the old stock to zero before changing its unit.');
 if(existing)return {...db,items:db.items.map(i=>i.id===item.id?{...item,quantity:i.quantity}:i),updatedAt:new Date().toISOString()};
 if(item.quantity>0){
  const initial:StockMovement={id:makeId(),at:new Date().toISOString(),action:'adjustment',kind:'generic',itemId:item.id,delta:item.quantity,before:0,after:item.quantity,unit:item.unit,reason:'Opening stock count'};
  return {...db,items:[...db.items,item],movements:[initial,...db.movements],updatedAt:new Date().toISOString()};
 }
 return {...db,items:[...db.items,item],updatedAt:new Date().toISOString()};
}
export function adjustGeneralItem(db:BotanicaDB,id:string,mode:'add'|'use'|'set',amount:number,reason:string):BotanicaDB{
 const item=db.items.find(i=>i.id===id);if(!item)throw new StockError('Item not found.');
 if(!hasValue(amount)||(mode!=='set'&&amount===0))throw new StockError('Enter a valid amount.');
 if(!reason.trim())throw new StockError('Adjustment reason is required.');
 const before=item.quantity,after=mode==='add'?before+amount:mode==='use'?before-amount:amount;
 if(after<-1e-8)throw new StockError('Not enough stock. Use a verified count correction if needed.');
 if(item.unit==='units'&&!Number.isInteger(after))throw new StockError('Counted units must be whole numbers.');
 return {...db,items:db.items.map(i=>i.id===id?{...i,quantity:Math.max(0,after)}:i),movements:[moved(item,before,Math.max(0,after),reason),...db.movements],updatedAt:new Date().toISOString()};
}
