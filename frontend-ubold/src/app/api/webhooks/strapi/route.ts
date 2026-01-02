import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Webhook endpoint para recibir notificaciones de Strapi
 * Permite sincronización bidireccional: cambios en Strapi se reflejan en la intranet
 * 
 * Eventos soportados:
 * - entry.create
 * - entry.update
 * - entry.delete
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event || body.type
    const model = body.model || body.contentType

    console.log('[Webhook Strapi] Evento recibido:', { event, model, id: body.entry?.id })

    // Validar que el webhook viene de Strapi (opcional: agregar verificación de token)
    // const webhookToken = request.headers.get('x-strapi-webhook-token')
    // if (webhookToken !== process.env.STRAPI_WEBHOOK_TOKEN) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Revalidar rutas según el modelo afectado
    switch (model) {
      case 'colegio':
      case 'api::colegio.colegio':
        revalidatePath('/crm/colegios')
        revalidatePath('/crm/colegios/[id]', 'page')
        revalidateTag('colegios')
        console.log('[Webhook Strapi] Revalidado: /crm/colegios')
        break

      case 'persona':
      case 'api::persona.persona':
        revalidatePath('/crm/personas')
        revalidatePath('/crm/personas/[id]', 'page')
        revalidatePath('/crm/contacts')
        revalidateTag('personas')
        revalidateTag('contacts')
        console.log('[Webhook Strapi] Revalidado: /crm/personas y /crm/contacts')
        break

      default:
        console.log('[Webhook Strapi] Modelo no reconocido:', model)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook procesado correctamente',
      event,
      model,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[Webhook Strapi] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al procesar webhook',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint para verificar que el webhook está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Webhook endpoint está funcionando',
    endpoint: '/api/webhooks/strapi',
  })
}

