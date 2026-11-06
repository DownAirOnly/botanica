import type { BotanicaDB, Herb, Recipe, Product } from '../types';
import {defaultPackagingSupplies} from './packaging';
const herb = (id:string,name:string,dry:number,extract:number,threshold=8,category:Herb['category']='herb'):Herb => ({
  id,name,aliases:[],category,stock:{dry,powder:0,extract},thresholds:{dry:threshold,powder:0,extract:4},preferredVendorId:'vendor-demo',quotedPricePerLb:24
});
const herbs:Herb[] = [
  herb('demo-chamomile','Chamomile',24,12),
  herb('demo-lemon-balm','Lemon Balm',16,10),
  herb('demo-lavender','Lavender',8,8),
  herb('demo-passion-flower','Passion Flower',4,6,8,'flower'),
  herb('demo-ginger','Ginger Root',18,0,6,'root'),
  herb('demo-fennel','Fennel Seed',3,0,6,'seed'),
  herb('demo-peppermint','Peppermint',16,0),
  herb('demo-calendula','Calendula',10,0,5,'flower')
];
const recipes:Recipe[] = [
  {id:'demo-r1',name:'Calming Blend (sample)',kind:'tincture',active:true,notes:'Demonstration only. Not a verified business formula.',ingredients:[{herbId:'demo-chamomile',form:'extract',parts:2},{herbId:'demo-lemon-balm',form:'extract',parts:2},{herbId:'demo-lavender',form:'extract',parts:1}]},
  {id:'demo-r2',name:'Tummy Tea (sample)',kind:'tea',active:true,notes:'Demonstration only.',ingredients:[{herbId:'demo-chamomile',form:'dry',parts:2},{herbId:'demo-fennel',form:'dry',parts:1},{herbId:'demo-ginger',form:'dry',parts:1},{herbId:'demo-peppermint',form:'dry',parts:1}]},
  {id:'demo-r3',name:'Evening Tea (sample)',kind:'tea',active:true,ingredients:[{herbId:'demo-chamomile',form:'dry',parts:2},{herbId:'demo-lavender',form:'dry',parts:1},{herbId:'demo-lemon-balm',form:'dry',parts:2}]}
];
const products:Product[] = [
  {id:'demo-p1',name:'Calming Blend · 2 fl oz',kind:'tincture',recipeId:'demo-r1',packageOz:2,count:3},
  {id:'demo-p2',name:'Calming Blend · 4 fl oz',kind:'tincture',recipeId:'demo-r1',packageOz:4,count:0},
  {id:'demo-p3',name:'Tummy Tea · 2 oz',kind:'tea',recipeId:'demo-r2',packageOz:2,count:5}
];
export function demoDB():BotanicaDB {return {schemaVersion:6,appVersion:9,mode:'demo',herbs,items:[],vendors:[{id:'vendor-demo',name:'Example Herb Supplier'}],purchases:[],priceQuotes:[],recipes,batches:[],productionTasks:[],products,packagingSupplies:defaultPackagingSupplies(),packagingReceipts:[],productionRuns:[],herbRestockNotes:[],restockPlans:[],restockReviews:[],bulk:{'demo-r1':4,'demo-r2':6},movements:[],updatedAt:new Date().toISOString()};}
export function emptyDB():BotanicaDB {return {schemaVersion:6,appVersion:9,mode:'real',herbs:[],items:[],vendors:[],purchases:[],priceQuotes:[],recipes:[],batches:[],productionTasks:[],products:[],packagingSupplies:defaultPackagingSupplies(),packagingReceipts:[],productionRuns:[],herbRestockNotes:[],restockPlans:[],restockReviews:[],bulk:{},movements:[],updatedAt:new Date().toISOString()};}
