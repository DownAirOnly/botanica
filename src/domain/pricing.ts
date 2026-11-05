import {makeId,normalizeName,type BotanicaDB,type PriceQuote} from '../types';

export type QuoteInput = {
  herbId:string;form:'dry'|'powder';vendorName:string;pricePerLb:number;
  quotedOn?:string;source:PriceQuote['source'];sourceFile?:string;sourceRow?:number;notes?:string;
};

export function latestPriceQuote(db:BotanicaDB,herbId:string,form:'dry'|'powder'):PriceQuote|undefined {
  return db.priceQuotes.find(q=>q.herbId===herbId&&q.form===form);
}
export function quoteVendor(db:BotanicaDB,q:PriceQuote):string {
  return db.vendors.find(v=>v.id===q.vendorId)?.name||'Unknown supplier';
}
export function recordPriceQuote(db:BotanicaDB,input:QuoteInput):BotanicaDB {
  if(!db.herbs.some(h=>h.id===input.herbId))throw new Error('Ingredient not found.');
  const vendorName=input.vendorName.trim();
  if(!vendorName)throw new Error('Enter a supplier name.');
  if(!Number.isFinite(input.pricePerLb)||input.pricePerLb<=0)
    throw new Error('Price per pound must be greater than zero.');
  if(input.quotedOn&&!/^\d{4}-\d{2}-\d{2}$/.test(input.quotedOn))
    throw new Error('Enter a valid quote date.');
  const vendor=db.vendors.find(v=>normalizeName(v.name)===normalizeName(vendorName));
  const vendorId=vendor?.id||makeId();
  const existing=latestPriceQuote(db,input.herbId,input.form);
  // Repeating the same undated spreadsheet should not create an artificial price history.
  if(input.source!=='purchase'&&existing&&
     existing.vendorId===vendorId&&existing.pricePerLb===input.pricePerLb&&
     (existing.quotedOn||'')===(input.quotedOn||''))return db;
  const quote:PriceQuote={
    id:makeId(),herbId:input.herbId,form:input.form,vendorId,
    pricePerLb:input.pricePerLb,quotedOn:input.quotedOn||undefined,
    recordedAt:new Date().toISOString(),source:input.source,
    sourceFile:input.sourceFile,sourceRow:input.sourceRow,notes:input.notes?.trim()||undefined
  };
  return {
    ...db,updatedAt:quote.recordedAt,
    vendors:vendor?db.vendors:[...db.vendors,{id:vendorId,name:vendorName}],
    priceQuotes:[quote,...db.priceQuotes],
    // Preserve v2 dry-price fields for older screens/backups; never overwrite them for powders.
    herbs:input.form==='dry'?db.herbs.map(h=>h.id===input.herbId?
      {...h,quotedPricePerLb:input.pricePerLb,preferredVendorId:vendorId}:h):db.herbs
  };
}
