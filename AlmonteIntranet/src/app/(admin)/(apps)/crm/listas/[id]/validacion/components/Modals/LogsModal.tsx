/**
 * Modal para ver logs del procesamiento
 */

'use client'

import { Modal } from 'react-bootstrap'

interface Log {
  timestamp: string
  level: string
  message: string
  data?: any
}

interface LogsModalProps {
  show: boolean
  logs: Log[]
  onHide: () => void
}

export default function LogsModal({ show, logs, onHide }: LogsModalProps) {
  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Logs del Procesamiento</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ 
          maxHeight: '60vh', 
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: '4px'
        }}>
          {logs.length === 0 ? (
            <div className="text-center text-muted py-4">
              No hay logs disponibles. Procesa un PDF para ver los logs.
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index}
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.25rem 0',
                  borderBottom: index < logs.length - 1 ? '1px solid #333' : 'none',
                  color: log.level === 'error' ? '#f48771' : 
                         log.level === 'warn' ? '#dcdcaa' : '#4ec9b0'
                }}
              >
                <span style={{ color: '#858585', marginRight: '0.5rem' }}>
                  {new Date(log.timestamp).toLocaleTimeString('es-CL')}
                </span>
                <span style={{ 
                  fontWeight: 'bold',
                  marginRight: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  [{log.level}]
                </span>
                <span>{log.message}</span>
                {log.data && (
                  <pre style={{ 
                    marginTop: '0.25rem', 
                    marginLeft: '1rem',
                    fontSize: '0.75rem',
                    color: '#858585',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </Modal.Body>
    </Modal>
  )
}
