'use strict';
const feedbackPending=new Map();let feedbackFlashTimer;
function feedbackLocked(){return document.body.classList.contains('learner-layout')&&document.body.classList.contains('feedback-open');}
function deferFeedback(key,fn){if(!feedbackLocked())return false;feedbackPending.set(key,fn);return true;}
function flashFeedback(){
 const elements=[document.querySelector('#feedback-section'),document.querySelector('#learner-feedback')];
 clearTimeout(feedbackFlashTimer);for(const el of elements){el.classList.remove('feedback-blocked');void el.offsetWidth;el.classList.add('feedback-blocked');}
 feedbackFlashTimer=setTimeout(()=>elements.forEach(el=>el.classList.remove('feedback-blocked')),700);
}
function syncFeedbackAvailability(){
 const button=document.querySelector('#learner-feedback');
 button.disabled=!feedbackLocked()&&(!document.body.classList.contains('learner-layout')||!feedbackContext());
}
new MutationObserver(syncFeedbackAvailability).observe(document.querySelector('#root'),{childList:true,subtree:true});
function toggleFeedback(open){
 if(open&&!feedbackLocked()&&!feedbackContext()){syncFeedbackAvailability();return;}
 if(feedbackBusy&&!open){flashFeedback();return;}
 if(!open)rememberFeedback();
 const panel=document.querySelector('#feedback-section'),button=document.querySelector('#learner-feedback');
 const wasOpen=feedbackLocked();
 const visible=!!open&&document.body.classList.contains('learner-layout');
 panel.hidden=!visible;document.body.classList.toggle('feedback-open',visible);
 button.setAttribute('aria-expanded',String(visible));button.classList.toggle('active',visible);
 if(visible&&!wasOpen){
  prepareFeedback();
  if(typeof audioCurrent==='function'&&audioCurrent()){const advance=audioPractice.transition;stopAudioPractice();feedbackPending.set('audio',()=>advance?advanceAudioPractice():drawAudioPractice());}
  if(view==='discussion'){discussion.renderKey=null;feedbackPending.set('discussion',drawDiscussion);}
  if(view==='presentation')feedbackPending.set('presentation',drawPresentation);
  document.querySelector('#feedback-rating').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)panel.scrollIntoView({block:'start'});
 }else if(!visible&&wasOpen){const pending=[...feedbackPending.values()];feedbackPending.clear();if(document.body.classList.contains('learner-layout'))void (async()=>{for(const fn of pending)await fn();await refreshClass();})().catch(showError);}

}
function syncFeedback(){
 syncHostFeedback();
 const learner=document.body.classList.contains('learner-layout');
 document.querySelector('#learner-feedback').hidden=!learner;
 syncFeedbackAvailability();
 if(!learner){feedbackDrafts.clear();feedbackDraft=null;feedbackPending.clear();toggleFeedback(false);document.querySelector('#feedback-form').reset();document.querySelector('#feedback-rating-value').value='5';}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#learner-feedback'))toggleFeedback(document.querySelector('#feedback-section').hidden);
 if(e.target.closest('#feedback-close')){toggleFeedback(false);document.querySelector('#learner-feedback').focus();}
});
document.addEventListener('input',e=>{if(e.target.id==='feedback-rating')document.querySelector('#feedback-rating-value').value=e.target.value;});
document.addEventListener('dragover',e=>{if(e.target.closest('#feedback-dropzone'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.target.closest('#feedback-dropzone'))e.preventDefault();});

// Capture before the existing exercise, navigation and keyboard handlers.
function blockFeedbackInteraction(e){
 if(!feedbackLocked()||e.target.closest?.('#feedback-section,#learner-feedback'))return;
 if(e.type==='keydown'&&(e.key==='Tab'||e.key==='Escape'||e.ctrlKey||e.metaKey||e.altKey))return;
 if(e.type==='wheel'&&!e.target.closest?.('#audio-practice'))return;
 if(e.type==='pointerdown'&&!e.target.closest?.('button,a,input,select,textarea,summary,[role="button"]'))return;
 e.preventDefault();e.stopImmediatePropagation();flashFeedback();
}
for(const type of ['pointerdown','click','dblclick','contextmenu','keydown','beforeinput','change','submit','dragstart','drop','wheel'])document.addEventListener(type,blockFeedbackInteraction,{capture:true,passive:false});
