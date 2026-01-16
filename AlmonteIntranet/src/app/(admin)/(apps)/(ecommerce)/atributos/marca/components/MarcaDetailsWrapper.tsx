'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import MarcaDetails from '@/app/(admin)/(apps)/(ecommerce)/atributos/marca/[marcaId]/components/MarcaDetails'

interface MarcaDetailsWrapperProps {
  marcaId: string | null
  onBackToList: () => void
}

const MarcaDetailsWrapper = ({ marcaId, onBackToList }: MarcaDetailsWrapperProps) => {
  const [marca, setMarca] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!marcaId) {
      setMarca(null)
      setError(null)
      return
    }

    const fetchMarca = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/marca/${marcaId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setMarca(data.data)
        } else {
          setError(data.error || 'Error al obtener marca')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchMarca()
  }, [marcaId])

  if (!marcaId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona una marca</h5>
          <p className="mb-0">
            Para ver los detalles de una marca, selecciona una desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando marca...</p>
      </div>
    )
  }

  if (error || !marca) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Marca no encontrada'}
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
              <MarcaDetails marca={marca} marcaId={marcaId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default MarcaDetailsWrapper

