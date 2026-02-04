'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody, CardHeader, Table, Badge, Spinner, Alert, Button } from 'react-bootstrap'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LuDollarSign, LuTrendingUp, LuTrendingDown, LuRefreshCw, LuMinus } from 'react-icons/lu'

interface HistorialPrecio {
  id: string | number
  documentId?: string
  precio_anterior: number
  precio_nuevo: number
  precio_oferta_anterior?: number
  precio_oferta_nuevo?: number
  motivo?: string
  origen?: string
  fecha_cambio: string
  libro?: {
    documentId?: string
    nombre_libro?: string
    isbn_libro?: string
  }
  usuario?: {
    nombre_completo?: string
    email_login?: string
  }
}

interface HistorialPreciosProps {
  libroId: string
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value)
}

const getOrigenBadge = (origen?: string) => {
  const config: Record<string, { bg: string; label: string }> = {
    manual_intranet: { bg: 'primary', label: 'Manual' },
    importacion_csv: { bg: 'info', label: 'Importación' },
    sincronizacion_woo: { bg: 'warning', label: 'Sync WooCommerce' },
    orden_compra: { bg: 'success', label: 'Orden Compra' },
    promocion: { bg: 'danger', label: 'Promoción' },
    otro: { bg: 'secondary', label: 'Otro' },
  }
  const { bg, label } = config[origen || 'otro'] || config.otro
  return <Badge bg={bg}>{label}</Badge>
}

const getPriceChangeIcon = (anterior: number, nuevo: number) => {
  if (nuevo > anterior) return <LuTrendingUp className="text-success" />
  if (nuevo < anterior) return <LuTrendingDown className="text-danger" />
  return <LuMinus className="text-muted" />
}

const getPriceChangePercent = (anterior: number, nuevo: number): string => {
  if (!anterior || anterior === 0) return '-'
  const change = ((nuevo - anterior) / anterior) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

export default function HistorialPrecios({ libroId }: HistorialPreciosProps) {
  const [historial, setHistorial] = useState<HistorialPrecio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistorial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/inventario/historial-precios?libro=${libroId}&pageSize=50`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al cargar historial')
      }

      // Normalizar datos
      const historialData = (result.data || []).map((h: any) => {
        const attrs = h.attributes || h
        return {
          ...h,
          ...attrs,
          libro: attrs.libro?.data || attrs.libro,
          usuario: attrs.usuario?.data || attrs.usuario,
        }
      })

      setHistorial(historialData)
    } catch (err: any) {
      console.error('Error al cargar historial de precios:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [libroId])

  useEffect(() => {
    if (libroId) {
      loadHistorial()
    }
  }, [libroId, loadHistorial])

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <LuDollarSign className="me-2" />
          Historial de Precios
        </h5>
        <Button variant="outline-primary" size="sm" onClick={loadHistorial} disabled={loading}>
          <LuRefreshCw className={loading ? 'spin' : ''} />
        </Button>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="sm" />
            <p className="text-muted mt-2 mb-0 small">Cargando historial...</p>
          </div>
        ) : historial.length === 0 ? (
          <Alert variant="info" className="mb-0">
            Este producto aún no tiene historial de cambios de precio.
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th className="text-end">Precio Anterior</th>
                  <th className="text-center"></th>
                  <th className="text-end">Precio Nuevo</th>
                  <th className="text-center">Cambio</th>
                  <th>Origen</th>
                  <th>Motivo</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.documentId || h.id}>
                    <td>
                      <div className="small fw-medium">
                        {h.fecha_cambio ? format(new Date(h.fecha_cambio), 'dd MMM yyyy', { locale: es }) : '-'}
                      </div>
                      <small className="text-muted">
                        {h.fecha_cambio ? format(new Date(h.fecha_cambio), 'HH:mm', { locale: es }) : ''}
                      </small>
                    </td>
                    <td className="text-end">
                      <div>{formatCurrency(h.precio_anterior)}</div>
                      {h.precio_oferta_anterior !== undefined && h.precio_oferta_anterior !== null && h.precio_oferta_anterior > 0 && (
                        <small className="text-muted">
                          Oferta: {formatCurrency(h.precio_oferta_anterior)}
                        </small>
                      )}
                    </td>
                    <td className="text-center">
                      {getPriceChangeIcon(h.precio_anterior, h.precio_nuevo)}
                    </td>
                    <td className="text-end">
                      <div className="fw-medium">{formatCurrency(h.precio_nuevo)}</div>
                      {h.precio_oferta_nuevo !== undefined && h.precio_oferta_nuevo !== null && h.precio_oferta_nuevo > 0 && (
                        <small className="text-success">
                          Oferta: {formatCurrency(h.precio_oferta_nuevo)}
                        </small>
                      )}
                    </td>
                    <td className="text-center">
                      <Badge 
                        bg={h.precio_nuevo > h.precio_anterior ? 'success-subtle' : h.precio_nuevo < h.precio_anterior ? 'danger-subtle' : 'secondary-subtle'}
                        text={h.precio_nuevo > h.precio_anterior ? 'success' : h.precio_nuevo < h.precio_anterior ? 'danger' : 'secondary'}
                      >
                        {getPriceChangePercent(h.precio_anterior, h.precio_nuevo)}
                      </Badge>
                    </td>
                    <td>{getOrigenBadge(h.origen)}</td>
                    <td>
                      <span className="text-truncate d-inline-block small" style={{ maxWidth: '150px' }} title={h.motivo}>
                        {h.motivo || '-'}
                      </span>
                    </td>
                    <td>
                      <small className="text-muted">
                        {h.usuario?.nombre_completo || h.usuario?.email_login || 'Sistema'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>

      <style jsx global>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  )
}

