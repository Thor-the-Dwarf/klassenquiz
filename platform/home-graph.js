'use strict';
// Synthetic prototype only. No catalog, curriculum or participant data is queried.
const coreDemo={active:new Set(),selected:null};
const coreDemoNodes=[
 ['PDCA-Zyklus',200,145,'Qualität','LF 1','AP2','Planen, umsetzen, überprüfen und verbessern.'],
 ['Qualitätsmanagement',355,110,'Qualität','LF 1','AP2','Qualität systematisch sichern und weiterentwickeln.'],
 ['Lastenheft',145,285,'Auftrag','LF 1','AP1','Beschreibt die Anforderungen des Auftraggebers.'],
 ['Pflichtenheft',335,275,'Auftrag','LF 2','AP1','Beschreibt, wie die Anforderungen umgesetzt werden sollen.'],
 ['SMART',235,430,'Auftrag','LF 2','AP1','Ein Schema zur Formulierung überprüfbarer Ziele.'],
 ['SLA',410,435,'Qualität','LF 2','AP2','Service Level Agreement – vereinbarte Leistungen und Servicequalität.'],
 ['CPU',580,140,'IT-Systeme','LF 2','AP1','Central Processing Unit – die zentrale Verarbeitungseinheit.'],
 ['RAM',780,125,'IT-Systeme','LF 2','AP1','Random Access Memory – der Arbeitsspeicher.'],
 ['SSD',865,275,'IT-Systeme','LF 2','AP1','Solid State Drive – ein Speicher ohne bewegliche Bauteile.'],
 ['IP-Adresse',655,290,'Netzwerke','LF 3','AP1','Eine Adresse zur Kommunikation in einem IP-Netzwerk.'],
 ['DNS',790,440,'Netzwerke','LF 3','AP2','Domain Name System – ordnet Namen unter anderem IP-Adressen zu.'],
 ['DHCP',595,465,'Netzwerke','LF 3','AP2','Dynamic Host Configuration Protocol – automatische Netzwerkkonfiguration.'],
 ['Schutzziele',455,580,'Sicherheit','LF 4','AP1','Vertraulichkeit, Integrität und Verfügbarkeit.'],
 ['Backup',685,600,'Sicherheit','LF 4','AP2','Eine Sicherungskopie zur Wiederherstellung von Daten.'],
 ['MFA',210,590,'Sicherheit','LF 4','AP2','Multi-Faktor-Authentifizierung – Anmeldung mit mehreren unterschiedlichen Faktoren.']
].map(([title,x,y,arp,lf,exam,description],id)=>({id,title,x,y,arp,lf,exam,description}));
const coreDemoEdges=[[0,1],[0,4],[0,5],[1,5],[2,3],[2,4],[3,6],[3,5],[4,5],[6,7],[6,8],[7,8],[6,9],[8,13],[9,10],[9,11],[10,11],[11,12],[12,13],[12,14],[14,0],[5,12]];
const coreDemoModes=[['arp','Nach Ausbildungsrahmenplan clustern','#52e6ad'],['lf','Nach Lernfeldern clustern','#b595ff'],['exam','Nach Prüfungsteil clustern','#f1cf77']];
function coreDemoHull(points){
 const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=items=>{const result=[];for(const p of items){while(result.length>1&&cross(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}return result;};
 const lower=half(sorted),upper=half(sorted.slice().reverse());return lower.slice(0,-1).concat(upper.slice(0,-1)).map(p=>p.join(',')).join(' ');
}
function coreDemoAreas(){return coreDemoModes.map(([key,,color],layer)=>{
 const groups=[...new Set(coreDemoNodes.map(n=>n[key]))];
 return `<g class="core-cluster-layer" data-core-layer="${key}" ${coreDemo.active.has(key)?'':'hidden'}>${groups.map((label,i)=>{
 const nodes=coreDemoNodes.filter(n=>n[key]===label),pad=30+layer*9;
 const points=nodes.flatMap(n=>Array.from({length:8},(_,j)=>[n.x+Math.cos(j*Math.PI/4)*pad,n.y+Math.sin(j*Math.PI/4)*pad]));
 const first=nodes.reduce((a,b)=>a.y<b.y?a:b);
 return `<g data-core-group="${i}"><polygon points="${coreDemoHull(points)}" fill="${color}" fill-opacity=".055" stroke="${color}" stroke-opacity=".55" stroke-width="1.5" stroke-linejoin="round" ${layer===1?'stroke-dasharray="7 4"':layer===2?'stroke-dasharray="2 5"':''}/><text x="${first.x-pad+8}" y="${first.y-pad-7}" fill="${color}" class="core-cluster-label">${key==='arp'?'ARP · ':key==='lf'?'':'Prüfung · '}${label}</text></g>`;
 }).join('')}</g>`;
}).join('');}
function drawHomeGraph(){
 cancelAnimationFrame(coreMotion.frame);coreMotion.points=coreLayout();
 document.querySelector('#content').innerHTML=`<section class="home-graph core-prototype" aria-labelledby="home-graph-title"><div class="home-graph-heading"><h1 id="home-graph-title">Cores</h1><span>Prototyp · Beispieldaten</span></div><div class="core-cluster-tools" aria-label="Clustering">${coreDemoModes.map(([key,label,color])=>`<button class="secondary core-cluster-toggle" data-core-mode="${key}" style="--cluster-color:${color}" aria-pressed="${coreDemo.active.has(key)}">${label}</button>`).join('')}</div><p class="core-demo-note">Cores und Zuordnungen sind Beispiele. Eine Clusterung zieht zusammengehörige Cores leicht zueinander.</p><svg class="core-canvas" viewBox="0 0 1000 690" role="group" aria-label="Core-Graph mit auswählbaren Beispielknoten"><defs><pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#8eabc5" opacity=".14"/></pattern></defs><rect width="1000" height="690" fill="url(#graph-grid)"/>${coreDemoAreas()}<g class="core-connections">${coreDemoEdges.map(([a,b])=>`<line data-core-edge="${a},${b}" x1="${coreDemoNodes[a].x}" y1="${coreDemoNodes[a].y}" x2="${coreDemoNodes[b].x}" y2="${coreDemoNodes[b].y}"/>`).join('')}</g>${coreDemoNodes.map(n=>`<g class="core-node" data-core-node="${n.id}" role="button" tabindex="0" aria-label="${n.title}" aria-pressed="false"><circle class="core-hit" cx="${n.x}" cy="${n.y}" r="24" fill="transparent"/><circle class="core-halo" cx="${n.x}" cy="${n.y}" r="18"/><circle class="core-dot" cx="${n.x}" cy="${n.y}" r="7"/><text x="${n.x}" y="${n.y+30}" text-anchor="middle">${n.title}</text></g>`).join('')}</svg><div class="core-demo-detail" role="status" aria-live="polite"></div></section>`;
 syncCoreDemo();paintCoreLayout(document.querySelector('.core-prototype'));
}
function syncCoreDemo(){
 const root=document.querySelector('.core-prototype');if(!root)return;
 for(const button of root.querySelectorAll('[data-core-mode]'))button.setAttribute('aria-pressed',String(coreDemo.active.has(button.dataset.coreMode)));
 for(const layer of root.querySelectorAll('[data-core-layer]'))layer.toggleAttribute('hidden',!coreDemo.active.has(layer.dataset.coreLayer));
 const selected=coreDemoNodes.find(n=>n.id===coreDemo.selected),neighbors=new Set();
 for(const [a,b] of coreDemoEdges){if(a===selected?.id)neighbors.add(b);if(b===selected?.id)neighbors.add(a);}
 for(const node of root.querySelectorAll('[data-core-node]')){const id=Number(node.dataset.coreNode);node.setAttribute('aria-pressed',String(id===selected?.id));node.classList.toggle('core-related',neighbors.has(id));node.classList.toggle('core-muted',!!selected&&id!==selected.id&&!neighbors.has(id));}
 for(const edge of root.querySelectorAll('[data-core-edge]'))edge.classList.toggle('core-edge-active',!!selected&&edge.dataset.coreEdge.split(',').map(Number).includes(selected.id));
 const detail=root.querySelector('.core-demo-detail');detail.replaceChildren();
 if(selected){const title=document.createElement('strong');title.textContent=selected.title;const text=document.createElement('span');text.textContent=selected.description;detail.append(title,text);}else detail.textContent='Wähle einen Core, um seine Beispielinformation und Verbindungen zu sehen.';
}
function activateCoreDemo(target){
 const toggle=target.closest('[data-core-mode]');if(toggle){const key=toggle.dataset.coreMode;const wasActive=coreDemo.active.has(key);coreDemo.active.clear();if(!wasActive)coreDemo.active.add(key);syncCoreDemo();animateCoreLayout();return;}
 const node=target.closest('[data-core-node]');if(node){const id=Number(node.dataset.coreNode);coreDemo.selected=coreDemo.selected===id?null:id;syncCoreDemo();}
}
document.addEventListener('click',e=>activateCoreDemo(e.target));
document.addEventListener('keydown',e=>{if(e.target.matches('[data-core-node]')&&['Enter',' '].includes(e.key)){e.preventDefault();activateCoreDemo(e.target);}});

// Weak cluster attraction preserves the overall map; short-range repulsion keeps nodes apart.
const coreMotion={points:[],frame:0};
function coreLayout(){
 const key=[...coreDemo.active][0];
 if(!key)return coreDemoNodes.map(n=>({x:n.x,y:n.y,vx:0,vy:0}));
 const targets=coreDemoNodes.map(n=>{
  const group=coreDemoNodes.filter(other=>other[key]===n[key]);
  const center=group.reduce((c,p)=>({x:c.x+p.x/group.length,y:c.y+p.y/group.length}),{x:0,y:0});
  const dx=(center.x-n.x)*.23,dy=(center.y-n.y)*.23,scale=Math.min(1,72/(Math.hypot(dx,dy)||1));
  return {x:n.x+dx*scale,y:n.y+dy*scale};
 });
 const points=targets.map(p=>({...p,vx:0,vy:0}));
 for(let step=0;step<70;step++){
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
   const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
   if(d<108){const force=(108-d)*.12;a.x-=dx/d*force;a.y-=dy/d*force;b.x+=dx/d*force;b.y+=dy/d*force;}
  }
  points.forEach((p,i)=>{p.x+=(targets[i].x-p.x)*.035;p.y+=(targets[i].y-p.y)*.035;});
 }
 return points;
}
function paintCoreLayout(root){
 const points=coreMotion.points;
 for(const el of root.querySelectorAll('[data-core-node]')){const id=Number(el.dataset.coreNode),p=points[id],base=coreDemoNodes[id];el.setAttribute('transform',`translate(${p.x-base.x} ${p.y-base.y})`);}
 for(const line of root.querySelectorAll('[data-core-edge]')){const [a,b]=line.dataset.coreEdge.split(',').map(id=>points[Number(id)]);for(const [key,value] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))line.setAttribute(key,value);}
 for(const [layerIndex,[key]] of coreDemoModes.entries()){
  const layer=root.querySelector(`[data-core-layer="${key}"]`);if(layer.hasAttribute('hidden'))continue;
  const labels=[...new Set(coreDemoNodes.map(n=>n[key]))],pad=30+layerIndex*9;
  for(const el of layer.querySelectorAll('[data-core-group]')){
   const label=labels[Number(el.dataset.coreGroup)],members=coreDemoNodes.filter(n=>n[key]===label).map(n=>points[n.id]);
   const hull=members.flatMap(p=>Array.from({length:8},(_,j)=>[p.x+Math.cos(j*Math.PI/4)*pad,p.y+Math.sin(j*Math.PI/4)*pad]));
   el.querySelector('polygon').setAttribute('points',coreDemoHull(hull));
   const first=members.reduce((a,b)=>a.y<b.y?a:b),text=el.querySelector('text');text.setAttribute('x',first.x-pad+8);text.setAttribute('y',first.y-pad-7);
  }
 }
}
function animateCoreLayout(){
 cancelAnimationFrame(coreMotion.frame);
 const root=document.querySelector('.core-prototype');if(!root)return;
 const target=coreLayout();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){coreMotion.points=target;paintCoreLayout(root);return;}
 let previous=performance.now(),elapsed=0;
 function tick(now){
  if(!root.isConnected)return;
  const dt=Math.min((now-previous)/1000,.032);previous=now;elapsed+=dt;let energy=0;
  coreMotion.points.forEach((p,i)=>{
   p.vx+=(65*(target[i].x-p.x)-15*p.vx)*dt;p.vy+=(65*(target[i].y-p.y)-15*p.vy)*dt;
   p.x+=p.vx*dt;p.y+=p.vy*dt;energy+=Math.abs(target[i].x-p.x)+Math.abs(target[i].y-p.y)+Math.abs(p.vx)+Math.abs(p.vy);
  });
  if(energy<.2||elapsed>2.4)coreMotion.points=target;
  paintCoreLayout(root);
  if(energy>=.2&&elapsed<=2.4)coreMotion.frame=requestAnimationFrame(tick);
 }
 paintCoreLayout(root);coreMotion.frame=requestAnimationFrame(tick);
}
