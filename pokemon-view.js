/* ============================================================
   pokemon-view.js — Modo "Por Pokémon": ficha, favoritos visuales,
   cadena evolutiva y el buscador
   ============================================================ */

  function renderFavRow(){
    const favs = getFavorites();
    const row = document.getElementById('favRow');
    const chips = document.getElementById('favChips');
    if(!favs.length){ row.style.display = 'none'; chips.innerHTML=''; return; }
    row.style.display = 'block';
    chips.innerHTML = favs.map(function(name){
      const cached = lsGet('td_pokemon_' + name);
      const dotType = cached && cached.types[0] ? EN_TO_ES[cached.types[0]] : 'normal';
      return '<div class="fav-chip" data-name="' + name + '"><span class="fdot t-' + dotType + '"></span>' +
        name.charAt(0).toUpperCase() + name.slice(1) + '</div>';
    }).join('');
    chips.querySelectorAll('.fav-chip').forEach(function(chip){
      chip.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = chip.dataset.name;
        doPokemonSearch();
      });
    });
  }

  /* ---------- ficha de Pokémon ---------- */
  function renderPokemonCard(p, offlineNotice){
    const typeChips = p.types.map(function(en){ return typeChip(EN_TO_ES[en]); }).join('');
    const category = p.types.length > 1 ? 'Pokémon complejo' : 'Pokémon simple';
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
          '<button class="poke-fav-btn' + (fav ? ' active' : '') + '" id="favBtn" title="Marcar como favorito">' + (fav ? '★' : '☆') + '</button>' +
          '<img class="poke-illustration" src="' + p.sprite + '" alt="' + p.name + '">' +
          '<div class="poke-name">' + p.name + '</div>' +
          '<div class="poke-types">' + typeChips + '</div>' +
        '</div>' +
        '<div class="poke-body">' +
          '<p class="poke-desc">' + desc + '</p>' +
          '<div class="stat-grid">' +
            '<div class="stat-box"><div class="val">' + p.stats.hp + '</div><div class="lbl">PS</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats.attack + '</div><div class="lbl">Ataque</div></div>' +
            '<div class="stat-box"><div class="val">' + p.stats.speed + '</div><div class="lbl">Velocidad</div></div>' +
          '</div>' +
          '<div class="info-line"><span class="k">Categoría</span><span class="v">' + category + '</span></div>' +
          '<div class="info-line"><span class="k">Altura / Peso</span><span class="v">' + heightM + ' · ' + weightKg + '</span></div>' +
          '<div id="pokeMatchupSlot"><div class="matchup-block"><div class="matchup-title">Calculando ventajas y debilidades…</div></div></div>' +
          '<div id="pokeEvoSlot"><div class="matchup-block"><div class="matchup-title">Cargando cadena evolutiva…</div></div></div>' +
        '</div>' +
      '</div>' +
      (offlineNotice ? '<div class="source-tag"><span class="pulse" style="background:#8A8FA3"></span>datos de caché local (sin conexión)</div>' : '<div class="source-tag"><span class="pulse"></span>en vivo desde PokeAPI</div>')
    );
  }

  async function doPokemonSearch(){
    const raw = document.getElementById('pokeSearchInput').value;
    const query = raw.trim().toLowerCase();
    const zone = document.getElementById('pokeResultZone');
    if(!query){ zone.innerHTML = ''; return; }

    zone.innerHTML = loadingHTML();

    let result;
    try{
      result = await cachedFetchJSON('https://pokeapi.co/api/v2/pokemon/' + query, 'td_pokemon_raw_' + query);
    }catch(err){
      // sin red y sin caché: probamos la caché "simplificada" de semillas
      const seeded = lsGet('td_pokemon_' + query);
      if(seeded){
        zone.innerHTML = renderPokemonCard(seeded, true);
        wireCard(seeded);
      } else if(lsGet('td_pokemon_' + query) === null && query){
        zone.innerHTML = errorHTML(raw.trim());
      }
      return;
    }

    if(result.data && result.data.status === undefined && result.data.name === undefined){
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
    lsSet('td_pokemon_' + query, p); // caché simplificada para uso offline / favoritos

    zone.innerHTML = renderPokemonCard(p, result.fromCache);
    wireCard(p);
  }

  async function wireCard(p){
    const favBtn = document.getElementById('favBtn');
    if(favBtn){
      favBtn.addEventListener('click', function(){
        toggleFavorite(p.name);
        favBtn.classList.toggle('active');
        favBtn.textContent = favBtn.classList.contains('active') ? '★' : '☆';
      });
    }
    try{
      const rels = [];
      for(const enType of p.types){
        const r = await getTypeRelations(enType);
        rels.push(r.rel);
      }
      const matchup = computeMatchup(rels);
      const slot = document.getElementById('pokeMatchupSlot');
      if(slot) slot.innerHTML = renderMatchupBlock(matchup, 'Ventajas y debilidades de tipo');
    }catch(e){
      const slot = document.getElementById('pokeMatchupSlot');
      if(slot) slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">No se pudieron calcular (sin conexión ni caché para este tipo)</div></div>';
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

  function renderEvoTree(node, depth, incomingDetails, currentName){
    const id = extractIdFromUrl(node.species.url);
    const sprite = spriteUrlForId(id);
    const isCurrent = node.species.name === currentName;
    let html = '';
    if(incomingDetails !== null && incomingDetails !== undefined){
      const label = evoConditionLabel(incomingDetails);
      html += '<div class="evo-arrow" style="padding-left:' + (20 + depth * 14) + 'px;">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>' +
        (label || 'Evoluciona') + '</div>';
    }
    html += '<div class="evo-node' + (isCurrent ? ' current' : '') + '" data-name="' + node.species.name + '" style="margin-left:' + (depth * 14) + 'px;">' +
      '<img class="evo-node-img" src="' + sprite + '" alt="' + node.species.name + '">' +
      '<span class="evo-node-name">' + node.species.name + '</span>' +
      (isCurrent ? '<span class="evo-current-badge">actual</span>' : '') +
      '</div>';
    if(node.evolves_to && node.evolves_to.length){
      node.evolves_to.forEach(function(child){
        const details = (child.evolution_details && child.evolution_details[0]) || null;
        html += renderEvoTree(child, depth + 1, details, currentName);
      });
    }
    return html;
  }

  function wireEvoNodes(container, currentName){
    container.querySelectorAll('.evo-node').forEach(function(node){
      if(node.dataset.name === currentName) return; // el actual no navega
      node.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = node.dataset.name;
        doPokemonSearch();
      });
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
        if(!res.ok) throw new Error('HTTP ' + res.status);
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
        if(!res2.ok) throw new Error('HTTP ' + res2.status);
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
        '<div class="evo-unavailable">No disponible sin conexión ni caché para este Pokémon.</div></div>';
    }
  }

  document.getElementById('pokeSearchInput').addEventListener('input', function(){
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(doPokemonSearch, 350);
  });

  document.getElementById('pokeSearchInput').value = 'pikachu';
  doPokemonSearch();
  renderFavRow();
