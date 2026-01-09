'use client'

import { useEffect, useState } from 'react'
import { Alert, Card, CardBody, Container, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export default function ProductsDebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/tienda/debug-productos', {
          cache: 'no-store',
        })
        const result = await response.json()
        
        if (result.success) {
          setData(result.analisis)
        } else {
          setError(result.error || 'Error al obtener datos de debug')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchDebugData()
  }, [])

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Debug Productos" subtitle="Ecommerce" />
        <Alert variant="info">Cargando información de productos...</Alert>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Debug Productos" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  if (!data) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Debug Productos" subtitle="Ecommerce" />
        <Alert variant="warning">No se obtuvieron datos</Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Debug Productos Strapi" subtitle="Ecommerce" />
      
      <div className="mb-4">
        <Alert variant="info">
          <strong>Total de productos en Strapi:</strong> {data.total}
        </Alert>
      </div>

      <Card className="mb-4">
        <CardBody>
          <h4 className="mb-3">📋 IDs Disponibles</h4>
          <p className="text-muted">
            Estos son los IDs que puedes usar para acceder a los productos:
          </p>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>ID Numérico</th>
                <th>Document ID</th>
                <th>Nombre</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.idsDisponibles.map((producto: any, index: number) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <code>{producto.id}</code>
                  </td>
                  <td>
                    <code className="text-muted">{producto.documentId}</code>
                  </td>
                  <td>{producto.nombre}</td>
                  <td>
                    <a 
                      href={`/products/${producto.id}`}
                      className="btn btn-sm btn-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver Producto
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <h4 className="mb-3">🔍 Estructura del Primer Producto</h4>
          <pre className="bg-light p-3 rounded" style={{ maxHeight: '500px', overflow: 'auto' }}>
            <code>{JSON.stringify(data.primerProductoCompleto, null, 2)}</code>
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h4 className="mb-3">📊 Análisis de Estructura</h4>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>Document ID</th>
                <th>Nombre</th>
                <th>Tiene Attributes</th>
                <th>Keys Directas</th>
                <th>Keys Attributes</th>
              </tr>
            </thead>
            <tbody>
              {data.productos.slice(0, 10).map((producto: any, index: number) => (
                <tr key={index}>
                  <td>{producto.indice}</td>
                  <td><code>{producto.id}</code></td>
                  <td><code className="text-muted">{producto.documentId}</code></td>
                  <td>{producto.nombre}</td>
                  <td>{producto.tieneAttributes ? '✅' : '❌'}</td>
                  <td>
                    <small>
                      {producto.estructura.keysDirectas.slice(0, 5).join(', ')}
                      {producto.estructura.keysDirectas.length > 5 && '...'}
                    </small>
                  </td>
                  <td>
                    <small>
                      {producto.estructura.keysAttributes.slice(0, 5).join(', ')}
                      {producto.estructura.keysAttributes.length > 5 && '...'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </Container>
  )
}

