import {useState} from 'react';
import {Shell} from './components/Shell';
import {HomePage} from './pages/HomePage';
import {HerbsPage} from './pages/HerbsPage';
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
 function go(p:PageId){setPage(p);if(p!=='herbs')setHerb(null);if(p!=='batches')setBatchRecipe(null);}
 function openHerb(id:string){setHerb(id);setPage('herbs');}
 function makeBatch(recipeId:string){setBatchRecipe(recipeId);setPage('batches');}
 return <Shell page={page} onNavigate={go}>
   {page==='home'&&<HomePage onNavigate={go} onOpenHerb={openHerb}/>}
   {page==='items'&&<ItemsPage/>}
   {page==='herbs'&&<HerbsPage selected={herb} onSelect={setHerb}/>}
   {page==='recipes'&&<RecipesPage onMakeBatch={makeBatch}/>}
   {page==='batches'&&<BatchesPage key={batchRecipe||'fresh'} selectedRecipe={batchRecipe}/>}
   {page==='products'&&<ProductsPage/>}
   {page==='settings'&&<SettingsPage/>}
 </Shell>;
}
