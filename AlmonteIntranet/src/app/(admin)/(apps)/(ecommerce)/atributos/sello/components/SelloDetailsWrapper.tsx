'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import SelloDetails from '@/app/(admin)/(apps)/(ecommerce)/atributos/sello/[selloId]/components/SelloDetails'

interface SelloDetailsWrapperProps {
  selloId: string | null
  onBackToList: () => void
}

const SelloDetailsWrapper = ({ selloId, onBackToList }: SelloDetailsWrapperProps) => {
  const [sello, setSello] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selloId) {
      setSello(null)
      setError(null)
      return
    }

    const fetchSello = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/sello/${selloId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setSello(data.data)
        } else {
          setError(data.error || 'Error al obtener sello')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchSello()
  }, [selloId])

  if (!selloId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona un sello</h5>
          <p className="mb-0">
            Para ver los detalles de un sello, selecciona uno desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando sello...</p>
      </div>
    )
  }

  if (error || !sello) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Sello no encontrado'}
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
              <SelloDetails sello={sello} selloId={selloId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SelloDetailsWrapper

