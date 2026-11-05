import {useState,type ReactNode} from 'react';
import {Boxes,Cloud,Leaf,LogIn,Plus,ShieldCheck,RotateCw,LogOut} from 'lucide-react';
import {firebaseConfigured} from '../lib/firebase';
import {useAccount} from '../state/AccountContext';
import {type WorkspaceKind} from '../lib/workspaces';
import {Button,Card} from './UI';

export function AccountGate({children}:{children:ReactNode}){
 const {user,ready,error,active,workspaces,login,logout,create,choose,refresh,clearError}=useAccount();
 const [name,setName]=useState(''),[kind,setKind]=useState<WorkspaceKind>('herbal'),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
 if(active&&user)return <>{children}</>;
 async function execute(action:()=>Promise<void>){setBusy(true);setFormError('');clearError();try{await action();}catch(e){setFormError(e instanceof Error?e.message:'An unexpected error occurred.');}finally{setBusy(false);}}
 return <div className="gate-wrap"><div className="gate-main">
  <div className="gate-brand"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt=""/><div><h1>Botanica</h1><p>Inventory, organized.</p></div></div>
  {!firebaseConfigured?<Card title="Firebase setup required"><p>Botanica is built to use private Google accounts and Firestore workspaces. Configure a separate Firebase project before using cloud inventory.</p><p className="hint">Copy <code>.env.example</code> to <code>.env.local</code>, add the Firebase web app settings, enable Google Authentication and Cloud Firestore, and deploy the included security rules. See <code>docs/FIREBASE_SETUP.md</code>.</p></Card>
  :!ready?<Card title="Checking your account"><p>Checking Google sign-in…</p></Card>
  :!user?<Card title="Sign in to your inventory"><p>Each account can create multiple private workspaces. Your business inventory is separate from everyone else's.</p><div className="gate-iconline"><ShieldCheck size={19}/> Google sign-in · private Firestore data · no spreadsheets in public source</div><Button disabled={busy} onClick={()=>void execute(login)}><LogIn size={18}/> Continue with Google</Button></Card>
  :<>
   <div className="page-heading"><div><h2>Your workspaces</h2><p>Signed in as {user.email||'Google user'}. Choose an inventory or create a new one.</p></div><Button variant="ghost" onClick={()=>void execute(logout)}><LogOut size={16}/> Sign out</Button></div>
   {!!workspaces.length&&<Card title="Open workspace">{workspaces.map(w=><button key={w.id} className="workspace-choice" onClick={()=>choose(w.id)}><span className="workspace-choice-icon">{w.kind==='herbal'?<Leaf size={22}/>:<Boxes size={22}/>}</span><span><strong>{w.name}</strong><small>{w.kind==='herbal'?'Herbal production':'General inventory'}</small></span><span aria-hidden="true">→</span></button>)}</Card>}
   <Card title="Create a workspace"><div className="field"><label htmlFor="workspace-name" className="field-label">Workspace name</label><input id="workspace-name" value={name} maxLength={80} placeholder="e.g. Mom’s Apothecary or Home Supplies" onChange={e=>setName(e.target.value)}/></div><div className="field"><label className="field-label" htmlFor="workspace-kind">Workspace type</label><select id="workspace-kind" value={kind} onChange={e=>setKind(e.target.value as WorkspaceKind)}><option value="herbal">Herbal ingredients, tinctures and recipes</option><option value="general">General items and stock levels</option></select></div><p className="hint">Workspaces are independent. You can create more than one, even with the same Google account.</p><Button disabled={busy||name.trim().length<2} onClick={()=>void execute(async()=>{await create(name,kind);setName('');})}><Plus size={17}/> Create workspace</Button></Card>
   <div className="gate-footer"><Cloud size={17}/> Cloud workspace selection <button onClick={()=>void execute(refresh)} disabled={busy}><RotateCw size={16}/> Refresh</button></div>
  </>}
  {(error||formError)&&<div className="alert error" role="alert">{formError||error}</div>}
 </div></div>;
}
