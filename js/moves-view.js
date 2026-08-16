/* ============================================================
   moves-view.js — "Movimientos de subir de nivel": nombre
   traducido al español, potencia, categoría (Físico/Especial/
   Estado) y nivel. Cada movimiento se pide y se cachea UNA VEZ
   (por movimiento, no por Pokémon), así que se comparte entre
   todos los Pokémon que lo conocen.
   ============================================================ */

  const DAMAGE_CLASS_LABELS = { physical: 'Físico', special: 'Especial', status: 'Estado' };

  async function getMoveInfoEs(enSlug){
    const cacheKey = 'td_move_es_' + enSlug;
    const cached = lsGet(cacheKey);
    if(cached) return cached;
    try{
      const res = await fetch('https://pokeapi.co/api/v2/move/' + enSlug);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const esEntry = (json.names || []).find(function(n){ return n.language.name === 'es'; });
      const info = {
        name: esEntry ? esEntry.name : formatSlug(enSlug),
        type: json.type ? json.type.name : null,
        power: (json.power === null || json.power === undefined) ? null : json.power,
        damageClass: json.damage_class ? json.damage_class.name : null
      };
      lsSet(cacheKey, info);
      return info;
    }catch(e){
      return { name: formatSlug(enSlug), type: null, power: null, damageClass: null };
    }
  }

  function moveRowHTML(m){
    const dot = m.type ? '<span class="dot t-' + EN_TO_ES[m.type] + '"></span>' : '<span class="dot dot-none"></span>';
    const potencia = (m.power !== null && m.power !== undefined) ? m.power : '—';
    const claseLabel = DAMAGE_CLASS_LABELS[m.damageClass] || '—';
    const claseCss = m.damageClass || 'none';
    return '<div class="move-row">' + dot +
      '<span class="move-name">' + m.name + '</span>' +
      '<span class="move-power">' + potencia + '</span>' +
      '<span class="move-class move-class-' + claseCss + '">' + claseLabel + '</span>' +
      '<span class="move-level">Nv. ' + m.level + '</span>' +
    '</div>';
  }

  async function loadMovesSection(p){
    const slot = document.getElementById('pokeMovesSlot');
    if(!slot) return;
    const learnedByLevel = (p.moves || []).filter(function(m){
      return Object.prototype.hasOwnProperty.call(m.methods, 'level-up');
    });

    if(!learnedByLevel.length){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Movimientos</div>' +
        '<div class="evo-unavailable">No hay datos de movimientos disponibles para este Pokémon.</div></div>';
      return;
    }

    try{
      const infos = await Promise.all(learnedByLevel.map(async function(m){
        const info = await getMoveInfoEs(m.name);
        return {
          name: info.name, type: info.type, power: info.power, damageClass: info.damageClass,
          level: m.methods['level-up']
        };
      }));
      infos.sort(function(a, b){ return (a.level || 0) - (b.level || 0); });

      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Movimientos (subir de nivel)</div>' +
        '<div class="move-header-row"><span></span><span>Nombre</span><span>Pot.</span><span>Categoría</span><span>Nivel</span></div>' +
        infos.map(moveRowHTML).join('') +
      '</div>';
    }catch(e){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Movimientos</div>' +
        '<div class="evo-unavailable">No se pudieron cargar los movimientos.</div></div>';
    }
  }
