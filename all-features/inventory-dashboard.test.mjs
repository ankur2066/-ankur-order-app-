/** Execute each real reconstructed dashboard status handler; mock only service/SDK boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {SourceTextModule,createContext} from 'node:vm';
const root=process.env.ANKUR_CLIENT_APP||process.cwd();const require=createRequire(resolve(root,'package.json'));const{transformSync}=require('esbuild');
async function run(name,{handled=false,throws=false,permission=true}={}){
 const source=readFileSync(resolve(root,'src/components/'+name+'.tsx'),'utf8');const start=source.indexOf('  const handleUpdateStatus = async (ord: Order, newStatus: OrderStatus) => {');assert.ok(start>=0);const end=source.indexOf('\n  };',start)+5;
 const writes=[],calls=[],errors=[],successes=[];let commits=0;
 const context=createContext({console:{error(){}},document:{documentElement:{dataset:{}}},canUpdate:permission,db:{},setTimeout(){},setActionLoadingId(){},setUpdatingId(){},setErrorMsg:v=>errors.push(v),setSuccessMsg:v=>successes.push(v),setOrders(){},getStatusHindi:s=>s,serverTimestamp:()=>'<server>',resolvedOrderRef:id=>'private/'+id,resolvedTrackingRef:token=>'tracking/'+token,tryInventoryDispatch:async(id,status)=>{calls.push({id,status});if(throws)throw Error('Trusted dispatch failed');return handled;},writeBatch:()=>({update:(ref,data)=>writes.push({ref,data}),commit:async()=>{commits++;}})});
 const m=new SourceTextModule(transformSync('export '+source.slice(start,end).trim(),{loader:'ts',format:'esm'}).code,{context});await m.link(()=>{throw Error('Unexpected import');});await m.evaluate();await m.namespace.handleUpdateStatus({orderId:'ADI-INVENTORY-TEST',trackingToken:'ADI-INVENTORY-TEST_123456',billingVersion:1},'dispatched');return{calls,writes,errors,successes,commits};
}
for(const name of ['AdminDashboard','StaffDashboard']){
 test(name+' skips the old batch after a successful trusted inventory dispatch',async()=>{const h=await run(name,{handled:true});assert.equal(h.calls.length,1);assert.equal(h.commits,0);assert.equal(h.writes.length,0);assert.equal(h.successes.length,1);});
 test(name+' preserves paired status/projection and timestamps when inventory is disabled',async()=>{const h=await run(name);assert.equal(h.commits,1);assert.equal(h.writes.length,2);assert.equal(h.writes[0].data.status,'dispatched');assert.equal(h.writes[1].data.status,'dispatched');assert.equal(h.writes[0].data.updatedAt,'<server>');assert.equal(h.writes[1].data.updatedAt,'<server>');});
 test(name+' reports trusted-operation failure without performing fallback dispatch',async()=>{const h=await run(name,{throws:true});assert.equal(h.commits,0);assert.equal(h.writes.length,0);assert.equal(h.successes.length,0);assert.ok(h.errors.some(e=>e?.includes('Trusted dispatch failed')));});
}
test('revoked staff never starts a service call or legacy batch',async()=>{const h=await run('StaffDashboard',{permission:false});assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);assert.equal(h.commits,0);});
