'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import AutorDetails from '@/app/(admin)/(apps)/(ecommerce)/products/atributos/autores/[autorId]/components/AutorDetails'

interface AutorDetailsWrapperProps {
  autorId: string | null
  onBackToList: () => void
}

const AutorDetailsWrapper = ({ autorId, onBackToList }: AutorDetailsWrapperProps) => {
  const [autor, setAutor] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!autorId) {
      setAutor(null)
      setError(null)
      return
    }

    const fetchAutor = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/autores/${autorId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setAutor(data.data)
        } else {
          setError(data.error || 'Error al obtener autor')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchAutor()
  }, [autorId])

  if (!autorId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona un autor</h5>
          <p className="mb-0">
            Para ver los detalles de un autor, selecciona uno desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando autor...</p>
      </div>
    )
  }

  if (error || !autor) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Autor no encontrado'}
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
              <AutorDetails autor={autor} autorId={autorId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AutorDetailsWrapper

