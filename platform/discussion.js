'use strict';
const discussion={state:null,classId:null,pick:null,renderKey:null,revision:0,url:null,previous:'home',previousSelected:null,treeOpen:false,preview:null,positions:new Map(),seen:new Set()};
function resetDiscussion(){discussion.treeOpen=false;discussion.preview=null;discussion.positions.clear();$('#presentation-switch-dialog')?.remove();discussion.state=null;discussion.classId=cls?.id;discussion.pick=null;discussion.renderKey=null;discussion.revision++;if(discussion.url)URL.revokeObjectURL(discussion.url);discussion.url=null;}
const discussionDisabled=new WeakMap();
function discussionLocked(){return !!boot&&(boot.role==='host'?!!discussion.state:view==='discussion')}
function discussionLocks(){
 const locked=discussionLocked();
 for(const el of document.querySelectorAll('header button,header select')){
 const exempt=boot?.role==='host'?['presentation-invite','presentation-tree-toggle'].includes(el.id):el.id==='learner-discussion';
 if(locked&&!exempt){if(!discussionDisabled.has(el))discussionDisabled.set(el,el.disabled);el.disabled=true}
 else if(discussionDisabled.has(el)){el.disabled=discussionDisabled.get(el);discussionDisabled.delete(el)}
 }
 for(const el of document.querySelectorAll('#sidebar,#invitation')){const blocked=locked&&(el.id!=='sidebar'||boot?.role!=='host');el.inert=blocked;el.classList.toggle('discussion-locked',blocked)}
 const presenting=!!boot&&(boot.role==='host'?!!discussion.state:view==='discussion');document.body.classList.toggle('presentation-tree-collapsed',presenting&&!(boot.role==='host'&&discussion.treeOpen));document.body.classList.toggle('presentation-tree-open',presenting&&boot.role==='host'&&discussion.treeOpen);
}
function discussionButtons(){
 const host=boot?.role==='host',learner=boot?.role==='learner',inside=learner&&view==='discussion';
 const invite=$('#presentation-invite'),join=$('#learner-discussion'),tree=$('#presentation-tree-toggle');tree.hidden=!(host&&discussion.state);tree.textContent=discussion.treeOpen?'Themen einklappen':'Themen aufklappen';tree.setAttribute('aria-expanded',String(discussion.treeOpen));
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
 if(discussion.classId!==cls?.id)resetDiscussion();if(state&&discussion.state?.id===state.id&&state.revision<discussion.state.revision)return;const changedTopic=discussion.state?.topic.id!==state?.topic.id;if(discussion.state?.id!==state?.id){discussion.treeOpen=false;discussion.preview=null;discussion.positions.clear()}discussion.state=state||null;if(state)discussion.positions.set(state.topic.id,state.index);if(discussion.preview?.topic.id===state?.topic.id)discussion.preview=null;discussionButtons();if(changedTopic&&boot?.role==='host'&&$('#sidebar'))drawSidebar();
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
 const preview=boot?.role==='host'?discussion.preview:null;const shown=preview||state;
 const key=cls?.id+':'+(state?state.id+':'+state.revision:'ended')+':'+(preview?preview.topic.id+':'+preview.index:'live');
 if(discussion.renderKey===key)return;discussion.renderKey=key;
 const revision=++discussion.revision;
 const oldStage=$('#discussion-stage');
 if(!state){if(discussion.url){URL.revokeObjectURL(discussion.url);discussion.url=null}$('#content').innerHTML='<section class="panel"><p>Die Präsentation wurde beendet.</p></section>';return}
 const host=boot.role==='host',topic=shown.topic,index=shown.index;
 $('#content').innerHTML=`<section class="presentation-view discussion-view" aria-label="Gemeinsame Präsentation: ${esc(topic.title)}"><div class="slide-stage" id="discussion-stage" role="status">Folie wird geladen …</div><div class="row slide-navigation">${host?`<button data-discussion-step="-1" ${index?'':'disabled'}>Zurück</button>`:''}<span>Folie ${index+1} / ${topic.slides}</span>${host?`<button data-discussion-step="1" ${index<topic.slides-1?'':'disabled'}>Weiter</button>`:''}${preview?'<span class="preview-label">Vorschau – Teilnehmer sehen weiterhin die bisherige Folie</span><button data-confirm-topic>Hier weiter machen</button>':''}</div></section>`;
 if(oldStage?.querySelector('img'))$('#discussion-stage').replaceWith(oldStage);$('#discussion-stage').setAttribute('aria-busy','true');
 const valid=()=>revision===discussion.revision&&view==='discussion'&&owner===auth&&classId===cls?.id&&!!$('#discussion-stage');
 try{
 const data=preview?{topic:topic.id}:{action:'presentationLiveAsset',sessionId:state.id,topic:topic.id};const blob=await materialBlob({...data,slide:index});
 if(!valid())return;const next=await decodedSlide(blob,topic.title+' – Folie '+(index+1));if(!valid()){URL.revokeObjectURL(next.url);return}const oldUrl=discussion.url;discussion.url=next.url;$('#discussion-stage').replaceChildren(next.img);$('#discussion-stage').setAttribute('aria-busy','false');if(oldUrl)URL.revokeObjectURL(oldUrl);void preloadSlides(data,index,topic.slides,valid);
 }catch(e){if(valid()){$('#discussion-stage').setAttribute('aria-busy','false');$('#discussion-stage').textContent=e.message;discussion.renderKey=null}}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;const d=b.dataset;
 if(!['presentation-invite','learner-discussion','presentation-tree-toggle'].includes(b.id)&&!['sendPresentation','openDiscussion','leaveDiscussion','discussionStep','endDiscussion','confirmTopic'].some(k=>k in d))return;
 guarded(async()=>{
 if(b.id==='presentation-tree-toggle'){discussion.treeOpen=!discussion.treeOpen;discussionButtons();return}
 if('confirmTopic'in d)return confirmPresentationTopic();
 if('discussionStep'in d&&discussion.preview){discussion.preview.index+=Number(d.discussionStep);discussion.positions.set(discussion.preview.topic.id,discussion.preview.index);return drawDiscussion()}
 if(b.id==='presentation-invite'){if(discussion.state)return endDiscussion();discussion.pick=null;return navigate('presentation-invite')}
 if(b.id==='learner-discussion'&&view==='discussion')return leaveDiscussion();if(b.id==='learner-discussion'||'openDiscussion'in d){await refreshClass();return openDiscussion()}
 if('sendPresentation'in d){const state=await request('presentationStart',{topic:discussion.pick,requestId:crypto.randomUUID()});await acceptDiscussionState(state);return openDiscussion()}
 if('leaveDiscussion'in d)return leaveDiscussion();
 const state=discussion.state;if(!state)return;
 try{const next=await request('presentationControl',{sessionId:state.id,revision:state.revision,...('endDiscussion'in d?{command:'end'}:{index:state.index+Number(d.discussionStep)})});await acceptDiscussionState(next)}catch(e){await refreshClass();throw e}
 },b);
});

new MutationObserver(discussionLocks).observe(document.body,{childList:true,subtree:true});

async function browsePresentationTopic(id){
 if(!discussion.state||boot.role!=='host')return;
 const topic=(boot.presentations||[]).find(t=>t.id===id&&t.ready);if(!topic)return;
 selected=id;discussion.preview=id===discussion.state.topic.id?null:{topic,index:discussion.positions.get(id)||0};discussion.renderKey=null;drawSidebar();await drawDiscussion();
 if(discussion.preview)confirmPresentationTopic();
}
function confirmPresentationTopic(){
 const target=discussion.preview,state=discussion.state;if(!target||!state)return;
 $('#presentation-switch-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='presentation-switch-dialog';dialog.className='presentation-switch-dialog';
 dialog.innerHTML=`<h2>Hier weiter machen?</h2><p>${esc(target.topic.title)} · Folie ${target.index+1}</p><div class="row"><button data-switch-yes>Ja</button><button data-switch-no class="secondary">Nein</button></div><p role="status"></p>`;
 document.body.append(dialog);dialog.showModal();
 dialog.querySelector('[data-switch-no]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('[data-switch-yes]').onclick=async()=>{
 const button=dialog.querySelector('[data-switch-yes]');button.disabled=true;
 try{const next=await request('presentationControl',{sessionId:state.id,revision:state.revision,command:'switch',topic:target.topic.id,index:target.index});discussion.preview=null;selected=next.topic.id;dialog.close();await acceptDiscussionState(next);drawSidebar()}catch(e){dialog.querySelector('[role="status"]').textContent=e.message;button.disabled=false}
 };
}
