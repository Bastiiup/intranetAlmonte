'use client'

import { useState, useCallback } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner,
  ProgressBar,
  Table,
  Badge,
} from 'react-bootstrap'
import { LuUpload, LuFileSpreadsheet, LuCheck, LuX, LuInfo } from 'react-icons/lu'
import { useDropzone } from 'react-dropzone'

interface ImportarNivelesAsignaturasModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
}

interface ImportResult {
  rbd: string
  colegioId?: number
  año: number
  cursosCreados: number
  cursosActualizados: number
  errores: string[]
}

export default function ImportarNivelesAsignaturasModal({
  show,
  onHide,
  onSuccess,
}: ImportarNivelesAsignaturasModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<ImportResult[]>([])
  const [resumen, setResumen] = useState<{
    totalColegios: number
    totalCursosCreados: number
    totalCursosActualizados: number
    totalErrores: number
  } | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setError(null)
    setLoading(true)
    setResultados([])
    setResumen(null)

    try {
      // Validar tipo de archivo
      const allowedExtensions = ['.xlsx', '.xls', '.csv']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('Tipo de archivo no válido. Se aceptan: .xlsx, .xls, .csv')
      }

      // Validar tamaño (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Tamaño máximo: 10MB')
      }

      // Crear FormData y enviar a la API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/crm/colegios/import-niveles-asignaturas', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar el archivo')
      }

      if (result.data) {
        setResultados(result.data.resultados || [])
        setResumen(result.data.resumen || null)
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 1000)
        }
      }
    } catch (err: any) {
      console.error('Error al importar archivo:', err)
      setError(err.message || 'Error al procesar el archivo')
      setResultados([])
      setResumen(null)
    } finally {
      setLoading(false)
    }
  }, [onSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setResultados([])
      setResumen(null)
      onHide()
    }
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>
          <div className="d-flex align-items-center gap-2">
            <LuFileSpreadsheet />
            <span>Importar Niveles y Asignaturas</span>
          </div>
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {!resumen && (
          <>
            <Alert variant="info" className="mb-3">
              <div className="d-flex align-items-start gap-2">
                <LuInfo size={20} className="mt-1" />
                <div>
                  <strong>Formato del archivo CSV/Excel:</strong>
                  <ul className="mb-0 mt-2">
                    <li><strong>AÑO</strong> o <strong>AGNO</strong>: Año de los datos (ej: 2022)</li>
                    <li><strong>RBD</strong>: RBD del colegio (conector con content type Colegios)</li>
                    <li><strong>NIVEL</strong>: Nombre del nivel (ej: "1° Básico", "7° Básico", "I Medio")</li>
                    <li><strong>ID_NIVEL</strong>: Código numérico del nivel según MINEDUC:
                      <ul>
                        <li>4-7: 1° a 4° Básico (Primer Ciclo)</li>
                        <li>8-11: 5° a 8° Básico (Segundo Ciclo)</li>
                        <li>12-15: I a IV Medio</li>
                      </ul>
                    </li>
                    <li><strong>EDUCACIÓN</strong> o <strong>ENS_BAS_MED</strong>: Tipo de enseñanza (Básica, Media)</li>
                    <li><strong>CICLO</strong>: Ciclo educativo (Primer Ciclo Educación Básica, Segundo Ciclo Educación Básica, Educación Media)</li>
                    <li><strong>Asignatura</strong> o <strong>nom_subsector</strong>: Nombre de la asignatura (opcional)</li>
                    <li><strong>Cantidad_Alumnos</strong>: Cantidad de alumnos (opcional)</li>
                  </ul>
                </div>
              </div>
            </Alert>

            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <div
              {...getRootProps()}
              className={`border rounded p-5 text-center ${
                isDragActive ? 'border-primary bg-primary-subtle' : 'border-dashed'
              }`}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <input {...getInputProps()} />
              {loading ? (
                <div>
                  <Spinner animation="border" className="mb-3" />
                  <p className="mb-0">Procesando archivo...</p>
                </div>
              ) : (
                <div>
                  <LuUpload size={48} className="text-muted mb-3" />
                  <p className="mb-2">
                    {isDragActive
                      ? 'Suelta el archivo aquí'
                      : 'Arrastra un archivo CSV/Excel aquí o haz clic para seleccionar'}
                  </p>
                  <small className="text-muted">
                    Formatos aceptados: .xlsx, .xls, .csv (máx. 10MB)
                  </small>
                </div>
              )}
            </div>
          </>
        )}

        {resumen && (
          <>
            <Alert variant="success" className="mb-3">
              <h6 className="mb-2">✅ Importación completada</h6>
              <div className="d-flex gap-3 flex-wrap">
                <div>
                  <strong>Colegios procesados:</strong> {resumen.totalColegios}
                </div>
                <div>
                  <strong>Cursos creados:</strong>{' '}
                  <Badge bg="success">{resumen.totalCursosCreados}</Badge>
                </div>
                <div>
                  <strong>Cursos actualizados:</strong>{' '}
                  <Badge bg="info">{resumen.totalCursosActualizados}</Badge>
                </div>
                {resumen.totalErrores > 0 && (
                  <div>
                    <strong>Errores:</strong> <Badge bg="danger">{resumen.totalErrores}</Badge>
                  </div>
                )}
              </div>
            </Alert>

            {resultados.length > 0 && (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>RBD</th>
                      <th>Año</th>
                      <th>Creados</th>
                      <th>Actualizados</th>
                      <th>Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, index) => (
                      <tr key={index}>
                        <td>{resultado.rbd}</td>
                        <td>{resultado.año}</td>
                        <td>
                          {resultado.cursosCreados > 0 ? (
                            <Badge bg="success">{resultado.cursosCreados}</Badge>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {resultado.cursosActualizados > 0 ? (
                            <Badge bg="info">{resultado.cursosActualizados}</Badge>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {resultado.errores.length > 0 ? (
                            <div>
                              <Badge bg="danger">{resultado.errores.length}</Badge>
                              <small className="d-block text-muted mt-1">
                                {resultado.errores[0]}
                                {resultado.errores.length > 1 && ` (+${resultado.errores.length - 1} más)`}
                              </small>
                            </div>
                          ) : (
                            <LuCheck className="text-success" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          {resumen ? 'Cerrar' : 'Cancelar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
