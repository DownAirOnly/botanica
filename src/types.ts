export const DB_VERSION = 4 as const;
export type StockForm = 'dry' | 'powder' | 'extract';
export type FormulaKind = 'tincture' | 'tea';
export type ItemKind = 'ingredient' | 'bulk' | 'product' | 'generic';
export type GeneralUnit = 'units' | 'g' | 'kg' | 'oz_wt' | 'lb' | 'ml' | 'fl_oz' | 'l';
export interface GeneralItem {id:string;name:string;category:string;sku:string;unit:GeneralUnit;quantity:number;threshold:number;unitCost?:number;vendor?:string;notes?:string;}
export type MovementAction = 'adjustment' | 'purchase' | 'batch' | 'packaging' | 'extraction';
export type StockAmounts = Record<StockForm, number>;
export type StockThresholds = Record<StockForm, number>;
export interface Herb {
  id: string;
  name: string;
  aliases: string[];
  category: 'herb' | 'root' | 'flower' | 'seed' | 'other';
  stock: StockAmounts;
  thresholds: StockThresholds;
  /** Confirmed physical count by form. Missing means amount is unverified, not zero. */
  stockCheckedAt?: Partial<Record<StockForm,string>>;
  preferredVendorId?: string;
  quotedPricePerLb?: number;
  notes?: string;
}
export interface Vendor { id: string; name: string; website?: string; notes?: string; }
export interface PriceQuote {
  id:string; herbId:string; form:'dry'|'powder'; vendorId:string; pricePerLb:number;
  quotedOn?:string; recordedAt:string; source:'manual'|'workbook'|'purchase'|'legacy';
  sourceFile?:string; sourceRow?:number; notes?:string;
}
export interface Purchase {
  id: string; herbId: string; vendorId: string; form: 'dry' | 'powder';
  quantityOz: number; pricePerLb: number; shipping: number;
  date: string; notes?: string;
}
export interface RecipeIngredient { herbId: string; form: StockForm; parts: number; }
export interface Recipe { id: string; name: string; kind: FormulaKind; ingredients: RecipeIngredient[]; notes?: string; active: boolean; }
export interface BatchIngredient { herbId: string; form: StockForm; amountOz: number; }
export interface Batch { id: string; recipeId: string; recipeName: string; amountOz: number; unit: 'oz_wt' | 'fl_oz'; ingredients: BatchIngredient[]; date: string; notes?: string; }
export interface Product { id: string; name: string; recipeId?: string; kind: FormulaKind | 'salve' | 'spray' | 'other'; packageOz: number; count: number; countCheckedAt?:string; notes?: string; }
export type ProductionStep = 'planned'|'preparing'|'waiting'|'ready'|'done';
/** A production checklist item; never changes quantities by itself. */
export interface ProductionTask {
  id:string;name:string;step:ProductionStep;recipeId?:string;
  dueOn?:string;notes?:string;createdAt:string;updatedAt:string;
}
export interface StockMovement {
  id: string; at: string; action: MovementAction; kind: ItemKind; itemId: string;
  form?: StockForm; delta: number; before: number; after: number; unit: 'oz_wt' | 'fl_oz' | 'units' | 'g' | 'kg' | 'lb' | 'ml' | 'l';
  reason: string; sourceId?: string;
}
export interface BotanicaDB {
  schemaVersion: number; appVersion: number; mode: 'demo' | 'real';
  herbs: Herb[]; items: GeneralItem[]; vendors: Vendor[]; purchases: Purchase[]; priceQuotes: PriceQuote[];
  recipes: Recipe[]; batches: Batch[]; products: Product[]; productionTasks: ProductionTask[];
  bulk: Record<string, number>; movements: StockMovement[];
  updatedAt: string;
}
export type PageId = 'home' | 'items' | 'herbs' | 'restock' | 'recipes' | 'batches' | 'products' | 'settings';
export const FORMS: StockForm[] = ['dry', 'powder', 'extract'];
export const FORM_LABEL: Record<StockForm, string> = {dry:'Dried herb',powder:'Powder',extract:'Tincture extract'};
export const FORM_UNIT: Record<StockForm, 'oz_wt' | 'fl_oz'> = {dry:'oz_wt',powder:'oz_wt',extract:'fl_oz'};
export const RECIPE_UNIT: Record<FormulaKind, 'oz_wt' | 'fl_oz'> = {tincture:'fl_oz',tea:'oz_wt'};
export const unitLabel = (unit: StockMovement['unit']) => unit === 'oz_wt' ? 'oz wt' : unit === 'fl_oz' ? 'fl oz' : unit === 'units' ? 'units' : unit;
export const formatAmount = (value: number) => Number(value.toFixed(3)).toLocaleString(undefined,{maximumFractionDigits:3});
export const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const normalizeName = (s: string) => s.trim().toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ');
export const zeroStock = (): StockAmounts => ({dry:0,powder:0,extract:0});
export const zeroThresholds = (): StockThresholds => ({dry:0,powder:0,extract:0});
