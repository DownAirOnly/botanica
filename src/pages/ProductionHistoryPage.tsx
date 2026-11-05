import {useMemo,useState} from 'react';
import {BarChart3,Clock3,FlaskConical,PackageCheck} from 'lucide-react';
import {Badge,Card,EmptyState,Metric,RowItem,Tabs} from '../components/UI';
import {eventDay,getProductionSummary,productionMetricLabels,
  type ProductionMetric,type ProductionPeriod} from '../domain/productionInsights';
import {formatAmount} from '../types';
import {useApp} from '../state/AppContext';

const SOURCES={
  batch:'Completed batch',extraction:'Measured extraction',
  'make-product':'Make Product run','legacy-packaging':'Previously recorded packaging'
} as const;
export function ProductionHistoryPage(){
  const {db}=useApp();
  const [metric,setMetric]=useState<ProductionMetric>('tincture');
  const [period,setPeriod]=useState<ProductionPeriod>('month');
  const result=useMemo(()=>getProductionSummary(db,metric,period),[db,metric,period]);
  const max=Math.max(1,...result.bars.map(b=>b.value));
  const completed=db.batches.length,extractions=db.movements.filter(m=>m.action==='extraction'&&
    m.kind==='ingredient'&&m.form==='extract'&&m.delta>0).length;
  return <div className="content-stack">
    <div className="page-heading"><div><h2>Production history</h2>
      <p>See how frequently products are made, compare recorded periods, and recall what was produced.</p>
    </div><Badge tone="neutral">Recorded activity only</Badge></div>
    <div className="metrics-grid compact">
      <Metric label="Recorded batches" value={completed} meta="Tinctures and teas"/>
      <Metric label="Recorded extractions" value={extractions} meta="Measured output events"/>
      <Metric label="Product-making runs" value={db.productionRuns.length} meta="v7 onward"/>
    </div>
    <Card title="Production pace" action={<BarChart3 size={19} className="muted-icon"/>}>
      <div className="production-history-controls">
        <Tabs value={metric} onChange={v=>setMetric(v as ProductionMetric)} options={[
          {id:'tincture',label:'Tincture batches'},
          {id:'extract',label:'Herb extractions'},
          {id:'tea',label:'Tea batches'},
          {id:'finished',label:'Finished units'}
        ]}/>
        <Tabs value={period} onChange={v=>setPeriod(v as ProductionPeriod)}
          options={[{id:'week',label:'Weekly'},{id:'month',label:'Monthly'}]}/>
      </div>
      <p className="hint">{productionMetricLabels[metric]} · Last {result.periods} {period==='month'?'months':'weeks'}, including periods with no recorded activity</p>
      <div className="metrics-grid compact production-history-metrics">
        <Metric label="Recorded total" value={formatAmount(result.total)+' '+result.unit}/>
        <Metric label={'Average per '+(period==='month'?'month':'week')}
          value={formatAmount(result.average)+' '+result.unit}/>
        <Metric label="Production records" value={result.records}/>
      </div>
      <div className="production-bars" role="img"
        aria-label={productionMetricLabels[metric]+' by '+period+': '+result.bars.map(b=>b.label+' '+formatAmount(b.value)+' '+result.unit).join('; ')}>
        {result.bars.map(b=><div className="production-bar-column" key={b.start}>
          <span className="production-bar-value">{b.value?formatAmount(b.value):'0'}</span>
          <div className="production-bar-track">
            <div className="production-bar-fill" style={{height:(b.value/max*100)+'%'}}/>
          </div>
          <span className="production-bar-label">{b.label}</span>
        </div>)}
      </div>
      <p className="hint">These are recorded quantities, not sales or demand. Tincture batch volume, single-herb extract output, tea weight and finished units are deliberately kept separate; they are not added together.</p>
    </Card>
    <div className="two-columns">
      <Card title="Top by recorded quantity">
        {result.leaders.length?result.leaders.map((item,i)=><RowItem key={item.name}
          title={(i+1)+'. '+item.name}
          detail={item.events+' recorded '+(item.events===1?'event':'events')}
          end={formatAmount(item.quantity)+' '+result.unit}/>):
          <EmptyState title="No records in this period"
            description="Make a batch, record an extraction, or complete Make Product to build a useful history."/>}
      </Card>
      <Card title="Recent production records" action={<Clock3 size={18} className="muted-icon"/>}>
        {result.recent.length?result.recent.slice(0,10).map(e=><RowItem key={e.source+e.id}
          title={e.name} detail={(eventDay(e.at)||e.at)+' · '+SOURCES[e.source]}
          end={formatAmount(e.quantity)+' '+result.unit}/>):
          <EmptyState title="No recorded activity" description="Change the period or category to explore a different production history."/>}
      </Card>
    </div>
    <p className="hint"><FlaskConical size={14}/> Earlier workbook notes are not automatically counted as completed production. Existing batches, measured extractions and historical packaging movements are included where recorded, without duplicating newer linked Make Product runs. <PackageCheck size={14}/> Finished units are not a proxy for customer sales.</p>
  </div>;
}
