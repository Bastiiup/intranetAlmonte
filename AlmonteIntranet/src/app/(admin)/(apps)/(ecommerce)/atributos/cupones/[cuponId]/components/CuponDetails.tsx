'use client'

import { Badge, Col, Row, Alert, Card, CardHeader, CardBody, Form, Button, FormGroup, FormLabel, FormControl } from 'react-bootstrap'
import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'

interface CuponDetailsProps {
  cupon: any
  cuponId: string
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

const CuponDetails = ({ cupon: initialCupon, cuponId, error: initialError }: CuponDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [success, setSuccess] = useState(false)
  const [cupon, setCupon] = useState(initialCupon)
  
  if (!cupon && !initialError) {
    return (
      <Alert variant="warning">
        <strong>Cargando...</strong> Obteniendo información del cupón.
      </Alert>
    )
  }

  if (initialError && !cupon) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {initialError}
      </Alert>
    )
  }
  
  const attrs = cupon.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cupon as any)

  // Inicializar formData con los valores del cupón según schema real
  const [formData, setFormData] = useState({
    codigo: getField(data, 'codigo', 'CODIGO', 'CODE') || '',
    tipo_cupon: getField(data, 'tipo_cupon', 'tipoCupon', 'TIPO_CUPON') || 'fixed_cart',
    importe_cupon: getField(data, 'importe_cupon', 'importeCupon', 'IMPORTE_CUPON')?.toString() || '',
    descripcion: getField(data, 'descripcion', 'DESCRIPCION', 'DESCRIPTION') || '',
    producto_ids: (getField(data, 'producto_ids', 'productoIds', 'PRODUCTO_IDS') || []) as string[],
    uso_limite: getField(data, 'uso_limite', 'usoLimite', 'USO_LIMITE')?.toString() || '',
    fecha_caducidad: getField(data, 'fecha_caducidad', 'fechaCaducidad', 'FECHA_CADUCIDAD') || '',
    originPlatform: getField(data, 'originPlatform', 'origin_platform', 'ORIGIN_PLATFORM') || 'woo_moraleja',
  })

  // Actualizar formData cuando cambie el cupón
  useEffect(() => {
    if (cupon) {
      const attrs = cupon.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (cupon as any)
      
      setFormData({
        codigo: getField(data, 'codigo', 'CODIGO', 'CODE') || '',
        tipo_cupon: getField(data, 'tipo_cupon', 'tipoCupon', 'TIPO_CUPON') || 'fixed_cart',
        importe_cupon: getField(data, 'importe_cupon', 'importeCupon', 'IMPORTE_CUPON')?.toString() || '',
        descripcion: getField(data, 'descripcion', 'DESCRIPCION', 'DESCRIPTION') || '',
        producto_ids: (getField(data, 'producto_ids', 'productoIds', 'PRODUCTO_IDS') || []) as string[],
        uso_limite: getField(data, 'uso_limite', 'usoLimite', 'USO_LIMITE')?.toString() || '',
        fecha_caducidad: getField(data, 'fecha_caducidad', 'fechaCaducidad', 'FECHA_CADUCIDAD') || '',
        originPlatform: getField(data, 'originPlatform', 'origin_platform', 'ORIGIN_PLATFORM') || 'woo_moraleja',
      })
    }
  }, [cupon])

  // Obtener el ID correcto
  const cId = cupon.id?.toString() || cupon.documentId || cuponId
  
  const isPublished = !!(attrs.publishedAt || cupon.publishedAt)
  const createdAt = attrs.createdAt || cupon.createdAt || new Date().toISOString()
  const createdDate = new Date(createdAt)
  const updatedAt = attrs.updatedAt || cupon.updatedAt || new Date().toISOString()
  const updatedDate = new Date(updatedAt)
  
  // Determinar estado
  let status: 'active' | 'expired' | 'inactive' = 'active'
  if (formData.fecha_caducidad) {
    const expiryDate = new Date(formData.fecha_caducidad)
    const now = new Date()
    if (expiryDate < now) {
      status = 'expired'
    }
  }
  if (!isPublished) {
    status = 'inactive'
  }

  // Validar que cupon existe
  if (!cupon) {
    return (
      <Alert variant="warning">
        <strong>Error:</strong> No se pudo cargar la información del cupón.
      </Alert>
    )
  }

  // Validar que tenemos un ID válido
  if (!cId || cId === 'unknown') {
    console.error('[CuponDetails] No se pudo obtener un ID válido del cupón:', {
      id: cupon.id,
      documentId: cupon.documentId,
      cupon: cupon,
    })
    return (
      <Alert variant="danger">
        <strong>Error:</strong> No se pudo obtener el ID del cupón.
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const url = `/api/tienda/cupones/${cId}`
      const body = JSON.stringify({
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

      setSuccess(true)
      
      // Actualizar el estado local con los datos actualizados de la respuesta
      if (result.data) {
        setCupon(result.data.strapi || result.data)
      }
      
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error('[CuponDetails] Error al actualizar cupón:', err)
      setError(err.message || 'Error al guardar cambios')
    } finally {
      setLoading(false)
    }
  }

  // Obtener información adicional de WooCommerce
  const wooId = getField(data, 'wooId', 'woo_id', 'WOO_ID')
  const rawWooData = getField(data, 'rawWooData', 'raw_woo_data', 'RAW_WOO_DATA')
  const usageCount = rawWooData?.usage_count || 0
  const usageLimit = rawWooData?.usage_limit || formData.uso_limite || 'Ilimitado'

  // Formatear fecha de caducidad para datetime-local
  const formatDateTimeLocal = (dateString: string | null): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }

  const platformVariant = formData.originPlatform === 'woo_moraleja' ? 'info' : formData.originPlatform === 'woo_escolar' ? 'primary' : 'secondary'
  const platformDisplay = formData.originPlatform.replace('woo_', 'WooCommerce ').replace('_', ' ').toUpperCase()

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Detalles del Cupón</h5>
                <p className="text-muted mb-0 mt-2 small">
                  Información y configuración del cupón
                </p>
              </div>
              <div className="d-flex gap-2">
                <Badge bg={status === 'active' ? 'success' : status === 'expired' ? 'danger' : 'secondary'}>
                  {status === 'active' ? 'Activo' : status === 'expired' ? 'Expirado' : 'Inactivo'}
                </Badge>
                {wooId && (
                  <Badge bg="info">WooCommerce ID: {wooId}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                ¡Cupón actualizado exitosamente!
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
                      placeholder="Ej: DESCUENTO10"
                      value={formData.codigo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, codigo: e.target.value.toUpperCase() }))
                      }
                      required
                    />
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
                        ? 'Porcentaje de descuento'
                        : 'Monto fijo en pesos'}
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
                      displayField="nombre_libro"
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
                      Número máximo de veces que se puede usar el cupón (opcional).
                    </small>
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Fecha de Caducidad</FormLabel>
                    <FormControl
                      type="datetime-local"
                      value={formatDateTimeLocal(formData.fecha_caducidad)}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fecha_caducidad: e.target.value }))
                      }
                    />
                    <small className="text-muted">
                      Fecha y hora de caducidad del cupón (opcional).
                    </small>
                  </FormGroup>
                </Col>

                {/* Información adicional */}
                <Col md={12}>
                  <hr />
                  <h6 className="mb-3">Información Adicional</h6>
                </Col>

                <Col md={6}>
                  <div>
                    <label className="form-label text-muted">Estado</label>
                    <div>
                      <Badge bg={status === 'active' ? 'success' : status === 'expired' ? 'danger' : 'secondary'} className="fs-base">
                        {status === 'active' ? 'Activo' : status === 'expired' ? 'Expirado' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div>
                    <label className="form-label text-muted">Plataforma</label>
                    <div>
                      <Badge bg={platformVariant} className="fs-base">
                        {platformDisplay}
                      </Badge>
                    </div>
                  </div>
                </Col>

                {wooId && (
                  <Col md={6}>
                    <div>
                      <label className="form-label text-muted">WooCommerce ID</label>
                      <div>
                        <span className="fw-semibold">{wooId}</span>
                      </div>
                    </div>
                  </Col>
                )}

                <Col md={6}>
                  <div>
                    <label className="form-label text-muted">Usos</label>
                    <div>
                      <span className="fw-semibold">{usageCount} / {usageLimit}</span>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div>
                    <label className="form-label text-muted">Fecha de Creación</label>
                    <div>
                      <span className="text-muted">{format(createdDate, 'dd MMM, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div>
                    <label className="form-label text-muted">Última Actualización</label>
                    <div>
                      <span className="text-muted">{format(updatedDate, 'dd MMM, yyyy h:mm a')}</span>
                    </div>
                  </div>
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
      </Col>
    </Row>
  )
}

export default CuponDetails
