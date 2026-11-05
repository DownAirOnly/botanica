import {useState} from 'react';
import {Shell} from './components/Shell';
import {HomePage} from './pages/HomePage';
import {HerbsPage} from './pages/HerbsPage';
import {RestockPage} from './pages/RestockPage';
import {RecipesPage} from './pages/RecipesPage';
import {BatchesPage} from './pages/BatchesPage';
import {ProductsPage} from './pages/ProductsPage';
import {ItemsPage} from './pages/ItemsPage';
import {SettingsPage} from './pages/SettingsPage';
import {type PageId} from './types';
export default function App(){
 const [page,setPage]=useState<PageId>('home');
 const [herb,setHerb]=useState<string|null>(null);
 const [batchRecipe,setBatchRecipe]=useState<string|null>(null);
 const [restockTab,setRestockTab]=useState<'verify'|'reorder'>('verify');
 function go(p:PageId){setPage(p);if(p!=='herbs')setHerb(null);if(p!=='batches')setBatchRecipe(null);}
 function openHerb(id:string){setHerb(id);setPage('herbs');}
 function openRestock(tab:'verify'|'reorder'='verify'){setRestockTab(tab);go('restock');}
 function makeBatch(recipeId:string){setBatchRecipe(recipeId);setPage('batches');}
 return <Shell page={page} onNavigate={go}>
   {page==='home'&&<HomePage onNavigate={go} onOpenHerb={openHerb} onOpenRestock={openRestock}/>}
   {page==='items'&&<ItemsPage/>}
   {page==='herbs'&&<HerbsPage selected={herb} onSelect={setHerb} onOpenRestock={()=>openRestock('verify')}/>}
   {page==='restock'&&<RestockPage initialTab={restockTab} onBack={()=>go('home')} onOpenHerb={openHerb}/>}
   {page==='recipes'&&<RecipesPage onMakeBatch={makeBatch} onOpenRestock={()=>go('restock')}/>}
   {page==='batches'&&<BatchesPage key={batchRecipe||'fresh'} selectedRecipe={batchRecipe} onOpenRestock={()=>go('restock')}/>}
   {page==='products'&&<ProductsPage/>}
   {page==='settings'&&<SettingsPage/>}
 </Shell>;
}
