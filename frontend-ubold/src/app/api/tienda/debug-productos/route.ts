/**
 * Endpoint de debug para inspeccionar productos en Strapi
 * Útil para ver qué IDs existen y la estructura real de los datos
 */

import { NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Proteger endpoint de debug en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Este endpoint está deshabilitado en producción' },
      { status: 403 }
    )
  }
  
  try {
    console.log('[DEBUG /tienda/debug-productos] Obteniendo todos los productos...')
    
    // Obtener todos los productos
    const response = await strapiClient.get<any>(
      `/api/libros?populate=*&pagination[pageSize]=1000`
    )
    
    const productos = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : [])
    
    // Analizar estructura
    const analisis = {
      total: productos.length,
      productos: productos.map((p: any, index: number) => ({
        indice: index + 1,
        id: p.id,
        documentId: p.documentId,
        nombre: p.nombre_libro || p.NOMBRE_LIBRO || p.nombreLibro || 'Sin nombre',
        tieneAttributes: !!p.attributes,
        estructura: {
          keysDirectas: Object.keys(p).filter(k => 
            !['id', 'documentId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'localizations'].includes(k)
          ).slice(0, 10),
          keysAttributes: p.attributes ? Object.keys(p.attributes).slice(0, 10) : [],
        },
        portada_libro: p.portada_libro || p.PORTADA_LIBRO || p.attributes?.portada_libro || null,
      })),
      idsDisponibles: productos.map((p: any) => ({
        id: p.id,
        documentId: p.documentId,
        nombre: p.nombre_libro || p.NOMBRE_LIBRO || p.nombreLibro || 'Sin nombre',
      })),
      primerProductoCompleto: productos[0] || null,
    }
    
    return NextResponse.json({
      success: true,
      analisis,
      mensaje: `Se encontraron ${productos.length} productos en Strapi`,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[DEBUG /tienda/debug-productos] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener productos',
        detalles: error.details,
      },
      { status: error.status || 500 }
    )
  }
}

