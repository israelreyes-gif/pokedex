/* ============================================================
   moves-view.js — "Movimientos": lista completa (subir de nivel,
   MT, cría, tutor) con el nombre traducido al español. El nombre
   se pide y se cachea POR MOVIMIENTO (no por Pokémon), así que se
   comparte entre todos los Pokémon que conocen ese mismo movimiento
   — la mayoría de peticiones solo hacen falta la primera vez.
   ============================================================ */

  const MOVE_METHOD_LABELS = {
    'level-up': '▲ Subir de nivel',
    'machine': '⚙ Máquina (MT)',
    'egg': '🥚 Cría',
    'tutor': '👤 Tutor'
  };
  const MOVE_METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

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
        type: json.type ? json.type.name : null
      };
      lsSet(cacheKey, info);
      return info;
    }catch(e){
      return { name: formatSlug(enSlug), type: null };
    }
  }

  function moveRowHTML(m){
    const dot = m.type ? '<span class="dot t-' + EN_TO_ES[m.type] + '"></span>' : '<span class="dot dot-none"></span>';
    const nivel = m.level ? '<span class="move-level">Nv. ' + m.level + '</span>' : '';
    return '<div class="move-row">' + dot + '<span class="move-name">' + m.name + '</span>' + nivel + '</div>';
  }

  async function loadMovesSection(p){
    const slot = document.getElementById('pokeMovesSlot');
    if(!slot) return;
    const moves = p.moves || [];
    if(!moves.length){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Movimientos</div>' +
        '<div class="evo-unavailable">No hay datos de movimientos disponibles para este Pokémon.</div></div>';
      return;
    }

    try{
      const infos = await Promise.all(moves.map(async function(m){
        const info = await getMoveInfoEs(m.name);
        return { name: info.name, type: info.type, methods: m.methods };
      }));

      const groups = { 'level-up': [], machine: [], egg: [], tutor: [] };
      infos.forEach(function(info){
        MOVE_METHOD_ORDER.forEach(function(method){
          if(Object.prototype.hasOwnProperty.call(info.methods, method)){
            groups[method].push({ name: info.name, type: info.type, level: info.methods[method] });
          }
        });
      });
      groups['level-up'].sort(function(a, b){ return (a.level || 0) - (b.level || 0); });
      ['machine', 'egg', 'tutor'].forEach(function(method){
        groups[method].sort(function(a, b){ return a.name.localeCompare(b.name, 'es'); });
      });

      let html = '<div class="matchup-block"><div class="matchup-title">Movimientos</div>';
      let hayAlguno = false;
      MOVE_METHOD_ORDER.forEach(function(method){
        if(!groups[method].length) return;
        hayAlguno = true;
        html += '<div class="move-group">';
        html += '<div class="move-group-title">' + MOVE_METHOD_LABELS[method] + ' (' + groups[method].length + ')</div>';
        html += groups[method].map(moveRowHTML).join('');
        html += '</div>';
      });
      if(!hayAlguno){
        html += '<div class="evo-unavailable">No hay datos de movimientos disponibles para este Pokémon.</div>';
      }
      html += '</div>';
      slot.innerHTML = html;
    }catch(e){
      slot.innerHTML = '<div class="matchup-block"><div class="matchup-title">Movimientos</div>' +
        '<div class="evo-unavailable">No se pudieron cargar los movimientos.</div></div>';
    }
  }
