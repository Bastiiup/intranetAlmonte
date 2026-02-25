'use client'

import { useState, useEffect } from 'react'
import { Card, Spinner, Table } from 'react-bootstrap'

type Trampolin = { id: string; urlDestino: string; nombre: string; descripcion: string; visitas: number }

export default function DashboardQRClient() {
  const [list, setList] = useState<Trampolin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mira/trampolin')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setList(json.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const totalVisitas = list.reduce((s, t) => s + (t.visitas || 0), 0)

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2 mb-0 text-muted">Cargando métricas...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-4">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title as="h6" className="text-muted text-uppercase small">Total de accesos</Card.Title>
              <p className="mb-0 display-6">{totalVisitas}</p>
              <small className="text-muted">visitas por todos los QR</small>
            </Card.Body>
          </Card>
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Card.Title as="h6" className="text-muted text-uppercase small">Códigos QR</Card.Title>
              <p className="mb-0 display-6">{list.length}</p>
              <small className="text-muted">redirecciones activas</small>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Card>
        <Card.Header>
          <Card.Title as="h5" className="mb-0">Visitas por QR</Card.Title>
        </Card.Header>
        <Card.Body className="p-0">
          {list.length === 0 ? (
            <p className="text-muted p-4 mb-0">No hay redirecciones. Crea una en <strong>Generar QR</strong>.</p>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th className="text-end">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre || t.id}</td>
                    <td className="text-muted small">{t.descripcion || '—'}</td>
                    <td className="text-end fw-semibold">{t.visitas ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  )
}
