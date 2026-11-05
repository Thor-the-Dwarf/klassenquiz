'use strict';
function practiceFeedbackHtml(t){
 const rows=t.submissionFeedback;
 if(!Array.isArray(rows)||!rows.length){
  const score=Number(t.submission?.score||0),tone=score===1000?'correct':score===0?'incorrect':'missing';
  return `<aside class="practice-feedback-fallback ${tone}" role="status"><strong>${score===1000?'RICHTIG':score===0?'FALSCH':'TEILWEISE RICHTIG'}</strong><p>${score.toLocaleString('de-DE')} / 1.000 Punkte</p><p>Öffne den Lauf bei bestehender Verbindung erneut, um die Einzelrückmeldungen zu laden.</p></aside>`;
 }
 const statuses={correct:'RICHTIG',incorrect:'FALSCH',missing:'FEHLT',neutral:''};
 const reasonParent=r=>t.kind==='why'&&r.source?.choice!==undefined?t.decisions?.find(d=>d.reasons.includes(r.source.choice)):null;
 return `<aside class="practice-feedback-list" aria-label="Auswertung">${rows.map((r,i)=>{
  if(reasonParent(r))return '';
  const state=Object.hasOwn(statuses,r.status)?r.status:'neutral',field=r.source?.field!==undefined;
  const heading=field?(r.actual||'Keine Auswahl'):(r.title||r.actual);
  const reasons=t.kind==='why'&&r.source?.decision!==undefined?rows.map((child,index)=>({child,index})).filter(({child})=>reasonParent(child)?.id===r.source.decision):[];
  const reasonList=reasons.length?`<ul class="practice-feedback-reasons">${reasons.map(({child,index})=>`<li class="${esc(child.status)}" id="practice-feedback-${index}"><strong>${esc(child.statusLabel??statuses[child.status]??'')}</strong><span>${esc(child.title)}</span>${child.explanation?`<p>${esc(child.explanation)}</p>`:''}</li>`).join('')}</ul>`:'';
  return `<section class="practice-feedback-bubble ${state}" id="practice-feedback-${i}" data-practice-feedback="${i}" data-feedback-key="${esc(r.key)}"${field&&['risk','matrix','trace','gridfill','budget'].includes(t.kind)?' data-feedback-context="always"':''}><div class="practice-feedback-context">${esc(r.title)}</div><div class="practice-feedback-title"><span>${esc(heading)}</span><strong>${esc(r.statusLabel??statuses[state])}</strong></div>${field&&state!=='correct'&&r.expected?`<p><strong>Musterlösung:</strong> ${esc(r.expected)}</p>`:''}${r.explanation?`<p>${esc(r.explanation)}</p>`:''}${reasonList}</section>`;
 }).join('')}</aside>`;
}
let practiceFeedbackObserver,practiceFeedbackFrame,practiceFeedbackScrollCleanup;
function clearPracticeFeedback(){practiceFeedbackObserver?.disconnect();cancelAnimationFrame(practiceFeedbackFrame);practiceFeedbackScrollCleanup?.();practiceFeedbackScrollCleanup=null;practiceFeedbackObserver=null;}
function arrangePracticeFeedback(t){
 clearPracticeFeedback();
 const layout=document.querySelector('.practice-evaluation'),task=layout?.querySelector('.practice-task'),list=layout?.querySelector('.practice-feedback-list');
 if(!task||!list||!Array.isArray(t.submissionFeedback))return;
 const namespace='http://www.w3.org/2000/svg',svg=document.createElementNS(namespace,'svg');svg.classList.add('practice-feedback-lines');svg.setAttribute('aria-hidden','true');layout.append(svg);
 const sources=t.submissionFeedback.map((row,i)=>{
  const s=row.source||{};let source;
  if(s.choice!==undefined)source=[...task.querySelectorAll('[data-practice-choice],[data-rich-reason]')].find(el=>(el.dataset.practiceChoice??el.dataset.richReason)===String(s.choice));
  if(!source&&s.decision!==undefined)source=[...task.querySelectorAll('[data-rich-decision]')].find(el=>el.dataset.richDecision===String(s.decision));
  if(!source&&s.field!==undefined){source=[...task.querySelectorAll('[data-feedback-field]')].find(el=>el.dataset.feedbackField===String(s.field));if(!source){const control=[...task.querySelectorAll('[data-practice-field]')].find(el=>el.dataset.practiceField===String(s.field));source=control?.closest('td,label')||control;}}
  if(source){const described=new Set((source.getAttribute('aria-describedby')||'').split(' ').filter(Boolean));described.add('practice-feedback-'+i);source.setAttribute('aria-describedby',[...described].join(' '));}
  return source;
 });
 const draw=()=>{
  if(!layout.isConnected){clearPracticeFeedback();return;}
  const rect=layout.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);svg.replaceChildren();
  const side=list.getBoundingClientRect().left>=task.getBoundingClientRect().right;
  for(const bubble of list.children){
   const i=Number(bubble.dataset.practiceFeedback);
   const source=sources[i];if(!source)continue;
   const a=source.getBoundingClientRect(),b=bubble.getBoundingClientRect();if(!a.width||!a.height)continue;
   // Only connect the visible part of a card inside a scrollable matrix or zone.
   let right=a.right,left=a.left,top=a.top,bottom=a.bottom;
   for(let parent=source.parentElement;parent&&parent!==layout;parent=parent.parentElement){const style=getComputedStyle(parent),bounds=parent.getBoundingClientRect();if(/auto|scroll|hidden/.test(style.overflowX)){right=Math.min(right,bounds.right);left=Math.max(left,bounds.left)}if(/auto|scroll|hidden/.test(style.overflowY)){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom)}}
   if(right<=left||bottom<=top)continue;
   const x1=right-rect.left,y1=(top+bottom)/2-rect.top,x2=b.left-rect.left,y2=b.top+b.height/2-rect.top;
   if(!side)continue;
   const path=document.createElementNS(namespace,'path');path.setAttribute('d',`M${x1},${y1} C${x1+(x2-x1)/2},${y1} ${x1+(x2-x1)/2},${y2} ${x2},${y2}`);path.setAttribute('class',t.submissionFeedback[i].status);svg.append(path);
  }
 };
 const schedule=()=>{cancelAnimationFrame(practiceFeedbackFrame);practiceFeedbackFrame=requestAnimationFrame(draw)};
 layout.addEventListener('scroll',schedule,true);practiceFeedbackScrollCleanup=()=>layout.removeEventListener('scroll',schedule,true);
 practiceFeedbackObserver=new ResizeObserver(schedule);practiceFeedbackObserver.observe(layout);for(const source of sources)if(source)practiceFeedbackObserver.observe(source);for(const bubble of list.children)practiceFeedbackObserver.observe(bubble);
 schedule();document.fonts?.ready.then(schedule);
}
