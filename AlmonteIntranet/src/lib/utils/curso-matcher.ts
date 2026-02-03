/**
 * Utilidades para reconocimiento automático de cursos desde nombres de archivos PDF
 */

export interface CursoMatch {
  nivel: 'Basica' | 'Media'
  grado: number
  paralelo?: string
  año?: number
  confidence: number // 0-100
  razonamiento: string
}

/**
 * Extrae información del curso desde el nombre de un archivo PDF
 * Soporta múltiples formatos:
 * - "1° Básico A" → {nivel: 'Basica', grado: 1, paralelo: 'A'}
 * - "4 medio" → {nivel: 'Media', grado: 4}
 * - "II basico" → {nivel: 'Basica', grado: 2}
 * - "segundo basico" → {nivel: 'Basica', grado: 2}
 * - "Matemáticas - 3° Medio B - 2026" → {nivel: 'Media', grado: 3, paralelo: 'B', año: 2026}
 */
export function extraerInfoCurso(nombreArchivo: string): CursoMatch | null {
  // Limpiar nombre del archivo (quitar .pdf y normalizar)
  let nombre = nombreArchivo.replace(/\.pdf$/i, '').trim()
  
  console.log('[Curso Matcher] Analizando:', nombre)
  
  // Normalizar texto (quitar acentos, minúsculas)
  const normalizar = (texto: string) => 
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .trim()
  
  const nombreNorm = normalizar(nombre)
  
  // PASO 1: Detectar nivel (Básico/Medio)
  let nivel: 'Basica' | 'Media' | null = null
  
  if (/\b(basico|basica|basic)\b/.test(nombreNorm)) {
    nivel = 'Basica'
  } else if (/\b(medio|media|secundario|secundaria)\b/.test(nombreNorm)) {
    nivel = 'Media'
  }
  
  // PASO 2: Detectar grado (1-8 para básico, 1-4 para medio)
  let grado: number | null = null
  let metodoDeteccion = ''
  
  // Método 1: Números romanos (I, II, III, IV, V, VI, VII, VIII)
  const romanosMap: Record<string, number> = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4,
    'v': 5, 'vi': 6, 'vii': 7, 'viii': 8,
    'ix': 9, 'x': 10, 'xi': 11, 'xii': 12
  }
  
  const matchRomano = nombreNorm.match(/\b([ivxl]+)\s*(°|º|o|do|da)?\s*(basico|basica|medio|media)\b/i)
  if (matchRomano && romanosMap[matchRomano[1]]) {
    grado = romanosMap[matchRomano[1]]
    metodoDeteccion = 'Números romanos'
  }
  
  // Método 2: Números escritos (primero, segundo, tercero, etc.)
  if (!grado) {
    const numerosEscritos: Record<string, number> = {
      'primer': 1, 'primero': 1, 'primera': 1,
      'segundo': 2, 'segunda': 2,
      'tercer': 3, 'tercero': 3, 'tercera': 3,
      'cuarto': 4, 'cuarta': 4,
      'quinto': 5, 'quinta': 5,
      'sexto': 6, 'sexta': 6,
      'septimo': 7, 'septima': 7,
      'octavo': 8, 'octava': 8,
      'noveno': 9, 'novena': 9,
      'decimo': 10, 'decima': 10
    }
    
    for (const [palabra, num] of Object.entries(numerosEscritos)) {
      if (new RegExp(`\\b${palabra}\\b`, 'i').test(nombreNorm)) {
        grado = num
        metodoDeteccion = 'Números escritos'
        break
      }
    }
  }
  
  // Método 3: Números arábigos (1°, 2°, 3°, etc.)
  if (!grado) {
    const matchNumero = nombreNorm.match(/\b(\d+)\s*(°|º|o|do|da)?\s*(basico|basica|medio|media)\b/i)
    if (matchNumero) {
      grado = parseInt(matchNumero[1])
      metodoDeteccion = 'Números arábigos'
    }
  }
  
  // Método 4: Solo número antes de basico/medio
  if (!grado) {
    const matchNumeroSolo = nombreNorm.match(/\b(\d+)\s+(basico|basica|medio|media)\b/i)
    if (matchNumeroSolo) {
      grado = parseInt(matchNumeroSolo[1])
      metodoDeteccion = 'Número simple'
    }
  }
  
  // PASO 3: Detectar paralelo (A, B, C, D, etc.)
  let paralelo: string | null = null
  
  // Buscar letra sola o después del grado
  const matchParalelo = nombre.match(/\b([A-Z])\b(?!\d)/)
  if (matchParalelo) {
    paralelo = matchParalelo[1].toUpperCase()
  }
  
  // PASO 4: Detectar año (2024, 2025, 2026, etc.)
  let año: number | null = null
  
  const matchAño = nombre.match(/\b(20\d{2})\b/)
  if (matchAño) {
    año = parseInt(matchAño[1])
  }
  
  // PASO 5: Calcular confianza y validar
  if (!nivel || !grado) {
    console.log('[Curso Matcher] ❌ No se pudo detectar nivel o grado')
    return null
  }
  
  // Validar rango de grado según nivel
  if (nivel === 'Basica' && (grado < 1 || grado > 8)) {
    console.log('[Curso Matcher] ⚠️ Grado fuera de rango para Básica:', grado)
    return null
  }
  
  if (nivel === 'Media' && (grado < 1 || grado > 4)) {
    console.log('[Curso Matcher] ⚠️ Grado fuera de rango para Media:', grado)
    return null
  }
  
  // Calcular confianza (0-100)
  let confidence = 50 // Base
  
  if (metodoDeteccion === 'Números arábigos') confidence += 20
  if (metodoDeteccion === 'Números romanos') confidence += 15
  if (metodoDeteccion === 'Números escritos') confidence += 10
  
  if (paralelo) confidence += 10
  if (año) confidence += 10
  
  // Si tiene formato estándar (ej: "1° Básico A"), aumentar confianza
  if (/\d+\s*°?\s*(basico|basica|medio|media)\s*[a-z]?/i.test(nombreNorm)) {
    confidence += 10
  }
  
  confidence = Math.min(100, confidence)
  
  const resultado: CursoMatch = {
    nivel,
    grado,
    paralelo: paralelo || undefined,
    año: año || undefined,
    confidence,
    razonamiento: `Detectado: ${grado}° ${nivel} ${paralelo || ''} (${metodoDeteccion})`
  }
  
  console.log('[Curso Matcher] ✅ Match encontrado:', resultado)
  
  return resultado
}

/**
 * Encuentra el curso que mejor coincide con la información extraída
 */
export function encontrarCursoMejorMatch(
  infoExtraida: CursoMatch,
  cursosDisponibles: Array<{
    id: string | number
    documentId?: string
    nombre: string
    nivel: string
    grado: number | string
    paralelo?: string
    letra?: string
    año?: number
  }>
): { curso: any; score: number } | null {
  let mejorMatch: { curso: any; score: number } | null = null
  
  for (const curso of cursosDisponibles) {
    let score = 0
    
    // Normalizar nivel del curso
    const nivelCurso = curso.nivel?.toLowerCase().includes('basic') ? 'Basica' : 
                       curso.nivel?.toLowerCase().includes('medi') ? 'Media' : null
    
    // Match de nivel (OBLIGATORIO)
    if (nivelCurso !== infoExtraida.nivel) continue
    score += 40
    
    // Match de grado (OBLIGATORIO)
    const gradoCurso = typeof curso.grado === 'string' ? parseInt(curso.grado) : curso.grado
    if (gradoCurso !== infoExtraida.grado) continue
    score += 40
    
    // Match de paralelo (OPCIONAL pero importante)
    const paraleloCurso = (curso.paralelo || curso.letra || '').toUpperCase().trim()
    if (infoExtraida.paralelo) {
      if (paraleloCurso === infoExtraida.paralelo) {
        score += 15
      } else if (paraleloCurso) {
        // Hay paralelo pero no coincide, penalizar ligeramente
        score -= 5
      }
    } else {
      // No hay paralelo en el archivo, preferir cursos sin paralelo
      if (!paraleloCurso) {
        score += 5
      }
    }
    
    // Match de año (OPCIONAL)
    if (infoExtraida.año && curso.año === infoExtraida.año) {
      score += 5
    }
    
    // Actualizar mejor match
    if (!mejorMatch || score > mejorMatch.score) {
      mejorMatch = { curso, score }
    }
  }
  
  console.log('[Curso Matcher] Mejor match:', {
    curso: mejorMatch?.curso?.nombre,
    score: mejorMatch?.score
  })
  
  // Solo retornar si el score es suficientemente alto (mínimo 80)
  return mejorMatch && mejorMatch.score >= 80 ? mejorMatch : null
}

/**
 * Procesa múltiples archivos PDF y los asocia automáticamente a cursos
 */
export function procesarPDFsInteligente(
  archivos: File[],
  cursosDisponibles: Array<any>
): Array<{
  archivo: File
  cursoMatch: any | null
  infoExtraida: CursoMatch | null
  score: number
  estado: 'matched' | 'ambiguo' | 'no_encontrado'
}> {
  const resultados = archivos.map(archivo => {
    // Extraer información del nombre del archivo
    const infoExtraida = extraerInfoCurso(archivo.name)
    
    if (!infoExtraida) {
      return {
        archivo,
        cursoMatch: null,
        infoExtraida: null,
        score: 0,
        estado: 'no_encontrado' as const
      }
    }
    
    // Buscar curso que mejor coincida
    const match = encontrarCursoMejorMatch(infoExtraida, cursosDisponibles)
    
    if (!match) {
      return {
        archivo,
        cursoMatch: null,
        infoExtraida,
        score: 0,
        estado: 'no_encontrado' as const
      }
    }
    
    // Determinar estado basado en el score
    let estado: 'matched' | 'ambiguo' | 'no_encontrado'
    if (match.score >= 95) {
      estado = 'matched' // Match perfecto
    } else if (match.score >= 80) {
      estado = 'ambiguo' // Match probable pero requiere confirmación
    } else {
      estado = 'no_encontrado'
    }
    
    return {
      archivo,
      cursoMatch: match.curso,
      infoExtraida,
      score: match.score,
      estado
    }
  })
  
  console.log('[Curso Matcher] Procesamiento completado:', {
    total: archivos.length,
    matched: resultados.filter(r => r.estado === 'matched').length,
    ambiguos: resultados.filter(r => r.estado === 'ambiguo').length,
    noEncontrados: resultados.filter(r => r.estado === 'no_encontrado').length
  })
  
  return resultados
}
