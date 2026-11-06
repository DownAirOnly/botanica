import {useMemo,useState} from 'react';
import {BarChart3,Clock3,Download,FlaskConical,PackageCheck,X} from 'lucide-react';
import {Badge,Button,Card,EmptyState,Metric,RowItem,SelectField,Tabs} from '../components/UI';
import {eventDay,getProductionSummary,listProductionSubjects,productionBucketStart,
  productionMetricLabels,type ProductionEvent,type ProductionMetric,type ProductionPeriod} from '../domain/productionInsights';
import {formatAmount} from '../types';
import {useApp} from '../state/AppContext';

const SOURCES={
  batch:'Completed batch',extraction:'Measured extraction',
  'make-product':'Make Product run','legacy-packaging':'Previously recorded packaging'
} as const;
function csvCell(value:string|number):string{
  const raw=String(value),safe=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
}
function downloadCSV(rows:ProductionEvent[],unit:string,metric:ProductionMetric){
  const header=['date','item','quantity','unit','record_type','record_id'];
  const data=rows.map(e=>[eventDay(e.at)||e.at,e.name,e.quantity,unit,SOURCES[e.source],e.id]);
  const csv=[header,...data].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const file=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const href=URL.createObjectURL(file),link=document.createElement('a');
  link.href=href;link.download='botanica-production-'+metric+'-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1500);
}
export function ProductionHistoryPage(){
  const {db}=useApp();
  const [metric,setMetric]=useState<ProductionMetric>('tincture');
  const [period,setPeriod]=useState<ProductionPeriod>('month');
  const [subjectId,setSubjectId]=useState('');
  const [bucket,setBucket]=useState<string|null>(null);
  const subjects=useMemo(()=>listProductionSubjects(db,metric),[db,metric]);
  const result=useMemo(()=>getProductionSummary(db,metric,period,undefined,subjectId||undefined),
    [db,metric,period,subjectId]);
  const max=Math.max(1,...result.bars.map(b=>b.value));
  const selectedBar=bucket?result.bars.find(b=>b.start===bucket):undefined;
  const shown=selectedBar?result.visible.filter(e=>productionBucketStart(eventDay(e.at)!,period)===selectedBar.start):
    result.visible;
  const completed=db.batches.length,extractions=db.movements.filter(m=>m.action==='extraction'&&
    m.kind==='ingredient'&&m.form==='extract'&&m.delta>0).length;
  function chooseMetric(v:string){setMetric(v as ProductionMetric);setSubjectId('');setBucket(null);}
  function choosePeriod(v:string){setPeriod(v as ProductionPeriod);setBucket(null);}
  return <div className="content-stack">
    <div className="page-heading"><div><h2>Production history</h2>
      <p>See what was made, when it was made, and how production changes over time.</p>
    </div><Badge tone="neutral">Recorded activity only</Badge></div>
    <div className="metrics-grid compact">
      <Metric label="Recorded batches" value={completed} meta="Tinctures and teas"/>
      <Metric label="Recorded extractions" value={extractions} meta="Measured output events"/>
      <Metric label="Product-making runs" value={db.productionRuns.length} meta="v7 onward"/>
    </div>
    <Card title="Production pace" action={<BarChart3 size={19} className="muted-icon"/>}>
      <div className="production-history-controls">
        <Tabs value={metric} onChange={chooseMetric} options={[
          {id:'tincture',label:'Tincture batches'},
          {id:'extract',label:'Herb extractions'},
          {id:'tea',label:'Tea batches'},
          {id:'finished',label:'Finished units'}
        ]}/>
        <Tabs value={period} onChange={choosePeriod}
          options={[{id:'week',label:'Weekly'},{id:'month',label:'Monthly'}]}/>
      </div>
      <div className="production-filter-row">
        <SelectField label="Formula or product" value={subjectId}
          onChange={e=>{setSubjectId(e.target.value);setBucket(null);}}>
          <option value="">All recorded {metric==='extract'?'herbs':metric==='finished'?'products':'formulas'}</option>
          {subjects.map(s=><option key={s.id} value={s.id}>{s.name} ({s.events} records)</option>)}
        </SelectField>
        <Button variant="secondary" size="sm" disabled={shown.length===0}
          onClick={()=>downloadCSV(shown,result.unit,metric)}>
          <Download size={15}/> Export shown CSV
        </Button>
      </div>
      <p className="hint">{productionMetricLabels[metric]} · Last {result.periods} {period==='month'?'months':'weeks'}, including periods with no recorded activity</p>
      <div className="metrics-grid compact production-history-metrics">
        <Metric label="Recorded total" value={formatAmount(result.total)+' '+result.unit}/>
        <Metric label={'Average per '+(period==='month'?'month':'week')}
          value={formatAmount(result.average)+' '+result.unit}/>
        <Metric label="Production records" value={result.records}/>
      </div>
      <div className="production-bars" role="group"
        aria-label={productionMetricLabels[metric]+' by '+period+'. Select a bar to filter the records below.'}>
        {result.bars.map(b=><button type="button"
          className={'production-bar-column production-bar-button'+(bucket===b.start?' active':'')}
          key={b.start} aria-pressed={bucket===b.start}
          aria-label={b.label+': '+formatAmount(b.value)+' '+result.unit+'. '+(bucket===b.start?'Clear period filter':'Filter records to this period')}
          onClick={()=>setBucket(previous=>previous===b.start?null:b.start)}>
          <span className="production-bar-value">{b.value?formatAmount(b.value):'0'}</span>
          <span className="production-bar-track">
            <span className="production-bar-fill" style={{height:(b.value/max*100)+'%'}}/>
          </span>
          <span className="production-bar-label">{b.label}</span>
        </button>)}
      </div>
      <div className="production-drilldown">
        <span>{selectedBar?'Records from '+selectedBar.label+': '+shown.length:'Showing records across the displayed '+result.periods+' '+(period==='month'?'months':'weeks')}</span>
        {selectedBar&&<Button variant="ghost" size="sm" onClick={()=>setBucket(null)}><X size={14}/> All periods</Button>}
      </div>
      <p className="hint">These are recorded quantities, not sales or demand. Tincture batch volume, single-herb extract output, tea weight and finished units are separate measurements and are never combined.</p>
    </Card>
    <div className="two-columns">
      <Card title={subjectId?'Selected item':'Top by recorded quantity'}>
        {result.leaders.length?result.leaders.map((item,i)=>
          <button key={item.subjectId} className="production-leader-row" type="button"
            aria-label={'Filter to '+item.name} onClick={()=>{setSubjectId(item.subjectId);setBucket(null);}}>
            <span><strong>{i+1}. {item.name}</strong><small>{item.events} recorded {item.events===1?'event':'events'}</small></span>
            <strong>{formatAmount(item.quantity)} {result.unit}</strong>
          </button>):
          <EmptyState title="No records in this period"
            description="Make a batch, record an extraction, or complete Make Product to build a useful history."/>}
        {subjectId&&<div className="card-footer"><Button variant="ghost" onClick={()=>{setSubjectId('');setBucket(null);}}>
          <X size={14}/> Show all products and formulas</Button></div>}
      </Card>
      <Card title={selectedBar?'Records in '+selectedBar.label:'Recent production records'} action={<Clock3 size={18} className="muted-icon"/>}>
        {shown.length?shown.slice(0,30).map(e=><RowItem key={e.source+e.id}
          title={e.name} detail={(eventDay(e.at)||e.at)+' · '+SOURCES[e.source]}
          end={formatAmount(e.quantity)+' '+result.unit}/>):
          <EmptyState title="No recorded activity"
            description="Change the product or period to explore another portion of the production history."/>}
        {shown.length>30&&<p className="hint">Showing the latest 30 of {shown.length} records. Export shown CSV for the entire filtered set.</p>}
      </Card>
    </div>
    <p className="hint"><FlaskConical size={14}/> Older workbook notes aren't assumed to be completed production. Existing batches, measured extractions and earlier packaging movements are included without duplicating newer linked Make Product runs. <PackageCheck size={14}/> Finished units aren't a proxy for customer sales. CSVs are generated locally on this device and aren't published to GitHub.</p>
  </div>;
}
