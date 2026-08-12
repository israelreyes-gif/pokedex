/* ============================================================
   storage.js — Caché local (localStorage) y gestión de favoritos
   ============================================================ */

  /* ---------- almacenamiento local (caché + favoritos) ---------- */
  const memCache = {}; // respaldo en memoria si localStorage no está disponible

  function lsGet(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (memCache[key] || null);
    }catch(e){ return memCache[key] || null; }
  }
  function lsSet(key, value){
    memCache[key] = value;
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* modo privado, etc. */ }
  }


  /* ---------- favoritos ---------- */
  function getFavorites(){ return lsGet('td_favorites') || []; }
  function isFavorite(name){ return getFavorites().indexOf(name) !== -1; }
  function toggleFavorite(name){
    let favs = getFavorites();
    if(favs.indexOf(name) !== -1) favs = favs.filter(function(n){ return n !== name; });
    else favs.push(name);
    lsSet('td_favorites', favs);
    renderFavRow();
  }
