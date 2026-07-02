Pacote para banco de itens do market
==================================

Arquivos principais:
- items_market_catalog.json/csv/sqlite: itens pesquisaveis por name_exact.
- items_by_exact_name.json: mapa nome exato -> lista de item_id.
- item_icons_named_png: icones cujo nome do PNG bate com item_id do catalogo.
- all_icons_named_png: todos os PNGs encontrados em db_icons_large, inclusive skills/buffs/sem mapa.
- all_icons_catalog.json/csv: inventario completo dos icones.

Busca exata no site: compare a entrada do usuario com items.name_exact.
Se same_exact_name_count > 1, o mesmo nome aparece em varios item_id.
Nao encontrei atributos completos de equipamento/status nos arquivos locais; attributes_json ficou {}.
