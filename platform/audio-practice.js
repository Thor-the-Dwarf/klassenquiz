'use strict';
const audioPractice={key:null,revision:0,player:null,url:null,mic:false,recognition:null,rate:1,cache:new Map(),scope:null,timer:null,transition:false};
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
  a.url=URL.createObjectURL(blob);const player=new Audio(a.url);a.player=player;player.playbackRate=a.rate;player.preservesPitch=true;
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
 el.innerHTML=`<section class="practice-round audio-round" id="audio-practice"><div class="practice-heading">${esc((boot.presentations||[]).find(x=>x.id===t.topic)?.title||t.topic)} · ${esc(t.difficulty)} · ${r.position+1}/${r.tasks.length}</div><div class="audio-settings"><button data-audio-mic class="secondary" aria-pressed="${audioPractice.mic}">Mikrofon ${audioPractice.mic?'an':'aus'}</button><label>Tempo<select id="audio-rate">${[.75,1,1.25,1.5].map(rate=>`<option value="${rate}" ${audioPractice.rate===rate?'selected':''}>${String(rate).replace('.',',')}×</option>`).join('')}</select></label></div><h2>${esc(t.title)}</h2><div class="audio-answers"><button data-audio-answer="true" ${locked?'disabled':''}><strong>Richtig</strong><small>← · Linksklick · „ja“ oder „richtig“</small></button><button data-audio-answer="false" ${locked?'disabled':''}><strong>Falsch</strong><small>→ · Rechtsklick · „nein“ oder „falsch“</small></button></div><button data-audio-repeat class="secondary" ${locked?'disabled':''}>↻ Nochmal <small>↓ · Mausrad · „nochmal“</small></button><p id="audio-status" role="status"></p>${locked?'<button data-audio-next>Weiter</button>':''}</section>`;
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
  if(/^(ja|richtig|stimmt|korrekt)$/.test(words))answerAudioPractice('true');else if(/^(nein|falsch|stimmt nicht|nicht richtig)$/.test(words))answerAudioPractice('false');else if(/^(nochmal|noch einmal|wiederholen)$/.test(words))playAudioPractice();else audioStatus('Bitte „richtig“, „falsch“ oder „nochmal“ sagen.');};
 r.onerror=e=>{if(a.revision!==revision)return;if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){a.mic=false;const b=$('[data-audio-mic]');if(b){b.textContent='Mikrofon aus';b.setAttribute('aria-pressed','false');}}if(e.error!=='no-speech')a.mic=false;audioStatus('Spracherkennung nicht verfügbar. Nutze die Buttons oder Pfeiltasten.');};
 r.onend=()=>{if(a.recognition===r)a.recognition=null;if(a.revision===revision&&a.mic&&audioCurrent()&&!a.transition)a.timer=setTimeout(listenAudioPractice,900);};
 try{r.start();audioStatus('Ich höre zu …');}catch{a.recognition=null;audioStatus('Mikrofon konnte nicht starten. Nutze die Buttons oder Pfeiltasten.');}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||!audioCurrent())return;
 if(b.dataset.audioAnswer)answerAudioPractice(b.dataset.audioAnswer);
 if(b.hasAttribute('data-audio-repeat'))playAudioPractice();
 if(b.hasAttribute('data-audio-next'))advanceAudioPractice();
 if(b.hasAttribute('data-audio-mic')){audioPractice.mic=!audioPractice.mic;b.setAttribute('aria-pressed',String(audioPractice.mic));b.textContent='Mikrofon '+(audioPractice.mic?'an':'aus');
  if(!audioPractice.mic){if(audioPractice.recognition){try{audioPractice.recognition.abort()}catch{}}}else if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){audioPractice.mic=false;b.textContent='Mikrofon aus';b.setAttribute('aria-pressed','false');audioStatus('Dieser Browser unterstützt keine Spracherkennung.');}else if(!audioPractice.player||audioPractice.player.paused)listenAudioPractice();}
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
