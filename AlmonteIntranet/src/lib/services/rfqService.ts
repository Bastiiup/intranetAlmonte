/**
 * Servicio para gestión de RFQ (Request for Quotation)
 * Maneja la lógica de negocio para solicitudes de cotización
 */

import strapiClient from '@/lib/strapi/client'
import { sendEmail } from '@/lib/email/sendgrid'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'
import crypto from 'crypto'

export interface RFQData {
  nombre: string
  descripcion?: string
  fecha_solicitud: string
  fecha_vencimiento?: string
  estado?: 'draft' | 'sent' | 'received' | 'converted' | 'cancelled'
  moneda?: 'CLP' | 'USD' | 'EUR'
  empresas: (number | string)[] // IDs de empresas
  productos: (number | string)[] // IDs de productos
  productos_cantidades?: Record<string, number> // { productoId: cantidad }
  creado_por?: number // ID del colaborador
  notas_internas?: string
}

export interface CotizacionRecibidaData {
  rfq_id: number
  empresa_id: number
  contacto_id?: number
  numero_cotizacion?: string
  fecha_recepcion: string
  fecha_validez?: string
  precio_unitario?: number
  precio_total: number
  moneda?: 'CLP' | 'USD' | 'EUR'
  notas?: string
  archivo_pdf?: File | string
}

/**
 * Genera un token único para acceso público a una RFQ
 */
export function generateRFQToken(rfqId: string | number): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(16).toString('hex')
  return `rfq_${rfqId}_${timestamp}_${random}`
}

/**
 * Genera número único de RFQ
 * Formato: RFQ-YYYY-XXX
 */
export async function generateRFQNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  try {
    // Buscar última RFQ del año
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs?filters[numero_rfq][$containsi]=RFQ-${year}&sort[0]=createdAt:desc&pagination[pageSize]=1`
    )
    
    let lastNumber = 0
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const lastRFQ = response.data[0]
      const attrs = lastRFQ.attributes || lastRFQ
      const numero = attrs.numero_rfq
      if (numero) {
        const match = numero.match(/RFQ-\d{4}-(\d+)/)
        if (match) {
          lastNumber = parseInt(match[1])
        }
      }
    }
    
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
    return `RFQ-${year}-${nextNumber}`
  } catch (error) {
    // Si hay error, usar timestamp como fallback
    const timestamp = Date.now().toString().slice(-6)
    return `RFQ-${year}-${timestamp}`
  }
}

/**
 * Genera un número único de cotización recibida
 * Formato: COT-YYYY-XXX (ej: COT-2026-001)
 */
export async function generateCotizacionNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  try {
    // Buscar última cotización del año
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cotizaciones-recibidas?filters[numero_cotizacion][$containsi]=COT-${year}&sort[0]=createdAt:desc&pagination[pageSize]=1`
    )
    
    let lastNumber = 0
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const lastCotizacion = response.data[0]
      const attrs = lastCotizacion.attributes || lastCotizacion
      const numero = attrs.numero_cotizacion
      if (numero) {
        const match = numero.match(/COT-\d{4}-(\d+)/)
        if (match) {
          lastNumber = parseInt(match[1])
        }
      }
    }
    
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0')
    return `COT-${year}-${nextNumber}`
  } catch (error) {
    // Si hay error, usar timestamp como fallback
    const timestamp = Date.now().toString().slice(-6)
    return `COT-${year}-${timestamp}`
  }
}

/**
 * Crea una nueva RFQ
 */
export async function createRFQ(data: RFQData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[RFQService] Iniciando creación de RFQ con datos:', {
      nombre: data.nombre,
      empresasCount: data.empresas.length,
      productosCount: data.productos.length,
    })
    
    // Generar número único
    const numeroRFQ = await generateRFQNumber()
    console.log('[RFQService] Número RFQ generado:', numeroRFQ)
    
    // Validar y convertir IDs de empresas
    // IMPORTANTE: Strapi v5 acepta tanto IDs numéricos como documentIds en relaciones manyToMany
    // Simplificamos: aceptar directamente los IDs que vienen, solo validar que existan
    const empresasIds: (number | string)[] = []
    
    console.log('[RFQService] 🔍 Procesando empresas recibidas:', {
      empresas: data.empresas,
      empresasCount: data.empresas.length,
      empresasTypes: data.empresas.map((id: any) => ({ id, type: typeof id, length: typeof id === 'string' ? id.length : 0 })),
    })
    
    for (const empresaId of data.empresas) {
      if (!empresaId) {
        console.warn(`[RFQService] ⚠️ ID de empresa vacío o nulo, omitiendo`)
        continue
      }
      
      // Limpiar el ID de caracteres inválidos (como @)
      let idLimpio: string | number = empresaId
      if (typeof empresaId === 'string') {
        idLimpio = empresaId.replace(/[@]/g, '0')
        if (idLimpio !== empresaId) {
          console.warn(`[RFQService] ⚠️ ID de empresa corregido: ${empresaId} → ${idLimpio}`)
        }
      }
      
      // Determinar si es documentId (UUID) o ID numérico
      const isUUID = typeof idLimpio === 'string' && idLimpio.length > 10 && !/^\d+$/.test(idLimpio)
      
      if (isUUID) {
        // Es un documentId, usarlo directamente sin validación previa
        empresasIds.push(idLimpio)
        console.log(`[RFQService] ✅ Empresa agregada con documentId: ${idLimpio}`)
      } else {
        // Es un número o string numérico
        const idNum = typeof idLimpio === 'string' ? parseInt(idLimpio) : idLimpio
        
        if (!isNaN(idNum) && idNum > 0) {
          // Intentar obtener el documentId para mayor compatibilidad, pero si falla usar el ID numérico
          try {
            const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/empresas/${idNum}?fields[0]=id&fields[1]=documentId`
            )
            
            if (empresaResponse.data) {
              const empresa = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
              const docId = empresa.documentId || (empresa as any).documentId
              
              if (docId) {
                empresasIds.push(docId)
                console.log(`[RFQService] ✅ Empresa ${idNum} → documentId: ${docId}`)
              } else {
                // Fallback: usar ID numérico
                empresasIds.push(idNum)
                console.log(`[RFQService] ⚠️ Empresa ${idNum} no tiene documentId, usando ID numérico`)
              }
            } else {
              empresasIds.push(idNum)
              console.log(`[RFQService] ⚠️ Empresa ${idNum} sin datos en respuesta, usando ID numérico`)
            }
          } catch (err: any) {
            // Si falla la búsqueda, usar el ID numérico directamente
            empresasIds.push(idNum)
            console.log(`[RFQService] ⚠️ Error al obtener empresa ${idNum}, usando ID numérico directamente:`, err.message)
          }
        } else {
          console.error(`[RFQService] ❌ ID de empresa inválido después de limpiar: ${idLimpio} (original: ${empresaId})`)
        }
      }
    }
    
    console.log('[RFQService] 📊 Empresas procesadas:', {
      empresasRecibidas: data.empresas,
      empresasIdsFinales: empresasIds,
      empresasCount: empresasIds.length,
      empresasTypes: empresasIds.map(id => ({ id, type: typeof id })),
    })
    
    if (empresasIds.length === 0) {
      console.error('[RFQService] ❌ ERROR: No se encontraron empresas válidas para conectar')
      console.error('[RFQService] Empresas originales recibidas:', data.empresas)
      return {
        success: false,
        error: 'No se encontraron empresas válidas para conectar. Verifica que los proveedores seleccionados existan en el sistema.',
      }
    }
    
    // IMPORTANTE: Enviar documentId directamente a Strapi para la relación manyToMany
    // Strapi v5 acepta documentId en relaciones manyToMany
    const productosIds: (number | string)[] = []
    for (const productoId of data.productos) {
      // Determinar si es documentId (UUID) o ID numérico
      const isUUID = typeof productoId === 'string' && productoId.length > 10 && !/^\d+$/.test(productoId)
      
      if (isUUID) {
        // Es un documentId, usarlo directamente
        productosIds.push(productoId)
        console.log(`[RFQService] ✅ Producto agregado con documentId: ${productoId}`)
      } else {
        // Es un número o string numérico, obtener el documentId primero
        const idNum = typeof productoId === 'string' ? parseInt(productoId) : productoId
        
        if (!isNaN(idNum) && idNum > 0) {
          try {
            console.log(`[RFQService] 🔍 Obteniendo documentId del producto con ID numérico: ${idNum}`)
            const productoCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/libros/${idNum}?fields[0]=id&fields[1]=documentId`
            )
            
            if (productoCheck.data) {
              const productoData = productoCheck.data
              const docId = productoData.documentId || (productoData as any).documentId
              
              if (docId) {
                productosIds.push(docId)
                console.log(`[RFQService] ✅ Producto ${idNum} → documentId: ${docId} (usando documentId)`)
              } else {
                // Fallback: si no hay documentId, usar el ID numérico
                productosIds.push(idNum)
                console.warn(`[RFQService] ⚠️ Producto ${idNum} no tiene documentId, usando ID numérico como fallback`)
              }
            } else {
              console.error(`[RFQService] ❌ Producto ${idNum} no encontrado en Strapi`)
            }
          } catch (err: any) {
            if (err.status === 404) {
              console.error(`[RFQService] ❌ ID numérico ${idNum} no existe en Strapi`)
            } else {
              console.error(`[RFQService] Error al obtener producto ${idNum}:`, err.message)
            }
          }
        } else {
          console.error(`[RFQService] ❌ ID de producto inválido: ${productoId}`)
        }
      }
    }
    
    console.log('[RFQService] 📋 RESUMEN DE RESOLUCIÓN DE PRODUCTOS:')
    console.log('[RFQService] Productos recibidos:', data.productos)
    console.log('[RFQService] Productos resueltos (documentId):', productosIds)
    console.log('[RFQService] Total productos válidos:', productosIds.length)
    console.log('[RFQService] Tipos de IDs:', productosIds.map(id => ({ id, type: typeof id })))
    
    if (productosIds.length === 0) {
      console.error('[RFQService] ❌ ERROR: No se encontraron productos válidos para conectar')
      console.error('[RFQService] Productos originales:', data.productos)
      return {
        success: false,
        error: 'No se encontraron productos válidos para conectar',
      }
    }
    
    // Preparar datos para Strapi
    const rfqData: any = {
      data: {
        numero_rfq: numeroRFQ,
        nombre: data.nombre.trim(),
        fecha_solicitud: data.fecha_solicitud,
        estado: data.estado || 'draft',
        moneda: data.moneda || 'CLP',
        activo: true,
        ...(data.descripcion && { descripcion: data.descripcion.trim() }),
        ...(data.fecha_vencimiento && { fecha_vencimiento: data.fecha_vencimiento }),
        ...(data.notas_internas && { notas_internas: data.notas_internas.trim() }),
        // Relaciones - usar documentId para productos y empresas
        // IMPORTANTE: En Strapi v5, para manyToMany usar array directo de documentIds (más confiable)
        // Tanto productos como empresas pueden usar documentId directamente
        ...(empresasIds.length > 0 && { empresas: empresasIds }), // manyToMany: array de documentIds o IDs numéricos
        ...(productosIds.length > 0 && { productos: productosIds }), // manyToMany: array de documentIds
        // Guardar cantidades por producto (campo JSON)
        ...(data.productos_cantidades && { productos_cantidades: data.productos_cantidades }),
        ...(data.creado_por && { creado_por: data.creado_por }), // manyToOne: ID directo
      },
    }
    
    console.log('[RFQService] 🔍 Comparación empresas vs productos ANTES de enviar a Strapi:', {
      empresas: {
        ids: empresasIds,
        count: empresasIds.length,
        type: typeof empresasIds[0],
        isArray: Array.isArray(empresasIds),
        enPayload: rfqData.data.empresas,
        enPayloadType: typeof rfqData.data.empresas,
        enPayloadIsArray: Array.isArray(rfqData.data.empresas),
        enPayloadValue: JSON.stringify(rfqData.data.empresas),
      },
      productos: {
        ids: productosIds,
        count: productosIds.length,
        type: typeof productosIds[0],
        isArray: Array.isArray(productosIds),
        enPayload: rfqData.data.productos,
        enPayloadType: typeof rfqData.data.productos,
        enPayloadIsArray: Array.isArray(rfqData.data.productos),
        enPayloadValue: JSON.stringify(rfqData.data.productos),
      },
      diferencia: {
        empresasIncluidas: !!rfqData.data.empresas,
        productosIncluidos: !!rfqData.data.productos,
        empresasEsArray: Array.isArray(rfqData.data.empresas),
        productosEsArray: Array.isArray(rfqData.data.productos),
      },
    })
    
    console.log('[RFQService] 📊 RESUMEN ANTES DE ENVIAR A STRAPI:')
    console.log('[RFQService] Empresas:', {
      ids: empresasIds,
      count: empresasIds.length,
      enPayload: rfqData.data.empresas,
      enPayloadType: typeof rfqData.data.empresas,
      enPayloadIsArray: Array.isArray(rfqData.data.empresas),
    })
    console.log('[RFQService] Productos:', {
      ids: productosIds,
      count: productosIds.length,
      idsTypes: productosIds.map(id => ({ id, type: typeof id })),
      enPayload: rfqData.data.productos,
      enPayloadType: typeof rfqData.data.productos,
      enPayloadIsArray: Array.isArray(rfqData.data.productos),
      enPayloadValue: JSON.stringify(rfqData.data.productos),
    })
    console.log('[RFQService] Productos cantidades:', {
      tieneCantidades: !!rfqData.data.productos_cantidades,
      cantidades: rfqData.data.productos_cantidades,
    })
    console.log('[RFQService] Payload completo:', JSON.stringify(rfqData, null, 2))
    
    console.log('[RFQService] 🔍 Payload completo que se envía a Strapi POST /api/rfqs:')
    console.log(JSON.stringify(rfqData, null, 2))
    
    const response = await strapiClient.post<StrapiResponse<StrapiEntity<any>>>(
      '/api/rfqs',
      rfqData
    )
    
    console.log('[RFQService] 📥 Respuesta completa de Strapi POST:')
    console.log(JSON.stringify(response, null, 2))
    
    console.log('[RFQService] RFQ creada exitosamente:', {
      responseData: response.data,
      responseDataId: response.data?.id,
      responseDataDocumentId: response.data?.documentId,
      responseDataAttributes: response.data?.attributes,
    })
    
    // IMPORTANTE: La respuesta del POST no incluye las relaciones populadas
    // Necesitamos hacer un GET con populate completo para obtener los datos completos
    const rfqIdFinal = response.data?.documentId || response.data?.id
    let rfqFinal = response.data
    
    if (rfqIdFinal) {
      try {
        console.log('[RFQService] Obteniendo RFQ creada con relaciones populadas:', rfqIdFinal)
        // IMPORTANTE: Usar populate[productos]=true (sin campos específicos)
        // Los campos específicos pueden estar causando que no se populen correctamente
        // Si hay error con portada_libro, Strapi lo ignorará pero seguirá populando los otros campos
        let populateUrl = `/api/rfqs/${rfqIdFinal}?populate[empresas][populate][emails]=true&populate[productos]=true&populate[creado_por][populate][persona]=true&populate[cotizaciones_recibidas][populate][empresa][populate][emails]=true&populate[cotizaciones_recibidas][populate][contacto_responsable]=true`
        console.log('[RFQService] 🔍 URL de populate:', populateUrl)
        
        let updatedRFQ: StrapiResponse<StrapiEntity<any>>
        try {
          updatedRFQ = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(populateUrl)
        } catch (error: any) {
          // Si falla con populate[productos]=true (por ejemplo, error con portada_libro),
          // intentar sin populate de productos y luego hacer un populate manual
          console.warn('[RFQService] ⚠️ Error con populate[productos]=true, intentando sin populate de productos:', error.message)
          populateUrl = `/api/rfqs/${rfqIdFinal}?populate[empresas][populate][emails]=true&populate[creado_por][populate][persona]=true&populate[cotizaciones_recibidas][populate][empresa][populate][emails]=true&populate[cotizaciones_recibidas][populate][contacto_responsable]=true`
          updatedRFQ = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(populateUrl)
        }
        
        console.log('[RFQService] 📥 Respuesta completa del GET con populate:')
        console.log(JSON.stringify(updatedRFQ, null, 2))
        
        // Log detallado de la estructura de productos en la respuesta
        if (updatedRFQ.data) {
          const rfqData = updatedRFQ.data
          const attrs = (rfqData as any).attributes || rfqData
          console.log('[RFQService] 🔍 Estructura de productos en respuesta:', {
            tieneProductos: !!(attrs.productos || (rfqData as any).productos),
            productosEnAttrs: !!attrs.productos,
            productosEnRaiz: !!(rfqData as any).productos,
            productosValue: JSON.stringify(attrs.productos || (rfqData as any).productos).substring(0, 500),
            productosType: typeof (attrs.productos || (rfqData as any).productos),
            productosIsArray: Array.isArray(attrs.productos || (rfqData as any).productos),
          })
        }
        
        if (updatedRFQ.data) {
          rfqFinal = updatedRFQ.data
          const rfqAttrs = (rfqFinal as any).attributes || rfqFinal
          const productosRaw = rfqAttrs.productos || (rfqFinal as any).productos
          
          console.log('[RFQService] RFQ obtenida con relaciones populadas:', {
            hasData: !!rfqFinal,
            productosRaw: productosRaw,
            productosRawType: typeof productosRaw,
            productosIsArray: Array.isArray(productosRaw),
            productosRawKeys: productosRaw ? Object.keys(productosRaw) : [],
            productosRawValue: JSON.stringify(productosRaw).substring(0, 500),
            productosCount: Array.isArray(productosRaw) 
              ? productosRaw.length 
              : (productosRaw?.data && Array.isArray(productosRaw.data))
                ? productosRaw.data.length
                : 0,
            empresasCount: Array.isArray((rfqFinal as any).attributes?.empresas) 
              ? (rfqFinal as any).attributes.empresas.length 
              : ((rfqFinal as any).empresas?.length || 0),
            fullResponse: JSON.stringify(rfqFinal, null, 2).substring(0, 2000),
          })
        }
      } catch (getError: any) {
        console.warn('[RFQService] No se pudo obtener RFQ con relaciones populadas:', getError.message)
        // Continuar con la respuesta del POST si el GET falla
      }
    }
    
    // Verificar que los productos se guardaron correctamente
    if (rfqFinal) {
      const rfqCreated = Array.isArray(rfqFinal) ? rfqFinal[0] : rfqFinal
      const attrs = rfqCreated.attributes || rfqCreated
      const productosGuardados = attrs.productos?.data || attrs.productos || []
      console.log('[RFQService] Productos guardados en RFQ:', {
        productosCount: Array.isArray(productosGuardados) ? productosGuardados.length : 0,
        productosIds: Array.isArray(productosGuardados) 
          ? productosGuardados.map((p: any) => ({ id: p.id, documentId: p.documentId }))
          : [],
        productosRaw: productosGuardados,
      })
    }
    
    return {
      success: true,
      data: rfqFinal,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al crear RFQ:', error)
    
    // Extraer mensaje de error más detallado
    let errorMessage = 'Error al crear RFQ'
    if (error.message) {
      errorMessage = error.message
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message
    } else if (typeof error.response?.data === 'string') {
      errorMessage = error.response.data
    } else if (error.status === 404) {
      errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación.'
    } else if (error.status === 400) {
      errorMessage = 'Datos inválidos. Verifique que las empresas y productos existan en Strapi.'
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Envía RFQ a proveedores por email
 */
export async function sendRFQToProviders(
  rfqId: string | number,
  empresaIds?: number[]
): Promise<{ success: boolean; resultados: Array<{ empresa: string; success: boolean; error?: string }>; error?: string }> {
  try {
    const rfqIdStr = String(rfqId)
    const isNumericId = /^\d+$/.test(rfqIdStr)
    
    let rfq: StrapiEntity<any> | null = null
    
    // Si es un ID numérico, buscar primero por filtros (más confiable)
    if (isNumericId) {
      try {
        const searchParams = new URLSearchParams({
          'filters[id][$eq]': rfqIdStr,
          'populate[empresas][populate][emails]': 'true',
          'populate[productos]': 'true',
          'populate[creado_por][populate][persona]': 'true',
        })
        
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/rfqs?${searchParams.toString()}`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            rfq = filterResponse.data[0]
          } else if (!Array.isArray(filterResponse.data)) {
            rfq = filterResponse.data
          }
        }
      } catch (filterError: any) {
        console.warn(`[RFQService] Error al buscar por ID numérico con filtros:`, filterError.message)
      }
    }
    
    // Si no se encontró con filtros (o es documentId), intentar con el endpoint directo
    if (!rfq) {
      try {
        const rfqResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/rfqs/${rfqIdStr}?populate[empresas][populate][emails]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
        )
        
        if (rfqResponse.data) {
          rfq = Array.isArray(rfqResponse.data) 
            ? rfqResponse.data[0] 
            : rfqResponse.data
        }
      } catch (directError: any) {
        // Si falla con 404, intentar buscar por documentId o id alternativo
        if (directError.status === 404) {
          try {
            // Intentar con el filtro alternativo (invertir la búsqueda)
            const altSearchParams = new URLSearchParams({
              ...(isNumericId ? { 'filters[documentId][$eq]': rfqIdStr } : { 'filters[id][$eq]': rfqIdStr }),
              'populate[empresas][populate][emails]': 'true',
              'populate[productos]': 'true',
              'populate[creado_por][populate][persona]': 'true',
            })
            
            const altFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?${altSearchParams.toString()}`
            )
            
            if (altFilterResponse.data) {
              if (Array.isArray(altFilterResponse.data) && altFilterResponse.data.length > 0) {
                rfq = altFilterResponse.data[0]
              } else if (!Array.isArray(altFilterResponse.data)) {
                rfq = altFilterResponse.data
              }
            }
          } catch (altError: any) {
            console.error(`[RFQService] Error con filtro alternativo:`, altError.message)
          }
        } else {
          throw directError
        }
      }
    }
    
    if (!rfq) {
      console.error('[RFQService] ❌ RFQ no encontrada después de todos los intentos:', {
        rfqId,
        rfqIdStr,
        isNumericId,
        intentos: ['filtros por ID numérico', 'endpoint directo', 'filtro alternativo'],
      })
      return {
        success: false,
        resultados: [],
        error: `RFQ no encontrada con ID: ${rfqId}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`,
      }
    }
    
    console.log('[RFQService] ✅ RFQ encontrada:', {
      id: rfq.id,
      documentId: rfq.documentId,
      numero_rfq: (rfq.attributes || rfq).numero_rfq,
    })
    
    const attrs = rfq.attributes || rfq
    let empresas = attrs.empresas?.data || attrs.empresas || []
    
    // Filtrar empresas si se especificaron IDs
    if (empresaIds && Array.isArray(empresaIds) && empresaIds.length > 0) {
      empresas = empresas.filter((emp: any) => {
        const empId = emp.id || emp.documentId
        return empresaIds.includes(Number(empId))
      })
    }
    
    if (empresas.length === 0) {
      return {
        success: false,
        resultados: [],
        error: 'No hay empresas asociadas a esta RFQ',
      }
    }
    
    // Generar token único
    const token = generateRFQToken(rfqId)
    
    // Usar documentId para actualizar la RFQ (más confiable que ID numérico)
    const rfqIdParaActualizar = rfq.documentId || rfq.id || rfqId
    
    console.log('[RFQService] Actualizando RFQ con token:', {
      rfqIdOriginal: rfqId,
      rfqIdParaActualizar,
      token: token.substring(0, 20) + '...',
    })
    
    // Guardar token en RFQ
    try {
      await strapiClient.put(`/api/rfqs/${rfqIdParaActualizar}`, {
        data: {
          token_acceso: token,
          estado: 'sent',
        },
      })
      console.log('[RFQService] ✅ Token y estado actualizados en RFQ')
    } catch (updateError: any) {
      console.error('[RFQService] ❌ Error al actualizar token en RFQ:', {
        error: updateError.message,
        status: updateError.status,
        rfqIdParaActualizar,
      })
      // Continuar con el envío aunque falle la actualización del token
      // (el token se generará nuevamente en el próximo envío)
    }
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const replyUrl = `${appUrl}/quote-reply/${token}`
    
    // Preparar datos para email
    const productos = attrs.productos?.data || attrs.productos || []
    const creadoPor = attrs.creado_por?.data || attrs.creado_por
    const creadoPorNombre = creadoPor?.persona?.nombre_completo || creadoPor?.persona?.nombres || 'Equipo de Compras'
    
    // Filtrar empresas: solo enviar emails a empresas proveedoras (NO propias)
    // Las empresas propias se vinculan a la RFQ pero no reciben email
    const empresasProveedoras = empresas.filter((emp: any) => {
      const empAttrs = emp.attributes || emp
      return !empAttrs.es_empresa_propia // Solo empresas que NO son propias
    })
    
    const empresasPropias = empresas.filter((emp: any) => {
      const empAttrs = emp.attributes || emp
      return empAttrs.es_empresa_propia === true
    })
    
    console.log('[RFQService] 📧 Enviando emails:', {
      totalEmpresas: empresas.length,
      empresasProveedoras: empresasProveedoras.length,
      empresasPropias: empresasPropias.length,
      empresasPropiasNombres: empresasPropias.map((e: any) => {
        const attrs = e.attributes || e
        return attrs.empresa_nombre || attrs.nombre
      }),
    })
    
    // Enviar email solo a empresas proveedoras
    const resultados: Array<{ empresa: string; success: boolean; error?: string; tipo?: string }> = []
    
    // Registrar empresas propias (vinculadas pero sin email)
    for (const empresa of empresasPropias) {
      const empAttrs = empresa.attributes || empresa
      const empresaNombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
      resultados.push({
        empresa: empresaNombre,
        success: true,
        tipo: 'empresa_propia',
        error: 'Empresa propia - vinculada sin enviar email',
      })
    }
    
    // Enviar emails solo a empresas proveedoras
    for (const empresa of empresasProveedoras) {
      const empAttrs = empresa.attributes || empresa
      const empresaNombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
      
      // Buscar email principal de la empresa
      const emails = empAttrs.emails || []
      const emailPrincipal = emails.find((e: any) => e.principal) || emails[0]
      const empresaEmail = emailPrincipal?.email || empAttrs.email
      
      if (!empresaEmail) {
        resultados.push({
          empresa: empresaNombre,
          success: false,
          tipo: 'proveedora',
          error: 'No tiene email configurado',
        })
        continue
      }
      
      // Generar HTML del email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitud de Cotización - ${attrs.numero_rfq || attrs.nombre}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Solicitud de Cotización</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Estimado/a <strong>${empresaNombre}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Le solicitamos cotización para los siguientes productos:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">${attrs.numero_rfq || attrs.nombre}</h2>
              ${attrs.descripcion ? `<p style="color: #666;">${attrs.descripcion}</p>` : ''}
              ${attrs.fecha_vencimiento ? `<p style="color: #666; margin-top: 10px;"><strong>Fecha límite:</strong> ${new Date(attrs.fecha_vencimiento).toLocaleDateString('es-CL')}</p>` : ''}
            </div>

            ${productos.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Productos solicitados:</h3>
              <ul style="list-style: none; padding: 0;">
                ${productos.map((prod: any) => {
                  const prodAttrs = prod.attributes || prod
                  const prodNombre = prodAttrs.nombre_libro || prodAttrs.nombre || 'Producto'
                  return `<li style="padding: 10px; background: white; margin-bottom: 8px; border-radius: 5px; border-left: 3px solid #667eea;">${prodNombre}</li>`
                }).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${replyUrl}" 
                 style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Responder Cotización
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Por favor, haga clic en el botón anterior para acceder al formulario y proporcionar su cotización.
              Puede llenar el formulario en línea o subir un PDF con su cotización.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Si tiene alguna pregunta, no dude en contactarnos.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Este es un correo automático. Por favor, no responda directamente a este mensaje.<br>
              Solicitud creada por: ${creadoPorNombre}
            </p>
          </div>
        </body>
        </html>
      `
      
      const emailResult = await sendEmail({
        to: empresaEmail,
        subject: `Solicitud de Cotización: ${attrs.numero_rfq || attrs.nombre}`,
        html: emailHtml,
      })
      
      resultados.push({
        empresa: empresaNombre,
        success: emailResult.success,
        tipo: 'proveedora',
        error: emailResult.error,
      })
    }
    
    return {
      success: true,
      resultados,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al enviar RFQ:', error)
    return {
      success: false,
      resultados: [],
      error: error.message || 'Error al enviar RFQ',
    }
  }
}

/**
 * Obtiene RFQ por token (para acceso público)
 */
export async function getRFQByToken(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/rfqs?filters[token_acceso][$eq]=${encodeURIComponent(token)}&populate[empresas]=true&populate[productos]=true`
    )
    
    if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
      return {
        success: false,
        error: 'RFQ no encontrada o token inválido',
      }
    }
    
    const rfq = Array.isArray(response.data) ? response.data[0] : response.data
    
    return {
      success: true,
      data: rfq,
    }
  } catch (error: any) {
    console.error('[RFQService] Error al obtener RFQ por token:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener RFQ',
    }
  }
}

