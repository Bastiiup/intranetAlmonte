'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody, CardHeader, Table, Badge, Spinner, Alert, Row, Col, Form, Button, InputGroup } from 'react-bootstrap'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LuPackage, LuTrendingUp, LuTrendingDown, LuSearch, LuRefreshCw, LuArrowUp, LuArrowDown, LuMinus } from 'react-icons/lu'
import Link from 'next/link'

interface Movimiento {
  id: string | number
  documentId?: string
  tipo: string
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo?: string
  referencia_tipo?: string
  referencia_id?: string
  fecha_movimiento: string
  libro?: {
    documentId?: string
    nombre_libro?: string
    isbn_libro?: string
  }
  orden_compra?: {
    documentId?: string
    numero_po?: string
  }
  usuario?: {
    nombre_completo?: string
    email_login?: string
  }
}

interface MovimientosListingProps {
  libroId?: string // Si se pasa, filtra por libro
  showProductColumn?: boolean
}

const TIPOS_MOVIMIENTO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste_positivo', label: 'Ajuste (+)' },
  { value: 'ajuste_negativo', label: 'Ajuste (-)' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'merma', label: 'Merma' },
  { value: 'transferencia_entrada', label: 'Transferencia entrada' },
  { value: 'transferencia_salida', label: 'Transferencia salida' },
]

const getTipoBadge = (tipo: string) => {
  const config: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
    entrada: { bg: 'success', icon: <LuArrowUp className="me-1" />, label: 'Entrada' },
    salida: { bg: 'danger', icon: <LuArrowDown className="me-1" />, label: 'Salida' },
    ajuste_positivo: { bg: 'info', icon: <LuTrendingUp className="me-1" />, label: 'Ajuste (+)' },
    ajuste_negativo: { bg: 'warning', icon: <LuTrendingDown className="me-1" />, label: 'Ajuste (-)' },
    devolucion: { bg: 'primary', icon: <LuRefreshCw className="me-1" />, label: 'Devolución' },
    merma: { bg: 'dark', icon: <LuMinus className="me-1" />, label: 'Merma' },
    transferencia_entrada: { bg: 'success-subtle', icon: <LuArrowUp className="me-1" />, label: 'Trans. entrada' },
    transferencia_salida: { bg: 'danger-subtle', icon: <LuArrowDown className="me-1" />, label: 'Trans. salida' },
  }
  const { bg, icon, label } = config[tipo] || { bg: 'secondary', icon: null, label: tipo }
  return (
    <Badge bg={bg} className="d-flex align-items-center" style={{ width: 'fit-content' }}>
      {icon}
      {label}
    </Badge>
  )
}

export default function MovimientosListing({ libroId, showProductColumn = true }: MovimientosListingProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [resumen, setResumen] = useState<any>(null)

  const loadMovimientos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        pageSize: '100',
        ...(libroId && { libro: libroId }),
        ...(tipoFiltro && { tipo: tipoFiltro }),
      })

      const response = await fetch(`/api/inventario/movimientos?${params.toString()}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar movimientos')
      }

      // Normalizar datos
      const movimientosData = (result.data || []).map((m: any) => {
        const attrs = m.attributes || m
        return {
          ...m,
          ...attrs,
          libro: attrs.libro?.data || attrs.libro,
          orden_compra: attrs.orden_compra?.data || attrs.orden_compra,
          usuario: attrs.usuario?.data || attrs.usuario,
        }
      })

      setMovimientos(movimientosData)
      setResumen(result.resumen)
    } catch (err: any) {
      console.error('Error al cargar movimientos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [libroId, tipoFiltro])

  useEffect(() => {
    loadMovimientos()
  }, [loadMovimientos])

  // Filtrar por búsqueda
  const filteredMovimientos = movimientos.filter(m => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const libro = m.libro?.nombre_libro?.toLowerCase() || ''
    const isbn = m.libro?.isbn_libro?.toLowerCase() || ''
    const motivo = m.motivo?.toLowerCase() || ''
    return libro.includes(term) || isbn.includes(term) || motivo.includes(term)
  })

  return (
    <>
      {/* Resumen si hay libro específico */}
      {resumen && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <CardBody className="text-center">
                <div className="text-muted small">Total Movimientos</div>
                <div className="fs-3 fw-bold text-primary">{resumen.totalMovimientos}</div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-success-subtle">
              <CardBody className="text-center">
                <div className="text-muted small">Total Entradas</div>
                <div className="fs-3 fw-bold text-success">+{resumen.totalEntradas}</div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm bg-danger-subtle">
              <CardBody className="text-center">
                <div className="text-muted small">Total Salidas</div>
                <div className="fs-3 fw-bold text-danger">-{resumen.totalSalidas}</div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <CardBody className="text-center">
                <div className="text-muted small">Balance Neto</div>
                <div className={`fs-3 fw-bold ${resumen.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {resumen.balance >= 0 ? '+' : ''}{resumen.balance}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="mb-0">
            <LuPackage className="me-2" />
            Movimientos de Inventario
          </h5>
          <div className="d-flex gap-2 flex-wrap">
            <InputGroup style={{ width: '250px' }}>
              <InputGroup.Text>
                <LuSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Buscar producto o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Form.Select
              style={{ width: '180px' }}
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              {TIPOS_MOVIMIENTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Form.Select>
            <Button variant="outline-primary" onClick={loadMovimientos} disabled={loading}>
              <LuRefreshCw className={loading ? 'spin' : ''} />
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Cargando movimientos...</p>
            </div>
          ) : filteredMovimientos.length === 0 ? (
            <Alert variant="info">
              No hay movimientos de inventario registrados.
              {libroId && ' Este producto aún no tiene historial de movimientos.'}
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    {showProductColumn && <th>Producto</th>}
                    <th className="text-center">Cantidad</th>
                    <th className="text-center">Stock Anterior</th>
                    <th className="text-center">Stock Nuevo</th>
                    <th>Motivo</th>
                    <th>Referencia</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovimientos.map((mov) => {
                    const isPositive = ['entrada', 'ajuste_positivo', 'devolucion', 'transferencia_entrada'].includes(mov.tipo)
                    return (
                      <tr key={mov.documentId || mov.id}>
                        <td>
                          <div className="fw-medium">
                            {mov.fecha_movimiento ? format(new Date(mov.fecha_movimiento), 'dd MMM yyyy', { locale: es }) : '-'}
                          </div>
                          <small className="text-muted">
                            {mov.fecha_movimiento ? format(new Date(mov.fecha_movimiento), 'HH:mm', { locale: es }) : ''}
                          </small>
                        </td>
                        <td>{getTipoBadge(mov.tipo)}</td>
                        {showProductColumn && (
                          <td>
                            {mov.libro ? (
                              <div>
                                <Link 
                                  href={`/products/${mov.libro.documentId}`}
                                  className="text-decoration-none fw-medium"
                                >
                                  {mov.libro.nombre_libro || 'Sin nombre'}
                                </Link>
                                {mov.libro.isbn_libro && (
                                  <div className="text-muted small">{mov.libro.isbn_libro}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        )}
                        <td className="text-center">
                          <span className={`fw-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                            {isPositive ? '+' : '-'}{Math.abs(mov.cantidad)}
                          </span>
                        </td>
                        <td className="text-center">
                          <Badge bg="secondary-subtle" text="secondary">{mov.stock_anterior}</Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="primary-subtle" text="primary">{mov.stock_nuevo}</Badge>
                        </td>
                        <td>
                          <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={mov.motivo}>
                            {mov.motivo || '-'}
                          </span>
                        </td>
                        <td>
                          {mov.orden_compra ? (
                            <Link 
                              href={`/crm/compras/ordenes-compra/${mov.orden_compra.documentId}`}
                              className="text-decoration-none"
                            >
                              <Badge bg="info-subtle" text="info">
                                PO: {mov.orden_compra.numero_po || mov.referencia_id}
                              </Badge>
                            </Link>
                          ) : mov.referencia_tipo ? (
                            <Badge bg="secondary-subtle" text="secondary">
                              {mov.referencia_tipo}: {mov.referencia_id}
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {mov.usuario ? (
                            <div className="small">
                              {mov.usuario.nombre_completo || mov.usuario.email_login || '-'}
                            </div>
                          ) : (
                            <span className="text-muted small">Sistema</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

