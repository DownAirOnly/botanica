import type {PackagingCategory,PackagingSupply} from '../types';

const GROUPS:Record<PackagingCategory,readonly string[]>={
  'Amber bottles':['2 oz','4 oz','Elderberry','Sample'],
  'Spray bottles':['2 oz','4 oz'],
  'Salve tins':['Small','Big','Sample'],
  'Tea bags':['Small','Big','Essiac','Parasite'],
  'Plastic bottles':['Small','Big'],
};
/** Stable catalog references, zero opening quantities, no invented physical counts. */
export function defaultPackagingSupplies():PackagingSupply[]{
  return Object.entries(GROUPS).flatMap(([group,variants])=>
    variants.map(variant=>({
      id:'pack-'+group.toLowerCase().replace(/[^a-z]+/g,'-')+'-'+variant.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
      category:group as PackagingCategory,variant,count:0,threshold:0,
    })));
}
export const PACKAGING_CATEGORIES=Object.keys(GROUPS) as PackagingCategory[];
export const packagingName=(s:PackagingSupply)=>`${s.category} · ${s.variant}`;
