'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, CardBody, CardHeader, Col, Form, Row, Badge } from 'react-bootstrap'
import toast from 'react-hot-toast'
import SearchableSelect, { SearchableOption } from '@/components/form/SearchableSelect'

const DEPENDENCIAS = [
  'Corporación de Administración Delegada',
  'Municipal',
  'Particular Subvencionado',
  'Particular Pagado',
  'Servicio Local de Educación',
] as const

const RURALIDAD = ['Urbano', 'Rural'] as const

const ESTADOS_NOMBRE = ['Por Verificar', 'Verificado', 'Aprobado', 'Rechazado'] as const
const ESTADOS = ['Por Verificar', 'Verificado', 'Aprobado'] as const
const ESTADOS_ESTAB = ['Funcionando', 'En receso', 'Cerrado', 'Autorizado sin matrícula'] as const

const REGIONES_DE_CHILE = (
  'Arica y Parinacota|Tarapacá|Antofagasta|Atacama|Coquimbo|Valparaíso|' +
  'Metropolitana de Santiago|O’Higgins|Maule|Ñuble|Biobío|La Araucanía|' +
  'Los Ríos|Los Lagos|Aysén|Magallanes y de la Antártica Chilena'
).split('|')

const PROVINCIAS_DE_CHILE = (
  'Arica|Parinacota|Iquique|Tamarugal|Antofagasta|El Loa|Tocopilla|' +
  'Copiapó|Chañaral|Huasco|Elqui|Choapa|Limarí|' +
  'Valparaíso|Isla de Pascua|Los Andes|Petorca|Quillota|San Antonio|' +
  'San Felipe de Aconcagua|Marga Marga|' +
  'Santiago|Cordillera|Chacabuco|Maipo|Melipilla|Talagante|' +
  'Cachapoal|Colchagua|Cardenal Caro|' +
  'Talca|Cauquenes|Curicó|Linares|' +
  'Diguillín|Itata|Punilla|' +
  'Concepción|Arauco|Biobío|' +
  'Cautín|Malleco|' +
  'Valdivia|Ranco|' +
  'Llanquihue|Chiloé|Osorno|Palena|' +
  'Coihaique|Aisén|Capitán Prat|General Carrera|' +
  'Magallanes|Antártica Chilena|Tierra del Fuego|Última Esperanza'
).split('|')

const ZONAS_DE_CHILE = [
  'Norte Grande',
  'Norte Chico',
  'Centro',
  'Centro-Sur',
  'Sur',
  'Austral',
  'Insular',
] as const

interface ColegioDetailsProps {
  colegio: any
  colegioId: string
}

const ColegioDetails = ({ colegio, colegioId }: ColegioDetailsProps) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialRbd = colegio.rbd ?? ''
  const initialDv = colegio.rbd_digito_verificador ?? ''

  const [formData, setFormData] = useState({
    rbd: initialRbd ? String(initialRbd) : '',
    rbd_digito_verificador: initialDv ? String(initialDv) : '',
    colegio_nombre: colegio.colegio_nombre ?? '',
    dependencia: colegio.dependencia ?? '',
    ruralidad: colegio.ruralidad ?? '',
    estado_nombre: colegio.estado_nombre ?? '',
    estado: colegio.estado ?? '',
    estado_estab: colegio.estado_estab ?? '',
    region: colegio.region ?? '',
    provincia: colegio.provincia ?? '',
    zona: colegio.zona ?? '',
    telefono_principal: colegio.telefono_principal ?? '',
    email_principal: colegio.email_principal ?? '',
    direccion_principal: colegio.direccion_principal ?? '',
    website_principal: colegio.website_principal ?? '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'rbd_digito_verificador' && value.length > 1) return
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const dependenciaOptions: SearchableOption[] = DEPENDENCIAS.map((d) => ({
    value: d,
    label: d,
  }))

  const ruralidadOptions: SearchableOption[] = RURALIDAD.map((r) => ({
    value: r,
    label: r,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.rbd?.trim() || !formData.colegio_nombre?.trim()) {
      toast.error('RBD y Nombre del Colegio son obligatorios')
      return
    }

    const rbdNum = parseInt(formData.rbd, 10)
    if (isNaN(rbdNum) || rbdNum < 0) {
      toast.error('RBD debe ser un número válido')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/mira/colegios/${encodeURIComponent(colegio.id ?? colegioId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rbd: rbdNum,
          rbd_digito_verificador: formData.rbd_digito_verificador || undefined,
          colegio_nombre: formData.colegio_nombre.trim(),
          dependencia: formData.dependencia || undefined,
          ruralidad: formData.ruralidad || undefined,
          estado_nombre: formData.estado_nombre || undefined,
          estado: formData.estado || undefined,
          estado_estab: formData.estado_estab || undefined,
          region: formData.region || undefined,
          provincia: formData.provincia || undefined,
          zona: formData.zona || undefined,
          telefono_principal: formData.telefono_principal || undefined,
          email_principal: formData.email_principal || undefined,
          direccion_principal: formData.direccion_principal || undefined,
          website_principal: formData.website_principal || undefined,
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (!res.ok || !result.success) {
        const message =
          result?.error ||
          `Error al actualizar establecimiento (${res.status} ${res.statusText})`
        throw new Error(message)
      }

      toast.success('Establecimiento actualizado correctamente')
      // Evitamos volver a llamar al GET del detalle (que en algunos entornos
      // puede fallar por problemas de /api/colegios/:id en Strapi) y
      // redirigimos directamente al listado, donde los cambios ya se reflejan.
      router.push('/mira/colegios')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cambios'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const estado = colegio.estado ?? colegio.estado_nombre ?? null

  return (
    <Card>
      <CardHeader>
        <h5 className="card-title mb-0">Editar Establecimiento</h5>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  RBD <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="rbd"
                  value={formData.rbd}
                  required
                  min={0}
                  disabled
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Dígito verificador</Form.Label>
                <Form.Control
                  type="text"
                  name="rbd_digito_verificador"
                  value={formData.rbd_digito_verificador}
                  onChange={handleChange}
                  maxLength={1}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado actual</Form.Label>
                <div>
                  {estado ? (
                    <Badge bg="info">{estado}</Badge>
                  ) : (
                    <span className="text-muted">Sin estado</span>
                  )}
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado (interno)</Form.Label>
                <Form.Select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado nombre</Form.Label>
                <Form.Select
                  name="estado_nombre"
                  value={formData.estado_nombre}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {ESTADOS_NOMBRE.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado establecimiento</Form.Label>
                <Form.Select
                  name="estado_estab"
                  value={formData.estado_estab}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {ESTADOS_ESTAB.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Nombre del Colegio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="colegio_nombre"
                  value={formData.colegio_nombre}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Dependencia</Form.Label>
                <SearchableSelect
                  options={dependenciaOptions}
                  value={formData.dependencia}
                  onChange={(val) => setFormData((prev) => ({ ...prev, dependencia: val }))}
                  placeholder="Seleccionar dependencia..."
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Ruralidad</Form.Label>
                <SearchableSelect
                  options={ruralidadOptions}
                  value={formData.ruralidad}
                  onChange={(val) => setFormData((prev) => ({ ...prev, ruralidad: val }))}
                  placeholder="Seleccionar ruralidad..."
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Región</Form.Label>
                <Form.Select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar región...</option>
                  {REGIONES_DE_CHILE.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Provincia</Form.Label>
                <Form.Select
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar provincia...</option>
                  {PROVINCIAS_DE_CHILE.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Zona</Form.Label>
                <Form.Select
                  name="zona"
                  value={formData.zona}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar zona...</option>
                  {ZONAS_DE_CHILE.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Teléfono principal</Form.Label>
                <Form.Control
                  type="text"
                  name="telefono_principal"
                  value={formData.telefono_principal}
                  onChange={handleChange}
                  placeholder="Ej: +56 9 1234 5678"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email principal</Form.Label>
                <Form.Control
                  type="email"
                  name="email_principal"
                  value={formData.email_principal}
                  onChange={handleChange}
                  placeholder="Ej: contacto@colegio.cl"
                />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Form.Group>
                <Form.Label>Dirección principal</Form.Label>
                <Form.Control
                  type="text"
                  name="direccion_principal"
                  value={formData.direccion_principal}
                  onChange={handleChange}
                  placeholder="Calle, número, comuna"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Website</Form.Label>
                <Form.Control
                  type="text"
                  name="website_principal"
                  value={formData.website_principal}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline-secondary"
              disabled={loading}
              onClick={() => router.push('/mira/colegios')}
            >
              Volver al listado
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default ColegioDetails

