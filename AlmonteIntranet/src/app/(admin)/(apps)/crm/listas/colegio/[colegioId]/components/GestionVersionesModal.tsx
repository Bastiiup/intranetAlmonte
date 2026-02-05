'use client'

import { useState, useEffect } from 'react'
import { Modal, Table, Button, Badge, Alert, Spinner, Form } from 'react-bootstrap'
import { LuX, LuCheck, LuPencil, LuDownload, LuEye, LuFileText, LuUpload } from 'react-icons/lu'
import { useRouter } from 'next/navigation'

interface GestionVersionesModalProps {
  show: boolean
  onHide: () => void
  cursoId: string | number
  colegioId: string | number
  cursoNombre: string
}

export default function GestionVersionesModal({
  show,
  onHide,
  cursoId,
  colegioId,
  cursoNombre,
}: GestionVersionesModalProps) {
  const router = useRouter()
  const [curso, setCurso] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPDFViewer, setShowPDFViewer] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [hoveredVersion, setHoveredVersion] = useState<string | number | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (show && cursoId) {
      cargarCurso()
    }
    
    // Limpiar timeout al desmontar o cerrar el modal
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [show, cursoId])

  const cargarCurso = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/crm/cursos/${cursoId}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setCurso(data.data)
      } else {
        setError(data.error || 'Error al cargar el curso')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  const ocultarVersion = async (version: any) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ocultar esta versión?\n\n` +
      `Versión: ${version.nombre_archivo || 'Sin nombre'}\n` +
      `Fecha: ${new Date(version.fecha_subida || version.fecha_actualizacion).toLocaleDateString('es-CL')}\n\n` +
      `La versión quedará oculta pero no se eliminará.`
    )
    
    if (!confirmar) return
    
    setProcesando(version.id || 'ocultar')
    
    try {
      const versionesActualizadas = curso.versiones_materiales.map((v: any) => 
        v.id === version.id || (v.fecha_subida === version.fecha_subida && v.nombre_archivo === version.nombre_archivo)
          ? { ...v, activo: false }
          : v
      )
      
      const response = await fetch(`/api/crm/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versiones_materiales: versionesActualizadas
        })
      })
      
      if (response.ok) {
        await cargarCurso()
        router.refresh()
      } else {
        throw new Error('Error al ocultar la versión')
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setProcesando(null)
    }
  }

  const activarVersion = async (version: any) => {
    setProcesando(version.id || 'activar')
    
    try {
      const versionesActualizadas = curso.versiones_materiales.map((v: any) => 
        v.id === version.id || (v.fecha_subida === version.fecha_subida && v.nombre_archivo === version.nombre_archivo)
          ? { ...v, activo: true }
          : v
      )
      
      const response = await fetch(`/api/crm/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versiones_materiales: versionesActualizadas
        })
      })
      
      if (response.ok) {
        await cargarCurso()
        router.refresh()
      } else {
        throw new Error('Error al activar la versión')
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setProcesando(null)
    }
  }

  const reemplazarVersiones = async () => {
    if (!curso) return
    
    const versionesActivas = curso.versiones_materiales?.filter((v: any) => v.activo !== false) || []
    if (versionesActivas.length === 0) {
      alert('No hay versiones activas para reemplazar')
      return
    }
    
    const confirmar = window.confirm(
      `¿Deseas ocultar todas las versiones activas?\n\n` +
      `Versiones activas: ${versionesActivas.length}\n` +
      `La(s) versión(es) actual(es) quedarán ocultas y podrás subir una nueva versión.`
    )
    
    if (!confirmar) return
    
    setProcesando('reemplazar')
    
    try {
      const versionesActualizadas = curso.versiones_materiales.map((v: any) => 
        v.activo !== false ? { ...v, activo: false } : v
      )
      
      const response = await fetch(`/api/crm/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versiones_materiales: versionesActualizadas
        })
      })
      
      if (response.ok) {
        await cargarCurso()
        router.refresh()
        // Abrir modal de subida después de ocultar
        setShowUploadModal(true)
      } else {
        throw new Error('Error al ocultar las versiones')
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setProcesando(null)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Por favor selecciona un archivo PDF')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUploadPDF = async () => {
    if (!selectedFile || !curso) {
      alert('Por favor selecciona un archivo PDF')
      return
    }

    setUploading(true)
    
    try {
      // Crear FormData para subir el PDF
      const formData = new FormData()
      formData.append('pdf', selectedFile)
      formData.append('cursoId', String(cursoId))
      formData.append('cursoDocumentId', String(cursoId))
      
      // Subir PDF usando el endpoint de import-pdf
      const response = await fetch(`/api/crm/cursos/import-pdf`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('PDF subido exitosamente. La nueva versión se ha creado y está activa.')
        setSelectedFile(null)
        setShowUploadModal(false)
        await cargarCurso()
        router.refresh()
      } else {
        throw new Error(data.error || 'Error al subir el PDF')
      }
    } catch (error: any) {
      alert('Error al subir el PDF: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  if (!show) return null

  const versiones = curso?.versiones_materiales || []
  const versionesOrdenadas = [...versiones].sort((a: any, b: any) => {
    const fechaA = new Date(a.fecha_actualizacion || a.fecha_subida || 0).getTime()
    const fechaB = new Date(b.fecha_actualizacion || b.fecha_subida || 0).getTime()
    return fechaB - fechaA
  })

  return (
    <>
      <style jsx global>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(-20px) translateX(-10px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0) translateX(0);
            filter: blur(0);
          }
        }
        
        .pdf-preview-container {
          animation: fadeInScale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform, opacity;
        }
        
        .pdf-preview-container::before {
          content: '';
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          background: linear-gradient(135deg, rgba(13, 110, 253, 0.1), rgba(10, 88, 202, 0.1));
          border-radius: 15px;
          z-index: -1;
          opacity: 0;
          animation: fadeInScale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <Modal show={show} onHide={onHide} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <LuFileText className="me-2" />
            Gestión de Versiones - {cursoNombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando versiones...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <strong>Error:</strong> {error}
            </Alert>
          ) : versionesOrdenadas.length === 0 ? (
            <Alert variant="info" className="text-center">
              <p className="mb-2">No hay versiones de materiales subidas.</p>
            </Alert>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <Badge bg="info" className="me-2">
                    Total: {versionesOrdenadas.length} versiones
                  </Badge>
                  <Badge bg="success">
                    Activas: {versionesOrdenadas.filter((v: any) => v.activo !== false).length}
                  </Badge>
                  <Badge bg="secondary" className="ms-2">
                    Ocultas: {versionesOrdenadas.filter((v: any) => v.activo === false).length}
                  </Badge>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    title="Subir nueva versión de PDF"
                  >
                    <LuUpload className="me-1" />
                    Subir Nueva Versión
                  </Button>
                  {versionesOrdenadas.some((v: any) => v.activo !== false) && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={reemplazarVersiones}
                      disabled={procesando === 'reemplazar'}
                    >
                      {procesando === 'reemplazar' ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <LuX className="me-1" />
                          Ocultar Todas las Activas
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '30%' }}>Archivo PDF</th>
                      <th style={{ width: '15%' }}>Fecha Subida</th>
                      <th style={{ width: '15%' }}>Última Actualización</th>
                      <th style={{ width: '10%' }}>Materiales</th>
                      <th style={{ width: '10%' }}>Estado</th>
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
                      const estaProcesando = procesando === (version.id || index)
                      
                      return (
                        <tr key={version.id || index} style={{ opacity: estaActiva ? 1 : 0.6 }}>
                          <td>
                            <Badge bg={estaActiva ? "primary" : "secondary"}>{index + 1}</Badge>
                          </td>
                          <td className="fw-semibold">
                            <div
                              style={{ position: 'relative', display: 'inline-block' }}
                              onMouseEnter={(e) => {
                                if (version.pdf_id) {
                                  // Limpiar timeout anterior si existe
                                  if (hoverTimeout) {
                                    clearTimeout(hoverTimeout)
                                  }
                                  
                                  // Guardar referencia al elemento
                                  const targetElement = e.currentTarget
                                  
                                  // Pequeño delay para evitar que aparezca demasiado rápido
                                  const timeout = setTimeout(() => {
                                    // Verificar que el elemento todavía existe
                                    if (!targetElement || !document.body.contains(targetElement)) {
                                      return
                                    }
                                    
                                    try {
                                      const rect = targetElement.getBoundingClientRect()
                                      
                                      // Calcular posición óptima (al lado derecho, centrado verticalmente)
                                      let x = rect.right + 20
                                      let y = rect.top - 100 // Ajustar para centrar mejor
                                      
                                      // Asegurar que no se salga de la pantalla
                                      if (x + 600 > window.innerWidth) {
                                        x = rect.left - 620 // Mostrar a la izquierda si no cabe a la derecha
                                      }
                                      if (y + 800 > window.innerHeight) {
                                        y = window.innerHeight - 810
                                      }
                                      if (y < 10) {
                                        y = 10
                                      }
                                      
                                      setPreviewPosition({ x, y })
                                      setHoveredVersion(version.id || index)
                                    } catch (error) {
                                      console.warn('Error al calcular posición del preview:', error)
                                    }
                                  }, 300) // Delay de 300ms
                                  
                                  setHoverTimeout(timeout)
                                }
                              }}
                              onMouseLeave={() => {
                                if (hoverTimeout) {
                                  clearTimeout(hoverTimeout)
                                  setHoverTimeout(null)
                                }
                                setHoveredVersion(null)
                                setPreviewPosition(null)
                              }}
                            >
                              <LuFileText className="me-1" />
                              <span 
                                style={{ 
                                  cursor: version.pdf_id ? 'pointer' : 'default',
                                  textDecoration: version.pdf_id ? 'underline' : 'none',
                                  color: version.pdf_id ? '#0d6efd' : 'inherit'
                                }}
                              >
                                {version.nombre_archivo || version.metadata?.nombre || 'Sin nombre'}
                              </span>
                              
                              {/* Preview del PDF al hacer hover */}
                              {hoveredVersion === (version.id || index) && version.pdf_id && previewPosition && (
                                <div
                                  className="pdf-preview-container"
                                  style={{
                                    position: 'fixed',
                                    left: `${Math.min(previewPosition.x, window.innerWidth - 650)}px`,
                                    top: `${Math.max(10, Math.min(previewPosition.y, window.innerHeight - 850))}px`,
                                    width: '600px',
                                    maxHeight: '800px',
                                    height: '800px',
                                    zIndex: 10000,
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                                    border: '3px solid #0d6efd',
                                    overflow: 'hidden',
                                    animation: 'fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transformOrigin: 'top left',
                                    transition: 'all 0.3s ease',
                                  }}
                                  onMouseEnter={() => {
                                    if (hoverTimeout) {
                                      clearTimeout(hoverTimeout)
                                      setHoverTimeout(null)
                                    }
                                    setHoveredVersion(version.id || index)
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimeout) {
                                      clearTimeout(hoverTimeout)
                                      setHoverTimeout(null)
                                    }
                                    setHoveredVersion(null)
                                    setPreviewPosition(null)
                                  }}
                                >
                                  {/* Header del preview */}
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '45px',
                                    background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 20px',
                                    zIndex: 2,
                                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                      <LuFileText size={18} />
                                      <span style={{ 
                                        fontSize: '14px', 
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}>
                                        {version.nombre_archivo || 'Vista Previa PDF'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        style={{ 
                                          color: 'white', 
                                          padding: '4px 8px',
                                          minWidth: 'auto',
                                          textDecoration: 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'transparent'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const pdfUrl = `/api/crm/cursos/pdf/${version.pdf_id}`
                                          window.open(pdfUrl, '_blank')
                                        }}
                                        title="Abrir en nueva pestaña"
                                      >
                                        <LuEye size={16} />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Contenedor del PDF */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '45px',
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    overflow: 'hidden',
                                    backgroundColor: '#525252',
                                    backgroundImage: 'linear-gradient(45deg, #525252 25%, transparent 25%), linear-gradient(-45deg, #525252 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #525252 75%), linear-gradient(-45deg, transparent 75%, #525252 75%)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                  }}>
                                    <div style={{
                                      width: '100%',
                                      height: '100%',
                                      overflow: 'auto',
                                      padding: '20px',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'flex-start',
                                    }}>
                                      <iframe
                                        src={`/api/crm/cursos/pdf/${version.pdf_id}#toolbar=0&navpanes=0&scrollbar=0`}
                                        style={{
                                          width: '100%',
                                          minHeight: '100%',
                                          border: 'none',
                                          borderRadius: '4px',
                                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                                          backgroundColor: 'white',
                                        }}
                                        title="PDF Preview"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Indicador de carga */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 1,
                                    pointerEvents: 'none',
                                  }}>
                                    <Spinner animation="border" variant="light" />
                                  </div>
                                </div>
                              )}
                            </div>
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
                            {estaActiva ? (
                              <Badge bg="success">Activa</Badge>
                            ) : (
                              <Badge bg="warning" title="Versión inactiva/oculta">Oculta</Badge>
                            )}
                          </td>
                          <td>
                            <div className="d-flex justify-content-end gap-1">
                              {estaActiva ? (
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => ocultarVersion(version)}
                                  disabled={estaProcesando}
                                  title="Ocultar versión (marcar como inactiva)"
                                >
                                  {estaProcesando ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    <LuX size={14} />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => activarVersion(version)}
                                  disabled={estaProcesando}
                                  title="Activar versión"
                                >
                                  {estaProcesando ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    <LuCheck size={14} />
                                  )}
                                </Button>
                              )}
                              {version.pdf_id && (
                                <>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => {
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
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para subir nuevo PDF */}
      <Modal show={showUploadModal} onHide={() => {
        setShowUploadModal(false)
        setSelectedFile(null)
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <LuUpload className="me-2" />
            Subir Nueva Versión de PDF
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>Instrucciones:</strong>
            <ul className="mb-0 mt-2">
              <li>Selecciona un archivo PDF para subir como nueva versión</li>
              <li>La nueva versión se creará automáticamente como <strong>activa</strong></li>
              <li>Si deseas ocultar las versiones anteriores, usa el botón "Ocultar Todas las Activas" antes de subir</li>
            </ul>
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Label>Seleccionar archivo PDF</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {selectedFile && (
              <Alert variant="success" className="mt-2">
                <strong>Archivo seleccionado:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </Alert>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowUploadModal(false)
              setSelectedFile(null)
            }}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleUploadPDF}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
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

      {/* Modal para visualizar PDF */}
      {showPDFViewer && pdfViewerUrl && (
        <Modal show={showPDFViewer} onHide={() => setShowPDFViewer(false)} size="xl" fullscreen="lg-down">
          <Modal.Header closeButton>
            <Modal.Title>Visualizador de PDF</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 0, height: '80vh' }}>
            <iframe
              src={pdfViewerUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="PDF Viewer"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPDFViewer(false)}>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  )
}
