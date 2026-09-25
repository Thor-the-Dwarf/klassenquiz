'use strict';
// Named knowledge clusters reuse reviewed topic membership and Core dependencies.
// Curriculum memberships come exclusively from the existing curated Core catalog.
const coreClusterDefinitions=[
 ['unternehmen','Unternehmen und Ziele','01_01'],
 ['kundenbedarf','Kundenbedarf und Beratung','01_02'],
 ['prozesse','Geschäftsprozesse','01_03'],
 ['projektplanung','Projektplanung','02_01'],
 ['zusammenarbeit','Vorgehensmodelle und Zusammenarbeit','02_02'],
 ['qualitaet','Qualitätssicherung und Risiken','02_03'],
 ['beschaffung','Beschaffung und Angebotsvergleich','03_01'],
 ['vertraege','Verträge und Nutzungsrechte','03_02'],
 ['service','Service und Auftragsabschluss','03_03'],
 ['rechnen','Dreisatz und Prozentrechnung','04_01'],
 ['bezugskalkulation','Bezugskalkulation','04_02'],
 ['lebenszykluskosten','Kosten über die Nutzungsdauer','04_03'],
 ['zahlensysteme','Zahlensysteme und Logik','05_01'],
 ['speicherbedarf','Speicherbedarf','05_02'],
 ['datenuebertragung','Datenübertragung','05_03'],
 ['subnetting','IPv4-Subnetze','06_01'],
 ['energie','Leistung und Energiebedarf','06_02'],
 ['sicherungskapazitaet','Sicherungsmengen und Verfügbarkeit','06_03'],
 ['hardware','Hardwareauswahl','07_01'],
 ['peripherie','Massenspeicher und Peripherie','07_02'],
 ['arbeitsplatz','Ergonomische und nachhaltige IT','07_03'],
 ['betriebssysteme','Betriebssysteme und Dateisysteme','08_01'],
 ['berechtigungen','Benutzer und Berechtigungen','08_02'],
 ['virtualisierung','Virtualisierung und Cloud','08_03'],
 ['netzwerkaufbau','Netzwerkaufbau und Schichten','09_01'],
 ['netzkonfiguration','Adresskonfiguration','09_02'],
 ['netzdienste','DHCP und DNS','09_03'],
 ['netzsegmentierung','LAN, WLAN, VLAN und VPN','10_01'],
 ['informationssicherheit','Schutzziele und Bedrohungen','10_02'],
 ['systemschutz','Härtung und Datensicherung','10_03'],
 ['kryptografie','Verschlüsselung und Zertifikate','11_01'],
 ['datenschutz','Datenschutz','11_02'],
 ['diagnose','Fehlersuche und Abnahme','11_03'],
 ['softwareauswahl','Softwareanforderungen und Use Cases','12_01'],
 ['programmierung','Datentypen und Operatoren','12_02'],
 ['verzweigungen','Bedingungen und Verzweigungen','12_03'],
 ['schleifen','Schleifen und Funktionen','13_01'],
 ['softwaretests','Softwaretests','13_02'],
 ['aktivitaeten','Aktivitäten und Entscheidungsregeln','13_03'],
 ['objektorientierung','Objekte und Klassen','14_01'],
 ['datenmodelle','Relationale Datenmodelle','14_02'],
 ['datenintegritaet','Normalisierung und Datenaustausch','14_03'],
 ['ki','Künstliche Intelligenz','15_01'],
 ['prompting','Prompting und Ergebnisprüfung','15_02'],
 ['pruefungsstrategie','Lösungsbegründung und Prüfungsstrategie','15_03']
].map(([id,title,topic])=>({id,title,topic:'Level'+topic+'_'})).concat([
 {id:'bits-bytes',title:'Bits und Bytes',coreIds:['bit','byte','bit-kombinationen','bit-maximum','bit-bedeutung','speicher-dezimal','speicher-binaer','praefix-umrechnung']},
 {id:'ipv4-adressen',title:'IPv4-Adressen',coreIds:['ipv4','ipv4-bits','ipv4-oktett','ipv4-eindeutigkeit','ipv4-maske','ipv4-netzadresse','ipv4-broadcast','ipv4-privat','ipv4-hostbits','ipv4-hostbereich']},
 {id:'ipv6-adressen',title:'IPv6-Adressen',coreIds:['ipv6','ipv6-bits','ipv6-schreibweise','ipv6-kuerzung','ipv6-dokumentation','ipv6-ula','ipv6-kein-broadcast','slaac','neighbor-discovery','router-advertisement']},
 {id:'verbesserung',title:'Kontinuierliche Verbesserung',coreIds:['pdca','soll-ist-vergleich','wirksamkeitsnachweis','retrospektive','verbesserung-pruefen','nacharbeit','prozessziel']},
 {id:'transportprotokolle',title:'TCP und UDP',coreIds:['tcp','udp','port-network','standardports','port-kein-vertrauen','quic']}
]);
function buildKnowledgeClusters(cores){
 const byId=new Map(cores.map(c=>[c.id,c]));
 const nodes=coreClusterDefinitions.map(def=>{
  const ids=new Set(cores.filter(c=>def.topic&&(c.topics||[]).some(t=>t.startsWith(def.topic))).map(c=>c.id));
  for(const id of def.coreIds||[])if(byId.has(id))ids.add(id);
  // A statement's reviewed prerequisite is also part of its knowledge cluster.
  const pending=[...ids];while(pending.length){for(const id of byId.get(pending.pop())?.usesCoreIds||[])if(byId.has(id)&&!ids.has(id)){ids.add(id);pending.push(id);}}
  const members=[...ids].map(id=>byId.get(id)),clusters={};
  for(const mode of ['arp','lf','exam'])clusters[mode]=[...new Set(members.flatMap(c=>c.clusters?.[mode]||[]))];
  const answered=members.some(c=>c.percent!==null);
  return {id:def.id,title:def.title,coreIds:[...ids],clusters,percent:answered?Math.round(members.reduce((sum,c)=>sum+(c.percent||0),0)/members.length):null};
 }).filter(n=>n.coreIds.length);
 // Do not silently drop future Cores whose topic has not been assigned yet.
 const assigned=new Set(nodes.flatMap(n=>n.coreIds)),unassigned=cores.filter(c=>!assigned.has(c.id));
 if(unassigned.length)nodes.push({id:'unassigned',title:'Noch keinem Cluster zugeordnet',coreIds:unassigned.map(c=>c.id),clusters:{arp:[],lf:[],exam:[]},percent:null});
 const edges=[];
 for(let i=0;i<nodes.length;i++){const ids=new Set(nodes[i].coreIds);for(let j=i+1;j<nodes.length;j++){const shared=nodes[j].coreIds.filter(id=>ids.has(id));if(shared.length)edges.push({source:nodes[i].id,target:nodes[j].id,coreIds:shared,weight:shared.length});}}
 return {nodes,edges,cores:byId};
}
