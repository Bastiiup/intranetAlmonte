import { NextRequest, NextResponse } from 'next/server'
import strapiClient from '@/lib/strapi/client'
import { logActivity, createLogDescription } from '@/lib/logging'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validar que el ID no sea una palabra reservada
    const reservedWords = ['productos', 'categorias', 'etiquetas', 'pedidos', 'facturas', 'marcas', 'obras', 'sellos', 'serie-coleccion']
    if (reservedWords.includes(id.toLowerCase())) {
      console.warn('[API /tienda/autores/[id] PUT] ⚠️ Intento de acceso a ruta reservada:', id)
      return NextResponse.json(
        { 
          success: false,
          error: `Ruta no válida. La ruta /api/tienda/autores/${id} no existe. Use /api/tienda/${id} en su lugar.`,
          data: null,
          hint: `Si está buscando ${id}, use el endpoint: /api/tienda/${id}`,
        },
        { status: 404 }
      )
    }
    
    const body = await request.json()
    console.log('[API Autores PUT] ✏️ Actualizando autor:', id, body)

    const autorEndpoint = '/api/autores'
    
    // Primero obtener el autor de Strapi para obtener el documentId
    let autorStrapi: any
    let documentId: string | null = null
    try {
      const autorResponse = await strapiClient.get<any>(`${autorEndpoint}?filters[id][$eq]=${id}&populate=*`)
      let autores: any[] = []
      if (Array.isArray(autorResponse)) {
        autores = autorResponse
      } else if (autorResponse.data && Array.isArray(autorResponse.data)) {
        autores = autorResponse.data
      } else if (autorResponse.data) {
        autores = [autorResponse.data]
      }
      autorStrapi = autores[0]
      documentId = autorStrapi?.documentId || autorStrapi?.data?.documentId || id
    } catch (error: any) {
      console.warn('[API Autores PUT] ⚠️ No se pudo obtener autor de Strapi:', error.message)
      documentId = id
    }

    // Actualizar en Strapi usando documentId si está disponible
    const strapiEndpoint = documentId ? `${autorEndpoint}/${documentId}` : `${autorEndpoint}/${id}`
    console.log('[API Autores PUT] Usando endpoint Strapi:', strapiEndpoint, { documentId, id })

    // El schema de Strapi para autor usa varios campos
    const autorData: any = {
      data: {}
    }

    // Aceptar diferentes formatos del formulario pero guardar según schema real
    if (body.data?.nombre_completo_autor) autorData.data.nombre_completo_autor = body.data.nombre_completo_autor.trim()
    if (body.data?.nombreCompletoAutor) autorData.data.nombre_completo_autor = body.data.nombreCompletoAutor.trim()
    
    if (body.data?.nombres !== undefined) autorData.data.nombres = body.data.nombres?.trim() || null
    if (body.data?.primer_apellido !== undefined) autorData.data.primer_apellido = body.data.primer_apellido?.trim() || null
    if (body.data?.segundo_apellido !== undefined) autorData.data.segundo_apellido = body.data.segundo_apellido?.trim() || null
    
    if (body.data?.website !== undefined) autorData.data.website = body.data.website?.trim() || null
    if (body.data?.pais !== undefined) autorData.data.pais = body.data.pais
    if (body.data?.tipo_autor !== undefined) autorData.data.tipo_autor = body.data.tipo_autor

    // Media: solo el ID (o null para eliminar)
    if (body.data?.foto !== undefined) {
      autorData.data.foto = body.data.foto || null
    }

    // Estado de publicación - IMPORTANTE: Strapi espera valores en minúsculas
    if (body.estado_publicacion !== undefined && body.estado_publicacion !== '') {
      const estadoNormalizado = typeof body.estado_publicacion === 'string' 
        ? body.estado_publicacion.toLowerCase() 
        : body.estado_publicacion
      autorData.data.estado_publicacion = estadoNormalizado
      console.log('[API Autores PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }
    if (body.data?.estado_publicacion !== undefined && body.data.estado_publicacion !== '') {
      const estadoNormalizado = typeof body.data.estado_publicacion === 'string' 
        ? body.data.estado_publicacion.toLowerCase() 
        : body.data.estado_publicacion
      autorData.data.estado_publicacion = estadoNormalizado
      console.log('[API Autores PUT] 📝 Estado de publicación actualizado:', estadoNormalizado)
    }

    // Guardar datos anteriores para el log
    const attrsAnteriores = autorStrapi?.attributes || {}
    const datosAnteriores = (attrsAnteriores && Object.keys(attrsAnteriores).length > 0) ? attrsAnteriores : autorStrapi
    const nombreAnterior = datosAnteriores?.nombre_completo_autor || 'N/A'
    
    const strapiResponse = await strapiClient.put<any>(strapiEndpoint, autorData)
    console.log('[API Autores PUT] ✅ Autor actualizado en Strapi')
    
    // Registrar log de actualización
    const nombreNuevo = autorData.data.nombre_completo_autor || nombreAnterior
    logActivity(request, {
      accion: 'actualizar',
      entidad: 'autor',
      entidadId: documentId || id,
      descripcion: createLogDescription('actualizar', 'autor', nombreNuevo, `Autor "${nombreNuevo}"`),
      datosAnteriores: datosAnteriores ? { nombre_completo: nombreAnterior } : undefined,
      datosNuevos: autorData.data,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: strapiResponse.data || strapiResponse,
      message: 'Autor actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('[API Autores PUT] ❌ ERROR al actualizar autor:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al actualizar el autor',
      details: error.details
    }, { status: error.status || 500 })
  }
}

