'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormLabel,
  FormControl,
  Alert,
  Row,
  Col,
} from 'react-bootstrap'
import { LuUpload, LuFileText } from 'react-icons/lu'
import Select from 'react-select'
import CrearCursoModal from './CrearCursoModal'

interface ListaType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  descripcion?: string
  activo: boolean
  pdf_id?: number | string
  pdf_url?: string
  pdf_nombre?: string
  colegio?: {
    id: number | string
    nombre: string
  }
  curso?: {
    id: number | string
    nombre: string
  }
}

interface ListaModalProps {
  show: boolean
  onHide: () => void
  lista?: ListaType | null
  onSuccess?: () => void
}

interface ColegioOption {
  value: number | string
  label: string
}

interface CursoOption {
  value: number | string
  label: string
  colegioId: number | string
}

const NIVELES = [
  { value: 'Basica', label: 'Básica' },
  { value: 'Media', label: 'Media' },
]

const GRADOS_BASICA = Array.from({ length: 8 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}° Básica`,
}))

const GRADOS_MEDIA = Array.from({ length: 4 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}° Media`,
}))

const getAñosDisponibles = () => {
  const añoActual = new Date().getFullYear()
  const años = []
  for (let i = -2; i <= 2; i++) {
    años.push({
      value: añoActual + i,
      label: String(añoActual + i),
    })
  }
  return años
}

const AÑOS_DISPONIBLES = getAñosDisponibles()

export default function ListaModal({ show, onHide, lista, onSuccess }: ListaModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [cursos, setCursos] = useState<CursoOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [showCrearCursoModal, setShowCrearCursoModal] = useState(false)
  const [selectedColegioId, setSelectedColegioId] = useState<number | string | null>(null)
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [uploadingPDF, setUploadingPDF] = useState(false)

  const [formData, setFormData] = useState({
    colegio: null as number | string | null,
    curso: null as number | string | null,
  })

  // Cargar colegios
  useEffect(() => {
    if (show) {
      loadColegios()
    }
  }, [show])

  // Cargar cursos cuando se selecciona un colegio
  useEffect(() => {
    if (show && formData.colegio) {
      loadCursos(formData.colegio)
    } else {
      setCursos([])
    }
  }, [show, formData.colegio])

  // Cargar datos de la lista si se está editando
  useEffect(() => {
    if (show) {
      if (lista) {
        setFormData({
          colegio: lista.colegio?.id || null,
          curso: lista.curso?.id || null,
        })
        setSelectedColegioId(lista.colegio?.id || null)
      } else {
        setFormData({
          colegio: null,
          curso: null,
        })
        setSelectedColegioId(null)
      }
      setSelectedPDF(null)
      setError(null)
    }
  }, [show, lista])

  const loadColegios = async () => {
    setLoadingColegios(true)
    try {
      const response = await fetch('/api/crm/colegios')
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const opciones = result.data.map((colegio: any) => ({
          value: colegio.id || colegio.documentId,
          label: colegio.colegio_nombre || colegio.nombre || 'Sin nombre',
        }))
        setColegios(opciones)
      }
    } catch (err) {
      console.error('Error al cargar colegios:', err)
    } finally {
      setLoadingColegios(false)
    }
  }

  const loadCursos = async (colegioId: number | string) => {
    if (!colegioId) return
    setLoadingCursos(true)
    try {
      const response = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const opciones = result.data.map((curso: any) => {
          const attrs = curso.attributes || curso
          const nombreCurso = attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre'
          const paralelo = attrs.paralelo ? ` ${attrs.paralelo}` : ''
          return {
            value: curso.id || curso.documentId,
            label: `${nombreCurso}${paralelo}`,
            colegioId,
          }
        })
        setCursos(opciones)
      }
    } catch (err) {
      console.error('Error al cargar cursos:', err)
    } finally {
      setLoadingCursos(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.colegio) {
        throw new Error('Debe seleccionar un colegio')
      }
      if (!formData.curso) {
        throw new Error('Debe seleccionar un curso')
      }
      if (!selectedPDF && !lista?.pdf_id) {
        throw new Error('Debe subir un PDF')
      }

      // Si estamos editando y hay un nuevo PDF, o si es nueva lista
      if (selectedPDF) {
        setUploadingPDF(true)
        try {
          // Subir PDF directamente al curso usando la API de import-pdf
          const pdfFormData = new FormData()
          pdfFormData.append('pdf', selectedPDF)
          pdfFormData.append('cursoId', String(formData.curso))
          pdfFormData.append('colegioId', String(formData.colegio))

          const uploadResponse = await fetch('/api/crm/cursos/import-pdf', {
            method: 'POST',
            body: pdfFormData,
          })

          const uploadResult = await uploadResponse.json()

          if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.error || 'Error al subir el PDF al curso')
          }

          // Éxito: el PDF se subió al curso
          if (onSuccess) {
            onSuccess()
          } else {
            window.location.reload()
          }
        } catch (err: any) {
          throw new Error('Error al subir PDF: ' + err.message)
        } finally {
          setUploadingPDF(false)
        }
      } else {
        // Si no hay PDF nuevo pero estamos editando, solo recargar
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.reload()
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la lista')
    } finally {
      setLoading(false)
    }
  }

  const handleCursoCreated = (nuevoCurso: any) => {
    // Recargar cursos y seleccionar el nuevo
    if (formData.colegio) {
      loadCursos(formData.colegio).then(() => {
        setFormData((prev) => ({
          ...prev,
          curso: nuevoCurso.id || nuevoCurso.documentId,
        }))
      })
    }
    setShowCrearCursoModal(false)
  }

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
        <ModalHeader closeButton>
          <ModalTitle>{lista ? 'Editar Lista' : 'Agregar Nueva Lista'}</ModalTitle>
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Colegio *</FormLabel>
                  <Select
                    options={colegios}
                    value={colegios.find((c) => c.value === formData.colegio)}
                    onChange={(option) => {
                      setFormData((prev) => ({
                        ...prev,
                        colegio: option?.value || null,
                        curso: null, // Resetear curso al cambiar colegio
                      }))
                      setSelectedColegioId(option?.value || null)
                    }}
                    isLoading={loadingColegios}
                    placeholder="Seleccionar colegio..."
                    isSearchable
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>Curso *</FormLabel>
                  <div className="d-flex gap-2">
                    <div className="flex-grow-1">
                      <Select
                        options={cursos}
                        value={cursos.find((c) => c.value === formData.curso)}
                        onChange={(option) =>
                          setFormData((prev) => ({
                            ...prev,
                            curso: option?.value || null,
                          }))
                        }
                        isLoading={loadingCursos}
                        placeholder={
                          !formData.colegio
                            ? 'Primero seleccione un colegio'
                            : cursos.length === 0
                            ? 'No hay cursos disponibles'
                            : 'Seleccionar curso...'
                        }
                        isDisabled={!formData.colegio || loadingCursos}
                        isSearchable
                      />
                    </div>
                    {formData.colegio && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowCrearCursoModal(true)}
                        title="Crear nuevo curso"
                      >
                        <LuFileText />
                      </Button>
                    )}
                  </div>
                  {!formData.colegio && (
                    <small className="text-muted">Seleccione un colegio para ver sus cursos disponibles</small>
                  )}
                  {formData.colegio && cursos.length === 0 && !loadingCursos && (
                    <Alert variant="info" className="mt-2 mb-0 py-2">
                      <small>No hay cursos disponibles para este colegio. Haga clic en el botón <LuFileText className="d-inline" size={14} /> para crear uno nuevo.</small>
                    </Alert>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <hr className="my-4" />

            <Row>
              <Col md={12}>
                <FormGroup className="mb-3">
                  <FormLabel>PDF de la Lista de Útiles *</FormLabel>
                  <FormControl
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const input = e.target as HTMLInputElement
                      const file = input.files?.[0]
                      if (file && file.type === 'application/pdf') {
                        setSelectedPDF(file)
                      } else {
                        alert('Por favor, seleccione un archivo PDF válido')
                        input.value = ''
                      }
                    }}
                  />
                  {selectedPDF && (
                    <div className="mt-2">
                      <Alert variant="info" className="mb-0 py-2">
                        <LuFileText className="me-2" />
                        {selectedPDF.name}
                      </Alert>
                    </div>
                  )}
                  {lista?.pdf_id && !selectedPDF && (
                    <div className="mt-2">
                      <Alert variant="success" className="mb-0 py-2">
                        <LuFileText className="me-2" />
                        PDF actual: {lista.pdf_nombre || 'documento.pdf'}
                      </Alert>
                    </div>
                  )}
                  <small className="text-muted">Suba el PDF con la lista de útiles del curso seleccionado</small>
                </FormGroup>
              </Col>
            </Row>

            <Alert variant="info" className="mt-3">
              <strong>Nota:</strong> La lista se creará automáticamente al subir el PDF al curso seleccionado. El PDF se asociará al curso y podrá ser visualizado y descargado desde esta página.
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={onHide} disabled={loading || uploadingPDF}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading || uploadingPDF || !formData.colegio || !formData.curso || !selectedPDF}>
              {uploadingPDF ? (
                <>Subiendo PDF...</>
              ) : loading ? (
                <>Guardando...</>
              ) : lista ? (
                'Actualizar'
              ) : (
                'Crear Lista'
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <CrearCursoModal
        show={showCrearCursoModal}
        onHide={() => setShowCrearCursoModal(false)}
        colegioId={formData.colegio}
        onSuccess={handleCursoCreated}
      />
    </>
  )
}
