'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, Button, Alert, Form, Row, Col, Spinner } from 'react-bootstrap'
import { TbPencil, TbCheck, TbX, TbEdit } from 'react-icons/tb'

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
  
  // Estados para todos los campos editables
  const [formData, setFormData] = useState({
    isbn_libro: getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro') || '',
    nombre_libro: getField(data, 'nombre_libro', 'NOMBRE_LIBRO', 'nombreLibro') || '',
    subtitulo_libro: getField(data, 'subtitulo_libro', 'SUBTITULO_LIBRO', 'subtituloLibro') || '',
    descripcion: extractDescriptionText(getField(data, 'descripcion', 'DESCRIPCION', 'descripcion')) || '',
    numero_edicion: getField(data, 'numero_edicion', 'NUMERO_EDICION', 'numeroEdicion') || '',
    agno_edicion: getField(data, 'agno_edicion', 'AGNO_EDICION', 'agnoEdicion') || '',
    idioma: getField(data, 'idioma', 'IDIOMA', 'idioma') || '',
    tipo_libro: getField(data, 'tipo_libro', 'TIPO_LIBRO', 'tipoLibro') || '',
    estado_edicion: getField(data, 'estado_edicion', 'ESTADO_EDICION', 'estadoEdicion') || 'Vigente',
  })

  // Resetear form cuando cambia el producto
  useEffect(() => {
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    setFormData({
      isbn_libro: getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro') || '',
      nombre_libro: getField(data, 'nombre_libro', 'NOMBRE_LIBRO', 'nombreLibro') || '',
      subtitulo_libro: getField(data, 'subtitulo_libro', 'SUBTITULO_LIBRO', 'subtituloLibro') || '',
      descripcion: extractDescriptionText(getField(data, 'descripcion', 'DESCRIPCION', 'descripcion')) || '',
      numero_edicion: getField(data, 'numero_edicion', 'NUMERO_EDICION', 'numeroEdicion') || '',
      agno_edicion: getField(data, 'agno_edicion', 'AGNO_EDICION', 'agnoEdicion') || '',
      idioma: getField(data, 'idioma', 'IDIOMA', 'idioma') || '',
      tipo_libro: getField(data, 'tipo_libro', 'TIPO_LIBRO', 'tipoLibro') || '',
      estado_edicion: getField(data, 'estado_edicion', 'ESTADO_EDICION', 'estadoEdicion') || 'Vigente',
    })
  }, [producto])

  const resetForm = () => {
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    setFormData({
      isbn_libro: getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro') || '',
      nombre_libro: getField(data, 'nombre_libro', 'NOMBRE_LIBRO', 'nombreLibro') || '',
      subtitulo_libro: getField(data, 'subtitulo_libro', 'SUBTITULO_LIBRO', 'subtituloLibro') || '',
      descripcion: extractDescriptionText(getField(data, 'descripcion', 'DESCRIPCION', 'descripcion')) || '',
      numero_edicion: getField(data, 'numero_edicion', 'NUMERO_EDICION', 'numeroEdicion') || '',
      agno_edicion: getField(data, 'agno_edicion', 'AGNO_EDICION', 'agnoEdicion') || '',
      idioma: getField(data, 'idioma', 'IDIOMA', 'idioma') || '',
      tipo_libro: getField(data, 'tipo_libro', 'TIPO_LIBRO', 'tipoLibro') || '',
      estado_edicion: getField(data, 'estado_edicion', 'ESTADO_EDICION', 'estadoEdicion') || 'Vigente',
    })
  }

  const handleEdit = () => {
    resetForm()
    setIsEditing(true)
    setError(null)
    setSuccess(false)
  }

  const handleCancel = () => {
    resetForm()
    setIsEditing(false)
    setError(null)
    setSuccess(false)
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Validar campos requeridos
      if (!formData.nombre_libro.trim()) {
        throw new Error('El nombre del libro es obligatorio')
      }

      const productId = producto.id?.toString() || producto.documentId
      
      if (!productId || productId === 'unknown') {
        throw new Error('No se pudo obtener el ID del producto')
      }

      // Preparar datos (optimizado - hacer todo en el frontend)
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim()
      }

      if (formData.isbn_libro?.trim()) {
        dataToSend.isbn_libro = formData.isbn_libro.trim()
      }

      if (formData.subtitulo_libro?.trim()) {
        dataToSend.subtitulo_libro = formData.subtitulo_libro.trim()
      }

      // Descripción - Ya preparar en formato blocks aquí (optimización)
      if (formData.descripcion?.trim()) {
        dataToSend.descripcion = [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: formData.descripcion.trim() }]
          }
        ]
      }

      if (formData.numero_edicion) {
        const numEdicion = parseInt(formData.numero_edicion)
        if (!isNaN(numEdicion)) {
          dataToSend.numero_edicion = numEdicion
        }
      }

      if (formData.agno_edicion) {
        const agnoEdicion = parseInt(formData.agno_edicion)
        if (!isNaN(agnoEdicion)) {
          dataToSend.agno_edicion = agnoEdicion
        }
      }

      if (formData.idioma) dataToSend.idioma = formData.idioma
      if (formData.tipo_libro) dataToSend.tipo_libro = formData.tipo_libro
      if (formData.estado_edicion) dataToSend.estado_edicion = formData.estado_edicion

      console.log('[ProductDetails] 📤 Enviando:', dataToSend)

      // UNA SOLA llamada al API
      const response = await fetch(`/api/tienda/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al actualizar')
      }

      console.log('[ProductDetails] ✅ Guardado exitoso')

      // Actualizar estado local inmediatamente (optimistic update)
      if (onProductoUpdate) {
        onProductoUpdate(dataToSend)
      }
      
      setSuccess(true)
      setIsEditing(false)
      
      // Refrescar desde servidor en segundo plano (sin esperar)
      if (onUpdate) {
        // onUpdate puede ser async o sync, manejarlo apropiadamente
        const updateResult = onUpdate()
        if (updateResult && typeof updateResult.catch === 'function') {
          updateResult.catch((err: any) => {
            console.error('[ProductDetails] Error al refrescar:', err)
          })
        }
      }
      
      // Ocultar mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)

    } catch (err: any) {
      console.error('[ProductDetails] Error:', err)
      setError(err.message || 'Error al guardar cambios')
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
          
          {!isEditing ? (
            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                onClick={() => router.push(`/edit-product/${productId}`)}
              >
                <TbEdit className="me-1" />
                Editar Producto Completo
              </Button>
              <Button variant="outline-primary" onClick={handleEdit}>
                <TbPencil className="me-1" />
                Edición Rápida
              </Button>
            </div>
          ) : (
            <div className="btn-group">
              <Button
                variant="success"
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <TbCheck className="me-1" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                <TbX className="me-1" />
                Cancelar
              </Button>
            </div>
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
          /* MODO EDICIÓN */
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>ISBN</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.isbn_libro}
                  onChange={(e) => setFormData({...formData, isbn_libro: e.target.value})}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Nombre del Libro <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  required
                  value={formData.nombre_libro}
                  onChange={(e) => setFormData({...formData, nombre_libro: e.target.value})}
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group className="mb-3">
                <Form.Label>Subtítulo</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.subtitulo_libro}
                  onChange={(e) => setFormData({...formData, subtitulo_libro: e.target.value})}
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group className="mb-3">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
                <Form.Text className="text-muted">
                  La descripción se guardará en formato de texto enriquecido
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Número de Edición</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.numero_edicion}
                  onChange={(e) => setFormData({...formData, numero_edicion: e.target.value})}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Año de Edición</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="2024"
                  value={formData.agno_edicion}
                  onChange={(e) => setFormData({...formData, agno_edicion: e.target.value})}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Estado de Edición</Form.Label>
                <Form.Select
                  value={formData.estado_edicion}
                  onChange={(e) => setFormData({...formData, estado_edicion: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Vigente">Vigente</option>
                  <option value="Agotado">Agotado</option>
                  <option value="Descatalogado">Descatalogado</option>
                  <option value="Próximamente">Próximamente</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Idioma</Form.Label>
                <Form.Select
                  value={formData.idioma}
                  onChange={(e) => setFormData({...formData, idioma: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Español">Español</option>
                  <option value="Inglés">Inglés</option>
                  <option value="Francés">Francés</option>
                  <option value="Alemán">Alemán</option>
                  <option value="Portugués">Portugués</option>
                  <option value="Italiano">Italiano</option>
                  <option value="Otro">Otro</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo de Libro</Form.Label>
                <Form.Select
                  value={formData.tipo_libro}
                  onChange={(e) => setFormData({...formData, tipo_libro: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Plan Lector">Plan Lector</option>
                  <option value="Texto Curricular">Texto Curricular</option>
                  <option value="Texto PAES">Texto PAES</option>
                  <option value="Texto Complementario">Texto Complementario</option>
                  <option value="Otro">Otro</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Alert variant="info">
                <strong>ℹ️ Nota:</strong> Revisa todos los campos antes de guardar. Los cambios se aplicarán al presionar "Guardar Cambios".
              </Alert>
            </Col>
          </Row>
        )}
      </CardBody>
    </Card>
  )
}

export default ProductDetails
