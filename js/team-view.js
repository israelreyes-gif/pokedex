/* ============================================================
   team-view.js — "Mi Equipo": hasta 6 Pokémon, modal de búsqueda
   para añadir, y el cálculo de Ataque/Defensa combinado del equipo
   ============================================================ */

  const TEAM_SIZE = 6;

  function getTeam(){
    const saved = lsGet('td_team');
    if(Array.isArray(saved) && saved.length === TEAM_SIZE) return saved;
    return new Array(TEAM_SIZE).fill(null);
  }
  function setTeam(team){ lsSet('td_team', team); }
  function isInTeam(name){ return getTeam().indexOf(name) !== -1; }

  /* ---------- aviso breve (toast) ---------- */
  let toastTimer = null;
  function showToast(msg){
    let el = document.getElementById('appToast');
    if(!el){
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 2400);
  }

  // Añade/quita el Pokémon de la ficha actual a la primera celda libre del
  // equipo (o lo quita, si ya estaba). Se llama desde el botón de la ficha
  // en "Por Pokémon", no solo desde la propia pantalla de "Mi Equipo".
  function toggleTeamMembership(p, btnEl){
    const team = getTeam();
    const idx = team.indexOf(p.name);

    if(idx !== -1){
      team[idx] = null;
      setTeam(team);
      updateTeamButtonUI(btnEl, false);
      showToast(capName(p.name) + ' se ha quitado de tu equipo.');
      return;
    }

    const emptyIdx = team.indexOf(null);
    if(emptyIdx === -1){
      showToast('Tu equipo ya está completo (6/6). Quita alguno antes de añadir otro.');
      return;
    }

    team[emptyIdx] = p.name;
    setTeam(team);
    updateTeamButtonUI(btnEl, true);
    showToast(capName(p.name) + ' añadido a tu equipo (' + (emptyIdx + 1) + '/6).');
  }

  function updateTeamButtonUI(btnEl, inTeam){
    if(!btnEl) return;
    btnEl.classList.toggle('active', inTeam);
    btnEl.textContent = inTeam ? '✓' : '+';
    const label = inTeam ? 'Quitar de tu equipo' : 'Añadir a tu equipo';
    btnEl.setAttribute('aria-label', label);
    btnEl.setAttribute('aria-pressed', inTeam);
    btnEl.setAttribute('title', label);
  }

  function renderTeamView(){
    renderTeamGrid();
    renderTeamAnalysis();
  }

  /* ---------- rejilla de 6 celdas ---------- */
  function renderTeamGrid(){
    const team = getTeam();
    const count = team.filter(Boolean).length;
    document.getElementById('teamLabel').textContent = 'Mi equipo (' + count + '/' + TEAM_SIZE + ')';

    const grid = document.getElementById('teamGrid');
    grid.innerHTML = team.map(function(name, i){
      if(!name){
        return '<div class="team-cell empty" data-index="' + i + '" role="button" tabindex="0" aria-label="Añadir Pokémon a la celda ' + (i + 1) + '">' +
          '<span class="plus">+</span></div>';
      }
      const p = lsGet('td_pokemon_' + name);
      if(!p){
        return '<div class="team-cell empty" data-index="' + i + '" role="button" tabindex="0" aria-label="Añadir Pokémon a la celda ' + (i + 1) + '">' +
          '<span class="plus">+</span></div>';
      }
      const typeChips = p.types.map(function(en){ return typeChip(EN_TO_ES[en]); }).join('');
      return '<div class="team-cell filled" data-index="' + i + '">' +
        '<button class="team-remove-btn" data-index="' + i + '" aria-label="Quitar ' + p.name + ' del equipo">✕</button>' +
        '<img src="' + p.sprite + '" alt="' + p.name + '" data-name="' + p.name + '" role="button" tabindex="0" aria-label="Ver ficha de ' + p.name + '">' +
        '<div class="name">' + p.name + '</div>' +
        '<div class="team-types">' + typeChips + '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('.team-cell.empty').forEach(function(cell){
      cell.addEventListener('click', function(){ openAddModal(parseInt(cell.dataset.index, 10)); });
      addKeyboardActivation(cell);
    });
    grid.querySelectorAll('.team-remove-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        removeFromTeam(parseInt(btn.dataset.index, 10));
      });
    });
    grid.querySelectorAll('.team-cell.filled img').forEach(function(img){
      img.addEventListener('click', function(){ goToPokemon(img.dataset.name); });
      addKeyboardActivation(img);
    });
  }

  function removeFromTeam(index){
    const team = getTeam();
    team[index] = null;
    setTeam(team);
    renderTeamGrid();
    renderTeamAnalysis();
  }

  /* ---------- modal para añadir ---------- */
  let teamAddSlotIndex = null;

  function openAddModal(index){
    teamAddSlotIndex = index;
    document.getElementById('teamModalInput').value = '';
    document.getElementById('teamModalSuggestions').style.display = 'none';
    document.getElementById('teamModalSuggestions').innerHTML = '';
    document.getElementById('teamAddModal').style.display = 'flex';
    document.getElementById('teamModalInput').focus();
  }
  function closeAddModal(){
    document.getElementById('teamAddModal').style.display = 'none';
    teamAddSlotIndex = null;
  }

  async function updateTeamModalSuggestions(rawQuery){
    const box = document.getElementById('teamModalSuggestions');
    const q = rawQuery.trim().toLowerCase();
    if(!q){ box.style.display = 'none'; box.innerHTML = ''; return; }

    const list = await ensurePokemonIndex();
    if(!list.length){ box.style.display = 'none'; return; }

    const yaEnEquipo = getTeam().filter(Boolean);
    const starts = list.filter(function(p){ return p.name.indexOf(q) === 0 && yaEnEquipo.indexOf(p.name) === -1; });
    const contains = list.filter(function(p){ return p.name.indexOf(q) > 0 && yaEnEquipo.indexOf(p.name) === -1; });
    const matches = starts.concat(contains).slice(0, 6);

    if(!matches.length){ box.style.display = 'none'; box.innerHTML = ''; return; }

    box.innerHTML = matches.map(function(p){
      return '<div class="suggestion-item" data-name="' + p.name + '" role="button" tabindex="0">' +
        '<span class="sid">#' + String(p.id).padStart(3, '0') + '</span>' +
        '<span class="sname">' + p.name + '</span></div>';
    }).join('');
    box.style.display = 'block';

    box.querySelectorAll('.suggestion-item').forEach(function(item){
      item.addEventListener('click', function(){ selectPokemonForTeam(item.dataset.name); });
      addKeyboardActivation(item);
    });
  }

  async function selectPokemonForTeam(name){
    const slotIndex = teamAddSlotIndex;
    closeAddModal();
    if(slotIndex === null) return;

    let p = lsGet('td_pokemon_' + name);
    if(!p){
      try{
        const result = await cachedFetchJSON('https://pokeapi.co/api/v2/pokemon/' + name, 'td_pokemon_raw_' + name);
        if(result.notFound) return;
        p = normalizePokemonData(result.data);
      }catch(e){
        return;
      }
    }

    const team = getTeam();
    team[slotIndex] = p.name;
    setTeam(team);
    renderTeamGrid();
    renderTeamAnalysis();
  }

  document.getElementById('teamModalInput').addEventListener('input', function(){
    updateTeamModalSuggestions(this.value);
  });
  document.getElementById('teamModalClose').addEventListener('click', closeAddModal);
  document.getElementById('teamModalBackdrop').addEventListener('click', closeAddModal);

  /* ---------- Ataque / Defensa del equipo ---------- */
  function computeTeamCoverage(members){
    const attack = {};
    const defense = {};

    ALL_EN_TYPES.forEach(function(en){
      attack[en] = [];
      defense[en] = [];
    });

    members.forEach(function(member){
      const rels = member.types.map(function(t){ return getTypeRelations(t); });

      ALL_EN_TYPES.forEach(function(en){
        let best = 0;
        rels.forEach(function(rel){ best = Math.max(best, multTo(rel, en)); });
        if(best >= 2) attack[en].push(member.name);

        let combo = 1;
        rels.forEach(function(rel){ combo *= multFrom(rel, en); });
        if(combo >= 2) defense[en].push(member.name);
      });
    });

    return { attack: attack, defense: defense };
  }

  function renderCoverageCard(title, sub, data, claseBuena, totalMiembros){
    const filas = ALL_EN_TYPES
      .map(function(en){ return { en: en, nombres: data[en] }; })
      .sort(function(a, b){ return b.nombres.length - a.nombres.length; });

    const filasHTML = filas.map(function(fila){
      const segs = [];
      for(let i = 0; i < totalMiembros; i++){
        const activo = i < fila.nombres.length;
        const nombre = activo ? fila.nombres[i] : '';
        segs.push(
          '<div class="coverage-seg ' + (activo ? claseBuena : 'neutral') + '"' +
          (activo ? ' data-name="' + nombre + '" role="button" tabindex="0" aria-label="' + nombre + '"' : '') + '>' +
          (activo ? '<div class="coverage-tooltip">' + nombre + '</div>' : '') +
          '</div>'
        );
      }
      return '<div class="coverage-row"><div class="tname">' + TYPE_LABELS[EN_TO_ES[fila.en]] + '</div>' +
        '<div class="coverage-bars">' + segs.join('') + '</div>' +
        '<div class="coverage-count">' + fila.nombres.length + '</div></div>';
    }).join('');

    return '<div class="coverage-card">' +
      '<div class="coverage-title">' + title + '</div>' +
      '<div class="coverage-sub">' + sub + '</div>' +
      filasHTML +
    '</div>';
  }

  function renderTeamAnalysis(){
    const container = document.getElementById('teamAnalysis');
    const team = getTeam();
    const members = team.filter(Boolean).map(function(name){ return lsGet('td_pokemon_' + name); }).filter(Boolean);

    if(!members.length){
      container.innerHTML = '<div class="team-empty-msg">Añade Pokémon a tu equipo tocando una celda vacía, y aquí verás cómo se comporta el equipo entero frente a cada tipo.</div>';
      return;
    }

    const coverage = computeTeamCoverage(members);
    const n = members.length;

    container.innerHTML =
      renderCoverageCard(
        '▲ Ataque del equipo',
        'Ordenado de más a menos cobertura. Toca una barra para ver quién.',
        coverage.attack, 'strong', n
      ) +
      renderCoverageCard(
        '▼ Defensa del equipo',
        'Ordenado de más a menos débiles. Toca una barra para ver quién.',
        coverage.defense, 'weak', n
      );

    container.querySelectorAll('.coverage-seg[data-name]').forEach(function(seg){
      seg.addEventListener('click', function(){
        const tip = seg.querySelector('.coverage-tooltip');
        const wasOpen = tip.classList.contains('show');
        container.querySelectorAll('.coverage-tooltip.show').forEach(function(t){ t.classList.remove('show'); });
        if(!wasOpen) tip.classList.add('show');
      });
      addKeyboardActivation(seg);
    });
  }
