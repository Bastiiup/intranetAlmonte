'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'
import Image from 'next/image'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface AutorDetailsProps {
  autor: any
  autorId: string
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

const AutorDetails = ({ autor: initialAutor, autorId }: AutorDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autor, setAutor] = useState(initialAutor)
  
  const attrs = autor.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (autor as any)

  // Obtener foto actual
  const fotoActual = data.foto?.data || data.foto
  const getFotoUrl = (): string | null => {
    if (!fotoActual) return null
    
    const url = fotoActual.attributes?.url || fotoActual.url
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
  const fotoUrl = getFotoUrl()

  // Inicializar formData con los valores del autor
  const [formData, setFormData] = useState({
    nombre_completo_autor: getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR') || '',
    nombres: getField(data, 'nombres', 'NOMBRES') || '',
    primer_apellido: getField(data, 'primer_apellido', 'primerApellido', 'PRIMER_APELLIDO') || '',
    segundo_apellido: getField(data, 'segundo_apellido', 'segundoApellido', 'SEGUNDO_APELLIDO') || '',
    tipo_autor: getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona',
    website: getField(data, 'website', 'WEBSITE') || '',
    pais: getField(data, 'pais', 'PAIS') || '',
    foto: null as File | null,
    fotoActualId: fotoActual?.id || null,
  })

  // Actualizar formData cuando cambie el autor
  useEffect(() => {
    const attrs = autor.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (autor as any)
    const fotoActual = data.foto?.data || data.foto
    
    setFormData({
      nombre_completo_autor: getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR') || '',
      nombres: getField(data, 'nombres', 'NOMBRES') || '',
      primer_apellido: getField(data, 'primer_apellido', 'primerApellido', 'PRIMER_APELLIDO') || '',
      segundo_apellido: getField(data, 'segundo_apellido', 'segundoApellido', 'SEGUNDO_APELLIDO') || '',
      tipo_autor: getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona',
      website: getField(data, 'website', 'WEBSITE') || '',
      pais: getField(data, 'pais', 'PAIS') || '',
      foto: null,
      fotoActualId: fotoActual?.id || null,
    })
  }, [autor])

  // Obtener el ID correcto
  const autId = autor.id?.toString() || autor.documentId || autorId
  
  // Contar libros (si hay relación)
  const libros = data.libros?.data || data.books || []
  const librosCount = Array.isArray(libros) ? libros.length : 0

  const isPublished = !!(attrs.publishedAt || autor.publishedAt)
  const createdAt = attrs.createdAt || autor.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || autor.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Validar que autor existe
  if (!autor) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información del autor.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!autId || autId === 'unknown') {
    console.error('[AutorDetails] No se pudo obtener un ID válido del autor:', {
      id: autor.id,
      documentId: autor.documentId,
      autor: autor,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID del autor.
      </Alert>
    )
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        foto: e.target.files![0],
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('[AutorDetails] ===== INICIANDO GUARDADO =====')
      console.log('[AutorDetails] Datos del autor:', {
        id: autor.id,
        documentId: autor.documentId,
        autId,
        formData,
      })

      // Primero subir la foto si existe una nueva
      let fotoId = formData.fotoActualId
      if (formData.foto) {
        console.log('[AutorDetails] Subiendo nueva foto...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.foto)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          fotoId = uploadResult.id
          console.log('[AutorDetails] Nueva foto subida con ID:', fotoId)
        } else {
          console.warn('[AutorDetails] No se pudo subir la foto:', uploadResult.error)
          throw new Error(uploadResult.error || 'Error al subir la foto')
        }
      }

      const url = `/api/tienda/autores/${autId}`
      const body = JSON.stringify({
        data: {
          nombre_completo_autor: formData.nombre_completo_autor,
          nombres: formData.nombres || null,
          primer_apellido: formData.primer_apellido || null,
          segundo_apellido: formData.segundo_apellido || null,
          tipo_autor: formData.tipo_autor,
          website: formData.website || null,
          pais: formData.pais || null,
          foto: fotoId,
        },
      })
      
      console.log('[AutorDetails] Enviando petición PUT:', {
        url,
        autId,
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

      console.log('[AutorDetails] ✅ Cambios guardados exitosamente:', result)
      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setAutor(result.data)
        const updatedData = result.data.attributes || result.data
        const fotoActual = updatedData.foto?.data || updatedData.foto
        
        setFormData({
          nombre_completo_autor: getField(updatedData, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR') || formData.nombre_completo_autor,
          nombres: getField(updatedData, 'nombres', 'NOMBRES') || formData.nombres,
          primer_apellido: getField(updatedData, 'primer_apellido', 'primerApellido', 'PRIMER_APELLIDO') || formData.primer_apellido,
          segundo_apellido: getField(updatedData, 'segundo_apellido', 'segundoApellido', 'SEGUNDO_APELLIDO') || formData.segundo_apellido,
          tipo_autor: getField(updatedData, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || formData.tipo_autor,
          website: getField(updatedData, 'website', 'WEBSITE') || formData.website,
          pais: getField(updatedData, 'pais', 'PAIS') || formData.pais,
          foto: null,
          fotoActualId: fotoActual?.id || null,
        })
      }
      
      // Ocultar el mensaje de éxito después de 2 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar cambios'
      setError(errorMessage)
      console.error('[AutorDetails] Error al guardar:', {
        autId,
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
          <h5 className="mb-0">Editar Autor</h5>
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
              <Col md={6}>
                <FormGroup>
                  <FormLabel>
                    Nombre Completo <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Gabriel García Márquez"
                    value={formData.nombre_completo_autor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre_completo_autor: e.target.value }))
                    }
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>Tipo de Autor</FormLabel>
                  <FormControl
                    as="select"
                    value={formData.tipo_autor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tipo_autor: e.target.value }))
                    }
                  >
                    <option value="Persona">Persona</option>
                    <option value="Empresa">Empresa</option>
                  </FormControl>
                </FormGroup>
              </Col>

              <Col md={4}>
                <FormGroup>
                  <FormLabel>Nombres</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Gabriel"
                    value={formData.nombres}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombres: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <FormLabel>Primer Apellido</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: García"
                    value={formData.primer_apellido}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, primer_apellido: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <FormLabel>Segundo Apellido</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Márquez"
                    value={formData.segundo_apellido}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, segundo_apellido: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>País</FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ej: Colombia"
                    value={formData.pais}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pais: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <FormLabel>Sitio Web</FormLabel>
                  <FormControl
                    type="url"
                    placeholder="https://ejemplo.com"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website: e.target.value }))
                    }
                  />
                </FormGroup>
              </Col>

              <Col md={12}>
                <FormGroup>
                  <FormLabel>Foto</FormLabel>
                  {fotoUrl && !formData.foto && (
                    <div className="mb-2">
                      <Image
                        src={fotoUrl}
                        alt={formData.nombre_completo_autor || 'Autor'}
                        width={150}
                        height={150}
                        className="img-fluid rounded"
                        style={{ objectFit: 'cover' }}
                        unoptimized={fotoUrl.startsWith('http')}
                      />
                      <small className="text-muted d-block mt-1">
                        Foto actual
                      </small>
                    </div>
                  )}
                  {formData.foto && (
                    <div className="mb-2">
                      <small className="text-muted d-block">
                        Nueva foto seleccionada: {formData.foto.name}
                      </small>
                    </div>
                  )}
                  <FormControl
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                  />
                  <small className="text-muted">
                    Opcional. Selecciona una nueva foto para reemplazar la actual
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
                <label className="form-label text-muted">ID Autor</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {getField(data, 'id_autor', 'idAutor', 'ID_AUTOR') || 'N/A'}
                  </Badge>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div>
                <label className="form-label text-muted">Libros asociados</label>
                <div>
                  <Badge bg="info" className="fs-base">
                    {librosCount} libro{librosCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div>
                <label className="form-label text-muted">Estado</label>
                <div>
                  <Badge bg={isPublished ? 'success' : 'secondary'} className="fs-base">
                    {isPublished ? 'Publicado' : 'Borrador'}
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

export default AutorDetails