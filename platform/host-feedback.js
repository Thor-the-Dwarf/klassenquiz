'use strict';
const feedbackAudioExample={"id": "Audio_Uebung_AP1_Arbeitsplatzanforderungen_und_Hardwareauswahl_easy_01:0", "kind": "choice", "multi": false, "title": "Für einen Arbeitsplatz mit Browser, Tabellenkalkulation und Videokonferenzen sollte zuerst die höchste verfügbare CPU-Taktfrequenz ausgewählt werden, bevor der konkrete Bedarf erhoben wird.", "prompt": "", "choices": [{"id": "true", "label": "Richtig"}, {"id": "false", "label": "Falsch"}], "topic": "Level07_01_Arbeitsplatzanforderungen_und_Hardwareauswahl", "difficulty": "easy", "key": "feedback-example"};
const hostFeedbackExamples=[
 {id:'example-infographic',path:'Infographik | BWL | LFPV-AP1 | GFN',kind:'slide',topic:'Level01_01_AP1_Unternehmen_und_Unternehmensziele',slide:0,rating:8,good:'Die drei Bereiche sind klar voneinander getrennt. Die Symbole helfen mir bei der Orientierung.',bad:'Auf dem Smartphone ist der Text recht klein.',better:'Die einzelnen Bereiche zusätzlich vergrößern können.',comment:'Eine gute Übersicht zum Wiederholen.'},
 {id:'example-audio',path:'AudioÜbung | IT | LFPV-AP1 | GFN',kind:'audio',topic:feedbackAudioExample.topic,rating:6,good:'Die Aufgabe zeigt, warum zuerst der tatsächliche Bedarf ermittelt werden sollte.',bad:'Der Satz ist lang. Beim ersten Hören habe ich den Anfang wieder vergessen.',better:'Die Aussage in zwei kürzere Sätze aufteilen und eine kurze Pause einfügen.',comment:'Mit Kopfhörern konnte ich mich besser konzentrieren.'},
 {id:'example-discussion',path:'Diskussion | BWL | LFPV-AP1 | GFN',kind:'slide',topic:'Level01_02_Kundenbedarf_Beratung_und_Kommunikation',slide:1,rating:9,good:'Das gemeinsame Bild macht es leicht, der Erklärung zu folgen.',bad:'Die Folie wurde gewechselt, bevor ich meine Notizen fertig hatte.',better:'Vor dem Wechsel kurz fragen, ob alle so weit sind.',comment:'Die gemeinsame Besprechung war für mich besonders hilfreich.'}
];
let hostFeedbackRevision=0,hostFeedbackUrl=null;
function hostFeedbackRead(){try{return new Set(JSON.parse(sessionStorage.getItem('lp-example-feedback-read')||'[]'))}catch{return new Set()}}
function drawHostFeedbackList(){
 const read=hostFeedbackRead(),unread=hostFeedbackExamples.filter(f=>!read.has(f.id)).length;
 const badge=document.querySelector('#host-feedback-count');badge.textContent=unread;badge.hidden=!unread;
 document.querySelector('#host-feedback-button').setAttribute('aria-label',unread?`Feedback, ${unread} neue Meldungen`:'Feedback');
 document.querySelector('#host-feedback-list').innerHTML=`<ul>${hostFeedbackExamples.map(f=>`<li><button data-feedback-example="${f.id}" class="${read.has(f.id)?'':'unread'}">${esc(f.path)}</button></li>`).join('')}</ul>`;
}
function syncHostFeedback(){
 const host=typeof boot!=='undefined'&&boot?.role==='host'&&auth?.role==='host';
 document.querySelector('#host-feedback-menu').hidden=!host;
 if(host)drawHostFeedbackList();else closeHostFeedback(false);
}
function closeHostFeedback(returnHome=false){
 hostFeedbackRevision++;if(hostFeedbackUrl){URL.revokeObjectURL(hostFeedbackUrl);hostFeedbackUrl=null;}
 document.body.classList.remove('host-feedback-open');document.querySelector('#host-feedback-section').hidden=true;
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
 if(e.target.closest('#host-feedback-button')){const list=$('#host-feedback-list');list.hidden=!list.hidden;$('#host-feedback-button').setAttribute('aria-expanded',String(!list.hidden));return;}
 const entry=e.target.closest('[data-feedback-example]');if(entry){void openHostFeedback(entry.dataset.feedbackExample).catch(showError);return;}
 if(e.target.closest('#host-feedback-close')){closeHostFeedback(true);return;}
 if(!e.target.closest('#host-feedback-menu')){$('#host-feedback-list').hidden=true;$('#host-feedback-button').setAttribute('aria-expanded','false');}
});
document.addEventListener('click',e=>{if(document.body.classList.contains('host-feedback-open')&&e.target.closest('header button,#sidebar button,#sidebar select')&&!e.target.closest('#host-feedback-menu'))closeHostFeedback(false);},{capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#host-feedback-list').hidden=true;$('#host-feedback-button').setAttribute('aria-expanded','false');}});
document.addEventListener('change',e=>{if(e.target.id==='class-select')closeHostFeedback(false);},{capture:true});
