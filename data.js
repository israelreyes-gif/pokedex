/* ============================================================
   data.js — Constantes de tipos y tabla de relaciones de tipo
   completa. Estos datos no cambian nunca, por eso viven aquí en
   vez de pedirse a PokeAPI en cada consulta.
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

  // Tabla completa de relaciones de daño (los 18 tipos). Generada y
  // verificada contra la tabla oficial de tipos de los juegos principales.
  const TYPE_CHART = {
    normal: { double_to:[], half_to:['rock','steel'], no_to:['ghost'], double_from:['fighting'], half_from:[], no_from:['ghost'] },
    fire: { double_to:['grass','ice','bug','steel'], half_to:['fire','water','rock','dragon'], no_to:[], double_from:['water','ground','rock'], half_from:['fire','grass','ice','bug','steel','fairy'], no_from:[] },
    water: { double_to:['fire','ground','rock'], half_to:['water','grass','dragon'], no_to:[], double_from:['electric','grass'], half_from:['fire','water','ice','steel'], no_from:[] },
    electric: { double_to:['water','flying'], half_to:['electric','grass','dragon'], no_to:['ground'], double_from:['ground'], half_from:['electric','flying','steel'], no_from:[] },
    grass: { double_to:['water','ground','rock'], half_to:['fire','grass','poison','flying','bug','dragon','steel'], no_to:[], double_from:['fire','ice','poison','flying','bug'], half_from:['water','electric','grass','ground'], no_from:[] },
    ice: { double_to:['grass','ground','flying','dragon'], half_to:['fire','water','ice','steel'], no_to:[], double_from:['fire','fighting','rock','steel'], half_from:['ice'], no_from:[] },
    fighting: { double_to:['normal','ice','rock','dark','steel'], half_to:['poison','flying','psychic','bug','fairy'], no_to:['ghost'], double_from:['flying','psychic','fairy'], half_from:['bug','rock','dark'], no_from:[] },
    poison: { double_to:['grass','fairy'], half_to:['poison','ground','rock','ghost'], no_to:['steel'], double_from:['ground','psychic'], half_from:['grass','fighting','poison','bug','fairy'], no_from:[] },
    ground: { double_to:['fire','electric','poison','rock','steel'], half_to:['grass','bug'], no_to:['flying'], double_from:['water','grass','ice'], half_from:['poison','rock'], no_from:['electric'] },
    flying: { double_to:['grass','fighting','bug'], half_to:['electric','rock','steel'], no_to:[], double_from:['electric','ice','rock'], half_from:['grass','fighting','bug'], no_from:['ground'] },
    psychic: { double_to:['fighting','poison'], half_to:['psychic','steel'], no_to:['dark'], double_from:['bug','ghost','dark'], half_from:['fighting','psychic'], no_from:[] },
    bug: { double_to:['grass','psychic','dark'], half_to:['fire','fighting','poison','flying','ghost','steel','fairy'], no_to:[], double_from:['fire','flying','rock'], half_from:['grass','fighting','ground'], no_from:[] },
    rock: { double_to:['fire','ice','flying','bug'], half_to:['fighting','ground','steel'], no_to:[], double_from:['water','grass','fighting','ground','steel'], half_from:['normal','fire','poison','flying'], no_from:[] },
    ghost: { double_to:['psychic','ghost'], half_to:['dark'], no_to:['normal'], double_from:['ghost','dark'], half_from:['poison','bug'], no_from:['normal','fighting'] },
    dragon: { double_to:['dragon'], half_to:['steel'], no_to:['fairy'], double_from:['ice','dragon','fairy'], half_from:['fire','water','electric','grass'], no_from:[] },
    dark: { double_to:['psychic','ghost'], half_to:['fighting','dark','fairy'], no_to:[], double_from:['fighting','bug','fairy'], half_from:['ghost','dark'], no_from:['psychic'] },
    steel: { double_to:['ice','rock','fairy'], half_to:['fire','water','electric','steel'], no_to:[], double_from:['fire','fighting','ground'], half_from:['normal','grass','ice','flying','psychic','bug','rock','dragon','steel','fairy'], no_from:['poison'] },
    fairy: { double_to:['fighting','dragon','dark'], half_to:['fire','poison','steel'], no_to:[], double_from:['poison','steel'], half_from:['fighting','bug','dark'], no_from:['dragon'] },
  };
