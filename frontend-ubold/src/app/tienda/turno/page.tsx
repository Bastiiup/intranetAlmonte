import { Container, Alert, Card, CardBody } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import strapiClient from '@/lib/strapi/client'
import { STRAPI_API_URL } from '@/lib/strapi/config'

// Forzar renderizado dinámico (no estático) para poder usar variables de entorno
export const dynamic = 'force-dynamic'

export default async function TurnoPage() {
  let turnos: any[] = []
  let error: string | null = null

  try {
    // Intentar obtener turnos desde Strapi
    // Probamos con diferentes endpoints según las colecciones disponibles
    let response: any = null
    
    // Intentar con "turnos-tiendas" (Turnos. Tienda)
    try {
      response = await strapiClient.get<any>('/api/turnos-tiendas?populate=*&pagination[pageSize]=100')
    } catch {
      // Si falla, intentar con "turnos-tienda"
      try {
        response = await strapiClient.get<any>('/api/turnos-tienda?populate=*&pagination[pageSize]=100')
      } catch {
        // Último intento con "turnos"
        response = await strapiClient.get<any>('/api/turnos?populate=*&pagination[pageSize]=100')
      }
    }
    
    // Strapi devuelve los datos en response.data
    if (Array.isArray(response.data)) {
      turnos = response.data
    } else if (response.data) {
      turnos = [response.data]
    }
  } catch (err: any) {
    // Manejar errores
    error = err.message || 'Error al conectar con Strapi'
    
    // Solo loguear en desarrollo, no en build
    if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
      console.error('Error al obtener turnos:', err)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Número de Atención" subtitle="Tienda" />
      
      <div className="row">
        <div className="col-12">
          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Gestión de Turnos</h4>
              
              {/* Mostrar información de conexión */}
              <Alert variant="info" className="mb-3">
                <strong>URL de Strapi:</strong> {STRAPI_API_URL}
                <br />
                <small className="text-muted">
                  Endpoints probados: 
                  <code>/api/turnos-tiendas</code>, 
                  <code>/api/turnos-tienda</code>, 
                  <code>/api/turnos</code>
                </small>
              </Alert>

              {/* Mostrar error si existe */}
              {error && (
                <Alert variant="warning" className="mb-3">
                  <strong>⚠️ Error:</strong> {error}
                  <br />
                  <small>
                    Asegúrate de que:
                    <ul className="mb-0 mt-2">
                      <li>La colección "Turnos. Tienda" existe en Strapi</li>
                      <li>El API Token está configurado en las variables de entorno</li>
                      <li>Los permisos de la colección están habilitados en Strapi (Settings → Roles → Public → Find)</li>
                    </ul>
                  </small>
                </Alert>
              )}

              {/* Mostrar turnos si existen */}
              {!error && turnos.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Número</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnos.map((turno: any) => (
                        <tr key={turno.id}>
                          <td>#{turno.id}</td>
                          <td>
                            {turno.attributes?.numero || turno.attributes?.numeroTurno || 'N/A'}
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {turno.attributes?.estado || turno.attributes?.status || 'Activo'}
                            </span>
                          </td>
                          <td>
                            {turno.attributes?.createdAt 
                              ? new Date(turno.attributes.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td>
                            <a href={`/tienda/turno/${turno.id}`} className="btn btn-sm btn-primary">
                              Ver
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mensaje si no hay turnos */}
              {!error && turnos.length === 0 && (
                <Alert variant="secondary">
                  <p className="mb-0">
                    No se encontraron turnos. Esto puede significar:
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

