'use strict';
// Navigation is local to this browser, account and class. Learning data stays untouched.
let navigationReady=false,navigationRestoring=false,navigationFeedback=null;
function navigationKey(){return boot&&cls?.id?`lp-navigation-v1:${boot.role}:${boot.me?.id||'owner'}:${cls.id}`:null;}
function saveNavigation(){
 if(!navigationReady||navigationRestoring||!auth)return;
 const key=navigationKey();if(!key)return;
 storage.set(key,{coreGraph:{active:[...coreDemo.active],selected:coreDemo.selected},view,selected,expanded:[...expanded],chartMode,chartDifficulty,chartSelection:[...chartSelection],
  host:{panel:hostNavigation.panel,base:hostNavigation.base,positions:[...hostNavigation.positions]},
  slide:slidesView.topic?{topic:slidesView.topic.id,index:slidesView.index}:null,
  practice:{mode:P.mode,choosing:P.choosing,selection:[...P.selection],round:P.round?.id,knowledge:P.knowledge},
  grants:grantDraft?{classId:grantDraft.classId,courses:[...grantDraft.courses],topics:[...grantDraft.topics]}:null,
  discussion:{id:discussion.state?.id,previous:discussion.previous,previousSelected:discussion.previousSelected,treeOpen:discussion.treeOpen,preview:discussion.preview},
  feedback:navigationFeedback,praxisPrevious,scroll:scrollY});
}
async function restoreNavigation(){
 navigationReady=false;navigationRestoring=true;syncBrand();
 const saved=storage.get(navigationKey());
 try{
  if(!saved){coreDemo.active.clear();coreDemo.selected=null;await drawView();return;}
  coreDemo.active=new Set((saved.coreGraph?.active||[]).filter(k=>['arp','lf','exam'].includes(k)).slice(-1));coreDemo.selected=saved.coreGraph?.selected??null;
  expanded.clear();for(const entry of saved.expanded||[])expanded.set(...entry);
  selected=saved.selected;chartMode=saved.chartMode||'latest';chartDifficulty=saved.chartDifficulty||'easy';chartSelection.clear();for(const id of saved.chartSelection||[])chartSelection.add(id);
  Object.assign(hostNavigation,{panel:saved.host?.panel||null,base:saved.host?.base||null,positions:new Map(saved.host?.positions||[])});
  grantDraft=saved.grants?.classId===cls.id?{classId:cls.id,courses:new Set(saved.grants.courses),topics:new Set(saved.grants.topics)}:null;
  const topic=boot.presentations?.find(t=>t.id===saved.slide?.topic);
  if(topic){slidesView.topic=topic;slidesView.index=Math.max(0,Math.min(saved.slide.index||0,topic.slides-1));}
  if(boot.role==='learner'){
   const state=saved.practice||{};
   if(state.round){try{await practiceOpen(state.round)}catch{P.round=null;}}
   if(state.mode==='auditory'||state.mode==='visual'){const data=await request('practiceTopics',{modality:state.mode});P.topics=data.topics;P.courses=data.courses||[];}
   P.mode=state.mode||null;P.choosing=!!state.choosing;P.selection=new Set((state.selection||[]).filter(id=>P.topics.some(t=>t.id===id)));P.knowledge=!!state.knowledge;
  }
  praxisPrevious=saved.praxisPrevious||null;
  const allowed=boot.role==='host'?['browse','home','topic','presentation','chart','materials','feedback','feedback-archive','host-feedback','presentation-invite','quiz','exercise']:['home','presentation','practice','privacy','praxis','quiz','discussion','exercise'];
  view=allowed.includes(saved.view)?saved.view:boot.role==='host'?'browse':'home';
  if(view==='presentation'&&!topic||view==='practice'&&!P.round||view==='quiz'&&!quiz)view=boot.role==='host'?'browse':'home';
  if(discussion.state&&boot.role==='host'||view==='discussion'&&discussion.state?.id===saved.discussion?.id){
   view='discussion';Object.assign(discussion,{previous:saved.discussion?.previous||'home',previousSelected:saved.discussion?.previousSelected||null,treeOpen:!!saved.discussion?.treeOpen,preview:saved.discussion?.preview||null});
  }else if(view==='discussion')view='home';
  drawSidebar();drawTabs();
  if(view==='exercise'&&selected)await openExercise(selected);
  if(view==='feedback-archive')await openFeedbackArchive();
  else if(view==='host-feedback'&&saved.feedback){try{await (saved.feedback.example?openHostFeedback(saved.feedback.id):openRealFeedback(saved.feedback.id));}catch{view='feedback';}}
  if(view==='feedback'){hostNavigation.panel=null;await toggleHostPanel('feedback');}
  await drawView();
  if(P.knowledge&&boot.role==='learner')await refreshKnowledge();
  requestAnimationFrame(()=>scrollTo(0,saved.scroll||0));
 }finally{navigationRestoring=false;navigationReady=true;}
}
function syncBrand(){
 const button=document.querySelector('#brand-home'),dock=document.querySelector('#brand-dock');
 if(boot?.role==='learner')dock.append(button);else document.querySelector('header').prepend(button);
 dock.hidden=boot?.role!=='learner';
}
async function navigationHome(){
 if(!boot)return;
 if(feedbackLocked()){flashFeedback();return;}
 if(discussionLocked())return;
 navigationRestoring=true;
 try{
  await capture();practiceCache();stopAudioPractice();closeHostFeedback(false);navigationFeedback=null;
  coreDemo.active.clear();coreDemo.selected=null;hostNavigation.panel=null;hostNavigation.base=null;hostNavigation.positions.clear();expanded.clear();chartSelection.clear();grantDraft=null;
  selected=null;slidesView.revision++;slidesView.topic=null;slidesView.index=0;P.mode=null;P.choosing=false;P.selection.clear();P.knowledge=false;praxisPrevious=null;
  $('#learner-menu-dialog')?.close();message('');await navigate(boot.role==='host'?'browse':'home');scrollTo(0,0);
 }finally{navigationRestoring=false;saveNavigation();}
}
window.addEventListener('pagehide',saveNavigation);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNavigation()});
document.addEventListener('click',e=>{if(e.target.closest('#brand-home'))void navigationHome().catch(showError)});
// Also persist interaction-only changes, such as tree expansion and selections.
let navigationTimer;
for(const event of ['click','change','input','toggle','scroll'])document.addEventListener(event,()=>{clearTimeout(navigationTimer);navigationTimer=setTimeout(saveNavigation,200)},{capture:true,passive:true});
new MutationObserver(()=>{
 const button=document.querySelector('#brand-home');if(typeof boot!=='undefined'&&boot){const disabled=discussionLocked();if(button.disabled!==disabled)button.disabled=disabled;}
 clearTimeout(navigationTimer);navigationTimer=setTimeout(saveNavigation,200);
}).observe(document.querySelector('#root'),{childList:true,subtree:true});
