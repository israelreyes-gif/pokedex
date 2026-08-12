/* ============================================================
   search-autocomplete.js — Índice de nombres de Pokémon (con
   refresco por recuento), sugerencias del buscador, y el
   cableado del propio campo de búsqueda
   ============================================================ */

  /* ---------- autocompletado ---------- */
  let pokemonIndexPromise = null;

  async function fetchFreshPokemonIndex(){
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000');
    if(!res.ok) throw { kind: 'server', status: res.status };
    const json = await res.json();
    const list = json.results.map(function(r){ return { name: r.name, id: extractIdFromUrl(r.url) }; });
    lsSet('td_pokemon_index', list);
    lsSet('td_pokemon_count', json.count);
    return list;
  }

  // Petición mínima (limit=1) solo para leer el total "count" que devuelve
  // PokeAPI en cualquier respuesta paginada, sin descargar la lista entera.
  async function fetchRemotePokemonCount(){
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1');
    if(!res.ok) throw { kind: 'server', status: res.status };
    const json = await res.json();
    return json.count;
  }

  // Usa el índice guardado al instante si existe. Cada vez que se abre la app,
  // comprueba en segundo plano (con una petición diminuta) si el número total
  // de Pokémon en PokeAPI ha cambiado desde la última descarga. Si sigue
  // siendo el mismo, no se vuelve a descargar nada; si ha aumentado (nueva
  // generación), se refresca la lista completa una sola vez.
  async function ensurePokemonIndex(){
    const cached = lsGet('td_pokemon_index');
    const cachedCount = lsGet('td_pokemon_count');

    if(cached && cached.length){
      if(!pokemonIndexPromise){
        pokemonIndexPromise = fetchRemotePokemonCount()
          .then(function(remoteCount){
            if(remoteCount !== cachedCount) return fetchFreshPokemonIndex();
            return cached;
          })
          .catch(function(){ return cached; });
      }
      return cached;
    }

    if(pokemonIndexPromise) return pokemonIndexPromise;
    pokemonIndexPromise = fetchFreshPokemonIndex().catch(function(){ return cached || []; });
    return pokemonIndexPromise;
  }

  function hideSuggestions(){
    const box = document.getElementById('pokeSuggestions');
    box.style.display = 'none';
    box.innerHTML = '';
  }

  async function updateSuggestions(rawQuery){
    const box = document.getElementById('pokeSuggestions');
    const q = rawQuery.trim().toLowerCase();
    if(!q || q.startsWith('#')){ hideSuggestions(); return; }

    const list = await ensurePokemonIndex();
    if(!list.length){ hideSuggestions(); return; }

    // primero los que empiezan por lo escrito, luego los que lo contienen en cualquier parte
    const starts = list.filter(function(p){ return p.name.indexOf(q) === 0; });
    const contains = list.filter(function(p){ return p.name.indexOf(q) > 0; });
    const matches = starts.concat(contains).slice(0, 6);
    if(!matches.length){ hideSuggestions(); return; }

    box.innerHTML = matches.map(function(p){
      return '<div class="suggestion-item" data-name="' + p.name + '">' +
        '<span class="sid">#' + String(p.id).padStart(3, '0') + '</span>' +
        '<span class="sname">' + p.name + '</span></div>';
    }).join('');
    box.style.display = 'block';

    box.querySelectorAll('.suggestion-item').forEach(function(item){
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('mousedown', function(e){ e.preventDefault(); }); // evita perder el foco antes del click
      item.addEventListener('click', function(){
        document.getElementById('pokeSearchInput').value = item.dataset.name;
        hideSuggestions();
        doPokemonSearch();
      });
      addKeyboardActivation(item);
    });
  }

  const searchInputEl = document.getElementById('pokeSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  function updateClearBtn(){
    clearSearchBtn.style.display = searchInputEl.value ? 'block' : 'none';
  }

  searchInputEl.addEventListener('input', function(){
    updateClearBtn();
    updateSuggestions(this.value);
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(doPokemonSearch, 350);
  });

  searchInputEl.addEventListener('blur', function(){
    setTimeout(hideSuggestions, 120); // deja tiempo al click de una sugerencia
  });

  searchInputEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ hideSuggestions(); doPokemonSearch(); }
  });

  clearSearchBtn.addEventListener('click', function(){
    searchInputEl.value = '';
    updateClearBtn();
    hideSuggestions();
    document.getElementById('pokeResultZone').innerHTML = '';
    searchInputEl.focus();
  });

  ensurePokemonIndex(); // precarga en segundo plano para que el primer tecleo ya tenga sugerencias
