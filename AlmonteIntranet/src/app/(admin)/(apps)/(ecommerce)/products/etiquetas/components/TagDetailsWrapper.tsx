'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import TagDetails from '@/app/(admin)/(apps)/(ecommerce)/products/etiquetas/[tagId]/components/TagDetails'

interface TagDetailsWrapperProps {
  tagId: string | null
  onBackToList: () => void
}

const TagDetailsWrapper = ({ tagId, onBackToList }: TagDetailsWrapperProps) => {
  const [etiqueta, setEtiqueta] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tagId) {
      setEtiqueta(null)
      setError(null)
      return
    }

    const fetchEtiqueta = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/etiquetas/${tagId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setEtiqueta(data.data)
        } else {
          setError(data.error || 'Error al obtener etiqueta')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchEtiqueta()
  }, [tagId])

  if (!tagId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona una etiqueta</h5>
          <p className="mb-0">
            Para ver los detalles de una etiqueta, selecciona una desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando etiqueta...</p>
      </div>
    )
  }

  if (error || !etiqueta) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Etiqueta no encontrada'}
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
              <TagDetails etiqueta={etiqueta} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TagDetailsWrapper

