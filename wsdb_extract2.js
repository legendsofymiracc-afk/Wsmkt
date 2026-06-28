// ╔══════════════════════════════════════════════════════╗
// ║  EXTRATOR WSDB.XYZ V2 - Via XHR (bypass Service Worker) ║
// ╚══════════════════════════════════════════════════════╝

(async () => {
  // Primeiro verifica se está logado
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const cookies = document.cookie;
  console.log('🔍 Debug:');
  console.log('  Cookies:', cookies ? cookies.slice(0, 200) : '(nenhum)');
  console.log('  Token:', token ? token.slice(0, 50) : '(nenhum)');
  console.log('  URL:', location.href);

  if (!cookies && !token) {
    console.log('❌ Você NÃO está logado! Faça login primeiro.');
    console.log('   Acesse: https://wsdb.xyz/pt/user/login');
    return;
  }

  function xhrGet(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://wsdb.xyz/' + url);
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.withCredentials = true;
      xhr.onload = () => {
        if (xhr.status === 200) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(e) { reject(new Error('Invalid JSON')); }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send();
    });
  }

  const allData = { items: [], categories: [] };

  // 1. Categorias
  console.log('📋 Categorias...');
  try {
    allData.categories = await xhrGet('api/items/categories');
    console.log(`   ✅ ${allData.categories.length || JSON.stringify(allData.categories).length}B`);
  } catch(e) { console.log('   ❌', e.message); }

  // 2. Items paginados
  console.log('📦 Itens...');
  let page = 1;
  let total = 0;
  const perPage = 500;

  while (true) {
    try {
      const data = await xhrGet(`api/items?lang=pt&page=${page}&perPage=${perPage}`);
      if (!data.items || data.items.length === 0) break;
      total += data.items.length;
      allData.items.push(...data.items);
      console.log(`   Pág ${page}: ${data.items.length} itens (${total}/${data.total || '?'})`);
      if (data.items.length < perPage) break;
      if (data.total && total >= data.total) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      console.log(`   ❌ Pág ${page}: ${e.message}`);
      break;
    }
  }

  console.log(`\n✅ ${total} itens extraídos!`);

  // Download
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wsdb_complete_data.json';
  a.click();
  URL.revokeObjectURL(url);
  console.log('💾 Arquivo baixado!');
})();
