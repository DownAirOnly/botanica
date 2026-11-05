import {useState,type ReactNode} from 'react';
import {House,Leaf,BookOpen,FlaskConical,Package,Settings,Menu,PanelLeftClose,Boxes,ChevronsUpDown,LogOut,Cloud,CloudAlert,CloudUpload} from 'lucide-react';
import type {PageId} from '../types';
import {useApp} from '../state/AppContext';
import {useAccount} from '../state/AccountContext';
const HERBAL_NAV:[PageId,string,typeof House][]= [['home','Home',House],['herbs','Herbs',Leaf],['recipes','Recipes',BookOpen],['batches','Batches',FlaskConical],['products','Products',Package]];
const GENERAL_NAV:[PageId,string,typeof House][]= [['home','Home',House],['items','Items',Boxes]];
export function Shell({page,onNavigate,children}:{page:PageId;onNavigate:(id:PageId)=>void;children:ReactNode}){
 const {db,notice,error,persisted,syncStatus}=useApp();const {active,user,choose,logout}=useAccount();const [open,setOpen]=useState(false);
 const NAV=active?.kind==='general'?GENERAL_NAV:HERBAL_NAV;
 const safeLeave=()=>syncStatus==='saved'||window.confirm('Some changes may not be saved in the cloud. Export a backup in Settings before leaving. Continue?');
 const to=(id:PageId)=>{onNavigate(id);setOpen(false);window.scrollTo({top:0,behavior:'instant'});};
 const title=page==='home'?'Overview':page.charAt(0).toUpperCase()+page.slice(1);
 return <div className="app-shell">
   <aside className={`sidebar ${open?'sidebar-open':''}`}>
     <div className="brand"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt=""/><div><strong>Botanica</strong><small>{active?.name||'Private inventory'}</small></div><button className="icon-btn mobile-only" onClick={()=>setOpen(false)} aria-label="Close navigation"><PanelLeftClose size={20}/></button></div>
     <nav aria-label="Main navigation" className="sidebar-links">
       {NAV.map(([id,label,Icon])=><button key={id} onClick={()=>to(id)} className={id===page?'nav-link active':'nav-link'} aria-current={id===page?'page':undefined}><Icon size={20}/>{label}</button>)}
     </nav>
     <div className="sidebar-bottom"><button className="nav-link" onClick={()=>{if(safeLeave())choose(null);}}><ChevronsUpDown size={20}/> Switch workspace</button><button className="nav-link" onClick={()=>{if(safeLeave())void logout();}}><LogOut size={20}/> Sign out</button><button className={page==='settings'?'nav-link active':'nav-link'} onClick={()=>to('settings')}><Settings size={20}/>Settings</button><span className="version">Botanica v2 · {user?.email||'Signed in'}</span></div>
   </aside>
   {open&&<button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setOpen(false)}/>}
   <div className="main-area">
     <header className="topbar"><div className="mobile-menu"><button className="icon-btn" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu size={22}/></button></div><div><small className="top-kicker">BOTANICA / {active?.name.toUpperCase()||'WORKSPACE'}</small><h1>{title}</h1></div><span className="sync-pill" aria-live="polite">{syncStatus==='saved'?<Cloud size={16}/>:syncStatus==='saving'?<CloudUpload size={16}/>:<CloudAlert size={16}/>}<span>{syncStatus==='saved'?'Saved':syncStatus==='saving'?'Syncing':'Unsynced'}</span></span><button className="top-settings icon-btn" onClick={()=>to('settings')} aria-label="Settings"><Settings size={21}/></button></header>
     <main className="page-content">{db.mode==='demo'&&<div className="demo-banner">Sample workspace · All inventory amounts and formulas shown here are demonstration data.</div>}{!persisted&&<div className="alert error">Cloud sync is blocked. Export a JSON backup in Settings before reloading.</div>}{error&&<div className="alert error" role="alert">{error}</div>}{notice&&<div className="alert success" role="status">{notice}</div>}{children}</main>
   </div>
   <nav aria-label="Bottom navigation" className={`bottom-nav ${active?.kind==='general'?'bottom-nav-general':''}`}>{NAV.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>to(id)} aria-current={page===id?'page':undefined}><Icon size={21} strokeWidth={page===id?2.4:1.8}/><span>{label}</span></button>)}</nav>
 </div>;
}
