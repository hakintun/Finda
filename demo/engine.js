// Offline, in-memory demonstration only. Never use this as production authentication.
export function freshness(confirmedAt, now = Date.now()) {
  const days = (now - new Date(confirmedAt).getTime()) / 86400000;
  return days >= 14 ? 'hidden' : days >= 7 ? 'outdated' : days >= 3 ? 'aging' : 'fresh';
}
const normalize = s => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
const aliases = {gen:'generator', 'i better pass my neighbour':'generator', indomine:'indomie'};
function distance(a,b,c,d) { const rad=x=>x*Math.PI/180; const h=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2; return 12742*Math.asin(Math.min(1,Math.sqrt(h))); }
export function search(listings, query, options = {}) {
 let q=normalize(query); q=aliases[q] || q; if (!q) return [];
 const hasLocation=Number.isFinite(options.lat)&&Number.isFinite(options.lng);
 return listings.flatMap(l=>{
  const state=freshness(l.confirmedAt, options.now); const name=normalize(l.product);
  if(state==='hidden' || !name.includes(q)) return [];
  const km=hasLocation?distance(options.lat,options.lng,l.lat,l.lng):null;
  if(km!==null && km>(options.radiusKm ?? 20)) return [];
  if(options.area && normalize(l.area)!==normalize(options.area)) return [];
  const score=(l.inStock?40:0)+(l.verified?15:0)+({fresh:30,aging:15,outdated:0}[state])-(km??0);
  return [{...l, freshness:state, distanceKm:km===null?null:Math.round(km*10)/10, score}];
 }).sort((a,b)=>b.score-a.score);
}
export function makeDemo() {
 const now=Date.now(); const days=n=>new Date(now-n*86400000).toISOString();
 const listings=[
  {id:'1',product:'Generator 2.5 kVA',price:185000,shop:'Demo Power Shop',area:'Mile 1',lat:4.794,lng:7.002,landmark:'Example landmark, Mile 1',inStock:true,verified:true,confirmedAt:days(0)},
  {id:'2',product:'Indomie noodles',price:750,shop:'Demo Food Stall',area:'Mile 3',lat:4.815,lng:6.99,landmark:'Example landmark, Mile 3',inStock:true,verified:false,confirmedAt:days(4)},
  {id:'3',product:'Generator 1 kVA',price:95000,shop:'Demo Electricals',area:'Mile 3',lat:4.815,lng:6.99,landmark:'Example landmark, Mile 3',inStock:true,verified:false,confirmedAt:days(8)}
 ];
 const messages=[]; const requests=[]; const reports=new Map();
 return {listings,messages,requests,
  confirm(listingId) { if(!listings.some(l=>l.id===listingId)) throw Error('Listing not found'); const r={id:String(requests.length+1),listingId,status:'pending'}; requests.push(r); messages.push({channel:'simulated',text:`Seller alert: please confirm listing ${listingId}`,requestId:r.id}); return r; },
  reply(id,answer) {const r=requests.find(x=>x.id===id); if(!r) throw Error('Request not found'); if(r.status!=='pending') throw Error('Already answered'); if(!['yes','no'].includes(answer)) throw Error('Answer must be yes or no'); r.status=answer; messages.push({channel:'simulated',text:`Buyer alert: seller answered ${answer}`,requestId:id}); return r;},
  report(listingId,buyerId) {const l=listings.find(x=>x.id===listingId); if(!l) throw Error('Listing not found'); if(!buyerId?.trim()) throw Error('Buyer ID required'); const set=reports.get(listingId)||new Set(); set.add(buyerId.trim()); reports.set(listingId,set); if(set.size>=3) l.inStock=false; return {distinctReports:set.size,demoted:!l.inStock};}
 };
}
