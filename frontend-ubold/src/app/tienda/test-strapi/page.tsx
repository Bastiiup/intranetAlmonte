import { Container, Card, Alert, Badge, CardHeader, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

// Forzar renderizado dinámico (no estático) para poder usar variables de entorno
export const dynamic = 'force-dynamic'

/**
 * Página de prueba para verificar la conexión con Strapi
 * 
 * Esta página te permite:
 * 1. Verificar que las variables de entorno estén configuradas
 * 2. Probar la conexión con Strapi
 * 3. Ver qué colecciones están disponibles
 */
export default async function TestStrapiPage() {
  const config = {
    url: STRAPI_API_URL,
    hasToken: !!STRAPI_API_TOKEN,
    tokenLength: STRAPI_API_TOKEN?.length || 0,
  }

  // Intentar obtener información básica de Strapi
  let strapiInfo: any = null
  let testError: string | null = null

  try {
    // Probar con diferentes endpoints según las colecciones disponibles
    // Intentamos con las colecciones que vimos en Strapi
    let testResponse: any = null
    
    // Intentar primero con "ecommerce-pedidos"
    try {
      testResponse = await strapiClient.get<any>('/api/ecommerce-pedidos?pagination[pageSize]=1')
    } catch {
      // Si falla, intentar con "wo-pedidos"
      try {
        testResponse = await strapiClient.get<any>('/api/wo-pedidos?pagination[pageSize]=1')
      } catch {
        // Último intento con "turnos-tiendas"
        testResponse = await strapiClient.get<any>('/api/turnos-tiendas?pagination[pageSize]=1')
      }
    }
    strapiInfo = {
      success: true,
      data: testResponse,
    }
  } catch (err: any) {
    // No lanzar el error para que el build no falle
    testError = err.message || 'Error desconocido'
    strapiInfo = {
      success: false,
      error: testError,
      status: err.status,
    }
    
    // Solo loguear en desarrollo, no en build
    if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
      console.error('Error al probar conexión con Strapi:', err)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Test Strapi" subtitle="Verificar conexión" />
      
      <div className="row">
        <div className="col-12">
          {/* Configuración */}
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Configuración</h5>
            </CardHeader>
            <CardBody>
              <div className="mb-3">
                <strong>URL de Strapi:</strong>
                <br />
                <code>{config.url}</code>
                {!config.url && (
                  <Badge bg="danger" className="ms-2">No configurado</Badge>
                )}
              </div>
              
              <div className="mb-3">
                <strong>API Token:</strong>
                <br />
                {config.hasToken ? (
                  <>
                    <Badge bg="success" className="me-2">Configurado</Badge>
                    <code>Token de {config.tokenLength} caracteres</code>
                  </>
                ) : (
                  <Badge bg="warning">No configurado</Badge>
                )}
              </div>

              {!config.hasToken && (
                <Alert variant="warning" className="mt-3">
                  <strong>⚠️ Token no configurado</strong>
                  <br />
                  Agrega <code>STRAPI_API_TOKEN</code> en las variables de entorno.
                </Alert>
              )}
            </CardBody>
          </Card>

          {/* Prueba de conexión */}
          <Card>
            <CardHeader>
              <h5 className="mb-0">Prueba de Conexión</h5>
            </CardHeader>
            <CardBody>
              {strapiInfo?.success ? (
                <Alert variant="success">
                  <strong>✅ Conexión exitosa</strong>
                  <br />
                  <small>
                    Strapi respondió correctamente. Revisa la consola del servidor para más detalles.
                  </small>
                  <pre className="mt-2 p-2 bg-light rounded" style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                    {JSON.stringify(strapiInfo.data, null, 2)}
                  </pre>
                </Alert>
              ) : (
                <Alert variant={testError?.includes('404') ? 'info' : 'danger'}>
                  <strong>
                    {testError?.includes('404') ? 'ℹ️ Endpoint no encontrado' : '❌ Error de conexión'}
                  </strong>
                  <br />
                  <code>{testError}</code>
                  <br />
                  <small className="mt-2 d-block">
                    {testError?.includes('404') ? (
                      <>
                        El endpoint <code>/api/pedidos</code> no existe en Strapi.
                        <br />
                        Esto es normal si la colección tiene otro nombre. Verifica en Strapi qué colecciones tienes disponibles.
                      </>
                    ) : (
                      <>
                        Verifica que:
                        <ul className="mb-0 mt-2">
                          <li>Strapi esté corriendo en {config.url}</li>
                          <li>El token tenga los permisos correctos</li>
                          <li>CORS esté configurado en Strapi</li>
                        </ul>
                      </>
                    )}
                  </small>
                </Alert>
              )}
            </CardBody>
          </Card>

          {/* Instrucciones */}
          <Card className="mt-4">
            <CardHeader>
              <h5 className="mb-0">📝 Instrucciones</h5>
            </CardHeader>
            <CardBody>
              <ol>
                <li>
                  <strong>Configura las variables de entorno:</strong>
                  <ul>
                    <li>En desarrollo: crea <code>.env.local</code> con <code>NEXT_PUBLIC_STRAPI_URL</code> y <code>STRAPI_API_TOKEN</code></li>
                    <li>En Railway: agrega las variables en Settings → Variables</li>
                  </ul>
                </li>
                <li>
                  <strong>Verifica en Strapi:</strong>
                  <ul>
                    <li>Que la colección exista (ej: "pedidos", "orders", "ordenes")</li>
                    <li>Que los permisos estén habilitados (Settings → Roles → Public/Intranet → Find, FindOne)</li>
                    <li>Que CORS permita tu dominio</li>
                  </ul>
                </li>
                <li>
                  <strong>Ajusta el endpoint:</strong>
                  <ul>
                    <li>Si tu colección se llama diferente, cambia <code>/api/pedidos</code> en el código</li>
                    <li>Ejemplos: <code>/api/orders</code>, <code>/api/ordenes</code>, <code>/api/productos</code></li>
                  </ul>
                </li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

