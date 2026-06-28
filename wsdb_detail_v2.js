(async function(){
var token=localStorage.getItem('token')||'';
if(!token){for(var i=0;i<localStorage.length;i++){var v=localStorage.getItem(localStorage.key(i));if(v&&v.length>50&&v.length<500&&v.includes('eyJ')){token=v;break}}}
if(!token){console.log('TOKEN NAO ENCONTRADO');return}
console.log('Token OK. Testando endpoints de detalhes...');

async function test(url){
 var r=await fetch('https://wsdb.xyz'+url,{headers:{'Accept':'application/json','Authorization':'Bearer '+token}});
 var t=await r.text();
 return{url:url,status:r.status,size:t.length,preview:t.slice(0,300)};
}

var tests=[
 '/api/calculator/equipment/668?lang=pt',
 '/api/calculator/item/668?lang=pt',
 '/api/items/info/668',
 '/api/items/detail/668',
 '/api/v1/items/668',
 '/api/v2/items/668',
 '/api/data/items/668',
 '/api/equipment/668',
 '/api/equipment/detail/668',
 '/api/item/detail/668',
 '/api/item/info/668',
 '/api/item/stats/668',
 '/api/calculator/stats/668',
 '/api/calculator/668',
 '/api/data/calculator/668',
];

for(var i=0;i<tests.length;i++){
 var r=await test(tests[i]);
 console.log(r.status,r.size+'B',r.url);
 if(r.status===200&&r.size>50)console.log('  >>> SUCESSO!',r.preview);
}

console.log('\nAgora abra o wsdb.xyz, clique num item, veja na aba Network qual URL aparece, e me fale!');
})();