'use client'

import { useState, useEffect } from 'react'
import { Card, Spinner, Table } from 'react-bootstrap'

type Trampolin = { id: string; urlDestino: string; nombre: string; descripcion: string; visitas: number }

export default function ReportesQRClient() {
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
          <p className="mt-2 mb-0 text-muted">Cargando reportes...</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title as="h5" className="mb-0">Métricas por QR</Card.Title>
        <Card.Text as="small" className="text-muted mb-0 mt-1">
          Total de accesos: <strong>{totalVisitas}</strong> · Redirecciones: <strong>{list.length}</strong>
        </Card.Text>
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
                <th>Enlace corto</th>
                <th className="text-end">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {list
                .slice()
                .sort((a, b) => (b.visitas ?? 0) - (a.visitas ?? 0))
                .map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre || t.id}</td>
                    <td className="text-muted small" style={{ maxWidth: 280 }}>{t.descripcion || '—'}</td>
                    <td><code className="small">/mira/ir/{t.id}</code></td>
                    <td className="text-end fw-semibold">{t.visitas ?? 0}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}
