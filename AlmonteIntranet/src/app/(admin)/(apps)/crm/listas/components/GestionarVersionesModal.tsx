'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Table, Badge, Alert, Spinner, Form } from 'react-bootstrap'
import { LuUpload, LuTrash2, LuDownload, LuEye, LuFileText, LuX } from 'react-icons/lu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface VersionMaterial {
  id: number
  pdf_id?: number | null
  pdf_url?: string | null
  nombre_archivo?: string
  fecha_subida?: string
  fecha_actualizacion?: string
  metadata?: {
    nombre?: string
    tipo?: string
    tamaño?: number
  }
  materiales?: any[]
}

interface GestionarVersionesModalProps {
  show: boolean
  onHide: () => void
  cursoId: string | number
  cursoNombre: string
  colegioNombre?: string
  onSuccess?: () => void
}

export default function GestionarVersionesModal({
  show,
  onHide,
  cursoId,
  cursoNombre,
  colegioNombre,
  onSuccess,
}: GestionarVersionesModalProps) {
  const [versiones, setVersiones] = useState<VersionMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewNombre, setPreviewNombre] = useState<string>('')

  // Cargar versiones al abrir el modal
  useEffect(() => {
    if (show && cursoId) {
      cargarVersiones()
    }
  }, [show, cursoId])

  const cargarVersiones = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/crm/cursos/${cursoId}`)
      if (!response.ok) {
        throw new Error('Error al cargar versiones')
      }
      const data = await response.json()
      
      // Extraer versiones_materiales del curso
      const versionesMateriales = data.data?.versiones_materiales || []
      
      // Ordenar por fecha de actualización (más reciente primero)
      const versionesOrdenadas = [...versionesMateriales].sort((a, b) => {
        const fechaA = a.fecha_actualizacion || a.fecha_subida || ''
        const fechaB = b.fecha_actualizacion || b.fecha_subida || ''
        return fechaB.localeCompare(fechaA)
      })
      
      setVersiones(versionesOrdenadas)
    } catch (err: any) {
      console.error('[GestionarVersionesModal] Error al cargar versiones:', err)
      setError(err.message || 'Error al cargar versiones')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Solo se permiten archivos PDF')
        return
      }
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no puede ser mayor a 10MB')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecciona un archivo PDF')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Primero, subir el PDF a Strapi
      const formData = new FormData()
      formData.append('files', selectedFile)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el PDF')
      }

      const uploadData = await uploadResponse.json()
      const uploadedFile = Array.isArray(uploadData) ? uploadData[0] : uploadData

      if (!uploadedFile?.id || !uploadedFile?.url) {
        throw new Error('No se recibió el ID o URL del archivo subido')
      }

      // Obtener versiones existentes
      const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
      if (!cursoResponse.ok) {
        throw new Error('Error al obtener curso')
      }
      const cursoData = await cursoResponse.json()
      const versionesExistentes = cursoData.data?.versiones_materiales || []

      // Crear nueva versión
      const nuevaVersion: VersionMaterial = {
        id: versionesExistentes.length > 0 
          ? Math.max(...versionesExistentes.map((v: VersionMaterial) => v.id || 0)) + 1
          : 1,
        pdf_id: uploadedFile.id,
        pdf_url: uploadedFile.url,
        nombre_archivo: selectedFile.name,
        fecha_subida: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        metadata: {
          nombre: selectedFile.name,
          tipo: selectedFile.type,
          tamaño: selectedFile.size,
        },
        materiales: [],
      }

      // Agregar nueva versión a las existentes
      const nuevasVersiones = [...versionesExistentes, nuevaVersion]

      // Actualizar curso con nuevas versiones
      const updateResponse = await fetch(`/api/crm/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versiones_materiales: nuevasVersiones,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Error al actualizar curso con nueva versión')
      }

      // Actualizar el estado local inmediatamente sin recargar la página
      setVersiones([...versiones, nuevaVersion])
      setSelectedFile(null)
      
      // Limpiar input
      const fileInput = document.getElementById('pdf-upload-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('[GestionarVersionesModal] Error al subir PDF:', err)
      setError(err.message || 'Error al subir PDF')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (version: VersionMaterial, index: number) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la versión "${version.nombre_archivo || version.metadata?.nombre || 'Sin nombre'}"? Esta acción no se puede deshacer.`)) {
      return
    }

    // Usar una combinación única para identificar la versión
    const versionUniqueId = version.id || index
    setDeleting(versionUniqueId)
    setError(null)

    try {
      // Obtener versiones existentes
      const cursoResponse = await fetch(`/api/crm/cursos/${cursoId}`)
      if (!cursoResponse.ok) {
        throw new Error('Error al obtener curso')
      }
      const cursoData = await cursoResponse.json()
      const versionesExistentes = cursoData.data?.versiones_materiales || []

      // Filtrar la versión a eliminar usando pdf_id y fecha como identificadores únicos
      const versionesActualizadas = versionesExistentes.filter((v: VersionMaterial) => {
        // Comparar por pdf_id (más confiable que id)
        if (version.pdf_id && v.pdf_id && version.pdf_id === v.pdf_id) {
          // Si tienen el mismo pdf_id, es la misma versión
          return false // Eliminar esta versión
        }
        // Si no tienen pdf_id, comparar por fecha y nombre de archivo
        const mismaFecha = (version.fecha_subida || version.fecha_actualizacion) === (v.fecha_subida || v.fecha_actualizacion)
        const mismoNombre = (version.nombre_archivo || version.metadata?.nombre) === (v.nombre_archivo || v.metadata?.nombre)
        if (mismaFecha && mismoNombre && !version.pdf_id && !v.pdf_id) {
          return false // Eliminar esta versión
        }
        // Mantener todas las demás versiones
        return true
      })

      // Actualizar curso
      const updateResponse = await fetch(`/api/crm/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versiones_materiales: versionesActualizadas,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('Error al eliminar versión')
      }

      // Actualizar el estado local inmediatamente sin recargar la página
      setVersiones(versionesActualizadas)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('[GestionarVersionesModal] Error al eliminar versión:', err)
      setError(err.message || 'Error al eliminar versión')
      // Recargar versiones en caso de error para mantener sincronización
      await cargarVersiones()
    } finally {
      setDeleting(null)
    }
  }

  const handlePreview = (url: string, nombre: string) => {
    setPreviewUrl(url)
    setPreviewNombre(nombre)
    setShowPreview(true)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
    } catch {
      return dateString
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <div>
            <div className="fw-bold">Gestionar Listas</div>
            <small className="text-muted">
              {cursoNombre}
              {colegioNombre && ` • ${colegioNombre}`}
            </small>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Sección de subida rápida */}
        <div className="mb-4 p-3 border rounded bg-light">
          <h6 className="mb-3">
            <LuUpload className="me-2" />
            Subir Nueva Lista
          </h6>
          <div className="d-flex gap-2 align-items-end">
            <div className="flex-grow-1">
              <Form.Label>Seleccionar PDF (máx. 10MB)</Form.Label>
              <Form.Control
                id="pdf-upload-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <div className="mt-2">
                  <Badge bg="info">
                    <LuFileText className="me-1" />
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </Badge>
                  <Button
                    variant="link"
                    size="sm"
                    className="ms-2 p-0"
                    onClick={() => {
                      setSelectedFile(null)
                      const fileInput = document.getElementById('pdf-upload-input') as HTMLInputElement
                      if (fileInput) fileInput.value = ''
                    }}
                  >
                    <LuX />
                  </Button>
                </div>
              )}
            </div>
            <Button
              variant="success"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <LuUpload className="me-2" />
                  Subir
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Lista de versiones */}
        <div>
          <h6 className="mb-3">
            <LuFileText className="me-2" />
            Versiones Existentes ({versiones.length})
          </h6>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <div className="mt-2 text-muted">Cargando versiones...</div>
            </div>
          ) : versiones.length === 0 ? (
            <Alert variant="info">
              No hay versiones de listas para este curso. Sube la primera lista usando el formulario de arriba.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Versión</th>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {versiones.map((version, index) => {
                    // Crear una clave única combinando múltiples campos
                    const uniqueKey = `version-${version.id || 'no-id'}-${index}-${version.fecha_subida || version.fecha_actualizacion || Date.now()}-${version.pdf_id || 'no-pdf'}`
                    return (
                    <tr key={uniqueKey}>
                      <td>
                        <Badge bg={index === 0 ? 'success' : 'secondary'}>
                          {index === 0 ? 'Más Reciente' : `Versión ${versiones.length - index}`}
                        </Badge>
                      </td>
                      <td>
                        {version.nombre_archivo || version.metadata?.nombre || 'Sin nombre'}
                      </td>
                      <td>
                        <small>
                          {formatDate(version.fecha_actualizacion || version.fecha_subida)}
                        </small>
                      </td>
                      <td>
                        <small>{formatFileSize(version.metadata?.tamaño)}</small>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {version.pdf_url && (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handlePreview(version.pdf_url!, version.nombre_archivo || version.metadata?.nombre || 'lista.pdf')}
                                title="Ver PDF"
                              >
                                <LuEye />
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = version.pdf_url!
                                  link.download = version.nombre_archivo || 'lista.pdf'
                                  link.target = '_blank'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                                title="Descargar PDF"
                              >
                                <LuDownload />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(version, index)}
                            disabled={deleting === (version.id || index)}
                            title="Eliminar versión"
                          >
                            {deleting === (version.id || index) ? (
                              <Spinner size="sm" />
                            ) : (
                              <LuTrash2 />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>

      {/* Modal de vista previa del PDF */}
      <Modal 
        show={showPreview} 
        onHide={() => {
          setShowPreview(false)
          setPreviewUrl(null)
          setPreviewNombre('')
        }} 
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <LuFileText className="me-2" />
            Vista Previa: {previewNombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: '80vh', padding: 0 }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Vista previa del PDF"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success"
            onClick={() => {
              if (previewUrl) {
                const link = document.createElement('a')
                link.href = previewUrl
                link.download = previewNombre
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }
            }}
          >
            <LuDownload className="me-2" />
            Descargar
          </Button>
          <Button variant="secondary" onClick={() => {
            setShowPreview(false)
            setPreviewUrl(null)
            setPreviewNombre('')
          }}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  )
}
