import {
  collection, doc, getDoc, getDocs, query, runTransaction, setDoc, where, writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import {firestore} from './firebase';
import {emptyDB} from '../data/demo';
import {validateBackup} from './storage';
import {makeId, type BotanicaDB} from '../types';

export type WorkspaceKind = 'herbal' | 'general';
export interface Workspace {id:string;name:string;kind:WorkspaceKind;ownerUid:string;createdAt:string;}
export interface CloudSnapshot {db:BotanicaDB;revision:number;}
const database = () => {if(!firestore) throw new Error('Firebase is not configured.');return firestore;};
const workspaceDoc = (id:string) => doc(database(),'workspaces',id);
const dataDoc = (id:string) => doc(database(),'workspaces',id,'data','current');
function fromDoc(id:string,data:DocumentData):Workspace {
  if (typeof data.name!=='string'||typeof data.ownerUid!=='string'||!['herbal','general'].includes(data.kind)) throw new Error('Invalid workspace metadata.');
  return {id,name:data.name,kind:data.kind,ownerUid:data.ownerUid,createdAt:typeof data.createdAt==='string'?data.createdAt:''};
}
export async function listWorkspaces(uid:string):Promise<Workspace[]>{
  const q=query(collection(database(),'workspaces'),where('ownerUid','==',uid));
  const result=await getDocs(q);
  return result.docs.map(d=>fromDoc(d.id,d.data())).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function createWorkspace(uid:string,name:string,kind:WorkspaceKind):Promise<Workspace>{
  if(!uid)throw new Error('Sign in first.');
  const clean=name.trim();if(clean.length<2||clean.length>80)throw new Error('Workspace name must be 2–80 characters.');
  const now=new Date().toISOString();const id=makeId();const workspace:Workspace={id,name:clean,kind,ownerUid:uid,createdAt:now};
  const batch=writeBatch(database());
  batch.set(workspaceDoc(id),{name:clean,kind,ownerUid:uid,createdAt:now});
  batch.set(dataDoc(id),{revision:0,json:JSON.stringify(emptyDB()),updatedAt:now,updatedBy:uid});
  await batch.commit();return workspace;
}
export async function loadWorkspace(id:string,uid:string):Promise<CloudSnapshot>{
  const metadata=await getDoc(workspaceDoc(id));
  if(!metadata.exists()||metadata.data().ownerUid!==uid)throw new Error('Workspace unavailable or access denied.');
  const snap=await getDoc(dataDoc(id));
  if(!snap.exists())throw new Error('Workspace inventory has not been initialized.');
  const payload=snap.data();
  if(typeof payload.json!=='string'||!Number.isSafeInteger(payload.revision))throw new Error('Invalid cloud inventory format.');
  return {db:validateBackup(JSON.parse(payload.json)),revision:payload.revision};
}
export class RevisionConflict extends Error {constructor(){super('This workspace changed on another device. Your unsaved edits are retained on screen; export a backup before reloading.');this.name='RevisionConflict';}}
export async function saveWorkspace(id:string,uid:string,db:BotanicaDB,expectedRevision:number):Promise<number>{
  const json=JSON.stringify(db);
  if(new TextEncoder().encode(json).byteLength>750_000)throw new Error('Workspace data is approaching Firestore’s document limit. Export a backup; this workspace needs collection-based storage before further edits.');
  const reference=dataDoc(id);
  return runTransaction(database(),async transaction=>{
    const snap=await transaction.get(reference);
    if(!snap.exists()||snap.data().revision!==expectedRevision)throw new RevisionConflict();
    transaction.update(reference,{json,revision:expectedRevision+1,updatedAt:new Date().toISOString(),updatedBy:uid});
    return expectedRevision+1;
  });
}
export async function renameWorkspace(workspace:Workspace,name:string):Promise<void>{
  const clean=name.trim();if(clean.length<2||clean.length>80)throw new Error('Name must be 2–80 characters.');
  await setDoc(workspaceDoc(workspace.id),{name:clean},{merge:true});
}
