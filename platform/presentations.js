'use strict';
const slidesView={topic:null,index:0,url:null,revision:0};
async function materialBlob(data){const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({action:'presentationAsset',classId:cls.id,...data})});if(!response.ok){const e=await response.json();throw Error(e.error||'Material konnte nicht geladen werden.')}return response.blob()}
async function openPresentation(id){const t=(boot.presentations||[]).find(t=>t.id===id);if(!t?.ready)return;await capture();slidesView.topic=t;slidesView.index=0;selected=id;view='presentation';drawTabs();drawSidebar();await drawPresentation()}
async function drawPresentation(){
 const t=slidesView.topic;if(!t)return;const revision=++slidesView.revision;
 if(slidesView.url){URL.revokeObjectURL(slidesView.url);slidesView.url=null}
 $('#content').innerHTML=`<section class="presentation-view"><div class="row"><h1>${esc(t.title)}</h1><button data-presentation-pdf>PDF herunterladen</button></div>${boot.role==='host'?`<div class="row analysis-levels">${['easy','normal','tough'].map(d=>`<button data-host-quiz-level="${d}" class="${hostQuizDifficulty===d?'active':'secondary'}">${d}</button>`).join('')}<button data-host-invite ${cls?.courseGrants?.includes('PVAP1')&&catalog().some(e=>t.exercises.includes(e.id)&&e.difficulty===hostQuizDifficulty&&cls.grants?.includes(e.id))?'':'disabled'}>Klasse zum Quiz einladen</button></div>`:''}<div class="slide-stage" id="slide-stage" role="status">Folie wird geladen …</div><div class="row slide-navigation"><button data-slide-prev ${slidesView.index?'':'disabled'}>Zurück</button><span>Folie ${slidesView.index+1} / ${t.slides}</span><button data-slide-next ${slidesView.index<t.slides-1?'':'disabled'}>Weiter</button></div></section>`;
 try{const blob=await materialBlob({topic:t.id,slide:slidesView.index});if(revision!==slidesView.revision||view!=='presentation')return;slidesView.url=URL.createObjectURL(blob);$('#slide-stage').innerHTML=`<img src="${slidesView.url}" alt="${esc(t.title)} – Folie ${slidesView.index+1}">`}catch(e){if(revision===slidesView.revision&&view==='presentation')$('#slide-stage').textContent=e.message}
}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;const d=b.dataset;if(!('presentation'in d||'slidePrev'in d||'slideNext'in d||'presentationPdf'in d))return;guarded(async()=>{
 if(d.presentation)return openPresentation(d.presentation);
 if('presentationPdf'in d){const t=slidesView.topic,blob=await materialBlob({topic:t.id,kind:'pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=t.title+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return}
 if('slidePrev'in d&&slidesView.index>0)slidesView.index--;if('slideNext'in d&&slidesView.index<slidesView.topic.slides-1)slidesView.index++;await drawPresentation();
 },b)});
