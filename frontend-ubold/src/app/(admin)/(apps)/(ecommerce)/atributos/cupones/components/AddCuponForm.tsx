'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

const AddCuponForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    codigo: '',
    tipo_cupon: 'fixed_cart',
    importe_cupon: '',
    descripcion: '',
    producto_ids: [] as string[],
    uso_limite: '',
    fecha_caducidad: '',
    originPlatform: 'woo_moraleja',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.codigo.trim()) {
        throw new Error('El código del cupón es obligatorio')
      }

      // Preparar datos para Strapi según schema real
      const cuponData: any = {
        data: {
          codigo: formData.codigo.trim(),
          tipo_cupon: formData.tipo_cupon || null,
          importe_cupon: formData.importe_cupon ? parseFloat(formData.importe_cupon) : null,
          descripcion: formData.descripcion.trim() || null,
          producto_ids: formData.producto_ids.length > 0 ? formData.producto_ids : null,
          uso_limite: formData.uso_limite ? parseInt(formData.uso_limite) : null,
          fecha_caducidad: formData.fecha_caducidad || null,
          originPlatform: formData.originPlatform,
        },
      }

      console.log('[AddCuponForm] Enviando datos:', cuponData)

      // Crear el cupón
      const response = await fetch('/api/tienda/cupones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cuponData),
      })

      const result = await response.json()

      console.log('[AddCuponForm] Respuesta:', { response: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el cupón')
      }

      if (!result.success) {
        throw new Error(result.error || 'Error al crear el cupón')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/cupones')
      }, 1500)
    } catch (err: any) {
      console.error('[AddCuponForm] Error al crear cupón:', err)
      setError(err.message || 'Error al crear el cupón')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nuevo Cupón</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear un nuevo cupón en el sistema.
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
            ¡Cupón creado exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Código del Cupón <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: DESCUENTO10, VERANO2024"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                  }
                  required
                />
                <small className="text-muted">
                  Código único del cupón (requerido).
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Tipo de Cupón <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.tipo_cupon}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tipo_cupon: e.target.value }))
                  }
                  required
                >
                  <option value="fixed_cart">Fijo Carrito</option>
                  <option value="fixed_product">Fijo Producto</option>
                  <option value="percent">Porcentaje</option>
                  <option value="percent_product">Porcentaje Producto</option>
                </FormControl>
                <small className="text-muted">
                  Tipo de descuento que aplicará el cupón.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Importe del Cupón <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 1000 o 10"
                  value={formData.importe_cupon}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, importe_cupon: e.target.value }))
                  }
                  required
                />
                <small className="text-muted">
                  {formData.tipo_cupon === 'percent' || formData.tipo_cupon === 'percent_product'
                    ? 'Porcentaje de descuento (ej: 10 para 10%)'
                    : 'Monto fijo en pesos (ej: 1000)'}
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Plataforma de Origen <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.originPlatform}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, originPlatform: e.target.value }))
                  }
                  required
                >
                  <option value="woo_moraleja">WooCommerce Moraleja</option>
                  <option value="woo_escolar">WooCommerce Escolar</option>
                  <option value="otros">Otros</option>
                </FormControl>
                <small className="text-muted">
                  Selecciona la plataforma donde se creará el cupón.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Descripción</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Descripción del cupón..."
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Descripción opcional del cupón.
                </small>
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Productos Aplicables</FormLabel>
                <RelationSelector
                  label="Productos"
                  value={formData.producto_ids}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, producto_ids: Array.isArray(value) ? value : [value] }))
                  }
                  endpoint="/api/tienda/productos"
                  multiple={true}
                  displayField="titulo"
                />
                <small className="text-muted">
                  Selecciona los productos a los que aplica este cupón (opcional). Si no se selecciona, aplica a todos.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Límite de Uso</FormLabel>
                <FormControl
                  type="number"
                  min="1"
                  placeholder="Ej: 100"
                  value={formData.uso_limite}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, uso_limite: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Número máximo de veces que se puede usar el cupón (opcional, dejar vacío para ilimitado).
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Fecha de Caducidad</FormLabel>
                <FormControl
                  type="datetime-local"
                  value={formData.fecha_caducidad}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fecha_caducidad: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Fecha y hora de caducidad del cupón (opcional).
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
              {loading ? 'Guardando...' : 'Guardar Cupón'}
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

export default AddCuponForm
