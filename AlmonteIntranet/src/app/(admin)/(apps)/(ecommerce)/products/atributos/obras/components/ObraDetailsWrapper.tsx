'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import ObraDetails from '@/app/(admin)/(apps)/(ecommerce)/products/atributos/obras/[obraId]/components/ObraDetails'

interface ObraDetailsWrapperProps {
  obraId: string | null
  onBackToList: () => void
}

const ObraDetailsWrapper = ({ obraId, onBackToList }: ObraDetailsWrapperProps) => {
  const [obra, setObra] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!obraId) {
      setObra(null)
      setError(null)
      return
    }

    const fetchObra = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/obras/${obraId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setObra(data.data)
        } else {
          setError(data.error || 'Error al obtener obra')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchObra()
  }, [obraId])

  if (!obraId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona una obra</h5>
          <p className="mb-0">
            Para ver los detalles de una obra, selecciona una desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando obra...</p>
      </div>
    )
  }

  if (error || !obra) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Obra no encontrada'}
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
              <ObraDetails obra={obra} obraId={obraId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ObraDetailsWrapper

