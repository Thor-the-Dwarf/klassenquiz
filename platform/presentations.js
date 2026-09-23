'use strict';
const slidesView={topic:null,index:0,url:null,revision:0};
// Keep a small, account/class-scoped memory cache; never persist protected images.
const slideCache={scope:null,epoch:0,bytes:0,items:new Map(),pending:new Map()};
function clearSlideCache(){slideCache.epoch++;for(const p of slideCache.pending.values())p.controller.abort();slideCache.items.clear();slideCache.pending.clear();slideCache.bytes=0;slideCache.scope=null;}
function slideScope(){const scope=JSON.stringify([auth?.token,cls?.id]);if(slideCache.scope!==scope){clearSlideCache();slideCache.scope=scope}return scope;}
async function materialBlob(data){
 const scope=slideScope(),epoch=slideCache.epoch,token=auth.token,classId=cls.id;
 const cachedImage=data.kind!=='pdf'&&Number.isInteger(data.slide);
 const key=JSON.stringify([data.action||'presentationAsset',data.sessionId||'',data.topic||'',data.slide]);
 const hit=slideCache.items.get(key);
 if(cachedImage&&hit){slideCache.items.delete(key);slideCache.bytes-=hit.blob.size;if(Date.now()-hit.at<600000){slideCache.items.set(key,hit);slideCache.bytes+=hit.blob.size;return hit.blob}}
 if(cachedImage&&slideCache.pending.has(key))return slideCache.pending.get(key).promise;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 const promise=(async()=>{
 try{
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'presentationAsset',classId,...data}),signal:controller.signal});
 if(!response.ok){let error;try{error=await response.json()}catch{}throw Error(error?.error||'Material konnte nicht geladen werden.')}
 const blob=await response.blob();
 if(cachedImage&&epoch===slideCache.epoch&&scope===slideCache.scope&&blob.size<=16*1024*1024){
 slideCache.items.set(key,{blob,at:Date.now()});slideCache.bytes+=blob.size;
 while(slideCache.items.size>16||slideCache.bytes>16*1024*1024){const oldest=slideCache.items.keys().next().value;slideCache.bytes-=slideCache.items.get(oldest).blob.size;slideCache.items.delete(oldest)}
 }
 return blob;
 }finally{clearTimeout(timer);if(slideCache.pending.get(key)?.controller===controller)slideCache.pending.delete(key)}
 })();
 if(cachedImage)slideCache.pending.set(key,{promise,controller});return promise;
}
async function preloadSlides(data,index,total,valid){
 const scope=slideScope();
 for(const slide of [index+1,index-1]){
 if(slide<0||slide>=total||!valid()||slideCache.scope!==scope)continue;
 try{await materialBlob({...data,slide})}catch{} // Foreground requests retry failures.
 }
}
async function decodedSlide(blob,alt){const url=URL.createObjectURL(blob),img=new Image();img.alt=alt;img.src=url;try{await img.decode();return {img,url}}catch(e){URL.revokeObjectURL(url);throw e}}
async function openPresentation(id){if(boot.role==='learner'&&P.mode!=='infographics')return;const t=(boot.presentations||[]).find(t=>t.id===id);if(!t?.ready||!t.slides)return;await capture();slidesView.topic=t;slidesView.index=0;selected=id;view='presentation';drawTabs();drawSidebar();await drawPresentation()}
async function drawPresentation(){
 const t=slidesView.topic;if(!t)return;const revision=++slidesView.revision;
 const owner=auth,classId=cls.id,index=slidesView.index,oldStage=$('#slide-stage');
 $('#content').innerHTML=`<section class="presentation-view" aria-label="${esc(t.title)}"><div class="slide-stage" id="slide-stage" role="status">Folie wird geladen …</div><div class="row slide-navigation"><button data-slide-prev ${slidesView.index?'':'disabled'}>Zurück</button><span>Folie ${slidesView.index+1} / ${t.slides}</span><button data-slide-next ${slidesView.index<t.slides-1?'':'disabled'}>Weiter</button><button data-presentation-pdf class="secondary">PDF herunterladen</button>${boot.role==='host'?`<button data-host-invite ${cls?.courseGrants?.includes('PVAP1')&&catalog().some(e=>t.exercises.includes(e.id)&&e.difficulty===hostQuizDifficulty&&cls.grants?.includes(e.id))?'':'disabled'}>Klasse zum Quiz einladen</button>`:''}</div></section>`;
 if(oldStage?.querySelector('img'))$('#slide-stage').replaceWith(oldStage);
 const valid=()=>revision===slidesView.revision&&view==='presentation'&&owner===auth&&classId===cls?.id&&!!$('#slide-stage');$('#slide-stage').setAttribute('aria-busy','true');
 try{const blob=await materialBlob({topic:t.id,slide:index});if(!valid())return;const next=await decodedSlide(blob,t.title+' – Folie '+(index+1));if(!valid()){URL.revokeObjectURL(next.url);return}const oldUrl=slidesView.url;slidesView.url=next.url;$('#slide-stage').replaceChildren(next.img);$('#slide-stage').setAttribute('aria-busy','false');if(oldUrl)URL.revokeObjectURL(oldUrl);void preloadSlides({topic:t.id},index,t.slides,valid)}catch(e){if(valid()){$('#slide-stage').textContent=e.message;$('#slide-stage').setAttribute('aria-busy','false')}}
}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;const d=b.dataset;if(!('presentation'in d||'slidePrev'in d||'slideNext'in d||'presentationPdf'in d))return;guarded(async()=>{
 if(d.presentation)return openPresentation(d.presentation);
 if('presentationPdf'in d){const t=slidesView.topic,blob=await materialBlob({topic:t.id,kind:'pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=t.title+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return}
 if('slidePrev'in d&&slidesView.index>0)slidesView.index--;if('slideNext'in d&&slidesView.index<slidesView.topic.slides-1)slidesView.index++;await drawPresentation();
 },b)});
