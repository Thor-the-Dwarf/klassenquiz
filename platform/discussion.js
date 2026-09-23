'use strict';
const discussion={state:null,classId:null,pick:null,renderKey:null,revision:0,url:null,previous:'home',previousSelected:null,seen:new Set()};
function resetDiscussion(){discussion.state=null;discussion.classId=cls?.id;discussion.pick=null;discussion.renderKey=null;discussion.revision++;if(discussion.url)URL.revokeObjectURL(discussion.url);discussion.url=null;}
function discussionButtons(){
 const host=boot?.role==='host',learner=boot?.role==='learner';
 const invite=$('#presentation-invite'),join=$('#learner-discussion');
 invite.hidden=!host;invite.disabled=!cls||!!cls.archived;
 join.hidden=!learner;join.disabled=!discussion.state;
 const unread=!!discussion.state&&!discussion.seen.has(discussion.state.id);
 join.classList.toggle('unread',unread);join.classList.toggle('active',view==='discussion');
 join.setAttribute('aria-label',unread?'Diskussion – neue Einladung':'Diskussion');join.setAttribute('aria-pressed',String(view==='discussion'));
}
async function acceptDiscussionState(state){
 if(discussion.classId!==cls?.id)resetDiscussion();if(state&&discussion.state?.id===state.id&&state.revision<discussion.state.revision)return;discussion.state=state||null;discussionButtons();
 if(view==='discussion')await drawDiscussion();
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
 const state=discussion.state;
 const key=cls?.id+':'+(state?state.id+':'+state.revision:'ended');
 if(discussion.renderKey===key)return;discussion.renderKey=key;
 const revision=++discussion.revision;
 if(discussion.url){URL.revokeObjectURL(discussion.url);discussion.url=null}
 if(!state){$('#content').innerHTML='<section class="panel"><p>Die Präsentation wurde beendet.</p><button data-leave-discussion>Zurück</button></section>';return}
 const host=boot.role==='host';
 $('#content').innerHTML=`<section class="presentation-view discussion-view" aria-label="Gemeinsame Präsentation: ${esc(state.topic.title)}"><div class="slide-stage" id="discussion-stage" role="status">Folie wird geladen …</div><div class="row slide-navigation">${host?`<button data-discussion-step="-1" ${state.index?'':'disabled'}>Zurück</button>`:''}<span>Folie ${state.index+1} / ${state.topic.slides}</span>${host?`<button data-discussion-step="1" ${state.index<state.topic.slides-1?'':'disabled'}>Weiter</button><button data-end-discussion class="secondary">Präsentation beenden</button>`:'<button data-leave-discussion class="secondary">Diskussion verlassen</button>'}</div></section>`;
 try{
 const blob=await materialBlob({action:'presentationLiveAsset',sessionId:state.id,slide:state.index});
 if(revision!==discussion.revision||view!=='discussion')return;
 discussion.url=URL.createObjectURL(blob);$('#discussion-stage').innerHTML=`<img src="${discussion.url}" alt="${esc(state.topic.title)} – Folie ${state.index+1}">`;
 }catch(e){if(revision===discussion.revision&&view==='discussion'){$('#discussion-stage').textContent=e.message;discussion.renderKey=null}}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;const d=b.dataset;
 if(!['presentation-invite','learner-discussion'].includes(b.id)&&!['sendPresentation','openDiscussion','leaveDiscussion','discussionStep','endDiscussion'].some(k=>k in d))return;
 guarded(async()=>{
 if(b.id==='presentation-invite'){discussion.pick=null;return navigate('presentation-invite')}
 if(b.id==='learner-discussion'||'openDiscussion'in d){await refreshClass();return openDiscussion()}
 if('sendPresentation'in d){const state=await request('presentationStart',{topic:discussion.pick,requestId:crypto.randomUUID()});await acceptDiscussionState(state);return openDiscussion()}
 if('leaveDiscussion'in d){discussion.renderKey=null;const dest=discussion.previous;selected=discussion.previousSelected;if(dest==='exercise'&&selected)return openExercise(selected);return navigate(['discussion','presentation-invite'].includes(dest)?'home':dest)}
 const state=discussion.state;if(!state)return;
 try{const next=await request('presentationControl',{sessionId:state.id,revision:state.revision,...('endDiscussion'in d?{command:'end'}:{index:state.index+Number(d.discussionStep)})});await acceptDiscussionState(next)}catch(e){await refreshClass();throw e}
 },b);
});
