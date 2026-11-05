// Runs against transpiled copies of the pure domain modules. Use after installing deps or TS compilation.
const assert=require('node:assert/strict');
const {demoDB}=require('./temp/data/demo.cjs');
const i=require('./temp/domain/inventory.cjs');
let d=demoDB();
assert.equal(d.herbs.find(h=>h.id==='demo-chamomile').stock.dry,24);
d=i.adjustStock(d,'demo-chamomile','dry','use',4,'Stock used for sample');
assert.equal(d.herbs.find(h=>h.id==='demo-chamomile').stock.dry,20);
assert.equal(d.movements[0].after,20);
const r=d.recipes.find(x=>x.id==='demo-r1');
const amounts=i.calculateBatch(d,r,5);assert.equal(amounts.length,3);
d=i.completeBatch(d,r.id,5,'Smoketest');assert.equal(d.bulk[r.id],9);
d=i.packageProduct(d,'demo-p1',2);assert.equal(d.bulk[r.id],5);
assert.equal(d.products.find(x=>x.id==='demo-p1').count,5);
assert.throws(()=>i.adjustStock(d,'demo-chamomile','dry','use',500,'No stock'));
d=i.extractStock(d,'demo-chamomile','dry',1,3,'Measured test yield');
assert.equal(d.herbs.find(h=>h.id==='demo-chamomile').stock.extract,13);
console.log('Botanica domain smoke checks passed.');
