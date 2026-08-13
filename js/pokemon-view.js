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
        e.stopPropagation();
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

  // El cálculo de ventajas/debilidades es local e instantáneo (no depende
  // de red), así que se resuelve directamente al construir la ficha.
  function computeMatchupHtml(types){
    try{
      const rels = types.map(function(t){ return getTypeRelations(t); });
      const matchup = computeMatchup(rels);
      return renderMatchupBlock(matchup, 'Ventajas y debilidades de tipo');
    }catch(e){
      return '<div class="matchup-block"><div class="matchup-title">No se pudieron calcular las ventajas y debilidades de tipo.</div></div>';
    }
  }

  /* ---------- ficha de Pokémon ---------- */
  function renderPokemonCard(p){
    const typeChips = p.types.map(function(en){ return typeChip(EN_TO_ES[en]); }).join('');
    const heightM = (p.height / 10).toFixed(1) + ' m';
    const weightKg = (p.weight / 10).toFixed(1) + ' kg';
    const fav = isFavorite(p.name);
    const inTeam = isInTeam(p.name);
    const idStr = '#' + String(p.id).padStart(3, '0');
    const desc = p.types.length > 1
      ? 'Pokémon de tipo ' + TYPE_LABELS[EN_TO_ES[p.types[0]]] + ' y ' + TYPE_LABELS[EN_TO_ES[p.types[1]]] + '.'
      : 'Pokémon de tipo ' + TYPE_LABELS[EN_TO_ES[p.types[0]]] + '.';

    return (
      '<div class="poke-card">' +
        '<div class="poke-hero">' +
          '<span class="poke-id">' + idStr + '</span>' +
          '<button class="poke-team-btn' + (inTeam ? ' active' : '') + '" id="teamAddBtn" title="' + (inTeam ? 'Quitar de tu equipo' : 'Añadir a tu equipo') + '" aria-label="' + (inTeam ? 'Quitar de tu equipo' : 'Añadir a tu equipo') + '" aria-pressed="' + inTeam + '">' + (inTeam ? '✓' : '+') + '</button>' +
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
          computeMatchupHtml(p.types) +
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
      zone.innerHTML = emptyHTML(raw.trim());
      return;
    }

    const p = normalizePokemonData(result.data);
    zone.innerHTML = renderPokemonCard(p);
    wireCard(p);
  }

  // Convierte la respuesta cruda de PokeAPI en el objeto simplificado que usa
  // toda la app (ficha, favoritos, y ahora también las celdas de "Mi Equipo"),
  // y lo guarda en caché por nombre y por número.
  function normalizePokemonData(raw2){
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
    lsSet('td_pokemon_' + p.name, p);
    lsSet('td_pokemon_' + String(p.id), p);
    return p;
  }

  function wireCard(p){
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
    const teamBtn = document.getElementById('teamAddBtn');
    if(teamBtn){
      teamBtn.addEventListener('click', function(){ toggleTeamMembership(p, teamBtn); });
    }
    loadEvolutionSection(p);
  }

  renderFavRow();
