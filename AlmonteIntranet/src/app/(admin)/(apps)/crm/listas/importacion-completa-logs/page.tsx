'use client'

import { Container, Alert, Badge } from 'react-bootstrap'
import { LuLink, LuEye, LuEyeOff } from 'react-icons/lu'
import ImportacionCompletaLogsViewer from './components/LogsViewer'

export default function ImportacionCompletaLogsPage() {
  return (
    <Container fluid className="py-4">
      <Alert variant="info" className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <LuEyeOff size={20} />
          <strong>Página de Logs - Solo accesible por URL directa</strong>
        </div>
        <p className="mb-2">
          Esta página no aparece en el menú de navegación. Solo puedes acceder escribiendo la URL directamente.
        </p>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Badge bg="secondary">
            <LuLink size={12} className="me-1" />
            URL: <code className="ms-1">/crm/listas/importacion-completa-logs</code>
          </Badge>
          <Badge bg="primary">
            📋 Muestra logs de importación completa
          </Badge>
          <Badge bg="success">
            🔄 Auto-refresh disponible
          </Badge>
        </div>
        <small className="text-muted d-block mt-2">
          <strong>¿Qué se registra aquí?</strong> Todos los logs relacionados con la importación completa de listas, 
          incluyendo creación de cursos, subida de PDFs, actualización de versiones_materiales, y cualquier error o advertencia.
        </small>
      </Alert>
      <ImportacionCompletaLogsViewer />
    </Container>
  )
}
