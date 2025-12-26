'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'

interface CategoriaDetailsProps {
  categoria: any
  categoriaId: string
  error?: string | null
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

const CategoriaDetails = ({ categoria: initialCategoria, categoriaId, error: initialError }: CategoriaDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [categoria, setCategoria] = useState(initialCategoria)
  
  if (!categoria && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información de la categoría.
      </Alert>
    )
  }

  if (initialError && !categoria) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = categoria.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)

  // Inicializar formData
  const [formData, setFormData] = useState({
    name: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
    descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
    imagen: null as File | null,
  })

  // Actualizar formData cuando cambie la categoría
  useEffect(() => {
    if (categoria) {
      const attrs = categoria.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (categoria as any)
      
      setFormData({
        name: getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || '',
        descripcion: getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || '',
        imagen: null,
      })
    }
  }, [categoria])

  // Obtener el ID correcto
  const catId = categoria.id?.toString() || categoria.documentId || categoriaId
  
  // Contar productos
  const productos = data.productos?.data || data.products?.data || data.productos || data.products || []
  const productosCount = Array.isArray(productos) ? productos.length : 0

  const isPublished = !!(attrs.publishedAt || categoria.publishedAt)
  const createdAt = attrs.createdAt || categoria.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)

  // Obtener estado_publicacion
  const estadoPublicacionRaw = getField(data, 'estado_publicacion', 'ESTADO_PUBLICACION', 'estadoPublicacion') || 'pendiente'
  const estadoPublicacion = typeof estadoPublicacionRaw === 'string' 
    ? estadoPublicacionRaw.toLowerCase() 
    : estadoPublicacionRaw

  // Obtener URL de imagen
  const getImageUrl = (): string | null => {
    let imagen = data.imagen || data.image || data.IMAGEN || data.IMAGE
    
    if (imagen?.data) {
      imagen = Array.isArray(imagen.data) ? imagen.data[0] : imagen.data
    }
    
    if (!imagen || imagen === null) {
      return null
    }

    const url = imagen.attributes?.url || imagen.attributes?.URL || imagen.url || imagen.URL
    if (!url) {
      return null
    }
    
    if (url.startsWith('http')) {
      return url
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/$/, '') || 'http://localhost:1337'
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!formData.name.trim()) {
        throw new Error('El nombre de la categoría es obligatorio')
      }

      // Subir imagen si hay una nueva
      let imagenId = null
      if (formData.imagen) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.imagen)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()
        if (uploadResult.success && uploadResult.id) {
          imagenId = uploadResult.id
        }
      }

      const updateData: any = {
        data: {
          name: formData.name.trim(),
          descripcion: formData.descripcion?.trim() || null,
        },
      }

      if (imagenId) {
        updateData.data.imagen = imagenId
      }

      const response = await fetch(`/api/tienda/categorias/${catId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar la categoría')
      }

      setSuccess(true)
      // Recargar datos
      router.refresh()
    } catch (err: any) {
      console.error('[CategoriaDetails] Error:', err)
      setError(err.message || 'Error al actualizar la categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Información de la Categoría</h5>
            <div className="d-flex gap-2">
              <Badge bg={isPublished ? 'success' : 'secondary'}>
                {isPublished ? 'Publicado' : 'No Publicado'}
              </Badge>
              <Badge bg={
                estadoPublicacion === 'publicado' ? 'success' :
                estadoPublicacion === 'pendiente' ? 'warning' :
                'secondary'
              }>
                {estadoPublicacion === 'publicado' ? 'Publicado' :
                 estadoPublicacion === 'pendiente' ? 'Pendiente' :
                 'Borrador'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <p><strong>ID:</strong> {catId}</p>
              <p><strong>Productos:</strong> {productosCount}</p>
              <p><strong>Fecha de creación:</strong> {format(createdDate, 'dd/MM/yyyy HH:mm')}</p>
            </Col>
            <Col md={6}>
              {getImageUrl() && (
                <div>
                  <strong>Imagen:</strong>
                  <img src={getImageUrl() || ''} alt={formData.name} className="img-thumbnail mt-2" style={{ maxHeight: '200px' }} />
                </div>
              )}
            </Col>
          </Row>
        </CardBody>
      </Card>

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
              ¡Categoría actualizada exitosamente!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    Nombre de la Categoría <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    disabled={loading}
                  />
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={4}
                    value={formData.descripcion}
                    onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                    disabled={loading}
                  />
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Nueva Imagen (opcional)</FormLabel>
                  <FormControl
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    disabled={loading}
                  />
                  <small className="text-muted">Deja vacío para mantener la imagen actual</small>
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                variant="light"
                onClick={() => router.back()}
                disabled={loading}
              >
                <LuX className="me-1" /> Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <LuSave className="me-1" /> Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </>
  )
}

export default CategoriaDetails

