'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import ColeccionDetails from '@/app/(admin)/(apps)/(ecommerce)/products/atributos/colecciones/[coleccionId]/components/ColeccionDetails'

interface ColeccionDetailsWrapperProps {
  coleccionId: string | null
  onBackToList: () => void
}

const ColeccionDetailsWrapper = ({ coleccionId, onBackToList }: ColeccionDetailsWrapperProps) => {
  const [coleccion, setColeccion] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!coleccionId) {
      setColeccion(null)
      setError(null)
      return
    }

    const fetchColeccion = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/colecciones/${coleccionId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setColeccion(data.data)
        } else {
          setError(data.error || 'Error al obtener colección')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchColeccion()
  }, [coleccionId])

  if (!coleccionId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona una colección</h5>
          <p className="mb-0">
            Para ver los detalles de una colección, selecciona una desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando colección...</p>
      </div>
    )
  }

  if (error || !coleccion) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Colección no encontrada'}
            <div className="mt-3">
              <Button variant="outline-primary" onClick={onBackToList}>
                <TbArrowLeft className="me-1" />
                Volver al listado
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <Button variant="outline-secondary" onClick={onBackToList}>
          <TbArrowLeft className="me-1" />
          Volver al listado
        </Button>
      </div>

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <ColeccionDetails coleccion={coleccion} coleccionId={coleccionId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ColeccionDetailsWrapper

