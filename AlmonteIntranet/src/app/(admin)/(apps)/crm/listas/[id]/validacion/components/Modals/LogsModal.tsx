/**
 * Modal para ver logs del procesamiento
 * Responsivo para todas las pantallas
 */

'use client'

import { Modal } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { TbFileText, TbAlertTriangle, TbInfoCircle, TbX } from 'react-icons/tb'

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

// Estilos responsivos
const styles = `
  .logs-modal .modal-dialog {
    margin: 0.5rem;
    max-width: calc(100% - 1rem);
  }

  @media (min-width: 576px) {
    .logs-modal .modal-dialog {
      margin: 1.75rem auto;
      max-width: 500px;
    }
  }

  @media (min-width: 768px) {
    .logs-modal .modal-dialog {
      max-width: 700px;
    }
  }

  @media (min-width: 992px) {
    .logs-modal .modal-dialog {
      max-width: 900px;
    }
  }

  @media (min-width: 1200px) {
    .logs-modal .modal-dialog {
      max-width: 1140px;
    }
  }

  .logs-modal .modal-content {
    border-radius: 12px;
    border: none;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .logs-modal .modal-header {
    background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
    color: white;
    border-bottom: none;
    padding: 1rem;
  }

  @media (min-width: 768px) {
    .logs-modal .modal-header {
      padding: 1.25rem 1.5rem;
    }
  }

  .logs-modal .modal-title {
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (min-width: 768px) {
    .logs-modal .modal-title {
      font-size: 1.15rem;
    }
  }

  .logs-modal .btn-close {
    filter: invert(1);
    opacity: 0.7;
  }

  .logs-modal .btn-close:hover {
    opacity: 1;
  }

  .logs-modal .modal-body {
    padding: 0;
  }

  .logs-container {
    max-height: 50vh;
    overflow-y: auto;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 0.7rem;
    background: #1e1e1e;
    color: #d4d4d4;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.2) transparent;
  }

  @media (min-width: 576px) {
    .logs-container {
      max-height: 55vh;
      font-size: 0.75rem;
    }
  }

  @media (min-width: 768px) {
    .logs-container {
      max-height: 60vh;
      font-size: 0.8rem;
    }
  }

  @media (min-width: 992px) {
    .logs-container {
      max-height: 65vh;
      font-size: 0.85rem;
    }
  }

  .logs-container::-webkit-scrollbar {
    width: 8px;
  }

  .logs-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .logs-container::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
    border-radius: 4px;
  }

  .logs-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.3);
  }

  .log-entry {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  @media (min-width: 768px) {
    .log-entry {
      padding: 0.625rem 1rem;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-entry:hover {
    background: rgba(255,255,255,0.03);
  }

  .log-timestamp {
    color: #858585;
    font-size: 0.65rem;
    flex-shrink: 0;
  }

  @media (min-width: 768px) {
    .log-timestamp {
      font-size: inherit;
      min-width: 70px;
    }
  }

  .log-level {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.6rem;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  @media (min-width: 768px) {
    .log-level {
      font-size: 0.7rem;
      min-width: 65px;
      justify-content: center;
    }
  }

  .log-level.error {
    background: rgba(244, 135, 113, 0.2);
    color: #f48771;
  }

  .log-level.warn {
    background: rgba(220, 220, 170, 0.2);
    color: #dcdcaa;
  }

  .log-level.info {
    background: rgba(78, 201, 176, 0.2);
    color: #4ec9b0;
  }

  .log-message {
    flex: 1;
    word-break: break-word;
    line-height: 1.4;
  }

  @media (min-width: 768px) {
    .log-message {
      min-width: 0;
    }
  }

  .log-data {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.5rem;
    background: rgba(0,0,0,0.3);
    border-radius: 4px;
    font-size: 0.6rem;
    color: #858585;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
  }

  @media (min-width: 768px) {
    .log-data {
      margin-left: 0;
      font-size: 0.7rem;
    }
  }

  .logs-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: #858585;
    text-align: center;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .logs-empty {
      padding: 3rem;
    }
  }

  .logs-empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .logs-empty-icon {
      width: 56px;
      height: 56px;
    }
  }

  .logs-stats {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #252525;
    border-top: 1px solid #333;
    font-size: 0.65rem;
    flex-wrap: wrap;
  }

  @media (min-width: 768px) {
    .logs-stats {
      padding: 0.625rem 1rem;
      font-size: 0.75rem;
      gap: 1rem;
    }
  }

  .logs-stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255,255,255,0.05);
  }
`

export default function LogsModal({ show, logs, onHide }: LogsModalProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Inyectar estilos
    const styleId = 'logs-modal-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = styles
      document.head.appendChild(style)
    }
  }, [])

  // Contar logs por nivel
  const errorCount = logs.filter(l => l.level === 'error').length
  const warnCount = logs.filter(l => l.level === 'warn').length
  const infoCount = logs.filter(l => l.level === 'info').length

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <TbAlertTriangle size={12} />
      case 'warn': return <TbAlertTriangle size={12} />
      default: return <TbInfoCircle size={12} />
    }
  }

  if (!isMounted) return null

  return (
    <Modal
      show={show}
      onHide={onHide}
      className="logs-modal"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <TbFileText size={20} />
          Logs del Procesamiento
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="logs-container">
          {logs.length === 0 ? (
            <div className="logs-empty">
              <div className="logs-empty-icon">
                <TbFileText size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                  No hay logs disponibles
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  Procesa un PDF para ver los logs aquí
                </div>
              </div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString('es-CL')}
                </span>
                <span className={`log-level ${log.level}`}>
                  {getLevelIcon(log.level)}
                  {log.level}
                </span>
                <span className="log-message">{log.message}</span>
                {log.data && (
                  <pre className="log-data">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        {logs.length > 0 && (
          <div className="logs-stats">
            <span className="logs-stat" style={{ color: '#d4d4d4' }}>
              Total: {logs.length}
            </span>
            {errorCount > 0 && (
              <span className="logs-stat" style={{ color: '#f48771' }}>
                <TbAlertTriangle size={12} />
                {errorCount} errores
              </span>
            )}
            {warnCount > 0 && (
              <span className="logs-stat" style={{ color: '#dcdcaa' }}>
                <TbAlertTriangle size={12} />
                {warnCount} avisos
              </span>
            )}
            {infoCount > 0 && (
              <span className="logs-stat" style={{ color: '#4ec9b0' }}>
                <TbInfoCircle size={12} />
                {infoCount} info
              </span>
            )}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}
