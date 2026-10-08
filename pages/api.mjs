let snapshot;
async function data(){
 if(!snapshot)snapshot=fetch(new URL('preview-data.json',document.baseURI)).then(async r=>{if(!r.ok)throw Error('Preview could not load. Please refresh.');return r.json()});
 return snapshot;
}
export async function previewApi(path,options={}){
 if(options.method&&options.method!=='GET')throw Error('Design preview only. Orders, payments, messages and admin changes are not saved.');
 const d=await data();
 if(path==='/store')return d.store;
 if(path==='/admin/session')return {username:'Design preview',must_change:false,csrf:''};
 if(path==='/admin/overview')return d.admin;
 if(path.startsWith('/admin/products/')){
  const p=d.store.products.find(p=>p.id===Number(path.split('/').pop()));
  if(p)return p;
 }
 if(path.startsWith('/locations?')){
  const params=new URLSearchParams(path.split('?')[1]),level=params.get('level');
  const rows=d.locations[level]||[];
  return rows.filter(row=>['region','province','city'].every(k=>!params.get(k)||row[k]===params.get(k)));
 }
 throw Error('This feature needs the full website server and is unavailable in the design preview.');
}
