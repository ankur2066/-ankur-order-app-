/** Load the actual generated localization runtime; only React context/platform is injected. */
import{readFileSync}from'node:fs';import{createRequire}from'node:module';import{resolve}from'node:path';import{SourceTextModule,SyntheticModule}from'node:vm';
export async function uiModule(context,React,getLanguage=()=> 'en',root=process.env.ANKUR_CLIENT_APP||process.env.ANKUR_COMBINED_SOURCE||process.cwd()){
 const require=createRequire(resolve(root,'package.json')),source=readFileSync(resolve(root,'src/i18n/UiText.tsx'),'utf8'),{transformSync}=require('esbuild');
 const bindings={react:{...React,default:React},'react/jsx-runtime':require('react/jsx-runtime'),'../context/LanguageContext':{useLanguage:()=>({language:getLanguage()})},'./messages.json':{default:JSON.parse(readFileSync(resolve(root,'src/i18n/messages.json'),'utf8'))}};
 const m=new SourceTextModule(transformSync(source,{loader:'tsx',jsx:'automatic',format:'esm'}).code,{context});await m.link(name=>{if(!bindings[name])throw Error('Unexpected localization dependency '+name);return new SyntheticModule(Object.keys(bindings[name]),function(){for(const[k,v]of Object.entries(bindings[name]))this.setExport(k,v);},{context});});await m.evaluate();return m;
}
