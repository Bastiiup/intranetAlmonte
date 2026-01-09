'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddAutorForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre_completo_autor: '',
    nombres: '',
    primer_apellido: '',
    segundo_apellido: '',
    tipo_autor: 'Persona',
    foto: null as File | null,
    website: '',
    pais: '',
    // NOTA: estado_publicacion no se permite cambiar aquí, siempre será "pendiente" al crear
    // Solo se puede cambiar desde la página de Solicitudes
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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
      // Validar nombre completo obligatorio
      if (!formData.nombre_completo_autor.trim()) {
        throw new Error('El nombre completo del autor es obligatorio')
      }

      // Primero subir la foto si existe
      let fotoId = null
      if (formData.foto) {
        console.log('[AddAutor] Subiendo foto...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.foto)

        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (uploadResult.success && uploadResult.id) {
          fotoId = uploadResult.id
          console.log('[AddAutor] Foto subida con ID:', fotoId)
        } else {
          console.warn('[AddAutor] No se pudo subir la foto:', uploadResult.error)
          throw new Error(uploadResult.error || 'Error al subir la foto')
        }
      }

      // Preparar datos para Strapi (usar nombres del schema real)
      const autorData: any = {
        data: {
          nombre_completo_autor: formData.nombre_completo_autor.trim(),
          nombres: formData.nombres.trim() || null,
          primer_apellido: formData.primer_apellido.trim() || null,
          segundo_apellido: formData.segundo_apellido.trim() || null,
          tipo_autor: formData.tipo_autor,
          website: formData.website.trim() || null,
          pais: formData.pais || null,
          // estado_publicacion siempre será "pendiente" al crear (se envía en el backend)
          // Solo se puede cambiar desde la página de Solicitudes
        },
      }

      // Agregar foto si existe
      if (fotoId) {
        autorData.data.foto = fotoId
      }

      // Crear el autor
      const response = await fetch('/api/tienda/autores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(autorData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el autor')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/products/atributos/autores')
      }, 1500)
    } catch (err: any) {
      console.error('Error al crear autor:', err)
      setError(err.message || 'Error al crear el autor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Autor</h4>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Autor creado exitosamente. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre Completo <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Gabriel García Márquez"
                      value={formData.nombre_completo_autor}
                      onChange={(e) => handleFieldChange('nombre_completo_autor', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Tipo de Autor</FormLabel>
                    <FormControl
                      as="select"
                      value={formData.tipo_autor}
                      onChange={(e) => handleFieldChange('tipo_autor', e.target.value)}
                    >
                      <option value="Persona">Persona</option>
                      <option value="Empresa">Empresa</option>
                    </FormControl>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Nombres</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Gabriel"
                      value={formData.nombres}
                      onChange={(e) => handleFieldChange('nombres', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Primer Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: García"
                      value={formData.primer_apellido}
                      onChange={(e) => handleFieldChange('primer_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup className="mb-3">
                    <FormLabel>Segundo Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Márquez"
                      value={formData.segundo_apellido}
                      onChange={(e) => handleFieldChange('segundo_apellido', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>País</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Colombia"
                      value={formData.pais}
                      onChange={(e) => handleFieldChange('pais', e.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Website</FormLabel>
                    <FormControl
                      type="url"
                      placeholder="https://ejemplo.com"
                      value={formData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>


              <Row>
                <Col md={12}>
                  <FormGroup className="mb-3">
                    <FormLabel>Foto</FormLabel>
                    <FormControl
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                    />
                    <small className="text-muted">Formatos permitidos: JPG, PNG, GIF</small>
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
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <LuSave className="me-1" /> Guardar Autor
                    </>
                  )}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddAutorForm

