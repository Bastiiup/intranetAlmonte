import { Container, Alert, Card, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
  let productos: any[] = []
  let error: string | null = null

  try {
    // Intentar obtener productos desde Strapi
    // Probamos con diferentes endpoints según las colecciones disponibles
    let response: any = null
    
    // Intentar primero con "producto" (singular, como aparece en Strapi)
    try {
      response = await strapiClient.get<any>('/api/producto?populate=*&pagination[pageSize]=100')
    } catch {
      try {
        // Intentar con plural por si acaso
        response = await strapiClient.get<any>('/api/productos?populate=*&pagination[pageSize]=100')
      } catch {
        try {
          response = await strapiClient.get<any>('/api/products?populate=*&pagination[pageSize]=100')
        } catch {
          // Intentar con la colección de productos de ecommerce
          response = await strapiClient.get<any>('/api/ecommerce-productos?populate=*&pagination[pageSize]=100')
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
              <h4 className="card-title mb-4">Lista de Productos</h4>
              
              {/* Mostrar información de conexión */}
              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <small className="text-muted">
                  Endpoints probados: 
                  <code>/api/producto</code> (principal), 
                  <code>/api/productos</code>, 
                  <code>/api/products</code>, 
                  <code>/api/ecommerce-productos</code>
                </small>
                <br />
                <a href="/tienda/productos/debug" className="text-decoration-underline mt-2 d-inline-block">
                  🔍 Ver diagnóstico completo de endpoints
                </a>
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

              {/* Mostrar productos si existen */}
              {!error && productos.length > 0 && (
                <>
                  <Alert variant="success" className="mb-3">
                    <strong>✅ {productos.length} producto(s) encontrado(s)</strong>
                  </Alert>
                  
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((producto: any) => {
                          const attrs = producto.attributes || {}
                          
                          const nombre = 
                            attrs.nombre || 
                            attrs.name || 
                            attrs.titulo ||
                            attrs.title ||
                            'Sin nombre'
                          
                          const precio = 
                            attrs.precio || 
                            attrs.price || 
                            attrs.precio_venta ||
                            0
                          
                          const stock = 
                            attrs.stock || 
                            attrs.cantidad ||
                            attrs.inventory ||
                            0
                          
                          const estado = 
                            attrs.estado || 
                            attrs.status ||
                            (attrs.publishedAt ? 'Publicado' : 'Borrador')
                          
                          return (
                            <tr key={producto.id}>
                              <td>#{producto.id}</td>
                              <td>
                                <strong>{nombre}</strong>
                              </td>
                              <td>${precio.toLocaleString('es-CL')}</td>
                              <td>
                                <span className={`badge ${
                                  stock > 0 ? 'bg-success' : 'bg-danger'
                                }`}>
                                  {stock}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  estado === 'Publicado' || estado === 'published' ? 'bg-success' : 
                                  estado === 'Borrador' || estado === 'draft' ? 'bg-secondary' : 
                                  'bg-primary'
                                }`}>
                                  {estado}
                                </span>
                              </td>
                              <td>
                                <a 
                                  href={`/tienda/productos/${producto.id}`} 
                                  className="btn btn-sm btn-primary me-1"
                                >
                                  Editar
                                </a>
                                <a 
                                  href={`/tienda/productos/${producto.id}`} 
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  Ver
                                </a>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Mensaje si no hay productos */}
              {!error && productos.length === 0 && (
                <Alert variant="secondary">
                  <p className="mb-0">
                    No se encontraron productos. Esto puede significar:
                  </p>
                  <ul className="mb-0 mt-2">
                    <li>La colección está vacía en Strapi</li>
                    <li>El nombre de la colección es diferente (revisa la URL en el mensaje de arriba)</li>
                    <li>Los permisos no están configurados correctamente</li>
                  </ul>
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  )
}

