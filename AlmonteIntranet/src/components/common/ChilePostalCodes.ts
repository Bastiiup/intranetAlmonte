/**
 * Mapeo de Códigos Postales por Región y Comuna en Chile
 * Basado en códigos postales oficiales de Correos de Chile
 * 
 * Nota: Algunos códigos postales pueden variar dentro de una comuna.
 * Este mapeo usa códigos postales base comunes para cada comuna.
 */

export const CHILE_POSTAL_CODES: Record<string, Record<string, string>> = {
  // Región Metropolitana (13)
  '13': {
    'Santiago': '8320000',
    'Las Condes': '7550000',
    'Providencia': '7500000',
    'Ñuñoa': '7750000',
    'La Florida': '8240000',
    'Maipú': '9250000',
    'Puente Alto': '8150000',
    'San Bernardo': '8050000',
    'La Cisterna': '7970000',
    'La Granja': '8780000',
    'La Pintana': '8820000',
    'La Reina': '7850000',
    'Macul': '7810000',
    'Peñalolén': '7910000',
    'San Miguel': '8900000',
    'Vitacura': '7630000',
    'Lo Barnechea': '7690000',
    'Recoleta': '8420000',
    'Independencia': '8380000',
    'Conchalí': '8580000',
    'Quilicura': '8700000',
    'Renca': '8640000',
    'Cerrillos': '9200000',
    'Estación Central': '9170000',
    'Lo Prado': '8980000',
    'Pudahuel': '9100000',
    'Quinta Normal': '8500000',
    'Huechuraba': '8580000',
    'Colina': '9340000',
    'Lampa': '9380000',
    'Tiltil': '9420000',
    'San José de Maipo': '9460000',
    'Pirque': '9480000',
    'Buin': '9500000',
    'Calera de Tango': '9560000',
    'Paine': '9540000',
    'Melipilla': '9580000',
    'Alhué': '9620000',
    'Curacaví': '9640000',
    'María Pinto': '9660000',
    'San Pedro': '9680000',
    'Talagante': '9670000',
    'El Monte': '9690000',
    'Isla de Maipo': '9710000',
    'Padre Hurtado': '9700000',
    'Peñaflor': '9730000',
  },
  // Región de Valparaíso (05)
  '05': {
    'Valparaíso': '2340000',
    'Viña del Mar': '2520000',
    'Quilpué': '2430000',
    'Villa Alemana': '2530000',
    'Limache': '2240000',
    'Olmué': '2320000',
    'Quillota': '2260000',
    'La Calera': '2270000',
    'Nogales': '2280000',
    'Hijuelas': '2290000',
    'La Cruz': '2300000',
    'San Antonio': '2690000',
    'Cartagena': '2680000',
    'El Quisco': '2700000',
    'El Tabo': '2690000',
    'Algarrobo': '2710000',
    'Santo Domingo': '2720000',
    'Casablanca': '2480000',
    'Concón': '2510000',
    'Quintero': '2490000',
    'Puchuncaví': '2500000',
    'Zapallar': '2730000',
  },
  // Región del Libertador General Bernardo O'Higgins (06)
  '06': {
    'Rancagua': '2820000',
    'San Fernando': '3070000',
    'Rengo': '2940000',
    'Machalí': '2920000',
    'Graneros': '2880000',
    'Codegua': '2890000',
    'Mostazal': '2870000',
    'Doñihue': '2910000',
    'Peumo': '2970000',
    'Olivar': '2990000',
    'Pichidegua': '3040000',
    'Las Cabras': '3010000',
    'Malloa': '2960000',
    'Quinta de Tilcoco': '2980000',
    'Coltauco': '3000000',
    'Coinco': '2950000',
    'Pichilemu': '3220000',
    'Chépica': '3080000',
    'Chimbarongo': '3090000',
    'Lolol': '3110000',
    'Nancagua': '3100000',
    'Palmilla': '3140000',
    'Peralillo': '3150000',
    'Placilla': '3040000',
    'Pumanque': '3160000',
    'Santa Cruz': '3130000',
    'Paredones': '3170000',
  },
  // Región del Maule (07)
  '07': {
    'Talca': '3460000',
    'Curicó': '3340000',
    'Linares': '3580000',
    'Molina': '8380000',
    'Constitución': '3560000',
    'Cauquenes': '3690000',
    'Parral': '3620000',
  },
  // Región de Los Lagos (10)
  '10': {
    'Puerto Montt': '5480000',
    'Osorno': '5290000',
    'Castro': '5700000',
    'Puerto Varas': '5550000',
    'Ancud': '5710000',
    'Calbuco': '5570000',
    'Chonchi': '5740000',
    'Cochamó': '5500000',
    'Frutillar': '5620000',
    'Llanquihue': '5610000',
    'Maullín': '5580000',
  },
  // Región de Los Ríos (14)
  '14': {
    'Valdivia': '5090000',
    'La Unión': '5230000',
    'Panguipulli': '5210000',
    'Río Bueno': '5240000',
    'Paillaco': '5140000',
    'Lanco': '5160000',
    'Futrono': '5200000',
    'Máfil': '5150000',
    'Corral': '5180000',
  },
  // Región de Biobío (08)
  '08': {
    'Concepción': '4030000',
    'Talcahuano': '4270000',
    'Los Ángeles': '4440000',
    'Coronel': '4190000',
    'Chiguayante': '4100000',
    'San Pedro de la Paz': '4130000',
    'Lota': '4210000',
    'Penco': '4250000',
    'Tomé': '4260000',
    'Hualpén': '4600000',
    'Hualqui': '4870000',
    'Lebu': '4350000',
  },
  // Región de la Araucanía (09)
  '09': {
    'Temuco': '4780000',
    'Villarrica': '4930000',
    'Pucón': '4920000',
    'Angol': '4650000',
    'Lautaro': '4860000',
    'Victoria': '4710000',
    'Traiguén': '4750000',
    'Collipulli': '4700000',
  },
  // Región de Coquimbo (04)
  '04': {
    'La Serena': '1700000',
    'Coquimbo': '1780000',
    'Ovalle': '1840000',
    'Illapel': '1910000',
    'Vicuña': '1760000',
    'Andacollo': '1750000',
    'Combarbalá': '1880000',
    'Monte Patria': '1880000',
  },
  // Región de Antofagasta (02)
  '02': {
    'Antofagasta': '1240000',
    'Calama': '1390000',
    'Tocopilla': '1340000',
    'Mejillones': '1310000',
    'Taltal': '1380000',
    'San Pedro de Atacama': '1410000',
  },
  // Región de Atacama (03)
  '03': {
    'Copiapó': '1530000',
    'Vallenar': '1610000',
    'Caldera': '1570000',
    'Chañaral': '1490000',
    'Huasco': '1630000',
    'Tierra Amarilla': '1550000',
  },
  // Región de Tarapacá (01)
  '01': {
    'Iquique': '1100000',
    'Alto Hospicio': '1120000',
    'Pica': '1170000',
    'Pozo Almonte': '1150000',
  },
  // Región de Arica y Parinacota (15)
  '15': {
    'Arica': '1000000',
    'Putre': '1030000',
  },
  // Región de Aysén (11)
  '11': {
    'Coihaique': '5950000',
    'Puerto Aysén': '5950000',
    'Chile Chico': '6050000',
    'Cochrane': '6100000',
  },
  // Región de Magallanes (12)
  '12': {
    'Punta Arenas': '6200000',
    'Puerto Natales': '6160000',
    'Porvenir': '6310000',
  },
  // Ñuble (16)
  '16': {
    'Chillán': '3780000',
    'Chillán Viejo': '3820000',
    'Bulnes': '3900000',
    'Chillán': '3780000',
  },
}

/**
 * Obtiene el código postal base para una región y comuna
 */
export function getPostalCode(regionId: string, comunaName: string): string | null {
  if (!regionId || !comunaName) return null
  
  const regionCodes = CHILE_POSTAL_CODES[regionId]
  if (!regionCodes) return null
  
  // Buscar comuna (case-insensitive)
  const comunaKey = Object.keys(regionCodes).find(
    key => key.toLowerCase() === comunaName.toLowerCase()
  )
  
  if (comunaKey) {
    return regionCodes[comunaKey]
  }
  
  return null
}

