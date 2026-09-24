'use strict';
// Deliberately synthetic: the future graph can supply its own nodes and relationships.
function drawHomeGraph(){
 const groups=[
  {color:'#52e6ad',path:'M170 90 Q150 65 200 58 L500 90 Q548 98 532 145 L480 280 Q472 300 435 310 L128 355 Q85 362 102 320 Z',points:[[198,102],[321,126],[491,132],[442,258],[285,269],[139,321]]},
  {color:'#ad89ff',path:'M508 138 Q522 97 574 118 L807 195 Q845 208 859 259 L914 419 Q933 459 897 485 L713 572 Q672 593 638 556 L474 385 Q449 358 463 307 Z',points:[[547,156],[677,207],[805,237],[843,385],[879,451],[699,532],[606,414]]},
  {color:'#ff8ba7',path:'M280 173 Q310 143 350 168 L586 295 Q631 325 598 364 L359 541 Q325 565 280 548 L85 456 Q48 435 80 398 Z',points:[[318,199],[399,293],[552,335],[349,409],[315,512],[113,425],[226,352]]},
  {color:'#f1cf77',path:'M596 276 Q618 247 659 258 L880 312 Q920 324 897 367 L757 540 Q739 564 703 564 L419 536 Q376 532 402 493 Z',points:[[638,293],[857,347],[758,459],[716,525],[560,507],[437,502]]}
 ];
 const nodes=groups.flatMap((g,group)=>g.points.map(([x,y])=>({x,y,color:g.color,group})));
 const links=new Set();
 function connect(a,b){links.add([Math.min(a,b),Math.max(a,b)].join(':'));}
 let offset=0;for(const g of groups){for(let i=0;i<g.points.length;i++){connect(offset+i,offset+(i+1)%g.points.length);connect(offset+i,offset+(i+2)%g.points.length);}offset+=g.points.length;}
 [[1,13],[3,8],[4,15],[5,18],[2,6],[8,21],[10,22],[12,16],[15,20],[16,24],[17,23],[4,12]].forEach(([a,b])=>connect(a,b));
 document.querySelector('#content').innerHTML=`<section class="home-graph" aria-labelledby="home-graph-title"><div class="home-graph-heading"><h1 id="home-graph-title">Graph View</h1><span>Placeholder · Ohne Funktion</span></div><svg viewBox="0 0 1000 620" role="img" aria-labelledby="graph-description"><title id="graph-description">Beispiel eines Netzwerks mit vier farbigen, überlappenden Gruppen. Keine echten Lern- oder Teilnehmerdaten.</title><defs><pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#8eabc5" opacity=".14"/></pattern></defs><rect width="1000" height="620" fill="url(#graph-grid)"/>${groups.map(g=>`<path d="${g.path}" fill="${g.color}" fill-opacity=".065" stroke="${g.color}" stroke-opacity=".42" stroke-width="1.4"/>`).join('')}<g stroke="#a0b8ce" stroke-width="1">${[...links].map(key=>{const [a,b]=key.split(':').map(i=>nodes[i]);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" opacity="${a.group===b.group?'.28':'.13'}"/>`;}).join('')}</g>${nodes.map((n,i)=>`<circle cx="${n.x}" cy="${n.y}" r="${i%5===0?18:13}" fill="${n.color}" opacity=".08"/><circle cx="${n.x}" cy="${n.y}" r="${i%5===0?8:5}" fill="${n.color}" stroke="#0d1625" stroke-width="2"/>`).join('')}</svg></section>`;
}
