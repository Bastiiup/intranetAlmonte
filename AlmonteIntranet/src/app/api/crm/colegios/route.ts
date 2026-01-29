import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * Normaliza el campo matrícula de un curso
 * En Strapi v5, cuando se usa fields selector, matrícula puede estar en:
 * - nivel raíz: curso.matricula
 * - attributes: curso.attributes.matricula
 * 
 * Esta función busca en todas las ubicaciones y retorna un número o null
 */
function normalizeMatricula(curso: any): number | null {
  // Buscar matrícula en múltiples ubicaciones (prioridad: attributes > raíz)
  const matricula = 
    curso.attributes?.matricula ?? 
    curso.matricula ?? 
    null;
  
  // Convertir a número o null
  if (matricula === null || matricula === undefined) return null;
  const num = Number(matricula);
  return isNaN(num) ? null : num;
}

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
    const loadAll = searchParams.get('all') === 'true'
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const region = searchParams.get('region') || ''
    const comuna = searchParams.get('comuna') || ''

    // Si se pide cargar todos, hacer múltiples llamadas (solo campos esenciales)
    if (loadAll && !search) {
      const allColegios: any[] = []
      let currentPage = 1
      let totalPages = 1
      const maxPageSize = 1000 // Límite máximo de Strapi

      do {
        const params = new URLSearchParams({
          'pagination[page]': currentPage.toString(),
          'pagination[pageSize]': maxPageSize.toString(),
          'sort[0]': 'colegio_nombre:asc',
        })
        // Solo campos esenciales para la lista (sin populate pesados)
        params.append('fields[0]', 'colegio_nombre')
        params.append('fields[1]', 'rbd')
        params.append('fields[2]', 'estado')
        params.append('fields[3]', 'dependencia')
        params.append('fields[4]', 'region')
        params.append('fields[5]', 'createdAt')
        params.append('populate[comuna][fields][0]', 'comuna_nombre')
        // Incluir cursos con matrícula (solo campos necesarios)
        params.append('populate[cursos][fields][0]', 'matricula')

        if (estado) params.append('filters[estado][$eq]', estado)
        if (region) params.append('filters[region][$eq]', region)
        if (comuna) params.append('filters[comuna][id][$eq]', comuna)

        const url = `/api/colegios?${params.toString()}`
        const response = await strapiClient.get<StrapiResponse<StrapiEntity<ColegioAttributes>>>(url)
        
        const data = Array.isArray(response.data) ? response.data : [response.data]
        
        // Calcular matrícula total para cada colegio
        const colegiosConMatricula = data.map((colegio: any) => {
          const attrs = colegio.attributes || colegio
          const cursos = attrs.cursos?.data || attrs.cursos || []
          
          // SOLUCIÓN 2: Calcular matrícula total usando función de normalización
          const matriculaTotal = cursos.reduce((sum: number, curso: any) => {
            const matricula = normalizeMatricula(curso) ?? 0
            return sum + matricula
          }, 0)
          
          return {
            ...colegio,
            matriculaTotal,
          }
        })
        
        allColegios.push(...colegiosConMatricula)
        
        totalPages = response.meta?.pagination?.pageCount || 1
        currentPage++
      } while (currentPage <= totalPages)

      return NextResponse.json({
        success: true,
        data: allColegios,
        meta: { pagination: { total: allColegios.length, page: 1, pageSize: allColegios.length, pageCount: 1 } },
      }, { status: 200 })
    }

    // Paginación normal
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('pagination[pageSize]') || searchParams.get('pageSize') || '1000'

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
    // Incluir cursos con matrícula (solo campo matricula para optimizar)
    params.append('populate[cursos][fields][0]', 'matricula')

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
    const data = Array.isArray(response.data) ? response.data : [response.data]
    const colegiosConMatricula = data.map((colegio: any) => {
      const attrs = colegio.attributes || colegio
      const cursos = attrs.cursos?.data || attrs.cursos || []
      
      // SOLUCIÓN 2: Calcular matrícula total usando función de normalización
      const matriculaTotal = cursos.reduce((sum: number, curso: any) => {
        const matricula = normalizeMatricula(curso) ?? 0
        return sum + matricula
      }, 0)
      
      return {
        ...colegio,
        matriculaTotal,
      }
    })

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

    // Verificar si el colegio ya existe por RBD
    try {
      const existingColegiosResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>[]>>(
        `/api/colegios?filters[rbd][$eq]=${rbdNumber}&publicationState=preview`
      )
      
      const existingColegios = Array.isArray(existingColegiosResponse.data) 
        ? existingColegiosResponse.data 
        : (existingColegiosResponse.data ? [existingColegiosResponse.data] : [])
      
      if (existingColegios.length > 0) {
        const colegioExistente = existingColegios[0]
        const attrs = (colegioExistente as any)?.attributes || colegioExistente
        const nombreExistente = attrs?.colegio_nombre || attrs?.nombre || colegioExistente?.colegio_nombre || colegioExistente?.nombre
        
        console.log(`[API /crm/colegios POST] ⚠️ Colegio con RBD ${rbdNumber} ya existe: ${nombreExistente} (ID: ${colegioExistente.id || colegioExistente.documentId})`)
        
        return NextResponse.json(
          {
            success: false,
            error: `El colegio con RBD ${rbdNumber} ya existe: "${nombreExistente}"`,
            data: colegioExistente,
            existing: true,
          },
          { status: 409 } // 409 Conflict
        )
      }
    } catch (checkError: any) {
      // Si hay error al verificar, continuar con la creación (puede ser que no haya colegios aún)
      console.log(`[API /crm/colegios POST] ⚠️ No se pudo verificar colegios existentes: ${checkError.message}`)
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

