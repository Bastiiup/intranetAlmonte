'use client'

import { useEffect, useMemo, useState } from 'react'
import { Row, Col, Card, ProgressBar, Spinner, Alert, Table } from 'react-bootstrap'
import { TbCheck, TbClockHour4, TbKey, TbUserCheck } from 'react-icons/tb'

type LicenciaResumen = {
  total: number
  activas: number
  vencidas: number
  sinUsar: number
}

type UsoPorLibro = {
  nombre_libro: string
  isbn_libro: string
  total: number
  usadas: number
}

type LicenciaApi = {
  codigo_activacion?: string
  activa: boolean
  fecha_activacion: string | null
  fecha_vencimiento: string | null
  libro_mira?: {
    libro?: {
      nombre_libro?: string
      isbn_libro?: string
    } | null
  } | null
  estudiante?: {
    email?: string
    persona?: {
      nombres?: string
      primer_apellido?: string
      segundo_apellido?: string
    } | null
    colegio?: {
      nombre?: string
    } | null
    nivel?: string
    curso?: string
  } | null
}

type ActivacionItem = {
  codigo: string
  fecha_activacion: string
  libro: string
  isbn: string
  estudiante: string
  email: string
  colegio: string
  curso: string
}

const AnaliticasMiraClient = () => {
  const [resumen, setResumen] = useState<LicenciaResumen>({
    total: 0,
    activas: 0,
    vencidas: 0,
    sinUsar: 0,
  })
  const [usoPorLibro, setUsoPorLibro] = useState<UsoPorLibro[]>([])
  const [activacionesRecientes, setActivacionesRecientes] = useState<ActivacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/mira/licencias?pageSize=500', {
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error(`Error HTTP ${res.status}`)
        }

        const json = await res.json()
        const data: LicenciaApi[] = Array.isArray(json.data) ? json.data : []

        if (cancelado) return

        const hoy = new Date()
        const resumenTmp: LicenciaResumen = {
          total: data.length,
          activas: 0,
          vencidas: 0,
          sinUsar: 0,
        }

        const mapa = new Map<string, UsoPorLibro>()
        const activaciones: ActivacionItem[] = []

        for (const lic of data) {
          const activa = lic.activa !== false
          const fechaVenc = lic.fecha_vencimiento ? new Date(lic.fecha_vencimiento) : null
          const usada = Boolean(lic.fecha_activacion)

          if (activa) resumenTmp.activas++
          if (fechaVenc && fechaVenc < hoy) resumenTmp.vencidas++
          if (!usada) resumenTmp.sinUsar++

          const libro = lic.libro_mira?.libro
          if (libro) {
            const key = libro.isbn_libro || libro.nombre_libro || 'desconocido'
            const existente = mapa.get(key)
            if (!existente) {
              mapa.set(key, {
                nombre_libro: libro.nombre_libro || 'Sin nombre',
                isbn_libro: libro.isbn_libro || '',
                total: 1,
                usadas: usada ? 1 : 0,
              })
            } else {
              existente.total += 1
              if (usada) existente.usadas += 1
            }
          }

          // Historial de activaciones (solo licencias con fecha_activacion)
          if (usada && lic.fecha_activacion) {
            const fecha = lic.fecha_activacion
            const persona = lic.estudiante?.persona
            const colegio = lic.estudiante?.colegio
            const nombreEstudiante = persona
              ? `${persona.nombres || ''} ${persona.primer_apellido || ''} ${
                  persona.segundo_apellido || ''
                }`.trim()
              : 'Sin asignar'

            activaciones.push({
              codigo: lic.codigo_activacion || '',
              fecha_activacion: fecha,
              libro: libro?.nombre_libro || 'Sin nombre',
              isbn: libro?.isbn_libro || '',
              estudiante: nombreEstudiante,
              email: lic.estudiante?.email || '',
              colegio: colegio?.nombre || '',
              curso: [lic.estudiante?.nivel, lic.estudiante?.curso].filter(Boolean).join(' '),
            })
          }
        }

        setResumen(resumenTmp)
        setUsoPorLibro(
          Array.from(mapa.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
        )
        setActivacionesRecientes(
          activaciones
            .sort(
              (a, b) =>
                new Date(b.fecha_activacion).getTime() - new Date(a.fecha_activacion).getTime()
            )
            .slice(0, 15)
        )
      } catch (e: any) {
        console.error('[MIRA Analiticas] Error en cliente:', e)
        if (!cancelado) setError(e?.message || 'Error al cargar analíticas')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    void cargar()

    return () => {
      cancelado = true
    }
  }, [])

  const { porcentajeUsadas, porcentajeSinUsar, porcentajeActivas } = useMemo(() => {
    if (resumen.total === 0) {
      return { porcentajeUsadas: 0, porcentajeSinUsar: 0, porcentajeActivas: 0 }
    }
    const usadas = resumen.total - resumen.sinUsar
    const pUsadas = Math.round((usadas / resumen.total) * 100)
    const pSinUsar = Math.round((resumen.sinUsar / resumen.total) * 100)
    const pActivas = Math.round((resumen.activas / resumen.total) * 100)
    return { porcentajeUsadas: pUsadas, porcentajeSinUsar: pSinUsar, porcentajeActivas: pActivas }
  }, [resumen])

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center my-4">
        <Spinner animation="border" size="sm" className="me-2" />
        <span className="text-muted">Cargando analíticas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-3">
        <strong>Error al cargar analíticas:</strong> {error}
      </Alert>
    )
  }

  return (
    <>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        <Col>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted text-uppercase fw-semibold fs-12 mb-2">
                    Licencias totales
                  </div>
                  <div className="fs-24 fw-bold">{resumen.total}</div>
                  <div className="text-muted fs-12">Total de licencias registradas en MIRA</div>
                </div>
                <div className="avatar-sm bg-primary-subtle rounded d-flex align-items-center justify-content-center">
                  <TbKey className="text-primary fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted text-uppercase fw-semibold fs-12 mb-2">
                    Licencias activas
                  </div>
                  <div className="fs-24 fw-bold">{resumen.activas}</div>
                  <div className="text-muted fs-12">
                    {porcentajeActivas}% del total actualmente activas
                  </div>
                </div>
                <div className="avatar-sm bg-success-subtle rounded d-flex align-items-center justify-content-center">
                  <TbCheck className="text-success fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted text-uppercase fw-semibold fs-12 mb-2">
                    Licencias sin usar
                  </div>
                  <div className="fs-24 fw-bold">{resumen.sinUsar}</div>
                  <div className="text-muted fs-12">
                    {porcentajeUsadas}% usadas / {porcentajeSinUsar}% sin usar
                  </div>
                </div>
                <div className="avatar-sm bg-warning-subtle rounded d-flex align-items-center justify-content-center">
                  <TbClockHour4 className="text-warning fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted text-uppercase fw-semibold fs-12 mb-2">
                    Estimación estudiantes con acceso
                  </div>
                  <div className="fs-24 fw-bold">
                    {resumen.total - resumen.sinUsar}
                  </div>
                  <div className="text-muted fs-12">
                    {porcentajeUsadas}% de las licencias ya fueron activadas
                  </div>
                </div>
                <div className="avatar-sm bg-info-subtle rounded d-flex align-items-center justify-content-center">
                  <TbUserCheck className="text-info fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col lg={8}>
          <Card className="mb-3">
            <Card.Header>
              <Card.Title as="h5" className="mb-0">
                Uso por libro (Top 10)
              </Card.Title>
              <Card.Subtitle className="text-muted fs-12">
                Basado en las licencias registradas en MIRA
              </Card.Subtitle>
            </Card.Header>
            <Card.Body>
              {usoPorLibro.length === 0 && (
                <div className="text-muted fs-13">No hay datos suficientes para mostrar.</div>
              )}
              {usoPorLibro.map((libro, index) => {
                const porcentaje =
                  libro.total > 0 ? Math.round((libro.usadas / libro.total) * 100) : 0
                return (
                  <div key={index} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div>
                        <div className="fw-semibold">{libro.nombre_libro}</div>
                        {libro.isbn_libro && (
                          <div className="text-muted fs-12">ISBN: {libro.isbn_libro}</div>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold fs-12">
                          {libro.usadas}/{libro.total} usadas
                        </div>
                        <div className="text-muted fs-12">{porcentaje}%</div>
                      </div>
                    </div>
                    <ProgressBar
                      now={porcentaje}
                      variant={porcentaje > 80 ? 'success' : porcentaje > 40 ? 'info' : 'warning'}
                      style={{ height: 6 }}
                    />
                  </div>
                )
              })}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-3">
            <Card.Header>
              <Card.Title as="h5" className="mb-0">
                Notas rápidas
              </Card.Title>
            </Card.Header>
            <Card.Body className="fs-13 text-muted">
              <ul className="mb-2">
                <li>
                  Este tablero se basa en los datos de <strong>MIRA · Licencias</strong> que ya
                  estás viendo en la tabla.
                </li>
                <li>
                  Puedes usar estos indicadores para detectar libros con muchas licencias sin usar o
                  vencidas.
                </li>
                <li>
                  Más adelante se pueden agregar filtros por año, colegio, curso, etc.
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col>
          <Card className="mb-3">
            <Card.Header>
              <Card.Title as="h5" className="mb-0">
                Activaciones recientes
              </Card.Title>
              <Card.Subtitle className="text-muted fs-12">
                Últimas licencias utilizadas por estudiantes
              </Card.Subtitle>
            </Card.Header>
            <Card.Body style={{ maxHeight: 360, overflowY: 'auto' }}>
              {activacionesRecientes.length === 0 && (
                <div className="text-muted fs-13">Aún no hay licencias activadas.</div>
              )}
              {activacionesRecientes.length > 0 && (
                <Table responsive hover size="sm" className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Fecha</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Estudiante</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Colegio / Curso</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Libro</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activacionesRecientes.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(item.fecha_activacion).toLocaleDateString('es-CL', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                        <td>
                          <div className="fw-semibold">{item.estudiante}</div>
                          {item.email && (
                            <div className="text-muted fs-12">{item.email}</div>
                          )}
                        </td>
                        <td>
                          {item.colegio && <div className="fs-12">{item.colegio}</div>}
                          {item.curso && (
                            <div className="text-muted fs-12">{item.curso}</div>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold fs-13">{item.libro}</div>
                          {item.isbn && (
                            <div className="text-muted fs-12">ISBN: {item.isbn}</div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="text-monospace fs-12">{item.codigo}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AnaliticasMiraClient

