const http=require('http');
const post=(b)=>new Promise((res,rej)=>{const s=JSON.stringify(b);const r=http.request({hostname:'localhost',port:5000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(s)}},resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>res(JSON.parse(d)));});r.on('error',rej);r.write(s);r.end();});
const get=(p,t)=>new Promise((res,rej)=>{const r=http.request({hostname:'localhost',port:5000,path:p,headers:{Authorization:'Bearer '+t}},resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>res(JSON.parse(d)));});r.on('error',rej);r.end();});
(async()=>{
  const l=await post({email:'saurabh@enterprise.com',password:'password123'});
  const t=l.accessToken;
  if(!t){console.error('Login failed',l);process.exit(1);}
  console.log('✅ Auth OK - role:',l.role);
  const stats=await get('/api/master/stats',t);
  console.log('✅ Master Stats:',JSON.stringify(stats));
  const uom=await get('/api/master/uom?q=KG',t);
  console.log('✅ UOM KG:',JSON.stringify(uom.slice(0,3)));
  const pg=await get('/api/master/purchase-groups?q=101',t);
  console.log('✅ PG 101:',JSON.stringify(pg.slice(0,2)));
  const plants=await get('/api/master/plants?q=1000',t);
  console.log('✅ Plants 1000:',JSON.stringify(plants.slice(0,2)));
  const sloc=await get('/api/master/storage-locations?plant=1000&q=GEN',t);
  console.log('✅ SLoc GEN:',JSON.stringify(sloc.slice(0,2)));
  const mg=await get('/api/master/material-groups?q=ABR',t);
  console.log('✅ MG ABR:',JSON.stringify(mg.slice(0,2)));
  process.exit(0);
})().catch(e=>{console.error('ERR:',e.message);process.exit(1);});
