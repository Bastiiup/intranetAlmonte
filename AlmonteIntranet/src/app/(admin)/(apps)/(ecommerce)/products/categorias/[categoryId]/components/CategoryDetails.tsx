'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'
import Image from 'next/image'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface CategoryDetailsProps {
  categoria: any
  categoryId: string
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

const CategoryDetails = ({ categoria: initialCategoria, categoryId }: CategoryDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [categoria, setCategoria] = useState(initialCategoria)
  
  const attrs = categoria.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)

  // Obtener imagen actual
  const imagenActual = data.imagen?.data || data.imagen
  const getImageUrl = (): string | null => {
    if (!imagenActual) return null
    
    const url = imagenActual.attributes?.url || imagenActual.url
    if (!url) return null
    
    // Si la URL ya es completa, retornarla tal cual
    if (url.startsWith('http')) {
      return url
    }
    
    // Si no, construir la URL completa con la base de Strapi
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${baseUrl}${cleanUrl}`
  }
  const imagenUrl = getImageUrl()

  // Inicializar formData con los valores de la categoría
  const [formData, setFormData] = useState({
    nombre: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
    imagen: null as File | null,
    imagenActualId: imagenActual?.id || null,
  })

  // Actualizar formData cuando cambie la categoría
  useEffect(() => {
    const attrs = categoria.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)
    const imagenActual = data.imagen?.data || data.imagen
    
    setFormData({
      nombre: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
      descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
      imagen: null,
      imagenActualId: imagenActual?.id || null,
    })
  }, [categoria])

  // Obtener el ID correcto
  const catId = categoria.id?.toString() || categoria.documentId || categoryId
  
  // Contar productos (si hay relación)
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || categoria.publishedAt)
  const createdAt = attrs.createdAt || categoria.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || categoria.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que categoría existe
  if (!categoria) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información de la categoría.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!catId || catId === 'unknown') {
    console.error('[CategoryDetails] No se pudo obtener un ID válido de la categoría:', {
      id: categoria.id,
      documentId: categoria.documentId,
      categoria: categoria,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID de la categoría.
      </Alert>
    )
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        imagen: e.target.files![0],
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('[CategoryDetails] ===== INICIANDO GUARDADO =====')
      console.log('[CategoryDetails] Datos de la categoría:', {
        id: categoria.id,
        documentId: categoria.documentId,
        catId,
        formData,
      })

      // Primero subir la imagen si existe una nueva
      let imagenId = formData.imagenActualId
      if (formData.imagen) {
        console.log('[CategoryDetails] Subiendo nueva imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.imagen)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          imagenId = uploadResult.id
          console.log('[CategoryDetails] Nueva imagen subida con ID:', imagenId)
        } else {
          console.warn('[CategoryDetails] No se pudo subir la imagen:', uploadResult.error)
          throw new Error(uploadResult.error || 'Error al subir la imagen')
        }
      }

      const url = `/api/tienda/categorias/${catId}`
      const body = JSON.stringify({
        data: {
          name: formData.nombre,
          descripcion: formData.descripcion || null,
          imagen: imagenId,
        },
      })
      
      console.log('[CategoryDetails] Enviando petición PUT:', {
        url,
        catId,
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
        throw new Error(result.error || 'Error al guardar cambios')
      }

      console.log('[CategoryDetails] ✅ Cambios guardados exitosamente:', result)
      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setCategoria(result.data)
        const updatedData = result.data.attributes || result.data
        const imagenActual = updatedData.imagen?.data || updatedData.imagen
        
        setFormData({
          nombre: getField(updatedData, 'name', 'nombre', 'NOMBRE', 'NAME') || formData.nombre,
          descripcion: getField(updatedData, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || formData.descripcion,
          imagen: null,
          imagenActualId: imagenActual?.id || null,
        })
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[CategoryDetails] Error al guardar:', {
        catId,
        error: errorMessage,
        err,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <h5 className="mb-0">Editar Categoría</h5>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              ¡Cambios guardados exitosamente!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={12}>
                <FormGroup>
                  <FormLabel>
                    Nombre de la Categoría <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Libros, Material Escolar"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    required
                  />
                  <small className="text-muted">
                    Nombre de la categoría que se mostrará en los productos
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={3}
                    placeholder="Descripción de la categoría..."
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Opcional. Descripción de la categoría
                  </small>
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Imagen</FormLabel>
                  {imagenUrl && !formData.imagen && (
                    <div className="mb-2">
                      <Image
                        src={imagenUrl}
                        alt={formData.nombre || 'Categoría'}
                        width={150}
                        height={150}
                        className="img-fluid rounded"
                        style={{ objectFit: 'cover' }}
                        unoptimized={imagenUrl.startsWith('http')}
                      />
                      <small className="text-muted d-block mt-1">
                        Imagen actual
                      </small>
                    </div>
                  )}
                  {formData.imagen && (
                    <div className="mb-2">
                      <small className="text-muted d-block">
                        Nueva imagen seleccionada: {formData.imagen.name}
                      </small>
                    </div>
                  )}
                  <FormControl
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <small className="text-muted">
                    Opcional. Selecciona una nueva imagen para reemplazar la actual
                  </small>
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                <LuSave className="fs-sm me-2" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() => router.back()}
              >
                <LuX className="fs-sm me-2" />
                Cancelar
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <h5 className="mb-0">Información Adicional</h5>
        </CardHeader>
        <CardBody>
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
        </CardBody>
      </Card>
    </div>
  )
}

export default CategoryDetails

