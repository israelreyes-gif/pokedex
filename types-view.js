/* ============================================================
   types-view.js — Modo "Por Tipo": panal de hexágonos, combinador
   Simple/Complejo, y el interruptor Por Pokémon / Por Tipo
   ============================================================ */

  /* ---------- Toggle: Por Pokémon / Por Tipo ---------- */
  const modeToggle = document.getElementById('modeToggle');
  const viewPokemon = document.getElementById('view-pokemon');
  const viewTipo = document.getElementById('view-tipo');
  modeToggle.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      modeToggle.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      if(mode === 'tipo'){
        modeToggle.classList.add('state-2');
        viewPokemon.style.display = 'none'; viewTipo.style.display = 'block';
      } else {
        modeToggle.classList.remove('state-2');
        viewPokemon.style.display = 'block'; viewTipo.style.display = 'none';
      }
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
        document.querySelector('.hex[data-type="electrico"]').classList.add('selected');
        runTypeQuery(['electrico']);
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

  async function runTypeQuery(esTypes){
    const zone = document.getElementById('typeResultZone');
    zone.innerHTML = loadingHTML();
    try{
      const rels = [];
      for(const es of esTypes){ const r = await getTypeRelations(ES_TO_EN[es]); rels.push(r.rel); }
      const matchup = computeMatchup(rels);
      const chipsHTML = esTypes.map(function(es, i){
        return (i > 0 ? '<span class="vs">+</span>' : '') + '<span class="chip t-' + es + '">' + TYPE_LABELS[es] + '</span>';
      }).join('');
      zone.innerHTML =
        '<div class="result"><div class="result-head">' + chipsHTML +
        '<span class="vs" style="margin-left:auto;">datos en vivo</span></div>' +
        '<div class="result-body">' + renderMatchupBlock(matchup, '').replace('<div class="matchup-block">','<div>').replace(/<\/div>$/,'</div>') +
        '</div></div>';
    }catch(e){
      zone.innerHTML = errorHTML(esTypes.map(function(es){return TYPE_LABELS[es];}).join(' / '));
    }
  }

  document.querySelectorAll('.hex').forEach(function(hex){
    hex.addEventListener('click', function(){
      const isComplex = complexView.style.display !== 'none';
      const esType = hex.dataset.type;
      if(isComplex){
        if(comboSelection.length >= 2) comboSelection = [];
        comboSelection.push(esType);
        updateComboSlots();
        if(comboSelection.length === 2) runTypeQuery(comboSelection);
      } else {
        document.querySelectorAll('.hex').forEach(function(h){ h.classList.remove('selected'); });
        hex.classList.add('selected');
        runTypeQuery([esType]);
      }
    });
  });

  // Carga inicial del panel "Por Tipo" con Eléctrico ya seleccionado
  runTypeQuery(['electrico']);
