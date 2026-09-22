'use strict';
const P={courses:[],topics:[],selection:new Set(),difficulty:'easy',choosing:false,round:null,active:null};
const practiceLevels=['easy','normal','tough'];
const practiceKey=id=>'lp-round-'+boot.me.id+'-'+id;
async function practiceInit(){const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];P.active=P.courses.length?(data.active?.id||null):null;P.round=null;P.selection.clear();P.choosing=false}
function practiceEffective(t){let i=Math.min(t.unlocked,practiceLevels.indexOf(P.difficulty));while(i>=0&&!t.available.includes(practiceLevels[i]))i--;return i<0?null:practiceLevels[i]}
function drawPracticeSidebar(){
 const side=$('#sidebar');side.classList.toggle('practice-selecting',P.choosing);
 const topics=P.topics;for(const id of P.selection){const t=topics.find(t=>t.id===id);if(!t||!practiceEffective(t))P.selection.delete(id)}
 let html=P.choosing?`<button data-practice-start ${P.selection.size?'':'disabled'}>Üben</button>`:`<button data-practice-select ${topics.length?'':'disabled'}>Üben</button>`;
 if(!P.courses.length){side.innerHTML=html+'<p class="muted">Noch keine Kurse freigegeben.</p>';return}
 html+='<details open><summary>LFPV-AP1</summary>';if(!topics.length){side.innerHTML=html+'<p class="muted">Noch keine Übungen freigegeben.</p></details>';return}
 html+=P.choosing?`<div class="practice-tools"><button data-practice-all>Alle</button><div class="row">${practiceLevels.map(level=>`<button data-practice-level="${level}" class="${P.difficulty===level?'active':'secondary'}" aria-pressed="${P.difficulty===level}">${level}</button>`).join('')}</div></div>`:'';
 for(const [folder,items] of Map.groupBy(topics,t=>t.folder)){html+=`<details open><summary>${esc(folder)}</summary><div class="folder">`;for(const t of items){const effective=practiceEffective(t);html+=`<div class="treefile">${P.choosing?`<input type="checkbox" data-practice-topic="${esc(t.id)}" aria-label="${esc(t.label)} auswählen" ${P.selection.has(t.id)?'checked':''} ${effective?'':'disabled'}>`:''}<span>${esc(t.label)}${P.choosing?`<small class="practice-level">${effective?(effective===P.difficulty?effective:`${P.difficulty} → ${effective}`):'Keine passende Freigabe'}</small>`:''}</span></div>`}html+='</div></details>'}
 side.innerHTML=html+'</details>';
}
async function practiceSelect(){await flush();const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];P.choosing=true;drawSidebar()}
function drawPracticeHome(){$('#content').innerHTML=`<h1>${esc(cls.name)}</h1><p>${boot.me.points.toLocaleString('de-DE')} Punkte</p>${P.active?'<button data-practice-resume>Übungsrunde fortsetzen</button>':''}`}
function practiceCache(){if(P.round&&!storage.set(practiceKey(P.round.id),P.round))message('Der Zwischenstand konnte nicht lokal gespeichert werden. Bitte diese Seite geöffnet lassen.')}
async function practiceOpen(id){P.round=storage.get(practiceKey(id));await flush();if(queue.length){if(!P.round)throw Error('Bitte zuerst die Verbindung wiederherstellen.')}else{P.round=await request('roundLoad',{round:id});practiceCache()}P.active=id;view='practice';drawTabs();drawPracticeRound()}
async function practiceStart(){await flush();if(queue.length)throw Error('Bitte erst die vorgemerkten Antworten speichern lassen.');if(!P.selection.size)return;const requestId=storage.get('lp-round-create-'+boot.me.id)||crypto.randomUUID();storage.set('lp-round-create-'+boot.me.id,requestId);try{P.round=await request('roundCreate',{topics:[...P.selection],difficulty:P.difficulty,requestId});storage.set('lp-round-create-'+boot.me.id,null)}catch(e){if(e.status&&e.status<500)storage.set('lp-round-create-'+boot.me.id,null);throw e}P.active=P.round.id;P.choosing=false;practiceCache();view='practice';drawSidebar();drawTabs();drawPracticeRound()}
function practiceSave(){const r=P.round;if(!r)return;const draft=r.draft||{};enqueue('roundSave',{round:r.id,position:r.position,draft,revision:r.revision++,requestId:crypto.randomUUID()});practiceCache()}
function practiceAck(item,result){if(!['roundSave','roundAnswer'].includes(item.action)||!boot?.me)return;const r=P.round?.id===item.data.round?P.round:storage.get(practiceKey(item.data.round));if(!r)return;if(item.action==='roundAnswer'){const t=r.tasks[item.data.index];t.submission={answer:result.answer,score:result.score};t.solution=result.solution;t.explanation=result.explanation;delete t.pending;r.completed=r.tasks.every(t=>t.submission)?Date.now():null}storage.set(practiceKey(r.id),r);if(P.round===r&&view==='practice')drawPracticeRound()}
function drawPracticeRound(){
 const r=P.round,el=$('#content');if(!P.courses.includes('LFPV-AP1')){el.innerHTML='<p>Dieser Kurs ist derzeit nicht freigegeben.</p>';return}if(!r){el.innerHTML='<p>Wähle links deine Übungen aus.</p>';return}
 const t=r.tasks[r.position],draft=r.draft[t.key]||[],answer=t.submission?.answer||t.pending||draft,locked=!!(t.submission||t.pending),done=r.tasks.filter(t=>t.submission).length;
 let body=`<div class="row"><span>${esc(t.topic)} · ${esc(t.difficulty)}</span><span>Aufgabe ${r.position+1} / ${r.tasks.length}</span></div><h2>${esc(t.title)}</h2>${t.prompt?`<p>${esc(t.prompt)}</p>`:''}`;
 if(t.kind==='choice')body+=`${t.multi?'<p>Mehrere Antworten auswählen.</p>':''}<div class="answers">${t.choices.map(c=>`<button data-practice-choice="${esc(c.id)}" class="answer ${answer.includes(c.id)?'selected':''} ${t.solution?.includes(c.id)?'correct':''}" ${locked?'disabled':''}>${esc(c.label)}</button>`).join('')}</div>`;
 else{if(t.kind==='cloze')body+=`<p>${t.parts.map(p=>p===null?' […] ':esc(p)).join('')}</p>`;body+=t.fields.map((field,i)=>`<label class="field">${esc(field)}<select data-practice-field="${i}" ${locked?'disabled':''}><option value="">Bitte auswählen</option>${t.choices.map(c=>`<option value="${esc(c.id)}" ${answer[i]===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>`).join('')}
 if(t.submission)body+=`<section class="feedback"><strong>${t.submission.score} / 1.000 Punkte</strong><p>${t.solution.map(id=>esc(t.choices.find(c=>c.id===id)?.label||id)).join(' · ')}</p><p>${esc(t.explanation)}</p></section>`;
 else if(t.pending)body+='<p role="status">Antwort lokal vorgemerkt – wird übertragen.</p>';
 const next=r.position<r.tasks.length-1;
 el.innerHTML=`<section class="practice-round">${body}<div class="row practice-navigation"><button data-practice-prev class="secondary" ${r.position?'':'disabled'}>Zurück</button>${!locked?'<button data-practice-answer>Antwort prüfen</button>':''}<button data-practice-next ${locked&&next?'':'disabled'}>Weiter</button></div><p class="muted">${done} / ${r.tasks.length} Antworten gespeichert</p>${done===r.tasks.length?'<p class="saved">Übungsrunde abgeschlossen.</p><button data-practice-new>Neue Runde</button>':''}</section>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(!Object.keys(d).some(k=>k.startsWith('practice')))return;guarded(async()=>{
 if('practiceSelect'in d)return practiceSelect();if('practiceAll'in d){const items=P.topics.filter(practiceEffective),all=items.every(t=>P.selection.has(t.id));items.forEach(t=>all?P.selection.delete(t.id):P.selection.add(t.id));drawSidebar()}
 if(d.practiceLevel){P.difficulty=d.practiceLevel;drawSidebar()}
 if('practiceStart'in d)return practiceStart();if('practiceResume'in d)return practiceOpen(P.active);
 if('practiceNew'in d){const data=await request('practiceTopics');P.topics=data.topics;P.courses=data.courses||[];P.choosing=true;view='home';drawSidebar();drawTabs();drawPracticeHome()}
 const r=P.round;if(!r)return;const t=r.tasks[r.position];
 if('practiceChoice'in d&&!t.submission&&!t.pending){let answer=r.draft[t.key]||[];r.draft[t.key]=t.multi?(answer.includes(d.practiceChoice)?answer.filter(x=>x!==d.practiceChoice):[...answer,d.practiceChoice]):[d.practiceChoice];practiceSave();drawPracticeRound()}
 if('practiceAnswer'in d&&!t.submission&&!t.pending){const answer=r.draft[t.key]||[];if(!answer.length||t.kind!=='choice'&&(answer.length!==t.fields.length||answer.some(x=>!x))||t.kind==='order'&&new Set(answer).size!==answer.length)throw Error('Bitte alle Felder vollständig ausfüllen.');t.pending=[...answer];practiceCache();enqueue('roundAnswer',{round:r.id,index:r.position,answer});drawPracticeRound()}
 if('practiceNext'in d&&(t.submission||t.pending)&&r.position<r.tasks.length-1){r.position++;practiceSave();drawPracticeRound()}
 if('practicePrev'in d&&r.position){r.position--;practiceSave();drawPracticeRound()}
 },b)});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.practiceTopic){el.checked?P.selection.add(el.dataset.practiceTopic):P.selection.delete(el.dataset.practiceTopic);drawSidebar()}if(el.dataset.practiceField!==undefined&&P.round){const t=P.round.tasks[P.round.position];if(t.submission||t.pending)return;const answer=P.round.draft[t.key]||Array(t.fields.length).fill('');answer[Number(el.dataset.practiceField)]=el.value;P.round.draft[t.key]=answer;practiceSave()}});
