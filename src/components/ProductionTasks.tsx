import {useState} from 'react';
import {CalendarDays,ClipboardList,Plus} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Field,Modal,RowItem,SelectField} from './UI';
import {advanceProductionTask,localDate,productionQueue,productionStepLabels,productionStepOrder,saveProductionTask} from '../domain/workflow';
import {useApp} from '../state/AppContext';
import type {ProductionStep,ProductionTask} from '../types';

type TaskDraft={id?:string;name:string;step:ProductionStep;recipeId:string;dueOn:string;notes:string};
const initial=():TaskDraft=>({name:'',step:'planned',recipeId:'',dueOn:'',notes:''});
export function ProductionTasks({selectedRecipe}:{selectedRecipe?:string|null}){
  const {db,setDB,notify,reportError}=useApp();
  const [draft,setDraft]=useState<TaskDraft|null>(null);
  const active=productionQueue(db),finished=db.productionTasks.filter(t=>t.step==='done')
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,6);
  function begin(task?:ProductionTask){
    if(task){setDraft({id:task.id,name:task.name,step:task.step,recipeId:task.recipeId||'',
      dueOn:task.dueOn||'',notes:task.notes||''});return;}
    const recipe=db.recipes.find(r=>r.id===selectedRecipe);
    setDraft({...initial(),recipeId:recipe?.id||'',name:recipe?.name||''});
  }
  function save(){
    if(!draft)return;
    try{
      const next=saveProductionTask(db,{...draft,recipeId:draft.recipeId||undefined});
      setDB(()=>next);notify('Production task saved.');setDraft(null);
    }catch(e){reportError(e);}
  }
  function changeStep(id:string,step:ProductionStep){
    try{const next=advanceProductionTask(db,id,step);setDB(()=>next);
      notify(step==='done'?'Marked finished; inventory quantities were not changed.':'Production stage updated.');
    }catch(e){reportError(e);}
  }
  const today=localDate();
  return <Card title="Production in progress" action={<Button size="sm" variant="secondary" onClick={()=>begin()}><Plus size={16}/> Track work</Button>}>
    <p className="hint">Track extraction, waiting, mixing, or bottling work between sessions. Tracking stages never deducts or creates inventory; record actual measured production separately below.</p>
    {active.length?active.map(task=><div className="production-task" key={task.id}>
      <div className="row-main">
        <strong>{task.name}</strong>
        <small>{task.notes||'No notes'}{task.dueOn?` · Target: ${task.dueOn}`:''}</small>
        {task.dueOn&&task.dueOn<=today&&<small className="text-warning">{task.dueOn===today?'Target date is today':'Past target date — review next step'}</small>}
      </div>
      <SelectField label="Stage" value={task.step} onChange={e=>changeStep(task.id,e.target.value as ProductionStep)}>
        {productionStepOrder.map(step=><option key={step} value={step}>{productionStepLabels[step]}</option>)}
      </SelectField>
      <Button size="sm" variant="ghost" onClick={()=>begin(task)}>Edit</Button>
    </div>):<EmptyState title="No active production tasks" description="Add an upcoming extraction, tea mix, or bottling task; use target dates only when you know them."/>}
    {finished.length>0&&<div className="production-recent">
      <strong>Recently finished</strong>
      {finished.map(t=><RowItem key={t.id} title={t.name} detail={`Completed ${new Date(t.updatedAt).toLocaleDateString()}`} end={<Button variant="ghost" size="sm" onClick={()=>begin(t)}>View</Button>}/>)}
    </div>}
    {draft&&<Modal title={draft.id?'Edit production task':'Track production task'} onClose={()=>setDraft(null)}
      footer={<><Button variant="ghost" onClick={()=>setDraft(null)}>Cancel</Button><Button onClick={save}>Save task</Button></>}>
      <SelectField label="Related formula (optional)" value={draft.recipeId} onChange={e=>{
        const id=e.target.value,recipe=db.recipes.find(r=>r.id===id);
        setDraft(d=>d?{...d,recipeId:id,name:(!d.name.trim()&&recipe)?recipe.name:d.name}:d);
      }}><option value="">Not linked to a formula</option>{db.recipes.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</SelectField>
      <Field label="What are you working on?" value={draft.name} onChange={e=>setDraft(d=>d&&({...d,name:e.target.value}))} placeholder="e.g. Strain chamomile extraction"/>
      <SelectField label="Current stage" value={draft.step} onChange={e=>setDraft(d=>d&&({...d,step:e.target.value as ProductionStep}))}>
        {productionStepOrder.map(step=><option value={step} key={step}>{productionStepLabels[step]}</option>)}
      </SelectField>
      <Field label="Target date (optional)" type="date" value={draft.dueOn} onChange={e=>setDraft(d=>d&&({...d,dueOn:e.target.value}))}/>
      <Field label="Notes (optional)" value={draft.notes} onChange={e=>setDraft(d=>d&&({...d,notes:e.target.value}))} placeholder="Jar, location, or next action"/>
      <p className="hint"><CalendarDays size={14}/> No extraction or cure duration is assumed. Marking a task complete doesn't affect stock; use actual measured batch and packaging records for that.</p>
    </Modal>}
  </Card>;
}
