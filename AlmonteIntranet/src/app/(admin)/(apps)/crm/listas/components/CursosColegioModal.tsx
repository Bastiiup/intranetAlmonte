'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap'
import { LuX, LuMinus, LuMaximize2, LuFileText, LuEye } from 'react-icons/lu'
import Link from 'next/link'

interface CursosColegioModalProps {
  show: boolean
  onHide: () => void
  colegioId: string | number | null
  colegioNombre?: string
}

export default function CursosColegioModal({ show, onHide, colegioId, colegioNombre }: CursosColegioModalProps) {
  const [minimizado, setMinimizado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegio, setColegio] = useState<any>(null)
  const [cursos, setCursos] = useState<any[]>([])

  useEffect(() => {
    if (show && colegioId) {
      cargarCursos()
    }
  }, [show, colegioId])

  const cargarCursos = async () => {
    if (!colegioId) return

    setCargando(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/listas/por-colegio?colegioId=${colegioId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar cursos')
      }

      if (data.success && data.data && data.data.length > 0) {
        setColegio(data.data[0])
        setCursos(data.data[0].cursos || [])
      } else {
        setColegio(null)
        setCursos([])
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar cursos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="xl" 
      centered
      className={minimizado ? 'modal-minimized' : ''}
      style={minimizado ? {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        top: 'auto',
        left: 'auto',
        margin: 0,
        width: '300px',
      } : undefined}
    >
      <Modal.Header className="d-flex justify-content-between align-items-center">
        <div className="flex-grow-1">
          <Modal.Title>Cursos de {colegioNombre || colegio?.nombre || 'Colegio'}</Modal.Title>
          {colegio && (
            <div className="d-flex gap-2 mt-1">
              {colegio.rbd && <small className="text-muted">RBD: {colegio.rbd}</small>}
              {colegio.comuna && <small className="text-muted">• {colegio.comuna}</small>}
              {colegio.region && <small className="text-muted">• {colegio.region}</small>}
            </div>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="light" 
            size="sm" 
            onClick={() => setMinimizado(!minimizado)} 
            className="btn-icon rounded-circle"
            title={minimizado ? "Maximizar" : "Minimizar"}
          >
            {minimizado ? <LuMaximize2 /> : <LuMinus />}
          </Button>
          <Button variant="light" size="sm" onClick={onHide} className="btn-icon rounded-circle">
            <LuX />
          </Button>
        </div>
      </Modal.Header>

      {!minimizado && (
        <>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {cargando && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Cargando cursos...</p>
              </div>
            )}

            {error && (
              <Alert variant="danger">
                <strong>Error:</strong> {error}
              </Alert>
            )}

            {!cargando && !error && cursos.length === 0 && (
              <Alert variant="info">
                No se encontraron cursos con listas para este colegio
              </Alert>
            )}

            {!cargando && !error && cursos.length > 0 && (
              <Table striped bordered hover responsive>
                <thead className="table-light">
                  <tr>
                    <th>Curso</th>
                    <th className="text-center">Productos</th>
                    <th className="text-center">Versiones</th>
                    <th className="text-center">PDF</th>
                    <th className="text-center">Matriculados</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cursos.map((curso: any) => (
                    <tr key={curso.id}>
                      <td>
                        <strong>{curso.nombre}</strong>
                        <br />
                        <small className="text-muted">
                          {curso.nivel} - {curso.grado}° - {curso.año}
                        </small>
                      </td>
                      <td className="text-center">
                        <Badge bg="success">
                          {curso.cantidadProductos || 0}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg="info">
                          {curso.cantidadVersiones || 0}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {curso.pdf_id ? (
                          <Badge bg="success">
                            <LuFileText className="me-1" size={12} />
                            Sí
                          </Badge>
                        ) : (
                          <Badge bg="secondary">No</Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge bg="warning" text="dark">
                          {(curso.matriculados || 0).toLocaleString('es-CL')}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Link href={`/crm/listas/${curso.documentId || curso.id}/validacion`}>
                          <Button variant="primary" size="sm">
                            <LuEye className="me-1" size={14} />
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
              Cerrar
            </Button>
            {colegioId && (
              <Link href={`/crm/listas/colegio/${colegioId}`}>
                <Button variant="primary">
                  Ver en Pantalla Completa
                </Button>
              </Link>
            )}
          </Modal.Footer>
        </>
      )}
    </Modal>
  )
}
