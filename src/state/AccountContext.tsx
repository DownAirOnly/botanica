import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {onAuthStateChanged, signInWithPopup, signOut, type User} from 'firebase/auth';
import {auth,googleProvider} from '../lib/firebase';
import {createWorkspace,listWorkspaces,type Workspace,type WorkspaceKind} from '../lib/workspaces';

interface AccountValue {
  user:User|null;ready:boolean;error:string;workspaces:Workspace[];active:Workspace|null;
  login:()=>Promise<void>;logout:()=>Promise<void>;create:(name:string,kind:WorkspaceKind)=>Promise<void>;
  choose:(id:string|null)=>void;refresh:()=>Promise<void>;clearError:()=>void;
}
const Account=createContext<AccountValue|null>(null);
export function AccountProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(!auth),[error,setError]=useState('');
  const [workspaces,setWorkspaces]=useState<Workspace[]>([]),[activeId,setActiveId]=useState<string|null>(null);
  useEffect(()=>{
    if(!auth)return;
    return onAuthStateChanged(auth,u=>{setUser(u);setWorkspaces([]);setActiveId(null);setReady(true);},e=>{setError(e.message);setReady(true);});
  },[]);
  async function refreshFor(uid:string){
    try{
      const listed=await listWorkspaces(uid);setWorkspaces(listed);
    }catch(e){setError(e instanceof Error?e.message:'Could not load workspaces.');}
  }
  useEffect(()=>{if(user)void refreshFor(user.uid);},[user]);
  const active=workspaces.find(w=>w.id===activeId)||null;
  const value=useMemo<AccountValue>(()=>({
    user,ready,error,workspaces,active,
    login:async()=>{if(!auth)throw new Error('Firebase is not configured.');try{setError('');await signInWithPopup(auth,googleProvider);}catch(e){setError(e instanceof Error?e.message:'Google login failed.');throw e;}},
    logout:async()=>{if(auth)await signOut(auth);setActiveId(null);},
    create:async(name,kind)=>{if(!user)throw new Error('Sign in first.');const w=await createWorkspace(user.uid,name,kind);setWorkspaces(prev=>[...prev,w].sort((a,b)=>a.name.localeCompare(b.name)));setActiveId(w.id);},
    choose:id=>setActiveId(id),refresh:async()=>{if(user)await refreshFor(user.uid);},clearError:()=>setError(''),
  }),[user,ready,error,workspaces,active]);
  return <Account.Provider value={value}>{children}</Account.Provider>;
}
export function useAccount(){const c=useContext(Account);if(!c)throw new Error('AccountProvider missing');return c;}
