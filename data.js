/* ============================================================
   data.js — Constantes de tipos y datos "semilla" para uso offline
   Aquí es donde se sustituiría la tabla de tipos si se usan datos
   propios en vez de (o además de) PokeAPI.
   ============================================================ */

  const TYPE_LABELS = {
    normal:'Normal', fuego:'Fuego', agua:'Agua', electrico:'Eléctrico', planta:'Planta',
    hielo:'Hielo', lucha:'Lucha', veneno:'Veneno', tierra:'Tierra', volador:'Volador',
    psiquico:'Psíquico', bicho:'Bicho', roca:'Roca', fantasma:'Fantasma', dragon:'Dragón',
    siniestro:'Siniestro', acero:'Acero', hada:'Hada'
  };
  const ES_TO_EN = {
    normal:'normal', fuego:'fire', agua:'water', electrico:'electric', planta:'grass',
    hielo:'ice', lucha:'fighting', veneno:'poison', tierra:'ground', volador:'flying',
    psiquico:'psychic', bicho:'bug', roca:'rock', fantasma:'ghost', dragon:'dragon',
    siniestro:'dark', acero:'steel', hada:'fairy'
  };
  const EN_TO_ES = {};
  Object.keys(ES_TO_EN).forEach(function(k){ EN_TO_ES[ES_TO_EN[k]] = k; });
  const ALL_EN_TYPES = Object.keys(EN_TO_ES);


  // Pre-semilla: relaciones de tipo reales para que la demo funcione incluso sin red
  const SEED_TYPES = {
    electric: { double_from:['ground'], double_to:['water','flying'], half_from:['electric','flying','steel'], half_to:['electric','grass','dragon'], no_from:[], no_to:['ground'] },
    rock:     { double_from:['water','grass','fighting','ground','steel'], double_to:['fire','ice','flying','bug'], half_from:['normal','fire','poison','flying'], half_to:['fighting','ground','steel'], no_from:[], no_to:[] },
    ground:   { double_from:['water','grass','ice'], double_to:['fire','electric','poison','rock','steel'], half_from:['poison','rock'], half_to:['grass','bug'], no_from:['electric'], no_to:['flying'] }
  };
  Object.keys(SEED_TYPES).forEach(function(slug){
    if(!lsGet('td_type_' + slug)) lsSet('td_type_' + slug, SEED_TYPES[slug]);
  });

  // Pre-semilla de Pikachu y Onix (para que el buscador funcione sin conexión la primera vez)
  const SEED_POKEMON = {
    pikachu: { id:25, name:'pikachu', types:['electric'], height:4, weight:60,
      sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      stats:{hp:35, attack:55, defense:40, 'special-attack':50, 'special-defense':50, speed:90} },
    onix: { id:95, name:'onix', types:['rock','ground'], height:88, weight:2100,
      sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/95.png',
      stats:{hp:35, attack:45, defense:160, 'special-attack':30, 'special-defense':45, speed:70} }
  };
  Object.keys(SEED_POKEMON).forEach(function(name){
    if(!lsGet('td_pokemon_' + name)) lsSet('td_pokemon_' + name, SEED_POKEMON[name]);
  });

  // Semilla de cadenas evolutivas (para que funcionen sin conexión la primera vez)
  const SEED_SPECIES = {
    pikachu: { evolutionChainUrl: 'https://pokeapi.co/api/v2/evolution-chain/10/' },
    onix:    { evolutionChainUrl: 'https://pokeapi.co/api/v2/evolution-chain/67/' }
  };
  Object.keys(SEED_SPECIES).forEach(function(name){
    if(!lsGet('td_species_' + name)) lsSet('td_species_' + name, SEED_SPECIES[name]);
  });

  const SEED_EVOCHAINS = {
    '10': { species:{ name:'pichu', url:'https://pokeapi.co/api/v2/pokemon-species/172/' }, evolution_details:[], evolves_to:[
      { species:{ name:'pikachu', url:'https://pokeapi.co/api/v2/pokemon-species/25/' },
        evolution_details:[{ trigger:{name:'level-up'}, min_level:null, min_happiness:220, item:null, held_item:null, time_of_day:'', known_move:null, known_move_type:null, location:null, gender:null }],
        evolves_to:[
          { species:{ name:'raichu', url:'https://pokeapi.co/api/v2/pokemon-species/26/' },
            evolution_details:[{ trigger:{name:'use-item'}, min_level:null, min_happiness:null, item:{name:'thunder-stone'}, held_item:null, time_of_day:'', known_move:null, known_move_type:null, location:null, gender:null }],
            evolves_to:[] }
        ] }
    ] },
    '67': { species:{ name:'onix', url:'https://pokeapi.co/api/v2/pokemon-species/95/' }, evolution_details:[], evolves_to:[
      { species:{ name:'steelix', url:'https://pokeapi.co/api/v2/pokemon-species/208/' },
        evolution_details:[{ trigger:{name:'trade'}, min_level:null, min_happiness:null, item:null, held_item:{name:'metal-coat'}, time_of_day:'', known_move:null, known_move_type:null, location:null, gender:null }],
        evolves_to:[] }
    ] }
  };
  Object.keys(SEED_EVOCHAINS).forEach(function(id){
    if(!lsGet('td_evochain_' + id)) lsSet('td_evochain_' + id, SEED_EVOCHAINS[id]);
  });
