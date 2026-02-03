import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

interface ColegioAttributes {
  colegio_nombre?: string
  rbd?: number
  estado?: string
  dependencia?: string
  region?: string
  zona?: string
  comuna?: any
  telefonos?: any[]
  emails?: any[]
  direcciones?: any[]
}

/**
 * GET /api/crm/colegios
 * Obtiene el listado de colegios desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - search: Búsqueda por colegio_nombre
 * - estado: Filtro por estado (Por Verificar, Verificado, Aprobado)
 * - region: Filtro por región
 * - comuna: Filtro por comuna (ID de relación)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '25'
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const region = searchParams.get('region') || ''
    const comuna = searchParams.get('comuna') || ''

    // Construir URL con paginación y ordenamiento
    const params = new URLSearchParams({
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      'sort[0]': 'colegio_nombre:asc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[comuna]', 'true')
    params.append('populate[telefonos]', 'true')
    params.append('populate[emails]', 'true')
    params.append('populate[direcciones]', 'true')
    params.append('populate[cartera_asignaciones][populate][ejecutivo]', 'true')

    // Agregar búsqueda por nombre o RBD si existe
    if (search) {
      const searchTerm = search.trim()
      // Si el término de búsqueda es numérico, buscar por RBD también (como número)
      const isNumeric = /^\d+$/.test(searchTerm)
      
      if (isNumeric) {
        // Buscar por nombre o RBD usando $or
        const rbdNumber = parseInt(searchTerm)
        if (!isNaN(rbdNumber)) {
          params.append('filters[$or][0][colegio_nombre][$containsi]', searchTerm)
          params.append('filters[$or][1][rbd][$eq]', rbdNumber.toString())
        } else {
          params.append('filters[colegio_nombre][$containsi]', searchTerm)
        }
      } else {
        // Solo buscar por nombre si no es numérico
        params.append('filters[colegio_nombre][$containsi]', searchTerm)
      }
    }

    // Agregar filtro por estado
    if (estado) {
      params.append('filters[estado][$eq]', estado)
    }

    // Agregar filtro por región
    if (region) {
      params.append('filters[region][$eq]', region)
    }

    // Agregar filtro por comuna (si es relación)
    if (comuna) {
      params.append('filters[comuna][id][$eq]', comuna)
    }

    const url = `/api/colegios?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
      url
    )

    // Calcular matrícula total para cada colegio
    const colegiosConMatricula = await Promise.all(
      (Array.isArray(response.data) ? response.data : [response.data]).map(async (colegio: any) => {
        const colegioId = colegio.id
        const colegioRbd = colegio.attributes?.rbd || colegio.rbd
        
        if (!colegioRbd) {
          return { ...colegio, total_matriculados: 0 }
        }
        
        try {
          // Obtener todos los cursos del colegio
          const cursosResponse = await strapiClient.get<any>(
            `/api/cursos?filters[colegio][rbd][$eq]=${colegioRbd}&fields[0]=matricula&pagination[pageSize]=1000`
          )
          
          const cursos = Array.isArray(cursosResponse.data) ? cursosResponse.data : [cursosResponse.data]
          
          // Sumar matrícula de todos los cursos
          const totalMatricula = cursos.reduce((sum, curso) => {
            const attrs = curso.attributes || curso
            const matricula = attrs.matricula || 0
            return sum + Number(matricula)
          }, 0)
          
          return { ...colegio, total_matriculados: totalMatricula }
        } catch (error) {
          console.error(`Error al calcular matrícula del colegio ${colegioId}:`, error)
          return { ...colegio, total_matriculados: 0 }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: colegiosConMatricula,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/colegios] Error al obtener colegios:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener colegios',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/colegios
 * Crea un nuevo colegio
 */
export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()

    // Validaciones básicas
    if (!body.colegio_nombre || !body.colegio_nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del colegio es obligatorio',
        },
        { status: 400 }
      )
    }
    if (!body.rbd) {
      return NextResponse.json(
        {
          success: false,
          error: 'El RBD es obligatorio',
        },
        { status: 400 }
      )
    }
    const rbdNumber = parseInt(body.rbd.toString())
    if (isNaN(rbdNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El RBD debe ser un número válido',
        },
        { status: 400 }
      )
    }

    // Preparar datos para Strapi
    const colegioData: any = {
      data: {
        colegio_nombre: body.colegio_nombre.trim(),
        rbd: rbdNumber, // RBD es obligatorio
        ...(body.estado && { estado: body.estado }),
        ...(body.dependencia && { dependencia: body.dependencia }),
        ...(body.region && { region: body.region }),
        ...(body.zona && { zona: body.zona }),
        ...(body.website && { website: body.website.trim() }),
        // Relación comuna (usar connect para Strapi v4)
        ...(body.comunaId && { comuna: { connect: [parseInt(body.comunaId.toString())] } }),
        // Componentes repeatable
        ...(body.telefonos && Array.isArray(body.telefonos) && body.telefonos.length > 0 && {
          telefonos: body.telefonos.map((t: any) => ({
            telefono_raw: t.telefono_raw || '',
            ...(t.tipo && { tipo: t.tipo }),
            ...(t.principal !== undefined && { principal: t.principal }),
          })),
        }),
        ...(body.emails && Array.isArray(body.emails) && body.emails.length > 0 && {
          emails: body.emails.map((e: any) => ({
            email: e.email || '',
            ...(e.tipo && { tipo: e.tipo }),
            ...(e.principal !== undefined && { principal: e.principal }),
          })),
        }),
        // Direcciones: usar campos correctos del componente contacto.direccion
        // Nota: Solo incluir comuna si es un ID numérico válido
        ...(body.direcciones && Array.isArray(body.direcciones) && body.direcciones.length > 0 && {
          direcciones: body.direcciones.map((d: any) => {
            const direccion: any = {
              ...(d.nombre_calle && { nombre_calle: d.nombre_calle }),
              ...(d.numero_calle && { numero_calle: d.numero_calle }),
              ...(d.complemento_direccion && { complemento_direccion: d.complemento_direccion }),
              ...(d.tipo_direccion && { tipo_direccion: d.tipo_direccion }),
              ...(d.direccion_principal_envio_facturacion && { direccion_principal_envio_facturacion: d.direccion_principal_envio_facturacion }),
            }
            // Solo incluir comuna si es un ID numérico válido
            if (d.comuna && (typeof d.comuna === 'number' || (typeof d.comuna === 'string' && !isNaN(parseInt(d.comuna))))) {
              direccion.comuna = { connect: [parseInt(d.comuna.toString())] }
            }
            return direccion
          }),
        }),
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<ColegioAttributes>>>(
      '/api/colegios',
      colegioData
    )

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/colegios')
    revalidatePath('/crm/colegios/[id]', 'page')
    revalidateTag('colegios', 'max')

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Colegio creado exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/colegios POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
      rbd: body?.rbd || 'no disponible',
    })
    
    // Extraer mensaje de error más descriptivo
    let errorMessage = error.message || 'Error al crear colegio'
    
    // Detectar error de RBD duplicado específicamente
    if (error.details?.errors && Array.isArray(error.details.errors)) {
      const firstError = error.details.errors[0]
      
      // Si el error es de RBD duplicado
      if (firstError?.path?.includes('rbd') && firstError?.message?.includes('unique')) {
        const rbdValue = firstError.value || body?.rbd || 'desconocido'
        errorMessage = `El RBD ${rbdValue} ya existe en el sistema. Por favor, use un RBD diferente.`
      } else if (firstError?.message) {
        // Para otros errores, mostrar el campo y mensaje
        const fieldName = firstError.path?.[0] || 'Campo'
        const fieldLabel = fieldName === 'rbd' ? 'RBD' : 
                          fieldName === 'colegio_nombre' ? 'Nombre del colegio' : 
                          fieldName
        errorMessage = `${fieldLabel}: ${firstError.message}`
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

