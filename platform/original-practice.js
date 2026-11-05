'use strict';

// The worksheet keeps its renderer, interactions, feedback and footer. This
// adapter only translates its private answer state and delegates navigation.
const originalPractice={current:null,generation:0,materials:new Map()};
function originalPracticePrelude(config){
 window.__practiceBridge=config;
 let seed=config.seed>>>0;
 Math.random=()=>{seed+=0x6D2B79F5;let n=seed;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
}
function originalPracticeBridge(){
 const config=window.__practiceBridge;
 const send=(type,data={})=>parent.postMessage({channel:'original-practice',token:config.token,type,...data},'*');
 try{
  if(typeof state!=='object'||!state.tasks[config.taskIndex]||typeof render!=='function')throw Error('Das gespeicherte Original kann nicht geöffnet werden.');
  const task=state.tasks[config.taskIndex],raw=RAW_TASKS[config.taskIndex];
  const kind=task.kind;
  const supported=['choice','match','cloze','order','why','trace','matrix','trueFalseDragging','risk','budget','repair','gridfill','dragmatch','dragorder'];
  if(!supported.includes(kind))throw Error('Dieses Originalformat wird noch nicht unterstützt.');
  const nativeLock=lockCurrent,nativeControls=updateControls;
  const originalItems=(task.items||[]).slice();
  const str=value=>value===null||value===undefined?'':String(value);
  const rawRows=raw.rows||[],rawFields=raw.fields||[];
  // Original offer columns are shuffled. Public answer columns always retain
  // their stored source order, including when reopening historical versions.
  const offerIndices=kind==='matrix'?raw.offers.map(o=>task.offers.indexOf(o)):[];
  const choiceIndex=id=>task.options.find(o=>o.id===id)?str(id).split('-').at(-1):'';
  const choiceId=index=>task.options.find(o=>o.id===`${config.taskIndex}-${index}`)?.id;
  const itemIndex=item=>str((raw.correctOrder||raw.items.map((_,i)=>i))[item.correctPos-1]);
  function encode(){
   const a=answerFor(task.id);
   if(kind==='choice')return (a.selected||[]).map(choiceIndex);
   if(kind==='match')return task.rows.map(r=>str(a[r.id]));
   if(kind==='dragmatch')return task.rows.map(r=>str(a.placed?.[r.id]));
   if(kind==='cloze')return task.blanks.map(b=>str(a[b.id]));
   if(kind==='order'||kind==='dragorder')return task.items.map(itemIndex);
   if(kind==='why')return (a.selected||[]).flatMap(id=>[id,...(a.reasons?.[id]||[])]);
   if(kind==='trace')return rawRows.map(r=>str(a.values?.[r.id]));
   if(kind==='repair')return rawFields.map(f=>str(a.values?.[f.id]??f.initial));
   if(kind==='matrix')return rawRows.flatMap(r=>{const row=a.matrix?.[r.id]||{};return [str(row.criterion??(raw.fixedCriteria?r.criterion:'')),str(row.weight??(raw.fixedWeights?r.weight:'')),...offerIndices.map(i=>str(row.points?.[i]))]});
   if(kind==='trueFalseDragging')return raw.statements.map(s=>str(a.positions?.[s.id]));
   if(kind==='risk')return raw.risks.flatMap(r=>{const pair=str(a.positions?.[r.id]).split('-');return [pair[0]||'',pair[1]||'']});
   if(kind==='gridfill')return task.cells.map(c=>str(a.grid?.[c.id]));
   if(kind==='budget')return [str(a.feasibility),str(a.minimum),...['ram','ssd'].map(group=>str((a.selected||[]).find(id=>task.items.find(i=>i.id===id)?.group===group)))];
   return [];
  }
  function decode(answer){
   const values=(answer||[]).map(str),a={};
   if(kind==='choice')a.selected=values.map(choiceId).filter(Boolean);
   if(kind==='match')task.rows.forEach((r,i)=>{if(values[i])a[r.id]=values[i]});
   if(kind==='dragmatch')a.placed=Object.fromEntries(task.rows.map((r,i)=>[r.id,values[i]]).filter(([,v])=>v));
   if(kind==='cloze')task.blanks.forEach((b,i)=>{if(values[i])a[b.id]=values[i]});
   if(kind==='order'||kind==='dragorder'){
    if(values.length===originalItems.length&&new Set(values).size===values.length){const ordered=values.map(v=>originalItems.find(item=>itemIndex(item)===v));if(ordered.every(Boolean)){task.items=ordered;task.touched=true;}}
   }
   if(kind==='why'){a.selected=raw.options.filter(o=>values.includes(o.id)).map(o=>o.id);a.reasons=Object.fromEntries(raw.options.filter(o=>a.selected.includes(o.id)).map(o=>[o.id,o.reasons.filter(r=>values.includes(r.id)).map(r=>r.id)]));}
   if(kind==='trace')a.values=Object.fromEntries(rawRows.map((r,i)=>[r.id,values[i]||'']));
   if(kind==='repair'){a.values=Object.fromEntries(rawFields.map((f,i)=>[f.id,values[i]??f.initial]));a.touched=values.length>0;}
   if(kind==='matrix')a.matrix=Object.fromEntries(rawRows.map((r,i)=>{const points=Array(task.offers.length).fill('');offerIndices.forEach((column,j)=>points[column]=values[i*5+2+j]||'');return [r.id,{criterion:values[i*5]??(raw.fixedCriteria?r.criterion:''),weight:values[i*5+1]??(raw.fixedWeights?str(r.weight):''),points}]}));
   if(kind==='trueFalseDragging')a.positions=Object.fromEntries(raw.statements.map((s,i)=>[s.id,values[i]]).filter(([,v])=>v==='true'||v==='false'));
   if(kind==='risk')a.positions=Object.fromEntries(raw.risks.map((r,i)=>[r.id,values[i*2]&&values[i*2+1]?values[i*2]+'-'+values[i*2+1]:'']).filter(([,v])=>v));
   if(kind==='gridfill')a.grid=Object.fromEntries(task.cells.map((c,i)=>[c.id,values[i]||'']));
   if(kind==='budget'){a.feasibility=values[0]||'';a.minimum=values[1]||'';a.selected=values.slice(2).filter(id=>task.items.some(i=>i.id===id));a.values={};}
   state.answers[task.id]=a;
  }
  let ready=false,emitted='',feedbackLocked=!!config.feedbackLocked,navigating=false;
  const isLocked=()=>!!state.locked[task.id];
  function snapshot(){
   return {v:1,version:config.version,answer:structuredClone(answerFor(task.id)),...(kind==='order'||kind==='dragorder'?{order:task.items.map(i=>i.id),touched:!!task.touched}:{}),activeWord:state.activeWord};
  }
  function publish(){
   if(!ready||isLocked())return;
   const draft=snapshot(),answer=encode(),serial=JSON.stringify({draft,answer});
   if(serial===emitted)return;emitted=serial;send('draft',{answer,draft,complete:isAnswered(task)});
  }
  function controls(){
   nativeControls();
   prevBtn.disabled=!config.canPrev||navigating;
   nextBtn.disabled=!isLocked()||navigating||config.canNext===false;
  }
  updateControls=function(){controls();queueMicrotask(publish)};
  function blocked(){if(feedbackLocked){send('blocked');return true}return false;}
  go=function(delta){
   if(blocked()||navigating||delta<0&&!config.canPrev||delta>0&&(!isLocked()||config.canNext===false))return;
   publish();navigating=true;controls();send('navigate',{delta:delta>0?1:-1});
  };
  lockCurrent=function(){
   if(blocked()||isLocked()||!isAnswered(task))return;
   const answer=encode();publish();nativeLock();send('submit',{answer});
  };
  // The old click listener captured the original function by reference. Capture
  // only these navigation controls; every task interaction stays original.
  window.addEventListener('click',event=>{
   const button=event.target.closest?.('#lockBtn,#prevBtn,#nextBtn');if(!button)return;
   event.preventDefault();event.stopImmediatePropagation();
   if(button.disabled)return;
   if(button.id==='lockBtn')lockCurrent();else go(button.id==='prevBtn'?-1:1);
  },true);
  for(const type of ['pointerdown','click','dblclick','contextmenu','keydown','beforeinput','input','change','submit','dragstart','drop','wheel'])window.addEventListener(type,event=>{
   if(!feedbackLocked)return;
   if(type==='keydown'&&(event.key==='Tab'||event.ctrlKey||event.metaKey||event.altKey))return;
   event.preventDefault();event.stopImmediatePropagation();send('blocked');
  },{capture:true,passive:false});
  function acceptSubmission(submission){
   if(!submission)return;
   const unchanged=isLocked()&&JSON.stringify(encode())===JSON.stringify(submission.answer);
   state.score[task.id]=submission.score===1000;
   if(unchanged)return;
   decode(submission.answer);state.locked[task.id]=true;render();
  }
  window.addEventListener('message',event=>{
   const message=event.data;if(event.source!==parent||message?.channel!=='original-practice'||message.token!==config.token)return;
   if(message.type==='sync'){
    feedbackLocked=!!message.feedbackLocked;config.canPrev=!!message.canPrev;config.canNext=message.canNext!==false;
    if(message.submission&&!feedbackLocked)acceptSubmission(message.submission);
    controls();
   }
   if(message.type==='navigation-failed'){navigating=false;controls();}
  });
  state.tasks=[task];state.index=0;state.answers={};state.locked={};state.score={};state.activeWord=null;
  decode(config.answer||[]);
  if(!config.submission&&!config.pending&&config.draft?.v===1&&config.draft.version===config.version){
   state.answers[task.id]=structuredClone(config.draft.answer||{});
   if(Array.isArray(config.draft.order)){const ordered=config.draft.order.map(id=>originalItems.find(i=>i.id===id));if(ordered.length===originalItems.length&&ordered.every(Boolean)&&new Set(config.draft.order).size===ordered.length)task.items=ordered;task.touched=!!config.draft.touched;}
   state.activeWord=config.draft.activeWord||null;
  }
  if(config.submission){decode(config.submission.answer);state.locked[task.id]=true;state.score[task.id]=config.submission.score===1000;}
  else if(config.pending){decode(config.pending);state.locked[task.id]=true;state.score[task.id]=taskScore(task);}
  render();ready=true;
  send('ready',{kind,taskId:task.id,answer:encode(),locked:isLocked(),complete:isAnswered(task)});
  // Render callbacks and native input handlers update the original state. The
  // microtask observes their final values, including drag/touch interactions.
  for(const type of ['input','change','click','pointerup','drop','keydown'])document.addEventListener(type,()=>queueMicrotask(publish));
  publish();
 }catch(error){send('error',{message:error.message||'Das Original konnte nicht gestartet werden.'});}
}

function originalPracticeDocument(material,config){
 const json=JSON.stringify({...config,taskIndex:material.taskIndex,version:material.version,seed:material.displaySeed}).replace(/</g,'\\u003c');
 const prelude='<script>('+originalPracticePrelude.toString()+')('+json+');<\/script>';
 // Only source-sheet identification and its finite counter are suppressed.
 // Task rendering, original layout/feedback CSS and original footer are intact.
 const overrides='<style>.app>.top,#progress{display:none!important}.app{grid-template-rows:minmax(0,1fr) auto!important}</style>';
 const bridge='<script>('+originalPracticeBridge.toString()+')();<\/script>';
 let html=material.html;
 html=html.replace(/<head(?:\s[^>]*)?>/i,match=>match+prelude);
 return html.replace(/<\/body\s*>/i,overrides+bridge+'</body>');
}
function originalPracticePost(type,data={}){
 const current=originalPractice.current;if(current?.frame?.isConnected)current.frame.contentWindow.postMessage({channel:'original-practice',token:current.token,type,...data},'*');
}
function originalPracticeSync(){
 const current=originalPractice.current,r=typeof P!=='undefined'?P.round:null;
 if(!current||!r||r.id!==current.round||r.position!==current.index)return;
 const t=r.tasks[r.position];originalPracticePost('sync',{canPrev:r.position>0,canNext:r.position<r.tasks.length-1||!!r.continuation,feedbackLocked:typeof feedbackLocked==='function'&&feedbackLocked(),submission:t.submission||null});
}
function originalPracticeUnmount(){
 const current=originalPractice.current;
 originalPractice.current=null;originalPractice.generation++;
 if(current){clearTimeout(current.timer);current.reject?.(new DOMException('Ansicht gewechselt','AbortError'));current.section.remove();}
 if(typeof syncFeedbackAvailability==='function')syncFeedbackAvailability();
}
async function originalPracticeMaterial(round,index){
 const key=round+':'+index;
 if(originalPractice.materials.has(key))return originalPractice.materials.get(key);
 const material=await request('roundMaterial',{round,index});
 originalPractice.materials.set(key,material);
 while(originalPractice.materials.size>2)originalPractice.materials.delete(originalPractice.materials.keys().next().value);
 return material;
}
async function drawOriginalPracticeRound(){
 const r=P.round,index=r.position,t=r.tasks[index],current=originalPractice.current;
 if(current?.round===r.id&&current.index===index&&current.section.isConnected&&!current.failed){originalPracticeSync();return current.promise;}
 // Keep the last complete original visible until its successor is ready.
 const retained=current?.section.isConnected?current:null;
 if(retained){clearTimeout(retained.timer);retained.reject?.(new DOMException('Ansicht gewechselt','AbortError'));originalPractice.current=null;originalPractice.generation++;}
 else originalPracticeUnmount();
 const generation=originalPractice.generation,section=retained?.section||document.createElement('section');
 section.className='original-practice';section.setAttribute('aria-busy','true');
 delete section.dataset.originalReady;
 if(typeof syncFeedbackAvailability==='function')syncFeedbackAvailability();
 section.querySelector('.original-practice-error')?.remove();
 if(!retained){section.innerHTML='<p class="original-practice-loading" role="status">Übung wird geladen …</p>';$('#content').replaceChildren(section);}
 const session={round:r.id,index,key:t.key,section,frame:null,previousFrame:retained?.frame||null,token:crypto.randomUUID(),ready:false,promise:null};
 originalPractice.current=session;
 session.promise=(async()=>{
  try{
   const material=await originalPracticeMaterial(r.id,index);
   if(generation!==originalPractice.generation||!section.isConnected||P.round!==r||r.position!==index)return;
   if(material.key!==t.key||material.round!==r.id||material.index!==index)throw Error('Die gespeicherte Aufgabe passt nicht zur Übungsrunde.');
   if(material.submission&&!t.submission){t.submission=material.submission;delete t.pending;practiceCache();}
   const frame=document.createElement('iframe');session.frame=frame;
   frame.className='original-practice-frame';frame.title='Visuelle Übung';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.hidden=true;
   const ready=new Promise((resolve,reject)=>{session.resolve=resolve;session.reject=reject;session.timer=setTimeout(()=>reject(Error('Das Original antwortet nicht. Bitte erneut laden.')),20000);});
   frame.srcdoc=originalPracticeDocument(material,{token:session.token,answer:t.submission?.answer||t.pending||r.draft[t.key]||[],draft:r.draft._original?.[t.key],submission:t.submission||null,pending:t.pending||null,canPrev:index>0,canNext:index<r.tasks.length-1||!!r.continuation,feedbackLocked:feedbackLocked()});
   section.append(frame);await ready;session.reject=null;
  }catch(error){
   if(generation!==originalPractice.generation||!section.isConnected)return;
   clearTimeout(session.timer);session.failed=true;section.setAttribute('aria-busy','false');session.frame?.remove();session.frame=session.previousFrame;
   section.querySelector('.original-practice-loading')?.remove();
   const panel=document.createElement('div');panel.className='original-practice-error';panel.setAttribute('role','alert');
   const text=document.createElement('p');text.textContent=error.message;const button=document.createElement('button');button.textContent='Erneut laden';
   button.addEventListener('click',()=>drawPracticeRound().catch(showError));panel.append(text,button);section.append(panel);throw error;
  }
 })();
 return session.promise;
}
window.addEventListener('message',event=>{
 const session=originalPractice.current,message=event.data;
 if(!session||event.source!==session.frame?.contentWindow||message?.channel!=='original-practice'||message.token!==session.token||!session.section.isConnected)return;
 const r=P.round;if(!r||r.id!==session.round||r.position!==session.index)return;
 const t=r.tasks[session.index];
 if(message.type==='ready'){
  clearTimeout(session.timer);session.ready=true;session.previousFrame?.remove();session.previousFrame=null;session.frame.hidden=false;session.section.querySelector('[role="status"]')?.remove();session.section.setAttribute('aria-busy','false');session.section.dataset.originalReady='true';
  if(typeof syncFeedbackAvailability==='function')syncFeedbackAvailability();
  session.resolve();return;
 }
 if(message.type==='error'){clearTimeout(session.timer);session.reject?.(Error(message.message));return;}
 if(message.type==='blocked'){flashFeedback();return;}
 if(message.type==='draft'){
  if(t.submission||t.pending||feedbackLocked())return;
  if(!Array.isArray(message.answer)||!message.answer.every(x=>typeof x==='string')||JSON.stringify(message.draft).length>50000)return;
  r.draft[t.key]=message.answer;r.draft._original||={};r.draft._original[t.key]=message.draft;practiceSave();return;
 }
 if(message.type==='submit'){
  if(t.submission||t.pending)return;
  if(feedbackLocked()){flashFeedback();originalPracticeSync();return;}
  if(!Array.isArray(message.answer)||!message.answer.every(x=>typeof x==='string'))return;
  t.pending=[...message.answer];r.draft[t.key]=message.answer;if(r.draft._original)delete r.draft._original[t.key];practiceCache();
  enqueue('roundAnswer',{round:r.id,index:session.index,answer:message.answer});return;
 }
 if(message.type==='navigate'){
  if(feedbackLocked()){flashFeedback();originalPracticePost('navigation-failed');return;}
  practiceOriginalNavigate(message.delta).catch(error=>{originalPracticePost('navigation-failed');showError(error)});
 }
});
new MutationObserver(()=>{
 const current=originalPractice.current;if(current&&!current.section.isConnected)originalPracticeUnmount();
}).observe(document.body,{childList:true,subtree:true});
new MutationObserver(originalPracticeSync).observe(document.body,{attributes:true,attributeFilter:['class']});
