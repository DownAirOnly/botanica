import {useEffect,useId,type ButtonHTMLAttributes,type ReactNode,type InputHTMLAttributes,type SelectHTMLAttributes} from 'react';
import {X} from 'lucide-react';
export function Card({children,className='',title,action}:{children:ReactNode;className?:string;title?:string;action?:ReactNode}){
 return <section className={`card ${className}`}>
  {title&&<div className="card-header"><h3>{title}</h3>{action}</div>}{children}
 </section>;
}
export function Button({children,variant='primary',size='md',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'|'danger';size?:'sm'|'md'|'lg'}){
 return <button {...props} className={`btn btn-${variant} btn-${size} ${className}`}>{children}</button>;
}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'warning'|'success'|'danger'}){return <span className={`badge badge-${tone}`}>{children}</span>;}
export function Field({label,hint,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;hint?:string}){
 const id=useId();return <label className="field" htmlFor={id}><span className="field-label">{label}</span><input id={id} {...props}/>{hint&&<span className="field-hint">{hint}</span>}</label>;
}
export function SelectField({label,children,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label:string;children:ReactNode}){
 const id=useId();return <label className="field" htmlFor={id}><span className="field-label">{label}</span><select id={id} {...props}>{children}</select></label>;
}
export function Metric({label,value,meta}:{label:string;value:ReactNode;meta?:ReactNode}){return <div className="metric"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong>{meta&&<small className="metric-meta">{meta}</small>}</div>;}
export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}){return <div className="empty"><strong>{title}</strong>{description&&<p>{description}</p>}{action}</div>;}
export function Modal({title,children,onClose,footer}:{title:string;children:ReactNode;onClose:()=>void;footer?:ReactNode}){
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-label={title}>
  <header className="modal-header"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header>
  <div className="modal-body">{children}</div>{footer&&<footer className="modal-footer">{footer}</footer>}
 </section></div>;
}
export function Tabs({options,value,onChange}:{options:{id:string;label:string}[];value:string;onChange:(v:string)=>void}){return <div className="tabs" role="tablist" aria-label="Page sections">{options.map(t=><button key={t.id} type="button" role="tab" aria-selected={value===t.id} className={value===t.id?'active':''} onClick={()=>onChange(t.id)}>{t.label}</button>)}</div>;}
export function RowItem({title,detail,end,onClick}:{title:string;detail?:ReactNode;end?:ReactNode;onClick?:()=>void}){
 const inner=<><div className="row-main"><strong>{title}</strong>{detail&&<small>{detail}</small>}</div>{end&&<div className="row-end">{end}</div>}</>;
 return onClick?<button className="row-item row-click" onClick={onClick}>{inner}</button>:<div className="row-item">{inner}</div>;
}
