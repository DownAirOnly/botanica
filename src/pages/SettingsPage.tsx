import {useEffect,useState,type ChangeEvent} from 'react';
import {AlertTriangle,Database,Download,FileSpreadsheet,HardDrive,Info,RefreshCcw,Upload,ShieldCheck} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Modal,RowItem,SelectField} from '../components/UI';
import {demoDB,emptyDB} from '../data/demo';
import {downloadJSON,importJSON} from '../lib/storage';
import {previewWorkbook,type ImportKind,type ImportPreview} from '../lib/importers';
import {previewCostWorkbook,applyCostImport,type CostImportPreview} from '../lib/costImport';
import {useApp} from '../state/AppContext';
import {useAccount} from '../state/AccountContext';
export function SettingsPage(){
 const {db,setDB,notify,reportError,syncStatus}=useApp();const {active,user}=useAccount();const [importKind,setImportKind]=useState<ImportKind>('herbs'),[preview,setPreview]=useState<ImportPreview|null>(null),[reading,setReading]=useState(false),[restore,setRestore]=useState<Awaited<ReturnType<typeof importJSON>>|null>(null),[reset,setReset]=useState(false),[resetWord,setResetWord]=useState('');
 const [costPreview,setCostPreview]=useState<CostImportPreview|null>(null);
 const [costSelected,setCostSelected]=useState<string[]>([]),[costReading,setCostReading]=useState(false);
 const [theme,setTheme]=useState(()=>localStorage.getItem('botanica:theme')||'system');
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('botanica:theme',theme);},[theme]);
 async function handleWorkbook(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];e.target.value='';if(!f)return;setReading(true);setPreview(null);try{setPreview(await previewWorkbook(f,importKind,db));}catch(err){reportError(err);}finally{setReading(false);}}
 async function handleBackup(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];e.target.value='';if(!f)return;try{setRestore(await importJSON(f));}catch(err){reportError(err);}}
 async function handleCostWorkbook(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  setCostReading(true);setCostPreview(null);
  try{const next=await previewCostWorkbook(file,db);setCostPreview(next);
    setCostSelected(next.rows.filter(r=>r.status==='ready').map(r=>r.key));
  }catch(err){reportError(err);}finally{setCostReading(false);}
 }
 function confirmCostImport(){
  if(!costPreview)return;
  try{const rows=costPreview.rows.filter(r=>r.status==='ready'&&costSelected.includes(r.key));
    const next=applyCostImport(db,rows,costPreview.fileName);
    if(next===db)notify('All selected supplier quotes are already recorded.');
    else {setDB(()=>next);notify(`Saved ${next.priceQuotes.length-db.priceQuotes.length} new supplier quotes. Stock quantities were not changed.`);}
    setCostPreview(null);setCostSelected([]);
  }catch(err){reportError(err);}
 }
 function confirmImport(){if(!preview)return;setDB(()=>preview.draft);notify(`Imported ${preview.herbsAdded} herbs, ${preview.recipesAdded} recipes, and ${preview.productsAdded} products. Review flagged entries before use.`);setPreview(null);}
 return <div className="content-stack">
  <div className="page-heading"><div><h2>Workspace settings</h2><p>Import and back up your inventory, and manage this private cloud workspace.</p></div><Badge tone={db.mode==='demo'?'warning':'neutral'}>{db.mode==='demo'?'Sample workspace':'Cloud workspace'}</Badge></div>
  <div className="two-columns">
   <Card title="Data backups" action={<HardDrive size={19} className="muted-icon"/>}>
    <p className="body-copy">This workspace is stored in Firebase under your Google account. Export private JSON backups regularly. Restoring replaces this workspace in the cloud.</p>
    <div className="action-bar"><Button onClick={()=>downloadJSON(db)}><Download size={17}/> Export JSON backup</Button><label className="btn btn-secondary btn-md file-button"><Upload size={17}/> Restore JSON<input type="file" accept="application/json,.json" onChange={handleBackup} hidden/></label></div>
    <div className="help-row"><ShieldCheck size={16}/> Backup includes herbs, formulas, prices, batches, movements, containers, production history, review schedules, vendors, and product counts.</div>
   </Card>
   <Card title="Display & preferences">
    <SelectField label="Appearance" value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">Follow device setting</option><option value="light">Light</option><option value="dark">Dark</option></SelectField>
    <RowItem title="App version" end="v8"/><RowItem title="Data schema" end={`v${db.schemaVersion}`}/><RowItem title="Storage" end="Private Cloud Firestore"/><RowItem title="Sync" end={<Badge tone={syncStatus==='saved'?'success':'warning'}>{syncStatus==='saved'?'Saved':syncStatus==='saving'?'Syncing':'Needs attention'}</Badge>}/>
   </Card>
  </div>
  {active?.kind==='herbal'&&<Card title="Import original spreadsheets" action={<FileSpreadsheet size={20} className="muted-icon"/>}>
    <p className="body-copy">Choose a workbook type and the matching XLSX file. Botanica parses it on your device and shows a review before saving. Source XLSX files are parsed in your browser; confirmed imported records are then saved in your private Firestore workspace.</p>
    <div className="import-row"><SelectField label="Workbook type" value={importKind} onChange={e=>setImportKind(e.target.value as ImportKind)}>
      <option value="herbs">MY HERBS.xlsx · Main herbs & powders</option><option value="tinctures">TINCTURE RECIPES.xlsx · Formula ratios</option><option value="teas">Tea Recipes.xlsx · Tea formula ratios</option><option value="products">INVENTORY.xlsx · Finished SKU catalog</option>
    </SelectField><label className={`btn btn-primary btn-md file-button ${reading?'disabled':''}`}><Upload size={17}/>{reading?'Reading workbook...':'Choose XLSX file'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleWorkbook} disabled={reading} hidden/></label></div>
    <div className="help-row"><AlertTriangle size={17}/> Composite quantities, ambiguous labels, and extract units require review. Never treat parsed historical amounts as verified stock counts.</div>
  </Card>}
  {active?.kind==='herbal'&&<Card title="Import supplier prices" action={<FileSpreadsheet size={20} className="muted-icon"/>}>
    <p className="body-copy">Merge the <strong>HERBS COST.xlsx</strong> Master Herb and Powders price sheets into this workspace. Review exact herb matches, suppliers and prices before applying. This never changes on-hand quantities or creates purchases.</p>
    <div className="action-bar">
      <label className={`btn btn-secondary file-button ${costReading?'disabled':''}`}>
        <Upload size={17}/>{costReading?'Reading costs…':'Choose HERBS COST.xlsx'}
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleCostWorkbook} disabled={costReading} hidden/>
      </label>
    </div>
    <p className="hint">Export a JSON backup first. Unknown herbs, conflicting rows, missing suppliers and blank/zero prices are skipped, not guessed. This workbook does not provide quote dates.</p>
  </Card>}
  <Card title="Privacy & environment" action={<Database size={19} className="muted-icon"/>}>
    <RowItem title="Original business spreadsheets" end="Not in public code"/><RowItem title="Signed in" end={user?.email||'Google account'}/><RowItem title="Workspace" end={active?.name||'—'}/><RowItem title="Workspace type" end={active?.kind==='herbal'?'Herbal production':'General inventory'}/><RowItem title="Collaboration" end="Owner only"/>
    <p className="body-copy">Each workspace is owner-only and stored separately in Firebase. Cloud updates are revision-checked to prevent silent cross-device overwrites; this version does not support simultaneous collaboration or guaranteed offline edits.</p>
  </Card>
  <Card title="Start over">
    <p className="body-copy">You can replace this cloud workspace with empty inventory or restore clearly labeled demonstration data. Export a backup before doing either.</p>
    <div className="action-bar"><Button variant="danger" onClick={()=>{setReset(true);setResetWord('');}}><RefreshCcw size={17}/> Reset cloud workspace</Button></div>
  </Card>
  {preview&&<Modal title="Review workbook import" onClose={()=>setPreview(null)} footer={<><Button variant="ghost" onClick={()=>setPreview(null)}>Cancel</Button><Button disabled={preview.herbsAdded+preview.recipesAdded+preview.productsAdded===0} onClick={confirmImport}>Confirm import</Button></>}>
    {preview.replaceDemo&&<div className="alert warning">Confirming removes the sample dataset and starts a real local workspace. Export any desired demo changes first.</div>}
    <div className="metrics-grid compact"><div className="metric"><span className="metric-label">Herbs added</span><strong className="metric-value">{preview.herbsAdded}</strong></div><div className="metric"><span className="metric-label">Recipes added</span><strong className="metric-value">{preview.recipesAdded}</strong></div><div className="metric"><span className="metric-label">SKUs added</span><strong className="metric-value">{preview.productsAdded}</strong></div></div>
    <h3 className="subheading">Warnings ({preview.warnings.length})</h3>
    {preview.warnings.length?<div className="warnings-scroll">{preview.warnings.map((w,i)=><p key={i}><AlertTriangle size={14}/>{w}</p>)}</div>:<EmptyState title="No parser warnings" description="Still verify imported counts against physical inventory."/>}
    <p className="hint">Imported records become editable in the app. Ambiguous quantities are not automatically guessed or converted.</p>
  </Modal>}
  {costPreview&&<Modal title="Review supplier prices" onClose={()=>setCostPreview(null)}
    footer={<><Button variant="ghost" onClick={()=>setCostPreview(null)}>Cancel</Button>
      <Button disabled={!costSelected.length} onClick={confirmCostImport}>Import {costSelected.length} prices</Button></>}>
    <p className="body-copy">Only checked, exact-matched prices will be added to quote history. Existing stock, receipts and formulas stay unchanged.</p>
    <div className="cost-import-counts">
      <span><strong>{costPreview.rows.filter(r=>r.status==='ready').length}</strong> ready</span>
      <span><strong>{costPreview.rows.filter(r=>r.status==='unchanged').length}</strong> unchanged</span>
      <span><strong>{costPreview.rows.filter(r=>!['ready','unchanged','no-price','duplicate'].includes(r.status)).length}</strong> needs review</span>
    </div>
    <div className="cost-review-list">
      {costPreview.rows.map(row=><label className={`cost-review-row ${row.status==='ready'?'':'not-ready'}`} key={row.key}>
        <input type="checkbox" checked={row.status==='ready'&&costSelected.includes(row.key)}
          disabled={row.status!=='ready'}
          onChange={e=>setCostSelected(previous=>e.target.checked?[...previous,row.key]:previous.filter(k=>k!==row.key))}/>
        <span><strong>{row.herbName}</strong><small>{row.sheet} · row {row.rowNumber} · {row.form==='dry'?'Dried herb':'Powder'} · {row.vendorName||'No supplier'}</small>
          {row.status!=='ready'&&<small className="text-warning">{row.detail}</small>}
          {row.matchedName&&row.matchedName!==row.herbName&&<small>Matches: {row.matchedName}</small>}
        </span>
        <span className="cost-review-price">{row.pricePerLb!=null&&Number.isFinite(row.pricePerLb)&&row.pricePerLb>0?`${row.pricePerLb.toFixed(2)}/lb`:'—'}</span>
      </label>)}
    </div>
    <p className="hint">Unmatched and ambiguous names need manual review. Reimporting the same prices will not duplicate the latest undated quote.</p>
  </Modal>}
  {restore&&<Modal title="Replace cloud workspace?" onClose={()=>setRestore(null)} footer={<><Button variant="ghost" onClick={()=>setRestore(null)}>Cancel</Button><Button variant="danger" onClick={()=>{setDB(()=>restore);setRestore(null);notify('Backup restore queued for cloud save.');}}>Replace with backup</Button></>}><div className="alert warning">This will replace the current cloud workspace data. Make sure the top-right status reads Saved afterward. Export the current workspace before proceeding.</div><p className="body-copy">Backup contains {restore.herbs.length} herbs, {restore.recipes.length} recipes, and {restore.products.length} products.</p></Modal>}
  {reset&&<Modal title="Reset cloud workspace" onClose={()=>setReset(false)} footer={<><Button variant="ghost" onClick={()=>setReset(false)}>Cancel</Button><Button variant="danger" disabled={resetWord!=='RESET'} onClick={()=>{setDB(()=>emptyDB());setReset(false);notify('Empty workspace queued for cloud save.');}}>Erase & start empty</Button><Button variant="secondary" disabled={resetWord!=='RESET'} onClick={()=>{setDB(()=>demoDB());setReset(false);notify('Sample workspace queued for cloud save.');}}>Restore sample</Button></>}><div className="alert warning"><Info size={17}/> This replaces the current private cloud inventory. It cannot be undone without a backup.</div><label className="field"><span className="field-label">Type RESET to continue</span><input value={resetWord} onChange={e=>setResetWord(e.target.value)} autoComplete="off"/></label></Modal>}
 </div>;
}
