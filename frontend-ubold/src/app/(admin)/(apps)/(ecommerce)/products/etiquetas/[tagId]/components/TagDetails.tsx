'use client'

import { Badge, Col, Row, Alert } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import EditableField from '@/app/(admin)/(apps)/(ecommerce)/products/[productId]/components/EditableField'

interface TagDetailsProps {
  etiqueta: any
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

const TagDetails = ({ etiqueta }: TagDetailsProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<string | null>(null)

  const attrs = etiqueta.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (etiqueta as any)

  const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || etiqueta.publishedAt)
  const createdAt = attrs.createdAt || etiqueta.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || etiqueta.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que etiqueta existe
  if (!etiqueta) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la etiqueta.
      </Alert>
    )
  }

  // Obtener el ID correcto
  const tagId = etiqueta.id?.toString() || etiqueta.documentId
  
  // Validar que tenemos un ID válido
  if (!tagId || tagId === 'unknown') {
    console.error('[TagDetails] No se pudo obtener un ID válido de la etiqueta:', {
      id: etiqueta.id,
      documentId: etiqueta.documentId,
      etiqueta: etiqueta,
    })
  }

  const handleSaveNombre = async (newValue: string) => {
    console.log('[TagDetails] ===== INICIANDO GUARDADO DE NOMBRE =====')
    console.log('[TagDetails] Datos de la etiqueta:', {
      id: etiqueta.id,
      documentId: etiqueta.documentId,
      tagId,
      nombreActual: nombre,
      nombreNuevo: newValue,
    })
    
    if (!tagId || tagId === 'unknown') {
      console.error('[TagDetails] ❌ ID inválido:', { tagId })
      throw new Error('No se pudo obtener el ID de la etiqueta')
    }

    setSavingField('nombre')
    setError(null)

    try {
      const url = `/api/tienda/etiquetas/${tagId}`
      const body = JSON.stringify({
        data: {
          name: newValue,
        },
      })
      
      console.log('[TagDetails] Enviando petición PUT:', {
        url,
        tagId,
        body,
      })
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error HTTP: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar nombre')
      }

      console.log('[TagDetails] ✅ Nombre guardado exitosamente')
      
      // Recargar la página para mostrar los cambios
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar nombre'
      setError(errorMessage)
      console.error('[TagDetails] Error al guardar nombre:', {
        tagId,
        error: errorMessage,
        err,
      })
      throw err // Re-lanzar para que EditableField muestre el error
    } finally {
      setSavingField(null)
    }
  }

  const handleSaveDescripcion = async (newValue: string) => {
    console.log('[TagDetails] ===== INICIANDO GUARDADO DE DESCRIPCIÓN =====')
    
    if (!tagId || tagId === 'unknown') {
      console.error('[TagDetails] ❌ ID inválido:', { tagId })
      throw new Error('No se pudo obtener el ID de la etiqueta')
    }

    setSavingField('descripcion')
    setError(null)

    try {
      const url = `/api/tienda/etiquetas/${tagId}`
      const body = JSON.stringify({
        data: {
          descripcion: newValue,
        },
      })
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Error HTTP: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar descripción')
      }

      console.log('[TagDetails] ✅ Descripción guardada exitosamente')
      
      // Recargar la página para mostrar los cambios
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar descripción'
      setError(errorMessage)
      console.error('[TagDetails] Error al guardar descripción:', {
        tagId,
        error: errorMessage,
        err,
      })
      throw err
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <Row className="g-4">
        <Col xs={12}>
          <div className="mb-4">
            <h3 className="mb-3">Información de la Etiqueta</h3>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Nombre</label>
              <EditableField
                value={nombre}
                onSave={handleSaveNombre}
                label="nombre"
                placeholder="Sin nombre"
                as="h4"
                className="mb-0"
              />
              {savingField === 'nombre' && (
                <small className="text-muted d-block mt-1">Guardando...</small>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Descripción</label>
              <EditableField
                value={descripcion}
                onSave={handleSaveDescripcion}
                label="descripción"
                placeholder="Sin descripción"
                type="textarea"
                as="p"
                className="mb-0"
              />
              {savingField === 'descripcion' && (
                <small className="text-muted d-block mt-1">Guardando...</small>
              )}
            </div>
          </div>
        </Col>

        <Col xs={12}>
          <div className="border-top pt-4">
            <h5 className="mb-3">Información Adicional</h5>
            
            <Row className="g-3">
              <Col md={6}>
                <div>
                  <label className="form-label text-muted">Productos asociados</label>
                  <div>
                    <Badge bg="info" className="fs-base">
                      {productosCount} producto{productosCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div>
                  <label className="form-label text-muted">Estado</label>
                  <div>
                    <Badge bg={isPublished ? 'success' : 'secondary'} className="fs-base">
                      {isPublished ? 'Publicada' : 'Borrador'}
                    </Badge>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div>
                  <label className="form-label text-muted">Fecha de creación</label>
                  <div>
                    <span className="text-dark">
                      {format(createdDate, 'dd MMM, yyyy')} <small className="text-muted">{format(createdDate, 'h:mm a')}</small>
                    </span>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <div>
                  <label className="form-label text-muted">Última actualización</label>
                  <div>
                    <span className="text-dark">
                      {format(updatedDate, 'dd MMM, yyyy')} <small className="text-muted">{format(updatedDate, 'h:mm a')}</small>
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default TagDetails

