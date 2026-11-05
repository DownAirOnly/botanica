import {useState} from 'react';
import {Plus,ShoppingCart} from 'lucide-react';
import {Button,Card,EmptyState,Field,Modal,RowItem,SelectField} from './UI';
import {useApp} from '../state/AppContext';
import {latestPriceQuote,quoteVendor,recordPriceQuote} from '../domain/pricing';
import type {Herb,PriceQuote} from '../types';

const money=(price:number)=>`$${price.toFixed(2)}`;
const label=(q:PriceQuote)=>q.form==='dry'?'Dried herb':'Powder';
export function CostsSummary({herb,onMore,onReceive}:{herb:Herb;onMore:()=>void;onReceive:()=>void}){
  const {db}=useApp();
  const dry=latestPriceQuote(db,herb.id,'dry'),powder=latestPriceQuote(db,herb.id,'powder');
  const count=db.purchases.filter(p=>p.herbId===herb.id).length;
  return <Card title="Purchasing & costs">
    <RowItem title="Dried herb / lb" detail={dry?quoteVendor(db,dry):'No supplier quote'} end={dry?money(dry.pricePerLb):'—'}/>
    <RowItem title="Powder / lb" detail={powder?quoteVendor(db,powder):'No supplier quote'} end={powder?money(powder.pricePerLb):'—'}/>
    <RowItem title="Receipts" end={`${count} recorded`}/>
    <p className="hint">Quoted prices are not inventory purchases. Workbook quotes without dates remain undated.</p>
    <div className="card-footer">
      <Button variant="secondary" onClick={onMore}>Manage prices & history</Button>
      <Button variant="ghost" onClick={onReceive}><ShoppingCart size={16}/> Receive stock</Button>
    </div>
  </Card>;
}
export function CostsPanel({herb}:{herb:Herb}){
  const {db,setDB,notify,reportError}=useApp();
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState<'dry'|'powder'>('dry');
  const [vendor,setVendor]=useState(''),[price,setPrice]=useState(''),[date,setDate]=useState(''),[notes,setNotes]=useState('');
  const history=db.priceQuotes.filter(q=>q.herbId===herb.id);
  const dry=latestPriceQuote(db,herb.id,'dry'),powder=latestPriceQuote(db,herb.id,'powder');
  const start=(nextForm:'dry'|'powder')=>{
    const previous=latestPriceQuote(db,herb.id,nextForm);
    setForm(nextForm);setVendor(previous?quoteVendor(db,previous):'');
    setPrice(previous?String(previous.pricePerLb):'');setDate('');setNotes('');setOpen(true);
  };
  const save=()=>{
    try{
      const next=recordPriceQuote(db,{herbId:herb.id,form,vendorName:vendor,
        pricePerLb:Number(price),quotedOn:date||undefined,notes,source:'manual'});
      if(next!==db){setDB(()=>next);notify('Supplier price saved to history.');}
      else notify('That price is already the latest recorded quote.');
      setOpen(false);
    }catch(e){reportError(e);}
  };
  return <div className="content-stack">
    <div className="two-columns">
      {(['dry','powder'] as const).map(kind=>{
        const q=kind==='dry'?dry:powder;
        return <Card key={kind} title={kind==='dry'?'Dried herb pricing':'Powder pricing'}>
          {q?<><strong className="pricing-value">{money(q.pricePerLb)} <small>/ lb</small></strong>
            <RowItem title="Supplier" end={quoteVendor(db,q)}/>
            <RowItem title="Quote date" end={q.quotedOn||'Not provided'}/>
            <RowItem title="Price / oz wt" end={money(q.pricePerLb/16)}/></>:
            <EmptyState title="No price recorded" description="Add a supplier quote for this form."/>}
          <Button variant="secondary" onClick={()=>start(kind)}><Plus size={16}/> Record a price</Button>
        </Card>;
      })}
    </div>
    <Card title={`Price history (${history.length})`}>
      {history.length?history.map(q=><RowItem key={q.id}
        title={`${label(q)} · ${money(q.pricePerLb)}/lb`}
        detail={`${quoteVendor(db,q)} · ${q.quotedOn||'Undated quote'} · ${q.source==='purchase'?'Actual purchase price':q.source==='workbook'?'Imported workbook':q.source==='legacy'?'Migrated previous price':'Manual quote'}`}
        end={<span>{new Date(q.recordedAt).toLocaleDateString()}</span>}/>):
        <EmptyState title="No historical quotes" description="Quotes and received purchase prices will appear here."/>}
    </Card>
    {open&&<Modal title={`Record ${form==='dry'?'dried herb':'powder'} price`} onClose={()=>setOpen(false)}
      footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save}>Save price</Button></>}>
      <SelectField label="Herb form" value={form} onChange={e=>{
        const kind=e.target.value as 'dry'|'powder';setForm(kind);
        const q=latestPriceQuote(db,herb.id,kind);setVendor(q?quoteVendor(db,q):'');setPrice(q?String(q.pricePerLb):'');
      }}><option value="dry">Dried herb</option><option value="powder">Powder</option></SelectField>
      <Field label="Supplier name" value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Supplier"/>
      <Field label="Quoted price per pound ($)" type="number" min="0.01" step="any" value={price} onChange={e=>setPrice(e.target.value)}/>
      <Field label="Quote date (optional)" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <Field label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/>
      <p className="hint">This records a supplier price, not a purchase. Current stock and purchase history are unchanged. Leave date blank if the supplier's quote date is unknown.</p>
    </Modal>}
  </div>;
}
