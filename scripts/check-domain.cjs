// Lightweight offline smoke check using the globally installed TypeScript compiler, if available.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');}
const root=path.resolve(__dirname,'..');const dest=path.join(__dirname,'temp');
for(const rel of ['src/types.ts','src/data/demo.ts','src/domain/inventory.ts']){
 const src=path.join(root,rel),out=path.join(dest,rel.slice(4).replace(/\.ts$/,'.cjs'));
 fs.mkdirSync(path.dirname(out),{recursive:true});let code=ts.transpileModule(fs.readFileSync(src,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/require\(['"]\.\.\/types['"]\)/g,"require('../types.cjs')").replace(/require\(['"]\.\.\/data\/demo['"]\)/g,"require('../data/demo.cjs')");
 fs.writeFileSync(out,code);
}
cp.execFileSync(process.execPath,[path.join(__dirname,'smoke-test.cjs')],{stdio:'inherit'});
fs.rmSync(dest,{recursive:true,force:true});
