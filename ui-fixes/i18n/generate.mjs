/** Development-time compiler pass. CI only applies reviewed, hash-bound source edits. */
import{createRequire}from'node:module';import{readFileSync,readdirSync,writeFileSync}from'node:fs';import{resolve,join,dirname,relative,basename}from'node:path';import{createHash}from'node:crypto';
const app=resolve(process.argv[2]),require=createRequire(join(app,'package.json')),ts=require('typescript'),root=join(app,'src');
const messages=JSON.parse(readFileSync(new URL('./messages.json',import.meta.url),'utf8')),changes=[],missing=new Set();
const skip=new Set(['CustomerHome.tsx','OrderTrackingView.tsx','AppUpdateNotice.tsx','__none__']);
const letters=/[A-Za-z\u0900-\u097F]/;
function decode(s){return s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n));}
function normalized(s){return decode(s.split(/\r\n|\n|\r/).map(x=>x.trim()).filter(Boolean).join(' ')).replace(/\s+/g,' ').trim();}
function has(key){if(key.includes('@'))return false;if(!messages[key]){missing.add(key);return false;}return true;}
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory()){if(e.name!=='i18n')walk(path);continue;}if(!path.endsWith('.tsx')||skip.has(e.name))continue;
 const source=readFileSync(path,'utf8'),sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];let usedL=false,usedUI=false;
 const edit=(start,end,text)=>edits.push({start:Array.from(source.slice(0,start)).length,end:Array.from(source.slice(0,end)).length,text});
 const element=key=>{usedL=true;return'<L id={'+JSON.stringify(key)+'}/>';};
 function uiExpression(n){
  if(ts.isStringLiteralLike(n)){const key=normalized(n.text);if(letters.test(key)&&has(key))edit(n.getStart(sf),n.end,element(key));return;}
  if(ts.isConditionalExpression(n)){uiExpression(n.whenTrue);uiExpression(n.whenFalse);return;}
  if(ts.isBinaryExpression(n)&&[ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken,ts.SyntaxKind.AmpersandAmpersandToken].includes(n.operatorToken.kind)){uiExpression(n.right);return;}
  if(ts.isTemplateExpression(n)){const key=normalized(n.head.text+n.templateSpans.map((s,i)=>'{'+i+'}'+s.literal.text).join(''));if(letters.test(key)&&has(key)){usedL=true;edit(n.getStart(sf),n.end,'<L id={'+JSON.stringify(key)+'} values={['+n.templateSpans.map(s=>'String('+s.expression.getText(sf)+')').join(',')+']}/>');}return;}
  const text=n.getText(sf);
  const named=ts.isIdentifier(n)&&/^(errorMsg|error|successMsg|notice|notificationMessage|shareFeedback|reorderNotice|message|titleText|label|title|subtitle|statusLabel|buttonText|errorText|monthlyReportError|receiptError|statusMessage|promoNotice|pdfError)$/.test(text);
  const field=ts.isPropertyAccessExpression(n)&&(['label','error'].includes(n.name.text)||(n.name.text==='status'&&!/payment/.test(text))||(['item.hi','item.short','t.hindi','theme.title','theme.badge','ACTION_LABELS[a]'].includes(text))||(/OwnerStorefrontManager/.test(path)&&text==='msg.text')||(/Notification/.test(basename(path))&&['title','body'].includes(n.name.text)));
  const call=ts.isCallExpression(n)&&/^(getStatusLabel|getStatusHindi|getPaymentLabel|statusText|quantityText|categoryLabel|timeLabel)$/.test(n.expression.getText(sf));
  const referenceDistrict=(text==='d'&&['FeatureHub.tsx','AdminDashboard.tsx','StaffDashboard.tsx'].includes(basename(path)));const actionLabel=text==='ACTION_LABELS[a]';if(named||field||call||referenceDistrict||actionLabel){usedL=true;edit(n.getStart(sf),n.end,'<L text={'+text+'}/>');}
 }
 function visit(n){
  if(ts.isJsxText(n)){const key=normalized(n.getText(sf));if(letters.test(key)&&has(key)){const raw=n.getText(sf),single=!/[\r\n]/.test(raw),before=single&&/^\s/.test(raw)?'{" "}':'',after=single&&/\s$/.test(raw)?'{" "}':'';edit(n.getStart(sf),n.end,before+element(key)+after);}return;}
  if(ts.isJsxExpression(n)&&n.expression&&!ts.isJsxAttribute(n.parent)){uiExpression(n.expression);}
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const attrs=n.attributes.properties.filter(a=>ts.isJsxAttribute(a)&&['title','placeholder','aria-label','alt','label'].includes(a.name.text));
   const translatable=attrs.some(a=>a.initializer&&(ts.isStringLiteral(a.initializer)?letters.test(a.initializer.text):/["'`]/.test(a.initializer.getText(sf))));
   if(translatable){usedUI=true;const name=n.tagName.getText(sf),as=/^[a-z]/.test(name)?JSON.stringify(name):'{'+name+'}';edit(n.tagName.getStart(sf),n.tagName.end,'UI as='+as);if(ts.isJsxOpeningElement(n)){const close=n.parent.closingElement.tagName;edit(close.getStart(sf),close.end,'UI');}}
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);if(!edits.length)continue;
 const importPath=relative(dirname(path),join(root,'i18n','UiText')).replaceAll('\\','/');edit(0,0,'import {'+[usedL?'L':null,usedUI?'UI':null].filter(Boolean).join(',')+"} from '"+(importPath.startsWith('.')?importPath:'./'+importPath)+"';\n");
 edits.sort((a,b)=>a.start-b.start||a.end-b.end);for(let i=1;i<edits.length;i++)if(edits[i].start<edits[i-1].end)throw Error('Overlapping edits: '+relative(app,path));
 changes.push({path:relative(app,path),sha256:createHash('sha256').update(source).digest('hex'),edits});
 }}
walk(root);writeFileSync(new URL('./edits.json',import.meta.url),JSON.stringify(changes,null,2)+'\n');writeFileSync('/workspace/ui-language-transform-missing.json',JSON.stringify([...missing],null,2));console.log({files:changes.length,edits:changes.reduce((n,c)=>n+c.edits.length,0),missing:missing.size});

if(missing.size)process.exitCode=1;
