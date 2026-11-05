import {useState} from 'react';
import {Shell} from './components/Shell';
import {HomePage} from './pages/HomePage';
import {InventoryHub,ProductionHub,type InventorySection,type ProductionSection} from './components/WorkspaceHub';
import {ItemsPage} from './pages/ItemsPage';
import {SettingsPage} from './pages/SettingsPage';
import {type PageId} from './types';

export default function App(){
 const [page,setPage]=useState<PageId>('home');
 const [inventorySection,setInventorySection]=useState<InventorySection>('check');
 const [productionSection,setProductionSection]=useState<ProductionSection>('queue');
 const [herb,setHerb]=useState<string|null>(null);
 const [batchRecipe,setBatchRecipe]=useState<string|null>(null);
 const [makingProduct,setMakingProduct]=useState<string|null>(null);
 const [editingProduct,setEditingProduct]=useState<string|null>(null);
 const [restockTab,setRestockTab]=useState<'verify'|'reorder'>('verify');
 function go(target:PageId){
  // Legacy deep-link actions are routed into the appropriate work area.
  switch(target){
   case 'herbs':setInventorySection('herbs');setPage('inventory');return;
   case 'restock':setInventorySection('check');setPage('inventory');return;
   case 'products':setEditingProduct(null);setInventorySection('products');setPage('inventory');return;
   case 'containers':setInventorySection('packaging');setPage('inventory');return;
   case 'recipes':setProductionSection('formulas');setPage('production');return;
   case 'batches':setBatchRecipe(null);setProductionSection('batch');setPage('production');return;
   case 'bottling':setMakingProduct(null);setProductionSection('bottle');setPage('production');return;
   case 'inventory':setPage('inventory');return;
   case 'production':setPage('production');return;
   case 'work':setProductionSection('queue');setPage('production');return;
   default:setPage(target);
  }
 }
 function openHerb(id:string){setHerb(id);setInventorySection('herbs');setPage('inventory');}
 function openRestock(tab:'verify'|'reorder'='verify'){
  setRestockTab(tab);setInventorySection('check');setPage('inventory');
 }
 function makeProduct(productId:string){setEditingProduct(null);setMakingProduct(productId);setProductionSection('bottle');setPage('production');}
 function openPackaging(){setInventorySection('packaging');setPage('inventory');}
 function openProductEditor(id:string){setEditingProduct(id);setInventorySection('products');setPage('inventory');}
 function makeBatch(recipeId:string){
  setBatchRecipe(recipeId);setProductionSection('batch');setPage('production');
 }
 function changeProductionSection(section:ProductionSection){
  setProductionSection(section);
  if(section==='batch')setBatchRecipe(null);
  if(section==='bottle')setMakingProduct(null);
 }
 return <Shell page={page} onNavigate={go}>
  {page==='home'&&<HomePage onNavigate={go} onOpenHerb={openHerb} onOpenRestock={openRestock}/>}
  {page==='inventory'&&<InventoryHub section={inventorySection} onSectionChange={setInventorySection}
    restockTab={restockTab} selectedHerb={herb} onSelectHerb={setHerb} onOpenRestock={openRestock} onMakeProduct={makeProduct} editProductId={editingProduct}/>}
  {page==='production'&&<ProductionHub section={productionSection} onSectionChange={changeProductionSection}
    selectedRecipe={batchRecipe} onMakeBatch={makeBatch} onOpenRestock={()=>openRestock('verify')}
    selectedProductId={makingProduct} onEditProduct={openProductEditor} onPackaging={openPackaging}/>}
  {page==='items'&&<ItemsPage/>}
  {page==='settings'&&<SettingsPage/>}
 </Shell>;
}
