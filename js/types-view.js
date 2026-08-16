/* ============================================================
   types-view.js — Modo "Por Tipo": panal de hexágonos, combinador
   Simple/Complejo, y el interruptor Por Pokémon / Por Tipo
   ============================================================ */

  /* ---------- Toggle: Por Pokémon / Por Tipo / Mi Equipo ---------- */
  const modeToggle = document.getElementById('modeToggle');
  const viewPokemon = document.getElementById('view-pokemon');
  const viewTipo = document.getElementById('view-tipo');
  const viewTeam = document.getElementById('view-team');
  const modeButtons = Array.prototype.slice.call(modeToggle.querySelectorAll('button'));

  modeButtons.forEach(function(btn, index){
    btn.addEventListener('click', function(){
      modeButtons.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      modeToggle.setAttribute('data-active', index);
      const mode = btn.dataset.mode;
      viewPokemon.style.display = (mode === 'pokemon') ? 'block' : 'none';
      viewTipo.style.display = (mode === 'tipo') ? 'block' : 'none';
      viewTeam.style.display = (mode === 'equipo') ? 'block' : 'none';
      if(mode === 'equipo') renderTeamView();
    });
  });

  /* ---------- Toggle: Simple / Complejo ---------- */
  const toggle = document.getElementById('toggle');
  const complexView = document.getElementById('complex-view');
  const hexLabel = document.getElementById('hexLabel');
  let comboSelection = [];

  toggle.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      toggle.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      comboSelection = [];
      updateComboSlots();
      document.getElementById('typeResultZone').innerHTML = '';
      document.querySelectorAll('.hex').forEach(function(h){ h.classList.remove('selected'); });
      if(mode === 'complex'){
        toggle.classList.add('state-2');
        complexView.style.display = 'block';
        hexLabel.textContent = 'Toca dos tipos';
      } else {
        toggle.classList.remove('state-2');
        complexView.style.display = 'none';
        hexLabel.textContent = 'Elige un tipo';
      }
    });
  });

  function updateComboSlots(){
    const s1 = document.getElementById('comboSlot1');
    const s2 = document.getElementById('comboSlot2');
    [s1, s2].forEach(function(slot, i){
      slot.className = 'combo-slot';
      if(comboSelection[i]){
        slot.classList.add('filled', 't-' + comboSelection[i]);
        slot.textContent = TYPE_LABELS[comboSelection[i]];
      } else {
        slot.textContent = 'Tipo ' + (i + 1);
      }
    });
  }

  function runTypeQuery(esTypes){
    const zone = document.getElementById('typeResultZone');
    // Sin estado de "cargando": el cálculo es local e instantáneo (no depende de red).
    try{
      const rels = [];
      esTypes.forEach(function(es){ rels.push(getTypeRelations(ES_TO_EN[es])); });
      const matchup = computeMatchup(rels);
      const chipsHTML = esTypes.map(function(es, i){
        return (i > 0 ? '<span class="vs">+</span>' : '') + '<span class="chip t-' + es + '">' + TYPE_LABELS[es] + '</span>';
      }).join('');
      zone.innerHTML =
        '<div class="result"><div class="result-head">' + chipsHTML +
        '</div>' +
        '<div class="result-body">' + renderMatchupBlock(matchup) +
        '<div id="typeExamplesSlot" class="examples-section"><div class="examples-title">' +
          (esTypes.length > 1 ? 'Ejemplos de esta combinación' : 'Ejemplos de este tipo') +
        '</div><div style="font-size:12px;color:var(--muted);">Cargando…</div></div>' +
        '</div></div>';
      loadTypeExamples(esTypes);
    }catch(e){
      zone.innerHTML = '<div class="error-state"><div class="big">No se pudo calcular</div>' +
        'Ha habido un problema al calcular las ventajas y debilidades de este tipo.</div>';
    }
  }

  function exampleCardHTML(p){
    return '<div class="example-card" data-name="' + p.name + '">' +
      '<img src="' + spriteUrlForId(p.id) + '" alt="' + p.name + '">' +
      '<div class="name">' + p.name + '</div></div>';
  }

  function goToPokemon(name){
    document.querySelector('#modeToggle button[data-mode="pokemon"]').click();
    document.getElementById('pokeSearchInput').value = name;
    doPokemonSearch();
  }

  async function loadTypeExamples(esTypes){
    const slot = document.getElementById('typeExamplesSlot');
    if(!slot) return;
    const title = esTypes.length > 1 ? 'Ejemplos de esta combinación' : 'Ejemplos de este tipo';
    try{
      const enSlugs = esTypes.map(function(es){ return ES_TO_EN[es]; });
      const lists = await Promise.all(enSlugs.map(function(en){ return getTypePokemonList(en); }));

      let examples = lists[0];
      if(lists.length > 1){
        const namesInSecond = {};
        lists[1].forEach(function(p){ namesInSecond[p.name] = true; });
        examples = examples.filter(function(p){ return namesInSecond[p.name]; });
      }
      examples = examples.slice()
        .sort(function(a, b){ return parseInt(a.id, 10) - parseInt(b.id, 10); })
        .slice(0, 8);

      if(!examples.length){
        slot.innerHTML = '<div class="examples-title">' + title + '</div>' +
          '<div style="font-size:12px;color:var(--muted);">No hay ningún Pokémon conocido con esta combinación.</div>';
        return;
      }

      slot.innerHTML = '<div class="examples-title">' + title + '</div>' +
        '<div class="examples-row">' + examples.map(exampleCardHTML).join('') + '</div>';

      slot.querySelectorAll('.example-card').forEach(function(card){
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', function(){ goToPokemon(card.dataset.name); });
        addKeyboardActivation(card);
      });
    }catch(e){
      slot.innerHTML = '<div class="examples-title">' + title + '</div>' +
        '<div style="font-size:12px;color:var(--muted);">No se pudieron cargar los ejemplos.</div>';
    }
  }

  // addKeyboardActivation() ya está definida en pokemon-view.js (se carga antes que este archivo)

  document.querySelectorAll('.hex').forEach(function(hex){
    hex.addEventListener('click', function(){
      const isComplex = complexView.style.display !== 'none';
      const esType = hex.dataset.type;
      if(isComplex){
        if(comboSelection.length >= 2) comboSelection = [];
        comboSelection.push(esType);
        updateComboSlots();
        if(comboSelection.length === 2){
          runTypeQuery(comboSelection);
        } else {
          document.getElementById('typeResultZone').innerHTML = '';
        }
      } else {
        document.querySelectorAll('.hex').forEach(function(h){ h.classList.remove('selected'); });
        hex.classList.add('selected');
        runTypeQuery([esType]);
      }
    });
    addKeyboardActivation(hex);
  });
