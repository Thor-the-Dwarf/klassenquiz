'use strict';
const coreDemo={active:new Set(),selected:null,selectedCluster:null,search:'',offset:0,center:null,camera:{zoom:1,x:0,y:0}};
const coreModes=[['arp','Nach Ausbildungsrahmenplan clustern','#52e6ad'],['lf','Nach Lernfeldern clustern','#b595ff'],['exam','Nach Prüfungsteil clustern','#f1cf77']];
let coreGraph=null,coreRequest=0;
new MutationObserver(()=>{if(coreGraph&&!coreGraph.root.isConnected){coreGraph.destroy();coreGraph=null;}}).observe(document.querySelector('#root'),{childList:true,subtree:true});
const coreSymbols={binary:'M6 5h4v14H6zM16 5h2v14',network:'M12 4v7M4 19v-5h16v5M12 14v5M9 2h6v5H9z',chip:'M6 6h12v12H6zM9 9h6v6H9zM2 9h4M2 15h4M18 9h4M18 15h4M9 2v4M15 2v4M9 18v4M15 18v4',storage:'M4 4h16v16H4zM7 8h10M7 12h10M7 16h3',plug:'M8 2v6M16 2v6M6 8h12v5l-4 4v5M10 17l-4-4',shield:'M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5zM8 12l3 3 5-6',document:'M5 2h10l4 4v16H5zM8 10h8M8 14h8M8 18h5',chart:'M3 3v18h19M7 17v-5M12 17V7M17 17V3',code:'M8 5l-6 7 6 7M16 5l6 7-6 7M14 3l-4 18'};
function coreColor(n){if(n.percent===null)return [0.48,0.57,0.68,1];const t=n.percent/100;return t<.5?[.95,.3+t*.8,.35,1]:[.95-(t-.5)*1.5,.7+(t-.5)*.5,.4,1];}
async function drawHomeGraph(){
 coreGraph?.destroy();const content=document.querySelector('#content');
 content.innerHTML=`<section class="home-graph core-live"><div class="home-graph-heading"><h1>Wissenscluster</h1><span id="core-count" role="status">Wird geladen …</span></div><div class="core-cluster-tools">${coreModes.map(([key,label,color])=>`<button class="secondary core-cluster-toggle" data-core-mode="${key}" style="--cluster-color:${color}" aria-pressed="${coreDemo.active.has(key)}">${label}</button>`).join('')}</div><div class="core-search-row"><input id="core-search" type="search" placeholder="Cluster oder Core suchen" aria-label="Cluster und Cores durchsuchen" value="${esc(coreDemo.search)}"><button class="secondary" id="core-overview">Übersicht</button></div><p id="core-status" class="core-demo-note"></p><div class="core-stage"><canvas class="core-webgl" tabindex="0" aria-label="Wissenscluster. Pfeiltasten wählen, Eingabe bestätigt. Plus und Minus zoomen. Cores erscheinen im ausgewählten Cluster beim Hineinzoomen."></canvas><div class="core-hover" hidden></div><div class="cluster-zoom"><button class="secondary" id="cluster-zoom-out" aria-label="Herauszoomen">−</button><output id="cluster-zoom-level">100 %</output><button class="secondary" id="cluster-zoom-in" aria-label="Hineinzoomen">+</button></div><p id="cluster-focus-status" class="cluster-focus-status" aria-live="polite">Cluster auswählen und hineinzoomen</p></div><div class="core-legend"><span>● Unbearbeitet</span><span class="core-zero">● 0 %</span><span class="core-half">● 50 %</span><span class="core-full">● 100 %</span><span>Linien = gemeinsame Cores</span></div><section id="core-detail" aria-live="polite"><p>Wähle einen Cluster. Beim Hineinzoomen werden seine Cores sichtbar.</p></section></section>`;
 coreGraph=createCoreGraph(content.firstElementChild);await loadCoreGraph();
}
async function loadCoreGraph(){
 const graph=coreGraph;if(!graph)return;const revision=++coreRequest,session=auth,classId=cls?.id;
 try{
  if(boot.role==='learner')await flush();
  // Always load the permitted complete catalog; filtering operates on clusters.
  const data=await request('coreGraph',{});
  if(revision!==coreRequest||coreGraph!==graph||!graph.root.isConnected||auth!==session||cls?.id!==classId)return;
  coreDemo.offset=0;coreDemo.center=null;graph.set(data);
 }catch(e){if(coreGraph===graph&&graph.root.isConnected){graph.root.querySelector('#core-count').textContent='Cluster nicht geladen';graph.root.querySelector('#core-status').textContent=e.message;}}
}
function createCoreGraph(root){
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),stage=root.querySelector('.core-stage'),hover=root.querySelector('.core-hover');
 let model={nodes:[],edges:[],cores:new Map()},nodes=[],edges=[],byId=new Map(),corePoints=[],width=1,height=1,unit=1,frame=0,disposed=false,hovered=null,detailRevision=0;
 let pointers=new Map(),gesture=null;
 const camera=()=>coreDemo.camera;
 const save=()=>{if(typeof saveNavigation==='function')saveNavigation();};
 const point=n=>({x:width/2+(n.x-camera().x)*unit*camera().zoom,y:height/2+(n.y-camera().y)*unit*camera().zoom});
 const selected=()=>byId.get(coreDemo.selectedCluster);
 const expanded=()=>!!selected()&&camera().zoom>=1.8;
 const baseRadius=24;
 const radius=n=>(n.id===coreDemo.selectedCluster?baseRadius+112*Math.max(0,Math.min(1,(camera().zoom-1.4)/.6)):baseRadius)*unit*camera().zoom;
 const color=n=>{const c=coreColor(n);return 'rgb('+c.slice(0,3).map(v=>Math.round(v*255)).join(',')+')';};
 function defaultDetail(){
  detailRevision++;const n=selected();coreDemo.selected=null;
  root.querySelector('#core-detail').innerHTML=n?`<h2>${esc(n.title)}</h2><p>${n.coreIds.length} Cores · ${n.percent===null?'Noch unbearbeitet':n.percent+' % durchschnittlicher Core-Fortschritt'}</p><p>${expanded()?'Wähle einen Core im Cluster, um seine Wissensaussage und Aufgaben zu öffnen.':'Wähle „Hineinzoomen“, um die Cores im Cluster zu sehen.'}</p><div class="row"><button id="cluster-open">Hineinzoomen</button><button class="secondary" id="cluster-close">Cluster schließen</button></div>`:'<p>Wähle einen Cluster. Beim Hineinzoomen werden seine Cores sichtbar.</p>';
 }
 function showHover(item){
  const key=item?.kind+':'+item?.id;if(hovered?.key===key)return;
  hovered=item?{...item,key}:null;hover.hidden=!item;hover.replaceChildren();
  if(item){const c=item.kind==='core'?model.cores.get(item.id):byId.get(item.id);if(!c)return;
   hover.innerHTML=`${item.kind==='core'?`<svg viewBox="0 0 24 24" class="core-symbol" aria-hidden="true"><path d="${coreSymbols[c.symbol]||coreSymbols.document}"/></svg>`:''}<div class="core-hover-caption"><strong>${esc(c.statement||c.title)}</strong><span>${esc(item.kind==='core'?c.context:c.coreIds.length+' Cores · auswählen und hineinzoomen')}</span></div>`;
  }
  render();
 }
 function label(text,x,y,maxWidth,force,boxes){
  ctx.font='12px system-ui';const words=text.split(' '),lines=[''];
  for(const word of words){const i=lines.length-1;if(ctx.measureText(lines[i]+' '+word).width>maxWidth&&lines[i])lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
  const h=lines.length*15,box={x:x-maxWidth/2,y:y-2,w:maxWidth,h:h+4};
  if(!force&&(box.x<6||box.x+box.w>width-6||box.y<24||box.y+box.h>height-55||boxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y)))return false;
  boxes.push(box);ctx.textAlign='center';ctx.textBaseline='top';ctx.lineWidth=4;ctx.strokeStyle='#0d1222';ctx.fillStyle='#e4edfa';
  lines.forEach((line,i)=>{ctx.strokeText(line,x,y+i*15);ctx.fillText(line,x,y+i*15);});return true;
 }
 function render(){
  if(disposed)return;ctx.clearRect(0,0,width,height);corePoints=[];
  const active=[...coreDemo.active][0],mode=coreModes.find(m=>m[0]===active),isOpen=expanded(),focus=selected();
  if(mode){const groups=new Map();for(const n of nodes)for(const key of n.clusters[active]||[]){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(point(n));}
   for(const [name,ps] of groups){const minX=Math.min(...ps.map(p=>p.x))-35,maxX=Math.max(...ps.map(p=>p.x))+35,minY=Math.min(...ps.map(p=>p.y))-35,maxY=Math.max(...ps.map(p=>p.y))+35;
    ctx.fillStyle=mode[2]+'0b';ctx.strokeStyle=mode[2]+'55';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(minX,minY,maxX-minX,maxY-minY,32);ctx.fill();ctx.stroke();ctx.font='12px system-ui';ctx.fillStyle=mode[2];ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText(name,minX+12,minY-5);
   }
  }
  for(const edge of edges){
   const lit=edge.source===focus?.id||edge.target===focus?.id;if(!edge.strong&&!lit)continue;
   const a=byId.get(edge.source),b=byId.get(edge.target);if(!a||!b)continue;
   const from=point(a),to=point(b),distance=Math.hypot(to.x-from.x,to.y-from.y)||1,ar=radius(a),br=radius(b);if(distance<ar+br)continue;
   ctx.beginPath();ctx.moveTo(from.x+(to.x-from.x)/distance*ar,from.y+(to.y-from.y)/distance*ar);ctx.lineTo(to.x-(to.x-from.x)/distance*br,to.y-(to.y-from.y)/distance*br);
   ctx.strokeStyle=lit?'#46d7ff88':isOpen?'#58708918':'#7691b13d';ctx.lineWidth=lit?1+Math.min(2,Math.log2(edge.weight+1)/3):.8;ctx.stroke();
  }
  const boxes=nodes.map(n=>{const p=point(n),r=radius(n);return {x:p.x-r-3,y:p.y-r-3,w:r*2+6,h:r*2+6};}),labels=[];
  // Draw selected cluster last so its Cores stay in the foreground.
  const ordered=nodes.filter(n=>n!==focus).concat(focus?[focus]:[]);
  for(const n of ordered){
   const p=point(n),r=radius(n);if(p.x+r<0||p.y+r<0||p.x-r>width||p.y-r>height)continue;
   const chosen=n===focus;ctx.globalAlpha=isOpen&&!chosen?.35:1;
   ctx.fillStyle=chosen?'#122439f2':'#142338';ctx.strokeStyle=chosen?'#46d7ff':color(n);ctx.lineWidth=chosen?2:1.5;
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(chosen&&isOpen){
    const members=n.coreIds.map(id=>model.cores.get(id));const dot=Math.max(2.5,Math.min(7,r/Math.sqrt(members.length)*.28));
    members.forEach((c,i)=>{const angle=i*2.39996323,rr=Math.sqrt((i+.5)/members.length)*r*.77,cp={x:p.x+Math.cos(angle)*rr,y:p.y+Math.sin(angle)*rr,id:c.id,kind:'core',r:dot};
     corePoints.push(cp);ctx.fillStyle=color(c);ctx.beginPath();ctx.arc(cp.x,cp.y,c.id===coreDemo.selected?dot+3:dot,0,Math.PI*2);ctx.fill();
     if(c.id===coreDemo.selected){ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();}
    });
   }
   labels.push({n,p,r,chosen});ctx.globalAlpha=1;
  }
  // Labels are drawn after every node, so circles never paint over text.
  for(const {n,p,r,chosen} of labels){const force=chosen||hovered?.id===n.id;if(isOpen&&!chosen)continue;const maxWidth=Math.min(126,width-24);
   if(!label(n.title,p.x,p.y+r+7,maxWidth,force,boxes)&&!force)label(n.title,p.x,p.y-r-37,maxWidth,false,boxes);
  }
  stage.dataset.clusterCount=String(nodes.length);stage.dataset.visibleCores=String(corePoints.length);
  root.querySelector('#cluster-zoom-level').textContent=Math.round(camera().zoom*100)+' %';
  root.querySelector('#cluster-zoom-out').disabled=camera().zoom<=.65;root.querySelector('#cluster-zoom-in').disabled=camera().zoom>=7;
  const status=focus?focus.title+' · '+(isOpen?focus.coreIds.length+' Cores':'hineinzoomen, um Cores zu sehen'):'Cluster auswählen und hineinzoomen';
  const statusEl=root.querySelector('#cluster-focus-status');if(statusEl.textContent!==status)statusEl.textContent=status;
  if(hovered){const target=hovered.kind==='core'?corePoints.find(c=>c.id===hovered.id):byId.get(hovered.id);if(!target){hover.hidden=true;}else{
    hover.hidden=false;const p=hovered.kind==='core'?target:point(target);hover.style.left=p.x+'px';hover.style.top=p.y+'px';
    const caption=hover.querySelector('.core-hover-caption');if(caption){caption.style.maxWidth=Math.min(420,width-24)+'px';const b=caption.getBoundingClientRect();caption.style.transform=`translate(${Math.max(12-p.x,Math.min(0,width-p.x-b.width-12))}px, ${Math.min(0,height-p.y-28-b.height-12)}px)`;}
   }}
 }
 function targets(){
  const active=[...coreDemo.active][0],groups=new Map();
  for(const n of nodes)for(const key of n.clusters[active]||[]){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
  const centers=new Map([...groups].map(([key,ns])=>[key,{x:ns.reduce((a,n)=>a+n.baseX,0)/ns.length,y:ns.reduce((a,n)=>a+n.baseY,0)/ns.length}]));
  for(const n of nodes){const cs=(n.clusters[active]||[]).map(key=>centers.get(key));let dx=0,dy=0;
   if(cs.length){dx=(cs.reduce((a,c)=>a+c.x,0)/cs.length-n.baseX)*.22;dy=(cs.reduce((a,c)=>a+c.y,0)/cs.length-n.baseY)*.22;}
   const cap=Math.min(1,70/(Math.hypot(dx,dy)||1));n.tx=n.baseX+dx*cap;n.ty=n.baseY+dy*cap;
  }
  root.querySelector('#core-status').textContent=active&&nodes.some(n=>!n.clusters[active]?.length)?'Diese Zuordnung ist noch nicht fachlich hinterlegt. Nicht zugeordnete Cluster bleiben frei.':'Cluster bündeln Cores. Starke Verbindungen sind sichtbar; Auswahl zeigt auch schwächere.';
 }
 function animate(){
  cancelAnimationFrame(frame);targets();const start=performance.now(),from=nodes.map(n=>({x:n.x,y:n.y}));
  const tick=now=>{if(disposed)return;const t=matchMedia('(prefers-reduced-motion: reduce)').matches?1:Math.min(1,(now-start)/900),s=t*t*(3-2*t);
   nodes.forEach((n,i)=>{n.x=from[i].x+(n.tx-from[i].x)*s;n.y=from[i].y+(n.ty-from[i].y)*s;});render();if(t<1)frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
 }
 function resize(){const r=stage.getBoundingClientRect();width=r.width;height=r.height;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);unit=Math.min(width/1100,height/820);render();}
 const observer=new ResizeObserver(resize);observer.observe(stage);
 function filter(){
  const query=coreDemo.search.trim().toLocaleLowerCase('de');
  const shown=model.nodes.filter(n=>!query||n.title.toLocaleLowerCase('de').includes(query)||n.coreIds.some(id=>{const c=model.cores.get(id);return (c.statement+' '+c.context).toLocaleLowerCase('de').includes(query);}));
  nodes=shown.map((n,i)=>{const angle=i*2.39996323,r=Math.sqrt((i+.5)/shown.length);return {...n,x:Math.cos(angle)*r*450,y:Math.sin(angle)*r*300,baseX:Math.cos(angle)*r*450,baseY:Math.sin(angle)*r*300};});
  byId=new Map(nodes.map(n=>[n.id,n]));edges=model.edges.filter(e=>byId.has(e.source)&&byId.has(e.target));
  // A few strongest connections per cluster form the overview. Selection reveals every incident edge.
  const strong=new Set();for(const n of nodes){const incident=edges.filter(e=>e.source===n.id||e.target===n.id).sort((a,b)=>b.weight-a.weight);for(const e of incident.slice(0,2))strong.add(e);}
  edges=edges.map(e=>({...e,strong:strong.has(e)}));
  if(!selected()){coreDemo.selectedCluster=null;coreDemo.selected=null;}
  const restoredCore=coreDemo.selected;const count=new Set(nodes.flatMap(n=>n.coreIds)).size;
  root.querySelector('#core-count').textContent=nodes.length+' Cluster · '+count+' Cores';
  targets();nodes.forEach(n=>{n.x=n.tx;n.y=n.ty;});showHover(null);defaultDetail();resize();if(expanded()&&selected().coreIds.includes(restoredCore)){coreDemo.selected=restoredCore;void showCoreDetail(restoredCore);}
 }
 function selectCluster(id){coreDemo.selectedCluster=id;coreDemo.selected=null;defaultDetail();showHover({id,kind:'cluster'});render();save();}
 function choose(item){
  if(!item){coreDemo.selectedCluster=null;coreDemo.selected=null;defaultDetail();showHover(null);render();save();return;}
  if(item.kind==='cluster'){if(item.id===coreDemo.selectedCluster&&!expanded()){coreDemo.selectedCluster=null;defaultDetail();showHover(null);render();save();}else selectCluster(item.id);}
  else{coreDemo.selected=item.id;showHover(item);void showCoreDetail(item.id);render();save();}
 }
 function zoom(factor){
  const wasOpen=expanded(),next=Math.max(.65,Math.min(7,camera().zoom*factor)),n=selected();
  if(n){camera().x=n.x;camera().y=n.y;}
  camera().zoom=next;if(wasOpen!==expanded()){showHover(null);defaultDetail();}render();save();
 }
 function hit(x,y){
  const core=corePoints.map(c=>({...c,d:Math.hypot(c.x-x,c.y-y)})).filter(c=>c.d<Math.max(10,c.r+4)).sort((a,b)=>a.d-b.d)[0];if(core)return core;
  const focus=selected();if(focus){const p=point(focus);if(Math.hypot(p.x-x,p.y-y)<radius(focus))return {id:focus.id,kind:'cluster'};}
  return nodes.map(n=>({id:n.id,kind:'cluster',d:Math.hypot(point(n).x-x,point(n).y-y),r:radius(n)})).filter(n=>n.d<Math.max(n.r,14)).sort((a,b)=>a.d-b.d)[0];
 }
 const local=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 canvas.addEventListener('pointerdown',e=>{const p=local(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);gesture={start:p,pan:{x:camera().x,y:camera().y},moved:false};
  if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera().zoom,moved:true};}
 });
 canvas.addEventListener('pointermove',e=>{const p=local(e);if(pointers.has(e.pointerId)){
   pointers.set(e.pointerId,p);if(pointers.size===2&&gesture.pinch){const [a,b]=[...pointers.values()];zoom((gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.pinch)/camera().zoom);return;}
   if(gesture?.start){if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5)gesture.moved=true;camera().x=gesture.pan.x-(p.x-gesture.start.x)/(unit*camera().zoom);camera().y=gesture.pan.y-(p.y-gesture.start.y)/(unit*camera().zoom);render();}
  }else showHover(hit(p.x,p.y)||null);
 });
 const finish=e=>{const p=local(e),click=pointers.size===1&&!gesture?.moved&&e.type!=='pointercancel';pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!pointers.size)gesture=null;else{const start=[...pointers.values()][0];gesture={start,pan:{x:camera().x,y:camera().y},moved:true};}if(click)choose(hit(p.x,p.y));save();};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('pointerleave',()=>{if(!pointers.size)showHover(null);});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015));},{passive:false});
 canvas.addEventListener('keydown',e=>{
  const choices=expanded()?corePoints:nodes.map(n=>({id:n.id,kind:'cluster'}));if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)&&choices.length){e.preventDefault();const index=choices.findIndex(n=>n.id===hovered?.id),step=['ArrowRight','ArrowDown'].includes(e.key)?1:-1;showHover(choices[(index+step+choices.length)%choices.length]);}
  if(e.key==='Enter'&&hovered){e.preventDefault();choose(hovered);}
  if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1/1.4:1.4);}
  if(e.key==='Escape'){e.preventDefault();if(coreDemo.selected){defaultDetail();showHover(null);render();}else choose(null);}
 });
 return {root,set(data){model=buildKnowledgeClusters(data.nodes);filter();},filter,animate,render,zoom,
  back(){defaultDetail();render();},
  open(){if(selected()){zoom(Math.max(1,2.5/camera().zoom));}},
  close(){coreDemo.selectedCluster=null;coreDemo.selected=null;coreDemo.camera={zoom:1,x:0,y:0};showHover(null);defaultDetail();render();save();},
  overview(){coreDemo.search='';coreDemo.selectedCluster=null;coreDemo.selected=null;coreDemo.camera={zoom:1,x:0,y:0};root.querySelector('#core-search').value='';filter();save();},
  destroy(){disposed=true;coreRequest++;cancelAnimationFrame(frame);observer.disconnect();},
  nextDetail(){return ++detailRevision;},isDetail(v){return v===detailRevision&&expanded();},
  snapshot(){return {clusterIds:nodes.map(n=>n.id),visibleCoreIds:corePoints.map(c=>c.id),edges:edges.map(e=>({source:e.source,target:e.target,weight:e.weight})),positions:nodes.map(n=>({id:n.id,x:n.x,y:n.y,tx:n.tx,ty:n.ty})),selected:coreDemo.selectedCluster};}
 };
}
async function showCoreDetail(id){const graph=coreGraph,revision=graph.nextDetail();try{const result=await request('coreDetail',{core:id});if(graph!==coreGraph||!graph.root.isConnected||!graph.isDetail(revision))return;const c=result.core;document.querySelector('#core-detail').innerHTML=`<h2>${esc(c.statement)}</h2><p class="muted">${esc(c.context)}</p>${(c.sources||[]).length?`<p class="core-sources">${c.sources.filter(s=>/^https:\/\//.test(s.url)).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join(' · ')}</p>`:''}<p>${boot.role==='learner'?c.total?`${c.percent===null?'Noch unbearbeitet':c.percent+' %'} · ${c.correct} richtig · ${c.wrong} falsch · ${c.total} verknüpfte Aufgaben`:'Noch keine direkt zugeordneten Prüfaufgaben.':'Kursleiteransicht · '+c.total+' verknüpfte Aufgaben'}</p><div class="row"><button class="secondary" id="cluster-back">Zurück zum Cluster</button>${boot.role==='learner'&&c.total?`<button data-core-practice="visual" data-core-id="${esc(id)}">Visuell üben</button><button data-core-practice="auditory" data-core-id="${esc(id)}">Auditiv üben</button>${c.wrong?`<button data-core-practice="visual" data-core-id="${esc(id)}" data-core-wrong>Falsche visuelle Aufgaben</button><button data-core-practice="auditory" data-core-id="${esc(id)}" data-core-wrong>Falsche Audioaufgaben</button>`:''}`:''}</div><details><summary>Verknüpfte Aufgaben (${result.questionCount})</summary>${result.questions.map(q=>`<p>${esc(q.title)}<small>${q.status==='correct'?'Richtig':q.status==='wrong'?'Falsch':q.status==='unanswered'?'Unbearbeitet':''} · ${esc([...new Set(q.sources.map(s=>s.title+' · '+(s.modality==='auditory'?'auditiv':'visuell')))].join(' / '))}</small></p>`).join('')}${result.questionCount>result.questions.length?'<p>Die ersten 100 Aufgaben werden angezeigt.</p>':''}</details>`;graph.render();}catch(e){showError(e);}}
async function corePractice(id,mode,wrong){if(boot.role!=='learner')return;await capture();practiceCache();await flush();if(queue.length)throw Error('Bitte zuerst die vorgemerkten Antworten übertragen lassen.');const data=await request('practiceTopics',{modality:mode});const round=await request('roundCreate',{topics:data.topics.map(t=>t.id),modality:mode,difficulty:'tough',coreId:id,retryWrong:wrong,requestId:crypto.randomUUID()});stopAudioPractice();P.round=round;P.active=round.id;P.mode=mode;P.choosing=false;practiceCache();await navigate('practice');}
document.addEventListener('input',e=>{if(e.target.id!=='core-search')return;coreDemo.search=e.target.value;coreDemo.camera={zoom:1,x:0,y:0};coreGraph?.filter();});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.coreMode){const key=b.dataset.coreMode,active=coreDemo.active.has(key);coreDemo.active.clear();if(!active)coreDemo.active.add(key);document.querySelectorAll('[data-core-mode]').forEach(el=>el.setAttribute('aria-pressed',String(coreDemo.active.has(el.dataset.coreMode))));coreGraph?.animate();}
 else if(b.id==='core-overview')coreGraph?.overview();
 else if(b.id==='cluster-zoom-in')coreGraph?.zoom(1.4);
 else if(b.id==='cluster-zoom-out')coreGraph?.zoom(1/1.4);
 else if(b.id==='cluster-open')coreGraph?.open();
 else if(b.id==='cluster-back')coreGraph?.back();
 else if(b.id==='cluster-close')coreGraph?.close();
 else if(b.dataset.corePractice)void guarded(()=>corePractice(b.dataset.coreId,b.dataset.corePractice,b.hasAttribute('data-core-wrong')),b);
});
