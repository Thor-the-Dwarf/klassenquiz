'use strict';
const P={mode:null,knowledge:false,knowledgeData:null,knowledgeRevision:0,courses:[],topics:[],selection:new Set(),difficulty:'tough',choosing:false,round:null,active:null,activeModality:null,activeCompleted:null};
const practiceTopicLimit=3;
let practiceToastTimer;
function practiceLimitToast(){
 let toast=document.getElementById('practice-limit-toast');
 if(!toast){toast=document.createElement('div');toast.id='practice-limit-toast';toast.className='practice-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast)}
 clearTimeout(practiceToastTimer);toast.textContent='Maximal 3 Themen auswählen';toast.classList.add('visible');
 practiceToastTimer=setTimeout(()=>toast.classList.remove('visible'),2600);
}
const practiceLevels=['easy','normal','tough'];
const practiceKey=id=>'lp-round-'+boot.me.id+'-'+id;
async function practiceInit(){P.round=null;await flush();const data=await request('practiceTopics',{modality:P.mode==='auditory'?'auditory':'visual'});P.topics=data.topics;P.courses=data.courses||[];practiceSyncActive(data.active);P.selection.clear();P.choosing=false;P.mode=null;P.knowledge=false;P.knowledgeData=null}
function practiceEffective(t){if(P.mode!=='auditory')return t.available?.length?'all':null;let i=Math.min(t.unlocked,2);while(i>=0&&!t.available.includes(practiceLevels[i]))i--;return i<0?null:practiceLevels[i]}
function drawPracticeSidebar(){
 const side=$('#sidebar');const openFolders=new Set([...side.querySelectorAll('details[open]')].map(el=>el.querySelector(':scope > summary')?.textContent));side.closest('.shell')?.classList.toggle('practice-browsing',view==='practice'&&(P.choosing||P.mode==='infographics'));side.classList.toggle('practice-selecting',P.choosing);
 const listScroll=side.querySelector('.practice-topic-list')?.scrollTop||0,focused=document.activeElement;
 const focusSelector=side.contains(focused)?focused.dataset.practiceTopic?`[data-practice-topic="${CSS.escape(focused.dataset.practiceTopic)}"]`:focused.hasAttribute('data-practice-random')?'[data-practice-random]':null:null;
 const topics=P.topics;for(const id of P.selection){const t=topics.find(t=>t.id===id);if(!t||!practiceEffective(t)||[...P.selection].indexOf(id)>=practiceTopicLimit)P.selection.delete(id)}
 for(const [id,mode] of [['learner-practice','visual'],['learner-auditory','auditory'],['learner-infographics','infographics']]){const button=$('#'+id);button.className=P.mode===mode?'active':'secondary';button.setAttribute('aria-pressed',String(P.mode===mode));}
 if(!P.mode||(!P.choosing&&P.mode!=='infographics')){side.innerHTML='';return}
 let html='';
 if(!P.courses.length){side.innerHTML=html+'<p class="muted">Noch keine Kurse freigegeben.</p>';return}
 html+=P.choosing?'<div class="practice-tools"><button data-practice-random>Zufällig 3 auswählen</button></div>':'';
 const entries=(P.choosing?topics:[...(boot.presentations||[]).map(t=>({...t,...topics.find(x=>x.id===t.id),label:t.title,presentation:true})),...topics.filter(t=>!(boot.presentations||[]).some(x=>x.id===t.id))]).map(t=>{const source=(boot.presentations||[]).find(x=>x.id===t.id);return source?{...t,course:source.course||t.course,folder:source.folder,title:source.title}:t}).sort(compareTreeTopics);
 for(const course of [...new Set([...P.courses,...entries.map(t=>t.course||'PVAP1')])].sort((a,b)=>courseName(a).localeCompare(courseName(b),'de',{numeric:true}))){const courseEntries=entries.filter(t=>(t.course||'PVAP1')===course);html+=`<details><summary>${esc(courseName(course))}</summary>`;
 if(!courseEntries.length)html+='<p class="muted">'+(P.mode==='infographics'?'Noch keine Infografiken freigegeben.':P.mode==='auditory'?'Noch keine auditiven Übungen freigegeben.':'Noch keine visuellen Übungen freigegeben.')+'</p>';
 for(const [folder,items] of Map.groupBy(courseEntries,t=>t.folder)){const hiddenLevel=/^Level[ _-]*\d/i.test(folder||'');html+=hiddenLevel?'<div class="folder">':`<details><summary>${esc(folder)}</summary><div class="folder">`;for(const t of items){if(t.presentation&&!P.choosing){html+=`<div class="treefile ${view==='presentation'&&selected===t.id?'active':''}"><span><button data-presentation="${esc(t.id)}" ${t.slides?'':'disabled'} aria-current="${view==='presentation'&&selected===t.id?'true':'false'}">${esc(t.title)}</button>${t.slides?'':'<small>Noch keine fertige Präsentation</small>'}${P.knowledge?knowledgeBar(t):''}</span></div>`;continue}if(t.presentation&&!t.available){html+=`<div class="treefile"><span>${esc(t.title)}<small>Noch keine Übungen</small></span></div>`;continue}const effective=practiceEffective(t);html+=`<${P.choosing?'label':'div'} class="treefile practice-topic">${P.choosing?`<input type="checkbox" data-practice-topic="${esc(t.id)}" aria-label="${esc(t.label)} auswählen" ${P.selection.has(t.id)?'checked':''} ${effective?'':'disabled'}>`:''}<span>${esc(t.label)}${P.choosing&&!effective?'<small>Keine passende Freigabe</small>':''}${P.knowledge?knowledgeBar(t):''}</span></${P.choosing?'label':'div'}>`}html+=hiddenLevel?'</div>':'</div></details>'}
 html+='</details>';
 }
 side.innerHTML=P.choosing?`<div class="practice-topic-list" role="region" aria-label="Themenauswahl" tabindex="0">${html}</div><div class="practice-start" role="group" aria-label="Übung starten"><button data-practice-start ${P.selection.size?'':'disabled'}>Start</button>${practiceResumeButtons(P.mode)}</div>`:html;
 for(const folder of side.querySelectorAll('details'))folder.open=openFolders.has(folder.querySelector(':scope > summary')?.textContent);
 const list=side.querySelector('.practice-topic-list');if(list)list.scrollTop=listScroll;
 if(focusSelector)side.querySelector(focusSelector)?.focus({preventScroll:true});
}
function knowledgeBar(t){
 const k=P.knowledgeData?.topics.find(x=>x.id===t.id);if(!k)return '<small class="practice-level">Wissensstand wird geladen …</small>';
 const average=boot.me.share&&k.average!==null&&k.average!==undefined?k.average:null;
 return `<span class="knowledge-meter" role="img" aria-label="Wissensstand ${k.percent} Prozent${average===null?'':`, Klassendurchschnitt ${average} Prozent`}" title="Wissensstand ${k.percent.toLocaleString('de-DE')} %${average===null?'':` · Klassendurchschnitt: ${average} % (${k.people} Personen mit Freigabe)`}"><span class="knowledge-fill" style="width:${k.percent}%"></span>${average===null?'':`<span class="knowledge-average" style="left:clamp(1px,${average}%,calc(100% - 2px))"></span>`}<span class="knowledge-label">${k.percent.toLocaleString('de-DE')} %</span></span>`;
}
async function refreshKnowledge(){
 const revision=++P.knowledgeRevision,session=auth;if(!P.knowledge)return;
 const data=await request('knowledge',{modality:P.mode==='auditory'?'auditory':'visual'});if(revision!==P.knowledgeRevision||auth!==session||!P.knowledge)return;
 P.knowledgeData=data;drawPracticeSidebar();
}
function practiceCurrentKey(){return 'lp-round-current-'+boot.me.id+'-'+cls.id}
function practiceRemoveStored(key){try{localStorage.removeItem(key)}catch{storage.set(key,null)}}
function practicePruneCache(currentId){
 const historyKey='lp-round-history-'+boot.me.id+'-'+cls.id,ids=storage.get(historyKey)||[];
 const previous=storage.get(practiceCurrentKey());
 const queued=new Set(queue.filter(item=>item.data?.classId===cls.id).map(item=>item.data?.round));
 for(const id of new Set([...ids,previous?.id].filter(Boolean))){
  if(id!==currentId&&!queued.has(id))practiceRemoveStored(practiceKey(id));
 }
 practiceRemoveStored(historyKey);
 if(currentId)storage.set(practiceCurrentKey(),{id:currentId});else practiceRemoveStored(practiceCurrentKey());
}
function practiceSyncActive(active){
 P.active=active?.id||null;P.activeModality=active?.modality||null;P.activeCompleted=active?.completed||null;
 if(P.round&&P.round.id!==P.active){
  P.round=null;stopAudioPractice();originalPracticeUnmount();
  if(view==='practice'){view='home';drawPracticeHome();}
 }
 practicePruneCache(P.active);
}
function practiceRetired(item){
 const id=item.data?.round;if(!id)return;
 practiceRemoveStored(practiceKey(id));practiceRemoveStored('lp-round-continue-'+id);
 if(storage.get(practiceCurrentKey())?.id===id)practiceRemoveStored(practiceCurrentKey());
 if(P.round?.id===id){P.round=null;stopAudioPractice();originalPracticeUnmount();if(view==='practice'){view='home';drawPracticeHome();}}
 if(P.active===id){P.active=null;P.activeModality=null;P.activeCompleted=null;}
 if(document.querySelector('#sidebar'))drawSidebar();
 message(item.action==='roundAnswer'?'Dieser Lauf wurde inzwischen ersetzt. Eine noch nicht übertragene Antwort daraus konnte nicht mehr gespeichert werden.':'Dieser Lauf wurde inzwischen durch einen neuen Lauf ersetzt.');
}
function practiceResumeButtons(mode=null){
 const id=P.active;if(!id)return '';
 const r=P.round?.id===id?P.round:storage.get(practiceKey(id));
 const modality=r?.modality||P.activeModality||'visual';
 if(mode&&modality!==mode||r?.completed||P.activeCompleted)return '';
 const title=r?(boot.presentations||[]).find(t=>t.id===r.tasks[r.position]?.topic)?.title:'';
 return `<button data-practice-resume="${esc(id)}" class="secondary" aria-label="Aktuellen ${modality==='auditory'?'auditiven':'visuellen'} Lauf fortsetzen${title?': '+esc(title):''}">Fortsetzen</button>`;
}
let practiceNavigation=0;
async function practiceSelect(mode='visual'){
 if(view==='discussion')return;
 const next=P.mode===mode?null:mode,revision=++practiceNavigation;
 if(next&&next!=='infographics'){await flush();const data=await request('practiceTopics',{modality:next});if(revision!==practiceNavigation)return;P.topics=data.topics;P.courses=data.courses||[];practiceSyncActive(data.active);P.knowledgeData=null;P.selection.clear();}
 practiceCache();P.mode=next;P.choosing=next==='visual'||next==='auditory';drawSidebar();drawTabs();
}
function drawPracticeHome(){return drawHomeGraph()}
function practiceCache(){if(!P.round||P.active&&P.active!==P.round.id)return;P.active=P.round.id;P.activeModality=P.round.modality||'visual';P.activeCompleted=P.round.completed||null;practicePruneCache(P.round.id);if(!storage.set(practiceKey(P.round.id),P.round))message('Der Zwischenstand konnte nicht lokal gespeichert werden. Bitte diese Seite geöffnet lassen.')}
async function practiceOpen(id){
 practiceCache();await flush();let round;
 if(queue.length){round=storage.get(practiceKey(id));if(!round)throw Error('Bitte zuerst die Verbindung wiederherstellen.');}
 else round=await request('roundLoad',{round:id});
 practiceCache();stopAudioPractice();$('#learner-menu-dialog')?.close();P.round=round;P.active=id;P.mode=round.modality||'visual';P.choosing=false;view='practice';practiceCache();drawSidebar();drawTabs();await drawPracticeRound();
}
let practiceLoading=false;
const practicePaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function withPracticeLoading(mode,load){
 if(practiceLoading)return;
 practiceLoading=true;
 const previousFocus=document.activeElement,overlay=document.createElement('dialog');
 overlay.id='practice-loading';overlay.className='practice-loading';overlay.setAttribute('aria-labelledby','practice-loading-title');overlay.setAttribute('aria-describedby','practice-loading-status');
 overlay.innerHTML=`<div class="practice-loading-content"><h1 id="practice-loading-title">${mode==='auditory'?'Auditives':'Visuelles'} Lernen wird vorbereitet</h1><div class="practice-loading-track" role="progressbar" aria-label="Übungen werden geladen"><span></span></div><p id="practice-loading-status" role="status" aria-live="polite">Dein Lernstand wird gesichert …</p><button type="button" class="secondary" hidden>Zurück</button></div>`;
 const status=overlay.querySelector('[role="status"]'),back=overlay.querySelector('button');
 overlay.addEventListener('cancel',e=>{if(practiceLoading)e.preventDefault()});
 overlay.addEventListener('close',()=>{overlay.remove();if(previousFocus?.isConnected)previousFocus.focus()});
 back.addEventListener('click',()=>overlay.close());
 document.body.append(overlay);overlay.showModal();
 try{
  await practicePaint();
  await load(text=>{status.textContent=text});
  status.textContent='Deine Übungen sind bereit.';
  await practicePaint();
  overlay.close();
 }catch(e){
  overlay.classList.add('failed');overlay.querySelector('[role="progressbar"]').hidden=true;
  overlay.querySelector('h1').textContent='Die Übungen konnten nicht gestartet werden';
  status.textContent=e.name==='AbortError'?'Das Laden dauert zu lange. Bitte versuche es erneut. Deine Auswahl bleibt erhalten.':e.message||'Bitte prüfe deine Verbindung und versuche es erneut.';
  back.hidden=false;back.focus();
 }finally{practiceLoading=false;}
}
async function practiceStart(){
 if(practiceLoading||!['visual','auditory'].includes(P.mode)||!P.selection.size)return;
 if(P.selection.size>practiceTopicLimit){practiceLimitToast();return;}
 const mode=P.mode,topics=[...P.selection];
 return withPracticeLoading(mode,async status=>{
  practiceCache();await flush();if(queue.length)throw Error('Bitte erst die vorgemerkten Antworten speichern lassen.');
  status('Deine Übungen werden geladen …');
  const requestId=storage.get('lp-round-create-'+boot.me.id+'-'+mode)||crypto.randomUUID();storage.set('lp-round-create-'+boot.me.id+'-'+mode,requestId);
  let round;try{round=await request('roundCreate',{topics,modality:mode,difficulty:'tough',requestId});storage.set('lp-round-create-'+boot.me.id+'-'+mode,null)}catch(e){if(e.status&&e.status<500)storage.set('lp-round-create-'+boot.me.id+'-'+mode,null);throw e}
  status('Deine erste Aufgabe wird vorbereitet …');await practicePaint();
  practiceCache();stopAudioPractice();P.round=round;P.active=round.id;P.mode=mode;P.choosing=false;practiceCache();view='practice';drawSidebar();drawTabs();await drawPracticeRound();
 });
}

function practiceSave(){const r=P.round;if(!r)return;const draft=r.draft||{};enqueue('roundSave',{round:r.id,position:r.position,draft,revision:r.revision++,requestId:crypto.randomUUID()});practiceCache()}
function practiceAck(item,result){if(!['roundSave','roundAnswer'].includes(item.action)||!boot?.me)return;const r=P.round?.id===item.data.round?P.round:storage.get(practiceKey(item.data.round));if(!r)return;if(item.action==='roundAnswer'){const t=r.tasks[item.data.index];t.submission={answer:result.answer,score:result.score};t.solution=result.solution;t.explanation=result.explanation;t.submissionFeedback=result.submissionFeedback;delete t.pending;r.completed=r.tasks.every(t=>t.submission)?Date.now():null}if(P.active===r.id)storage.set(practiceKey(r.id),r);else practiceRemoveStored(practiceKey(r.id));if(item.action==='roundAnswer'&&P.round===r&&view==='practice'){if(r.modality!=='auditory'&&originalPractice.current)originalPracticeSync();else drawPracticeRound().catch(showError);}if(P.knowledge&&item.action==='roundAnswer')refreshKnowledge().catch(showError)}
async function drawPracticeRound(){
 if(deferFeedback('practice',drawPracticeRound))return;
 if(typeof clearPracticeFeedback==='function')clearPracticeFeedback();
 const r=P.round,el=$('#content');
 if(r?.modality==='auditory'){originalPracticeUnmount();return drawAudioPractice();}
 if(!P.courses.length){originalPracticeUnmount();el.innerHTML='<p>Dieser Kurs ist derzeit nicht freigegeben.</p>';return;}
 if(!r){originalPracticeUnmount();el.innerHTML='<p>Wähle links deine Übungen aus.</p>';return;}
 return drawOriginalPracticeRound();
}
async function practiceOriginalNavigate(delta){
 const r=P.round;if(!r||r.modality==='auditory'||![-1,1].includes(delta))return;
 if(feedbackLocked()){flashFeedback();return;}
 const t=r.tasks[r.position];
 if(delta<0&&!r.position||delta>0&&!t.submission&&!t.pending)return;
 if(delta>0&&r.position===r.tasks.length-1){
  // The random pool is continuous for learners; completing one stored round
  // creates the next round over the same selected topics without a task count.
  if(!r.continuation){originalPracticePost('navigation-failed');return;}
  return withPracticeLoading('visual',async status=>{
   practiceSave();await flush();if(queue.length)throw Error('Bitte erst die vorgemerkten Antworten speichern lassen.');
   status('Die nächste Aufgabe wird vorbereitet …');
   const requestId=storage.get('lp-round-continue-'+r.id)||crypto.randomUUID();storage.set('lp-round-continue-'+r.id,requestId);
   const next=await request('roundCreate',{...r.continuation,coreId:r.continuation.coreId||undefined,modality:'visual',difficulty:'tough',requestId});
   storage.set('lp-round-continue-'+r.id,null);P.round=next;P.active=next.id;practiceCache();await drawPracticeRound();
  }).finally(()=>originalPracticePost('navigation-failed'));
 }
 r.position+=delta;practiceSave();await drawPracticeRound();
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(!Object.keys(d).some(k=>k.startsWith('practice')))return;guarded(async()=>{
 if('practiceKnowledge'in d){P.knowledge=!P.knowledge;b.className=P.knowledge?'active':'secondary';b.setAttribute('aria-pressed',String(P.knowledge));drawSidebar();if(P.knowledge)await refreshKnowledge();return}
 if('practiceInfographics'in d)return practiceSelect('infographics');if('practiceAuditory'in d)return practiceSelect('auditory');if('practiceSelect'in d)return practiceSelect();if('practiceRandom'in d){const items=P.topics.filter(practiceEffective);for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]}P.selection=new Set(items.slice(0,practiceTopicLimit).map(t=>t.id));drawSidebar()}
 if('practiceStart'in d)return practiceStart();if('practiceResume'in d)return practiceOpen(d.practiceResume||P.active);
 if('practiceNew'in d){practiceCache();const data=await request('practiceTopics',{modality:P.mode==='auditory'?'auditory':'visual'});P.topics=data.topics;P.courses=data.courses||[];P.mode=P.round?.modality||'visual';P.choosing=true;view='home';drawSidebar();drawTabs();drawPracticeHome()}
 const r=P.round;if(!r)return;const t=r.tasks[r.position];
 if('practiceChoice'in d&&!t.submission&&!t.pending){let answer=r.draft[t.key]||[];r.draft[t.key]=t.multi?(answer.includes(d.practiceChoice)?answer.filter(x=>x!==d.practiceChoice):[...answer,d.practiceChoice]):[d.practiceChoice];practiceSave();drawPracticeRound()}
 if('practiceAnswer'in d&&!t.submission&&!t.pending){const answer=richAnswer(t,r.draft[t.key]||[]);const complete=richComplete(t,answer);if(complete===false||complete===null&&(!answer.length||t.kind!=='choice'&&(answer.length!==t.fields.length||answer.some(x=>!x))||t.kind==='order'&&new Set(answer).size!==answer.length))throw Error('Bitte alle Felder vollständig ausfüllen.');t.pending=[...answer];practiceCache();enqueue('roundAnswer',{round:r.id,index:r.position,answer});drawPracticeRound()}
 if('practiceNext'in d&&(t.submission||t.pending)&&r.position<r.tasks.length-1){r.position++;practiceSave();drawPracticeRound()}
 if('practicePrev'in d&&r.position){r.position--;practiceSave();drawPracticeRound()}
 },b)});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.practiceTopic){if(el.checked&&!P.selection.has(el.dataset.practiceTopic)&&P.selection.size>=practiceTopicLimit){el.checked=false;practiceLimitToast();return}el.checked?P.selection.add(el.dataset.practiceTopic):P.selection.delete(el.dataset.practiceTopic);drawSidebar()}if(el.dataset.practiceField!==undefined&&P.round){const t=P.round.tasks[P.round.position];if(t.submission||t.pending)return;const answer=richAnswer(t,P.round.draft[t.key]||Array(t.fields.length).fill(''));answer[Number(el.dataset.practiceField)]=el.value;P.round.draft[t.key]=answer;practiceSave()}});

function practiceAnswerComplete(t,answer){const complete=richComplete(t,answer);return complete===null?!!answer.length&&(t.kind==='choice'||answer.length===t.fields.length&&answer.every(Boolean))&&(t.kind!=='order'||new Set(answer).size===answer.length):complete;}
function updatePracticeControls(){if(view!=='practice'||!P.round)return;const t=P.round.tasks[P.round.position],b=$('[data-practice-answer]');if(b)b.disabled=!!(t.submission||t.pending)||!practiceAnswerComplete(t,richAnswer(t,P.round.draft[t.key]||[]));}
document.addEventListener('change',updatePracticeControls);
document.addEventListener('input',()=>queueMicrotask(updatePracticeControls));
document.addEventListener('keydown',e=>{
 if(view!=='practice'||!P.round||P.round.modality==='auditory'||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
 if(e.target.closest('input,textarea,select,[contenteditable="true"],dialog,[role="dialog"]'))return;
 const controls={Enter:'[data-practice-answer]',ArrowUp:'[data-practice-prev]',ArrowDown:'[data-practice-next]'};
 if(controls[e.key]){e.preventDefault();const b=$(controls[e.key]);if(b&&!b.disabled)b.click();return;}
 const t=P.round.tasks[P.round.position];if(t.kind!=='choice'||t.submission||t.pending||e.key.length!==1)return;
 const i='abcdefghijklmnopqrstuvwxyz'.indexOf(e.key.toLowerCase());const b=document.querySelectorAll('.practice-round [data-practice-choice]')[i];if(i>=0&&b&&!b.disabled){e.preventDefault();b.click();}
});

document.addEventListener('input',e=>{const el=e.target;if(el.dataset.practiceField===undefined||!P.round||view!=='practice')return;const t=P.round.tasks[P.round.position];if(t.submission||t.pending)return;const answer=richAnswer(t,P.round.draft[t.key]||Array(t.fields.length).fill(''));answer[Number(el.dataset.practiceField)]=el.value;P.round.draft[t.key]=answer;practiceSave();updatePracticeControls();});

// Visual quiz navigation by wheel or swipe, without skipping unanswered tasks.
let practiceWheelTotal=0,practiceWheelAt=0,practiceScrollAt=0,practiceTouch=null;
function practiceScrollAllowed(target){
 return view==='practice'&&P.round?.modality!=='auditory'&&!P.choosing&&
  target instanceof Element&&!!target.closest('.practice-round')&&
  !target.closest('input,textarea,select,[contenteditable="true"],[draggable="true"],.rich-placement,dialog');
}
function practiceScrollStep(direction){
 if(Date.now()-practiceScrollAt<700)return false;
 if(feedbackLocked()){flashFeedback();return false;}
 const b=$(direction>0?'[data-practice-next]':'[data-practice-prev]');
 if(!b||b.disabled)return false;
 practiceScrollAt=Date.now();b.click();scrollTo({top:0,behavior:'instant'});
 document.querySelector('.practice-round')?.animate([{opacity:.6,transform:'translateY('+direction*16+'px)'},{opacity:1,transform:'translateY(0)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:180});
 return true;
}
document.addEventListener('wheel',e=>{
 if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||!practiceScrollAllowed(e.target))return;
 const page=document.scrollingElement,edge=e.deltaY>0?page.scrollTop+innerHeight>=page.scrollHeight-3:page.scrollTop<=3;
 if(!edge)return;
 const now=Date.now();if(now-practiceWheelAt>180||Math.sign(practiceWheelTotal)!==Math.sign(e.deltaY))practiceWheelTotal=0;
 practiceWheelAt=now;practiceWheelTotal+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(Math.abs(practiceWheelTotal)>=70){if(practiceScrollStep(Math.sign(practiceWheelTotal)))e.preventDefault();practiceWheelTotal=0;}
},{passive:false});
document.addEventListener('touchstart',e=>{
 practiceTouch=null;if(e.touches.length!==1||!practiceScrollAllowed(e.target))return;
 const t=e.touches[0],page=document.scrollingElement;
 practiceTouch={x:t.clientX,y:t.clientY,top:page.scrollTop<=3,bottom:page.scrollTop+innerHeight>=page.scrollHeight-3};
},{passive:true});
document.addEventListener('touchend',e=>{
 const start=practiceTouch;practiceTouch=null;if(!start||e.changedTouches.length!==1||!practiceScrollAllowed(e.target))return;
 const t=e.changedTouches[0],dy=start.y-t.clientY;if(Math.abs(dy)<70||Math.abs(dy)<Math.abs(start.x-t.clientX)*1.4)return;
 if((dy>0?start.bottom:start.top)&&practiceScrollStep(Math.sign(dy)))e.preventDefault();
},{passive:false});
document.addEventListener('touchcancel',()=>{practiceTouch=null;});
