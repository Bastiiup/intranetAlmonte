import { Container, Alert, Card, CardBody, Badge } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'
import ProductosGrid from './components/ProductosGrid'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  let productos: any[] = []
  let error: string | null = null

  try {
    // Intentar obtener productos desde Strapi
    // Probamos con diferentes endpoints según las colecciones disponibles
    let response: any = null
    
    // Intentar primero con variaciones de "Product · Libro · Edición"
    try {
      response = await strapiClient.get<any>('/api/product-libro-edicion?populate=*&pagination[pageSize]=100')
    } catch {
      try {
        response = await strapiClient.get<any>('/api/product-libro-edicions?populate=*&pagination[pageSize]=100')
      } catch {
        try {
          response = await strapiClient.get<any>('/api/producto-libro-edicion?populate=*&pagination[pageSize]=100')
        } catch {
          try {
            response = await strapiClient.get<any>('/api/libro-edicion?populate=*&pagination[pageSize]=100')
          } catch {
            try {
              response = await strapiClient.get<any>('/api/edicion?populate=*&pagination[pageSize]=100')
            } catch {
              try {
                // Intentar con "producto" simple
                response = await strapiClient.get<any>('/api/producto?populate=*&pagination[pageSize]=100')
              } catch {
                try {
                  response = await strapiClient.get<any>('/api/productos?populate=*&pagination[pageSize]=100')
                } catch {
                  try {
                    response = await strapiClient.get<any>('/api/products?populate=*&pagination[pageSize]=100')
                  } catch {
                    // Último intento con ecommerce
                    response = await strapiClient.get<any>('/api/ecommerce-productos?populate=*&pagination[pageSize]=100')
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Strapi devuelve los datos en response.data
    if (Array.isArray(response.data)) {
      productos = response.data
    } else if (response.data) {
      productos = [response.data]
    }
  } catch (err: any) {
    error = err.message || 'Error al conectar con Strapi'
    
    if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
      console.error('Error al obtener productos:', err)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Gestionar Productos" subtitle="Tienda" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="card-title mb-0">Productos de Strapi</h4>
                {!error && productos.length > 0 && (
                  <Badge bg="success" className="fs-6 px-3 py-2">
                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                  </Badge>
                )}
              </div>
              
              {/* Mostrar información de conexión */}
              <Alert variant="info" className="mb-4">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                    <br />
                <small className="text-muted">
                  Endpoints probados: <code>/api/product-libro-edicion</code>, <code>/api/producto</code>, etc.
                  <br />
                  <a href="/tienda/productos/debug" className="text-decoration-underline">
                    Ver todos los endpoints probados
                  </a>
                </small>
                  </div>
                  <a href="/tienda/productos/debug" className="text-decoration-underline">
                    🔍 Diagnóstico
                  </a>
                </div>
              </Alert>

              {/* Mostrar error si existe */}
              {error && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Error:</strong> {error}
                  <br />
                  <small>
                    Asegúrate de que:
                    <ul className="mb-0 mt-2">
                      <li>La colección de productos existe en Strapi</li>
                      <li>El API Token está configurado</li>
                      <li>Los permisos están habilitados en Strapi (Settings → Roles → Public → Find)</li>
                    </ul>
                  </small>
                </Alert>
              )}

              {/* Grid de Productos */}
              <ProductosGrid productos={productos} error={error} />
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

