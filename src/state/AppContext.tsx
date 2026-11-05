import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import type {BotanicaDB} from '../types';
import {loadWorkspace,saveWorkspace} from '../lib/workspaces';
import {useAccount} from './AccountContext';

type SyncStatus='saved'|'saving'|'error';
interface ContextValue {
 db:BotanicaDB;setDB:(update:(prev:BotanicaDB)=>BotanicaDB)=>void;
 notice:string;notify:(s:string)=>void;error:string;reportError:(e:unknown)=>void;
 persisted:boolean;syncStatus:SyncStatus;
}
const Context=createContext<ContextValue|null>(null);
export function AppProvider({children}:{children:ReactNode}){
 const {active,user}=useAccount();
 const [db,setDBState]=useState<BotanicaDB|null>(null);
 const [notice,setNotice]=useState(''),[error,setError]=useState('');
 const [syncStatus,setSyncStatus]=useState<SyncStatus>('saved');
 const [loadError,setLoadError]=useState('');
 const dbRef=useRef<BotanicaDB|null>(null);
 const revisionRef=useRef(0);
 const queueRef=useRef<Promise<void>>(Promise.resolve());
 const pendingRef=useRef(0);
 const blockedRef=useRef(false);
 const mountedRef=useRef(true);
 useEffect(()=>{
   mountedRef.current=true;
   if(!active||!user)return;
   let cancelled=false;
   void loadWorkspace(active.id,user.uid).then(result=>{
     if(cancelled)return;
     dbRef.current=result.db;revisionRef.current=result.revision;setDBState(result.db);
   }).catch(err=>{if(!cancelled)setLoadError(err instanceof Error?err.message:'Could not load workspace.');});
   return ()=>{cancelled=true;mountedRef.current=false;};
 },[active?.id,user?.uid]);
 const setDB=useCallback((update:(prev:BotanicaDB)=>BotanicaDB)=>{
   if(!active||!user||!dbRef.current||blockedRef.current){setError('Workspace is not ready or has a sync conflict. Export a backup before reloading.');return;}
   let next:BotanicaDB;
   try{next=update(dbRef.current);}catch(e){setError(e instanceof Error?e.message:'Could not update inventory.');return;}
   dbRef.current=next;setDBState(next);
   pendingRef.current+=1;setSyncStatus('saving');
   const id=active.id,uid=user.uid;
   queueRef.current=queueRef.current.then(async()=>{
     if(blockedRef.current)return;
     const revision=await saveWorkspace(id,uid,next,revisionRef.current);
     revisionRef.current=revision;
     pendingRef.current-=1;
     if(mountedRef.current&&pendingRef.current===0)setSyncStatus('saved');
   }).catch(e=>{
     blockedRef.current=true;
     if(mountedRef.current){
       setSyncStatus('error');
       setError((e instanceof Error?e.message:String(e))+' Changes in this session have not been confirmed in the cloud. Export the current JSON backup before reloading.');
     }
   });
 },[active?.id,user?.uid]);
 const value=useMemo<ContextValue|null>(()=>db?({
   db,setDB,notice,notify:s=>{setNotice(s);setError('');},error,
   reportError:e=>{setError(e instanceof Error?e.message:'Unexpected error.');setNotice('');},
   persisted:syncStatus!=='error',syncStatus,
 }):null,[db,setDB,notice,error,syncStatus]);
 if(loadError)return <div className="gate-wrap"><div className="gate-main"><h2>Could not open workspace</h2><div className="alert error">{loadError}</div><button className="btn btn-secondary" onClick={()=>window.location.reload()}>Retry</button></div></div>;
 if(!value)return <div className="gate-wrap"><div className="gate-main"><h2>Loading inventory…</h2><p>Opening your private cloud workspace.</p></div></div>;
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp(){const ctx=useContext(Context);if(!ctx)throw new Error('AppProvider missing');return ctx;}
