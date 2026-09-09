'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}});await page.goto('http://127.0.0.1:8790',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics&&document.getElementById('characterStatus').textContent.includes('待机'));
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();const results=[];
  for(const visible of [false,true]){
   await page.locator('#characterVisible').setChecked(visible);await page.evaluate(()=>document.getElementById('cameraBenchmark').click());await page.waitForTimeout(10000);
   results.push(await page.evaluate(visible=>({visible,benchmark:document.getElementById('benchmarkStatus').textContent,gpu:document.getElementById('gpuName').textContent,cpuMs:document.getElementById('cpuTime').textContent,gpuMs:document.getElementById('gpuTime').textContent}),visible));
  }
  fs.writeFileSync(path.resolve(__dirname,'../docs/character-validation/performance-report.json'),JSON.stringify({viewport:[1600,1000],headless:true,results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
