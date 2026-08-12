/* ============================================================
   pokemon-view.js — Modo "Por Pokémon": ficha, favoritos visuales,
   cadena evolutiva y el buscador
   ============================================================ */

  // Activa un elemento con Enter o Espacio, igual que si se hubiera pulsado
  function addKeyboardActivation(el){
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        el.click();
      }
    });
  }

  function renderFavRow(){
    const favs = getFavorites();
    const row = document.getElementById('favRow');
    const chips = document.getElementById('favChips');
    row.style.display = 'block';

    if(!favs.length){
      chips.innerHTML = '<div class="fav-empty">Guarda tus Pokémon favoritos tocando la ☆ en su ficha, para acceder rápido a ellos.</div>';
      return;
    }

    chips.innerHTML = favs.map(function(name){
      const cached = lsGet('td_pokemon_' + name);
      const sprite = (cached && cached.sprite) ? cached.sprite : '';
      return '<div class="fav-card" data-name="' + name + '">' +
        (sprite ? '<img class="fav-card-img" src="' + sprite + '" alt="' + name + '">' : '<div class="fav-card-img"></div>') +
        '<div class="fav-card-name">' + name.charAt(0).toUpperCase() + name.slice(1) + '</div>' +
        '<button class="fav-remove-btn" data-name="' + name + '" aria-label="Quitar de favoritos">✕</button>' +
      '</div>';
    }).join('');

    chips.querySelectorAll('.fav-remove-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation(); // que no dispare también el click de la tarjeta
        toggleFavorite(btn.dataset.name);
      });
    });
    chips.querySelectorAll('.fav-card').forEach(function(card){
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = card.dataset.name;
        doPokemonSearch();
      });
      addKeyboardActivation(card);
    });
  }

  /* ---------- ficha de Pokémon ---------- */
  function renderPokemonCard(p){
    const typeChips = p.types.map(function(en){ return typeChip(EN_TO_ES[en]); }).join('');
    const heightM = (p.height / 10).toFixed(1) + ' m';
    const weightKg = (p.weight / 10).toFixed(1) + ' kg';
    const fav = isFavorite(p.name);
    const idStr = '#' + String(p.id).padStart(3, '0');
    const desc = p.types.length > 1
      ? 'Pokémon de tipo ' + TYPE_LABELS[EN_TO_ES[p.types[0]]] + ' y ' + TYPE_LABELS[EN_TO_ES[p.types[1]]] + '.'
      : 'Pokémon de tipo ' + TYPE_LABELS[EN_TO_ES[p.types[0]]] + '.';

    return (
      '<div class="poke-card">' +
        '<div class="poke-hero">' +
          '<span class="poke-id">' + idStr + '</span>' +
          '<button class="poke-fav-btn' + (fav ? ' active' : '') + '" id="favBtn" title="' + (fav ? 'Quitar de favoritos' : 'Marcar como favorito') + '" aria-label="' + (fav ? 'Quitar de favoritos' : 'Marcar como favorito') + '" aria-pressed="' + fav + '">' + (fav ? '★' : '☆') + '</button>' +
          '<img class="poke-illustration" src="' + p.sprite + '" alt="' + p.name + '">' +
          '<div class="poke-name">' + p.name + '</div>' +
          '<div class="poke-types">' + typeChips + '</div>' +
        '</div>' +
        '<div class="poke-body">' +
          '<p class="poke-desc">' + desc + '</p>' +
          '<div class="stat-grid">' +
            '<div class="stat-box"><div class="val">' + p.stats.hp + '</div><div class="lbl">PS</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats.attack + '</div><div class="lbl">Ataque</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats.defense + '</div><div class="lbl">Defensa</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats.speed + '</div><div class="lbl">Velocidad</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats['special-attack'] + '</div><div class="lbl">At. Esp.</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats['special-defense'] + '</div><div class="lbl">Def. Esp.</div></div>' +
          '</div>' +
          '<div class="info-line"><span class="k">Altura / Peso</span><span class="v">' + heightM + ' · ' + weightKg + '</span></div>' +
          '<div id="pokeMatchupSlot"><div class="matchup-block"><div class="matchup-title">Calculando ventajas y debilidades…</div></div></div>' +
          '<div id="pokeEvoSlot"><div class="matchup-block"><div class="matchup-title">Cargando cadena evolutiva…</div></div></div>' +
        '</div>' +
      '</div>'
    );
  }

  // Interpreta lo escrito: admite nombre normal o "#numero" (número de Pokédex)
  function parseSearchQuery(raw){
    const trimmed = raw.trim();
    if(trimmed.startsWith('#')){
      const num = trimmed.slice(1).trim();
      if(/^\d+$/.test(num)) return { value: num, valid: true };
      return { value: num, valid: false };
    }
    return { value: trimmed.toLowerCase(), valid: true };
  }

  async function doPokemonSearch(){
    const raw = document.getElementById('pokeSearchInput').value;
    const zone = document.getElementById('pokeResultZone');
    if(!raw.trim()){ zone.innerHTML = ''; return; }

    const parsed = parseSearchQuery(raw);
    if(!parsed.valid){
      zone.innerHTML = '<div class="error-state"><div class="big">Número no válido</div>' +
        'Después de «#» solo se aceptan números, por ejemplo «#25».</div>';
      return;
    }
    const query = parsed.value;

    zone.innerHTML = loadingHTML();

    let result;
    try{
      result = await cachedFetchJSON('https://pokeapi.co/api/v2/pokemon/' + query, 'td_pokemon_raw_' + query);
    }catch(err){
      // fallo real de red/servidor y sin caché: probamos la caché "simplificada" de semillas
      const seeded = lsGet('td_pokemon_' + query);
      if(seeded){
        zone.innerHTML = renderPokemonCard(seeded);
        wireCard(seeded);
      } else {
        zone.innerHTML = errorHTML(raw.trim());
      }
      return;
    }

    if(result.notFound){
      // la petición sí llegó: este Pokémon/número simplemente no existe
      zone.innerHTML = emptyHTML(raw.trim());
      return;
    }

    const raw2 = result.data;
    const sprite = (raw2.sprites && raw2.sprites.other && raw2.sprites.other['official-artwork'] && raw2.sprites.other['official-artwork'].front_default)
      || (raw2.sprites && raw2.sprites.front_default) || '';
    const statMap = {};
    (raw2.stats || []).forEach(function(s){ statMap[s.stat.name] = s.base_stat; });

    const p = {
      id: raw2.id,
      name: raw2.name,
      types: raw2.types.map(function(t){ return t.type.name; }),
      height: raw2.height,
      weight: raw2.weight,
      sprite: sprite,
      stats: {
        hp: statMap.hp, attack: statMap.attack, defense: statMap.defense,
        'special-attack': statMap['special-attack'], 'special-defense': statMap['special-defense'],
        speed: statMap.speed
      }
    };
    // caché simplificada para uso offline / favoritos, guardada por nombre Y por número
    lsSet('td_pokemon_' + p.name, p);
    lsSet('td_pokemon_' + String(p.id), p);

    zone.innerHTML = renderPokemonCard(p);
    wireCard(p);
  }

  async function wireCard(p){
    const favBtn = document.getElementById('favBtn');
    if(favBtn){
      favBtn.addEventListener('click', function(){
        toggleFavorite(p.name);
        favBtn.classList.toggle('active');
        const nowFav = favBtn.classList.contains('active');
        favBtn.textContent = nowFav ? '★' : '☆';
        const label = nowFav ? 'Quitar de favoritos' : 'Marcar como favorito';
        favBtn.setAttribute('aria-label', label);
        favBtn.setAttribute('aria-pressed', nowFav);
        favBtn.setAttribute('title', label);
      });
    }
    try{
      const rels = p.types.map(function(enType){ return getTypeRelations(enType); });
      const matchup = computeMatchup(rels);
      const slot = document.getElementById('pokeMatchupSlot');
      if(slot) slot.innerHTML = renderMatchupBlock(matchup, 'Ventajas y debilidades de tipo');
    }catch(e){
      const slot = document.getElementById('pokeMatchupSlot');
      if(slot) slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">No se pudieron calcular las ventajas y debilidades de tipo.</div></div>';
    }
    loadEvolutionSection(p);
  }

  /* ---------- cadena evolutiva ---------- */
  const ITEM_LABELS_ES = {
    'thunder-stone':'Piedra Trueno', 'water-stone':'Piedra Agua', 'fire-stone':'Piedra Fuego',
    'leaf-stone':'Piedra Hoja', 'moon-stone':'Piedra Lunar', 'sun-stone':'Piedra Solar',
    'shiny-stone':'Piedra Brillante', 'dusk-stone':'Piedra Noche', 'dawn-stone':'Piedra Alba',
    'ice-stone':'Piedra Hielo', 'metal-coat':'Recubrimiento Metálico', 'kings-rock':'Roca del Rey',
    'dragon-scale':'Escama Dragón', 'up-grade':'Mejora', 'upgrade':'Mejora',
    'dubious-disc':'Disco Extraño', 'protector':'Protector', 'electirizer':'Electrizador',
    'magmarizer':'Magmatizador', 'reaper-cloth':'Tela Mortaja', 'prism-scale':'Escama Prisma',
    'oval-stone':'Piedra Oval', 'deep-sea-tooth':'Colmillo Marino', 'deep-sea-scale':'Escama Marina',
    'razor-claw':'Garra Filo', 'razor-fang':'Colmillo Filo', 'whipped-dream':'Nube Dulce', 'sachet':'Perfumero'
  };

  function capName(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function formatSlug(s){ return capName((s || '').replace(/-/g, ' ')); }
  function extractIdFromUrl(url){ const m = (url || '').match(/\/(\d+)\/?$/); return m ? m[1] : ''; }
  function spriteUrlForId(id){ return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png'; }

  function evoConditionLabel(d){
    if(!d) return '';
    const parts = [];
    if(d.trigger){
      if(d.trigger.name === 'level-up'){
        parts.push(d.min_level ? ('Nivel ' + d.min_level) : 'Subir de nivel');
      } else if(d.trigger.name === 'trade'){
        parts.push('Intercambio');
      } else if(d.trigger.name === 'use-item'){
        parts.push('Usar objeto');
      } else if(d.trigger.name === 'shed'){
        parts.push('Muda especial');
      } else {
        parts.push(formatSlug(d.trigger.name));
      }
    }
    if(d.item) parts.push(ITEM_LABELS_ES[d.item.name] || formatSlug(d.item.name));
    if(d.held_item) parts.push('Llevando ' + (ITEM_LABELS_ES[d.held_item.name] || formatSlug(d.held_item.name)));
    if(d.min_happiness) parts.push('Felicidad alta');
    if(d.min_affection) parts.push('Cariño alto');
    if(d.time_of_day === 'day') parts.push('De día');
    if(d.time_of_day === 'night') parts.push('De noche');
    if(d.known_move) parts.push('Conoce ' + formatSlug(d.known_move.name));
    if(d.known_move_type) parts.push('Movimiento de tipo ' + formatSlug(d.known_move_type.name));
    if(d.location) parts.push('En ' + formatSlug(d.location.name));
    if(d.gender === 1) parts.push('Hembra');
    if(d.gender === 2) parts.push('Macho');
    return parts.filter(Boolean).join(' · ');
  }

  const EVO_ARROW_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';

  // Cadena sin ramas: lista lineal (ej. Pichu → Pikachu → Raichu).
  // Cadena con ramas: el nodo se muestra destacado y sus evoluciones
  // posibles aparecen en una rejilla, cada una con su propia condición
  // (ej. Eevee → Vaporeon / Jolteon / Flareon / …).
  function renderEvoTree(node, depth, incomingDetails, currentName){
    const id = extractIdFromUrl(node.species.url);
    const sprite = spriteUrlForId(id);
    const isCurrent = node.species.name === currentName;
    const children = node.evolves_to || [];

    let html = '';
    if(incomingDetails !== null && incomingDetails !== undefined){
      const label = evoConditionLabel(incomingDetails);
      html += '<div class="evo-arrow">' + EVO_ARROW_SVG + (label || 'Evoluciona') + '</div>';
    }

    if(children.length > 1){
      html += '<div class="evo-root' + (isCurrent ? ' current' : '') + '" data-name="' + node.species.name + '">' +
        '<img class="evo-root-img" src="' + sprite + '" alt="' + node.species.name + '">' +
        '<span class="evo-root-name">' + node.species.name + '</span>' +
        (isCurrent ? '<span class="evo-current-badge">actual</span>' : '') +
        '</div>';
      html += '<div class="evo-branch-label">' + EVO_ARROW_SVG +
        'Evoluciona a una de estas ' + children.length + ' formas, según la condición:</div>';
      html += '<div class="evo-grid">';
      children.forEach(function(child){
        const cId = extractIdFromUrl(child.species.url);
        const cSprite = spriteUrlForId(cId);
        const cIsCurrent = child.species.name === currentName;
        const details = (child.evolution_details && child.evolution_details[0]) || null;
        const condLabel = evoConditionLabel(details) || 'Evoluciona';
        html += '<div class="evo-branch-card' + (cIsCurrent ? ' current' : '') + '" data-name="' + child.species.name + '">' +
          '<img src="' + cSprite + '" alt="' + child.species.name + '">' +
          '<div class="name">' + child.species.name + '</div>' +
          '<div class="cond">' + condLabel + '</div>' +
          (cIsCurrent ? '<span class="evo-current-badge">actual</span>' : '') +
          '</div>';
      });
      html += '</div>';
      // caso raro: una rama tiene a su vez más evoluciones tras la rejilla
      children.forEach(function(child){
        if(child.evolves_to && child.evolves_to.length){
          html += renderEvoTree(child, depth + 1, null, currentName);
        }
      });
    } else {
      html += '<div class="evo-node' + (isCurrent ? ' current' : '') + '" data-name="' + node.species.name + '">' +
        '<img class="evo-node-img" src="' + sprite + '" alt="' + node.species.name + '">' +
        '<span class="evo-node-name">' + node.species.name + '</span>' +
        (isCurrent ? '<span class="evo-current-badge">actual</span>' : '') +
        '</div>';
      if(children.length === 1){
        const child = children[0];
        const details = (child.evolution_details && child.evolution_details[0]) || null;
        html += renderEvoTree(child, depth + 1, details, currentName);
      }
    }
    return html;
  }

  function wireEvoNodes(container, currentName){
    container.querySelectorAll('.evo-node, .evo-root, .evo-branch-card').forEach(function(node){
      if(node.dataset.name === currentName) return; // el actual no navega
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = node.dataset.name;
        doPokemonSearch();
      });
      addKeyboardActivation(node);
    });
  }

  async function loadEvolutionSection(p){
    const slot = document.getElementById('pokeEvoSlot');
    if(!slot) return;
    try{
      const speciesCacheKey = 'td_species_' + p.name;
      const speciesCached = lsGet(speciesCacheKey);
      let evoChainUrl;
      try{
        const res = await fetch('https://pokeapi.co/api/v2/pokemon-species/' + p.name);
        if(!res.ok) throw { kind: 'server', status: res.status };
        const json = await res.json();
        evoChainUrl = json.evolution_chain.url;
        lsSet(speciesCacheKey, { evolutionChainUrl: evoChainUrl });
      }catch(e){
        if(speciesCached) evoChainUrl = speciesCached.evolutionChainUrl;
        else throw e;
      }

      const chainId = extractIdFromUrl(evoChainUrl.replace(/\/$/, ''));
      const chainCacheKey = 'td_evochain_' + chainId;
      const chainCached = lsGet(chainCacheKey);
      let chainRoot;
      try{
        const res2 = await fetch(evoChainUrl);
        if(!res2.ok) throw { kind: 'server', status: res2.status };
        const json2 = await res2.json();
        chainRoot = json2.chain;
        lsSet(chainCacheKey, chainRoot);
      }catch(e){
        if(chainCached) chainRoot = chainCached;
        else throw e;
      }

      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Cadena evolutiva</div>' +
        '<div class="evo-chain">' + renderEvoTree(chainRoot, 0, null, p.name) + '</div></div>';
      wireEvoNodes(slot, p.name);
    }catch(e){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Cadena evolutiva</div>' +
        '<div class="evo-unavailable">No hay datos de evolución disponibles para este Pokémon.</div></div>';
    }
  }

  /* ---------- autocompletado ---------- */
  let pokemonIndexPromise = null;

  async function fetchFreshPokemonIndex(){
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000');
    if(!res.ok) throw { kind: 'server', status: res.status };
    const json = await res.json();
    const list = json.results.map(function(r){ return { name: r.name, id: extractIdFromUrl(r.url) }; });
    lsSet('td_pokemon_index', list);
    lsSet('td_pokemon_count', json.count);
    return list;
  }

  // Petición mínima (limit=1) solo para leer el total "count" que devuelve
  // PokeAPI en cualquier respuesta paginada, sin descargar la lista entera.
  async function fetchRemotePokemonCount(){
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1');
    if(!res.ok) throw { kind: 'server', status: res.status };
    const json = await res.json();
    return json.count;
  }

  // Usa el índice guardado al instante si existe. Cada vez que se abre la app,
  // comprueba en segundo plano (con una petición diminuta) si el número total
  // de Pokémon en PokeAPI ha cambiado desde la última descarga. Si sigue
  // siendo el mismo, no se vuelve a descargar nada; si ha aumentado (nueva
  // generación), se refresca la lista completa una sola vez.
  async function ensurePokemonIndex(){
    const cached = lsGet('td_pokemon_index');
    const cachedCount = lsGet('td_pokemon_count');

    if(cached && cached.length){
      if(!pokemonIndexPromise){
        pokemonIndexPromise = fetchRemotePokemonCount()
          .then(function(remoteCount){
            if(remoteCount !== cachedCount) return fetchFreshPokemonIndex();
            return cached;
          })
          .catch(function(){ return cached; });
      }
      return cached;
    }

    if(pokemonIndexPromise) return pokemonIndexPromise;
    pokemonIndexPromise = fetchFreshPokemonIndex().catch(function(){ return cached || []; });
    return pokemonIndexPromise;
  }

  function hideSuggestions(){
    const box = document.getElementById('pokeSuggestions');
    box.style.display = 'none';
    box.innerHTML = '';
  }

  async function updateSuggestions(rawQuery){
    const box = document.getElementById('pokeSuggestions');
    const q = rawQuery.trim().toLowerCase();
    if(!q || q.startsWith('#')){ hideSuggestions(); return; }

    const list = await ensurePokemonIndex();
    if(!list.length){ hideSuggestions(); return; }

    // primero los que empiezan por lo escrito, luego los que lo contienen en cualquier parte
    const starts = list.filter(function(p){ return p.name.indexOf(q) === 0; });
    const contains = list.filter(function(p){ return p.name.indexOf(q) > 0; });
    const matches = starts.concat(contains).slice(0, 6);
    if(!matches.length){ hideSuggestions(); return; }

    box.innerHTML = matches.map(function(p){
      return '<div class="suggestion-item" data-name="' + p.name + '">' +
        '<span class="sid">#' + String(p.id).padStart(3, '0') + '</span>' +
        '<span class="sname">' + p.name + '</span></div>';
    }).join('');
    box.style.display = 'block';

    box.querySelectorAll('.suggestion-item').forEach(function(item){
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('mousedown', function(e){ e.preventDefault(); }); // evita perder el foco antes del click
      item.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = item.dataset.name;
        hideSuggestions();
        doPokemonSearch();
      });
      addKeyboardActivation(item);
    });
  }

  const searchInputEl = document.getElementById('pokeSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  function updateClearBtn(){
    clearSearchBtn.style.display = searchInputEl.value ? 'block' : 'none';
  }

  searchInputEl.addEventListener('input', function(){
    updateClearBtn();
    updateSuggestions(this.value);
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(doPokemonSearch, 350);
  });

  searchInputEl.addEventListener('blur', function(){
    setTimeout(hideSuggestions, 120); // deja tiempo al click de una sugerencia
  });

  searchInputEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ hideSuggestions(); doPokemonSearch(); }
  });

  clearSearchBtn.addEventListener('click', function(){
    searchInputEl.value = '';
    updateClearBtn();
    hideSuggestions();
    document.getElementById('pokeResultZone').innerHTML = '';
    searchInputEl.focus();
  });

  ensurePokemonIndex(); // precarga en segundo plano para que el primer tecleo ya tenga sugerencias

  renderFavRow(); // por si ya hay favoritos guardados de una visita anterior
