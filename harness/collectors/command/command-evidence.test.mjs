import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { testSummaries, validateTestProcess, validateBuildLog, outputInventory, packageInventory } from './command-validator.mjs';
import { consumerSource } from './command-collector.mjs';

let root=path.dirname(fileURLToPath(import.meta.url));
while(!fs.existsSync(path.join(root,'harness/core.mjs'))) {
  const parent=path.dirname(root);if(parent===root)throw new Error('Harness root not found');root=parent;
}
const fixtures=JSON.parse(fs.readFileSync(new URL('./command-evidence.fixtures.json',import.meta.url)));
const nativeLog=fixtures.tests.text;
const oldLog=fixtures.skipped.text;
const expected=JSON.parse(fs.readFileSync(new URL('./command-expectations.json',import.meta.url)));
const fakeRepo=path.resolve(root,'artifacts/harness-drafts/browser/unit-workspace');
function packageEvents(name,log=nativeLog) {
  const pathName=name==='local'?'examples/local':'packages/'+name;
  const stdout=log.split(/\r?\n/).filter(line=>line.startsWith(pathName+' test:')).map(line=>line.slice((pathName+' test:').length)).join('\n')
    .replaceAll(fixtures.sourceRepo,normalize(fakeRepo));
  const counts={local:1,runtime:2,transpiler:7,'prettier-plugin':1,'language-server':2,tsc:2};
  const pkg={path:pathName,name:'test-'+name,script:['language-server','tsc'].includes(name)?'vitest run':'vitest',
    files:Array.from({length:counts[name]},(_,i)=>pathName+'/'+i+'.test.ts'),minimumTests:expected.testMinimums.gts[pathName]};
  const events=[{kind:'start',isMainThread:true,cwd:path.join(fakeRepo,pathName),packageName:pkg.name,lifecycle:'test',script:pkg.script},
    {kind:'vitest',module:{path:path.join(fakeRepo,'node_modules/vitest/vitest.mjs')}},
    {kind:'stdout',base64:Buffer.from(stdout).toString('base64')},{kind:'exit',code:0}];
  return{pkg,events};
}
function normalize(s){return s.replaceAll('\\','/');}

test('actual pnpm-prefixed GTS output contains all 89 tests and 15 files',()=>{
  const summary=testSummaries(nativeLog);
  assert.equal(summary.executedTests,89);assert.equal(summary.passedFiles,15);
  assert.equal(summary.skippedTests,0);assert.equal(summary.summaries.length,6);
});
for(const name of ['local','runtime','transpiler','prettier-plugin','language-server','tsc'])test('real per-package Vitest output validates: '+name,()=>{
  const {pkg,events}=packageEvents(name);assert.ok(validateTestProcess(events,pkg,fakeRepo).report.executedTests>0);
});
test('real Windows-skipped baseline is rejected',()=>{
  const {pkg,events}=packageEvents('transpiler',oldLog);
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/Missing, failed, skipped, or reduced/);
});
test('mentioning a package path alongside another package summary cannot substitute its tests',()=>{
  const {pkg,events}=packageEvents('local');const other=packageEvents('runtime').events[2];
  events[2]={...other,base64:Buffer.from(fakeRepo+'/examples/local\n'+Buffer.from(other.base64,'base64').toString()).toString('base64')};
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/Vitest root differs/);
});
test('zero tests in one package cannot borrow totals from another',()=>{
  const {pkg,events}=packageEvents('runtime');
  events[2].base64=Buffer.from(Buffer.from(events[2].base64,'base64').toString().replace('16 passed (16)','0 passed (0)')).toString('base64');
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/Missing, failed, skipped, or reduced/);
});
test('omitting a test file is rejected despite positive totals',()=>{
  const {pkg,events}=packageEvents('runtime');
  events[2].base64=Buffer.from(Buffer.from(events[2].base64,'base64').toString().replace('2 passed (2)','1 passed (1)')).toString('base64');
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/Missing, failed, skipped, or reduced/);
});
test('banner without actual Vitest module execution is rejected',()=>{
  const {pkg,events}=packageEvents('runtime');events.splice(1,1);
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/actual Vitest CLI/);
});
test('zero exit cannot hide unhandled source errors behind a no-errors marker',()=>{
  const {pkg,events}=packageEvents('runtime');
  events.splice(3,0,{kind:'stderr',base64:Buffer.from('Type Errors no errors\nUnhandled Source Error').toString('base64')});
  assert.throws(()=>validateTestProcess(events,pkg,fakeRepo),/Unhandled Vitest/);
});
for(const fixture of fixtures.buildFailures)test('actual exit-zero docs prerender failure is rejected: '+fixture.file,()=>{
  assert.throws(()=>validateBuildLog(fixture.text,''),/Build reported/);
});
test('empty prerender and ignored declaration errors are each rejected independently',()=>{
  for(const text of ['Prerendered 0 pages','error TS2322: bad type','[unhandledRejection] fetch failed'])assert.throws(()=>validateBuildLog(text,''));
});
test('public consumer covers all reviewed declaration entries and checks named API/any/missing imports',()=>{
  for(const repo of ['main','gts']){
    const packages=expected.buildPackages[repo],source=consumerSource(packages,fakeRepo);
    const declarations=packages.flatMap(p=>p.declarations);
    assert.equal((source.match(/import type \* as Entry/g)??[]).length,declarations.length);
    assert.equal((source.match(/__harness_nonexistent_public_export__/g)??[]).length,declarations.length);
    for(const entry of declarations)for(const name of Object.keys(entry.exports))assert.ok(source.includes('.'+name+'>'));
  }
  assert.ok(consumerSource(expected.buildPackages.main,fakeRepo).includes('.createCardDataViewer'));
});
test('required empty/missing build outputs fail; unchanged timestamps are accepted',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'command-output-unit-'));
  try{
    const packages=[{path:'pkg',outputs:['index.js'],declarations:[{file:'index.d.ts',exports:{value:'value'}}]}];
    fs.mkdirSync(path.join(temp,'pkg'));
    assert.throws(()=>outputInventory(temp,packages),/Missing build artifact/);
    fs.writeFileSync(path.join(temp,'pkg/index.js'),'export const value=1;');
    fs.writeFileSync(path.join(temp,'pkg/index.d.ts'),'export declare const value: 1;');
    const a=outputInventory(temp,packages),b=outputInventory(temp,packages);assert.deepEqual(a,b);
  }finally{fs.rmSync(temp,{recursive:true});}
});
test('native compiler/typechecker gates cannot accept a bare exit-zero envelope',async()=>{
  const {validate}=await import('./command-validator.mjs');
  const contract=JSON.parse(fs.readFileSync(path.join(root,'harness/contract.json')));
  for(const id of ['gts-build','gts-tests','main-build','main-tests']){
    const result=await validate({runNonce:'negative',gateId:id,platform:process.platform,command:{exitCode:0}},
      {root,directory:root,contract,gate:contract.gates.find(g=>g.id===id),expectations:expected,nonce:'negative'});
    assert.equal(result.status,'FAIL');
    assert.match(result.reason, /Collector supervisor failed or changed its reserved recovery budget/);
  }
});
test('frozen baseline inventories cover examples/local and all original main test files; deletions/script changes fail',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'command-inventory-unit-'));
  const git=args=>{const r=spawnSync('git',args,{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
  try {
    git(['init','-q']);
    const baseline=fixtures.baselineTests.main.concat(fixtures.baselineTests.gts.filter(p=>!fixtures.baselineTests.main.some(m=>m.path===p.path)));
    fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({name:'fixture',scripts:{test:'pnpm -r test'}}));
    for(const p of baseline){fs.mkdirSync(path.join(temp,p.path),{recursive:true});
      fs.writeFileSync(path.join(temp,p.path,'package.json'),JSON.stringify({name:p.name,scripts:{test:p.script}}));
      for(const f of p.files){fs.mkdirSync(path.dirname(path.join(temp,f)),{recursive:true});fs.writeFileSync(path.join(temp,f),'// Inventory-only fixture for original path\n');}}
    git(['add','.']);const base=git(['write-tree']);
    const spec={base},gate={id:'main-tests',repository:'main'};
    const packages=await packageInventory(root,temp,spec,gate,expected);
    assert.ok(packages.some(p=>p.path==='examples/local'));
    assert.equal(packages.find(p=>p.path==='packages/test').files.length,72);
    const file=path.join(temp,'examples/local/package.json');
    fs.writeFileSync(file,JSON.stringify({name:'@example/local',scripts:{test:'node -e "process.exit(0)"'}}));
    await assert.rejects(()=>packageInventory(root,temp,spec,gate,expected),/script changed/);
    fs.writeFileSync(file,JSON.stringify({name:'@example/local',scripts:{test:'vitest'}}));
    fs.unlinkSync(path.join(temp,'examples/local/import.test.ts'));
    await assert.rejects(()=>packageInventory(root,temp,spec,gate,expected),/test file was removed/);
    fs.writeFileSync(path.join(temp,'examples/local/import.test.ts'),'// Replaced the original test body with a no-op\n');
    await assert.rejects(()=>packageInventory(root,temp,spec,gate,expected),/Original test body changed/);
  }finally{fs.rmSync(temp,{recursive:true});}
});
test('passive preload preserves a real child stdout and observes its entry and lifetime',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'command-preload-unit-'));
  try{
    const child=path.join(temp,'child.mjs');fs.writeFileSync(child,'process.stdout.write("unchanged output\\n");');
    const observer=fileURLToPath(new URL('./command-collector.mjs',import.meta.url));
    const result=spawnSync(process.execPath,['--import',pathToFileURL(observer).href,child],{encoding:'utf8',env:{...process.env,
      HARNESS_COMMAND_OBSERVATIONS:temp,HARNESS_NONCE:'unit',HARNESS_GATE:'gts-tests'}});
    assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'unchanged output\n');
    const log=fs.readdirSync(temp).find(f=>f.endsWith('.jsonl'));
    const events=fs.readFileSync(path.join(temp,log),'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(events[0].kind,'start');assert.equal(events.at(-1).kind,'exit');
    assert.ok(events.some(e=>e.kind==='entry'&&e.module.path===fs.realpathSync.native(child)));
  }finally{fs.rmSync(temp,{recursive:true});}
});

