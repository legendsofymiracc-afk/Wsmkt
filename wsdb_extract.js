// ╔══════════════════════════════════════════════════════╗
// ║  EXTRATOR DE DADOS DO WSDB.XYZ                       ║
// ║  Cole este script no console (F12) enquanto estiver  ║
// ║  LOGADO no https://wsdb.xyz                          ║
// ╚══════════════════════════════════════════════════════╝

(async () => {
  console.log('🚀 Iniciando extração do wsdb.xyz...');

  const allData = {};
  const results = [];

  // Helper: fetch API
  async function api(url) {
    const r = await fetch('https://wsdb.xyz/' + url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
    return r.json();
  }

  // 1. CATEGORIES
  console.log('📋 Buscando categorias...');
  try {
    const cats = await api('api/items/categories');
    allData.categories = cats;
    console.log(`   ${JSON.stringify(cats).length} bytes`);
  } catch(e) { console.log('   ❌', e.message); }

  // 2. ITEMS - paginated
  console.log('📦 Buscando itens...');
  let page = 1;
  let totalItems = 0;
  const perPage = 500;

  while (true) {
    try {
      const data = await api(`api/items?lang=pt&page=${page}&perPage=${perPage}`);
      if (!data.items || data.items.length === 0) break;

      totalItems += data.items.length;
      results.push(...data.items);
      console.log(`   Página ${page}: ${data.items.length} itens (total: ${totalItems}/${data.total || '?'})`);

      if (data.items.length < perPage) break;
      if (data.total && totalItems >= data.total) break;
      page++;

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch(e) {
      console.log(`   ❌ Página ${page}: ${e.message}`);
      break;
    }
  }

  allData.items = results;
  console.log(`   ✅ Total: ${results.length} itens`);

  // 3. DOWNLOAD AS JSON
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wsdb_complete_data.json';
  a.click();
  URL.revokeObjectURL(url);

  console.log(`\n✅ EXTRAÇÃO CONCLUÍDA!`);
  console.log(`   ${results.length} itens salvos em wsdb_complete_data.json`);
  console.log('   Envie este arquivo para o projeto.');
})();
