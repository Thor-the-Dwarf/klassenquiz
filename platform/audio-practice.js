'use strict';
const audioPractice={key:null,revision:0,player:null,url:null,mic:false,recognition:null,rate:1,volume:1,cache:new Map(),scope:null,timer:null,transition:false};
function stopAudioPractice(){
 const a=audioPractice;a.revision++;clearTimeout(a.timer);a.transition=false;
 if(a.player){a.player.onended=a.player.onerror=null;a.player.pause();a.player.removeAttribute('src');a.player.load();a.player=null;}
 if(a.url){URL.revokeObjectURL(a.url);a.url=null;}
 if(a.recognition){const r=a.recognition;a.recognition=null;r.onend=r.onerror=r.onresult=null;try{r.abort()}catch{}}
 a.key=null;
}
function audioStatus(text){const el=$('#audio-status');if(el)el.textContent=text;}
function audioCurrent(){return view==='practice'&&P.round?.modality==='auditory'&&$('#audio-practice');}
async function audioRecording(index){
 const a=audioPractice,scope=JSON.stringify([auth.token,cls.id]);if(a.scope!==scope){a.cache.clear();a.scope=scope;}
 const key=P.round.id+':'+index;let promise=a.cache.get(key);
 if(!promise){promise=materialBlob({action:'audioAsset',round:P.round.id,index});a.cache.set(key,promise);promise.catch(()=>{if(a.cache.get(key)===promise)a.cache.delete(key)});while(a.cache.size>8)a.cache.delete(a.cache.keys().next().value);}
 return promise;
}
async function playAudioPractice(){
 if(!audioCurrent()||audioPractice.transition)return;
 const r=P.round,t=r.tasks[r.position];if(t.submission||t.pending)return;
 stopAudioPractice();const a=audioPractice,revision=a.revision,round=r.id,index=r.position;
 a.key=round+':'+index;audioStatus('Aufnahme wird geladen …');
 try{
  const blob=await audioRecording(index);if(a.revision!==revision||!audioCurrent()||P.round.id!==round||P.round.position!==index)return;
  a.url=URL.createObjectURL(blob);const player=new Audio(a.url);a.player=player;player.playbackRate=a.rate;player.volume=a.volume;player.preservesPitch=true;
  player.onended=()=>{if(a.revision!==revision)return;audioStatus('Richtig oder falsch?');listenAudioPractice();};
  player.onerror=()=>audioStatus('Die Aufnahme konnte nicht abgespielt werden. Bitte „Nochmal“ drücken.');
  await player.play();audioStatus('Die Aussage wird vorgelesen …');
  if(index+1<r.tasks.length)audioRecording(index+1).catch(()=>{});
 }catch(e){if(a.revision===revision&&audioCurrent())audioStatus(e.name==='NotAllowedError'?'Zum Vorlesen bitte „Nochmal“ drücken.':e.message||'Aufnahme nicht verfügbar. Bitte erneut versuchen.');}
}
function drawAudioPractice(){
 const r=P.round,el=$('#content');if(!P.courses.includes('PVAP1')){stopAudioPractice();el.innerHTML='<p>Dieser Kurs ist derzeit nicht freigegeben.</p>';return;}
 const done=r.tasks.every(t=>t.submission||t.pending);
 if(done){stopAudioPractice();const confirmed=r.tasks.filter(t=>t.submission),correct=confirmed.filter(t=>t.submission.score===1000).length;
  el.innerHTML=`<section class="practice-round audio-round"><h2>Deine Auswertung</h2><p>${correct} von ${r.tasks.length} richtig${confirmed.length<r.tasks.length?' · Antworten werden noch gespeichert':''}</p>${r.tasks.map((t,i)=>`<article class="feedback"><strong>${i+1}. ${esc(t.title)}</strong><p>${t.submission?(t.submission.score===1000?'✓ Richtig beantwortet':'✕ Falsch beantwortet'):'Antwort vorgemerkt'} · Deine Antwort: ${esc(t.choices.find(c=>c.id===(t.submission?.answer||t.pending||[])[0])?.label)}</p>${t.submission?`<p>${esc(t.explanation)}</p>`:''}</article>`).join('')}<button data-practice-new>Noch einmal üben</button></section>`;return;}
 const t=r.tasks[r.position],key=r.id+':'+r.position,locked=!!(t.submission||t.pending);
 if($('#audio-practice')&&audioPractice.key===key){return;}
 stopAudioPractice();audioPractice.key=key;
 el.innerHTML=`<section class="practice-round audio-round" id="audio-practice"><div class="practice-heading">${esc((boot.presentations||[]).find(x=>x.id===t.topic)?.title||t.topic)} · ${esc(t.difficulty)} · ${r.position+1}/${r.tasks.length}</div><div class="audio-settings"><label class="audio-volume" for="audio-volume"><strong>Lautstärke <output id="audio-volume-value">${Math.round(audioPractice.volume*100)} %</output></strong><input id="audio-volume" type="range" min="0" max="100" value="${Math.round(audioPractice.volume*100)}" aria-label="Lautstärke"></label><label class="audio-tempo" for="audio-rate"><strong>Sprechtempo</strong><select id="audio-rate">${[[.8,'Langsam'],[1,'Normal'],[1.15,'Etwas schneller']].map(([rate,label])=>`<option value="${rate}" ${audioPractice.rate===rate?'selected':''}>${label}</option>`).join('')}</select></label><button data-audio-mic aria-pressed="${audioPractice.mic}"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/><path id="micSlash" d="M3 3l18 18" stroke-width="2.5"/></svg><span class="mic-caption"><strong>Mikrofon an / aus</strong><small>Klick zum Umschalten</small></span></button></div><h2>${esc(t.title)}</h2><div class="audio-answers"><button data-audio-answer="true" ${locked?'disabled':''}><strong>Richtig</strong><small><span class="input-icons" role="img" aria-label="Linksklick oder Pfeiltaste links" title="Linksklick oder Pfeiltaste links"><svg class="mouse-icon" width="24" height="32" viewBox="0 0 24 32" aria-hidden="true" focusable="false"><path d="M12 3A8 8 0 0 0 4 11v5h8Z" fill="var(--cyan)"/><rect x="4" y="3" width="16" height="26" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v13M4 16h16" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="10.5" y="8" width="3" height="6" rx="1.5" fill="var(--bg)" stroke="currentColor" stroke-width="1"/></svg><svg class="key-icon" width="54" height="36" viewBox="0 0 54 36" aria-hidden="true"><rect x="19" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M26 12V6m-3 3 3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="19" width="16" height="16" rx="3" fill="var(--cyan)" stroke="currentColor" stroke-width="1.3"/><path d="M12 26H6m3-3-3 3 3 3" fill="none" stroke="var(--bg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M26 24v6m-3-3 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="37" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M42 26h6m-3-3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><br>sage:<br>richtig<br>ja<br>stimmt<br>korrekt<br>wahr<br>genau<br>passt<br>trifft zu</small></button><button data-audio-answer="false" ${locked?'disabled':''}><strong>Falsch</strong><small><span class="input-icons" role="img" aria-label="Rechtsklick oder Pfeiltaste rechts" title="Rechtsklick oder Pfeiltaste rechts"><svg class="mouse-icon" width="24" height="32" viewBox="0 0 24 32" aria-hidden="true" focusable="false"><path d="M12 3a8 8 0 0 1 8 8v5h-8Z" fill="var(--cyan)"/><rect x="4" y="3" width="16" height="26" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v13M4 16h16" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="10.5" y="8" width="3" height="6" rx="1.5" fill="var(--bg)" stroke="currentColor" stroke-width="1"/></svg><svg class="key-icon" width="54" height="36" viewBox="0 0 54 36" aria-hidden="true"><rect x="19" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M26 12V6m-3 3 3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 26H6m3-3-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M26 24v6m-3-3 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="37" y="19" width="16" height="16" rx="3" fill="var(--cyan)" stroke="currentColor" stroke-width="1.3"/><path d="M42 26h6m-3-3 3 3-3 3" fill="none" stroke="var(--bg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><br>sage:<br>falsch<br>nein<br>stimmt nicht<br>inkorrekt<br>nicht wahr<br>nope<br>passt nicht<br>trifft nicht zu</small></button></div><button data-audio-repeat ${locked?'disabled':''}><strong>↻ Nochmal</strong><small><span class="input-icons" role="img" aria-label="Mausrad oder Pfeiltaste unten" title="Mausrad oder Pfeiltaste unten"><svg class="mouse-icon" width="24" height="32" viewBox="0 0 24 32" aria-hidden="true"><rect x="4" y="3" width="16" height="26" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 16h16M12 3v4" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="9.5" y="7" width="5" height="9" rx="2.5" fill="var(--cyan)"/><path d="m9 5 3-3 3 3m-6 14 3 3 3-3" fill="none" stroke="var(--cyan)" stroke-width="1.5"/></svg><svg class="key-icon" width="54" height="36" viewBox="0 0 54 36" aria-hidden="true"><rect x="19" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M26 12V6m-3 3 3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 26H6m3-3-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="19" width="16" height="16" rx="3" fill="var(--cyan)" stroke="currentColor" stroke-width="1.3"/><path d="M26 24v6m-3-3 3 3 3-3" fill="none" stroke="var(--bg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="37" y="19" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M42 26h6m-3-3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><br>sage: „nochmal“</small></button><p id="audio-status" role="status"></p>${locked?'<button data-audio-next>Weiter</button>':''}</section>`;
 if(!locked)playAudioPractice();
}
function advanceAudioPractice(){
 if(!audioCurrent())return;const r=P.round;if(!(r.tasks[r.position].submission||r.tasks[r.position].pending))return;
 stopAudioPractice();if(r.position<r.tasks.length-1)r.position++;practiceSave();drawAudioPractice();
}
function answerAudioPractice(value){
 if(!audioCurrent()||audioPractice.transition)return;const r=P.round,t=r.tasks[r.position];if(t.submission||t.pending)return;
 stopAudioPractice();audioPractice.key=r.id+':'+r.position;audioPractice.transition=true;
 t.pending=[value];practiceCache();enqueue('roundAnswer',{round:r.id,index:r.position,answer:[value]});
 document.querySelectorAll('[data-audio-answer],[data-audio-repeat]').forEach(b=>b.disabled=true);audioStatus('Antwort übernommen.');
 audioPractice.timer=setTimeout(advanceAudioPractice,330);
}
function listenAudioPractice(){
 const a=audioPractice,Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!a.mic||!Recognition||!audioCurrent()||a.recognition||a.transition)return;
 const t=P.round.tasks[P.round.position];if(t.submission||t.pending)return;
 const revision=a.revision,r=new Recognition();a.recognition=r;r.lang='de-DE';r.interimResults=false;r.continuous=false;
 r.onresult=e=>{if(a.revision!==revision)return;const words=e.results[0][0].transcript.toLowerCase().replace(/[.!?,]/g,'').trim();
  if(/^(ja|richtig|stimmt|korrekt|wahr|genau|passt|trifft zu)$/.test(words))answerAudioPractice('true');else if(/^(nein|falsch|stimmt nicht|nicht richtig|inkorrekt|nicht wahr|nope|passt nicht|trifft nicht zu)$/.test(words))answerAudioPractice('false');else if(/^(nochmal|noch einmal|wiederholen)$/.test(words))playAudioPractice();else audioStatus('Bitte „richtig“, „falsch“ oder „nochmal“ sagen.');};
 r.onerror=e=>{if(a.revision!==revision)return;if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){a.mic=false;const b=$('[data-audio-mic]');if(b){b.setAttribute('aria-pressed','false');}}if(e.error!=='no-speech')a.mic=false;audioStatus('Spracherkennung nicht verfügbar. Nutze die Buttons oder Pfeiltasten.');};
 r.onend=()=>{if(a.recognition===r)a.recognition=null;if(a.revision===revision&&a.mic&&audioCurrent()&&!a.transition)a.timer=setTimeout(listenAudioPractice,900);};
 try{r.start();audioStatus('Ich höre zu …');}catch{a.recognition=null;audioStatus('Mikrofon konnte nicht starten. Nutze die Buttons oder Pfeiltasten.');}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||!audioCurrent())return;
 if(b.dataset.audioAnswer)answerAudioPractice(b.dataset.audioAnswer);
 if(b.hasAttribute('data-audio-repeat'))playAudioPractice();
 if(b.hasAttribute('data-audio-next'))advanceAudioPractice();
 if(b.hasAttribute('data-audio-mic')){audioPractice.mic=!audioPractice.mic;b.setAttribute('aria-pressed',String(audioPractice.mic));
  if(!audioPractice.mic){if(audioPractice.recognition){try{audioPractice.recognition.abort()}catch{}}}else if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){audioPractice.mic=false;b.setAttribute('aria-pressed','false');audioStatus('Dieser Browser unterstützt keine Spracherkennung.');}else if(!audioPractice.player||audioPractice.player.paused)listenAudioPractice();}
});
document.addEventListener('change',e=>{if(e.target.id==='audio-rate'){audioPractice.rate=Number(e.target.value);if(audioPractice.player)audioPractice.player.playbackRate=audioPractice.rate;}});
document.addEventListener('keydown',e=>{
 if(!audioCurrent()||e.defaultPrevented||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
 if(!['ArrowLeft','ArrowRight','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowDown')playAudioPractice();else answerAudioPractice(e.key==='ArrowLeft'?'true':'false');
});
document.addEventListener('contextmenu',e=>{if(audioCurrent()&&e.target.closest('#audio-practice')&&!e.target.closest('input,select,textarea,.audio-settings')){e.preventDefault();answerAudioPractice('false');}});
let audioWheelAt=-Infinity;
document.addEventListener('wheel',e=>{if(!audioCurrent()||e.ctrlKey||e.target.closest('select,input,textarea')||!e.target.closest('#audio-practice'))return;const el=$('#audio-practice');if(el.scrollHeight>innerHeight)return;e.preventDefault();const now=performance.now();if(now-audioWheelAt>550)playAudioPractice();audioWheelAt=now;},{passive:false});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudioPractice();});
window.addEventListener('pagehide',stopAudioPractice);

new MutationObserver(()=>{if(audioPractice.key&&!audioCurrent())stopAudioPractice()}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('click',e=>{if(audioCurrent()&&e.button===0&&e.detail<=1&&e.target.closest('#audio-practice')&&!e.target.closest('button,a,input,select,textarea,[contenteditable="true"],.audio-settings'))answerAudioPractice('true');});

document.addEventListener('input',e=>{if(e.target.id!=='audio-volume')return;audioPractice.volume=Number(e.target.value)/100;if(audioPractice.player)audioPractice.player.volume=audioPractice.volume;const out=$('#audio-volume-value');if(out)out.textContent=e.target.value+' %';e.target.setAttribute('aria-valuetext',e.target.value+' Prozent');});
