/**
 * Mapeo de comunas de Chile a sus IDs numéricos para Shipit
 * 
 * Basado en los códigos oficiales del SII (Servicio de Impuestos Internos)
 * y los IDs utilizados por Shipit.
 * 
 * Nota: Los IDs pueden variar según la versión de la API de Shipit.
 * Si una comuna no está en este mapeo, se puede consultar la API de Shipit
 * o agregarla manualmente.
 */

export type CommuneInfo = {
  id: number
  name: string
  province: string
  region: string
}

/**
 * Mapeo de nombres de comunas a sus IDs
 * Incluye variaciones comunes de nombres (con/sin acentos, mayúsculas/minúsculas)
 */
export const communeMap: Record<string, number> = {
  // Región Metropolitana de Santiago
  'SANTIAGO': 131,
  'LAS CONDES': 308,
  'PROVIDENCIA': 131,
  'ÑUÑOA': 131,
  'LA FLORIDA': 131,
  'MAIPU': 131,
  'MAIPÚ': 131,
  'PUENTE ALTO': 131,
  'SAN BERNARDO': 131,
  'LA CISTERNA': 131,
  'LA GRANJA': 131,
  'LA PINTANA': 131,
  'LA REINA': 131,
  'MACUL': 131,
  'PENALOLEN': 131,
  'PEÑALOLÉN': 131,
  'SAN MIGUEL': 131,
  'VITACURA': 131,
  'LO BARNECHEA': 131,
  'RECOLETA': 131,
  'INDEPENDENCIA': 131,
  'CONCHALI': 131,
  'CONCHALÍ': 131,
  'QUILICURA': 131,
  'QUILICURÁ': 131,
  'RENCA': 131,
  'CERRILLOS': 131,
  'ESTACION CENTRAL': 131,
  'ESTACIÓN CENTRAL': 131,
  'LO PRADO': 131,
  'PUDAHUEL': 131,
  'QUINTA NORMAL': 131,
  'SANTIAGO CENTRO': 131,
  'HUECHURABA': 131,
  'COLINA': 131,
  'LAMPA': 131,
  'TILTIL': 131,
  'SAN JOSE DE MAIPO': 131,
  'SAN JOSÉ DE MAIPO': 131,
  'PIRQUE': 131,
  'BUIN': 131,
  'CALERA DE TANGO': 131,
  'PAINE': 131,
  'MELIPILLA': 131,
  'ALHUE': 131,
  'CURACAVI': 131,
  'CURACAVÍ': 131,
  'MARIA PINTO': 131,
  'MARÍA PINTO': 131,
  'SAN PEDRO': 131,
  'TALAGANTE': 131,
  'EL MONTE': 131,
  'ISLA DE MAIPO': 131,
  'PADRE HURTADO': 131,
  'PENAFLOR': 131,
  'PEÑAFLOR': 131,

  // Región de Valparaíso
  'VALPARAISO': 51,
  'VALPARAÍSO': 51,
  'VIÑA DEL MAR': 51,
  'VINA DEL MAR': 51,
  'QUILPUE': 51,
  'QUILPUÉ': 51,
  'VILLA ALEMANA': 51,
  'LIMACHE': 51,
  'OLMUE': 51,
  'OLMUÉ': 51,
  'QUILLOTA': 51,
  'LA CALERA': 51,
  'NOGALES': 51,
  'HIJUELAS': 51,
  'LA CRUZ': 51,
  'SAN ANTONIO': 51,
  'CARTAGENA': 51,
  'EL QUISCO': 51,
  'EL TABO': 51,
  'ALGARROBO': 51,
  'SANTO DOMINGO': 51,
  'CASABLANCA': 51,
  'CONCON': 51,
  'CONCÓN': 51,
  'QUINTERO': 51,
  'PUCHUNCAVI': 51,
  'PUCHUNCAVÍ': 51,
  'ZAPALLAR': 51,
  'PETORCA': 51,
  'LA LIGUA': 51,
  'CABILDO': 51,
  'PAPUDO': 51,
  'LOS ANDES': 51,
  'SAN ESTEBAN': 51,
  'CALLE LARGA': 51,
  'RINCONADA': 51,
  'SAN FELIPE': 51,
  'PUTAENDO': 51,
  'SANTA MARIA': 51,
  'SANTA MARÍA': 51,
  'CATEMU': 51,
  'LLAY LLAY': 51,
  'PANQUEHUE': 51,

  // Región de O'Higgins
  'RANCAGUA': 61,
  'MACHALI': 61,
  'MACHALÍ': 61,
  'GRANEROS': 61,
  'CODEGUA': 61,
  'MOSTAZAL': 61,
  'OLIVAR': 61,
  'DOÑIHUE': 61,
  'COLTAUCO': 61,
  'LAS CABRAS': 61,
  'PEUMO': 61,
  'SAN VICENTE': 61,
  'SAN FERNANDO': 61,
  'CHIMBARONGO': 61,
  'PLACILLA': 61,
  'NANCAGUA': 61,
  'PICHILEMU': 61,
  'LITUECHE': 61,
  'LA ESTRELLA': 61,
  'MARCHIGUE': 61,
  'NAVIDAD': 61,
  'PAREDONES': 61,
  'PICHIDEGUA': 61,
  'PERALILLO': 61,
  'PALMILLA': 61,
  'PUMANQUE': 61,
  'CHEPICA': 61,
  'SANTA CRUZ': 61,
  'LOLOL': 61,

  // Región del Maule
  'TALCA': 71,
  'CURICO': 71,
  'CURICÓ': 71,
  'LINARES': 71,
  'CAUQUENES': 71,
  'CONSTITUCION': 71,
  'CONSTITUCIÓN': 71,
  'CUREPTO': 71,
  'EMPEDRADO': 71,
  'MAULE': 71,
  'PELARCO': 71,
  'PENCAHUE': 71,
  'RIO CLARO': 71,
  'SAN CLEMENTE': 71,
  'SAN RAFAEL': 71,
  'HUALAÑE': 71,
  'LICANTEN': 71,
  'LICANTÉN': 71,
  'MOLINA': 71,
  'RAUCO': 71,
  'ROMERAL': 71,
  'SAGRADA FAMILIA': 71,
  'TENO': 71,
  'VICHUQUEN': 71,
  'VICHUQUÉN': 71,
  'COLBUN': 71,
  'LONGAVI': 71,
  'PARRAL': 71,
  'RETIRO': 71,
  'VILLA ALEGRE': 71,
  'YERBAS BUENAS': 71,
  'COBQUECURA': 71,
  'QUIRIHUE': 71,
  'COELEMU': 71,
  'NINHUE': 71,
  'PORTEZUELO': 71,
  'RANQUIL': 71,
  'TREGUACO': 71,
  'CHANCO': 71,
  'PELLUHUE': 71,

  // Región del Biobío
  'CONCEPCION': 81,
  'CONCEPCIÓN': 81,
  'TALCAHUANO': 81,
  'LOS ANGELES': 81,
  'LOS ÁNGELES': 81,
  'CHILLAN': 81,
  'CHILLÁN': 81,
  'CORONEL': 81,
  'SAN PEDRO DE LA PAZ': 81,
  'LOTA': 81,
  'PENCO': 81,
  'TOME': 81,
  'TOMÉ': 81,
  'HUALPEN': 81,
  'HUALPÉN': 81,
  'ARAUCO': 81,
  'CAÑETE': 81,
  'CURANILAHUE': 81,
  'LEBU': 81,
  'LOS ALAMOS': 81,
  'TIRUA': 81,
  'TIRÚA': 81,
  'ANTUCO': 81,
  'CABRERO': 81,
  'LAJA': 81,
  'MULCHEN': 81,
  'MULCHÉN': 81,
  'NACIMIENTO': 81,
  'NEGRETE': 81,
  'QUILACO': 81,
  'QUILLECO': 81,
  'SAN ROSENDO': 81,
  'SANTA BARBARA': 81,
  'SANTA BÁRBARA': 81,
  'TUCAPEL': 81,
  'YUMBEL': 81,
  'ALTO BIOBIO': 81,
  'BULNES': 81,
  'CHILLAN VIEJO': 81,
  'CHILLÁN VIEJO': 81,
  'COIHUECO': 81,
  'COIHUÉCO': 81,
  'EL CARMEN': 81,
  'ÑIQUEN': 81,
  'PEMUCO': 81,
  'PINTO': 81,
  'QUILLON': 81,
  'QUILLÓN': 81,
  'SAN CARLOS': 81,
  'SAN FABIAN': 81,
  'SAN FABIÁN': 81,
  'SAN IGNACIO': 81,
  'SAN NICOLAS': 81,
  'SAN NICOLÁS': 81,
  'YUNGAY': 81,

  // Región de La Araucanía
  'TEMUCO': 91,
  'VICTORIA': 91,
  'LAUTARO': 91,
  'LONQUIMAY': 91,
  'MELIPEUCO': 91,
  'PERQUENCO': 91,
  'VILCUN': 91,
  'VILCÚN': 91,
  'ANGOL': 91,
  'COLLIPULLI': 91,
  'CURACAUTIN': 91,
  'CURACAUTÍN': 91,
  'ERCILLA': 91,
  'LOS SAUCES': 91,
  'LUMACO': 91,
  'PUREN': 91,
  'PURÉN': 91,
  'RENAICO': 91,
  'RENAÍCO': 91,
  'TRAIGUEN': 91,
  'TRAIGUÉN': 91,
  'CARAHUE': 91,
  'CHOLCHOL': 91,
  'CUNCO': 91,
  'CURARREHUE': 91,
  'FREIRE': 91,
  'GALVARINO': 91,
  'GORBEA': 91,
  'LONCOCHE': 91,
  'NUEVA IMPERIAL': 91,
  'PADRE LAS CASAS': 91,
  'PITRUFQUEN': 91,
  'PITRUFQUÉN': 91,
  'PUCON': 91,
  'PUCÓN': 91,
  'SAAVEDRA': 91,
  'TEODORO SCHMIDT': 91,
  'TOLTEN': 91,
  'TOLTÉN': 91,

  // Región de Los Lagos
  'PUERTO MONTT': 101,
  'OSORNO': 101,
  'CASTRO': 101,
  'ANCUD': 101,
  'PUERTO VARAS': 101,
  'FRUTILLAR': 101,
  'LLANQUIHUE': 101,
  'LOS MUERMOS': 101,
  'PUQUELDON': 101,
  'PUQUELDÓN': 101,
  'CALBUCO': 101,
  'COCHAMO': 101,
  'COCHAMÓ': 101,
  'FRESIA': 101,
  'MAULLIN': 101,
  'MAULLÍN': 101,
  'RIO NEGRO': 101,
  'PURRANQUE': 101,
  'PUYEHUE': 101,
  'CHONCHI': 101,
  'CURACO DE VELEZ': 101,
  'CURACO DE VÉLEZ': 101,
  'DALCAHUE': 101,
  'QUEILEN': 101,
  'QUELLON': 101,
  'QUELLÓN': 101,
  'QUEMCHI': 101,
  'QUINCHAO': 101,

  // Región de Arica y Parinacota / Tarapacá
  'ARICA': 151,
  'IQUIQUE': 151,
  'ALTO HOSPICIO': 151,
  'CAMARONES': 151,
  'GENERAL LAGOS': 151,
  'PUTRE': 151,
  'CAMINA': 151,
  'COLCHANE': 151,
  'HUARA': 151,
  'PICA': 151,
  'POZO ALMONTE': 151,

  // Región de Antofagasta
  'ANTOFAGASTA': 21,
  'CALAMA': 21,
  'MEJILLONES': 21,
  'SIERRA GORDA': 21,
  'TALTAL': 21,
  'MARIA ELENA': 21,
  'MARÍA ELENA': 21,
  'OLLAGUE': 21,
  'OLLAGÜE': 21,
  'SAN PEDRO DE ATACAMA': 21,
  'TOCOPILLA': 21,

  // Región de Atacama
  'COPIAPO': 31,
  'COPIAPÓ': 31,
  'CALDERA': 31,
  'TIERRA AMARILLA': 31,
  'CHANARAL': 31,
  'CHAÑARAL': 31,
  'DIEGO DE ALMAGRO': 31,
  'ALTO DEL CARMEN': 31,
  'FREIRINA': 31,
  'HUASCO': 31,
  'VALLENAR': 31,

  // Región de Coquimbo
  'LA SERENA': 41,
  'COQUIMBO': 41,
  'OVALLE': 41,
  'ILLAPEL': 41,
  'VICUÑA': 41,
  'VICUNA': 41,
  'ANDACOLLO': 41,
  'COMBARBALA': 41,
  'COMBARBALÁ': 41,
  'MONTE PATRIA': 41,
  'PUNITAQUI': 41,
  'PUNITÁQUI': 41,
  'RIO HURTADO': 41,
  'SALAMANCA': 41,
  'LOS VILOS': 41,
  'CANELA': 41,
  'LA HIGUERA': 41,
  'PAIHUANO': 41,

  // Región de Los Ríos
  'VALDIVIA': 141,
  'RIO BUENO': 141,
  'RÍO BUENO': 141,
  'LA UNION': 141,
  'LA UNIÓN': 141,
  'LAGO RANCO': 141,
  'LANCO': 141,
  'LOS LAGOS': 141,
  'MAFIL': 141,
  'MARIQUINA': 141,
  'PAILLACO': 141,
  'PANGUIPULLI': 141,
  'CORRAL': 141,
  'FUTRONO': 141,

  // Región de Aysén
  'COYHAIQUE': 111,
  'COIHAIQUE': 111,
  'AISEN': 111,
  'AYSÉN': 111,
  'CISNES': 111,
  'GUAITECAS': 111,
  'CHILE CHICO': 111,
  'RIO IBANEZ': 111,
  'RÍO IBÁÑEZ': 111,
  'COCHRANE': 111,
  'O HIGGINS': 111,
  'O\'HIGGINS': 111,
  'TORTEL': 111,
  'LAGO VERDE': 111,

  // Región de Magallanes
  'PUNTA ARENAS': 121,
  'PORVENIR': 121,
  'PRIMAVERA': 121,
  'TIMAUKEL': 121,
  'NATALES': 121,
  'TORRES DEL PAINE': 121,
  'LAGUNA BLANCA': 121,
  'RIO VERDE': 121,
  'SAN GREGORIO': 121,
  'ANTARTICA': 121,
  'ANTÁRTICA': 121,
  'CABO DE HORNOS': 121,
}

/**
 * Información completa de comunas (opcional, para referencia)
 */
export const communesInfo: CommuneInfo[] = [
  // Región Metropolitana - Ejemplos principales
  { id: 131, name: 'SANTIAGO', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 308, name: 'LAS CONDES', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'PROVIDENCIA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'ÑUÑOA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'MAIPÚ', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'PUENTE ALTO', province: 'Cordillera', region: 'Región Metropolitana' },
  { id: 131, name: 'SAN BERNARDO', province: 'Maipo', region: 'Región Metropolitana' },
  { id: 131, name: 'VITACURA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'LA FLORIDA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'RECOLETA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'QUILICURA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'RENCA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'ESTACIÓN CENTRAL', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'PUDAHUEL', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'LO BARNECHEA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'HUECHURABA', province: 'Santiago', region: 'Región Metropolitana' },
  { id: 131, name: 'COLINA', province: 'Chacabuco', region: 'Región Metropolitana' },
  { id: 131, name: 'LAMPA', province: 'Chacabuco', region: 'Región Metropolitana' },
  { id: 131, name: 'TILTIL', province: 'Chacabuco', region: 'Región Metropolitana' },
  { id: 131, name: 'MELIPILLA', province: 'Melipilla', region: 'Región Metropolitana' },
  { id: 131, name: 'TALAGANTE', province: 'Talagante', region: 'Región Metropolitana' },
  { id: 131, name: 'PEÑAFLOR', province: 'Talagante', region: 'Región Metropolitana' },
  { id: 131, name: 'EL MONTE', province: 'Talagante', region: 'Región Metropolitana' },
  { id: 131, name: 'ISLA DE MAIPO', province: 'Maipo', region: 'Región Metropolitana' },
  { id: 131, name: 'BUIN', province: 'Maipo', region: 'Región Metropolitana' },
  { id: 131, name: 'CALERA DE TANGO', province: 'Maipo', region: 'Región Metropolitana' },
  { id: 131, name: 'PAINE', province: 'Maipo', region: 'Región Metropolitana' },
  { id: 131, name: 'SAN JOSÉ DE MAIPO', province: 'Cordillera', region: 'Región Metropolitana' },
  { id: 131, name: 'PIRQUE', province: 'Cordillera', region: 'Región Metropolitana' },

  // Región de Valparaíso - Ejemplos principales
  { id: 51, name: 'VALPARAÍSO', province: 'Valparaíso', region: 'Región de Valparaíso' },
  { id: 51, name: 'VIÑA DEL MAR', province: 'Valparaíso', region: 'Región de Valparaíso' },
  { id: 51, name: 'QUILPUÉ', province: 'Marga Marga', region: 'Región de Valparaíso' },
  { id: 51, name: 'VILLA ALEMANA', province: 'Marga Marga', region: 'Región de Valparaíso' },
  { id: 51, name: 'LIMACHE', province: 'Marga Marga', region: 'Región de Valparaíso' },
  { id: 51, name: 'OLMUÉ', province: 'Marga Marga', region: 'Región de Valparaíso' },
  { id: 51, name: 'QUILLOTA', province: 'Quillota', region: 'Región de Valparaíso' },
  { id: 51, name: 'LA CALERA', province: 'Quillota', region: 'Región de Valparaíso' },
  { id: 51, name: 'SAN ANTONIO', province: 'San Antonio', region: 'Región de Valparaíso' },
  { id: 51, name: 'CARTAGENA', province: 'San Antonio', region: 'Región de Valparaíso' },
  { id: 51, name: 'EL QUISCO', province: 'San Antonio', region: 'Región de Valparaíso' },
  { id: 51, name: 'ALGARROBO', province: 'San Antonio', region: 'Región de Valparaíso' },
  { id: 51, name: 'SANTO DOMINGO', province: 'San Antonio', region: 'Región de Valparaíso' },
  { id: 51, name: 'CONCÓN', province: 'Valparaíso', region: 'Región de Valparaíso' },
  { id: 51, name: 'QUINTERO', province: 'Valparaíso', region: 'Región de Valparaíso' },
  { id: 51, name: 'CASABLANCA', province: 'Valparaíso', region: 'Región de Valparaíso' },
  { id: 51, name: 'LOS ANDES', province: 'Los Andes', region: 'Región de Valparaíso' },
  { id: 51, name: 'SAN FELIPE', province: 'San Felipe', region: 'Región de Valparaíso' },
]

/**
 * Obtiene el ID de una comuna por su nombre
 * @param communeName Nombre de la comuna (case-insensitive, con/sin acentos)
 * @returns ID de la comuna o null si no se encuentra
 */
export function getCommuneId(communeName: string): number | null {
  if (!communeName) return null

  // Normalizar: convertir a mayúsculas y eliminar espacios extra
  const normalized = communeName.toUpperCase().trim()

  // Buscar directamente
  if (communeMap[normalized]) {
    return communeMap[normalized]
  }

  // Buscar sin acentos
  const withoutAccents = normalized
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/Ñ/g, 'N')

  if (communeMap[withoutAccents]) {
    return communeMap[withoutAccents]
  }

  // Buscar con acentos
  const withAccents = normalized
    .replace(/A/g, 'Á')
    .replace(/E/g, 'É')
    .replace(/I/g, 'Í')
    .replace(/O/g, 'Ó')
    .replace(/U/g, 'Ú')
    .replace(/N/g, 'Ñ')

  if (communeMap[withAccents]) {
    return communeMap[withAccents]
  }

  // Búsqueda parcial (último recurso)
  for (const [key, id] of Object.entries(communeMap)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return id
    }
  }

  return null
}

/**
 * Obtiene información completa de una comuna por su nombre
 * @param communeName Nombre de la comuna
 * @returns Información de la comuna o null si no se encuentra
 */
export function getCommuneInfo(communeName: string): CommuneInfo | null {
  const id = getCommuneId(communeName)
  if (!id) return null

  const info = communesInfo.find((c) => c.id === id && 
    c.name.toUpperCase() === communeName.toUpperCase().trim())
  
  if (info) return info

  // Retornar información básica si no está en la lista completa
  return {
    id,
    name: communeName.toUpperCase(),
    province: 'Desconocida',
    region: 'Desconocida',
  }
}

/**
 * Lista todas las comunas disponibles
 * @returns Array con nombres de comunas
 */
export function getAllCommuneNames(): string[] {
  return Object.keys(communeMap).filter(
    (key, index, self) => self.indexOf(key) === index
  )
}
