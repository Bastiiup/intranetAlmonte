'use client'

import { Container, Alert } from 'react-bootstrap'
import ImportacionCompletaLogsViewer from './components/LogsViewer'

export default function ImportacionCompletaLogsPage() {
  return (
    <Container fluid className="py-4">
      <Alert variant="info" className="mb-3">
        <strong>🔒 Página oculta</strong> - Solo accesible por URL directa
        <br />
        <small className="text-muted">
          Esta página no aparece en el menú de navegación. Solo puedes acceder escribiendo la URL directamente.
          <br />
          URL: <code>/crm/listas/importacion-completa-logs</code>
        </small>
      </Alert>
      <ImportacionCompletaLogsViewer />
    </Container>
  )
}
