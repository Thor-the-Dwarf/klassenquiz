'use strict';
const feedbackAudioExample={"id": "Audio_Uebung_AP1_Arbeitsplatzanforderungen_und_Hardwareauswahl_easy_01:0", "kind": "choice", "multi": false, "title": "Für einen Arbeitsplatz mit Browser, Tabellenkalkulation und Videokonferenzen sollte zuerst die höchste verfügbare CPU-Taktfrequenz ausgewählt werden, bevor der konkrete Bedarf erhoben wird.", "prompt": "", "choices": [{"id": "true", "label": "Richtig"}, {"id": "false", "label": "Falsch"}], "topic": "Level07_01_Arbeitsplatzanforderungen_und_Hardwareauswahl", "difficulty": "easy", "key": "feedback-example"};
const hostFeedbackExamples=[
 {id:'example-infographic',path:'Infographik | BWL | LFPV-AP1 | GFN',kind:'slide',topic:'Level01_01_AP1_Unternehmen_und_Unternehmensziele',slide:0,rating:8,good:'Die drei Bereiche sind klar voneinander getrennt. Die Symbole helfen mir bei der Orientierung.',bad:'Auf dem Smartphone ist der Text recht klein.',better:'Die einzelnen Bereiche zusätzlich vergrößern können.',comment:'Eine gute Übersicht zum Wiederholen.'},
 {id:'example-audio',path:'AudioÜbung | IT | LFPV-AP1 | GFN',kind:'audio',topic:feedbackAudioExample.topic,rating:6,good:'Die Aufgabe zeigt, warum zuerst der tatsächliche Bedarf ermittelt werden sollte.',bad:'Der Satz ist lang. Beim ersten Hören habe ich den Anfang wieder vergessen.',better:'Die Aussage in zwei kürzere Sätze aufteilen und eine kurze Pause einfügen.',comment:'Mit Kopfhörern konnte ich mich besser konzentrieren.'},
 {id:'example-discussion',path:'Diskussion | BWL | LFPV-AP1 | GFN',kind:'slide',topic:'Level01_02_Kundenbedarf_Beratung_und_Kommunikation',slide:1,rating:9,good:'Das gemeinsame Bild macht es leicht, der Erklärung zu folgen.',bad:'Die Folie wurde gewechselt, bevor ich meine Notizen fertig hatte.',better:'Vor dem Wechsel kurz fragen, ob alle so weit sind.',comment:'Die gemeinsame Besprechung war für mich besonders hilfreich.'}
];
let hostFeedbackRevision=0,hostFeedbackUrl=null;
function hostFeedbackRead(){try{return new Set(JSON.parse(sessionStorage.getItem('lp-example-feedback-read')||'[]'))}catch{return new Set()}}
function hostFeedbackArchived(){try{return new Set(JSON.parse(sessionStorage.getItem('lp-example-feedback-archived')||'[]'))}catch{return new Set()}}
let hostFeedbackItems=[],hostFeedbackLoaded=0,hostFeedbackLoading=false,hostFeedbackSession=null;
function drawHostFeedbackList(){
 const unread=hostFeedbackItems.filter(f=>!f.read).length,badge=document.querySelector('#host-feedback-count');badge.textContent=unread;badge.hidden=!unread;
 document.querySelector('#host-feedback-button').setAttribute('aria-label',unread?`Feedback, ${unread} neue Meldungen`:'Feedback');
 document.querySelector('#host-feedback-list').innerHTML=`<ul><li class="feedback-archive-link"><button data-feedback-archive>Feedback Archiv</button></li>${hostFeedbackItems.map(f=>`<li class="feedback-inbox-row"><button data-feedback-real="${esc(f.id)}" class="${f.read?'':'unread'}">${esc(f.path)}</button></li>`).join('')}</ul>${hostFeedbackItems.length?'':'<p class="muted feedback-inbox-empty">'+(hostFeedbackLoaded?'Keine eingegangenen Feedbacks':'Feedback wird geladen …')+'</p>'}`;
}
async function refreshHostFeedback(){
 if(boot?.role!=='host'||hostFeedbackLoading)return;hostFeedbackLoading=true;const session=auth;
 try{const data=await feedbackRequest('list',{},true);if(auth!==session)return;hostFeedbackItems=data.items;hostFeedbackLoaded=Date.now();drawHostFeedbackList();}catch(e){if(!hostFeedbackLoaded)document.querySelector('#host-feedback-list').innerHTML=`<button data-feedback-archive>Feedback Archiv</button><p role="status">${esc(e.message)}</p>`;}finally{hostFeedbackLoading=false;}
}
function syncHostFeedback(){
 const host=typeof boot!=='undefined'&&boot?.role==='host'&&auth?.role==='host';document.querySelector('#host-feedback-menu').hidden=!host;
 if(host){if(hostFeedbackSession!==auth){hostFeedbackItems=[];hostFeedbackLoaded=0;hostFeedbackSession=auth;}drawHostFeedbackList();if(Date.now()-hostFeedbackLoaded>30000)void refreshHostFeedback();}else{hostFeedbackItems=[];hostFeedbackLoaded=0;hostFeedbackSession=null;closeHostFeedback(false);}
}
setInterval(()=>{if(typeof boot!=='undefined'&&boot?.role==='host'&&document.visibilityState==='visible')void refreshHostFeedback();},30000);
function closeHostFeedback(returnHome=false){
 hostFeedbackRevision++;if(hostFeedbackUrl){URL.revokeObjectURL(hostFeedbackUrl);hostFeedbackUrl=null;}
 document.body.classList.remove('host-feedback-open','host-feedback-archive-open');document.querySelector('#host-feedback-section').hidden=true;
 document.querySelector('#host-feedback-list').hidden=true;document.querySelector('#host-feedback-button').setAttribute('aria-expanded','false');
 if(returnHome&&boot?.role==='host')void navigate('home').catch(showError);
}
async function openHostFeedback(id){
 if(boot?.role!=='host')return;const f=hostFeedbackExamples.find(x=>x.id===id);if(!f)return;
 await capture();closeHostFeedback(false);const revision=++hostFeedbackRevision;
 view='host-feedback';selected=f.topic;frameInfo=null;drawTabs();drawSidebar();
 document.body.classList.add('host-feedback-open');const panel=document.querySelector('#host-feedback-section');panel.hidden=false;
 panel.innerHTML=`<div class="feedback-heading"><div><h2>Feedback</h2><small>Beispielfeedback</small></div><button id="host-feedback-close" class="secondary" aria-label="Feedback schließen">×</button></div><p class="feedback-context">${esc(f.path)}</p><div class="feedback-score"><strong>${f.rating} / 10</strong><meter min="1" max="10" value="${f.rating}" aria-label="Hilfreich: ${f.rating} von 10"></meter><div class="feedback-scale"><span>1 · Nicht hilfreich</span><span>10 · Hilfreich</span></div></div><h3>Ist-Situation</h3><div class="feedback-current"><div><h4>Was ist gut daran?</h4><p>${esc(f.good)}</p></div><div><h4>Was ist schlecht daran?</h4><p>${esc(f.bad)}</p></div></div><h3>Soll-Situation:</h3><h4>Wie kann man es besser machen?</h4><p>${esc(f.better)}</p><h3>Persönlicher Kommentar</h3><p>${esc(f.comment)}</p><h3>Anhänge</h3><p class="muted">Keine Anhänge</p>`;
 const read=hostFeedbackRead();read.add(f.id);try{sessionStorage.setItem('lp-example-feedback-read',JSON.stringify([...read]))}catch{}drawHostFeedbackList();
 if(f.kind==='audio'){drawAudioPractice({id:f.id,position:0,tasks:[feedbackAudioExample],draft:{}});return;}
 const topic=boot.presentations.find(t=>t.id===f.topic);
 $('#content').innerHTML=`<section class="presentation-view"><div class="slide-stage" id="feedback-slide" role="status">Folie wird geladen …</div><div class="slide-navigation row"><span>${esc(topic?.title||f.topic)} · Folie ${f.slide+1}</span></div></section>`;
 try{const blob=await materialBlob({topic:f.topic,slide:f.slide});if(revision!==hostFeedbackRevision)return;const next=await decodedSlide(blob,`${topic?.title||f.topic} – Folie ${f.slide+1}`);if(revision!==hostFeedbackRevision){URL.revokeObjectURL(next.url);return;}hostFeedbackUrl=next.url;$('#feedback-slide').replaceChildren(next.img);}catch(e){if(revision===hostFeedbackRevision)$('#feedback-slide').textContent=e.message;}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-feedback-archive]')){void openFeedbackArchive().catch(showError);return;}
 const done=e.target.closest('[data-feedback-done]');if(done){archiveExampleFeedback(done.dataset.feedbackDone);return;}
 if(e.target.closest('#host-feedback-button')){const list=$('#host-feedback-list');list.hidden=!list.hidden;if(!list.hidden)void refreshHostFeedback();$('#host-feedback-button').setAttribute('aria-expanded',String(!list.hidden));return;}
 const real=e.target.closest('[data-feedback-real]');if(real){void openRealFeedback(real.dataset.feedbackReal).catch(showError);return;}
 const file=e.target.closest('[data-feedback-file]');if(file){void openFeedbackAttachment(file).catch(showError);return;}
 const entry=e.target.closest('[data-feedback-example]');if(entry){void openHostFeedback(entry.dataset.feedbackExample).catch(showError);return;}
 if(e.target.closest('#host-feedback-close')){closeHostFeedback(true);return;}
 if(!e.target.closest('#host-feedback-menu')){$('#host-feedback-list').hidden=true;$('#host-feedback-button').setAttribute('aria-expanded','false');}
});
document.addEventListener('click',e=>{if((document.body.classList.contains('host-feedback-open')||document.body.classList.contains('host-feedback-archive-open'))&&e.target.closest('header button,#sidebar button,#sidebar select')&&!e.target.closest('#host-feedback-menu'))closeHostFeedback(false);},{capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#host-feedback-list').hidden=true;$('#host-feedback-button').setAttribute('aria-expanded','false');}});
document.addEventListener('change',e=>{if(e.target.id==='class-select')closeHostFeedback(false);},{capture:true});

// UI prototype only: archive state is limited to this browser session.
function archiveExampleFeedback(id){
 if(boot?.role!=='host'||!hostFeedbackExamples.some(f=>f.id===id))return;
 const archived=hostFeedbackArchived();archived.add(id);try{sessionStorage.setItem('lp-example-feedback-archived',JSON.stringify([...archived]))}catch{}
 drawHostFeedbackList();
}
async function openFeedbackArchive(){
 if(boot?.role!=='host')return;await capture();closeHostFeedback(false);view='feedback-archive';frameInfo=null;drawTabs();drawSidebar();document.body.classList.add('host-feedback-archive-open');
 const archived=hostFeedbackArchived(),tree={children:new Map(),items:[]};
 for(const f of hostFeedbackExamples){let node=tree;for(const title of f.path.split(' | ').reverse()){if(!node.children.has(title))node.children.set(title,{title,children:new Map(),items:[]});node=node.children.get(title);if(archived.has(f.id))node.items.push(f);}}
 function metric(node){const n=node.items.length,avg=n?node.items.reduce((sum,f)=>sum+f.rating,0)/n:0;return `<span class="archive-metric"><span class="archive-bar" role="meter" aria-label="Durchschnittliche Bewertung" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${avg.toFixed(1)}"><span style="width:${avg*10}%"></span></span><span>${n?avg.toLocaleString('de-DE',{maximumFractionDigits:1})+' / 10':'– / 10'}</span><small>${n} ${n===1?'Feedback':'Feedbacks'}</small></span>`;}
 function branch(node){return [...node.children.values()].map(child=>`<details open class="archive-branch"><summary><span class="archive-title">${esc(child.title)}</span>${metric(child)}</summary><div class="archive-children">${child.children.size?branch(child):child.items.map(f=>`<div class="archive-feedback-row"><button class="archive-feedback-entry secondary" data-feedback-example="${f.id}">${esc(boot.presentations.find(t=>t.id===f.topic)?.title||f.topic)}</button>${metric({items:[f]})}</div>`).join('')||'<p class="muted">Noch kein Beispiel erledigt</p>'}</div></details>`).join('');}
 $('#content').innerHTML=`<section class="feedback-archive"><p class="archive-placeholder" role="note">ACHTUNG! Placeholder ohne Funktion</p><h1>Feedback Archiv</h1><div class="archive-tree">${branch(tree)}</div></section>`;
}

function feedbackWeekLabel(value){const start=new Date(value),end=new Date(value+6*86400000);return `Woche ${start.toLocaleDateString('de-DE',{timeZone:'UTC'})} – ${end.toLocaleDateString('de-DE',{timeZone:'UTC'})}`;}
async function openRealFeedback(id){
 if(boot?.role!=='host')return;await capture();stopAudioPractice();closeHostFeedback(false);const revision=++hostFeedbackRevision,session=auth;
 const f=await feedbackRequest('read',{id},true);if(auth!==session||revision!==hostFeedbackRevision)return;
 const snap=f.snapshot;view='host-feedback';selected=snap.topic;frameInfo=null;drawTabs();drawSidebar();document.body.classList.add('host-feedback-open');
 const panel=$('#host-feedback-section');panel.hidden=false;
 panel.innerHTML=`<div class="feedback-heading"><h2>Feedback</h2><button id="host-feedback-close" class="secondary" aria-label="Feedback schließen">×</button></div><p>${esc(snap.path)}</p><small class="feedback-context-version">${esc(feedbackWeekLabel(f.week))} · Inhaltsversion ${esc(snap.version.slice(0,12))}</small><div class="feedback-score"><strong>${f.rating} / 10</strong><meter min="1" max="10" value="${f.rating}" aria-label="Hilfreich: ${f.rating} von 10"></meter></div><h3>Ist-Situation</h3><div class="feedback-current"><div><h4>Was ist gut daran?</h4><p>${esc(f.good||'–')}</p></div><div><h4>Was ist schlecht daran?</h4><p>${esc(f.bad||'–')}</p></div></div><h3>Soll-Situation:</h3><h4>Wie kann man es besser machen?</h4><p>${esc(f.better||'–')}</p><h3>Persönlicher Kommentar</h3><p>${esc(f.comment||'–')}</p><h3>Anhänge</h3>${f.files.length?f.files.map(file=>`<div class="feedback-attachment"><span>${esc(file.name)}</span><button data-feedback-file="${file.id}" data-feedback-id="${f.id}" data-feedback-name="${esc(file.name)}">Im Finder anzeigen</button><button class="secondary" data-feedback-file="${file.id}" data-feedback-id="${f.id}" data-feedback-name="${esc(file.name)}" data-download-only>Herunterladen</button></div>`).join(''):'<p class="muted">Keine Anhänge</p>'}<p id="feedback-attachment-status" role="status"></p>`;
 if(matchMedia('(max-width:700px)').matches)panel.scrollIntoView({block:'start'});
 const entry=hostFeedbackItems.find(x=>x.id===id);if(entry)entry.read=1;drawHostFeedbackList();
 if(snap.task){
  const t=snap.task;if(snap.kind==='audio')drawAudioPractice({id,position:0,tasks:[t],draft:{}});
  else{const rich=richTask(t,richAnswer(t,[]),true,'feedback');let fields=rich;if(fields===null)fields=t.kind==='choice'?`<div class="answers">${t.choices.map(c=>`<button class="answer" disabled>${esc(c.label)}</button>`).join('')}</div>`:`${t.kind==='cloze'?`<p>${t.parts.map(p=>p===null?' […] ':esc(p)).join('')}</p>`:''}${(t.fields||[]).map(field=>`<label>${esc(field)}<select disabled><option>Bitte auswählen</option>${t.choices.map(c=>`<option>${esc(c.label)}</option>`).join('')}</select></label>`).join('')}`;
  $('#content').innerHTML=`<section class="practice-round feedback-read-task"><div class="practice-heading">${esc(snap.title)} · ${esc(t.difficulty)}</div><h2>${esc(t.title)}</h2>${t.prompt?`<p>${esc(t.prompt)}</p>`:''}${fields}</section>`;}
  if(snap.media){const blob=await feedbackRequest('media',{id},true,true);if(revision!==hostFeedbackRevision)return;hostFeedbackUrl=URL.createObjectURL(blob);const audio=document.createElement('audio');audio.controls=true;audio.className='feedback-snapshot-audio';audio.src=hostFeedbackUrl;$('#content').prepend(audio);}return;
 }
 $('#content').innerHTML=`<section class="presentation-view"><div id="feedback-slide" class="slide-stage">Folie wird geladen …</div><div class="slide-navigation">${esc(snap.title)} · Folie ${snap.slide+1}</div></section>`;
 const blob=await feedbackRequest('media',{id},true,true);if(revision!==hostFeedbackRevision)return;const next=await decodedSlide(blob,snap.title);if(revision!==hostFeedbackRevision){URL.revokeObjectURL(next.url);return;}hostFeedbackUrl=next.url;$('#feedback-slide').replaceChildren(next.img);
}
async function openFeedbackAttachment(button){
 const status=$('#feedback-attachment-status');button.disabled=true;status.textContent='Anhang wird geladen …';
 try{const blob=await feedbackRequest('attachment',{id:button.dataset.feedbackId,file:button.dataset.feedbackFile},true,true),name=button.dataset.feedbackName.split('/').pop();
 if(!button.hasAttribute('data-download-only')){try{
  const local='http://127.0.0.1:47651',r=await fetch(local+'/session',{signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error();const {token}=await r.json();
  const shown=await fetch(local+'/reveal',{method:'POST',headers:{'X-Feedback-Local':token,'X-Feedback-Name':encodeURIComponent(name),'X-Feedback-File':button.dataset.feedbackFile},body:blob,signal:AbortSignal.timeout(60000)});if(!shown.ok)throw Error();status.textContent='Anhang im Finder ausgewählt.';return;
 }catch{status.textContent='Der lokale Finder-Dienst ist nicht erreichbar oder der Browser hat den Zugriff blockiert. Nutze „Herunterladen“.';return;}}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='Download gestartet.';
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
}
