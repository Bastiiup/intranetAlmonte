import sgMail from '@sendgrid/mail'

// Configurar SendGrid API Key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
} else {
  console.warn('[SendGrid] SENDGRID_API_KEY no está configurado')
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

/**
 * Envía un correo electrónico usando SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY no está configurado en las variables de entorno')
    }

    const fromEmail = options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@moraleja.cl'
    
    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo && { replyTo: options.replyTo }),
    }

    await sgMail.send(msg)
    
    console.log('[SendGrid] ✅ Correo enviado exitosamente:', {
      to: options.to,
      subject: options.subject,
    })

    return { success: true }
  } catch (error: any) {
    console.error('[SendGrid] ❌ Error al enviar correo:', {
      error: error.message,
      response: error.response?.body,
    })
    
    return {
      success: false,
      error: error.message || 'Error al enviar correo',
    }
  }
}

/**
 * Genera un token único para acceder a una cotización
 */
export function generateCotizacionToken(cotizacionId: string | number): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return Buffer.from(`${cotizacionId}-${timestamp}-${random}`).toString('base64url')
}

/**
 * Valida y decodifica un token de cotización
 */
export function validateCotizacionToken(token: string): { cotizacionId: string | null; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split('-')
    if (parts.length >= 1) {
      return {
        cotizacionId: parts[0],
        valid: true,
      }
    }
    return { cotizacionId: null, valid: false }
  } catch (error) {
    return { cotizacionId: null, valid: false }
  }
}





