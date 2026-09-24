'use strict';
function toggleFeedback(open){
 const panel=document.querySelector('#feedback-section'),button=document.querySelector('#learner-feedback');
 const visible=!!open&&document.body.classList.contains('learner-layout');
 panel.hidden=!visible;document.body.classList.toggle('feedback-open',visible);
 button.setAttribute('aria-expanded',String(visible));button.classList.toggle('active',visible);
 if(visible)document.querySelector('#feedback-rating').focus();
}
function syncFeedback(){
 const learner=document.body.classList.contains('learner-layout');
 document.querySelector('#learner-feedback').hidden=!learner;
 if(!learner){toggleFeedback(false);document.querySelector('#feedback-form').reset();document.querySelector('#feedback-rating-value').value='5';}
}
document.addEventListener('click',e=>{
 if(e.target.closest('#learner-feedback'))toggleFeedback(document.querySelector('#feedback-section').hidden);
 if(e.target.closest('#feedback-close')){toggleFeedback(false);document.querySelector('#learner-feedback').focus();}
});
document.addEventListener('input',e=>{if(e.target.id==='feedback-rating')document.querySelector('#feedback-rating-value').value=e.target.value;});
document.addEventListener('dragover',e=>{if(e.target.closest('#feedback-dropzone'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.target.closest('#feedback-dropzone'))e.preventDefault();});
