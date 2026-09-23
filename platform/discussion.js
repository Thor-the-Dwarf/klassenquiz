'use strict';
const discussion={state:null,classId:null,pick:null,renderKey:null,revision:0,url:null,previous:'home',previousSelected:null,seen:new Set()};
function resetDiscussion(){discussion.state=null;discussion.classId=cls?.id;discussion.pick=null;discussion.renderKey=null;discussion.revision++;if(discussion.url)URL.revokeObjectURL(discussion.url);discussion.url=null;}
const discussionDisabled=new WeakMap();
function discussionLocked(){return !!boot&&(boot.role==='host'?!!discussion.state:view==='discussion')}
function discussionLocks(){
 const locked=discussionLocked();
 for(const el of document.querySelectorAll('header button,header select')){
 const exempt=boot?.role==='host'?el.id==='presentation-invite':el.id==='learner-discussion';
 if(locked&&!exempt){if(!discussionDisabled.has(el))discussionDisabled.set(el,el.disabled);el.disabled=true}
 else if(discussionDisabled.has(el)){el.disabled=discussionDisabled.get(el);discussionDisabled.delete(el)}
 }
 for(const el of document.querySelectorAll('#sidebar,#invitation')){el.inert=locked;el.classList.toggle('discussion-locked',locked)}
}
function discussionButtons(){
 const host=boot?.role==='host',learner=boot?.role==='learner',inside=learner&&view==='discussion';
 const invite=$('#presentation-invite'),join=$('#learner-discussion');
 invite.hidden=!host;invite.disabled=!cls||!!cls.archived;invite.textContent=host&&discussion.state?'Präsentation beenden':'Zur Präsentation einladen';
 join.hidden=!learner;join.disabled=!discussion.state&&!inside;
 const unread=!!discussion.state&&!discussion.seen.has(discussion.state.id)&&!inside;
 join.innerHTML=(inside?'Diskussion verlassen':'Diskussion')+'<span class="notification-dot" aria-hidden="true"></span>';
 join.classList.toggle('unread',unread);join.classList.toggle('active',inside);
 join.setAttribute('aria-label',inside?'Diskussion verlassen':unread?'Diskussion – neue Einladung':'Diskussion');join.setAttribute('aria-pressed',String(inside));
 discussionLocks();
}
async function leaveDiscussion(){discussion.renderKey=null;const dest=discussion.previous;selected=discussion.previousSelected;if(dest==='exercise'&&selected)return openExercise(selected);return navigate(['discussion','presentation-invite'].includes(dest)?'home':dest)}
async function endDiscussion(){const state=discussion.state;if(!state)return;const next=await request('presentationControl',{sessionId:state.id,revision:state.revision,command:'end'});await acceptDiscussionState(next);await navigate('home')}
async function acceptDiscussionState(state){
 if(discussion.classId!==cls?.id)resetDiscussion();if(state&&discussion.state?.id===state.id&&state.revision<discussion.state.revision)return;discussion.state=state||null;discussionButtons();
 if(boot?.role==='host'&&discussion.state&&view!=='discussion')return openDiscussion();if(view==='discussion')await drawDiscussion();
}
function drawPresentationInvite(){
 const t=(boot.presentations||[]).find(t=>t.id===discussion.pick&&t.ready);
 $('#content').innerHTML=`<section class="panel"><h2>Zur Präsentation einladen</h2><p>${t?esc(t.title):'Wähle links ein Thema.'}</p><div class="row"><button data-send-presentation ${t?'':'disabled'}>Einladung abschicken</button>${discussion.state?'<button data-open-discussion class="secondary">Laufende Präsentation öffnen</button>':''}</div></section>`;
}
async function openDiscussion(){
 if(!discussion.state)return;
 if(view!=='discussion'){discussion.previous=view==='presentation-invite'?'home':view;discussion.previousSelected=selected;}
 discussion.seen.add(discussion.state.id);selected=discussion.state.topic.id;discussion.renderKey=null;
 await navigate('discussion');
}
async function drawDiscussion(){
 const owner=auth,classId=cls?.id,state=discussion.state;
 const key=cls?.id+':'+(state?state.id+':'+state.revision:'ended');
 if(discussion.renderKey===key)return;discussion.renderKey=key;
 const revision=++discussion.revision;
 const oldStage=$('#discussion-stage');
 if(!state){if(discussion.url){URL.revokeObjectURL(discussion.url);discussion.url=null}$('#content').innerHTML='<section class="panel"><p>Die Präsentation wurde beendet.</p></section>';return}
 const host=boot.role==='host';
 $('#content').innerHTML=`<section class="presentation-view discussion-view" aria-label="Gemeinsame Präsentation: ${esc(state.topic.title)}"><div class="slide-stage" id="discussion-stage" role="status">Folie wird geladen …</div><div class="row slide-navigation">${host?`<button data-discussion-step="-1" ${state.index?'':'disabled'}>Zurück</button>`:''}<span>Folie ${state.index+1} / ${state.topic.slides}</span>${host?`<button data-discussion-step="1" ${state.index<state.topic.slides-1?'':'disabled'}>Weiter</button>`:''}</div></section>`;
 if(oldStage?.querySelector('img'))$('#discussion-stage').replaceWith(oldStage);$('#discussion-stage').setAttribute('aria-busy','true');
 const valid=()=>revision===discussion.revision&&view==='discussion'&&owner===auth&&classId===cls?.id&&!!$('#discussion-stage');
 try{
 const blob=await materialBlob({action:'presentationLiveAsset',sessionId:state.id,slide:state.index});
 if(!valid())return;const next=await decodedSlide(blob,state.topic.title+' – Folie '+(state.index+1));if(!valid()){URL.revokeObjectURL(next.url);return}const oldUrl=discussion.url;discussion.url=next.url;$('#discussion-stage').replaceChildren(next.img);$('#discussion-stage').setAttribute('aria-busy','false');if(oldUrl)URL.revokeObjectURL(oldUrl);void preloadSlides({action:'presentationLiveAsset',sessionId:state.id},state.index,state.topic.slides,valid);
 }catch(e){if(valid()){$('#discussion-stage').setAttribute('aria-busy','false');$('#discussion-stage').textContent=e.message;discussion.renderKey=null}}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;const d=b.dataset;
 if(!['presentation-invite','learner-discussion'].includes(b.id)&&!['sendPresentation','openDiscussion','leaveDiscussion','discussionStep','endDiscussion'].some(k=>k in d))return;
 guarded(async()=>{
 if(b.id==='presentation-invite'){if(discussion.state)return endDiscussion();discussion.pick=null;return navigate('presentation-invite')}
 if(b.id==='learner-discussion'&&view==='discussion')return leaveDiscussion();if(b.id==='learner-discussion'||'openDiscussion'in d){await refreshClass();return openDiscussion()}
 if('sendPresentation'in d){const state=await request('presentationStart',{topic:discussion.pick,requestId:crypto.randomUUID()});await acceptDiscussionState(state);return openDiscussion()}
 if('leaveDiscussion'in d)return leaveDiscussion();
 const state=discussion.state;if(!state)return;
 try{const next=await request('presentationControl',{sessionId:state.id,revision:state.revision,...('endDiscussion'in d?{command:'end'}:{index:state.index+Number(d.discussionStep)})});await acceptDiscussionState(next)}catch(e){await refreshClass();throw e}
 },b);
});

new MutationObserver(discussionLocks).observe(document.body,{childList:true,subtree:true});
