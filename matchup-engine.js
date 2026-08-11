/* ============================================================
   matchup-engine.js — Motor de tipos: llamadas a PokeAPI para
   relaciones de daño, cálculo de multiplicadores, y componentes
   visuales reutilizables (chips, etiquetas, estados de carga/error)
   ============================================================ */

  async function cachedFetchJSON(url, cacheKey){
    const cached = lsGet(cacheKey);
    let res;
    try{
      res = await fetch(url);
    }catch(networkErr){
      // fallo real de red (sin conexión, dominio bloqueado, etc.)
      if(cached) return { data: cached, fromCache: true, offline: true };
      throw { kind: 'network' };
    }
    if(res.status === 404){
      // la petición SÍ llegó: PokeAPI responde que ese Pokémon/tipo no existe
      return { notFound: true };
    }
    if(!res.ok){
      if(cached) return { data: cached, fromCache: true, offline: true };
      throw { kind: 'server', status: res.status };
    }
    const data = await res.json();
    return { data: data, fromCache: false };
  }

  async function getTypeRelations(enSlug){
    const cacheKey = 'td_type_' + enSlug;
    const cached = lsGet(cacheKey);
    try{
      const res = await fetch('https://pokeapi.co/api/v2/type/' + enSlug);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const rel = {
        double_from: json.damage_relations.double_damage_from.map(function(t){return t.name;}),
        double_to:   json.damage_relations.double_damage_to.map(function(t){return t.name;}),
        half_from:   json.damage_relations.half_damage_from.map(function(t){return t.name;}),
        half_to:     json.damage_relations.half_damage_to.map(function(t){return t.name;}),
        no_from:     json.damage_relations.no_damage_from.map(function(t){return t.name;}),
        no_to:       json.damage_relations.no_damage_to.map(function(t){return t.name;})
      };
      lsSet(cacheKey, rel);
      return { rel: rel, fromCache: false };
    }catch(err){
      if(cached) return { rel: cached, fromCache: true };
      throw err;
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
    const fuerte = [], debil = [], inmune = [];
    ALL_EN_TYPES.forEach(function(en){
      // ofensivo: mejor multiplicador entre los tipos propios atacando "en"
      let best = 0;
      ownRelsArray.forEach(function(rel){ best = Math.max(best, multTo(rel, en)); });
      if(best >= 2) fuerte.push({ t: EN_TO_ES[en], m: 'x2' });

      // defensivo: producto de multiplicadores al recibir ataques de "en"
      let combo = 1;
      ownRelsArray.forEach(function(rel){ combo *= multFrom(rel, en); });
      if(combo === 0) inmune.push({ t: EN_TO_ES[en] });
      else if(combo >= 2) debil.push({ t: EN_TO_ES[en], m: (combo === 4 ? 'x4' : 'x2') });
    });
    return { fuerte: fuerte, debil: debil, inmune: inmune };
  }


  /* ---------- render helpers ---------- */
  function typeChip(esId){ return '<span class="chip t-' + esId + '">' + TYPE_LABELS[esId] + '</span>'; }
  function matchupTag(entry){
    const label = TYPE_LABELS[entry.t];
    const mult = entry.m ? '<span class="mult">' + entry.m + '</span>' : '';
    return '<span class="tag"><span class="dot t-' + entry.t + '"></span>' + label + mult + '</span>';
  }
  function renderMatchupBlock(matchup, title){
    let html = '<div class="matchup-block">';
    if(title) html += '<div class="matchup-title">' + title + '</div>';
    html += '<div class="row-group"><div class="row-title fuerte">▲ Fuerte contra</div><div class="tag-list">';
    html += matchup.fuerte.length ? matchup.fuerte.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title debil">▼ Débil contra</div><div class="tag-list">';
    html += matchup.debil.length ? matchup.debil.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
    html += '<div class="row-group"><div class="row-title inmune">● Sin efecto</div><div class="tag-list">';
    html += matchup.inmune.length ? matchup.inmune.map(matchupTag).join('') : '<span class="tag">— ninguno —</span>';
    html += '</div></div>';
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
