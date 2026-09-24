'use strict';
async function feedbackRequest(action,data={},authenticated=false,blob=false){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{const r=await fetch(API.replace('/api/platform','/api/feedback'),{method:'POST',headers:{'Content-Type':'application/json',...(authenticated&&auth?{Authorization:'Bearer '+auth.token}:{})},body:JSON.stringify({action,...data}),signal:controller.signal});if(!r.ok){const j=await r.json();throw Object.assign(Error(j.error||'Feedback konnte nicht geladen werden.'),{status:r.status});}return blob?r.blob():r.json();}finally{clearTimeout(timer);}
}
const feedbackDrafts=new Map();let feedbackDraft=null,feedbackBusy=false,feedbackOwner=null;
function feedbackContext(){
 if(view==='practice'&&P.round)return {kind:'round',round:P.round.id,index:P.round.position};
 if(view==='presentation'&&slidesView.topic)return slidesView.displayed?.topic===slidesView.topic.id?{...slidesView.displayed}:null;
 if(view==='discussion'&&discussion.state)return discussion.displayed?.session===discussion.state.id?{...discussion.displayed}:null;
 if(view==='quiz'&&quiz?.question)return {kind:'quiz',quiz:quiz.id,index:quiz.index};
 if(view==='exercise'&&frameInfo?.attempt&&Number.isInteger(frameInfo.index))return {kind:'exercise',exercise:frameInfo.id,attempt:frameInfo.attempt,index:frameInfo.index};
 return null;
}
function feedbackValues(){return Object.fromEntries(['good','bad','better','personal'].map(k=>[k,document.querySelector('#feedback-'+k).value]));}
function rememberFeedback(){if(feedbackDraft)feedbackDraft.values={...feedbackValues(),rating:document.querySelector('#feedback-rating').value};}
function prepareFeedback(){
 const owner=auth?.token;if(owner!==feedbackOwner){feedbackDrafts.clear();feedbackDraft=null;feedbackOwner=owner;}
 const context=feedbackContext(),key=JSON.stringify(context);if(!context){feedbackDraft=null;feedbackStatus('Öffne zuerst eine Übung, Infografik oder Diskussion.');renderFeedbackFiles();return;}
 if(!feedbackDrafts.has(key))feedbackDrafts.set(key,{id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''),context,files:[],values:{rating:5,good:'',bad:'',better:'',personal:''}});
 feedbackDraft=feedbackDrafts.get(key);const d=feedbackDraft;
 for(const [k,v] of Object.entries(d.values))document.querySelector('#feedback-'+k).value=v;
 document.querySelector('#feedback-rating-value').value=d.values.rating;feedbackStatus('');renderFeedbackFiles();
 // Freeze the source version now, not at submission time.
 if(!d.ready)d.ready=feedbackRequest('begin',{id:d.id,token:d.token,context:d.context},true).catch(e=>{d.ready=null;if(feedbackDraft===d)feedbackStatus(e.message,true);throw e;});
 d.ready.catch(()=>{});
}
function feedbackStatus(text,error=false){const el=document.querySelector('#feedback-status');el.textContent=text;el.classList.toggle('error',error);}
function feedbackFileSize(size){return size<1000000?(size<1000?size+' B':(size/1000).toLocaleString('de-DE',{maximumFractionDigits:1})+' KB'):(size/1000000).toLocaleString('de-DE',{maximumFractionDigits:2})+' MB';}
function renderFeedbackFiles(){
 const files=feedbackDraft?.files||[],size=files.reduce((n,f)=>n+f.file.size,0);
 document.querySelector('#feedback-files').innerHTML=files.map(f=>`<li><span>${esc(f.name)} <small>${feedbackFileSize(f.file.size)}</small></span><button type="button" class="secondary" data-feedback-remove="${f.id}" ${feedbackBusy?'disabled':''} aria-label="${esc(f.name)} entfernen">×</button></li>`).join('');
 document.querySelector('#feedback-total').textContent=size?`${feedbackFileSize(size)} / 50 MB insgesamt`:'50 MB insgesamt';
 document.querySelector('#feedback-send-anonymous').disabled=!feedbackDraft||feedbackBusy;
 document.querySelector('#feedback-dropzone').disabled=!feedbackDraft||feedbackBusy;
}
function addFeedbackFiles(items){if(!feedbackDraft||feedbackBusy)return;const size=feedbackDraft.files.reduce((s,f)=>s+f.file.size,0)+items.reduce((s,f)=>s+f.file.size,0);if(size>50000000){feedbackStatus('Maximal 50 MB insgesamt. Die Auswahl wurde nicht hinzugefügt.',true);return;}
 feedbackDraft.files.push(...items.map(x=>({...x,id:crypto.randomUUID()})));feedbackStatus('');renderFeedbackFiles();}
async function feedbackDrop(items){const draft=feedbackDraft,files=[],entries=items.map(item=>({entry:item.webkitGetAsEntry?.(),file:item.getAsFile()}));async function walk(entry,prefix=''){if(entry.isFile){const file=await new Promise((r,j)=>entry.file(r,j));files.push({file,name:prefix+file.name});}else if(entry.isDirectory){const reader=entry.createReader();for(;;){const entries=await new Promise((r,j)=>reader.readEntries(r,j));if(!entries.length)break;for(const child of entries)await walk(child,prefix+entry.name+'/');}}}
 for(const {entry,file} of entries){if(entry)await walk(entry);else if(file)files.push({file,name:file.name});}if(feedbackDraft===draft)addFeedbackFiles(files);}
async function retryFeedback(fn){for(let i=0;;i++){try{return await fn();}catch(e){if(i>=2||e.status&&e.status<500&&e.status!==429)throw e;await new Promise(r=>setTimeout(r,500*(i+1)));}}}
async function sendFeedback(){
 if(feedbackBusy||!feedbackDraft)return;rememberFeedback();const d=feedbackDraft,values={...d.values};feedbackBusy=true;
 for(const el of document.querySelectorAll('#feedback-section input,#feedback-section textarea,#feedback-section button'))el.disabled=true;
 try{
 if(!d.ready)d.ready=feedbackRequest('begin',{id:d.id,token:d.token,context:d.context},true).catch(e=>{d.ready=null;throw e;});await d.ready;
 const capability={id:d.id,token:d.token},status=await feedbackRequest('status',capability);
 if(status.state!=='sent'){
 for(const old of status.files)if(!d.files.some(x=>x.id===old.id))await feedbackRequest('remove',{...capability,file:old.id});
 let done=0,total=d.files.reduce((s,f)=>s+f.file.size,0);
 for(const item of d.files){await retryFeedback(()=>feedbackRequest('file',{...capability,file:item.id,name:item.name,size:item.file.size}));for(let part=0;part<Math.ceil(item.file.size/5000000);part++){
 const chunk=item.file.slice(part*5000000,(part+1)*5000000);feedbackStatus(`Anhänge übertragen: ${total?Math.round(done/total*100):100} %`);
 await retryFeedback(async()=>{const r=await fetch(API.replace('/api/platform','/api/feedback')+`?id=${d.id}&file=${item.id}&part=${part}`,{method:'PUT',headers:{'X-Feedback-Token':d.token},body:chunk,signal:AbortSignal.timeout(90000)});if(!r.ok){const j=await r.json();throw Object.assign(Error(j.error||'Upload fehlgeschlagen.'),{status:r.status});}});done+=chunk.size;}}
 feedbackStatus('Feedback wird gesendet …');await retryFeedback(()=>feedbackRequest('send',{...capability,rating:Number(values.rating),good:values.good,bad:values.bad,better:values.better,comment:values.personal}));
 }
 feedbackDrafts.delete(JSON.stringify(d.context));feedbackDraft=null;feedbackBusy=false;toggleFeedback(false);document.querySelector('#feedback-form').reset();message('Feedback gesendet. Es wird der Kursleitung gesammelt ab nächster Woche angezeigt.');
 }catch(e){feedbackStatus(e.status===410?'Der Entwurf ist abgelaufen. Schließe das Feedback und öffne es erneut; deine Texte und Anhänge bleiben erhalten.':e.message,true);if(e.status===410){d.id=crypto.randomUUID();d.token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');d.ready=null;}}
 finally{feedbackBusy=false;for(const el of document.querySelectorAll('#feedback-section input,#feedback-section textarea,#feedback-section button'))el.disabled=false;renderFeedbackFiles();}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#feedback-dropzone'))document.querySelector('#feedback-pickers').hidden=!document.querySelector('#feedback-pickers').hidden;
 if(e.target.closest('#feedback-pick-files'))document.querySelector('#feedback-file-input').click();
 if(e.target.closest('#feedback-pick-folder'))document.querySelector('#feedback-folder-input').click();
 const remove=e.target.closest('[data-feedback-remove]');if(remove&&!feedbackBusy){feedbackDraft.files=feedbackDraft.files.filter(f=>f.id!==remove.dataset.feedbackRemove);renderFeedbackFiles();}
 if(e.target.closest('#feedback-send-anonymous'))void sendFeedback();
});
document.addEventListener('change',e=>{if(['feedback-file-input','feedback-folder-input'].includes(e.target.id)){addFeedbackFiles([...e.target.files].map(file=>({file,name:file.webkitRelativePath||file.name})));e.target.value='';document.querySelector('#feedback-pickers').hidden=true;}});
document.addEventListener('drop',e=>{if(e.target.closest('#feedback-dropzone')){e.preventDefault();void feedbackDrop([...e.dataTransfer.items]).catch(e=>feedbackStatus(e.message,true));}});
window.addEventListener('beforeunload',e=>{if(feedbackBusy){e.preventDefault();e.returnValue='';}});
