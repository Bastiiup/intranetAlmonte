import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * Construye los parámetros de populate para productos
 * IMPORTANTE: En Strapi v5, para relaciones manyToMany, usar populate[productos]=true
 * Los campos específicos pueden estar causando que no se populen correctamente
 */
function buildProductosPopulate(): string {
  // Usar populate simple - si hay error con portada_libro, Strapi lo ignorará pero seguirá populando
  return 'populate[productos]=true'
}

/**
 * GET /api/compras/rfqs/[id]
 * Obtiene una RFQ específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API /compras/rfqs/[id] GET] Iniciando GET request')
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    
    console.log('[API /compras/rfqs/[id] GET] ID recibido:', id)
    
    if (!id) {
      console.error('[API /compras/rfqs/[id] GET] ID no proporcionado')
      return NextResponse.json(
        {
          success: false,
          error: 'ID de RFQ no proporcionado',
        },
        { status: 400 }
      )
    }
    
    let rfq: any = null
    
    // Determinar si el ID es numérico o documentId
    const isNumericId = /^\d+$/.test(id)
    
    // Si es un ID numérico, buscar directamente por filtros (más confiable)
    // Si es documentId, intentar primero el endpoint directo
    if (isNumericId) {
      console.log(`[API /compras/rfqs/[id] GET] ID numérico detectado: ${id}, buscando por filtros`)
      try {
        const searchParams = new URLSearchParams({
          'filters[id][$eq]': id,
          'populate[empresas][populate][emails]': 'true',
          'populate[productos]': 'true',
          'populate[creado_por][populate][persona]': 'true',
          'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
          'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
        })
        
        const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          `/api/rfqs?${searchParams.toString()}`
        )
        
        if (filterResponse.data) {
          if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
            rfq = filterResponse.data[0]
            console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada por ID numérico con filtros`)
          } else if (!Array.isArray(filterResponse.data)) {
            rfq = filterResponse.data
            console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada por ID numérico con filtros (objeto único)`)
          }
        }
      } catch (filterError: any) {
        console.warn(`[API /compras/rfqs/[id] GET] Error al buscar por ID numérico con filtros:`, filterError.message)
      }
    }
    
    // Si no se encontró con filtros (o es documentId), intentar con el endpoint directo
    if (!rfq) {
      try {
        // Usar populate específico para evitar errores con comuna y asegurar que traiga emails
        // Para empresas (manyToMany): NO usar populate[empresas]=* junto con populate anidado
        // En Strapi v5, usar solo populate[empresas][populate][emails]=true (sin el *=*)
        // Para productos (manyToMany): usar populate con campos específicos para evitar error con portada_libro
        // populate[productos]=true no popula correctamente, populate[productos]=* causa error con portada_libro
        // Solución: usar populate[productos][fields] para especificar campos exactos
        // IMPORTANTE: Strapi v5 no permite usar *=* junto con populate anidado
        let populateUrl = `/api/rfqs/${id}?populate[empresas][populate][emails]=true&${buildProductosPopulate()}&populate[creado_por][populate][persona]=true&populate[cotizaciones_recibidas][populate][empresa][populate][emails]=true&populate[cotizaciones_recibidas][populate][contacto_responsable]=true`
        console.log('[API /compras/rfqs/[id] GET] Intentando endpoint directo, URL:', populateUrl)
      
      let response: StrapiResponse<StrapiEntity<any>>
      try {
        response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
          populateUrl
        )
      } catch (populateError: any) {
        // Si falla con 400 o 500, intentar con populate más simple
        if (populateError.status === 400 || populateError.status === 500) {
          console.warn('[API /compras/rfqs/[id] GET] Error con populate completo, intentando populate simple:', populateError.message)
          try {
            populateUrl = `/api/rfqs/${id}?populate[empresas]=true&${buildProductosPopulate()}&populate[creado_por]=true&populate[cotizaciones_recibidas]=true`
            response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              populateUrl
            )
          } catch (fallbackError: any) {
            // Si el fallback también falla, intentar sin populate de productos
            console.warn('[API /compras/rfqs/[id] GET] Error con populate simple, intentando sin productos:', fallbackError.message)
            populateUrl = `/api/rfqs/${id}?populate[empresas]=true&populate[creado_por]=true&populate[cotizaciones_recibidas]=true`
            response = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              populateUrl
            )
          }
        } else {
          throw populateError
        }
      }
      
      if (response.data) {
        rfq = response.data
        
        // Log para debugging de relaciones
        const attrs = rfq.attributes || rfq
        
        // Extraer empresas y productos para logging detallado
        let empresasExtracted: any[] = []
        let productosExtracted: any[] = []
        
        // Extraer empresas
        if (attrs.empresas) {
          if (Array.isArray(attrs.empresas)) {
            empresasExtracted = attrs.empresas
          } else if (attrs.empresas.data && Array.isArray(attrs.empresas.data)) {
            empresasExtracted = attrs.empresas.data
          } else if (attrs.empresas.data && !Array.isArray(attrs.empresas.data)) {
            empresasExtracted = [attrs.empresas.data]
          } else if (typeof attrs.empresas === 'object' && attrs.empresas.id) {
            empresasExtracted = [attrs.empresas]
          }
        } else if ((rfq as any).empresas) {
          if (Array.isArray((rfq as any).empresas)) {
            empresasExtracted = (rfq as any).empresas
          } else if ((rfq as any).empresas.data && Array.isArray((rfq as any).empresas.data)) {
            empresasExtracted = (rfq as any).empresas.data
          }
        }
        
        // Extraer productos - manejar múltiples formatos posibles de Strapi v5
        // Los productos pueden venir en diferentes estructuras:
        // 1. Array directo: [{id, documentId, ...}]
        // 2. Objeto con data: {data: [{id, documentId, ...}]}
        // 3. Objeto con data como objeto único: {data: {id, documentId, ...}}
        // 4. En el nivel superior de rfq, no en attributes
        // 5. Como objeto con estructura de relación: {id: X, documentId: Y, ...}
        if (attrs.productos) {
          if (Array.isArray(attrs.productos)) {
            productosExtracted = attrs.productos
          } else if (attrs.productos.data) {
            if (Array.isArray(attrs.productos.data)) {
              productosExtracted = attrs.productos.data
            } else if (attrs.productos.data && typeof attrs.productos.data === 'object') {
              // Si data es un objeto único, convertirlo a array
              productosExtracted = [attrs.productos.data]
            }
          } else if (typeof attrs.productos === 'object' && (attrs.productos.id || attrs.productos.documentId)) {
            // Si es un objeto único con id o documentId, convertirlo a array
            productosExtracted = [attrs.productos]
          }
        }
        // También buscar en el nivel superior de rfq
        if (productosExtracted.length === 0 && (rfq as any).productos) {
          if (Array.isArray((rfq as any).productos)) {
            productosExtracted = (rfq as any).productos
          } else if ((rfq as any).productos.data) {
            if (Array.isArray((rfq as any).productos.data)) {
              productosExtracted = (rfq as any).productos.data
            } else if ((rfq as any).productos.data && typeof (rfq as any).productos.data === 'object') {
              productosExtracted = [(rfq as any).productos.data]
            }
          } else if (typeof (rfq as any).productos === 'object' && ((rfq as any).productos.id || (rfq as any).productos.documentId)) {
            productosExtracted = [(rfq as any).productos]
          }
        }
        
        console.log('[API /compras/rfqs/[id] GET] Estructura de RFQ recibida:', {
          id: rfq.id,
          documentId: rfq.documentId,
          empresasCount: empresasExtracted.length,
          empresasRaw: attrs.empresas || (rfq as any).empresas,
          empresasRawType: typeof (attrs.empresas || (rfq as any).empresas),
          empresasIsArray: Array.isArray(attrs.empresas || (rfq as any).empresas),
          empresasExtracted: empresasExtracted.map((e: any) => ({
            id: e.id,
            documentId: e.documentId,
            nombre: e.attributes?.empresa_nombre || e.empresa_nombre || e.nombre,
          })),
          productosCount: productosExtracted.length,
          productosRaw: attrs.productos || (rfq as any).productos,
          productosRawType: typeof (attrs.productos || (rfq as any).productos),
          productosIsArray: Array.isArray(attrs.productos || (rfq as any).productos),
          productosRawKeys: attrs.productos ? Object.keys(attrs.productos) : (rfq as any).productos ? Object.keys((rfq as any).productos) : [],
          productosRawValue: JSON.stringify(attrs.productos || (rfq as any).productos || null).substring(0, 500),
          productosExtracted: productosExtracted.map((p: any) => ({
            id: p.id,
            documentId: p.documentId,
            nombre: p.attributes?.nombre_libro || p.nombre_libro || p.nombre,
          })),
          // Estructura completa para debugging
          rfqKeys: Object.keys(rfq || {}),
          attrsKeys: Object.keys(attrs || {}),
          // Log completo de la respuesta de Strapi (solo si no hay productos para no saturar)
          strapiResponse: productosExtracted.length === 0 ? JSON.stringify(rfq, null, 2).substring(0, 2000) : 'Productos encontrados, omitiendo log completo',
        })
        
        // Si no se encontraron productos pero sabemos que deberían existir, intentar consulta directa
        if (productosExtracted.length === 0) {
          console.warn('[API /compras/rfqs/[id] GET] ⚠️ No se encontraron productos en la respuesta, intentando consulta directa a Strapi')
          try {
            // Usar documentId en lugar de ID numérico para evitar 404
            const rfqIdForCheck = rfq.documentId || rfq.id
            const directCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs/${rfqIdForCheck}?fields[0]=id&fields[1]=documentId&populate[productos]=true`
            )
            // Normalizar directCheck.data que puede ser array o objeto
            const directCheckData = Array.isArray(directCheck.data) ? directCheck.data[0] : directCheck.data
            const directCheckAttrs = directCheckData ? ((directCheckData as any).attributes || directCheckData) : null
            const directCheckDataAny = directCheckData as any
            console.log('[API /compras/rfqs/[id] GET] Consulta directa a Strapi:', {
              hasData: !!directCheckData,
              productosInDirect: !!(directCheckAttrs?.productos || directCheckDataAny?.productos),
              productosDirectRaw: JSON.stringify(directCheckAttrs?.productos || directCheckDataAny?.productos || null).substring(0, 500),
            })
          } catch (directError: any) {
            console.error('[API /compras/rfqs/[id] GET] Error en consulta directa:', directError.message, {
              status: directError.status,
              rfqId: rfq.id,
              rfqDocumentId: rfq.documentId,
            })
          }
        }
      }
    } catch (directError: any) {
      // Si falla con 404, intentar buscar por documentId o id alternativo
      if (directError.status === 404) {
        const isNumericId = /^\d+$/.test(id)
        console.warn(`[API /compras/rfqs/[id] GET] Error 404 con ID directo "${id}" (${isNumericId ? 'numérico' : 'documentId'}), buscando por filtros alternativos`)
        
        try {
          // Intentar buscar por id numérico si el ID es numérico, o por documentId si no lo es
          let searchParams: URLSearchParams
          if (isNumericId) {
            // Si es numérico, buscar por id numérico
            console.log(`[API /compras/rfqs/[id] GET] Intentando buscar por id numérico: ${id}`)
            searchParams = new URLSearchParams({
              'filters[id][$eq]': id,
              'populate[empresas][populate][emails]': 'true',
              'populate[productos][fields][0]': 'id',
              'populate[productos][fields][1]': 'documentId',
              'populate[productos][fields][2]': 'nombre_libro',
              'populate[productos][fields][3]': 'isbn',
              'populate[productos][fields][4]': 'precio',
              'populate[productos][fields][5]': 'stock',
              'populate[creado_por][populate][persona]': 'true',
              'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
              'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
            })
          } else {
            // Si no es numérico (es un UUID string), buscar por documentId
            console.log(`[API /compras/rfqs/[id] GET] Intentando buscar por documentId: ${id}`)
            searchParams = new URLSearchParams({
              'filters[documentId][$eq]': id,
              'populate[empresas][populate][emails]': 'true',
              'populate[productos][fields][0]': 'id',
              'populate[productos][fields][1]': 'documentId',
              'populate[productos][fields][2]': 'nombre_libro',
              'populate[productos][fields][3]': 'isbn',
              'populate[productos][fields][4]': 'precio',
              'populate[productos][fields][5]': 'stock',
              'populate[creado_por][populate][persona]': 'true',
              'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
              'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
            })
          }
          
          try {
            const filterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?${searchParams.toString()}`
            )
            
            if (filterResponse.data) {
              if (Array.isArray(filterResponse.data) && filterResponse.data.length > 0) {
                rfq = filterResponse.data[0]
                console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada con primer filtro alternativo`)
              } else if (!Array.isArray(filterResponse.data)) {
                rfq = filterResponse.data
                console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada con primer filtro alternativo (objeto único)`)
              } else {
                console.warn(`[API /compras/rfqs/[id] GET] ⚠️ Primer filtro alternativo retornó array vacío`)
              }
            } else {
              console.warn(`[API /compras/rfqs/[id] GET] ⚠️ Primer filtro alternativo no retornó datos`)
            }
          } catch (filterError: any) {
            // Si aún falla, intentar con el filtro alternativo (invertir la búsqueda)
            console.warn(`[API /compras/rfqs/[id] GET] Error con primer filtro (${filterError.status || 'unknown'}): ${filterError.message}, intentando filtro alternativo`)
                    const altSearchParams = new URLSearchParams({
                      ...(isNumericId ? { 'filters[documentId][$eq]': id } : { 'filters[id][$eq]': id }),
                      'populate[empresas][populate][emails]': 'true',
                      'populate[productos][fields][0]': 'id',
                      'populate[productos][fields][1]': 'documentId',
                      'populate[productos][fields][2]': 'nombre_libro',
                      'populate[productos][fields][3]': 'isbn',
                      'populate[productos][fields][4]': 'precio',
                      'populate[productos][fields][5]': 'stock',
                      'populate[creado_por][populate][persona]': 'true',
                      'populate[cotizaciones_recibidas][populate][empresa][populate][emails]': 'true',
                      'populate[cotizaciones_recibidas][populate][contacto_responsable]': 'true',
                    })
            
            try {
              const altFilterResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/rfqs?${altSearchParams.toString()}`
              )
              
              if (altFilterResponse.data) {
                if (Array.isArray(altFilterResponse.data) && altFilterResponse.data.length > 0) {
                  rfq = altFilterResponse.data[0]
                  console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada con filtro alternativo`)
                } else if (!Array.isArray(altFilterResponse.data)) {
                  rfq = altFilterResponse.data
                  console.log(`[API /compras/rfqs/[id] GET] ✅ RFQ encontrada con filtro alternativo (objeto único)`)
                } else {
                  console.warn(`[API /compras/rfqs/[id] GET] ⚠️ Filtro alternativo retornó array vacío`)
                }
              } else {
                console.warn(`[API /compras/rfqs/[id] GET] ⚠️ Filtro alternativo no retornó datos`)
              }
            } catch (altFilterError: any) {
              console.error(`[API /compras/rfqs/[id] GET] ❌ Error con filtro alternativo (${altFilterError.status || 'unknown'}): ${altFilterError.message}`)
            }
          }
        } catch (searchError: any) {
          console.error(`[API /compras/rfqs/[id] GET] ❌ Error en búsqueda por filtros alternativos (${searchError.status || 'unknown'}): ${searchError.message}`)
        }
      } else {
        // Si no es 404, lanzar el error original
        console.error(`[API /compras/rfqs/[id] GET] ❌ Error no es 404 (${directError.status || 'unknown'}): ${directError.message}`)
        throw directError
      }
    }
    }
    
    if (!rfq) {
      console.error(`[API /compras/rfqs/[id] GET] ❌ RFQ no encontrada después de todos los intentos. ID: ${id}`)
      return NextResponse.json(
        {
          success: false,
          error: `RFQ no encontrada con ID: ${id}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`,
          details: {
            id,
            isNumericId: /^\d+$/.test(id),
            hint: 'El ID puede ser un número (id) o un string (documentId). Verifica que la RFQ exista en Strapi.',
          },
        },
        { status: 404 }
      )
    }
    
    // Normalizar la RFQ para asegurar que productos y empresas estén en formato consistente
    const rfqData = rfq
    const rfqAttrs = rfqData.attributes || rfqData
    
    // Extraer y normalizar productos
    let productosNormalizados: any[] = []
    if (rfqAttrs.productos) {
      if (Array.isArray(rfqAttrs.productos)) {
        productosNormalizados = rfqAttrs.productos
      } else if (rfqAttrs.productos.data) {
        if (Array.isArray(rfqAttrs.productos.data)) {
          productosNormalizados = rfqAttrs.productos.data
        } else if (rfqAttrs.productos.data && typeof rfqAttrs.productos.data === 'object') {
          productosNormalizados = [rfqAttrs.productos.data]
        }
      } else if (typeof rfqAttrs.productos === 'object' && (rfqAttrs.productos.id || rfqAttrs.productos.documentId)) {
        productosNormalizados = [rfqAttrs.productos]
      }
    } else if ((rfqData as any).productos) {
      if (Array.isArray((rfqData as any).productos)) {
        productosNormalizados = (rfqData as any).productos
      } else if ((rfqData as any).productos.data) {
        if (Array.isArray((rfqData as any).productos.data)) {
          productosNormalizados = (rfqData as any).productos.data
        } else if ((rfqData as any).productos.data && typeof (rfqData as any).productos.data === 'object') {
          productosNormalizados = [(rfqData as any).productos.data]
        }
      } else if (typeof (rfqData as any).productos === 'object' && ((rfqData as any).productos.id || (rfqData as any).productos.documentId)) {
        productosNormalizados = [(rfqData as any).productos]
      }
    }
    
    // Normalizar empresas - PRESERVAR emails y otras relaciones populadas
    let empresasNormalizadas: any[] = []
    let empresasRaw: any = null
    
    if (rfqAttrs.empresas) {
      empresasRaw = rfqAttrs.empresas
    } else if ((rfqData as any).empresas) {
      empresasRaw = (rfqData as any).empresas
    }
    
    // Log para debugging
    if (empresasRaw) {
      console.log('[API /compras/rfqs/[id] GET] Estructura RAW de empresas:', {
        empresasRawType: typeof empresasRaw,
        isArray: Array.isArray(empresasRaw),
        hasData: !!(empresasRaw as any)?.data,
        empresasRawKeys: empresasRaw && typeof empresasRaw === 'object' ? Object.keys(empresasRaw) : [],
        firstEmpresa: Array.isArray(empresasRaw) && empresasRaw.length > 0 ? {
          id: empresasRaw[0].id,
          documentId: empresasRaw[0].documentId,
          hasAttributes: !!(empresasRaw[0].attributes),
          attributesKeys: empresasRaw[0].attributes ? Object.keys(empresasRaw[0].attributes) : [],
          emails: empresasRaw[0].emails || empresasRaw[0].attributes?.emails,
          emailsType: typeof (empresasRaw[0].emails || empresasRaw[0].attributes?.emails),
          emailsIsArray: Array.isArray(empresasRaw[0].emails || empresasRaw[0].attributes?.emails),
        } : null,
      })
    }
    
    if (empresasRaw) {
      if (Array.isArray(empresasRaw)) {
        // Preservar toda la estructura de cada empresa, incluyendo emails
        empresasNormalizadas = empresasRaw.map((emp: any) => {
          // Asegurar que se preserve la estructura completa
          return {
            ...emp,
            attributes: emp.attributes || emp,
          }
        })
      } else if (empresasRaw.data) {
        if (Array.isArray(empresasRaw.data)) {
          empresasNormalizadas = empresasRaw.data.map((emp: any) => ({
            ...emp,
            attributes: emp.attributes || emp,
          }))
        } else if (empresasRaw.data && typeof empresasRaw.data === 'object') {
          empresasNormalizadas = [{
            ...empresasRaw.data,
            attributes: empresasRaw.data.attributes || empresasRaw.data,
          }]
        }
      } else if (typeof empresasRaw === 'object' && empresasRaw.id) {
        empresasNormalizadas = [{
          ...empresasRaw,
          attributes: empresasRaw.attributes || empresasRaw,
        }]
      }
    }
    
    // Si las empresas no tienen emails populados, obtenerlos manualmente
    for (let i = 0; i < empresasNormalizadas.length; i++) {
      const emp = empresasNormalizadas[i]
      const empAttrs = emp.attributes || emp
      const emails = emp.emails || empAttrs.emails
      
      // Si no hay emails o el array está vacío, obtenerlos de Strapi
      if (!emails || (Array.isArray(emails) && emails.length === 0)) {
        try {
          const empresaId = emp.id || empAttrs.id
          const empresaDocId = emp.documentId || empAttrs.documentId
          
          if (empresaId || empresaDocId) {
            const empresaIdToUse = empresaDocId || empresaId
            console.log(`[API /compras/rfqs/[id] GET] Obteniendo emails para empresa ${empresaIdToUse}`)
            
            const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/empresas/${empresaIdToUse}?populate[emails]=true`
            )
            
            if (empresaResponse.data) {
              const empresaData = Array.isArray(empresaResponse.data) 
                ? empresaResponse.data[0] 
                : empresaResponse.data
              
              const empresaAttrs = empresaData.attributes || empresaData
              const empresaDataAny = empresaData as any
              const empresaEmails = empresaDataAny.emails || empresaAttrs.emails
              
              if (empresaEmails && (Array.isArray(empresaEmails) ? empresaEmails.length > 0 : true)) {
                // Agregar emails a la empresa normalizada
                if (emp.attributes) {
                  emp.attributes.emails = empresaEmails
                } else {
                  emp.emails = empresaEmails
                }
                empresasNormalizadas[i] = emp
                
                console.log(`[API /compras/rfqs/[id] GET] ✅ Emails obtenidos para empresa ${empresaIdToUse}:`, {
                  emailsCount: Array.isArray(empresaEmails) ? empresaEmails.length : 1,
                  firstEmail: Array.isArray(empresaEmails) ? empresaEmails[0] : empresaEmails,
                })
              }
            }
          }
        } catch (err: any) {
          console.warn(`[API /compras/rfqs/[id] GET] ⚠️ No se pudieron obtener emails para empresa:`, err.message)
        }
      }
    }
    
    // Log empresas normalizadas con emails
    if (empresasNormalizadas.length > 0) {
      console.log('[API /compras/rfqs/[id] GET] Empresas normalizadas (después de poblar emails):', {
        count: empresasNormalizadas.length,
        firstEmpresa: {
          id: empresasNormalizadas[0].id,
          documentId: empresasNormalizadas[0].documentId,
          nombre: empresasNormalizadas[0].attributes?.nombre || empresasNormalizadas[0].attributes?.empresa_nombre,
          hasEmails: !!(empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails),
          emails: empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails,
          emailsType: typeof (empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails),
          emailsIsArray: Array.isArray(empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails),
          emailsCount: Array.isArray(empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails) 
            ? (empresasNormalizadas[0].emails || empresasNormalizadas[0].attributes?.emails).length 
            : 0,
        },
      })
    }
    
    // Construir RFQ normalizada
    const rfqNormalizada = {
      ...rfqData,
      id: rfqData.id,
      documentId: rfqData.documentId,
      attributes: {
        ...rfqAttrs,
        productos: productosNormalizados,
        empresas: empresasNormalizadas,
      },
      // También en el nivel superior para compatibilidad
      productos: productosNormalizados,
      empresas: empresasNormalizadas,
    }
    
    console.log('[API /compras/rfqs/[id] GET] RFQ normalizada antes de retornar:', {
      id: rfqNormalizada.id,
      documentId: rfqNormalizada.documentId,
      productosCount: productosNormalizados.length,
      empresasCount: empresasNormalizadas.length,
      productosNormalizados: productosNormalizados.map((p: any) => ({
        id: p.id,
        documentId: p.documentId,
        nombre: p.attributes?.nombre_libro || p.nombre_libro || p.nombre,
      })),
    })
    
    return NextResponse.json({
      success: true,
      data: rfqNormalizada,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] GET] Error completo:', {
      message: error.message,
      status: error.status,
      stack: error.stack,
      name: error.name,
      details: error.details,
    })
    
    // Asegurar que siempre devolvemos una respuesta JSON válida
    const statusCode = error.status || 500
    const errorMessage = error.message || 'Error al obtener RFQ'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: statusCode,
        details: error.details || undefined,
      },
      { status: statusCode }
    )
  }
}

/**
 * PUT /api/compras/rfqs/[id]
 * Actualiza una RFQ
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined
  try {
    const paramsResolved = await params
    id = paramsResolved.id
    const body = await request.json()
    
    const updateData: any = {
      data: {},
    }
    
    if (body.nombre) updateData.data.nombre = body.nombre.trim()
    if (body.descripcion !== undefined) updateData.data.descripcion = body.descripcion?.trim() || null
    if (body.fecha_solicitud) updateData.data.fecha_solicitud = body.fecha_solicitud
    if (body.fecha_vencimiento !== undefined) updateData.data.fecha_vencimiento = body.fecha_vencimiento || null
    if (body.estado) updateData.data.estado = body.estado
    if (body.moneda) updateData.data.moneda = body.moneda
    if (body.notas_internas !== undefined) updateData.data.notas_internas = body.notas_internas?.trim() || null
    if (body.activo !== undefined) updateData.data.activo = body.activo
    
    // Actualizar productos_cantidades si viene en el body (usar documentId como key)
    if (body.productos_cantidades !== undefined) {
      // Si viene un objeto con documentId como keys, usarlo directamente
      // Si viene con IDs numéricos, convertirlos a documentId
      const cantidadesConDocumentId: Record<string, number> = {}
      
      if (typeof body.productos_cantidades === 'object' && !Array.isArray(body.productos_cantidades)) {
        // Convertir keys de IDs numéricos a documentId
        for (const [key, cantidad] of Object.entries(body.productos_cantidades)) {
          if (typeof cantidad === 'number' && cantidad > 0) {
            // Si la key es un número, buscar el documentId
            const keyNum = parseInt(key)
            if (!isNaN(keyNum)) {
              try {
                const productoCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                  `/api/libros/${keyNum}?fields[0]=id&fields[1]=documentId`
                )
                if (productoCheck.data) {
                  // Normalizar productoCheck.data que puede ser array o objeto
                  const productoData: StrapiEntity<any> | null = Array.isArray(productoCheck.data)
                    ? (productoCheck.data.length > 0 ? productoCheck.data[0] : null)
                    : productoCheck.data || null
                  const productoDataAny = productoData as any
                  const docId = productoData?.documentId || productoDataAny?.documentId
                  if (docId) {
                    cantidadesConDocumentId[docId] = cantidad
                    console.log(`[API /compras/rfqs/[id] PUT] ✅ Cantidad convertida: ID ${keyNum} → documentId ${docId}: ${cantidad}`)
                  } else {
                    // Si no tiene documentId, usar la key original
                    cantidadesConDocumentId[key] = cantidad
                  }
                }
              } catch (err) {
                // Si falla, usar la key original (puede ser que ya sea documentId)
                cantidadesConDocumentId[key] = cantidad
              }
            } else {
              // La key ya es un documentId (UUID), usarla directamente
              cantidadesConDocumentId[key] = cantidad
            }
          }
        }
        updateData.data.productos_cantidades = cantidadesConDocumentId
        console.log('[API /compras/rfqs/[id] PUT] Productos cantidades actualizadas (con documentId):', cantidadesConDocumentId)
      } else {
        // Si viene en otro formato, guardarlo tal cual
        updateData.data.productos_cantidades = body.productos_cantidades
      }
    }
    
    // Actualizar relaciones - validar y convertir IDs correctamente
    if (body.empresas && Array.isArray(body.empresas)) {
      const empresasIds: number[] = []
      for (const empresaId of body.empresas) {
        const idNum = typeof empresaId === 'string' ? parseInt(empresaId) : empresaId
        if (!isNaN(idNum) && idNum > 0) {
          empresasIds.push(idNum)
        } else {
          // Intentar buscar por documentId si el ID no es numérico válido
          try {
            const empresaResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/empresas/${empresaId}`
            )
            if (empresaResponse.data) {
              const empresa = Array.isArray(empresaResponse.data) ? empresaResponse.data[0] : empresaResponse.data
              const empresaIdInterno = empresa.id
              if (empresaIdInterno) {
                empresasIds.push(Number(empresaIdInterno))
              }
            }
          } catch (err: any) {
            console.warn(`[API /compras/rfqs/[id] PUT] No se pudo encontrar empresa con ID: ${empresaId}`, err.message)
          }
        }
      }
      if (empresasIds.length > 0) {
        // En Strapi v5, para relaciones manyToMany, usar directamente array de IDs numéricos
        // NO usar { connect: [ids] } que es para manyToOne
        updateData.data.empresas = empresasIds
        console.log('[API /compras/rfqs/[id] PUT] Empresas a conectar:', {
          empresasIds,
          empresasCount: empresasIds.length,
          empresasOriginales: body.empresas,
          empresasIdsType: empresasIds.map(id => ({ id, type: typeof id })),
          formatUsado: 'array directo (manyToMany)',
        })
        
        // Verificar que las empresas existen en Strapi antes de conectar
        for (const empresaId of empresasIds) {
          try {
            const empresaCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/empresas/${empresaId}?fields[0]=id&fields[1]=nombre`
            )
            // Manejar caso donde data puede ser array o objeto
            const empresaData: StrapiEntity<any> | null = Array.isArray(empresaCheck.data) 
              ? (empresaCheck.data.length > 0 ? empresaCheck.data[0] : null)
              : empresaCheck.data || null
            const empresaDataAny = empresaData as any
            console.log(`[API /compras/rfqs/[id] PUT] ✅ Empresa ${empresaId} existe en Strapi:`, {
              id: empresaData?.id,
              documentId: empresaData?.documentId,
              nombre: empresaData?.attributes?.nombre || empresaDataAny?.nombre || empresaData?.attributes?.empresa_nombre || empresaDataAny?.empresa_nombre,
            })
          } catch (err: any) {
            console.error(`[API /compras/rfqs/[id] PUT] ❌ Empresa ${empresaId} NO existe en Strapi:`, {
              error: err.message,
              status: err.status,
            })
          }
        }
      } else if (body.empresas && body.empresas.length > 0) {
        // Si se enviaron empresas pero ninguna fue válida, lanzar error
        console.error('[API /compras/rfqs/[id] PUT] ❌ No se encontraron empresas válidas:', {
          empresasEnviadas: body.empresas,
          empresasEnviadasType: body.empresas.map((e: any) => ({ e, type: typeof e })),
        })
        throw new Error('No se encontraron empresas válidas para conectar')
      } else {
        console.warn('[API /compras/rfqs/[id] PUT] ⚠️ No se enviaron empresas en el body')
      }
    }
    
    if (body.productos && Array.isArray(body.productos)) {
      // IMPORTANTE: Enviar documentId directamente a Strapi para la relación manyToMany
      const productosIds: (number | string)[] = []
      for (const productoId of body.productos) {
        // Determinar si es documentId (UUID) o ID numérico
        const isUUID = typeof productoId === 'string' && productoId.length > 10 && !/^\d+$/.test(productoId)
        
        if (isUUID) {
          // Es un documentId, usarlo directamente
          productosIds.push(productoId)
          console.log(`[API /compras/rfqs/[id] PUT] ✅ Producto agregado con documentId: ${productoId}`)
        } else {
          // Es un número o string numérico, obtener el documentId primero
          const idNum = typeof productoId === 'string' ? parseInt(productoId) : productoId
          
          if (!isNaN(idNum) && idNum > 0) {
            try {
              console.log(`[API /compras/rfqs/[id] PUT] 🔍 Obteniendo documentId del producto con ID numérico: ${idNum}`)
              const productoCheck = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
                `/api/libros/${idNum}?fields[0]=id&fields[1]=documentId`
              )
              
              if (productoCheck.data) {
                // Normalizar productoCheck.data que puede ser array o objeto
                const productoData: StrapiEntity<any> | null = Array.isArray(productoCheck.data)
                  ? (productoCheck.data.length > 0 ? productoCheck.data[0] : null)
                  : productoCheck.data || null
                const productoDataAny = productoData as any
                const docId = productoData?.documentId || productoDataAny?.documentId
                
                if (docId) {
                  productosIds.push(docId)
                  console.log(`[API /compras/rfqs/[id] PUT] ✅ Producto ${idNum} → documentId: ${docId} (usando documentId)`)
                } else {
                  // Fallback: si no hay documentId, usar el ID numérico
                  productosIds.push(idNum)
                  console.warn(`[API /compras/rfqs/[id] PUT] ⚠️ Producto ${idNum} no tiene documentId, usando ID numérico como fallback`)
                }
              } else {
                console.error(`[API /compras/rfqs/[id] PUT] ❌ Producto ${idNum} no encontrado en Strapi`)
              }
            } catch (err: any) {
              if (err.status === 404) {
                console.error(`[API /compras/rfqs/[id] PUT] ❌ ID numérico ${idNum} no existe en Strapi`)
              } else {
                console.error(`[API /compras/rfqs/[id] PUT] Error al obtener producto ${idNum}:`, err.message)
              }
            }
          } else {
            console.error(`[API /compras/rfqs/[id] PUT] ❌ ID de producto inválido: ${productoId}`)
          }
        }
      }
      if (productosIds.length > 0) {
        // En Strapi v5, para relaciones manyToMany, usar directamente array de documentIds (strings)
        // Strapi acepta documentId en relaciones manyToMany
        updateData.data.productos = productosIds
        console.log('[API /compras/rfqs/[id] PUT] Productos a conectar (con documentId):', {
          productosIds,
          productosCount: productosIds.length,
          productosOriginales: body.productos,
          productosIdsType: productosIds.map(id => ({ id, type: typeof id })),
          formatUsado: 'array directo de documentIds (manyToMany)',
        })
      } else if (body.productos && body.productos.length > 0) {
        // Si se enviaron productos pero ninguno fue válido, lanzar error
        console.error('[API /compras/rfqs/[id] PUT] ❌ No se encontraron productos válidos:', {
          productosEnviados: body.productos,
          productosEnviadosType: body.productos.map((p: any) => ({ p, type: typeof p })),
        })
        throw new Error('No se encontraron productos válidos para conectar. Verifica que los productos existan en Strapi.')
      } else {
        console.warn('[API /compras/rfqs/[id] PUT] ⚠️ No se enviaron productos en el body')
      }
    }
    
    console.log('[API /compras/rfqs/[id] PUT] Datos a actualizar:', {
      id,
      tieneEmpresas: !!(updateData.data.empresas),
      empresasCount: Array.isArray(updateData.data.empresas) ? updateData.data.empresas.length : 0,
      empresasIds: Array.isArray(updateData.data.empresas) ? updateData.data.empresas : [],
      tieneProductos: !!(updateData.data.productos),
      productosCount: Array.isArray(updateData.data.productos) ? updateData.data.productos.length : 0,
      productosIds: Array.isArray(updateData.data.productos) ? updateData.data.productos : [],
      updateDataCompleto: JSON.stringify(updateData, null, 2),
    })
    
    // Intentar primero con el ID recibido
    let response: StrapiResponse<StrapiEntity<any>>
    try {
      console.log('[API /compras/rfqs/[id] PUT] Enviando PUT a Strapi:', {
        url: `/api/rfqs/${id}`,
        updateDataProductos: updateData.data.productos,
        updateDataEmpresas: updateData.data.empresas,
        updateDataKeys: Object.keys(updateData.data),
      })
      response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
        `/api/rfqs/${id}`,
        updateData
      )
      // Manejar caso donde data puede ser array o objeto
      const responseData = Array.isArray(response.data) ? response.data[0] : response.data
      const responseDataAny = responseData as any
      console.log('[API /compras/rfqs/[id] PUT] Respuesta PUT de Strapi:', {
        success: !!responseData,
        responseId: responseData?.id,
        responseDocumentId: responseData?.documentId,
        responseHasProductos: !!(responseData?.attributes?.productos || responseDataAny?.productos),
        responseProductosRaw: responseData?.attributes?.productos || responseDataAny?.productos,
      })
    } catch (putError: any) {
      // Si falla con 404, buscar la RFQ para obtener el ID correcto
      if (putError.status === 404) {
        console.warn('[API /compras/rfqs/[id] PUT] Error 404 con ID, buscando RFQ para obtener ID correcto:', id)
        try {
          // Intentar buscar por documentId si el ID no es numérico, o por id si es numérico
          const isNumericId = /^\d+$/.test(id)
          let searchResponse: StrapiResponse<StrapiEntity<any>>
          
          if (isNumericId) {
            // Si es numérico, buscar por documentId
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[documentId][$eq]=${id}`
            )
          } else {
            // Si no es numérico, buscar por id numérico
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[id][$eq]=${id}`
            )
          }
          
          if (searchResponse.data) {
            const rfqData = Array.isArray(searchResponse.data) ? searchResponse.data[0] : searchResponse.data
            if (rfqData) {
              // Usar documentId si está disponible, sino usar id
              const correctId = rfqData.documentId || rfqData.id || id
              console.log('[API /compras/rfqs/[id] PUT] RFQ encontrada, usando ID correcto:', correctId)
              response = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(
                `/api/rfqs/${correctId}`,
                updateData
              )
            } else {
              throw putError
            }
          } else {
            throw putError
          }
        } catch (searchError: any) {
          console.error('[API /compras/rfqs/[id] PUT] Error al buscar RFQ:', searchError)
          throw putError
        }
      } else {
        throw putError
      }
    }
    
    // IMPORTANTE: La respuesta del PUT no incluye las relaciones populadas
    // Necesitamos hacer un GET con populate completo para obtener los datos completos
    // Manejar caso donde data puede ser array o objeto
    const responseData = Array.isArray(response.data) ? response.data[0] : response.data
    const rfqIdFinal = responseData?.documentId || responseData?.id || id
    console.log('[API /compras/rfqs/[id] PUT] Obteniendo RFQ actualizada con relaciones populadas:', rfqIdFinal)
    
    try {
      // IMPORTANTE: Para productos, usar populate con campos específicos para evitar error con portada_libro
      // populate[productos]=* causa error "Invalid key portada_libro"
      // populate[productos]=true no popula correctamente
      // Solución: usar populate[productos][fields] para especificar campos exactos
      const populateUrl = `/api/rfqs/${rfqIdFinal}?populate[empresas][populate][emails]=true&${buildProductosPopulate()}&populate[creado_por][populate][persona]=true&populate[cotizaciones_recibidas][populate][empresa][populate][emails]=true&populate[cotizaciones_recibidas][populate][contacto_responsable]=true`
      console.log('[API /compras/rfqs/[id] PUT] Haciendo GET con populate para obtener relaciones:', populateUrl)
      const updatedRFQ = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(populateUrl)
      // Manejar caso donde data puede ser array o objeto
      const updatedRFQData = Array.isArray(updatedRFQ.data) ? updatedRFQ.data[0] : updatedRFQ.data
      console.log('[API /compras/rfqs/[id] PUT] Respuesta GET con populate:', {
        hasData: !!updatedRFQData,
        dataId: updatedRFQData?.id,
        dataDocumentId: updatedRFQData?.documentId,
        hasAttributes: !!(updatedRFQData?.attributes),
        attributesKeys: updatedRFQData?.attributes ? Object.keys(updatedRFQData.attributes) : [],
        productosInAttributes: !!(updatedRFQData?.attributes?.productos),
        productosInData: !!(updatedRFQData?.productos),
        productosRaw: updatedRFQData?.attributes?.productos || updatedRFQData?.productos,
        productosRawType: typeof (updatedRFQData?.attributes?.productos || updatedRFQData?.productos),
        productosIsArray: Array.isArray(updatedRFQData?.attributes?.productos || updatedRFQData?.productos),
        productosRawKeys: updatedRFQData?.attributes?.productos ? Object.keys(updatedRFQData.attributes.productos) : updatedRFQData?.productos ? Object.keys(updatedRFQData.productos) : [],
        productosRawValue: JSON.stringify(updatedRFQData?.attributes?.productos || updatedRFQData?.productos || null).substring(0, 1000),
        // Log completo de la respuesta para debugging
        fullResponse: JSON.stringify(updatedRFQData, null, 2).substring(0, 2000),
      })
      
      if (updatedRFQData) {
        const rfqData = updatedRFQData
        const rfqAttrs = rfqData.attributes || rfqData
        
        // Extraer productos con manejo robusto
        let productos: any[] = []
        if (rfqAttrs.productos) {
          if (Array.isArray(rfqAttrs.productos)) {
            productos = rfqAttrs.productos
          } else if (rfqAttrs.productos.data && Array.isArray(rfqAttrs.productos.data)) {
            productos = rfqAttrs.productos.data
          }
        } else if (rfqData.productos) {
          if (Array.isArray(rfqData.productos)) {
            productos = rfqData.productos
          } else if (rfqData.productos.data && Array.isArray(rfqData.productos.data)) {
            productos = rfqData.productos.data
          }
        }
        
        // Extraer empresas con manejo robusto
        let empresas: any[] = []
        if (rfqAttrs.empresas) {
          if (Array.isArray(rfqAttrs.empresas)) {
            empresas = rfqAttrs.empresas
          } else if (rfqAttrs.empresas.data && Array.isArray(rfqAttrs.empresas.data)) {
            empresas = rfqAttrs.empresas.data
          } else if (rfqAttrs.empresas.data && !Array.isArray(rfqAttrs.empresas.data)) {
            empresas = [rfqAttrs.empresas.data]
          } else if (typeof rfqAttrs.empresas === 'object' && rfqAttrs.empresas.id) {
            empresas = [rfqAttrs.empresas]
          }
        } else if (rfqData.empresas) {
          if (Array.isArray(rfqData.empresas)) {
            empresas = rfqData.empresas
          } else if (rfqData.empresas.data && Array.isArray(rfqData.empresas.data)) {
            empresas = rfqData.empresas.data
          }
        }
        
        console.log('[API /compras/rfqs/[id] PUT] RFQ obtenida con relaciones:', {
          id: rfqData.id,
          documentId: rfqData.documentId,
          empresasCount: empresas.length,
          empresasRaw: rfqAttrs.empresas || rfqData.empresas,
          empresasRawType: typeof (rfqAttrs.empresas || rfqData.empresas),
          empresasIsArray: Array.isArray(rfqAttrs.empresas || rfqData.empresas),
          empresasRawKeys: rfqAttrs.empresas ? Object.keys(rfqAttrs.empresas) : rfqData.empresas ? Object.keys(rfqData.empresas) : [],
          empresasStructure: empresas.length > 0 ? {
            firstEmpresa: empresas[0],
            keys: Object.keys(empresas[0] || {}),
            hasAttributes: !!(empresas[0]?.attributes),
          } : null,
          productosCount: productos.length,
          productosRaw: rfqAttrs.productos || rfqData.productos,
          productosRawType: typeof (rfqAttrs.productos || rfqData.productos),
          productosIsArray: Array.isArray(rfqAttrs.productos || rfqData.productos),
          productosRawKeys: rfqAttrs.productos ? Object.keys(rfqAttrs.productos) : rfqData.productos ? Object.keys(rfqData.productos) : [],
          productosRawValue: JSON.stringify(rfqAttrs.productos || rfqData.productos || null).substring(0, 500),
          productosStructure: productos.length > 0 ? {
            firstProducto: productos[0],
            keys: Object.keys(productos[0] || {}),
            hasAttributes: !!(productos[0]?.attributes),
          } : null,
          // Log completo de la estructura
          rfqDataKeys: Object.keys(rfqData || {}),
          rfqAttrsKeys: Object.keys(rfqAttrs || {}),
        })
        
        return NextResponse.json({
          success: true,
          data: updatedRFQ.data,
          message: 'RFQ actualizada exitosamente',
        }, { status: 200 })
      }
    } catch (getError: any) {
      console.warn('[API /compras/rfqs/[id] PUT] Error al obtener RFQ actualizada, retornando respuesta del PUT:', getError.message)
      // Si falla el GET, retornar la respuesta del PUT (sin relaciones populadas)
    }
    
    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'RFQ actualizada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] PUT] Error:', error)
    
    // Manejar errores de Strapi
    let errorMessage = error.message || 'Error al actualizar RFQ'
    let statusCode = error.status || 500
    
    if (error.status === 404) {
      // Un 404 puede significar que la RFQ no se encontró con ese ID, no necesariamente que el content type no existe
      errorMessage = `RFQ no encontrada con ID: ${id ?? 'desconocido'}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`
      statusCode = 404
    } else if (error.response?.data) {
      // Intentar extraer mensaje de error de Strapi
      const strapiError = error.response.data
      if (strapiError.error?.message) {
        errorMessage = strapiError.error.message
      } else if (typeof strapiError === 'string') {
        errorMessage = strapiError
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: statusCode,
      },
      { status: statusCode }
    )
  }
}

/**
 * DELETE /api/compras/rfqs/[id]
 * Elimina (soft delete) una RFQ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined
  try {
    const paramsResolved = await params
    id = paramsResolved.id
    
    // Soft delete: marcar como inactiva
    // En Strapi v5, para operaciones PUT/DELETE debemos usar documentId, no el id numérico
    console.log('[API /compras/rfqs/[id] DELETE] Iniciando eliminación:', {
      id,
      isNumeric: /^\d+$/.test(id),
      url: `/api/rfqs/${id}`,
    })
    
    try {
      // Intentar primero con el ID recibido (puede ser documentId o id numérico)
      const deleteResponse = await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(`/api/rfqs/${id}`, {
        data: {
          activo: false,
        },
      })
      
      console.log('[API /compras/rfqs/[id] DELETE] ✅ RFQ eliminada exitosamente:', {
        id,
        responseData: deleteResponse.data,
      })
    } catch (deleteError: any) {
      // Si falla con 404, buscar la RFQ para obtener el documentId correcto
      if (deleteError.status === 404) {
        console.warn('[API /compras/rfqs/[id] DELETE] Error 404 con ID, buscando RFQ para obtener documentId correcto:', id)
        try {
          const isNumericId = /^\d+$/.test(id)
          let searchResponse: StrapiResponse<StrapiEntity<any>>
          
          if (isNumericId) {
            // Si es numérico, buscar por id numérico para obtener el documentId
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[id][$eq]=${id}`
            )
          } else {
            // Si es documentId, buscar por documentId
            searchResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
              `/api/rfqs?filters[documentId][$eq]=${id}`
            )
          }
          
          if (searchResponse.data) {
            const rfqData = Array.isArray(searchResponse.data) ? searchResponse.data[0] : searchResponse.data
            if (rfqData) {
              // Usar documentId si está disponible, sino usar el id original
              const correctId = rfqData.documentId || rfqData.id || id
              console.log('[API /compras/rfqs/[id] DELETE] RFQ encontrada, usando documentId:', {
                idOriginal: id,
                documentId: rfqData.documentId,
                id: rfqData.id,
                idUsado: correctId,
              })
              await strapiClient.put<StrapiResponse<StrapiEntity<any>>>(`/api/rfqs/${correctId}`, {
                data: {
                  activo: false,
                },
              })
            } else {
              throw deleteError
            }
          } else {
            throw deleteError
          }
        } catch (searchError: any) {
          console.error('[API /compras/rfqs/[id] DELETE] Error al buscar RFQ:', searchError)
          throw deleteError
        }
      } else {
        throw deleteError
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'RFQ eliminada exitosamente',
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /compras/rfqs/[id] DELETE] Error:', error)
    
    // Manejar errores de Strapi
    let errorMessage = error.message || 'Error al eliminar RFQ'
    let statusCode = error.status || 500
    
    if (error.status === 404) {
      // Un 404 puede significar que la RFQ no se encontró con ese ID, no necesariamente que el content type no existe
      errorMessage = `RFQ no encontrada con ID: ${id ?? 'desconocido'}. Verifica que el ID sea correcto (puede ser id numérico o documentId).`
      statusCode = 404
    } else if (error.response?.data) {
      // Intentar extraer mensaje de error de Strapi
      const strapiError = error.response.data
      if (strapiError.error?.message) {
        errorMessage = strapiError.error.message
      } else if (typeof strapiError === 'string') {
        errorMessage = strapiError
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: statusCode,
      },
      { status: statusCode }
    )
  }
}

