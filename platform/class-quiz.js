'use strict';
const CQ={state:null,classId:null,key:'',draft:[],seen:new Set(),duration:60,previous:'home',offset:0,pending:null,confirmed:null,sendError:''};
function resetClassQuiz(){CQ.state=null;CQ.classId=null;CQ.key='';CQ.draft=[];CQ.duration=60;CQ.pending=null;CQ.confirmed=null;CQ.sendError=''}
function classQuizButtons(){
 const host=document.querySelector('#classquiz-invite'),learner=document.querySelector('#learner-classquiz');if(!host||!learner)return;
 const ready=typeof auth!=='undefined'&&auth&&typeof boot!=='undefined'&&boot;
 host.hidden=!ready||boot.role!=='host';learner.hidden=!ready||boot.role!=='learner';
 host.disabled=!ready||!cls||!!cls.archived||!!discussion.state;
 host.textContent=CQ.state&&CQ.state.phase!=='finished'?'Klassenquiz öffnen':'Zum Klassenquiz einladen';
 learner.disabled=!ready||!CQ.state||view==='discussion';learner.classList.toggle('active',typeof view!=='undefined'&&view==='classquiz');
 const unread=!!CQ.state&&CQ.state.phase!=='finished'&&!CQ.seen.has(CQ.state.id);learner.classList.toggle('unread',unread);learner.setAttribute('aria-label',unread?'Klassenquiz – neue Einladung':'Klassenquiz');
}
function acceptClassQuiz(state){
 if(CQ.classId!==cls?.id){resetClassQuiz();CQ.classId=cls?.id}
 if(state&&CQ.state?.id===state.id&&state.revision<CQ.state.revision)return;
 if(CQ.state?.id!==state?.id||CQ.state?.index!==state?.index){CQ.draft=[];CQ.duration=60;CQ.pending=null;CQ.confirmed=null;CQ.sendError='';CQ.key=''}
 if(state?.own&&CQ.pending?.quiz===state.id&&CQ.pending.index===state.index){CQ.confirmed=CQ.pending;CQ.pending=null;}
 if(state&&CQ.confirmed?.quiz===state.id&&CQ.confirmed.index===state.index&&!state.own)state.own={answer:CQ.confirmed.answer};
 CQ.state=state||null;if(state)CQ.offset=state.serverNow-Date.now();classQuizButtons();if(view==='classquiz')drawClassQuiz();
}
async function drawClassQuizInvite(){
 const cid=cls.id;$('#content').innerHTML='<section class="panel"><h1>Zum Klassenquiz einladen</h1><p>Aufgaben werden geladen …</p></section>';
 const pools=await request('classQuizPools');if(view!=='classquiz-invite'||cls?.id!==cid)return;
 $('#content').innerHTML=`<section class="panel"><h1>Zum Klassenquiz einladen</h1>${pools.length?`<p>${pools.reduce((n,p)=>n+p.total,0)} freigegebene Aufgaben werden zufällig gemischt.</p>${pools.map(p=>`<p><strong>${esc(p.title)}</strong> · ${p.total} Aufgaben</p>`).join('')}<p>60 Sekunden als Standard · 1.000 Punkte für vollständig richtig · 300 / 200 / 100 Bonuspunkte für die ersten drei richtigen Abgaben.</p><button data-cq-create>Einladung abschicken</button>`:'<p>Gib zuerst LF10a und das Thema „Benutzerschnittstellen verstehen“ unter „freigeben“ frei.</p>'}</section>`;
}
function cqBoard(){const state=CQ.state,el=$('#cq-board');if(!el||!state)return;el.innerHTML='<h2>Quiz-Bestenliste</h2><p class="muted">Nur dieses Klassenquiz · Punkte nach jeder Auflösung</p>'+(state.leaderboard.length?`<ol>${state.leaderboard.map((p,i)=>`<li><span>${i+1}. ${esc(p.name)}</span><strong>${Number(p.points).toLocaleString('de-DE')}</strong></li>`).join('')}</ol>`:'<p>Noch keine Teilnehmer beigetreten.</p>');const count=$('#cq-count');if(count)count.textContent=`${state.answered} / ${state.participants} Antworten`;}
function cqSeconds(){const s=CQ.state;return s?.phase==='question'?Math.max(0,Math.ceil((s.deadline-Date.now()-CQ.offset)/1000)):0}
function cqTick(){if(view!=='classquiz'||!CQ.state)return;const el=$('#cq-clock'),s=CQ.state;if(el){el.textContent=s.phase==='question'?cqSeconds()+' s':s.phase==='invite'?'Bereit':s.phase==='finished'?'Beendet':'Aufgelöst';el.classList.toggle('urgent',s.phase==='question'&&cqSeconds()<=10)}const submit=$('[data-cq-submit]');if(submit)submit.disabled=!!CQ.pending||!!s.own||s.phase!=='question'||cqSeconds()===0||!practiceAnswerComplete(s.question,CQ.draft)}
function cqPreview(t){
 if(!t)return '<p>Keine weitere Aufgabe.</p>';
 const list=items=>'<ul>'+items.map(text=>`<li>${esc(text)}</li>`).join('')+'</ul>';
 let details=t.kind==='why'?t.decisions.map(d=>`<strong>${esc(d.label)}</strong>${list(d.reasons.map(id=>t.choices.find(c=>c.id===id)?.label||id))}`).join(''):list(t.choices?.map(c=>c.label)||[]);
 if(t.fields?.length)details=list(t.fields)+details;
 if(t.parts)details=`<p>${t.parts.map(part=>part===null?' […] ':esc(part)).join('')}</p>`+details;
 return `<h3>${esc(t.title)}</h3>${t.prompt?`<p>${esc(t.prompt)}</p>`:''}${t.code?`<pre>${esc(t.code)}</pre>`:''}${details}<details><summary>Lösung und Erklärung</summary><p>${(t.solution||[]).map(id=>esc(t.choices?.find(c=>c.id===id)?.label||id)).join(' · ')}</p><p>${esc(t.explanation)}</p></details>`;
}
function cqTask(t,locked,a=CQ.state.own?.answer||CQ.draft){
 let body=`<h2>${esc(t.title)}</h2>${t.prompt?`<p>${esc(t.prompt)}</p>`:''}`;
 const rich=richTask(t,a,locked,'classquiz');if(rich!==null)return body+rich;
 if(t.kind==='choice')return body+(t.multi?'<p>Mehrere Antworten möglich.</p>':'')+`<div class="answers">${t.choices.map((c,i)=>`<button class="answer cq-choice ${a.includes(c.id)?'selected':''}" data-cq-choice="${esc(c.id)}" aria-pressed="${a.includes(c.id)}" ${locked?'disabled':''}><span>${a.includes(c.id)?'●':'○'}</span>${esc(c.label)}</button>`).join('')}</div>`;
 if(t.kind==='cloze')body+=`<p>${t.parts.map(x=>x===null?' […] ':esc(x)).join('')}</p>`;
 return body+t.fields.map((field,i)=>`<label class="field">${esc(field)}<select data-cq-field="${i}" ${locked?'disabled':''}><option value="">Bitte auswählen</option>${t.choices.map(c=>`<option value="${esc(c.id)}" ${a[i]===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>`).join('');
}
function drawClassQuiz(){
 document.body.classList.toggle('classquiz-open',view==='classquiz');const s=CQ.state,host=boot.role==='host';
 if(!s){$('#content').innerHTML='<section class="panel"><p>Zurzeit ist kein Klassenquiz verfügbar.</p><button data-cq-leave>Zurück</button></section>';CQ.key='';return}
 const key=[s.id,s.index,s.phase,s.revision,s.joined,!!s.own].join(':');
 if(CQ.key===key&&$('#cq-main')){cqBoard();cqTick();return}CQ.key=key;
 let body='';
 if(!host&&!s.joined){body=`<h2>Einladung zum Klassenquiz</h2><p>${s.total} Aufgaben · Standard 60 Sekunden je Aufgabe.</p><p>Beim Beitreten sind dein Anzeigename und deine Quizpunkte für die teilnehmende Klasse und die Kursleitung sichtbar. Diese Bestenliste beginnt bei jedem neuen Klassenquiz bei null.</p><button data-cq-join ${s.phase==='finished'?'disabled':''}>Beitreten</button>`}
 else if(s.phase==='finished'){body='<h2>Klassenquiz beendet</h2><p>Das ist der Endstand dieses Klassenquiz.</p>'}
 else if(host){body=`<section class="cq-current"><div class="cq-task">${cqTask(s.question,true,s.phase==='invite'?[]:s.question.solution)}</div>${s.phase==='invite'?'':cqFeedback(s.question,s.question.solution)}</section><section class="cq-controls"><div class="row">${s.next?`<label>Zeit für ${s.phase==='invite'?'die erste':'die nächste'} Aufgabe (Sekunden)<input id="cq-duration" type="number" min="5" max="600" step="1" value="${CQ.duration}"></label>`:''}${s.phase==='invite'?'<button data-cq-command="start">Aufgabe für alle starten</button>':s.phase==='question'?'<button data-cq-command="reveal">Jetzt auflösen</button>':s.next?'<button data-cq-command="next">Nächste Aufgabe starten</button>':''}<button class="secondary" data-cq-command="finish">Klassenquiz beenden</button></div>${s.phase!=='invite'&&s.next?`<details class="cq-next"><summary>Nächste Aufgabe ansehen</summary>${cqTask(s.next,true,[])}</details>`:''}</section>`}
 else if(s.phase==='invite'){body='<h2>Du bist dabei!</h2><p>Die Kursleitung startet die erste Aufgabe.</p>'}
 else if(s.question){const locked=s.phase!=='question'||!!s.own||!!CQ.pending||cqSeconds()===0;body=cqTask(s.question,locked)+(s.phase==='question'?s.own?'<p role="status">Antwort abgegeben. Warte auf die Auflösung.</p>':`<button data-cq-submit ${CQ.pending?'disabled':''}>${CQ.pending?'Antwort wird gesendet …':'Antwort abgeben'}</button><p class="cq-send-status" role="status">${esc(CQ.sendError)}</p>`:`${cqFeedback(s.question,s.own?.answer||[])}<section class="cq-result"><strong>${s.own?s.own.score===1000?'Vollständig richtig – 1.000 Punkte plus möglichen Bonus':'Nicht vollständig richtig – 0 Quizpunkte':'Keine Antwort abgegeben'}</strong><p>${s.question.solution.map(id=>esc(s.question.choices.find(c=>c.id===id)?.label||id)).join(' · ')}</p><p>${esc(s.question.explanation)}</p></section>`)}
 $('#content').innerHTML=`<section class="classquiz"><div class="cq-heading"><h1>Klassenquiz</h1><span>Aufgabe ${s.index+1} / ${s.total}</span><strong id="cq-clock" role="timer"></strong><span id="cq-count"></span><button class="secondary" data-cq-leave>Ansicht verlassen</button></div><div class="cq-layout"><div id="cq-main" class="${host?'cq-host':'cq-learner'}">${body}</div><details class="cq-ranking" open><summary>Quiz-Bestenliste</summary><aside id="cq-board"></aside></details></div></section>`;cqBoard();cqTick();
}
function classQuizRich(b){const t=CQ.state?.question;if(!t||boot.role==='host'||CQ.pending||CQ.state.own||cqSeconds()===0)return;let a=CQ.draft;if(b.dataset.richDecision)a=[b.dataset.richDecision];else{const d=t.decisions.find(d=>d.id===a[0]),id=b.dataset.richReason;if(!d)return;a=d.mode==='multi'?(a.includes(id)?a.filter(v=>v!==id):[...a,id]):[a[0],id]}CQ.draft=a;CQ.key='';drawClassQuiz()}
document.addEventListener('input',e=>{if(e.target.id==='cq-duration')CQ.duration=Number(e.target.value);if(e.target.dataset.cqField!==undefined&&!CQ.pending&&!CQ.state?.own){CQ.draft[Number(e.target.dataset.cqField)]=e.target.value;cqTick()}});
document.addEventListener('change',e=>{if(e.target.dataset.cqField!==undefined&&!CQ.pending&&!CQ.state?.own){CQ.draft[Number(e.target.dataset.cqField)]=e.target.value;cqTick()}});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled||!(b.id==='classquiz-invite'||b.id==='learner-classquiz'||[...b.attributes].some(a=>a.name.startsWith('data-cq-'))))return;
 e.preventDefault();e.stopImmediatePropagation();if(feedbackLocked()){flashFeedback();return}
 void guarded(async()=>{
  if(b.id==='classquiz-invite'){if(CQ.state&&CQ.state.phase!=='finished'){CQ.key='';return navigate('classquiz')}return navigate('classquiz-invite')}
  if(b.hasAttribute('data-cq-create')){acceptClassQuiz(await request('classQuizCreate',{requestId:crypto.randomUUID()}));CQ.key='';return navigate('classquiz')}
  if(b.id==='learner-classquiz'){if(!CQ.state)return;practiceCache();CQ.previous=view;CQ.seen.add(CQ.state.id);CQ.key='';return navigate('classquiz')}
  if(b.hasAttribute('data-cq-join')){acceptClassQuiz(await request('classQuizJoin',{quiz:CQ.state.id}));return}
  if(b.hasAttribute('data-cq-leave')){document.body.classList.remove('classquiz-open');return navigate(['classquiz','classquiz-invite'].includes(CQ.previous)?'home':CQ.previous)}
  if(b.dataset.cqCommand){acceptClassQuiz(await request('classQuizControl',{quiz:CQ.state.id,revision:CQ.state.revision,command:b.dataset.cqCommand,seconds:CQ.duration}));return}
  if(b.dataset.cqChoice!==undefined){if(CQ.pending||CQ.state.own)return;const id=b.dataset.cqChoice;CQ.draft=CQ.state.question.multi?(CQ.draft.includes(id)?CQ.draft.filter(x=>x!==id):[...CQ.draft,id]):[id];CQ.key='';drawClassQuiz();return}
  if(b.hasAttribute('data-cq-submit'))return cqSubmit();
 },b);
},{capture:true});
setInterval(cqTick,200);

async function cqSubmit(){
 if(CQ.pending||CQ.state.own)return;
 const sending={quiz:CQ.state.id,index:CQ.state.index,answer:[...CQ.draft]};CQ.pending=sending;CQ.sendError='';CQ.key='';drawClassQuiz();
 try{
  await request('classQuizAnswer',sending);
  if(CQ.state?.id!==sending.quiz||CQ.state.index!==sending.index)return;
  CQ.confirmed=sending;CQ.state.own={answer:sending.answer};CQ.pending=null;CQ.key='';drawClassQuiz();
 }catch(e){
  if(CQ.state?.own)return;
  if(CQ.state?.id===sending.quiz&&CQ.state.index===sending.index){CQ.pending=null;CQ.sendError='Noch keine Bestätigung: '+e.message+' Deine Auswahl bleibt erhalten. Du kannst erneut abgeben.';CQ.key='';drawClassQuiz();}
 }
}
function cqFeedback(t,a){
 const rows=t.feedback||t.solution.map((id,i)=>({key:String(i),title:t.fields?.[i]||t.choices?.find(c=>c.id===id)?.label||id,answer:id,explanation:t.explanation}));
 const label=id=>t.choices?.find(c=>c.id===id)?.label||id;
 return '<div class="cq-bubbles">'+rows.map((r,i)=>{
  const choice=typeof r.correct==='boolean',picked=choice?a.includes(r.key):a[i]!==undefined;
  const good=choice?picked&&r.correct:String(a[i]??'').trim()===String(r.answer).trim(),missing=choice&&!picked&&r.correct;
  const tone=good?'good':missing?'warn':picked?'bad':'',status=good?'RICHTIG':missing?'FEHLT':picked?'FALSCH':'';
  return `<div class="bubble ${tone}"><div class="bubble-title"><span>${esc(r.title)}</span><strong>${status}</strong></div>${!choice?`<p>Richtige Antwort: ${esc(label(r.answer))}</p>`:''}<p>${esc(r.explanation)}</p></div>`;
 }).join('')+'</div>';
}
