import {readSheet} from 'read-excel-file/browser';
import {normalizeName,type BotanicaDB} from '../types';
import {latestPriceQuote,quoteVendor,recordPriceQuote} from '../domain/pricing';

export type CostImportStatus='ready'|'unchanged'|'unmatched'|'ambiguous'|'missing-vendor'|'no-price'|'invalid'|'duplicate'|'conflict';
export interface CostImportRow {
  key:string;sheet:'Master Herb'|'Powders';rowNumber:number;herbName:string;
  form:'dry'|'powder';vendorName:string;pricePerLb:number|null;
  herbId?:string;matchedName?:string;status:CostImportStatus;detail:string;
}
export interface CostImportPreview {fileName:string;rows:CostImportRow[];}
type Cells=unknown[][];
const cell=(v:unknown)=>v==null?'':String(v).trim();
const amount=(v:unknown):number|null=>{
  if(v==null||cell(v)==='')return null;
  const n=typeof v==='number'?v:Number(cell(v).replace(/[$,]/g,''));
  return Number.isFinite(n)?n:NaN;
};
export async function previewCostWorkbook(file:File,db:BotanicaDB):Promise<CostImportPreview>{
  if(!/\.xlsx$/i.test(file.name))throw new Error('Choose an .xlsx workbook.');
  if(file.size>15_000_000)throw new Error('Workbook exceeds 15 MB.');
  const [master,powders]=await Promise.all([readSheet(file,'Master Herb'),readSheet(file,'Powders')]) as [Cells,Cells];
  if(cell(master[2]?.[3]).toUpperCase()!=='NAME'||!/per pound/i.test(cell(master[2]?.[4]))||
     cell(powders[0]?.[1]).toUpperCase()!=='POWDERS')
    throw new Error('Unrecognized HERBS COST workbook layout. Expected Master Herb and Powders sheets.');
  const rows:CostImportRow[]=[];
  const sources=[
    {sheet:'Master Herb' as const,form:'dry' as const,records:master,start:3,nameCol:3,priceCol:4,vendorCol:5},
    {sheet:'Powders' as const,form:'powder' as const,records:powders,start:2,nameCol:1,priceCol:2,vendorCol:3},
  ];
  const byName=new Map<string,string[]>();
  for(const h of db.herbs){
    for(const alias of [h.name,...h.aliases]){
      const k=normalizeName(alias);
      if(!k)continue;
      byName.set(k,[...new Set([...(byName.get(k)||[]),h.id])]);
    }
  }
  for(const src of sources){
    src.records.slice(src.start).forEach((line,index)=>{
      const herbName=cell(line[src.nameCol]);
      if(!herbName)return;
      const rowNumber=index+src.start+1;
      const pricePerLb=amount(line[src.priceCol]);
      const vendorName=cell(line[src.vendorCol]);
      const ids=byName.get(normalizeName(herbName))||[];
      const result:CostImportRow={key:`${src.sheet}-${rowNumber}`,sheet:src.sheet,rowNumber,
        herbName,form:src.form,pricePerLb,vendorName,status:'ready',detail:'Ready to import'};
      if(pricePerLb===null||pricePerLb===0){result.status='no-price';result.detail='Blank or zero price; existing prices remain unchanged.';}
      else if(!Number.isFinite(pricePerLb)||pricePerLb<0){result.status='invalid';result.detail='Price is not a valid positive number.';}
      else if(!vendorName){result.status='missing-vendor';result.detail='Supplier is missing; skipped to avoid guessing.';}
      else if(ids.length===0){result.status='unmatched';result.detail='No exact catalog name or alias match.';}
      else if(ids.length>1){result.status='ambiguous';result.detail='Multiple matching herbs; no automatic merge.';}
      else{
        result.herbId=ids[0];result.matchedName=db.herbs.find(h=>h.id===ids[0])?.name;
        const prior=latestPriceQuote(db,ids[0],src.form);
        // Workbook has no quote date; never stamp its prices as if quoted today.
        if(prior&&prior.pricePerLb===pricePerLb&&
           normalizeName(quoteVendor(db,prior))===normalizeName(vendorName)&&!prior.quotedOn){
          result.status='unchanged';result.detail='Latest recorded undated price already matches.';
        }
      }
      rows.push(result);
    });
  }
  // Duplicate source lines must not silently decide a winner.
  const seen=new Map<string,CostImportRow>();
  for(const row of rows.filter(r=>r.herbId&&['ready','unchanged'].includes(r.status))){
    const key=`${row.herbId}:${row.form}`,prior=seen.get(key);
    if(!prior){seen.set(key,row);continue;}
    if(prior.pricePerLb===row.pricePerLb&&normalizeName(prior.vendorName)===normalizeName(row.vendorName)){
      row.status='duplicate';row.detail=`Duplicate of ${prior.sheet} row ${prior.rowNumber}; skipped.`;
    }else{
      prior.status='conflict';prior.detail='Conflicting workbook prices for the same ingredient and form.';
      row.status='conflict';row.detail='Conflicting workbook prices for the same ingredient and form.';
    }
  }
  return {fileName:file.name,rows};
}
export function applyCostImport(db:BotanicaDB,rows:CostImportRow[],fileName:string):BotanicaDB {
  if(!rows.length)throw new Error('Select at least one matching price to import.');
  let next=db;
  for(const row of rows){
    if(row.status!=='ready'||!row.herbId||row.pricePerLb==null)continue;
    next=recordPriceQuote(next,{herbId:row.herbId,form:row.form,vendorName:row.vendorName,
      pricePerLb:row.pricePerLb,source:'workbook',sourceFile:`${fileName} / ${row.sheet}`,
      sourceRow:row.rowNumber});
  }
  if(new TextEncoder().encode(JSON.stringify(next)).byteLength>750_000)
    throw new Error('The import would exceed this workspace’s Firestore size guard. Export a backup before continuing.');
  return next;
}
