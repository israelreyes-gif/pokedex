/* ============================================================
   matchup-engine.js — Motor de tipos: relaciones de daño (locales,
   tabla fija), lista de Pokémon por tipo (PokeAPI, para "Ejemplos"),
   cálculo de multiplicadores, y componentes visuales reutilizables
   (chips, etiquetas, estados de carga/error)
   ============================================================ */

  async function cachedFetchJSON(url, cacheKey){
    const cached = lsGet(cacheKey);
    let res;
    try{
      res = await fetch(url);
    }catch(networkErr){
      // fallo real de red (sin conexión, dominio bloqueado, etc.)
      if(cached) return { data: cached };
      throw { kind: 'network' };
    }
    if(res.status === 404){
      // la petición SÍ llegó: PokeAPI responde que ese Pokémon/tipo no existe
      return { notFound: true };
    }
    if(!res.ok){
      if(cached) return { data: cached };
      throw { kind: 'server', status: res.status };
    }
    const data = await res.json();
    return { data: data };
  }

  // Las relaciones de tipo son datos fijos (nunca cambian), así que
  // se leen directamente de TYPE_CHART en vez de pedirlas a PokeAPI.
  function getTypeRelations(enSlug){
    return TYPE_CHART[enSlug];
  }

  // Lista de Pokémon que tienen un tipo determinado (para "Ejemplos de este tipo").
  // Esto sí cambia según el juego/generación, así que se pide a PokeAPI y se cachea.
  async function getTypePokemonList(enSlug){
    const cacheKey = 'td_type_pokemon_' + enSlug;
    const cached = lsGet(cacheKey);
    if(cached) return cached;
    try{
      const res = await fetch('https://pokeapi.co/api/v2/type/' + enSlug);
      if(!res.ok) throw { kind: 'server', status: res.status };
      const json = await res.json();
      const list = json.pokemon.map(function(p){
        return { name: p.pokemon.name, id: extractIdFromUrl(p.pokemon.url) };
      });
      lsSet(cacheKey, list);
      return list;
    }catch(e){
      throw e;
    }
  }

  function multFrom(rel, attackerEn){
    if(rel.no_from.indexOf(attackerEn) !== -1) return 0;
    if(rel.double_from.indexOf(attackerEn) !== -1) return 2;
    if(rel.half_from.indexOf(attackerEn) !== -1) return 0.5;
    return 1;
  }
  function multTo(rel, defenderEn){
    if(rel.no_to.indexOf(defenderEn) !== -1) return 0;
    if(rel.double_to.indexOf(defenderEn) !== -1) return 2;
    if(rel.half_to.indexOf(defenderEn) !== -1) return 0.5;
    return 1;
  }

  function computeMatchup(ownRelsArray){
    const fuerte = [], flojo = [], sinEfectoAtaque = [], debil = [], resiste = [], inmune = [];
    ALL_EN_TYPES.forEach(function(en){
      // ofensivo: mejor multiplicador entre los tipos propios atacando "en"
      let best = 0;
      ownRelsArray.forEach(function(rel){ best = Math.max(best, multTo(rel, en)); });
      if(best >= 2) fuerte.push({ t: EN_TO_ES[en], m: 'x2' });
      else if(best === 0) sinEfectoAtaque.push({ t: EN_TO_ES[en], m: 'x0' });
      else if(best < 1) flojo.push({ t: EN_TO_ES[en], m: 'x½' });

      // defensivo: producto de multiplicadores al recibir ataques de "en"
      let combo = 1;
      ownRelsArray.forEach(function(rel){ combo *= multFrom(rel, en); });
      if(combo === 0) inmune.push({ t: EN_TO_ES[en], m: 'x0' });
      else if(combo >= 2) debil.push({ t: EN_TO_ES[en], m: (combo === 4 ? 'x4' : 'x2') });
      else if(combo < 1) resiste.push({ t: EN_TO_ES[en], m: (combo === 0.25 ? 'x¼' : 'x½') });
    });
    return { fuerte: fuerte, flojo: flojo, sinEfectoAtaque: sinEfectoAtaque, debil: debil, resiste: resiste, inmune: inmune };
  }


  /* ---------- render helpers ---------- */
  function typeChip(esId){ return '<span class="chip t-' + esId + '">' + TYPE_LABELS[esId] + '</span>'; }
  function matchupTag(entry){
    const label = TYPE_LABELS[entry.t];
    const mult = entry.m ? '<span class="mult">' + entry.m + '</span>' : '';
    return '<span class="tag"><span class="dot t-' + entry.t + '"></span>' + label + mult + '</span>';
  }
  function renderMatchupBlock(matchup, title, opts){
    opts = opts || {};
    let html = opts.standalone ? '<div>' : '<div class="matchup-block">';
    if(title) html += '<div class="matchup-title">' + title + '</div>';

    // ATAQUE: si este tipo/Pokémon ataca, ¿a quién le hace mucho daño y a quién apenas le afecta?
    html += '<div class="matchup-section">';
    html += '<div class="matchup-section-title">Ataque</div>';
    html += '<div class="row-group"><div class="row-title fuerte">▲ Fuerte contra</div><div class="tag-list">';
    html += matchup.fuerte.length ? matchup.fuerte.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title flojo">▼ Poco eficaz contra</div><div class="tag-list">';
    html += matchup.flojo.length ? matchup.flojo.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title inmune">● Sin efecto</div><div class="tag-list">';
    html += matchup.sinEfectoAtaque.length ? matchup.sinEfectoAtaque.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '</div>';

    // DEFENSA: si a este tipo/Pokémon le atacan, ¿qué le afecta?
    html += '<div class="matchup-section">';
    html += '<div class="matchup-section-title">Defensa</div>';
    html += '<div class="row-group"><div class="row-title debil">▼ Débil contra</div><div class="tag-list">';
    html += matchup.debil.length ? matchup.debil.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title resiste">▲ Resiste</div><div class="tag-list">';
    html += matchup.resiste.length ? matchup.resiste.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title inmune">● Sin efecto</div><div class="tag-list">';
    html += matchup.inmune.length ? matchup.inmune.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function loadingHTML(msg){
    return '<div class="loading-state"><div class="big">Buscando…</div>' + (msg || 'Un momento') + '</div>';
  }
  function errorHTML(query){
    return '<div class="error-state"><div class="big">No se pudo cargar</div>' +
      'No hay conexión y «' + query + '» no está en la caché local todavía.</div>';
  }
  function emptyHTML(query){
    const esNumero = /^#?\d+$/.test(query.trim());
    const detalle = esNumero
      ? 'No existe ningún Pokémon con el número «' + query + '».'
      : 'No existe ningún Pokémon llamado «' + query + '».';
    return '<div class="empty-state"><div class="big">Sin resultados</div>' + detalle + '</div>';
  }
