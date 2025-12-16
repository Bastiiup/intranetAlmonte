import { Container, Alert, Card, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL, STRAPI_API_TOKEN } from '@/lib/strapi/config'

export const dynamic = 'force-dynamic'

export default async function ProductosDebugPage() {
  const endpointsToTest = [
    // Endpoint principal confirmado
    '/api/product-libro-edicion',
    // Variaciones por si acaso
    '/api/product-libro-edicions',
    '/api/producto-libro-edicion',
    '/api/libro-edicion',
    '/api/edicion',
    // Fallbacks
    '/api/producto',
    '/api/productos',
    '/api/products',
  ]

  const results: Array<{ endpoint: string; success: boolean; error?: string; data?: any }> = []

  for (const endpoint of endpointsToTest) {
    try {
      const response = await strapiClient.get<any>(`${endpoint}?pagination[pageSize]=1`)
      results.push({
        endpoint,
        success: true,
        data: response,
      })
    } catch (err: any) {
      results.push({
        endpoint,
        success: false,
        error: err.message || `HTTP ${err.status || 'Unknown'}`,
      })
    }
  }

  // Intentar obtener la lista de content types disponibles
  let contentTypes: any = null
  let allContentTypes: string[] = []
  
  // Intentar múltiples formas de obtener content types
  try {
    // Método 1: Content Type Builder API (requiere permisos de admin)
    const ctResponse = await fetch(`${STRAPI_API_URL}/api/content-type-builder/content-types`, {
      headers: {
        'Content-Type': 'application/json',
        ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
      },
    })
    if (ctResponse.ok) {
      contentTypes = await ctResponse.json()
    }
  } catch (err) {
    // Si falla, intentar método alternativo
  }
  
  // Método 2: Intentar descubrir content types probando endpoints comunes
  // Basado en colecciones que sabemos que existen (como wo-clientes del chat)
  const commonContentTypes = [
    'wo-clientes', // Sabemos que este existe porque el chat funciona
    'intranet-chats', // Sabemos que este existe porque el chat funciona
    'product-libro-edicion',
    'product-libro-edicions',
    'producto-libro-edicion',
    'libro-edicion',
    'edicion',
    'producto',
    'productos',
    'products',
    'ecommerce-productos',
    'ecommerce-products',
    'tienda-productos',
    'tienda-products',
    'woocommerce-products',
    'wo-products',
    'libro',
    'libros',
    'book',
    'books',
    'edicion-libro',
    'libro-ediciones',
  ]
  
  for (const contentType of commonContentTypes) {
    try {
      const testResponse = await strapiClient.get<any>(`/api/${contentType}?pagination[pageSize]=1`)
      if (testResponse && (testResponse.data !== undefined || testResponse.meta !== undefined)) {
        allContentTypes.push(contentType)
      }
    } catch (err: any) {
      // Solo agregar si el error NO es 404 (Not Found)
      // Si es 403 (Forbidden) o 401 (Unauthorized), significa que existe pero no tenemos permisos
      if (err.status && err.status !== 404) {
        allContentTypes.push(`${contentType} (error ${err.status})`)
      }
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug Productos Strapi" subtitle="Tienda - Diagnóstico" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Diagnóstico de Conexión con Strapi</h4>

              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <strong>Token configurado:</strong> {STRAPI_API_TOKEN ? '✅ Sí' : '❌ No'}
                {STRAPI_API_TOKEN && (
                  <>
                    <br />
                    <small className="text-muted">Longitud del token: {STRAPI_API_TOKEN.length} caracteres</small>
                  </>
                )}
              </Alert>

              <h5 className="mb-3">Resultados de Prueba de Endpoints:</h5>
              
              <div className="table-responsive mb-4">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td><code>{result.endpoint}</code></td>
                        <td>
                          {result.success ? (
                            <span className="badge bg-success">✅ OK</span>
                          ) : (
                            <span className="badge bg-danger">❌ Error</span>
                          )}
                        </td>
                        <td>
                          {result.success ? (
                            <small className="text-success">
                              Datos encontrados: {result.data?.data?.length || 0} registro(s)
                            </small>
                          ) : (
                            <small className="text-danger">{result.error}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.some(r => r.success) && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Endpoints que funcionan:</strong>
                  <ul className="mb-0 mt-2">
                    {results.filter(r => r.success).map((r, i) => (
                      <li key={i}><code>{r.endpoint}</code></li>
                    ))}
                  </ul>
                </Alert>
              )}

              {!results.some(r => r.success) && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Ningún endpoint funcionó</strong>
                  <p className="mb-2 mt-2">
                    Posibles causas:
                  </p>
                  <ul className="mb-0">
                    <li>La colección de productos no existe en Strapi con estos nombres</li>
                    <li>El nombre de la colección es diferente (revisa en Strapi → Content Manager)</li>
                    <li>Los permisos no están configurados (Settings → Roles → Public → Find)</li>
                    <li>El API Token no tiene permisos suficientes</li>
                  </ul>
                </Alert>
              )}

              {allContentTypes.length > 0 && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ Content Types Encontrados (que responden):</strong>
                  <ul className="mb-0 mt-2">
                    {allContentTypes.map((ct, i) => (
                      <li key={i}>
                        <code>/api/{ct}</code>
                        {ct.includes('error') && (
                          <span className="text-warning ms-2">
                            (existe pero puede tener problemas de permisos)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {contentTypes && (
                <div className="mb-4">
                  <h5 className="mb-3">Content Types desde Content Type Builder API:</h5>
                  <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.85em' }}>
                    <code>{JSON.stringify(contentTypes, null, 2)}</code>
                  </pre>
                </div>
              )}

              {!contentTypes && allContentTypes.length === 0 && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ No se pudieron obtener los content types automáticamente</strong>
                  <p className="mb-2 mt-2">
                    Para encontrar el nombre correcto de la colección de productos:
                  </p>
                  <ol className="mb-0">
                    <li>Ve a Strapi Admin → <strong>Content Manager</strong></li>
                    <li>Busca la colección que contiene los productos/libros</li>
                    <li>Mira la URL cuando abres esa colección (ej: <code>https://strapi.moraleja.cl/admin/content-manager/collection-types/api::producto.producto</code>)</li>
                    <li>El nombre de la colección es la parte después de <code>collection-types/api::</code></li>
                    <li>El endpoint será <code>/api/[nombre-de-la-coleccion]</code></li>
                  </ol>
                </Alert>
              )}

              <Alert variant="info">
                <strong>ℹ️ Instrucciones:</strong>
                <ol className="mb-0 mt-2">
                  <li>Ve a Strapi → Content Manager</li>
                  <li>Revisa qué colecciones de productos existen</li>
                  <li>El nombre de la colección debe ser el mismo que aparece en la URL de Strapi</li>
                  <li>
                    <strong>Para encontrar el nombre exacto:</strong>
                    <ul className="mt-2 mb-0">
                      <li>Abre la colección en Strapi Admin</li>
                      <li>Mira la URL del navegador (ej: <code>https://strapi.moraleja.cl/admin/content-manager/collection-types/api::producto.producto</code>)</li>
                      <li>El nombre está después de <code>collection-types/api::</code></li>
                      <li>Si es <code>api::producto.producto</code>, el endpoint será <code>/api/producto</code></li>
                      <li>Si es <code>api::product-libro-edicion.product-libro-edicion</code>, el endpoint será <code>/api/product-libro-edicion</code></li>
                    </ul>
                  </li>
                  <li>
                    <a href="/api/tienda/diagnostico" target="_blank" className="text-decoration-underline">
                      🔍 Ver diagnóstico completo de todos los content types
                    </a>
                  </li>
                  <li>Una vez que encuentres el nombre correcto, actualiza el código con ese nombre</li>
                </ol>
              </Alert>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

