/**
 * Página para ver la estructura exacta de los datos que llegan de /api/libros
 */

import { Container, Alert, Card, CardBody } from 'react-bootstrap'
import { headers } from 'next/headers'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { STRAPI_API_URL } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export default async function DebugDataPage() {
  let rawData: any = null
  let error: string | null = null

  try {
    // Usar API Route como proxy
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`
    
    const response = await fetch(`${baseUrl}/api/tienda/productos`, {
      cache: 'no-store',
    })
    
    const data = await response.json()
    
    if (data.success && data.data) {
      rawData = data
    } else {
      error = data.error || 'Error al obtener datos'
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con la API'
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug Datos de Productos" subtitle="Tienda - Diagnóstico" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Estructura de Datos desde /api/libros</h4>

              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <strong>Endpoint:</strong> /api/libros
              </Alert>

              {error && (
                <Alert variant="danger">
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {rawData && (
                <>
                  <Alert variant="success" className="mb-3">
                    <strong>✅ Datos recibidos correctamente</strong>
                    <br />
                    <small>
                      Total de productos: {Array.isArray(rawData.data) ? rawData.data.length : rawData.data ? 1 : 0}
                    </small>
                  </Alert>

                  <h5 className="mb-3">Estructura completa de la respuesta:</h5>
                  <pre className="bg-light p-3 rounded" style={{ maxHeight: '600px', overflow: 'auto', fontSize: '0.85em' }}>
                    <code>{JSON.stringify(rawData, null, 2)}</code>
                  </pre>

                  {rawData.data && Array.isArray(rawData.data) && rawData.data.length > 0 && (
                    <>
                      <h5 className="mb-3 mt-4">Primer producto (estructura detallada):</h5>
                      <pre className="bg-light p-3 rounded" style={{ maxHeight: '600px', overflow: 'auto', fontSize: '0.85em' }}>
                        <code>{JSON.stringify(rawData.data[0], null, 2)}</code>
                      </pre>

                      <Alert variant="info" className="mt-3">
                        <strong>ℹ️ Información importante:</strong>
                        <ul className="mb-0 mt-2">
                          <li>Revisa la estructura del primer producto arriba</li>
                          <li>Busca dónde están los campos: nombre, ISBN, precio, etc.</li>
                          <li>Verifica si están en <code>attributes</code> o directamente en el objeto</li>
                          <li>Verifica si están en mayúsculas (NOMBRE_LIBRO) o minúsculas (nombre_libro)</li>
                        </ul>
                      </Alert>
                    </>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}


