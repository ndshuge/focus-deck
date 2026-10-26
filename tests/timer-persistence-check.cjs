/* Focus Deck local Edge smoke tests: no packages or publishing required. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {setTimeout:sleep}=require('node:timers/promises');
const project=path.resolve(__dirname,'..');
const edgePath='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'focus-deck-check-'));
let edge=null, ws=null, server=null, seq=0;
const pending=new Map();
async function waitFor(fn,timeout=15000){
 const start=Date.now();
 while(Date.now()-start<timeout){try{const result=await fn();if(result)return result}catch{}
 await sleep(100)}
 throw Error('Timed out waiting for browser state');
}
async function launch(){
 server=http.createServer((req,res)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/'){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(fs.readFileSync(path.join(project,'index.html')));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 edge=spawn(edgePath,[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-extensions','--disable-background-networking','--no-sandbox',
  '--remote-debugging-port=0','--remote-allow-origins=*',
  '--user-data-dir='+profile,'about:blank'
 ],{stdio:'ignore',windowsHide:true});
 await waitFor(()=>fs.existsSync(path.join(profile,'DevToolsActivePort')));
 const port=Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0]);
 const tabs=await waitFor(async()=>{
  const res=await fetch('http://127.0.0.1:'+port+'/json');
  const entries=await res.json();
  return entries.find(t=>t.type==='page')?[entries.find(t=>t.type==='page')]:null;
 });
 ws=new WebSocket(tabs[0].webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',e=>{
  const packet=JSON.parse(String(e.data));
  if(packet.id&&!pending.has(packet.id))return;
  if(packet.id){
   const p=pending.get(packet.id);pending.delete(packet.id);
   if(packet.error)p.reject(Error(packet.error.message));
   else p.resolve(packet.result);
  }
 });
 await command('Page.enable');
 await command('Runtime.enable');
 await command('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 await waitFor(async()=>await evaluate("document.readyState==='complete'&&!!document.getElementById('toggle')"));
}
function command(method,params={}){
 const id=++seq;
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timed out: '+method))},12000);
  pending.set(id,{resolve:x=>{clearTimeout(timeout);resolve(x)},reject:e=>{clearTimeout(timeout);reject(e)}});
  ws.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('Page evaluation failed: '+JSON.stringify(result.exceptionDetails));
 return result.result.value;
}
async function reload(){
 await command('Page.reload',{ignoreCache:true});
 await sleep(350);
 await waitFor(()=>evaluate("document.readyState==='complete'&&!!document.getElementById('toggle')"));
}
function log(s){console.log('PASS '+s)}
async function main(){
 await launch();
 assert.equal(await evaluate("document.getElementById('clock').textContent"),'25:00');
 log('Initial timer renders');
 await evaluate("localStorage.setItem('focus-deck-v1',JSON.stringify({tasks:[{id:9,title:'已存在的任务',done:false}],history:{'2026-10-25':50},pomodoros:2}))");
 await reload();
 assert.equal(await evaluate("document.getElementById('taskList').textContent.includes('已存在的任务')"),true);
 assert.equal(await evaluate("document.getElementById('pomodoros').textContent.trim()"),'2 次');
 log('Existing task and statistics data preserved');
 await evaluate("document.getElementById('toggle').click()");
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('focus-deck-v1')).timer.running"),true);
 await sleep(1250);
 await reload();
 assert.equal(await evaluate("document.getElementById('toggle').textContent"),'暂停');
 const active=await evaluate("({text:document.getElementById('clock').textContent,secs:JSON.parse(localStorage.getItem('focus-deck-v1')).timer.remaining})");
 assert.notEqual(active.text,'25:00');
 log('Running timer and deadline survive reload');
 await evaluate("document.getElementById('toggle').click()");
 const paused=await evaluate("JSON.parse(localStorage.getItem('focus-deck-v1')).timer");
 assert.equal(paused.running,false);
 await reload();
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('focus-deck-v1')).timer.remaining"),paused.remaining);
 assert.match(await evaluate("document.getElementById('toggle').textContent"),/继续/);
 log('Paused timer remains paused with seconds preserved');
 await evaluate("document.querySelector('[data-mode=short]').click()");
 await reload();
 assert.equal(await evaluate("document.getElementById('clock').textContent"),'05:00');
 assert.equal(await evaluate("document.querySelector('[data-mode=short]').classList.contains('active')"),true);
 log('Mode persists after reload');
 await evaluate("document.getElementById('taskInput').value='新添加的任务';document.getElementById('taskForm').requestSubmit()");
 await reload();
 assert.equal(await evaluate("document.getElementById('currentTask').textContent"),'新添加的任务');
 log('New tasks and selected task persist after reload');
 await evaluate("document.querySelector('[data-mode=focus]').click()");
 await evaluate("localStorage.setItem('focus-deck-v1',JSON.stringify({...JSON.parse(localStorage.getItem('focus-deck-v1')),timer:{mode:'focus',remaining:1,running:true,endAt:Date.now()-1000,selected:9}}))");
 await reload();
 assert.equal(await evaluate("document.getElementById('pomodoros').textContent.trim()"),'3 次');
 assert.equal(await evaluate("document.getElementById('clock').textContent"),'00:00');
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('focus-deck-v1')).timer.running"),false);
 await reload();
 assert.equal(await evaluate("document.getElementById('pomodoros').textContent.trim()"),'3 次');
 log('Expired timer credits completion once, even after second reload');
 await evaluate("document.getElementById('reset').click()");
 await reload();
 assert.equal(await evaluate("document.getElementById('clock').textContent"),'25:00');
 log('Reset state survives reload');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await sleep(200);
 assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
 log('390px mobile viewport has no horizontal overflow');
 await command('Emulation.setDeviceMetricsOverride',{width:320,height:700,deviceScaleFactor:1,mobile:true});
 await sleep(200);
 assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
 log('320px mobile viewport has no horizontal overflow');
}
(async()=>{try{await main();console.log('RESULT: ALL CHECKS PASSED')}catch(e){console.error('FAIL '+e.stack);process.exitCode=1}finally{
 try{ws?.close()}catch{}
 try{edge?.kill()}catch{}
 if(server)await new Promise(resolve=>server.close(resolve));
 await sleep(500);
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:250})}catch(e){console.warn('Temp browser profile cleanup:',e.message)}
}})();
