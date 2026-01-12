'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuPackage, LuGraduationCap, LuDownload, LuPencil, LuCheck, LuX } from 'react-icons/lu'
import Link from 'next/link'
import { exportarMaterialesAExcel } from '@/helpers/excel'
import CursoModal from '../../components/CursoModal'

// Helper para logs condicionales
const DEBUG = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).DEBUG_CRM === 'true')
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}

export default function CursoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const colegioId = params.id as string
  const cursoId = params.cursoId as string
  
  debugLog('[CursoDetailPage] Params:', { colegioId, cursoId })
  
  const [curso, setCurso] = useState<any>(null)
  const [colegio, setColegio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!colegioId || !cursoId) return
      
      setLoading(true)
      setError(null)

      try {
        // Obtener información del colegio
        const colegioResponse = await fetch(`/api/crm/colegios/${colegioId}`)
        const colegioResult = await colegioResponse.json()
        if (colegioResult.success) {
          setColegio(colegioResult.data)
        }

        // Obtener información del curso
        debugLog('[CursoDetailPage] Obteniendo curso con ID:', cursoId)
        const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
        const cursoResult = await cursoResponse.json()
        
        debugLog('[CursoDetailPage] Respuesta de API:', {
          success: cursoResult.success,
          hasData: !!cursoResult.data,
          error: cursoResult.error,
          status: cursoResponse.status,
        })
        
        if (cursoResponse.status === 404 || (!cursoResult.success && cursoResult.error?.includes('Not Found'))) {
          setError(`Curso con ID ${cursoId} no encontrado. Puede que el ID sea incorrecto o el curso haya sido eliminado.`)
        } else if (cursoResult.success && cursoResult.data) {
          setCurso(cursoResult.data)
        } else {
          setError(cursoResult.error || 'Error al cargar el curso')
        }
      } catch (err: any) {
        console.error('Error al cargar datos:', err)
        setError(err.message || 'Error al cargar el curso')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [colegioId, cursoId])

  const obtenerAñoDelCurso = (curso: any): number => {
    const attrs = curso?.attributes || curso || {}
    if (attrs.año !== undefined && attrs.año !== null) {
      return Number(attrs.año)
    }
    if (attrs.ano !== undefined && attrs.ano !== null) {
      return Number(attrs.ano)
    }
    return new Date().getFullYear()
  }

  const handleExportarMateriales = async () => {
    if (!curso) return

    const attrs = curso.attributes || curso
    const materialesDirectos = attrs.materiales || []
    const materialesLista = attrs.lista_utiles?.data?.attributes?.materiales || 
                           attrs.lista_utiles?.attributes?.materiales || 
                           attrs.lista_utiles?.materiales || []
    const materiales = [...materialesDirectos, ...(Array.isArray(materialesLista) ? materialesLista : [])]

    if (materiales.length === 0) {
      alert('No hay materiales para exportar')
      return
    }

    try {
      const materialesFormateados = materiales.map((m: any) => ({
        material_nombre: m.material_nombre || 'Sin nombre',
        tipo: (m.tipo || 'util') as 'util' | 'libro' | 'cuaderno' | 'otro',
        cantidad: parseInt(String(m.cantidad)) || 1,
        obligatorio: m.obligatorio !== false,
        descripcion: m.descripcion || undefined,
      }))
      
      const nombreCurso = attrs.nombre_curso || attrs.curso_nombre || 'materiales_curso'
      const nombreArchivo = nombreCurso.replace(/\s+/g, '_')
      
      await exportarMaterialesAExcel(materialesFormateados, nombreArchivo)
    } catch (error: any) {
      console.error('Error al exportar materiales:', error)
      alert('Error al exportar materiales: ' + (error.message || 'Error desconocido'))
    }
  }

  if (loading) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title="Detalle del Curso" 
          subtitle="CRM > Colegios" 
        />
        <div className="text-center p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Cargando curso...</p>
        </div>
      </Container>
    )
  }

  if (error || !curso) {
    return (
      <Container fluid>
        <PageBreadcrumb 
          title="Detalle del Curso" 
          subtitle="CRM > Colegios" 
        />
        <Alert variant="danger">
          <div>
            <strong>Error:</strong> {error || 'Curso no encontrado'}
            <div className="mt-3">
              <Link href={`/crm/colegios/${colegioId}`}>
                <Button variant="outline-primary">
                  <LuArrowLeft className="me-1" />
                  Volver al Colegio
                </Button>
              </Link>
            </div>
          </div>
        </Alert>
      </Container>
    )
  }

  const attrs = curso.attributes || curso
  const materialesDirectos = attrs.materiales || []
  const materialesLista = attrs.lista_utiles?.data?.attributes?.materiales || 
                         attrs.lista_utiles?.attributes?.materiales || 
                         attrs.lista_utiles?.materiales || []
  const materiales = [...materialesDirectos, ...(Array.isArray(materialesLista) ? materialesLista : [])]
  const nombreLista = attrs.lista_utiles?.data?.attributes?.nombre || 
                     attrs.lista_utiles?.attributes?.nombre || 
                     attrs.lista_utiles?.nombre || null
  const año = obtenerAñoDelCurso(curso)

  return (
    <Container fluid>
      <PageBreadcrumb 
        title="Detalle del Curso" 
        subtitle={`CRM > Colegios > ${colegio?.colegio_nombre || 'Colegio'}`}
      />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href={`/crm/colegios/${colegioId}`}>
            <Button variant="outline-secondary" size="sm" className="mb-2">
              <LuArrowLeft className="me-1" />
              Volver al Colegio
            </Button>
          </Link>
          <h2 className="mb-0 mt-2">
            <LuGraduationCap className="me-2" />
            {attrs.nombre_curso || attrs.curso_nombre || attrs.titulo || attrs.nombre || 'Sin nombre'}
          </h2>
        </div>
        <div className="d-flex gap-2">
          {materiales.length > 0 && (
            <Button variant="outline-info" onClick={handleExportarMateriales}>
              <LuDownload className="me-1" />
              Exportar Excel
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowEditModal(true)}>
            <LuPencil className="me-1" />
            Editar Curso
          </Button>
        </div>
      </div>

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <CardHeader>
              <h5 className="mb-0">Información del Curso</h5>
            </CardHeader>
            <CardBody>
              <Table borderless className="mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold" style={{ width: '40%' }}>Nombre:</td>
                    <td>{attrs.nombre_curso || attrs.curso_nombre || attrs.titulo || attrs.nombre || 'Sin nombre'}</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Año:</td>
                    <td>
                      <Badge bg="primary">{año}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Nivel:</td>
                    <td>
                      <Badge bg="info">{attrs.nivel || '-'}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Grado:</td>
                    <td>{attrs.grado ? `${attrs.grado}°` : '-'}</td>
                  </tr>
                  {attrs.paralelo && (
                    <tr>
                      <td className="fw-semibold">Paralelo:</td>
                      <td>{attrs.paralelo}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="fw-semibold">Estado:</td>
                    <td>
                      {attrs.activo !== false ? (
                        <Badge bg="success">
                          <LuCheck className="me-1" size={14} />
                          Activo
                        </Badge>
                      ) : (
                        <Badge bg="secondary">
                          <LuX className="me-1" size={14} />
                          Inactivo
                        </Badge>
                      )}
                    </td>
                  </tr>
                  {nombreLista && (
                    <tr>
                      <td className="fw-semibold">Lista de Útiles:</td>
                      <td>
                        <Badge bg="secondary">{nombreLista}</Badge>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>

        <Col md={8}>
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <LuPackage className="me-2" />
                  Materiales ({materiales.length})
                </h5>
                {nombreLista && (
                  <Badge bg="secondary">Incluye lista predefinida</Badge>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {materiales.length === 0 ? (
                <Alert variant="info">
                  No hay materiales asignados a este curso.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '5%' }}>Cant.</th>
                        <th style={{ width: '40%' }}>Material</th>
                        <th style={{ width: '15%' }}>Tipo</th>
                        <th style={{ width: '15%' }}>Origen</th>
                        <th style={{ width: '15%' }}>Estado</th>
                        {materiales.some((m: any) => m.descripcion) && (
                          <th style={{ width: '10%' }}>Descripción</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {materiales.map((material: any, index: number) => {
                        const esDeLista = materialesLista.some((m: any) => 
                          m.material_nombre === material.material_nombre &&
                          m.cantidad === material.cantidad
                        )
                        
                        return (
                          <tr key={index}>
                            <td>
                              <Badge bg="primary">{material.cantidad || 1}</Badge>
                            </td>
                            <td className="fw-semibold">
                              {material.material_nombre || 'Sin nombre'}
                            </td>
                            <td>
                              <Badge bg="info">
                                {material.tipo === 'util' ? 'Útil Escolar' :
                                 material.tipo === 'libro' ? 'Libro' :
                                 material.tipo === 'cuaderno' ? 'Cuaderno' :
                                 material.tipo === 'otro' ? 'Otro' : 'Útil Escolar'}
                              </Badge>
                            </td>
                            <td>
                              {esDeLista ? (
                                <Badge bg="secondary">Lista Predefinida</Badge>
                              ) : (
                                <Badge bg="warning">Adicional</Badge>
                              )}
                            </td>
                            <td>
                              {material.obligatorio !== false ? (
                                <Badge bg="success">
                                  <LuCheck className="me-1" size={12} />
                                  Obligatorio
                                </Badge>
                              ) : (
                                <Badge bg="secondary">
                                  <LuX className="me-1" size={12} />
                                  Opcional
                                </Badge>
                              )}
                            </td>
                            {materiales.some((m: any) => m.descripcion) && (
                              <td>
                                <small className="text-muted">
                                  {material.descripcion || '-'}
                                </small>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <CursoModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        colegioId={colegioId}
        curso={curso}
        onSuccess={() => {
          // Recargar datos del curso
          const fetchCurso = async () => {
            try {
              const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
              const cursoResult = await cursoResponse.json()
              if (cursoResult.success && cursoResult.data) {
                setCurso(cursoResult.data)
              }
            } catch (err) {
              console.error('Error al recargar curso:', err)
            }
          }
          fetchCurso()
          setShowEditModal(false)
        }}
      />
    </Container>
  )
}
