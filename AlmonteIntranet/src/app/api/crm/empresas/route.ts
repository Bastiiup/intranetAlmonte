import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * Genera un slug a partir de un texto
 * Convierte a minúsculas, reemplaza espacios y caracteres especiales por guiones
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales excepto espacios y guiones
    .replace(/\s+/g, '-') // Reemplazar espacios por guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones por uno solo
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
}

interface EmpresaAttributes {
  nombre?: string
  empresa_nombre?: string
  slug?: string
  razon_social?: string
  rut?: string
  giro?: string
  estado?: string
  region?: string
  comuna?: any
  telefonos?: any[]
  emails?: any[]
  direcciones?: any[]
  datos_facturacion?: {
    first_name?: string
    last_name?: string
    company?: string
    email?: string
    phone?: string
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

/**
 * GET /api/crm/empresas
 * Obtiene el listado de empresas desde Strapi con búsqueda y filtros
 * 
 * Query params:
 * - search: Búsqueda por empresa_nombre o razon_social
 * - estado: Filtro por estado
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
      'sort[0]': 'empresa_nombre:asc',
    })

    // Populate para relaciones (Strapi v4 syntax)
    params.append('populate[comuna]', 'true')
    params.append('populate[telefonos]', 'true')
    params.append('populate[emails]', 'true')
    params.append('populate[direcciones]', 'true')
    params.append('populate[datos_facturacion]', 'true')

    // Agregar búsqueda por nombre, razón social o RUT si existe
    if (search) {
      const searchTerm = search.trim()
      params.append('filters[$or][0][empresa_nombre][$containsi]', searchTerm)
      params.append('filters[$or][1][razon_social][$containsi]', searchTerm)
      params.append('filters[$or][2][rut][$containsi]', searchTerm)
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

    const url = `/api/empresas?${params.toString()}`
    const response = await strapiClient.get<StrapiResponse<StrapiEntity<EmpresaAttributes>>>(
      url
    )

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/empresas] Error al obtener empresas:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener empresas',
        details: error.details || {},
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/crm/empresas
 * Crea una nueva empresa
 */
export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()

    // Validaciones básicas
    if (!body.empresa_nombre || !body.empresa_nombre.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la empresa es obligatorio',
        },
        { status: 400 }
      )
    }

    // Generar slug desde el nombre (asegurarse de que no sea vacío)
    const nombreEmpresa = (body.empresa_nombre?.trim() || body.nombre?.trim() || '').trim()
    
    if (!nombreEmpresa) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre de la empresa es obligatorio',
        },
        { status: 400 }
      )
    }
    
    const slug = generateSlug(nombreEmpresa) || generateSlug('empresa-' + Date.now())

    // Preparar datos para Strapi
    const empresaData: any = {
      data: {
        // Enviar tanto 'nombre' como 'empresa_nombre' por compatibilidad
        nombre: nombreEmpresa,
        empresa_nombre: nombreEmpresa,
        slug: slug,
        ...(body.razon_social && { razon_social: body.razon_social.trim() }),
        ...(body.rut && { rut: body.rut.trim() }),
        ...(body.giro && { giro: body.giro.trim() }),
        ...(body.estado && { estado: body.estado }),
        ...(body.region && { region: body.region }),
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
        // Direcciones
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
        // Datos de facturación
        ...(body.datos_facturacion && {
          datos_facturacion: {
            ...(body.datos_facturacion.first_name && { first_name: body.datos_facturacion.first_name }),
            ...(body.datos_facturacion.last_name && { last_name: body.datos_facturacion.last_name }),
            ...(body.datos_facturacion.company && { company: body.datos_facturacion.company }),
            ...(body.datos_facturacion.email && { email: body.datos_facturacion.email }),
            ...(body.datos_facturacion.phone && { phone: body.datos_facturacion.phone }),
            ...(body.datos_facturacion.address_1 && { address_1: body.datos_facturacion.address_1 }),
            ...(body.datos_facturacion.address_2 && { address_2: body.datos_facturacion.address_2 }),
            ...(body.datos_facturacion.city && { city: body.datos_facturacion.city }),
            ...(body.datos_facturacion.state && { state: body.datos_facturacion.state }),
            ...(body.datos_facturacion.postcode && { postcode: body.datos_facturacion.postcode }),
            ...(body.datos_facturacion.country && { country: body.datos_facturacion.country || 'CL' }),
          },
        }),
      },
    }

    const response = await strapiClient.post<StrapiResponse<StrapiEntity<EmpresaAttributes>>>(
      '/api/empresas',
      empresaData
    )

    // Extraer objeto único de la respuesta
    const createdData = Array.isArray(response.data) 
      ? (response.data.length > 0 ? response.data[0] : response.data)
      : response.data

    // Revalidar para sincronización bidireccional
    revalidatePath('/crm/empresas')
    revalidatePath('/crm/empresas/[id]', 'page')
    revalidateTag('empresas', 'max')

    return NextResponse.json({
      success: true,
      data: createdData,
      message: 'Empresa creada exitosamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API /crm/empresas POST] Error:', {
      message: error.message,
      status: error.status,
      details: error.details,
    })
    
    // Extraer mensaje de error más descriptivo
    let errorMessage = error.message || 'Error al crear empresa'
    
    // Detectar errores específicos
    if (error.details?.errors && Array.isArray(error.details.errors)) {
      const firstError = error.details.errors[0]
      if (firstError?.message) {
        const fieldName = firstError.path?.[0] || 'Campo'
        const fieldLabel = fieldName === 'empresa_nombre' ? 'Nombre de la empresa' : 
                          fieldName === 'rut' ? 'RUT' : 
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

