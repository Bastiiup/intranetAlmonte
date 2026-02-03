/**
 * Utilidades para extraer coordenadas reales de texto en PDFs usando pdfjs-dist
 */

interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
}

interface CoordenadasTexto {
  pagina: number
  x: number // Posición X en porcentaje (0-100)
  y: number // Posición Y en porcentaje (0-100)
  texto: string
  ancho?: number
  alto?: number
}

/**
 * Extrae coordenadas reales de texto de un PDF usando pdfjs-dist
 * Busca el texto del producto en el PDF y devuelve sus coordenadas exactas
 */
export async function extraerCoordenadasReales(
  pdfBuffer: Buffer,
  nombreProducto: string,
  logger?: any
): Promise<CoordenadasTexto | null> {
  try {
    // Intentar importar pdfjs-dist desde diferentes ubicaciones
    let pdfjsLib: any = null
    const path = require('path')
    
    try {
      // Intentar desde pdfjs-dist (versión 4.x de react-pdf)
      pdfjsLib = await import('pdfjs-dist')
      
      // Si no tiene getDocument, intentar desde legacy
      if (!pdfjsLib.getDocument) {
        // @ts-expect-error - Este módulo puede no existir en todos los entornos, pero manejamos el error
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')
      }
    } catch (e1) {
      try {
        // Intentar desde legacy build
        // @ts-expect-error - Este módulo puede no existir en todos los entornos, pero manejamos el error
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')
      } catch (e2) {
        if (logger) {
          logger.warn('No se pudo importar pdfjs-dist, usando coordenadas aproximadas', {
            error1: e1 instanceof Error ? e1.message : String(e1),
            error2: e2 instanceof Error ? e2.message : String(e2)
          })
        }
        return null
      }
    }
    
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      if (logger) {
        logger.warn('pdfjs-dist no tiene getDocument, usando coordenadas aproximadas')
      }
      return null
    }
    
    // Configurar worker (OBLIGATORIO para que funcione en servidor)
    // En Next.js API routes, necesitamos configurar el worker correctamente
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        // IMPORTANTE: En Node.js/servidor, NO usar worker (usar modo sync)
        pdfjsLib.GlobalWorkerOptions.workerSrc = false
        if (logger) {
          logger.debug('✅ Worker configurado para modo servidor (sync)')
        }
      }
    } catch (workerError) {
      if (logger) {
        logger.warn('⚠️ Error configurando worker, puede afectar extracción', {
          error: workerError instanceof Error ? workerError.message : String(workerError)
        })
      }
      // Si falla configurar worker, probablemente no funcionará la extracción
      return null
    }

    // Cargar el documento PDF
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    })
    
    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages

    if (logger) {
      logger.debug(`Buscando "${nombreProducto}" en ${numPages} páginas del PDF`)
    }

    // Normalizar nombre del producto para búsqueda (quitar acentos, minúsculas)
    const normalizarTexto = (texto: string): string => {
      return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^\w\s]/g, '') // Quitar caracteres especiales
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples
        .trim()
    }

    const nombreNormalizado = normalizarTexto(nombreProducto)
    
    // Estrategia de búsqueda múltiple para máxima precisión
    const palabrasStopwords = ['de', 'la', 'el', 'los', 'las', 'un', 'una', 'con', 'sin', 'para', 'por', 'del', 'al', 'y', 'o']
    
    // Extraer palabras clave significativas (>= 3 caracteres o números)
    const palabrasProducto = nombreNormalizado
      .split(/\s+/)
      .filter(p => p.length >= 3 || /\d/.test(p)) // Palabras de 3+ caracteres o que contengan números
      .filter(p => !palabrasStopwords.includes(p))

    // También buscar por el nombre completo (sin stopwords)
    const nombreSinStopwords = nombreNormalizado
      .split(/\s+/)
      .filter(p => !palabrasStopwords.includes(p))
      .join(' ')

    if (palabrasProducto.length === 0 && nombreSinStopwords.length < 3) {
      if (logger) logger.warn(`⚠️ Nombre de producto muy corto: "${nombreProducto}"`)
      return null
    }

    if (logger) {
      logger.debug(`🔍 Buscando "${nombreProducto}"`, {
        palabrasClave: palabrasProducto,
        nombreSinStopwords: nombreSinStopwords
      })
    }

    // Buscar en cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const pageWidth = viewport.width
      const pageHeight = viewport.height

      // Extraer texto con posiciones
      const textContent = await page.getTextContent()
      const textItems: TextItem[] = textContent.items as any[]

      // Agrupar items de texto en líneas (mismo Y)
      const lineas: Map<number, TextItem[]> = new Map()
      
      for (const item of textItems) {
        const y = Math.round(item.y * 10) / 10 // Redondear a 1 decimal
        if (!lineas.has(y)) {
          lineas.set(y, [])
        }
        lineas.get(y)!.push(item)
      }

      // Buscar el producto en las líneas
      for (const [y, items] of lineas.entries()) {
        // Ordenar items por X (izquierda a derecha)
        items.sort((a, b) => a.x - b.x)
        
        // Construir texto de la línea
        const textoLinea = items.map(item => item.str).join(' ')
        const textoLineaNormalizado = normalizarTexto(textoLinea)

        // ESTRATEGIA DE COINCIDENCIA MEJORADA
        // 1. Coincidencia exacta del nombre completo (mejor caso)
        const coincidenciaExacta = textoLineaNormalizado.includes(nombreNormalizado)
        
        // 2. Coincidencia del nombre sin stopwords
        const coincidenciaSinStopwords = nombreSinStopwords.length >= 5 && 
                                         textoLineaNormalizado.includes(nombreSinStopwords)
        
        // 3. Coincidencia por palabras clave (al menos 60% de palabras encontradas)
        const palabrasEncontradas = palabrasProducto.filter(palabra =>
          textoLineaNormalizado.includes(palabra)
        )
        const porcentajeCoincidencia = palabrasProducto.length > 0 
          ? palabrasEncontradas.length / palabrasProducto.length 
          : 0
        
        // 4. Coincidencia de inicio de nombre (primeras palabras significativas)
        const primerasPalabras = nombreSinStopwords.split(/\s+/).slice(0, 2).join(' ')
        const coincidenciaInicio = primerasPalabras.length >= 5 && 
                                   textoLineaNormalizado.includes(primerasPalabras)
        
        // Determinar si es una coincidencia válida
        const esCoincidencia = coincidenciaExacta || 
                              coincidenciaSinStopwords || 
                              porcentajeCoincidencia >= 0.6 ||
                              (porcentajeCoincidencia >= 0.4 && coincidenciaInicio)
        
        if (esCoincidencia) {
          // Calcular posición promedio de los items de esta línea
          const xPromedio = items.reduce((sum, item) => sum + item.x, 0) / items.length
          const yPromedio = y
          
          // Convertir a porcentajes (0-100)
          const xPorcentaje = (xPromedio / pageWidth) * 100
          const yPorcentaje = ((pageHeight - yPromedio) / pageHeight) * 100 // Invertir Y porque PDF usa coordenadas desde abajo

          // Calcular ancho y alto aproximados
          const anchoTotal = items.reduce((sum, item) => sum + item.width, 0)
          const altoPromedio = items.reduce((sum, item) => sum + item.height, 0) / items.length
          
          const anchoPorcentaje = (anchoTotal / pageWidth) * 100
          const altoPorcentaje = (altoPromedio / pageHeight) * 100

          if (logger) {
            logger.success(`✅ COORDENADAS EXACTAS encontradas para "${nombreProducto}"`, {
              pagina: pageNum,
              textoEncontrado: textoLinea.substring(0, 50) + (textoLinea.length > 50 ? '...' : ''),
              coordenadas: {
                x: `${Math.round(xPorcentaje * 10) / 10}%`,
                y: `${Math.round(yPorcentaje * 10) / 10}%`,
                ancho: `${Math.round(anchoPorcentaje * 10) / 10}%`,
                alto: `${Math.round(altoPorcentaje * 10) / 10}%`,
              },
              tipoCoincidencia: coincidenciaExacta ? 'EXACTA' :
                               coincidenciaSinStopwords ? 'SIN STOPWORDS' :
                               coincidenciaInicio ? 'INICIO + PALABRAS' :
                               `PALABRAS (${Math.round(porcentajeCoincidencia * 100)}%)`,
              palabrasEncontradas: `${palabrasEncontradas.length}/${palabrasProducto.length}`
            })
          }

          return {
            pagina: pageNum,
            x: Math.round(xPorcentaje * 10) / 10,
            y: Math.round(yPorcentaje * 10) / 10,
            texto: textoLinea,
            ancho: Math.round(anchoPorcentaje * 10) / 10,
            alto: Math.round(altoPorcentaje * 10) / 10,
          }
        }
      }
    }

    if (logger) {
      logger.warn(`⚠️ Producto no encontrado en PDF: "${nombreProducto}"`)
    }

    return null
  } catch (error: any) {
    if (logger) {
      logger.error('Error al extraer coordenadas reales', {
        error: error.message,
        stack: error.stack
      })
    }
    return null
  }
}

/**
 * Extrae coordenadas para múltiples productos de forma eficiente
 */
export async function extraerCoordenadasMultiples(
  pdfBuffer: Buffer,
  productos: Array<{ nombre: string; id?: string | number }>,
  logger?: any
): Promise<Map<string, CoordenadasTexto>> {
  const coordenadasMap = new Map<string, CoordenadasTexto>()

  if (logger) {
    logger.info(`📍 Extrayendo coordenadas para ${productos.length} productos...`)
  }

  // Procesar productos secuencialmente para evitar sobrecarga y mejorar logging
  // (el procesamiento en paralelo puede causar problemas con pdfjs-dist)
  for (let i = 0; i < productos.length; i++) {
    const producto = productos[i]
    
    try {
      const coordenadas = await extraerCoordenadasReales(
        pdfBuffer,
        producto.nombre,
        logger
      )
      
      if (coordenadas) {
        // Guardar con múltiples keys para facilitar la búsqueda
        const keyId = producto.id ? String(producto.id) : `producto-${i + 1}`
        const keyNombre = producto.nombre.toLowerCase().trim()
        
        coordenadasMap.set(keyId, coordenadas)
        coordenadasMap.set(keyNombre, coordenadas)
        
        if (logger && (i + 1) % 5 === 0) {
          logger.debug(`Progreso: ${i + 1}/${productos.length} productos procesados, ${coordenadasMap.size / 2} encontrados`)
        }
      } else {
        if (logger) {
          logger.debug(`⚠️ No se encontraron coordenadas para: "${producto.nombre}"`)
        }
      }
    } catch (error: any) {
      if (logger) {
        logger.warn(`Error extrayendo coordenadas para "${producto.nombre}":`, error.message)
      }
    }
  }

  if (logger) {
    const productosConCoordenadas = coordenadasMap.size / 2 // Dividir por 2 porque guardamos con 2 keys
    logger.success(`✅ Coordenadas extraídas: ${productosConCoordenadas}/${productos.length} productos`)
  }

  return coordenadasMap
}
