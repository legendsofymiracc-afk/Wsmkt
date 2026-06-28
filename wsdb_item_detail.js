(async function(){
var token=localStorage.getItem('token')||localStorage.getItem('auth')||localStorage.getItem('jwt')||'';
if(!token){
 for(var i=0;i<localStorage.length;i++){
  var v=localStorage.getItem(localStorage.key(i));
  if(v&&v.length>50&&v.length<500&&(v.includes('eyJ')||v.includes('.'))){token=v;break}
 }
}
if(!token){
 for(var i=0;i<sessionStorage.length;i++){
  var v=sessionStorage.getItem(sessionStorage.key(i));
  if(v&&v.length>50&&v.length<500&&(v.includes('eyJ')||v.includes('.'))){token=v;break}
 }
}
console.log('Token:',token?token.slice(0,80)+'...':'NAO ENCONTRADO');
if(!token){console.log('Keys LS:',Object.keys(localStorage));console.log('Keys SS:',Object.keys(sessionStorage));return}

var done=0,results={};
async function api(u){
 var r=await fetch('https://wsdb.xyz'+u,{headers:{'Accept':'application/json','Authorization':'Bearer '+token}});
 if(!r.ok)throw new Error('HTTP '+r.status);
 return r.json()
}
async function getDetail(id,name){
 try{
  var d=await api('/api/items/'+id+'?lang=pt');
  if(d){results[id]={id:id,name:name,detail:d};done++;if(done%10===0)console.log(done+'/'+all.length+' com detalhes')}
 }catch(e){}
}
var all=[];
for(var cat=1;cat<=100;cat++){
 try{
  var c=await api('/api/data/item/category/pt/'+cat);
  if(!c||!c.list)continue;
  for(var s of c.list){
   try{
    var items=await api('/api/data/item/items/pt/'+s.id);
    if(!items||!items.list)continue;
    for(var i of items.list){all.push({id:i.id,name:i.name})}
    console.log(s.name+': '+items.list.length)
   }catch(e){}
  }
 }catch(e){}
}
console.log('\n'+all.length+' itens. Buscando detalhes...');
for(var i=0;i<all.length;i++){await getDetail(all[i].id,all[i].name);if(i%50===0)await new Promise(function(r){setTimeout(r,300)})}
console.log('\n'+done+' com detalhes!');
var b=new Blob([JSON.stringify(results)],{type:'application/json'});
var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='wsdb_detail.json';a.click();
})();