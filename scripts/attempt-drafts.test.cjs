const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../../kata_edu-be/node_modules/typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function load(relative){const filename=path.join(root,relative);const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);return module.exports;}
test('submit includes an explicitly cleared answer, without inventing untouched answers',()=>{
 const filename=path.join(root,'src/pages/coursePage/ExamContainer.tsx');
 const ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let expression;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='formattedAnswersPayload')expression=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
 assert.ok(expression);
 const js=ts.transpileModule('const result = '+expression+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const ctx={examData:{questions:[{id:'cleared'},{id:'untouched'}]},userAnswers:{cleared:''},isAnswerProvided:a=>!!a,toBackendAnswer:(_q,a)=>a?{text:a}:{}};
 vm.createContext(ctx);const out=vm.runInContext(js+'JSON.stringify(result)',ctx);
 assert.deepEqual(JSON.parse(out),[{questionId:'cleared',answer:{}}]);
});
test('draft saver coalesces a change and clear, preserving the clear request',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];
 const saver=createAttemptDraftSaver(async(id,a)=>calls.push({id,a}),()=>{},10000);
 saver.schedule('q',{text:'first'});saver.schedule('q',{});await saver.flush();saver.dispose();
 assert.deepEqual(calls,[{id:'q',a:{}}]);
});
test('draft saver serializes a newer change after an in-flight older save',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];let release;
 const saver=createAttemptDraftSaver(async(_id,a)=>{calls.push(a);if(calls.length===1)await new Promise(r=>{release=r;});},()=>{},10000);
 saver.schedule('q',{text:'old'});const first=saver.flush();await new Promise(r=>setImmediate(r));
 saver.schedule('q',{text:'new'});const second=saver.flush();release();await Promise.all([first,second]);saver.dispose();
 assert.deepEqual(calls,[{text:'old'},{text:'new'}]);
});
test('failed save retains the newest value for explicit retry',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');let fail=true;const calls=[];
 const saver=createAttemptDraftSaver(async(_id,a)=>{if(fail)throw Error('offline');calls.push(a);},()=>{},10000);
 saver.schedule('q',{text:'retry'});await assert.rejects(saver.flush(),/offline/);fail=false;await saver.flush();saver.dispose();
 assert.deepEqual(calls,[{text:'retry'}]);
});
test('official exam percentage remains first-attempt score after mastery reaches 100%',()=>{
 const {officialExamPercentage}=load('src/utils/officialExamResult.ts');
 assert.equal(officialExamPercentage({bestPercentage:'100.00',firstAttemptResult:{score:'4',maxScore:'10',percentage:'40.00'}}),40);
 assert.equal(officialExamPercentage({bestPercentage:'100.00',firstAttemptResult:{score:'0',maxScore:'10',percentage:'0'}}),0);
 assert.equal(officialExamPercentage({bestPercentage:'100.00'}),null);
});
test('report wrapper metadata enables pagination after ten attempts',()=>{
 const {attemptReportMeta}=load('src/utils/attemptReportMeta.ts');
 const meta={page:1,limit:10,total:11,totalPages:2};
 assert.deepEqual(attemptReportMeta({data:{attempts:[]},meta}),meta);
 assert.equal(attemptReportMeta({data:{attempts:[]}}),null);
});
test('debounced save runs without navigation',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];
 const saver=createAttemptDraftSaver(async(id,a)=>calls.push({id,a}),()=>{},5);
 saver.schedule('q',{text:'typed'});await new Promise(r=>setTimeout(r,30));saver.dispose();
 assert.deepEqual(calls,[{id:'q',a:{text:'typed'}}]);
});
test('newest change survives a failed older in-flight request',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];let rejectOld;
 const saver=createAttemptDraftSaver(async(_id,a)=>{calls.push(a);if(calls.length===1)await new Promise((_r,reject)=>{rejectOld=reject;});},()=>{},10000);
 saver.schedule('q',{text:'old'});const first=saver.flush();await new Promise(r=>setImmediate(r));
 saver.schedule('q',{});rejectOld(Error('offline'));await assert.rejects(first,/offline/);
 await saver.flush();saver.dispose();assert.deepEqual(calls,[{text:'old'},{}]);
});
test('dispose cancels debounce but does not cancel an already requested flush',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];let release;
 const saver=createAttemptDraftSaver(async(id,a)=>{calls.push({id,a});if(calls.length===1)await new Promise(r=>{release=r;});},()=>{},10000);
 saver.schedule('first',{});saver.schedule('second',{text:'latest'});const flush=saver.flush();
 await new Promise(r=>setImmediate(r));saver.dispose();release();await flush;
 saver.schedule('ignored',{});await saver.flush();
 assert.deepEqual(calls,[{id:'first',a:{}},{id:'second',a:{text:'latest'}}]);
});
test('flush drains a change queued immediately after an empty flush',async()=>{
 const {createAttemptDraftSaver}=load('src/utils/attemptDraftSaver.ts');const calls=[];
 const saver=createAttemptDraftSaver(async(_id,a)=>calls.push(a),()=>{},10000);
 const empty=saver.flush();saver.schedule('q',{});await saver.flush();await empty;saver.dispose();assert.deepEqual(calls,[{}]);
});
test('actual answer-change handler schedules clear only for an editable initial exam',()=>{
 const filename=path.join(root,'src/pages/coursePage/ExamContainer.tsx');
 const ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='handleAnswerChange')expression=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
 const js=ts.transpileModule('const change = '+expression+';change("");',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 function run(overrides={}){const calls=[];const ctx={isReviewMode:false,isExamComplete:false,isSubmitting:false,examData:{status:'in_progress'},isInitialExam:true,draftAllowedRef:{current:true},lockedQuestions:{},currentQuestion:{id:'q'},setUserAnswers(){},toBackendAnswer:()=>({}),draftSaverRef:{current:{schedule:(id,a)=>calls.push({id,a})}},...overrides};vm.createContext(ctx);vm.runInContext(js,ctx);return JSON.parse(JSON.stringify(calls));}
 assert.deepEqual(run(),[{id:'q',a:{}}]);
 assert.deepEqual(run({isInitialExam:false}),[]);
 assert.deepEqual(run({isReviewMode:true}),[]);
 assert.deepEqual(run({isExamComplete:true}),[]);
 assert.deepEqual(run({examData:{status:'submitted'}}),[]);
 assert.deepEqual(run({draftAllowedRef:{current:false}}),[]);
});
test('final submit does not wait behind a stalled autosave near the deadline',async()=>{
 const filename=path.join(root,'src/pages/coursePage/ExamContainer.tsx');
 const ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='handleFinish')expression=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);
 const js=ts.transpileModule('const finish = '+expression+';finish();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let submitted=false;
 const ctx={submittingRef:{current:false},isExamComplete:false,isInitialExam:true,isPracticeMode:false,examData:{id:'a',status:'in_progress',questions:[{id:'q'}]},setIsSubmitting(){},userAnswers:{q:'latest'},toBackendAnswer:()=>({text:'latest'}),console:{log(){}},draftSaverRef:{current:{flush:()=>new Promise(()=>{})}},studentLearningService:{attempts:{submit(){submitted=true;return new Promise(()=>{});}}}};
 vm.createContext(ctx);vm.runInContext(js,ctx);await new Promise(r=>setImmediate(r));
 assert.equal(submitted,true,'submit must send the latest answers even when draft saving is stalled');
});
