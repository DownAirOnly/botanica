import {readSheet} from 'read-excel-file/browser';
import {emptyDB} from '../data/demo';
import {makeId,normalizeName,zeroStock,zeroThresholds,type BotanicaDB,type Herb,type Recipe,type RecipeIngredient,type Product,type FormulaKind,type StockForm} from '../types';
export type ImportKind = 'herbs'|'tinctures'|'teas'|'products';
export interface ImportPreview {draft:BotanicaDB;kind:ImportKind;warnings:string[];herbsAdded:number;recipesAdded:number;productsAdded:number;replaceDemo:boolean;}
type Rows=unknown[][];
const str=(value:unknown)=>value==null?'':String(value).trim();
const num=(value:unknown)=>typeof value==='number'?value:Number(str(value));
const isEmpty=(x:unknown)=>str(x)==='';
const isNumber=(x:unknown)=>!isEmpty(x)&&Number.isFinite(num(x));
const title=(text:string)=>text.replace(/\s+/g,' ').trim();
function quantity(raw:unknown):number|null {
 if(raw==null||str(raw)==='')return null;
 if(typeof raw==='number')return raw>=0?raw:null;
 const s=str(raw).toLowerCase();
 if(/^(?:0|ø|∅|none)$/u.test(s))return 0;
 const m=s.match(/^(\d+(?:\.\d+)?)\s*(?:oz|ounces?)$/);
 if(m)return Number(m[1]);
 return null;
}
function matchHerb(db:BotanicaDB,name:string):Herb|undefined {
 const key=normalizeName(name);
 return db.herbs.find(h=>normalizeName(h.name)===key||h.aliases.some(a=>normalizeName(a)===key));
}
function addHerb(db:BotanicaDB,name:string):Herb {
 const existing=matchHerb(db,name);if(existing)return existing;
 const h:Herb={id:makeId(),name:title(name),aliases:[],category:'other',stock:zeroStock(),thresholds:zeroThresholds()};db.herbs.push(h);return h;
}
function addRecipe(db:BotanicaDB,name:string,kind:FormulaKind,ingredients:RecipeIngredient[],warnings:string[]):void {
 if(!ingredients.length)return;
 if(db.recipes.some(r=>r.kind===kind&&normalizeName(r.name)===normalizeName(name))){warnings.push(`Recipe "${name}" already exists; skipped duplicate.`);return;}
 db.recipes.push({id:makeId(),name:title(name),kind,ingredients,active:true});
}
function upsertIngredient(ingredients:RecipeIngredient[],herbId:string,form:StockForm,parts:number){
 const existing=ingredients.find(i=>i.herbId===herbId&&i.form===form);
 if(existing)existing.parts+=parts;else ingredients.push({herbId,form,parts});
}
function parseHerbs(db:BotanicaDB,master:Rows,powders:Rows,warnings:string[]):void {
 const names=new Set<string>();
 master.slice(3).forEach((row,index)=>{
  const name=str(row[3]);if(!name)return;
  const key=normalizeName(name);
  if(names.has(key)){warnings.push(`Master Herb row ${index+4}: repeated "${name}"; additional stock row not auto-counted.`);return;}
  names.add(key);
  const existing=matchHerb(db,name);
  const herb=existing||addHerb(db,name);
  const raw=row[5];const parsed=quantity(raw);
  if(!existing&&parsed!=null)herb.stock.dry=parsed;
  if(!existing&&!isEmpty(raw)&&parsed===null)warnings.push(`Master Herb row ${index+4}, ${name}: ambiguous dry stock "${str(raw)}"; left at 0 pending review.`);
  if(!isEmpty(row[8]))warnings.push(`Master Herb row ${index+4}, ${name}: "Amount Tinctured" not imported into liquid stock until its unit is confirmed.`);
  if(existing)warnings.push(`Master Herb row ${index+4}: ${name} already exists; current stock preserved.`);
 });
 powders.slice(2).forEach((row,index)=>{
  const name=str(row[1]);if(!name)return;
  const existing=matchHerb(db,name),herb=existing||addHerb(db,name);
  const q=quantity(row[3]);
  if(q!==null&&!existing)herb.stock.powder=q;
  if(q!==null&&existing&&herb.stock.powder===0)herb.stock.powder=q;
  if(!isEmpty(row[3])&&q===null)warnings.push(`Powders row ${index+3}, ${name}: ambiguous amount "${str(row[3])}"; review required.`);
 });
}
function parseTinctures(db:BotanicaDB,rows:Rows,warnings:string[]):void {
 for(const [partColumn,nameColumn] of [[0,1],[6,7]]){
  let activeName='',ingredients:RecipeIngredient[]=[];
  const finish=()=>{if(activeName)addRecipe(db,activeName,'tincture',ingredients,warnings);ingredients=[];};
  rows.forEach((row,index)=>{
   const name=str(row[nameColumn]),part=row[partColumn];
   if(!name){if(!isEmpty(part))warnings.push(`Tincture row ${index+1}: quantity without an ingredient; ignored.`);return;}
   if(isEmpty(part)) {finish();activeName=name;return;}
   if(!activeName){warnings.push(`Tincture row ${index+1}: ingredient before recipe heading (${name}); ignored.`);return;}
   const amount=num(part);
   if(!Number.isFinite(amount)||amount<=0){warnings.push(`Tincture ${activeName}: nonnumeric ingredient proportion "${str(part)} ${name}" skipped.`);return;}
   const herb=addHerb(db,name);upsertIngredient(ingredients,herb.id,'extract',amount);
  });
  finish();
 }
}
function parseTeas(db:BotanicaDB,rows:Rows,warnings:string[]):void {
 for(const column of [1,7]){
  let activeName='',ingredients:RecipeIngredient[]=[];
  const finish=()=>{if(activeName)addRecipe(db,activeName,'tea',ingredients,warnings);ingredients=[];};
  rows.forEach((row,index)=>{
   const value=str(row[column]);if(!value||value.toLowerCase()==='on hand')return;
   const m=value.match(/^(.+?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*$/);
   if(!m){
    if(/tea\b/i.test(value)||!activeName){finish();activeName=value;}
    else warnings.push(`Tea row ${index+1}: unrecognized "${value}"; not added to ${activeName}.`);
    return;
   }
   if(!activeName){warnings.push(`Tea row ${index+1}: ingredient outside a named recipe.`);return;}
   const name=title(m[1]),parts=Number(m[2]);
   if(name.includes('/')){warnings.push(`Tea ${activeName}: combined ingredient "${name}" needs manual splitting; skipped.`);return;}
   if(parts<=0){warnings.push(`Tea ${activeName}: nonpositive part for ${name}; skipped.`);return;}
   const h=addHerb(db,name);upsertIngredient(ingredients,h.id,'dry',parts);
  });finish();
 }
}
function parseProducts(db:BotanicaDB,rows:Rows,warnings:string[]):void {
 let leftKind:Product['kind']='tincture',rightKind:Product['kind']='spray';
 function add(name:string,kind:Product['kind'],size:number,cell:unknown){
  const productName=`${title(name)} · ${size} ${kind==='tincture'||kind==='spray'?'fl oz':'oz'}`;
  if(db.products.some(p=>normalizeName(p.name)===normalizeName(productName)))return;
  const c=isNumber(cell)?num(cell):0;
  const count=Number.isInteger(c)&&c>=0?c:0;
  if(!isEmpty(cell)&&count!==c)warnings.push(`Product ${name}: count "${str(cell)}" is invalid and was set to 0.`);
  const recipe=db.recipes.find(r=>normalizeName(r.name)===normalizeName(name)&&((kind==='tincture'&&r.kind==='tincture')||(kind==='tea'&&r.kind==='tea')));
  db.products.push({id:makeId(),name:productName,recipeId:recipe?.id,kind,packageOz:size,count});
 }
 rows.slice(1).forEach((row)=>{
  const left=str(row[1]),right=str(row[4]);
  if(left){
   if(/^teas?\b/i.test(left)){leftKind='tea';}
   else if(!/^(?:2\s*oz|4\s*oz|tinctures?)$/i.test(left)){
    add(left,leftKind,2,row[2]);
    if(leftKind==='tincture')add(left,leftKind,4,row[3]);
   }
  }
  if(right){
   if(/salves?\b/i.test(right))rightKind='salve';
   else if(/sprays?|liniments?/i.test(right)&&/^[A-Z\s&]+$/.test(right))rightKind='spray';
   else if(/^miscellaneous$/i.test(right))rightKind='other';
   else if(!/^(?:2\s*oz|4\s*oz)$/i.test(right))add(right,rightKind,2,row[5]);
  }
 });
}
export async function previewWorkbook(file:File,kind:ImportKind,current:BotanicaDB):Promise<ImportPreview>{
 if(!/\.xlsx$/i.test(file.name))throw new Error('Choose an .xlsx workbook.');
 if(file.size>15_000_000)throw new Error('Workbook exceeds 15 MB limit.');
 const replaceDemo=current.mode==='demo';
 const db:BotanicaDB=structuredClone(replaceDemo?emptyDB():current);
 const initial={herbs:db.herbs.length,recipes:db.recipes.length,products:db.products.length};
 const warnings:string[]=[];
 if(kind==='herbs'){
  const a=await readSheet(file,'Master Herb');
  const b=await readSheet(file,'Powders');
  parseHerbs(db,a as Rows,b as Rows,warnings);
 }else{
  const rows=await readSheet(file,1);
  if(kind==='tinctures')parseTinctures(db,rows as Rows,warnings);
  if(kind==='teas')parseTeas(db,rows as Rows,warnings);
  if(kind==='products')parseProducts(db,rows as Rows,warnings);
 }
 if(db.herbs.length===initial.herbs&&db.recipes.length===initial.recipes&&db.products.length===initial.products)warnings.unshift('No new entries were identified. Check that the chosen workbook type is correct.');
 db.mode='real';db.updatedAt=new Date().toISOString();
 return {draft:db,kind,warnings,herbsAdded:db.herbs.length-initial.herbs,recipesAdded:db.recipes.length-initial.recipes,productsAdded:db.products.length-initial.products,replaceDemo};
}
