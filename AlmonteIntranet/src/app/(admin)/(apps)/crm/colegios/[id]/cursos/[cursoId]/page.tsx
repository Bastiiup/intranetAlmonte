'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuPackage, LuGraduationCap, LuDownload, LuPencil, LuCheck, LuX } from 'react-icons/lu'
import Link from 'next/link'
import { exportarMaterialesAExcel } from '@/helpers/excel'
import { exportarMaterialesAPDF } from '@/helpers/pdf'
import CursoModal from '../../components/CursoModal'
import { LuFileText, LuUpload } from 'react-icons/lu'

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
  const [historialListas, setHistorialListas] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [showImportPDF, setShowImportPDF] = useState(false)

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
          // Cargar historial de listas de útiles
          await cargarHistorialListas(cursoResult.data)
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

  const cargarHistorialListas = async (cursoData: any) => {
    try {
      setLoadingHistorial(true)
      const attrs = cursoData.attributes || cursoData
      const nivel = attrs.nivel
      const grado = attrs.grado
      const año = obtenerAñoDelCurso(cursoData)

      if (!nivel || !grado) {
        setHistorialListas([])
        return
      }

      // Buscar todas las listas de útiles que coincidan con nivel, grado y año
      const params = new URLSearchParams({
        nivel: nivel,
        grado: String(grado),
        año: String(año),
        'populate[materiales]': 'true',
        'publicationState': 'preview',
      })

      const response = await fetch(`/api/crm/listas-utiles?${params.toString()}`)
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        // Ordenar por fecha de creación/modificación (más reciente primero)
        const listasOrdenadas = result.data
          .map((lista: any) => {
            const listaAttrs = lista.attributes || lista
            const createdAt = lista.createdAt || listaAttrs.createdAt || listaAttrs.created_at
            const updatedAt = lista.updatedAt || listaAttrs.updatedAt || listaAttrs.updated_at
            return {
              ...lista,
              fechaCreacion: createdAt ? new Date(createdAt).getTime() : 0,
              fechaActualizacion: updatedAt ? new Date(updatedAt).getTime() : 0,
            }
          })
          .sort((a: any, b: any) => {
            // Ordenar por fecha de actualización (más reciente primero), luego por creación
            const fechaA = a.fechaActualizacion || a.fechaCreacion
            const fechaB = b.fechaActualizacion || b.fechaCreacion
            return fechaB - fechaA
          })

        setHistorialListas(listasOrdenadas)
      } else {
        setHistorialListas([])
      }
    } catch (err: any) {
      console.error('Error al cargar historial de listas:', err)
      setHistorialListas([])
    } finally {
      setLoadingHistorial(false)
    }
  }

  const handleExportarMateriales = async (formato: 'excel' | 'pdf' = 'excel', listaEspecifica?: any) => {
    if (!curso) return

    const attrs = curso.attributes || curso
    let materiales: any[] = []

    if (listaEspecifica) {
      // Exportar materiales de una lista específica
      const listaAttrs = listaEspecifica.attributes || listaEspecifica
      materiales = listaAttrs.materiales || []
    } else {
      // Exportar materiales del curso actual (directos + lista actual)
      const materialesDirectos = attrs.materiales || []
      const materialesLista = attrs.lista_utiles?.data?.attributes?.materiales || 
                             attrs.lista_utiles?.attributes?.materiales || 
                             attrs.lista_utiles?.materiales || []
      materiales = [...materialesDirectos, ...(Array.isArray(materialesLista) ? materialesLista : [])]
    }

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
      const nombreLista = listaEspecifica 
        ? (listaEspecifica.attributes?.nombre || listaEspecifica.nombre || '')
        : ''
      const nombreArchivo = listaEspecifica
        ? `${nombreCurso}_${nombreLista}`.replace(/\s+/g, '_')
        : nombreCurso.replace(/\s+/g, '_')
      
      const titulo = listaEspecifica
        ? `${nombreCurso} - ${nombreLista}`
        : nombreCurso

      if (formato === 'pdf') {
        await exportarMaterialesAPDF(materialesFormateados, nombreArchivo, titulo)
      } else {
        await exportarMaterialesAExcel(materialesFormateados, nombreArchivo)
      }
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
            <>
              <Button variant="outline-info" onClick={(e) => { e.preventDefault(); handleExportarMateriales('excel'); }}>
                <LuDownload className="me-1" />
                Exportar Excel
              </Button>
              <Button variant="outline-danger" onClick={(e) => { e.preventDefault(); handleExportarMateriales('pdf'); }}>
                <LuFileText className="me-1" />
                Exportar PDF
              </Button>
            </>
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

      {/* Historial de Listas de Útiles */}
      {historialListas.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <LuPackage className="me-2" />
                Historial de Listas de Útiles ({historialListas.length})
              </h5>
              <small className="text-muted">Ordenadas de más reciente a más antigua</small>
            </div>
          </CardHeader>
          <CardBody>
            {loadingHistorial ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" variant="primary" />
                <p className="mt-2 text-muted small">Cargando historial...</p>
              </div>
            ) : (
              <div className="accordion" id="historialListasAccordion">
                {historialListas.map((lista: any, index: number) => {
                  const listaAttrs = lista.attributes || lista
                  const listaId = lista.id || lista.documentId
                  const listaMateriales = listaAttrs.materiales || []
                  const fechaCreacion = lista.createdAt || listaAttrs.createdAt || listaAttrs.created_at
                  const fechaActualizacion = lista.updatedAt || listaAttrs.updatedAt || listaAttrs.updated_at
                  const fechaMostrar = fechaActualizacion || fechaCreacion
                  const fechaFormateada = fechaMostrar
                    ? new Date(fechaMostrar).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Fecha no disponible'
                  const esListaActual = attrs.lista_utiles?.data?.id === listaId || 
                                        attrs.lista_utiles?.id === listaId ||
                                        attrs.lista_utiles?.data?.documentId === listaId ||
                                        attrs.lista_utiles?.documentId === listaId

                  return (
                    <div key={listaId || index} className="accordion-item">
                      <h2 className="accordion-header" id={`heading${index}`}>
                        <button
                          className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`}
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapse${index}`}
                          aria-expanded={index === 0}
                          aria-controls={`collapse${index}`}
                        >
                          <div className="d-flex justify-content-between align-items-center w-100 me-3">
                            <div>
                              <span className="fw-semibold">{listaAttrs.nombre || 'Sin nombre'}</span>
                              {esListaActual && (
                                <Badge bg="success" className="ms-2">Lista Actual</Badge>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <small className="text-muted">{fechaFormateada}</small>
                              <Badge bg="info">{listaMateriales.length} materiales</Badge>
                            </div>
                          </div>
                        </button>
                      </h2>
                      <div
                        id={`collapse${index}`}
                        className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                        aria-labelledby={`heading${index}`}
                        data-bs-parent="#historialListasAccordion"
                      >
                        <div className="accordion-body">
                          {listaMateriales.length > 0 ? (
                            <>
                              <div className="table-responsive mb-3">
                                <Table hover size="sm">
                                  <thead className="table-light">
                                    <tr>
                                      <th style={{ width: '8%' }}>Cant.</th>
                                      <th style={{ width: '40%' }}>Material</th>
                                      <th style={{ width: '20%' }}>Tipo</th>
                                      <th style={{ width: '15%' }}>Estado</th>
                                      <th style={{ width: '17%' }}>Descripción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {listaMateriales.map((material: any, matIndex: number) => (
                                      <tr key={matIndex}>
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
                                        <td>
                                          <small className="text-muted">
                                            {material.descripcion || '-'}
                                          </small>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </div>
                              <div className="d-flex justify-content-end gap-2">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleExportarMateriales('excel', lista)}
                                >
                                  <LuDownload className="me-1" size={14} />
                                  Exportar Excel
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleExportarMateriales('pdf', lista)}
                                >
                                  <LuFileText className="me-1" size={14} />
                                  Exportar PDF
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Alert variant="info" className="mb-0">
                              Esta lista no tiene materiales asignados.
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

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
