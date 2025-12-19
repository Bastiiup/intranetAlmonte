'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, FormCheck } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'

const AddObraForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    activarArchivo: false,
    tipo: 'select', // 'select' es el tipo por defecto según WooCommerce
    ordenPredeterminado: 'menu_order', // 'menu_order' es orden personalizado
  })

  // Generar slug automáticamente desde el nombre
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales con guiones
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
      .substring(0, 27) // Máximo 28 caracteres (menos de 28)
  }

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = e.target.value
    setFormData((prev) => ({
      ...prev,
      nombre,
      // Generar slug automáticamente si está vacío o si el usuario no lo ha modificado manualmente
      slug: prev.slug === '' || prev.slug === generateSlug(prev.nombre) ? generateSlug(nombre) : prev.slug,
    }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Solo permitir letras, números y guiones
      .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    
    // Limitar a 27 caracteres (menos de 28)
    if (slug.length > 27) {
      slug = slug.substring(0, 27)
    }
    
    setFormData((prev) => ({
      ...prev,
      slug,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar que el slug tenga menos de 28 caracteres
      if (formData.slug.length >= 28) {
        throw new Error('El slug debe tener menos de 28 caracteres')
      }

      // Preparar datos para Strapi (el schema usa 'nombre', no 'name')
      const obraData: any = {
        data: {
          nombre: formData.nombre.trim(), // El schema de Strapi usa 'nombre'
          descripcion: null, // No hay campo de descripción en el formulario de atributo
          // Los campos tipo, ordenPredeterminado y activarArchivo son solo para WooCommerce,
          // no se guardan en Strapi
        },
      }

      console.log('[AddObraForm] Enviando datos:', obraData)

      // Crear la obra (término del atributo)
      const response = await fetch('/api/tienda/obras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(obraData),
      })

      const result = await response.json()

      console.log('[AddObraForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la obra')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la obra')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/obras')
      }, 1500)
    } catch (err: any) {
      console.error('[AddObraForm] Error al crear obra:', err)
      setError(err.message || 'Error al crear la obra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar nuevo atributo</h5>
        <p className="text-muted mb-0 mt-2 small">
          Los atributos te permiten definir datos adicionales del producto, como talla o color. 
          Puedes usar atributos en la barra lateral usando los widgets de "navegación por capas".
        </p>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Obra creada exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: Obra, Edición"
                  value={formData.nombre}
                  onChange={handleNombreChange}
                  required
                />
                <small className="text-muted">
                  Nombre para el atributo (mostrado en la tienda).
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Slug <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: pa_obra"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  required
                  maxLength={27}
                />
                <small className="text-muted">
                  Slug/referencia única para el atributo; debe tener menos de 28 caracteres.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormCheck
                  type="checkbox"
                  id="activarArchivo"
                  checked={formData.activarArchivo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, activarArchivo: e.target.checked }))
                  }
                  label="¿Activamos el archivo?"
                />
                <small className="text-muted d-block mt-1">
                  Habilita esto si quieres que este atributo tenga páginas de archivo de producto en tu tienda.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Tipo <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tipo: e.target.value }))
                  }
                  required
                >
                  <option value="select">Selección</option>
                </FormControl>
                <small className="text-muted">
                  Determina cómo se muestran los valores de este atributo.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>
                  Orden predeterminado <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.ordenPredeterminado}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ordenPredeterminado: e.target.value }))
                  }
                  required
                >
                  <option value="menu_order">Orden personalizado</option>
                  <option value="name">Nombre</option>
                  <option value="name_num">Nombre (numérico)</option>
                  <option value="id">ID</option>
                </FormControl>
                <small className="text-muted">
                  Determina el orden de los términos en las páginas de productos de la tienda. 
                  Si usas un orden personalizado puedes arrastrar y soltar los términos en este atributo.
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
              {loading ? 'Guardando...' : 'Agregar atributo'}
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
  )
}

export default AddObraForm

