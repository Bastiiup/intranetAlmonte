'use client'

import { Modal, Button, Table, Badge } from 'react-bootstrap'
import { LuX, LuFileText, LuCalendar } from 'react-icons/lu'

interface DetalleListasModalProps {
  show: boolean
  onHide: () => void
  colegio: any
}

export default function DetalleListasModal({ show, onHide, colegio }: DetalleListasModalProps) {
  if (!colegio) return null

  const cursos = colegio.cursos || []

  // Agrupar cursos por año
  const cursosPorAño = cursos.reduce((acc: any, curso: any) => {
    const año = curso.año || new Date().getFullYear()
    if (!acc[año]) {
      acc[año] = []
    }
    acc[año].push(curso)
    return acc
  }, {} as Record<number, any[]>)

  const años = Object.keys(cursosPorAño).map(Number).sort((a, b) => b - a)

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header className="d-flex justify-content-between align-items-center">
        <div>
          <Modal.Title>Listas de {colegio.nombre}</Modal.Title>
          {colegio.rbd && <small className="text-muted">RBD: {colegio.rbd}</small>}
        </div>
        <Button variant="light" size="sm" onClick={onHide} className="btn-icon rounded-circle">
          <LuX />
        </Button>
      </Modal.Header>
      <Modal.Body>
        {años.length === 0 ? (
          <p className="text-muted text-center py-4">No hay listas disponibles</p>
        ) : (
          años.map((año) => {
            const cursos = cursosPorAño[año]
            const totalVersiones = cursos.reduce((sum: number, c) => sum + (c.versiones || 0), 0)

            return (
              <div key={año} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">
                    <LuCalendar className="me-2" />
                    Año {año}
                  </h6>
                  <Badge bg="primary">
                    {totalVersiones} {totalVersiones === 1 ? 'lista' : 'listas'}
                  </Badge>
                </div>
                <Table bordered hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Curso</th>
                      <th className="text-center">Versiones</th>
                      <th className="text-center">Productos</th>
                      <th className="text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.map((curso) => (
                      <tr key={curso.id}>
                        <td>
                          <strong>{curso.nombre || 'Sin nombre'}</strong>
                          {(curso.nivel || curso.grado) && (
                            <>
                              <br />
                              <small className="text-muted">
                                {curso.nivel && `${curso.nivel}`}
                                {curso.nivel && curso.grado && ' - '}
                                {curso.grado && `${curso.grado}°`}
                              </small>
                            </>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg="info">{curso.versiones || 0}</Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="success">{curso.materiales || 0}</Badge>
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
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )
          })
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
