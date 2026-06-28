// ╔══════════════════════════════════════════════════════════╗
// ║  EXTRATOR DE ATRIBUTOS DETALHADOS DO WSDB.XYZ            ║
// ║  Rode no console (F12) enquanto LOGADO no wsdb.xyz       ║
// ║  Extrai stats completos: dano, defesa, vida, etc         ║
// ╚══════════════════════════════════════════════════════════╝

(async () => {
  console.log('🔍 Buscando atributos detalhados...');

  const results = {};
  const BASE = 'https://wsdb.xyz';

  // Helper: fetch API with credentials
  async function api(url) {
    const r = await fetch(BASE + url, {
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Get all item IDs from all subcategories
  console.log('📋 Buscando todas as categorias...');
  const allItemIds = [];

  for (let catId = 1; catId <= 100; catId++) {
    try {
      const cats = await api(`/api/data/item/category/pt/${catId}`);
      if (!cats || !cats.list) continue;

      for (const sub of cats.list) {
        const subId = sub.id;
        try {
          const items = await api(`/api/data/item/items/pt/${subId}`);
          if (!items || !items.list) continue;
          for (const item of items.list) {
            allItemIds.push({ id: item.id, name: item.name, subcategory: sub.name, icon: item.icon });
          }
          console.log(`   ${sub.name}: ${items.list.length} itens`);
        } catch(e) {}
        await new Promise(r => setTimeout(r, 200));
      }
    } catch(e) {}
  }

  console.log(`\n📦 ${allItemIds.length} itens encontrados. Buscando atributos detalhados...`);

  // Try to get detailed stats for items
  // The authenticated API endpoints to try
  const detailEndpoints = [
    '/api/items/',        // + itemId
    '/api/v1/items/',     // + itemId
    '/api/calculator/item/', // + itemId
    '/api/equipment/',    // + itemId
  ];

  let count = 0;
  for (let i = 0; i < allItemIds.length; i++) {
    const item = allItemIds[i];

    // Try to get detailed attributes
    let found = false;
    for (const ep of detailEndpoints) {
      try {
        const data = await api(ep + item.id + '?lang=pt');
        if (data && (data.stats || data.attributes || data.damage || data.defence || data.properties)) {
          results[item.id] = { ...item, ...data };
          found = true;
          count++;
          if (count % 50 === 0) console.log(`   ${count} itens com stats...`);
          break;
        }
      } catch(e) {}
    }

    // Also try the calculator endpoint
    if (!found) {
      try {
        const data = await api(`/api/calculator/equipment/${item.id}?lang=pt`);
        if (data) {
          results[item.id] = { ...item, stats: data };
          count++;
        }
      } catch(e) {}
    }

    // Delay to avoid rate limiting
    if (i % 20 === 0) await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ ${count} itens com atributos detalhados!`);
  console.log(`   ${Object.keys(results).length} total`);

  // Save to file
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wsdb_attributes.json';
  a.click();
  URL.revokeObjectURL(url);

  console.log('💾 Arquivo wsdb_attributes.json baixado!');
})();
