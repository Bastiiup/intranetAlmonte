'use client'

import { useState } from 'react'
import { Card, CardBody, Button, Alert, Form, Row, Col } from 'react-bootstrap'
import { TbPencil } from 'react-icons/tb'
import ProductEditForm from './ProductEditForm'

interface ProductDetailsProps {
  producto: any
  onUpdate?: () => Promise<void> | void
  onProductoUpdate?: (updates: any) => void
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

// Helper para extraer texto de descripción (puede venir en formato blocks o string)
const extractDescriptionText = (descripcion: any): string => {
  if (!descripcion) return ''
  if (typeof descripcion === 'string') return descripcion
  if (Array.isArray(descripcion)) {
    // Formato blocks de Strapi
    return descripcion
      .map((block: any) => {
        if (block.children) {
          return block.children
            .map((child: any) => child.text || '')
            .join('')
        }
        return ''
      })
      .join('\n')
  }
  return ''
}

export function ProductDetails({ producto, onUpdate, onProductoUpdate }: ProductDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Obtener datos del producto (puede venir de attributes o directamente)
  const attrs = producto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)

  const handleEdit = () => {
    setIsEditing(true)
    setError(null)
    setSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    setSuccess(false)
  }

  const handleSave = async (dataToSend: any) => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const productId = producto.id?.toString() || producto.documentId
      
      if (!productId || productId === 'unknown') {
        throw new Error('No se pudo obtener el ID del producto')
      }

      console.log('[ProductDetails] 📤 Enviando:', dataToSend)

      const response = await fetch(`/api/tienda/productos/${productId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const responseData = await response.json()

      if (!responseData.success) {
        throw new Error(responseData.error || 'Error al actualizar')
      }

      console.log('[ProductDetails] ✅ Guardado exitoso')

      // Actualizar estado local
      if (onProductoUpdate) {
        onProductoUpdate(dataToSend)
      }
      
      setSuccess(true)
      setIsEditing(false)
      
      // Refrescar desde servidor
      if (onUpdate) {
        const updateResult = onUpdate()
        if (updateResult && typeof updateResult.catch === 'function') {
          updateResult.catch((err: any) => {
            console.error('[ProductDetails] Error al refrescar:', err)
          })
        }
      }
      
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('[ProductDetails] Error:', err)
      setError(err.message || 'Error al guardar cambios')
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Obtener valores para mostrar en modo vista
  const displayValues = {
    isbn: getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro') || 'N/A',
    nombre: getField(data, 'nombre_libro', 'NOMBRE_LIBRO', 'nombreLibro') || 'N/A',
    subtitulo: getField(data, 'subtitulo_libro', 'SUBTITULO_LIBRO', 'subtituloLibro') || 'N/A',
    descripcion: extractDescriptionText(getField(data, 'descripcion', 'DESCRIPCION', 'descripcion')) || 'N/A',
    numeroEdicion: getField(data, 'numero_edicion', 'NUMERO_EDICION', 'numeroEdicion') || 'N/A',
    agnoEdicion: getField(data, 'agno_edicion', 'AGNO_EDICION', 'agnoEdicion') || 'N/A',
    idioma: getField(data, 'idioma', 'IDIOMA', 'idioma') || 'N/A',
    tipoLibro: getField(data, 'tipo_libro', 'TIPO_LIBRO', 'tipoLibro') || 'N/A',
    estadoEdicion: getField(data, 'estado_edicion', 'ESTADO_EDICION', 'estadoEdicion') || 'N/A',
  }

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">Detalles del Producto</h5>
          
          {!isEditing && (
            <Button
              variant="primary"
              onClick={handleEdit}
            >
              <TbPencil className="me-1" />
              Editar Producto
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            ✅ Producto actualizado exitosamente
          </Alert>
        )}

        {saving && (
          <Alert variant="info" className="mt-3">
            <div className="d-flex align-items-center">
              <Spinner animation="border" size="sm" className="me-2" />
              <div>Guardando cambios...</div>
            </div>
          </Alert>
        )}

        {/* MODO VISTA */}
        {!isEditing ? (
          <Row>
            <Col md={6}>
              <div className="mb-3">
                <Form.Label className="text-muted">ISBN</Form.Label>
                <div className="fw-medium">{displayValues.isbn}</div>
              </div>
            </Col>

            <Col md={6}>
              <div className="mb-3">
                <Form.Label className="text-muted">Nombre del Libro</Form.Label>
                <div className="fw-medium">{displayValues.nombre}</div>
              </div>
            </Col>

            <Col xs={12}>
              <div className="mb-3">
                <Form.Label className="text-muted">Subtítulo</Form.Label>
                <div className="fw-medium">{displayValues.subtitulo}</div>
              </div>
            </Col>

            <Col xs={12}>
              <div className="mb-3">
                <Form.Label className="text-muted">Descripción</Form.Label>
                <div className="fw-medium" style={{ whiteSpace: 'pre-wrap' }}>
                  {displayValues.descripcion}
                </div>
              </div>
            </Col>

            <Col md={4}>
              <div className="mb-3">
                <Form.Label className="text-muted">Número de Edición</Form.Label>
                <div className="fw-medium">{displayValues.numeroEdicion}</div>
              </div>
            </Col>

            <Col md={4}>
              <div className="mb-3">
                <Form.Label className="text-muted">Año de Edición</Form.Label>
                <div className="fw-medium">{displayValues.agnoEdicion}</div>
              </div>
            </Col>

            <Col md={4}>
              <div className="mb-3">
                <Form.Label className="text-muted">Estado</Form.Label>
                <div className="fw-medium">{displayValues.estadoEdicion}</div>
              </div>
            </Col>

            <Col md={6}>
              <div className="mb-3">
                <Form.Label className="text-muted">Idioma</Form.Label>
                <div className="fw-medium">{displayValues.idioma}</div>
              </div>
            </Col>

            <Col md={6}>
              <div className="mb-3">
                <Form.Label className="text-muted">Tipo de Libro</Form.Label>
                <div className="fw-medium">{displayValues.tipoLibro}</div>
              </div>
            </Col>
          </Row>
        ) : (
          /* MODO EDICIÓN COMPLETA */
          <ProductEditForm
            producto={producto}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        )}
      </CardBody>
    </Card>
  )
}

export default ProductDetails
