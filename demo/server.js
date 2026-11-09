import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {makeDemo,search} from './engine.js';
const app=makeDemo();
const html=await readFile(new URL('./index.html',import.meta.url));
http.createServer(async(req,res)=>{
 const json=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
 try {
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&u.pathname==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});return res.end(html);}
  if(req.method==='GET'&&u.pathname==='/api/search') return json(200,search(app.listings,u.searchParams.get('q')||'',{area:u.searchParams.get('area')||undefined}));
  if(req.method==='GET'&&u.pathname==='/api/activity') return json(200,{requests:app.requests,messages:app.messages});
  if(req.method==='POST') {let text=''; for await(const chunk of req){text+=chunk;if(text.length>10000) throw Error('Request too large');} const data=JSON.parse(text||'{}');
   if(u.pathname==='/api/confirm') return json(201,app.confirm(data.listingId));
   if(u.pathname==='/api/reply') return json(200,app.reply(data.id,data.answer));
   if(u.pathname==='/api/report') return json(200,app.report(data.listingId,data.buyerId));
  }
  return json(404,{error:'Not found'});
 } catch(e) {return json(400,{error:e.message});}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Finda demo running on port '+(process.env.PORT||3000)));
