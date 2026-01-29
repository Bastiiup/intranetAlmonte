'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner,
  Table,
  Badge,
  Card,
  Row,
  Col,
} from 'react-bootstrap'
import { LuCircleCheck, LuXCircle, LuRefreshCw, LuUsers, LuGraduationCap, LuSchool } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface VerificarImportacionModalProps {
  show: boolean
  onHide: () => void
}

interface Estadisticas {
  totalColegios: number
  totalCursos: number
  colegiosConCursos: number
  cursosConAlumnos: number
  porcentajeCursosConAlumnos: string
  cursosRecientes: Array<{
    id: string | number
    nombre: string
    colegio: string
    cantidad_alumnos: number | null
    nivel: string
    grado: string
    updatedAt: string
  }>
  colegiosRecientes: Array<{
    id: string | number
    nombre: string
    rbd?: string | number
    totalCursos: number
    cursosConAlumnos: number
    createdAt: string
  }>
}

export default function VerificarImportacionModal({ show, onHide }: VerificarImportacionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)

  const verificar = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/crm/colegios/verificar-importacion')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al verificar importación')
      }

      setEstadisticas(result.data)
    } catch (err: any) {
      console.error('[VerificarImportacionModal] Error:', err)
      setError(err.message || 'Error al verificar importación')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      verificar()
    }
  }, [show])

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <ModalHeader closeButton>
        <ModalTitle>
          <div className="d-flex align-items-center gap-2">
            <LuCircleCheck />
            <span>Verificar Estado de Importación</span>
          </div>
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" className="mb-3" />
            <p>Verificando estado de importación...</p>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {estadisticas && !loading && (
          <div>
            {/* Resumen General */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <LuSchool size={32} className="text-primary mb-2" />
                    <h3>{estadisticas.totalColegios}</h3>
                    <p className="text-muted mb-0">Total Colegios</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <LuGraduationCap size={32} className="text-success mb-2" />
                    <h3>{estadisticas.totalCursos}</h3>
                    <p className="text-muted mb-0">Total Cursos</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <LuUsers size={32} className="text-info mb-2" />
                    <h3>{estadisticas.cursosConAlumnos}</h3>
                    <p className="text-muted mb-0">Cursos con Alumnos</p>
                    <Badge bg={estadisticas.cursosConAlumnos > 0 ? 'success' : 'warning'} className="mt-2">
                      {estadisticas.porcentajeCursosConAlumnos}%
                    </Badge>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <LuCircleCheck size={32} className="text-warning mb-2" />
                    <h3>{estadisticas.colegiosConCursos}</h3>
                    <p className="text-muted mb-0">Colegios con Cursos</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Últimos Colegios Creados */}
            <Card className="mb-3">
              <Card.Header>
                <h5 className="mb-0">Últimos Colegios Creados</h5>
              </Card.Header>
              <Card.Body>
                {estadisticas.colegiosRecientes.length === 0 ? (
                  <Alert variant="info">No hay colegios recientes</Alert>
                ) : (
                  <Table hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>RBD</th>
                        <th className="text-center">Total Cursos</th>
                        <th className="text-center">Cursos con Alumnos</th>
                        <th>Fecha Creación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.colegiosRecientes.map((colegio) => (
                        <tr key={colegio.id}>
                          <td>{colegio.nombre}</td>
                          <td>{colegio.rbd || 'N/A'}</td>
                          <td className="text-center">
                            <Badge bg="primary">{colegio.totalCursos}</Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg={colegio.cursosConAlumnos > 0 ? 'success' : 'secondary'}>
                              {colegio.cursosConAlumnos}
                            </Badge>
                          </td>
                          <td>
                            {colegio.createdAt
                              ? format(new Date(colegio.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {/* Últimos Cursos Actualizados */}
            <Card>
              <Card.Header>
                <h5 className="mb-0">Últimos Cursos Actualizados</h5>
              </Card.Header>
              <Card.Body>
                {estadisticas.cursosRecientes.length === 0 ? (
                  <Alert variant="info">No hay cursos recientes</Alert>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <Table hover responsive size="sm">
                      <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                        <tr>
                          <th>Curso</th>
                          <th>Colegio</th>
                          <th>Nivel</th>
                          <th>Grado</th>
                          <th className="text-center">Cantidad Alumnos</th>
                          <th>Última Actualización</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadisticas.cursosRecientes.map((curso) => (
                          <tr key={curso.id}>
                            <td>{curso.nombre}</td>
                            <td>{curso.colegio}</td>
                            <td>
                              <Badge bg="info">{curso.nivel}</Badge>
                            </td>
                            <td>
                              <Badge bg="secondary">{curso.grado}º</Badge>
                            </td>
                            <td className="text-center">
                              {curso.cantidad_alumnos !== null && curso.cantidad_alumnos !== undefined ? (
                                <Badge bg="success">{curso.cantidad_alumnos}</Badge>
                              ) : (
                                <Badge bg="secondary">Sin datos</Badge>
                              )}
                            </td>
                            <td>
                              {curso.updatedAt
                                ? format(new Date(curso.updatedAt), 'dd/MM/yyyy HH:mm', { locale: es })
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
        <Button variant="primary" onClick={verificar} disabled={loading}>
          <LuRefreshCw className={loading ? 'spinning' : ''} /> Actualizar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
