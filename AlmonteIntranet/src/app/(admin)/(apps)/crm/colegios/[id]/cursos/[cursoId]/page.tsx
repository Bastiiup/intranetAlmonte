'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner, Row, Col, Button, Badge, Table } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuArrowLeft, LuPackage, LuGraduationCap, LuDownload, LuPencil, LuCheck, LuX, LuFileText, LuUpload, LuEye } from 'react-icons/lu'
import Link from 'next/link'
import { exportarMaterialesAExcel } from '@/helpers/excel'
import { exportarMaterialesAPDF } from '@/helpers/pdf'
import CursoModal from '../../components/CursoModal'
import { Modal, Form } from 'react-bootstrap'

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
  const [showImportPDF, setShowImportPDF] = useState(false)
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)

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


  const handleImportarPDF = async () => {
    if (!selectedPDF) {
      alert('Por favor, selecciona un archivo PDF')
      return
    }

    if (selectedPDF.type !== 'application/pdf') {
      alert('Por favor, selecciona un archivo PDF válido')
      return
    }

    setUploadingPDF(true)
    try {
      const formData = new FormData()
      formData.append('pdf', selectedPDF)
      formData.append('cursoId', cursoId)
      formData.append('colegioId', colegioId)

      const response = await fetch('/api/crm/cursos/import-pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alert('PDF subido correctamente. ' + (result.message || ''))
        setShowImportPDF(false)
        setSelectedPDF(null)
        // Recargar datos del curso si es necesario
        if (result.data) {
          const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
          const cursoResult = await cursoResponse.json()
          if (cursoResult.success && cursoResult.data) {
            setCurso(cursoResult.data)
          }
        }
      } else {
        alert('Error al subir PDF: ' + (result.error || 'Error desconocido'))
      }
    } catch (error: any) {
      console.error('Error al importar PDF:', error)
      alert('Error al importar PDF: ' + (error.message || 'Error desconocido'))
    } finally {
      setUploadingPDF(false)
    }
  }

  const handleExportarMateriales = async (formato: 'excel' | 'pdf' = 'excel', version?: any) => {
    if (!curso) return

    const attrs = curso.attributes || curso
    let materiales: any[] = []

    if (version) {
      // Exportar materiales de una versión específica
      materiales = version.materiales || []
    } else {
      // Si no hay versión específica, usar la más reciente
      const versiones = attrs.versiones_materiales || []
      if (versiones.length > 0) {
        const versionMasReciente = versiones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
          const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
          return fechaB - fechaA
        })[0]
        materiales = versionMasReciente.materiales || []
      }
    }

    if (materiales.length === 0) {
      alert('No hay materiales para exportar en esta versión')
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
      const nombreVersion = version?.nombre_archivo || version?.metadata?.nombre || ''
      const nombreArchivo = version
        ? `${nombreCurso}_${nombreVersion.replace('.pdf', '')}`.replace(/\s+/g, '_')
        : nombreCurso.replace(/\s+/g, '_')
      
      const titulo = version
        ? `${nombreCurso} - ${nombreVersion}`
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
  const año = obtenerAñoDelCurso(curso)
  
  // Obtener versiones de materiales (cada PDF subido es una versión)
  const versionesMateriales = attrs.versiones_materiales || []
  
  // Ordenar versiones por fecha (más reciente primero)
  const versionesOrdenadas = [...versionesMateriales].sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })

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
                  Versiones de Materiales ({versionesOrdenadas.length})
                </h5>
                <Button variant="outline-success" size="sm" onClick={() => setShowImportPDF(true)}>
                  <LuUpload className="me-1" />
                  Subir PDF
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {versionesOrdenadas.length === 0 ? (
                <Alert variant="info" className="text-center">
                  <p className="mb-2">No hay versiones de materiales subidas.</p>
                  <Button variant="success" onClick={() => setShowImportPDF(true)}>
                    <LuUpload className="me-1" />
                    Subir Primer PDF
                  </Button>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '30%' }}>Archivo PDF</th>
                        <th style={{ width: '20%' }}>Fecha Subida</th>
                        <th style={{ width: '20%' }}>Última Actualización</th>
                        <th style={{ width: '10%' }}>Materiales</th>
                        <th style={{ width: '15%' }} className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionesOrdenadas.map((version: any, index: number) => {
                        const fechaSubida = version.fecha_subida 
                          ? new Date(version.fecha_subida).toLocaleString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Fecha no disponible'
                        const fechaActualizacion = version.fecha_actualizacion 
                          ? new Date(version.fecha_actualizacion).toLocaleString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : fechaSubida
                        const materialesVersion = version.materiales || []
                        const estaActiva = version.activo !== false
                        
                        return (
                          <tr key={version.id || index} style={{ opacity: estaActiva ? 1 : 0.6 }}>
                            <td>
                              <Badge bg={estaActiva ? "primary" : "secondary"}>{index + 1}</Badge>
                              {!estaActiva && (
                                <Badge bg="warning" className="ms-1" title="Versión inactiva/oculta">Oculta</Badge>
                              )}
                            </td>
                            <td className="fw-semibold">
                              <LuFileText className="me-1" />
                              {version.nombre_archivo || version.metadata?.nombre || 'Sin nombre'}
                            </td>
                            <td>
                              <small className="text-muted">{fechaSubida}</small>
                            </td>
                            <td>
                              <small className="text-muted">{fechaActualizacion}</small>
                            </td>
                            <td>
                              <Badge bg="info">{materialesVersion.length} materiales</Badge>
                            </td>
                            <td>
                              <div className="d-flex justify-content-end gap-2">
                                {estaActiva ? (
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    onClick={async () => {
                                      const confirmar = window.confirm(
                                        `¿Estás seguro de que deseas ocultar esta versión?\n\n` +
                                        `Versión: ${version.nombre_archivo || 'Sin nombre'}\n` +
                                        `Fecha: ${fechaSubida}\n\n` +
                                        `La versión quedará oculta pero no se eliminará.`
                                      )
                                      if (!confirmar) return
                                      
                                      try {
                                        const response = await fetch(`/api/crm/cursos/${cursoId}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            versiones_materiales: curso.versiones_materiales.map((v: any) => 
                                              v.id === version.id || (v.fecha_subida === version.fecha_subida && v.nombre_archivo === version.nombre_archivo)
                                                ? { ...v, activo: false }
                                                : v
                                            )
                                          })
                                        })
                                        
                                        if (response.ok) {
                                          alert('Versión ocultada correctamente')
                                          router.refresh()
                                        } else {
                                          throw new Error('Error al ocultar la versión')
                                        }
                                      } catch (error: any) {
                                        alert('Error: ' + error.message)
                                      }
                                    }}
                                    title="Ocultar versión (marcar como inactiva)"
                                  >
                                    <LuX size={14} />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/crm/cursos/${cursoId}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            versiones_materiales: curso.versiones_materiales.map((v: any) => 
                                              v.id === version.id || (v.fecha_subida === version.fecha_subida && v.nombre_archivo === version.nombre_archivo)
                                                ? { ...v, activo: true }
                                                : v
                                            )
                                          })
                                        })
                                        
                                        if (response.ok) {
                                          alert('Versión activada correctamente')
                                          router.refresh()
                                        } else {
                                          throw new Error('Error al activar la versión')
                                        }
                                      } catch (error: any) {
                                        alert('Error: ' + error.message)
                                      }
                                    }}
                                    title="Activar versión"
                                  >
                                    <LuCheck size={14} />
                                  </Button>
                                )}
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Abrir modal de edición para esta versión
                                    alert('Funcionalidad de edición próximamente')
                                  }}
                                  title="Editar versión"
                                >
                                  <LuPencil size={14} />
                                </Button>
                                {/* Botones para PDF original */}
                                {version.pdf_id && (
                                  <>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => {
                                        // Descargar PDF original usando API proxy
                                        const pdfUrl = `/api/crm/cursos/pdf/${version.pdf_id}`
                                        const link = document.createElement('a')
                                        link.href = pdfUrl
                                        link.download = version.nombre_archivo || 'documento.pdf'
                                        link.target = '_blank'
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                      }}
                                      title="Descargar PDF original"
                                    >
                                      <LuDownload size={14} />
                                    </Button>
                                    <Button
                                      variant="outline-info"
                                      size="sm"
                                      onClick={() => {
                                        // Usar API proxy para visualizar PDF
                                        const pdfUrl = `/api/crm/cursos/pdf/${version.pdf_id}`
                                        setPdfViewerUrl(pdfUrl)
                                        setShowPDFViewer(true)
                                      }}
                                      title="Visualizar PDF"
                                    >
                                      <LuEye size={14} />
                                    </Button>
                                  </>
                                )}
                                {/* Botones para exportar materiales */}
                                {materialesVersion.length > 0 && (
                                  <>
                                    <Button
                                      variant="outline-info"
                                      size="sm"
                                      onClick={() => handleExportarMateriales('excel', { materiales: materialesVersion, nombre: version.nombre_archivo })}
                                      title="Exportar Excel de materiales"
                                    >
                                      <LuFileText size={14} />
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleExportarMateriales('pdf', { materiales: materialesVersion, nombre: version.nombre_archivo })}
                                      title="Exportar PDF de materiales"
                                    >
                                      <LuFileText size={14} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
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

      {/* Modal para visualizar PDF */}
      <Modal show={showPDFViewer} onHide={() => { setShowPDFViewer(false); setPdfViewerUrl(null); }} size="xl" fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title>
            <LuEye className="me-2" />
            Visualizar PDF
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, height: '80vh' }}>
          {pdfViewerUrl && (
            <iframe
              src={pdfViewerUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="PDF Viewer"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowPDFViewer(false); setPdfViewerUrl(null); }}>
            Cerrar
          </Button>
          {pdfViewerUrl && (
            <Button
              variant="primary"
              onClick={() => {
                const link = document.createElement('a')
                link.href = pdfViewerUrl
                link.download = pdfViewerUrl.split('/').pop() || 'documento.pdf'
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              <LuDownload className="me-1" />
              Descargar PDF
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Modal para importar PDF */}
      <Modal show={showImportPDF} onHide={() => { setShowImportPDF(false); setSelectedPDF(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <LuUpload className="me-2" />
            Importar PDF de Lista de Útiles
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Seleccionar archivo PDF</Form.Label>
              <Form.Control
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    setSelectedPDF(file)
                  }
                }}
                disabled={uploadingPDF}
              />
              <Form.Text className="text-muted">
                Selecciona un archivo PDF con la lista de útiles. El archivo se subirá y se procesará.
              </Form.Text>
            </Form.Group>
            {selectedPDF && (
              <Alert variant="info">
                <strong>Archivo seleccionado:</strong> {selectedPDF.name} ({(selectedPDF.size / 1024).toFixed(2)} KB)
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowImportPDF(false); setSelectedPDF(null); }} disabled={uploadingPDF}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleImportarPDF} disabled={!selectedPDF || uploadingPDF}>
            {uploadingPDF ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Subiendo...
              </>
            ) : (
              <>
                <LuUpload className="me-1" />
                Subir PDF
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
