import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import strapiClient from '@/lib/strapi/client'
import { sendEmail, generateCotizacionToken } from '@/lib/email/sendgrid'
import type { StrapiResponse, StrapiEntity } from '@/lib/strapi/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crm/cotizaciones/[id]/enviar-email
 * Envía una cotización por correo electrónico a las empresas asociadas
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { empresaIds } = body // Array de IDs de empresas a las que enviar

    // Obtener la cotización con todas sus relaciones
    const cotizacionResponse = await strapiClient.get<StrapiResponse<StrapiEntity<any>>>(
      `/api/cotizaciones/${id}?populate[empresas]=true&populate[productos]=true&populate[creado_por][populate][persona]=true`
    )

    if (!cotizacionResponse.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cotización no encontrada',
        },
        { status: 404 }
      )
    }

    const cotizacion = cotizacionResponse.data
    const attrs = cotizacion.attributes || cotizacion
    const empresas = attrs.empresas?.data || attrs.empresas || []

    // Filtrar empresas si se especificaron IDs
    let empresasAEnviar = empresas
    if (empresaIds && Array.isArray(empresaIds) && empresaIds.length > 0) {
      empresasAEnviar = empresas.filter((emp: any) => {
        const empId = emp.id || emp.documentId
        return empresaIds.includes(String(empId)) || empresaIds.includes(Number(empId))
      })
    }

    if (empresasAEnviar.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay empresas asociadas a esta cotización',
        },
        { status: 400 }
      )
    }

    // Generar token único para esta cotización
    const token = generateCotizacionToken(id)
    
    // Guardar el token en la cotización
    await strapiClient.put(`/api/cotizaciones/${id}`, {
      data: {
        token_acceso: token,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const cotizacionUrl = `${appUrl}/cotizacion/${token}`

    // Preparar datos de la cotización para el email
    const productos = attrs.productos?.data || attrs.productos || []
    const creadoPor = attrs.creado_por?.data || attrs.creado_por
    const creadoPorNombre = creadoPor?.persona?.nombre_completo || creadoPor?.persona?.nombres || 'Equipo de Ventas'

    // Enviar correo a cada empresa
    const resultados: Array<{ empresa: string; success: boolean; error?: string }> = []

    for (const empresa of empresasAEnviar) {
      const empAttrs = empresa.attributes || empresa
      const empresaNombre = empAttrs.empresa_nombre || empAttrs.nombre || 'Empresa'
      const empresaEmail = empAttrs.emails?.[0]?.email || empAttrs.email

      if (!empresaEmail) {
        resultados.push({
          empresa: empresaNombre,
          success: false,
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
          <title>Cotización - ${attrs.nombre || 'Nueva Cotización'}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Cotización de Productos</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Estimado/a <strong>${empresaNombre}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Le enviamos la siguiente cotización para su consideración:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">${attrs.nombre || 'Cotización'}</h2>
              ${attrs.descripcion ? `<p style="color: #666;">${attrs.descripcion}</p>` : ''}
              ${attrs.monto ? `<p style="font-size: 18px; font-weight: bold; margin-top: 15px;">Monto estimado: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: attrs.moneda || 'CLP' }).format(attrs.monto)}</p>` : ''}
              ${attrs.fecha_vencimiento ? `<p style="color: #666; margin-top: 10px;">Válida hasta: ${new Date(attrs.fecha_vencimiento).toLocaleDateString('es-CL')}</p>` : ''}
            </div>

            ${productos.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #333; margin-bottom: 15px;">Productos incluidos:</h3>
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
              <a href="${cotizacionUrl}" 
                 style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Ver Cotización y Responder
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Por favor, haga clic en el botón anterior para acceder a la cotización y proporcionar su valor estimado.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Si tiene alguna pregunta, no dude en contactarnos.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Este es un correo automático. Por favor, no responda directamente a este mensaje.<br>
              Cotización creada por: ${creadoPorNombre}
            </p>
          </div>
        </body>
        </html>
      `

      const emailResult = await sendEmail({
        to: empresaEmail,
        subject: `Cotización: ${attrs.nombre || 'Nueva Cotización'}`,
        html: emailHtml,
      })

      resultados.push({
        empresa: empresaNombre,
        success: emailResult.success,
        error: emailResult.error,
      })
    }

    // Actualizar estado de la cotización a "Enviada" si al menos un email se envió exitosamente
    const enviadosExitosos = resultados.filter(r => r.success).length
    if (enviadosExitosos > 0) {
      await strapiClient.put(`/api/cotizaciones/${id}`, {
        data: {
          estado: 'Enviada',
        },
      })
    }

    // Revalidar
    revalidatePath('/crm/estimations')
    revalidateTag('cotizaciones', 'max')

    return NextResponse.json({
      success: true,
      message: `Correos enviados: ${enviadosExitosos} de ${resultados.length}`,
      resultados,
      token,
      url: cotizacionUrl,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[API /crm/cotizaciones/[id]/enviar-email] Error:', {
      message: error.message,
      status: error.status,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al enviar correos',
        status: error.status || 500,
      },
      { status: error.status || 500 }
    )
  }
}





