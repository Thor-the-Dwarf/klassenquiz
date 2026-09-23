'use strict';
const P={mode:null,knowledge:false,knowledgeData:null,knowledgeRevision:0,courses:[],topics:[],selection:new Set(),difficulty:'tough',choosing:false,round:null,active:null};
const practiceLevels=['easy','normal','tough'];
const practiceKey=id=>'lp-round-'+boot.me.id+'-'+id;
async function practiceInit(){const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];P.active=P.courses.length?(data.active?.id||null):null;P.round=null;P.selection.clear();P.choosing=false;P.mode=null;P.knowledge=false;P.knowledgeData=null}
function practiceEffective(t){let i=Math.min(t.unlocked,2);while(i>=0&&!t.available.includes(practiceLevels[i]))i--;return i<0?null:practiceLevels[i]}
function drawPracticeSidebar(){
 const side=$('#sidebar');side.classList.toggle('practice-selecting',P.choosing);
 const topics=P.topics;for(const id of P.selection){const t=topics.find(t=>t.id===id);if(!t||!practiceEffective(t))P.selection.delete(id)}
 for(const [id,mode] of [['learner-practice','visual'],['learner-auditory','auditory'],['learner-infographics','infographics']]){const button=$('#'+id);button.className=P.mode===mode?'active':'secondary';button.setAttribute('aria-pressed',String(P.mode===mode));}
 if(!P.mode){side.innerHTML='';return}
 let html='';
 if(!P.courses.length){side.innerHTML=html+'<p class="muted">Noch keine Kurse freigegeben.</p>';return}
 html+=`<details ${P.choosing?'open':''}><summary>PVAP1</summary>`;if(!topics.length&&!(boot.presentations||[]).length){side.innerHTML=html+['BWL','IT','Mathematik','Software'].map(folder=>`<details><summary>${folder}</summary><p class="muted">Noch keine Übungen freigegeben.</p></details>`).join('')+'</details>';return}
 html+=P.choosing?'<div class="practice-tools"><button data-practice-all>Alle</button></div>':'';
 const entries=[...(boot.presentations||[]).map(t=>({...t,...topics.find(x=>x.id===t.id),label:t.title,presentation:true})),...topics.filter(t=>!(boot.presentations||[]).some(x=>x.id===t.id))];
 for(const [folder,items] of Map.groupBy(entries,t=>t.folder)){html+=`<details ${P.choosing?'open':''}><summary>${esc(folder)}</summary><div class="folder">`;for(const t of items){if(t.presentation&&!P.choosing){html+=`<div class="treefile ${view==='presentation'&&selected===t.id?'active':''}"><span><button data-presentation="${esc(t.id)}" aria-current="${view==='presentation'&&selected===t.id?'true':'false'}">${esc(t.title)}</button>${P.knowledge?knowledgeBar(t):''}</span></div>`;continue}if(t.presentation&&!t.available){html+=`<div class="treefile"><span>${esc(t.title)}<small>Noch keine Übungen</small></span></div>`;continue}const effective=practiceEffective(t);html+=`<div class="treefile">${P.choosing?`<input type="checkbox" data-practice-topic="${esc(t.id)}" aria-label="${esc(t.label)} auswählen" ${P.selection.has(t.id)?'checked':''} ${effective?'':'disabled'}>`:''}<span>${esc(t.label)}${P.choosing?`<small class="practice-level">${effective||'Keine passende Freigabe'}</small>`:''}${P.knowledge?knowledgeBar(t):''}</span></div>`}html+='</div></details>'}
 side.innerHTML=html+'</details>'+(P.choosing?`<div class="practice-start"><button data-practice-start ${P.selection.size&&P.mode==='visual'?'':'disabled'} title="${P.mode==='auditory'?'Auditives Üben ist noch nicht verfügbar':'Übungsrunde starten'}">Start</button></div>`:'');
}
function knowledgeBar(t){
 const k=P.knowledgeData?.topics.find(x=>x.id===t.id);if(!k)return '<small class="practice-level">Wissensstand wird geladen …</small>';
 const average=boot.me.share&&k.average!==null&&k.average!==undefined?k.average:null;
 return `<span class="knowledge-meter" role="img" aria-label="Wissensstand ${k.percent} Prozent${average===null?'':`, Klassendurchschnitt ${average} Prozent`}" title="${k.answered} von ${k.total} Aufgaben bearbeitet${average===null?'':` · Klassendurchschnitt: ${average} % (${k.people} Personen mit Freigabe)`}"><span class="knowledge-fill" style="width:${k.percent}%"></span>${average===null?'':`<span class="knowledge-average" style="left:clamp(1px,${average}%,calc(100% - 2px))"></span>`}<span class="knowledge-label">${k.percent.toLocaleString('de-DE')} %</span></span>`;
}
async function refreshKnowledge(){
 const revision=++P.knowledgeRevision,session=auth;if(!P.knowledge)return;
 const data=await request('knowledge');if(revision!==P.knowledgeRevision||auth!==session||!P.knowledge)return;
 P.knowledgeData=data;drawPracticeSidebar();
}
async function practiceSelect(mode='visual'){
 if(view==='discussion')return;
 const next=P.mode===mode?null:mode;
 if(next&&next!=='infographics'){await flush();const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];}
 P.mode=next;P.choosing=next==='visual'||next==='auditory';slidesView.revision++;await navigate('home');
}
function drawPracticeHome(){$('#content').innerHTML=''}
function practiceCache(){if(P.round&&!storage.set(practiceKey(P.round.id),P.round))message('Der Zwischenstand konnte nicht lokal gespeichert werden. Bitte diese Seite geöffnet lassen.')}
async function practiceOpen(id){P.round=storage.get(practiceKey(id));await flush();if(queue.length){if(!P.round)throw Error('Bitte zuerst die Verbindung wiederherstellen.')}else{P.round=await request('roundLoad',{round:id});practiceCache()}P.active=id;view='practice';drawTabs();drawPracticeRound()}
async function practiceStart(){if(P.mode!=='visual')return;await flush();if(queue.length)throw Error('Bitte erst die vorgemerkten Antworten speichern lassen.');if(!P.selection.size)return;const requestId=storage.get('lp-round-create-'+boot.me.id)||crypto.randomUUID();storage.set('lp-round-create-'+boot.me.id,requestId);try{P.round=await request('roundCreate',{topics:[...P.selection],difficulty:'tough',requestId});storage.set('lp-round-create-'+boot.me.id,null)}catch(e){if(e.status&&e.status<500)storage.set('lp-round-create-'+boot.me.id,null);throw e}P.active=P.round.id;P.choosing=false;practiceCache();view='practice';drawSidebar();drawTabs();drawPracticeRound()}
function practiceSave(){const r=P.round;if(!r)return;const draft=r.draft||{};enqueue('roundSave',{round:r.id,position:r.position,draft,revision:r.revision++,requestId:crypto.randomUUID()});practiceCache()}
function practiceAck(item,result){if(!['roundSave','roundAnswer'].includes(item.action)||!boot?.me)return;const r=P.round?.id===item.data.round?P.round:storage.get(practiceKey(item.data.round));if(!r)return;if(item.action==='roundAnswer'){const t=r.tasks[item.data.index];t.submission={answer:result.answer,score:result.score};t.solution=result.solution;t.explanation=result.explanation;delete t.pending;r.completed=r.tasks.every(t=>t.submission)?Date.now():null}storage.set(practiceKey(r.id),r);if(item.action==='roundAnswer'&&P.round===r&&view==='practice')drawPracticeRound();if(P.knowledge&&item.action==='roundAnswer')refreshKnowledge().catch(showError)}
function drawPracticeRound(){
 const r=P.round,el=$('#content');if(!P.courses.includes('PVAP1')){el.innerHTML='<p>Dieser Kurs ist derzeit nicht freigegeben.</p>';return}if(!r){el.innerHTML='<p>Wähle links deine Übungen aus.</p>';return}
 const t=r.tasks[r.position],draft=r.draft[t.key]||[],answer=richAnswer(t,t.submission?.answer||t.pending||draft),locked=!!(t.submission||t.pending),done=r.tasks.filter(t=>t.submission).length;
 let body=`<div class="practice-heading"><span>${esc((boot.presentations||[]).find(x=>x.id===t.topic)?.title||t.topic)} · ${esc(t.difficulty)}</span><span>Aufgabe ${r.position+1} / ${r.tasks.length}</span></div><h2>${esc(t.title)}</h2>${t.prompt?`<p>${esc(t.prompt)}</p>`:''}`;
 const rich=richTask(t,answer,locked,'practice');if(rich!==null)body+=rich;else if(t.kind==='choice')body+=`${t.multi?'<p>Mehrere Antworten auswählen.</p>':''}<div class="answers">${t.choices.map(c=>`<button data-practice-choice="${esc(c.id)}" aria-pressed="${answer.includes(c.id)}" class="answer ${answer.includes(c.id)?'selected':''} ${t.solution?.includes(c.id)?'correct':''}" ${locked?'disabled':''}>${esc(c.label)}</button>`).join('')}</div>`;
 else{if(t.kind==='cloze')body+=`<p>${t.parts.map(p=>p===null?' […] ':esc(p)).join('')}</p>`;body+=t.fields.map((field,i)=>`<label class="field">${esc(field)}<select data-practice-field="${i}" ${locked?'disabled':''}><option value="">Bitte auswählen</option>${t.choices.map(c=>`<option value="${esc(c.id)}" ${answer[i]===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>`).join('')}
 if(t.submission)body+=`<section class="feedback"><strong>${t.submission.score} / 1.000 Punkte</strong><p>${t.solution.map(id=>esc(t.choices.find(c=>c.id===id)?.label||id)).join(' · ')}</p><p>${esc(t.explanation)}</p></section>`;
 else if(t.pending)body+='<p role="status">Antwort lokal vorgemerkt – wird übertragen.</p>';
 const next=r.position<r.tasks.length-1;
 const complete=practiceAnswerComplete(t,answer);
 el.innerHTML=`<section class="practice-round">${body}<footer class="practice-footer"><div class="practice-navigation"><button data-practice-prev class="practice-arrow" aria-label="Zur vorherigen Aufgabe" title="Pfeil nach oben" ${r.position?'':'disabled'}>↑</button><button data-practice-answer class="practice-evaluate" title="Enter" ${locked||!complete?'disabled':''}>${locked?'Auswertung':'Auswerten'}</button><button data-practice-next class="practice-arrow" aria-label="Zur nächsten Aufgabe" title="Pfeil nach unten" ${locked&&next?'':'disabled'}>↓</button></div><span class="practice-progress" aria-label="Aufgabenposition">${r.position+1}/${r.tasks.length}</span><div class="practice-progress-track" role="progressbar" aria-label="Ausgewertete Aufgaben" aria-valuemin="0" aria-valuemax="${r.tasks.length}" aria-valuenow="${done}"><span style="width:${100*done/r.tasks.length}%"></span></div></footer>${done===r.tasks.length?'<p class="saved">Übungsrunde abgeschlossen.</p><button data-practice-new>Neue Runde</button>':''}</section>`;

}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(!Object.keys(d).some(k=>k.startsWith('practice')))return;guarded(async()=>{
 if('practiceKnowledge'in d){P.knowledge=!P.knowledge;b.className=P.knowledge?'active':'secondary';b.setAttribute('aria-pressed',String(P.knowledge));drawSidebar();if(P.knowledge)await refreshKnowledge();return}
 if('practiceInfographics'in d)return practiceSelect('infographics');if('practiceAuditory'in d)return practiceSelect('auditory');if('practiceSelect'in d)return practiceSelect();if('practiceAll'in d){const items=P.topics.filter(practiceEffective),all=items.every(t=>P.selection.has(t.id));items.forEach(t=>all?P.selection.delete(t.id):P.selection.add(t.id));drawSidebar()}
 if('practiceStart'in d)return practiceStart();if('practiceResume'in d)return practiceOpen(P.active);
 if('practiceNew'in d){const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];P.mode='visual';P.choosing=true;view='home';drawSidebar();drawTabs();drawPracticeHome()}
 const r=P.round;if(!r)return;const t=r.tasks[r.position];
 if('practiceChoice'in d&&!t.submission&&!t.pending){let answer=r.draft[t.key]||[];r.draft[t.key]=t.multi?(answer.includes(d.practiceChoice)?answer.filter(x=>x!==d.practiceChoice):[...answer,d.practiceChoice]):[d.practiceChoice];practiceSave();drawPracticeRound()}
 if('practiceAnswer'in d&&!t.submission&&!t.pending){const answer=richAnswer(t,r.draft[t.key]||[]);const complete=richComplete(t,answer);if(complete===false||complete===null&&(!answer.length||t.kind!=='choice'&&(answer.length!==t.fields.length||answer.some(x=>!x))||t.kind==='order'&&new Set(answer).size!==answer.length))throw Error('Bitte alle Felder vollständig ausfüllen.');t.pending=[...answer];practiceCache();enqueue('roundAnswer',{round:r.id,index:r.position,answer});drawPracticeRound()}
 if('practiceNext'in d&&(t.submission||t.pending)&&r.position<r.tasks.length-1){r.position++;practiceSave();drawPracticeRound()}
 if('practicePrev'in d&&r.position){r.position--;practiceSave();drawPracticeRound()}
 },b)});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.practiceTopic){el.checked?P.selection.add(el.dataset.practiceTopic):P.selection.delete(el.dataset.practiceTopic);drawSidebar()}if(el.dataset.practiceField!==undefined&&P.round){const t=P.round.tasks[P.round.position];if(t.submission||t.pending)return;const answer=richAnswer(t,P.round.draft[t.key]||Array(t.fields.length).fill(''));answer[Number(el.dataset.practiceField)]=el.value;P.round.draft[t.key]=answer;practiceSave()}});

function practiceAnswerComplete(t,answer){const complete=richComplete(t,answer);return complete===null?!!answer.length&&(t.kind==='choice'||answer.length===t.fields.length&&answer.every(Boolean))&&(t.kind!=='order'||new Set(answer).size===answer.length):complete;}
function updatePracticeControls(){if(view!=='practice'||!P.round)return;const t=P.round.tasks[P.round.position],b=$('[data-practice-answer]');if(b)b.disabled=!!(t.submission||t.pending)||!practiceAnswerComplete(t,richAnswer(t,P.round.draft[t.key]||[]));}
document.addEventListener('change',updatePracticeControls);
document.addEventListener('input',()=>queueMicrotask(updatePracticeControls));
document.addEventListener('keydown',e=>{
 if(view!=='practice'||!P.round||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
 if(e.target.closest('input,textarea,select,[contenteditable="true"],dialog,[role="dialog"]'))return;
 const controls={Enter:'[data-practice-answer]',ArrowUp:'[data-practice-prev]',ArrowDown:'[data-practice-next]'};
 if(controls[e.key]){e.preventDefault();const b=$(controls[e.key]);if(b&&!b.disabled)b.click();return;}
 const t=P.round.tasks[P.round.position];if(t.kind!=='choice'||t.submission||t.pending||e.key.length!==1)return;
 const i='abcdefghijklmnopqrstuvwxyz'.indexOf(e.key.toLowerCase());const b=document.querySelectorAll('.practice-round [data-practice-choice]')[i];if(i>=0&&b&&!b.disabled){e.preventDefault();b.click();}
});
