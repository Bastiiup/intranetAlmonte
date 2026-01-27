import { type Metadata } from 'next'
import { Container, Row, Col, Card, ProgressBar } from 'react-bootstrap'
import { TbCheck, TbClockHour4, TbKey, TbUserCheck } from 'react-icons/tb'
import PageBreadcrumb from '@/components/PageBreadcrumb'

export const metadata: Metadata = {
  title: 'MIRA · Analíticas',
}

export const dynamic = 'force-dynamic'

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

async function getLicenciasResumen(): Promise<{
  resumen: LicenciaResumen
  usoPorLibro: UsoPorLibro[]
}> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/api/mira/licencias?pageSize=500`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`)
    }

    const json = await res.json()
    const data = Array.isArray(json.data) ? json.data : []

    const hoy = new Date()

    const resumen: LicenciaResumen = {
      total: data.length,
      activas: 0,
      vencidas: 0,
      sinUsar: 0,
    }

    const mapaPorLibro = new Map<string, UsoPorLibro>()

    for (const lic of data) {
      const activa = lic.activa !== false
      const fechaVenc = lic.fecha_vencimiento ? new Date(lic.fecha_vencimiento) : null
      const usada = Boolean(lic.fecha_activacion)

      if (activa) resumen.activas++

      if (fechaVenc && fechaVenc < hoy) {
        resumen.vencidas++
      }

      if (!usada) {
        resumen.sinUsar++
      }

      const libro = lic.libro_mira?.libro
      if (libro) {
        const key = libro.isbn_libro || libro.nombre_libro || 'desconocido'
        const existente = mapaPorLibro.get(key)
        if (!existente) {
          mapaPorLibro.set(key, {
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
    }

    const usoPorLibro = Array.from(mapaPorLibro.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return { resumen, usoPorLibro }
  } catch (e) {
    console.error('[MIRA Analiticas] Error obteniendo datos:', e)
    return {
      resumen: { total: 0, activas: 0, vencidas: 0, sinUsar: 0 },
      usoPorLibro: [],
    }
  }
}

const Page = async () => {
  const { resumen, usoPorLibro } = await getLicenciasResumen()

  const porcentajeUsadas =
    resumen.total > 0 ? Math.round(((resumen.total - resumen.sinUsar) / resumen.total) * 100) : 0

  return (
    <Container fluid>
      <PageBreadcrumb title="Analíticas MIRA" subtitle="MIRA" />

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
                    {porcentajeUsadas}% usadas / {100 - porcentajeUsadas}% sin usar
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
                  <div className="text-muted fs-12">Licencias con fecha de activación</div>
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
    </Container>
  )
}

export default Page

