'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Button, Card, CardBody, Row, Col } from 'react-bootstrap'
import { TbArrowLeft } from 'react-icons/tb'

import CategoryDetails from '@/app/(admin)/(apps)/(ecommerce)/products/categorias/[categoryId]/components/CategoryDetails'

interface CategoryDetailsWrapperProps {
  categoryId: string | null
  onBackToList: () => void
}

const CategoryDetailsWrapper = ({ categoryId, onBackToList }: CategoryDetailsWrapperProps) => {
  const [categoria, setCategoria] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryId) {
      setCategoria(null)
      setError(null)
      return
    }

    const fetchCategoria = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tienda/categorias/${categoryId}`, {
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setCategoria(data.data)
        } else {
          setError(data.error || 'Error al obtener categoría')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar con la API')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoria()
  }, [categoryId])

  if (!categoryId) {
    return (
      <div className="text-center p-5">
        <Alert variant="info">
          <h5>Selecciona una categoría</h5>
          <p className="mb-0">
            Para ver los detalles de una categoría, selecciona una desde el tab de <strong>Listado</strong> o <strong>Grid</strong>.
          </p>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando categoría...</p>
      </div>
    )
  }

  if (error || !categoria) {
    return (
      <div>
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Categoría no encontrada'}
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
              <CategoryDetails categoria={categoria} categoryId={categoryId} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CategoryDetailsWrapper

