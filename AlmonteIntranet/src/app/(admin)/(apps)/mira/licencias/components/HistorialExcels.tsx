'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Spinner } from 'react-bootstrap'
import { LuFileSpreadsheet, LuDownload, LuRefreshCw } from 'react-icons/lu'

interface ExcelFile {
  id: number | string
  name: string
  createdAt: string | null
  url: string
}

interface HistorialExcelsProps {
  /** Incrementar para forzar recarga (ej. tras generar o importar) */
  refreshTrigger?: number
}

export default function HistorialExcels({ refreshTrigger = 0 }: HistorialExcelsProps) {
  const [files, setFiles] = useState<ExcelFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mira/historial-excels')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setFiles(data.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [refreshTrigger])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  return (
    <Card className="mt-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>
          <LuFileSpreadsheet className="me-2" />
          Historial de Archivos (Excels de licencias)
        </span>
        <Button variant="outline-secondary" size="sm" onClick={fetchFiles} disabled={loading}>
          <LuRefreshCw className={loading ? 'spinning' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          {' '}Actualizar
        </Button>
      </Card.Header>
      <Card.Body>
        {error && (
          <div className="alert alert-warning mb-0">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Cargando...</span>
          </div>
        )}
        {!loading && !error && files.length === 0 && (
          <p className="text-muted mb-0">No hay archivos de licencias guardados aún.</p>
        )}
        {!loading && files.length > 0 && (
          <Table responsive size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Nombre del archivo</th>
                <th>Fecha de creación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={String(f.id)}>
                  <td className="text-break">{f.name}</td>
                  <td>{formatDate(f.createdAt)}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      as="a"
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={f.name}
                    >
                      <LuDownload className="me-1" />
                      Descargar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  )
}
