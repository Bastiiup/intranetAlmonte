/**
 * API Route para diagnosticar qué content types están disponibles en Strapi
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const resultados: Array<{
    endpoint: string
    existe: boolean
    error?: string
    status?: number
    tieneDatos?: boolean
  }> = []

  // Lista amplia de posibles nombres de content types relacionados con productos/libros
  const posiblesContentTypes = [
    // Basados en lo que sabemos que funciona
    'wo-clientes', // Sabemos que este existe (chat funciona)
    'intranet-chats', // Sabemos que este existe (chat funciona)
    
    // Variaciones de "product-libro-edicion"
    'product-libro-edicion',
    'product-libro-edicions',
    'producto-libro-edicion',
    'producto-libro-edicions',
    'product-libro-ediciones',
    'producto-libro-ediciones',
    
    // Variaciones simples
    'libro-edicion',
    'libro-edicions',
    'libro-ediciones',
    'edicion',
    'edicions',
    'ediciones',
    'libro',
    'libros',
    'book',
    'books',
    
    // Variaciones de producto
    'producto',
    'productos',
    'product',
    'products',
    
    // Variaciones con prefijos
    'ecommerce-productos',
    'ecommerce-products',
    'ecommerce-producto',
    'ecommerce-product',
    'tienda-productos',
    'tienda-products',
    'tienda-producto',
    'tienda-product',
    'woocommerce-products',
    'woocommerce-productos',
    'wo-products',
    'wo-productos',
    
    // Otras variaciones posibles
    'product-libro',
    'producto-libro',
    'libro-producto',
    'libro-product',
  ]

  // Probar cada content type
  for (const contentType of posiblesContentTypes) {
    try {
      const response = await strapiClient.get<any>(`/api/${contentType}?pagination[pageSize]=1`)
      
      // Si llegamos aquí, el endpoint existe
      const tieneDatos = Array.isArray(response.data) 
        ? response.data.length > 0 
        : response.data !== undefined && response.data !== null
      
      resultados.push({
        endpoint: `/api/${contentType}`,
        existe: true,
        tieneDatos,
      })
    } catch (err: any) {
      // Si es 404, no existe
      // Si es 403/401, existe pero no tenemos permisos
      // Si es otro error, puede existir pero tener problemas
      const status = err.status || 500
      const existe = status !== 404
      
      resultados.push({
        endpoint: `/api/${contentType}`,
        existe,
        error: err.message || `HTTP ${status}`,
        status,
      })
    }
  }

  // Intentar obtener content types desde Content Type Builder API
  let contentTypesFromAPI: any = null
  try {
    const ctResponse = await fetch(`${STRAPI_API_URL}/api/content-type-builder/content-types`, {
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
      },
    })
    if (ctResponse.ok) {
      contentTypesFromAPI = await ctResponse.json()
    }
  } catch (err) {
    // Si falla, no es crítico
  }

  // Filtrar resultados
  const existentes = resultados.filter(r => r.existe)
  const conDatos = resultados.filter(r => r.tieneDatos)
  const conErrores = resultados.filter(r => r.error && r.status !== 404)

  return NextResponse.json({
    success: true,
    resumen: {
      totalProbados: resultados.length,
      existentes: existentes.length,
      conDatos: conDatos.length,
      conErroresPermisos: conErrores.length,
    },
    resultados,
    existentes: existentes.map(r => r.endpoint),
    conDatos: conDatos.map(r => r.endpoint),
    conErroresPermisos: conErrores.map(r => ({
      endpoint: r.endpoint,
      error: r.error,
      status: r.status,
    })),
    contentTypesFromAPI,
  }, { status: 200 })
}

