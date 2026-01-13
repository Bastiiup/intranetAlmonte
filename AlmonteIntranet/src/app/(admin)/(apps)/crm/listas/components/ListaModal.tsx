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
    nombre: '',
    nivel: 'Basica' as 'Basica' | 'Media',
    grado: 1,
    año: new Date().getFullYear(),
    descripcion: '',
    activo: true,
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
          nombre: lista.nombre || '',
          nivel: lista.nivel || 'Basica',
          grado: lista.grado || 1,
          año: lista.año || new Date().getFullYear(),
          descripcion: lista.descripcion || '',
          activo: lista.activo !== false,
          colegio: lista.colegio?.id || null,
          curso: lista.curso?.id || null,
        })
        setSelectedColegioId(lista.colegio?.id || null)
      } else {
        setFormData({
          nombre: '',
          nivel: 'Basica',
          grado: 1,
          año: new Date().getFullYear(),
          descripcion: '',
          activo: true,
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
          return {
            value: curso.id || curso.documentId,
            label: attrs.nombre_curso || attrs.curso_nombre || 'Sin nombre',
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

  const gradosDisponibles = useMemo(() => {
    if (formData.nivel === 'Basica') {
      return GRADOS_BASICA
    } else if (formData.nivel === 'Media') {
      return GRADOS_MEDIA
    }
    return []
  }, [formData.nivel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es obligatorio')
      }
      if (!formData.nivel || !formData.grado) {
        throw new Error('El nivel y grado son obligatorios')
      }
      if (!formData.colegio) {
        throw new Error('Debe seleccionar un colegio')
      }
      if (!formData.curso) {
        throw new Error('Debe seleccionar un curso')
      }

      // Primero subir PDF si hay uno seleccionado
      let pdfId: number | string | undefined = lista?.pdf_id

      if (selectedPDF) {
        setUploadingPDF(true)
        try {
          const pdfFormData = new FormData()
          pdfFormData.append('files', selectedPDF)

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: pdfFormData,
          })

          if (!uploadResponse.ok) {
            throw new Error('Error al subir el PDF')
          }

          const uploadResult = await uploadResponse.json()
          if (Array.isArray(uploadResult) && uploadResult.length > 0) {
            pdfId = uploadResult[0].id || uploadResult[0].documentId
          } else if (uploadResult.id || uploadResult.documentId) {
            pdfId = uploadResult.id || uploadResult.documentId
          } else {
            throw new Error('No se pudo obtener el ID del PDF subido')
          }
        } catch (err: any) {
          throw new Error('Error al subir PDF: ' + err.message)
        } finally {
          setUploadingPDF(false)
        }
      }

      // Crear o actualizar la lista
      const url = lista
        ? `/api/crm/listas-utiles/${lista.id || lista.documentId}`
        : '/api/crm/listas-utiles'

      const method = lista ? 'PUT' : 'POST'

      const payload: any = {
        nombre: formData.nombre.trim(),
        nivel: formData.nivel,
        grado: formData.grado,
        año: formData.año,
        descripcion: formData.descripcion || null,
        activo: formData.activo,
        colegio: formData.colegio,
        curso: formData.curso,
      }

      if (pdfId) {
        payload.pdf = pdfId
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          window.location.reload()
        }
      } else {
        throw new Error(result.error || 'Error al guardar la lista')
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
          <ModalTitle>{lista ? 'Editar Lista' : 'Crear Nueva Lista'}</ModalTitle>
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            {error && <Alert variant="danger">{error}</Alert>}

            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Nombre de la Lista *</FormLabel>
                  <FormControl
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                    required
                    placeholder="Ej: Lista de Útiles 1° Básica 2024"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Nivel *</FormLabel>
                  <Select
                    options={NIVELES}
                    value={NIVELES.find((n) => n.value === formData.nivel)}
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        nivel: (option?.value as 'Basica' | 'Media') || 'Basica',
                        grado: 1, // Resetear grado
                      }))
                    }
                    isSearchable={false}
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Grado *</FormLabel>
                  <Select
                    options={gradosDisponibles}
                    value={gradosDisponibles.find((g) => g.value === formData.grado)}
                    onChange={(option) =>
                      setFormData((prev) => ({ ...prev, grado: option?.value || 1 }))
                    }
                    isSearchable={false}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Año *</FormLabel>
                  <Select
                    options={AÑOS_DISPONIBLES}
                    value={AÑOS_DISPONIBLES.find((a) => a.value === formData.año)}
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        año: option?.value || new Date().getFullYear(),
                      }))
                    }
                    isSearchable={false}
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
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
              <Col md={6}>
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
                </FormGroup>
              </Col>
            </Row>

            <FormGroup className="mb-3">
              <FormLabel>Descripción</FormLabel>
              <FormControl
                as="textarea"
                rows={3}
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Descripción opcional de la lista..."
              />
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>PDF de la Lista</FormLabel>
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
            </FormGroup>

            <FormGroup className="mb-3">
              <Form.Check
                type="switch"
                label="Lista activa"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, activo: e.target.checked }))
                }
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onHide} disabled={loading || uploadingPDF}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading || uploadingPDF}>
              {uploadingPDF ? (
                <>Subiendo PDF...</>
              ) : loading ? (
                <>Guardando...</>
              ) : lista ? (
                'Actualizar'
              ) : (
                'Crear'
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
