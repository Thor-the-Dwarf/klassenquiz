'use strict';
const richRepairObjectOrders=new WeakMap(),richRepairOrders=new Map();
function richRepairValues(t,index){
 let orders=richRepairObjectOrders.get(t);
 if(!orders){
  // Polling and feedback can recreate the same task; keep its display order.
  // Deliberately exclude answers/solutions so revealing them cannot reshuffle it.
  const key=JSON.stringify([t.sourceHash||t.key||t.id,t.title,t.prompt,t.repairFields.map(f=>[f.id,f.label,f.initial,f.values])]);
  orders=richRepairOrders.get(key);
  if(orders)richRepairOrders.delete(key);
  else orders=t.repairFields.map(f=>{const values=[...f.values];for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values});
  richRepairOrders.set(key,orders);
  if(richRepairOrders.size>256)richRepairOrders.delete(richRepairOrders.keys().next().value);
  richRepairObjectOrders.set(t,orders);
 }
 return orders[index];
}
function richAnswer(t,a=[]){if(t.kind==='repair')return t.repairFields.map((f,i)=>a[i]||String(f.initial));if(t.kind==='budget')return Array.from({length:4},(_,i)=>a[i]||'');if(t.kind!=='matrix')return a;const out=[...a];t.rows.forEach((r,i)=>{if(t.fixedCriteria)out[i*5]=r.criterion;if(t.fixedWeights)out[i*5+1]=String(r.weight)});return out}
function richComplete(t,a){if(t.kind==='gridfill')return a.length===t.gridCells.length&&t.gridCells.every((c,i)=>!!a[i]?.trim()&&(!c.choices||c.choices.map(String).includes(a[i])));if(t.kind==='repair')return t.repairFields.every((f,i)=>f.values.map(String).includes(a[i]));if(t.kind==='budget')return a[0]==='possible'?!!(a[2]&&a[3]):a[0]==='impossible'&&!!a[1]?.trim()&&Number.isFinite(Number(a[1].replace(',','.')));if(t.kind==='why'){const ds=t.decisions.filter(d=>a.includes(d.id));return ds.length>0&&(t.multiDecision||ds.length===1)&&ds.every(d=>{const rs=d.reasons.filter(id=>a.includes(id));return rs.length>0&&(d.mode==='multi'||rs.length===1)})}if(t.kind==='trace')return a.length===t.fields.length&&a.every(v=>v!==undefined&&v.trim());if(t.kind==='risk')return a.length===t.risks.length*2&&Array.from(a).every(v=>/^[1-5]$/.test(v));if(t.kind==='trueFalseDragging')return a.length===t.fields.length&&Array.from(a).every(v=>v==='true'||v==='false');if(t.kind==='matrix')return a.length===t.fields.length&&Array.from(a).every(v=>v!==undefined&&v!=='')&&t.rows.every((r,i)=>{const points=a.slice(i*5+2,i*5+5);return points.length===3&&points.every(v=>['1','2','3'].includes(String(v)))&&new Set(points.map(String)).size===3});return null}
function richTask(t,a,locked,scope){
 const attrs=i=>(scope==='practice'?`data-practice-field="${i}"`:scope==='classquiz'?`data-cq-field="${i}"`:`data-answer-index="${i}"`)+` data-feedback-field="${i}"`,off=locked?'disabled':'';
 if(t.kind==='gridfill'){const field=i=>{const c=t.gridCells[i];return c.choices?`<select ${attrs(i)} aria-label="${esc(t.fields[i])}" ${off}><option value="">Auswählen</option>${c.choices.map(v=>`<option value="${esc(v)}" ${String(a[i])===String(v)?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<input ${attrs(i)} aria-label="${esc(t.fields[i])}" maxlength="2000" value="${esc(a[i]||'')}" ${off}>`};return `<div class="matrix-scroll"><table><thead><tr>${t.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.gridRows.map(row=>`<tr>${row.map(c=>`<td>${typeof c==='string'?esc(c):field(c.field)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
 if(t.interaction==='dragmatch'||t.interaction==='dragorder'){const choices=[...t.choices].sort((x,y)=>x.label.localeCompare(y.label,'de'));return `<div class="pool-placement"><div class="truth-tokens">${choices.map(c=>`<button type="button" draggable="${!locked}" data-pool-token="${esc(c.id)}" aria-pressed="false" ${off}>${esc(c.label)}</button>`).join('')}</div>${t.fields.map((f,i)=>`<label class="field pool-drop"><span>${esc(f)}</span><select ${attrs(i)} ${off}><option value="">Zuordnen</option>${choices.map(c=>`<option value="${esc(c.id)}" ${a[i]===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>`).join('')}</div>`}
 if(t.kind==='repair')return t.repairFields.map((f,i)=>`<label class="field">${esc(f.label)}<select ${attrs(i)} ${off}>${richRepairValues(t,i).map(v=>`<option value="${esc(String(v))}" ${String(a[i]??f.initial)===String(v)?'selected':''}>${esc(String(v))}</option>`).join('')}</select></label>`).join('');
 if(t.kind==='trueFalseDragging'||t.kind==='risk')return richPlacementTask(t,a,locked,scope);
 if(t.kind==='budget')return `<label>Deine Einschätzung<select ${attrs(0)} data-budget-feasibility ${off}><option value="">Bitte auswählen</option><option value="possible" ${a[0]==='possible'?'selected':''}>Alle Anforderungen sind finanzierbar.</option><option value="impossible" ${a[0]==='impossible'?'selected':''}>Das Budget reicht nicht aus.</option></select></label><label>Mindestkosten in Euro<input ${attrs(1)} inputmode="decimal" value="${esc(a[1])}" ${locked||a[0]!=='impossible'?'disabled':''}></label>${['ram','ssd'].map((group,i)=>`<label>${group==='ram'?'RAM-Angebot':'SSD-Angebot'}<select ${attrs(i+2)} ${locked||a[0]!=='possible'?'disabled':''}><option value="">Bitte auswählen</option>${t.items.filter(x=>x.group===group).map(x=>`<option value="${esc(x.id)}" ${a[i+2]===x.id?'selected':''}>${esc(x.text)} · ${x.cost} €</option>`).join('')}</select></label>`).join('')}`;
 if(t.kind==='why')return `${t.multiDecision?'<p>Mehrere Entscheidungen auswählen und jeweils begründen.</p>':''}<div class="answers">${t.decisions.map(d=>`<div><button data-rich-decision="${esc(d.id)}" data-rich-scope="${scope}" class="answer ${a.includes(d.id)?'selected':''}" aria-pressed="${a.includes(d.id)}" ${off}>${esc(d.label)}</button>${a.includes(d.id)?`<p>${d.mode==='multi'?'Wähle die passenden Begründungen.':'Wähle die passende Begründung.'}</p><div class="answers why-reasons">${d.reasons.map(id=>`<button data-rich-reason="${esc(id)}" data-rich-parent="${esc(d.id)}" data-rich-scope="${scope}" class="answer ${a.includes(id)?'selected':''}" aria-pressed="${a.includes(id)}" ${off}>${esc(t.choices.find(c=>c.id===id).label)}</button>`).join('')}</div>`:''}</div>`).join('')}</div>`;

 if(t.kind==='trace')return `<pre class="trace-code">${esc(t.code)}</pre>${t.fields.map((f,i)=>`<label class="field">${esc(f)}<input ${attrs(i)} inputmode="decimal" value="${esc(a[i]||'')}" ${off}></label>`).join('')}`;
 if(t.kind==='matrix'){
  const select=(i,options,points=null)=>`<select ${attrs(i)} ${points?'data-matrix-points':''} ${points&&points.filter(v=>v&&String(v)===String(a[i])).length>1?'aria-invalid="true"':''} ${off}><option value="">Bitte auswählen</option>${options.map(v=>`<option value="${esc(v)}" ${String(a[i])===String(v)?'selected':''} ${points&&String(a[i])!==String(v)&&points.some(x=>String(x)===String(v))?'disabled':''}>${esc(v)}</option>`).join('')}</select>`;
  return `<div class="matrix-scroll rich-decision-matrix" data-rich-matrix><table><thead><tr><th>Kriterium</th><th>Gewichtung %</th>${t.offers.map(o=>`<th>${esc(o)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r,i)=>{const points=a.slice(i*5+2,i*5+5),filled=points.filter(Boolean),conflict=new Set(filled.map(String)).size!==filled.length;return `<tr data-matrix-row><th>${t.fixedCriteria?`<span data-feedback-field="${i*5}">${esc(r.criterion)}</span>`:select(i*5,t.criteria)}<small data-matrix-hint role="status" ${conflict?'':'hidden'}>Jede Punktzahl (1, 2, 3) darf in dieser Zeile nur einmal vorkommen.</small></th><td>${t.fixedWeights?`<span data-feedback-field="${i*5+1}">${r.weight}</span>`:select(i*5+1,[10,20,30,40,50,60])}</td>${r.values.map((v,j)=>`<td>${esc(v)}${select(i*5+2+j,[1,2,3],points)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
 }

 return null;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rich-scope]');if(!b||b.disabled)return;if(b.dataset.richScope==='classquiz'){classQuizRich(b);return}const practice=b.dataset.richScope==='practice',t=practice?P.round.tasks[P.round.position]:quiz.question;let a=practice?(P.round.draft[t.key]||[]):quizDraft;a=richWhyAnswer(t,a,b);
 if(practice){P.round.draft[t.key]=a;practiceSave();drawPracticeRound()}else{quizDraft=a;drawQuiz()}
});
document.addEventListener('change',e=>{if(e.target.hasAttribute('data-budget-feasibility'))queueMicrotask(()=>{if(view==='practice')drawPracticeRound();else if(view==='quiz')drawQuiz();});});

function practiceStimulus(t){return (t.code&&t.kind!=='trace'?`<pre class="trace-code">${esc(t.code)}</pre>`:'')+(t.diagram?.svg?`<img class="practice-diagram" alt="${esc(t.diagram.alt||'Diagramm zur Aufgabe')}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.diagram.svg)}">`:'')}
let poolPlacement=null;
document.addEventListener('click',e=>{const token=e.target.closest('[data-pool-token]');if(token&&!token.disabled){const area=token.closest('.pool-placement');poolPlacement={area,value:token.dataset.poolToken};for(const b of area.querySelectorAll('[data-pool-token]'))b.setAttribute('aria-pressed',String(b===token));return}const target=e.target.closest('.pool-drop');if(target&&poolPlacement?.area===target.closest('.pool-placement')&&!e.target.closest('select')){e.preventDefault();placePoolToken(target,poolPlacement.value)}});
function placePoolToken(target,value){const select=target.querySelector('select');if(!select||select.disabled||![...select.options].some(o=>o.value===value))return;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
document.addEventListener('dragstart',e=>{const token=e.target.closest('[data-pool-token]');if(token&&!token.disabled){poolPlacement={area:token.closest('.pool-placement'),value:token.dataset.poolToken};e.dataTransfer.setData('text/plain',token.dataset.poolToken)}});
document.addEventListener('dragover',e=>{if(e.target.closest('.pool-drop'))e.preventDefault()});
document.addEventListener('drop',e=>{const target=e.target.closest('.pool-drop');if(target&&poolPlacement?.area===target.closest('.pool-placement')){e.preventDefault();placePoolToken(target,poolPlacement.value)}});

function richWhyAnswer(t,a,b){
 if(b.dataset.richDecision){const d=t.decisions.find(d=>d.id===b.dataset.richDecision);if(!d)return a;if(!t.multiDecision)return [d.id];return a.includes(d.id)?a.filter(id=>id!==d.id&&!d.reasons.includes(id)):[...a,d.id];}
 const id=b.dataset.richReason,d=t.decisions.find(d=>d.id===b.dataset.richParent||d.reasons.includes(id));if(!d||!a.includes(d.id))return a;
 return d.mode==='multi'?(a.includes(id)?a.filter(v=>v!==id):[...a,id]):[...a.filter(v=>!d.reasons.includes(v)),id];
}

// Same layout, labels and directions as the original risk and true/false tasks.
const richRiskProbability=['','Sehr unwahrscheinlich','Unwahrscheinlich','Möglich','Wahrscheinlich','Sehr wahrscheinlich'];
const richRiskSeverity=['','Gering','Leicht','Mittel','Schwer','Kritisch'];
const richRiskColors=[[],['green','green','green','green','yellow'],['green','green','green','yellow','yellow'],['green','green','yellow','orange','orange'],['green','yellow','orange','orange','red'],['yellow','yellow','orange','red','red']];
const richPlacementOrders=new Map();
function richPlacementOrder(t,count){
 const key=JSON.stringify([t.sourceHash||t.key||t.id,t.kind,t.title,t.fields,t.risks]);
 let order=richPlacementOrders.get(key);
 if(!order){order=Array.from({length:count},(_,i)=>i);for(let i=count-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}}
 richPlacementOrders.delete(key);richPlacementOrders.set(key,order);
 if(richPlacementOrders.size>256)richPlacementOrders.delete(richPlacementOrders.keys().next().value);
 return order;
}
function richPlacementTask(t,a,locked,scope){
 const risk=t.kind==='risk',order=richPlacementOrder(t,risk?t.risks.length:t.fields.length),off=locked?'disabled':'',tab=locked?-1:0;
 const position=i=>risk?(/^[1-5]$/.test(a[i*2])&&/^[1-5]$/.test(a[i*2+1])?a[i*2]+'-'+a[i*2+1]:'bank'):['true','false'].includes(a[i])?a[i]:'bank';
 const attrs=i=>(scope==='practice'?`data-practice-field="${i}"`:scope==='classquiz'?`data-cq-field="${i}"`:`data-answer-index="${i}"`)+` data-rich-value="${i}"`;
 const card=i=>`<button type="button" class="rich-move-card ${risk?'rich-risk-card':'rich-truth-card'}" data-rich-card="${i}" data-rich-order="${order.indexOf(i)}" data-feedback-field="${risk?i*2:i}" aria-pressed="false" ${off} ${risk?`title="${esc(t.risks[i].detail)}" aria-label="${esc(t.risks[i].name+'. '+t.risks[i].detail)}"`:''}>${risk?`<b>${esc(t.risks[i].name)}</b><span class="rich-risk-detail">${esc(t.risks[i].detail)}</span><span class="rich-field-anchor" data-feedback-field="${i*2+1}" aria-hidden="true"></span>`:esc(t.fields[i])}</button>`;
 const cards=target=>order.filter(i=>position(i)===target).map(card).join('');
 const target=(key,label,css,heading=true)=>`<div class="${css}" data-rich-target="${key}" role="group" aria-label="${esc(label)}" tabindex="${tab}">${heading?`<h3>${label}</h3>`:''}${cards(key)}</div>`;
 const choices=(i,labels)=>`<select ${attrs(i)} ${off}><option value="">Nicht zugeordnet</option>${labels.map(([v,label])=>`<option value="${v}" ${String(a[i])===v?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
 let work=target('bank','Nicht zugeordnet','rich-placement-bank');
 if(risk)work+=`<div class="rich-risk-scroll" tabindex="0" aria-label="Risikomatrix"><div class="rich-risk-axis-x">Auswirkungen / Schadenshöhe →</div><div class="rich-risk-plot"><div class="rich-risk-axis-y"><span>Eintrittswahrscheinlichkeit →</span></div><div class="rich-risk-grid"><div></div>${richRiskSeverity.slice(1).map(s=>`<div class="rich-risk-label">${s}</div>`).join('')}${[5,4,3,2,1].map(p=>`<div class="rich-risk-label">${richRiskProbability[p]}</div>${[1,2,3,4,5].map(s=>target(p+'-'+s,richRiskProbability[p]+', Schadenshöhe '+richRiskSeverity[s],'rich-risk-cell rich-risk-'+richRiskColors[p][s-1],false)).join('')}`).join('')}</div></div></div>`;
 else work+=`<div class="rich-truth-zones">${target('false','Falsch','rich-truth-zone rich-truth-false')}${target('true','Richtig','rich-truth-zone rich-truth-true')}</div>`;
 const placed=order.filter(i=>position(i)!=='bank').length;
 const alternative=risk?t.risks.map((r,i)=>`<fieldset><legend>${esc(r.name)}</legend><label>Eintrittswahrscheinlichkeit${choices(i*2,richRiskProbability.slice(1).map((v,j)=>[String(j+1),v]))}</label><label>Schadenshöhe${choices(i*2+1,richRiskSeverity.slice(1).map((v,j)=>[String(j+1),v]))}</label></fieldset>`).join(''):t.fields.map((text,i)=>`<label>${esc(text)}${choices(i,[['false','Falsch'],['true','Richtig']])}</label>`).join('');
 return `<div class="rich-placement" data-rich-board="${risk?'risk':'truth'}" data-locked="${locked}"><p class="rich-placement-help">${locked?'Zuordnung deiner Antwort.':'Ziehe '+(risk?'ein Risiko in die Matrix':'eine Aussage zu Falsch oder Richtig')+' oder wähle erst das Element und dann das Ziel. Zum Zurücknehmen in die Ablage verschieben.'}</p><div class="${risk?'rich-risk-work':'rich-truth-work'}">${work}</div><p class="rich-placement-status" role="status" aria-live="polite">${placed} von ${order.length} zugeordnet</p><details class="rich-placement-alternative"><summary>Über Auswahl zuordnen</summary>${alternative}</details></div>`;
}
function richPlacementStatus(board){
 const cards=[...board.querySelectorAll('[data-rich-card]')],placed=cards.filter(c=>c.parentElement.dataset.richTarget!=='bank').length,active=board.querySelector('[data-rich-card][aria-pressed="true"]');
 board.querySelector('.rich-placement-status').textContent=`${placed} von ${cards.length} zugeordnet${active?' · Ausgewählt: '+(active.querySelector('b')?.textContent||active.textContent):''}`;
}
function richSyncPlacement(board,animate=false){
 if(!board?.isConnected)return;
 const cards=[...board.querySelectorAll('[data-rich-card]')].sort((a,b)=>Number(a.dataset.richOrder)-Number(b.dataset.richOrder));
 const bank=board.querySelector('[data-rich-target="bank"]'),before=bank.getBoundingClientRect().height;
 for(const card of cards){
  const i=Number(card.dataset.richCard),value=n=>board.querySelector(`[data-rich-value="${n}"]`).value;
  const key=board.dataset.richBoard==='risk'?(/^[1-5]$/.test(value(i*2))&&/^[1-5]$/.test(value(i*2+1))?value(i*2)+'-'+value(i*2+1):'bank'):['true','false'].includes(value(i))?value(i):'bank';
  const destination=board.querySelector(`[data-rich-target="${key}"]`);
  if(card.parentElement!==destination)destination.append(card);
 }
 if(animate&&board.dataset.richBoard==='truth'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  bank.getAnimations().forEach(a=>a.cancel());
  const after=bank.getBoundingClientRect().height;
  if(Math.abs(before-after)>1){const animation=bank.animate([{height:before+'px'},{height:after+'px'}],{duration:220,easing:'ease-out'});animation.finished.then(()=>document.dispatchEvent(new CustomEvent('rich-layout-change',{detail:{root:board}}))).catch(()=>{});}
 }
 richPlacementStatus(board);document.dispatchEvent(new CustomEvent('rich-layout-change',{detail:{root:board}}));
}
function richPlace(board,index,target){
 if(!board||board.dataset.locked==='true'||!board.querySelector(`[data-rich-target="${target}"]`))return;
 const card=board.querySelector(`[data-rich-card="${index}"]`);if(!card||card.disabled)return;
 const risk=board.dataset.richBoard==='risk',indices=risk?[index*2,index*2+1]:[index],values=target==='bank'?indices.map(()=>''):risk?target.split('-'):[target];
 const controls=indices.map(i=>board.querySelector(`[data-rich-value="${i}"]`));
 // Set both risk axes before notifying the existing save/quiz handlers.
 controls.forEach((el,i)=>el.value=values[i]);
 for(const el of controls)el.dispatchEvent(new Event('change',{bubbles:true}));
 board.querySelectorAll('[data-rich-card]').forEach(c=>c.setAttribute('aria-pressed','false'));
 richSyncPlacement(board,true);card.focus({preventScroll:true});
}
function richMatrixSync(root=document){
 for(const row of root.querySelectorAll('[data-matrix-row]')){
  const selects=[...row.querySelectorAll('[data-matrix-points]')],values=selects.map(s=>s.value),filled=values.filter(Boolean),conflict=new Set(filled).size!==filled.length;
  for(const el of selects){
   el.setAttribute('aria-invalid',String(!!el.value&&values.filter(v=>v===el.value).length>1));
   for(const option of el.options)option.disabled=!!option.value&&option.value!==el.value&&values.includes(option.value);
  }
  row.querySelector('[data-matrix-hint]').hidden=!conflict;
 }
}
document.addEventListener('change',e=>{
 if(e.target.matches('[data-matrix-points]'))queueMicrotask(()=>{richMatrixSync();if(typeof updatePracticeControls==='function')updatePracticeControls();if(typeof cqTick==='function')cqTick()});
 const board=e.target.closest('[data-rich-board]');
 if(board&&e.target.matches('[data-rich-value]'))queueMicrotask(()=>richSyncPlacement(board));
});
let richDrag=null,richSuppressClick=0;
function richDragEnd(e,cancel=false){
 const d=richDrag;if(!d||e.pointerId!==d.pointer)return;richDrag=null;
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-rich-target]');
 d.board.querySelectorAll('.rich-drop-over').forEach(n=>n.classList.remove('rich-drop-over'));
 if(d.ghost){d.ghost.remove();richSuppressClick=Date.now()+180;if(!cancel&&target?.closest('[data-rich-board]')===d.board)richPlace(d.board,d.index,target.dataset.richTarget)}
}
document.addEventListener('pointerdown',e=>{
 const card=e.target.closest('[data-rich-card]');if(!card||card.disabled||e.button!==0)return;
 richDrag={card,board:card.closest('[data-rich-board]'),index:Number(card.dataset.richCard),pointer:e.pointerId,x:e.clientX,y:e.clientY,ghost:null};card.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 const d=richDrag;if(!d||d.pointer!==e.pointerId)return;
 if(!d.ghost&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>5){d.ghost=document.createElement('div');d.ghost.className='rich-drag-ghost';d.ghost.textContent=d.card.querySelector('b')?.textContent||d.card.textContent;document.body.append(d.ghost)}
 if(!d.ghost)return;e.preventDefault();d.ghost.style.left=(e.clientX+12)+'px';d.ghost.style.top=(e.clientY+12)+'px';
 d.board.querySelectorAll('.rich-drop-over').forEach(n=>n.classList.remove('rich-drop-over'));
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-rich-target]');if(target?.closest('[data-rich-board]')===d.board)target.classList.add('rich-drop-over');
});
document.addEventListener('pointerup',e=>richDragEnd(e));
document.addEventListener('pointercancel',e=>richDragEnd(e,true));
document.addEventListener('click',e=>{
 if(Date.now()<richSuppressClick)return;
 const card=e.target.closest('[data-rich-card]'),target=e.target.closest('[data-rich-target]'),board=(card||target)?.closest('[data-rich-board]');
 if(!board||board.dataset.locked==='true')return;
 if(card){const selected=card.getAttribute('aria-pressed')==='true';board.querySelectorAll('[data-rich-card]').forEach(c=>c.setAttribute('aria-pressed',String(c===card&&!selected)));richPlacementStatus(board)}
 else if(target){const active=board.querySelector('[data-rich-card][aria-pressed="true"]');if(active)richPlace(board,Number(active.dataset.richCard),target.dataset.richTarget)}
});
document.addEventListener('keydown',e=>{
 const card=e.target.closest('[data-rich-card]'),target=e.target.closest('[data-rich-target]'),board=(card||target)?.closest('[data-rich-board]');
 if(!board||board.dataset.locked==='true'||e.target.matches('input,select,textarea'))return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(richDrag)richDragEnd({pointerId:richDrag.pointer,clientX:0,clientY:0},true);board.querySelectorAll('[data-rich-card]').forEach(c=>c.setAttribute('aria-pressed','false'));richPlacementStatus(board);return}
 if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();(card||target).click();return}
 if(card&&['Backspace','Delete'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();richPlace(board,Number(card.dataset.richCard),'bank');return}
 if(!e.key.startsWith('Arrow'))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(card&&board.dataset.richBoard==='truth'&&['ArrowLeft','ArrowRight'].includes(e.key)){richPlace(board,Number(card.dataset.richCard),e.key==='ArrowLeft'?'false':'true');return}
 const current=target?.dataset.richTarget;
 if(board.dataset.richBoard==='risk'&&/^[1-5]-[1-5]$/.test(current)){let [p,s]=current.split('-').map(Number);s+=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;p+=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;board.querySelector(`[data-rich-target="${Math.max(1,Math.min(5,p))}-${Math.max(1,Math.min(5,s))}"]`)?.focus({preventScroll:true})}
},true);
