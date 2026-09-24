'use strict';
const hostNavigation={scope:null,panel:null,base:null,positions:new Map()};
function initHostNavigation(){
 if(boot?.role!=='host'){hostNavigation.scope=null;hostNavigation.panel=null;hostNavigation.base=null;hostNavigation.positions.clear();return;}
 const scope=auth.token+':'+(cls?.id||'');if(hostNavigation.scope===scope)return;
 hostNavigation.scope=scope;hostNavigation.panel=null;hostNavigation.base=null;hostNavigation.positions.clear();selected=null;view='browse';closeHostFeedback(false);
}
function rememberHostContent(){
 if(hostNavigation.panel)return;
 if(view==='presentation'&&slidesView.topic){hostNavigation.base={view:'presentation',topic:slidesView.topic.id,index:slidesView.index};hostNavigation.positions.set(slidesView.topic.id,slidesView.index);}
 else if(view==='topic'&&selected)hostNavigation.base={view:'topic',topic:selected};
}
function syncHostNavigation(){
 if(boot?.role!=='host')return;
 const panel=hostNavigation.panel;if(panel&&!(panel==='feedback'?['feedback','feedback-archive','host-feedback']:[panel]).includes(view))hostNavigation.panel=null;
 for(const button of document.querySelectorAll('#header-tabs [data-view],#host-feedback-button')){
 const key=button.id==='host-feedback-button'?'feedback':button.dataset.view,active=hostNavigation.panel===key;
 button.classList.toggle('active',active);button.classList.toggle('secondary',!active);button.setAttribute('aria-pressed',String(active));
 }
 const close=document.querySelector('#host-view-close');if(close)close.hidden=!!discussion.state||view==='host-feedback'||!(hostNavigation.panel||['presentation','topic','host-feedback','feedback-archive','presentation-invite'].includes(view));
}
async function restoreHostContent(clear=false){
 rememberHostContent();closeHostFeedback(false);hostNavigation.panel=null;
 if(clear)hostNavigation.base=null;
 const base=hostNavigation.base;selected=base?.topic||null;
 if(base?.view==='presentation'){
  const topic=boot.presentations.find(t=>t.id===base.topic);if(topic){slidesView.topic=topic;slidesView.index=Math.min(base.index,topic.slides-1);await navigate('presentation');return;}
 }
 await navigate(base?.view==='topic'?'topic':'browse');
}
async function toggleHostPanel(panel){
 if(hostNavigation.panel===panel)return restoreHostContent();
 rememberHostContent();closeHostFeedback(false);hostNavigation.panel=panel;
 if(panel==='feedback'){
  if(view==='materials')grantDraft=null;
  view='feedback';selected=null;slidesView.revision++;drawTabs();drawSidebar();document.querySelector('#content').innerHTML='';
  document.querySelector('#host-feedback-list').hidden=false;document.querySelector('#host-feedback-button').setAttribute('aria-expanded','true');void refreshHostFeedback();
 }else{selected=null;await navigate(panel);}
 syncHostNavigation();
}
async function toggleHostTopic(id){
 if(!hostNavigation.panel&&selected===id&&['topic','presentation'].includes(view))return restoreHostContent(true);
 rememberHostContent();closeHostFeedback(false);hostNavigation.panel=null;selected=id;hostNavigation.base={view:'topic',topic:id};await navigate('topic');
}
// Handle host toggles before legacy navigation and feedback dropdown listeners.
document.addEventListener('click',e=>{
 if(typeof boot==='undefined'||boot?.role!=='host')return;const b=e.target.closest('button');if(!b||b.disabled||discussion.state)return;
 let action;
 if(b.id==='host-view-close'||b.id==='host-feedback-close')action=()=>restoreHostContent(!hostNavigation.panel);
 else if(b.id==='host-feedback-button')action=()=>toggleHostPanel('feedback');
 else if(b.closest('#header-tabs')&&['home','chart','materials'].includes(b.dataset.view))action=()=>toggleHostPanel(b.dataset.view);
 else if(b.dataset.hostTopic&&!['chart','materials','presentation-invite'].includes(view))action=()=>toggleHostTopic(b.dataset.hostTopic);
 if(action){e.preventDefault();e.stopImmediatePropagation();void action().catch(showError);}
},{capture:true});
