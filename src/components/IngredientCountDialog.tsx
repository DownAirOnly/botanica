import {useState} from 'react';
import {Button,Field,Modal} from './UI';
import {adjustStock} from '../domain/inventory';
import {useApp} from '../state/AppContext';
import {FORM_LABEL,FORM_UNIT,formatAmount,unitLabel,type StockForm} from '../types';

/** A physical count in context; returning to the recipe or run does not erase its inputs. */
export function IngredientCountDialog({herbId,form,onClose}:{
 herbId:string;form:StockForm;onClose:()=>void;
}){
 const {db,setDB,notify,reportError}=useApp();
 const [quantity,setQuantity]=useState('');
 const herb=db.herbs.find(h=>h.id===herbId);
 if(!herb)return null;
 function save(){
  try{
   if(!quantity.trim())throw new Error('Enter the amount physically present, including zero.');
   const next=adjustStock(db,herbId,form,'set',Number(quantity),'Physical count confirmed');
   setDB(()=>next);notify('Ingredient physical count verified.');onClose();
  }catch(e){reportError(e);}
 }
 return <Modal title={`Count ${herb.name}`} onClose={onClose}
   footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save count and return</Button></>}>
   <p className="body-copy">{FORM_LABEL[form]} · {unitLabel(FORM_UNIT[form])}. Count what is actually on hand, including zero.</p>
   <Field autoFocus label="Physical quantity" type="number" min="0" step="any" value={quantity} onChange={e=>setQuantity(e.target.value)}/>
   <p className="hint">Recorded amount: {formatAmount(herb.stock[form])} {unitLabel(FORM_UNIT[form])}. Saving replaces it with your verified physical count and records the correction.</p>
 </Modal>;
}
