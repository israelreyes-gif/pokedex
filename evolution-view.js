/* ============================================================
   evolution-view.js — Cadena evolutiva: etiquetas de condiciones,
   árbol/rejilla de ramas, y navegación entre evoluciones
   ============================================================ */

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

  // Igual que con la ficha del Pokémon: la cadena evolutiva tampoco cambia
  // nunca, así que si ya está guardada se usa directamente sin tocar la red.
  async function loadEvolutionSection(p){
    const slot = document.getElementById('pokeEvoSlot');
    if(!slot) return;
    try{
      const speciesCacheKey = 'td_species_' + p.name;
      const speciesCached = lsGet(speciesCacheKey);
      let evoChainUrl;
      if(speciesCached){
        evoChainUrl = speciesCached.evolutionChainUrl;
      } else {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon-species/' + p.name);
        if(!res.ok) throw { kind: 'server', status: res.status };
        const json = await res.json();
        evoChainUrl = json.evolution_chain.url;
        lsSet(speciesCacheKey, { evolutionChainUrl: evoChainUrl });
      }

      const chainId = extractIdFromUrl(evoChainUrl.replace(/\/$/, ''));
      const chainCacheKey = 'td_evochain_' + chainId;
      const chainCached = lsGet(chainCacheKey);
      let chainRoot;
      if(chainCached){
        chainRoot = chainCached;
      } else {
        const res2 = await fetch(evoChainUrl);
        if(!res2.ok) throw { kind: 'server', status: res2.status };
        const json2 = await res2.json();
        chainRoot = json2.chain;
        lsSet(chainCacheKey, chainRoot);
      }

      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Cadena evolutiva</div>' +
        '<div class="evo-chain">' + renderEvoTree(chainRoot, 0, null, p.name) + '</div></div>';
      wireEvoNodes(slot, p.name);
    }catch(e){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Cadena evolutiva</div>' +
        '<div class="evo-unavailable">No hay datos de evolución disponibles para este Pokémon.</div></div>';
    }
  }
