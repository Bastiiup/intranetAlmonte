import { Container } from 'react-bootstrap'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import EmpresasListing from './components/EmpresasListing'

export const metadata: Metadata = {
  title: 'Empresas - CRM',
}

export default async function Page() {
  let empresas: any[] = []
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/crm/empresas`, {
      cache: 'no-store', // Forzar fetch dinámico
    })
    
    // Verificar si la respuesta es exitosa antes de parsear JSON
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`
      let errorDetails: any = null
      
      if (errorText && errorText.trim().length > 0) {
        try {
          const parsedError = JSON.parse(errorText)
          if (parsedError && typeof parsedError === 'object') {
            errorMessage = parsedError.error || parsedError.message || errorMessage
            // Solo incluir detalles si hay información útil
            if (Object.keys(parsedError).length > 0) {
              errorDetails = parsedError
            }
          } else {
            errorMessage = errorText || errorMessage
          }
        } catch {
          // Si no es JSON válido, usar el texto como mensaje
          errorMessage = errorText || errorMessage
        }
      }
      
      error = errorMessage
      
      // Log solo con información útil, evitando objetos vacíos
      const logData: any = {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
      }
      if (errorDetails) {
        logData.details = errorDetails
      }
      console.error('[Empresas Page] Error HTTP:', logData)
    } else {
      const data = await response.json()
      
      if (data.success && data.data) {
        empresas = Array.isArray(data.data) ? data.data : [data.data]
        console.log('[Empresas Page] Empresas obtenidas:', empresas.length)
      } else {
        error = data.error || 'Error al obtener empresas: respuesta sin datos'
        // Construir objeto de log solo con información útil
        const logData: any = {
          success: data.success,
          hasData: !!data.data,
        }
        if (data.error) {
          logData.error = data.error
        }
        // Solo incluir fullResponse si tiene contenido útil
        if (data && Object.keys(data).length > 0) {
          logData.response = data
        }
        console.error('[Empresas Page] Error en respuesta:', logData)
      }
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
    // Construir objeto de log solo con información disponible
    const logData: any = {
      message: err.message || 'Error desconocido',
    }
    if (err.name) {
      logData.name = err.name
    }
    if (err.stack) {
      logData.stack = err.stack
    }
    console.error('[Empresas Page] Error al obtener empresas:', logData)
  }

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Empresas" 
        subtitle="CRM" 
        infoText="Las Empresas son organizaciones con las que trabajas. Aquí puedes gestionar información completa de cada empresa: datos de contacto, ubicación, contactos asociados, y datos de facturación. Las empresas pueden estar relacionadas con oportunidades de venta y pedidos."
      />
      <EmpresasListing empresas={empresas} error={error} />
    </Container>
  )
}





