'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col, Collapse, Badge } from 'react-bootstrap'
import { LuPlus, LuTrash2, LuChevronDown, LuChevronUp } from 'react-icons/lu'
import Select from 'react-select'

interface Material {
  material_nombre: string
  tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
  cantidad: number
  obligatorio: boolean
  descripcion?: string
}

interface CursoData {
  nombre_curso: string // Campo readonly, auto-generado
  nivel: string // 'Basica' | 'Media'
  grado: string // '1' a '8' para Básica, '1' a '4' para Media
  paralelo?: string // 'A', 'B', 'C', etc. (opcional)
  año: number | string // Año del curso (ej: 2024, 2025)
  activo: boolean
  lista_utiles?: number | null // ID de la lista de útiles predefinida (opcional)
  materiales_adicionales: Material[] // Materiales adicionales fuera de la lista
}

interface CursoModalProps {
  show: boolean
  onHide: () => void
  colegioId: string
  curso?: any // Curso existente para editar
  onSuccess?: () => void
}

const TIPOS_MATERIAL = [
  { value: 'util', label: 'Útil Escolar' },
  { value: 'libro', label: 'Libro' },
  { value: 'cuaderno', label: 'Cuaderno' },
  { value: 'otro', label: 'Otro' },
]

const NIVELES = [
  { value: 'Basica', label: 'Básica' },
  { value: 'Media', label: 'Media' },
]

const GRADOS_BASICA = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}° Básica`,
}))

const GRADOS_MEDIA = Array.from({ length: 4 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}° Media`,
}))

const PARALELOS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
]

// Generar años disponibles (año actual y 2 años anteriores/posteriores)
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

interface ListaUtilesOption {
  value: number
  label: string
  cantidadMateriales?: number
}

export default function CursoModal({ show, onHide, colegioId, curso, onSuccess }: CursoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listasUtiles, setListasUtiles] = useState<ListaUtilesOption[]>([])
  const [loadingListas, setLoadingListas] = useState(false)
  const [showMaterialesAdicionales, setShowMaterialesAdicionales] = useState(false)
  
  const [formData, setFormData] = useState<CursoData>({
    nombre_curso: '',
    nivel: '',
    grado: '',
    paralelo: '',
    año: new Date().getFullYear(), // Año actual por defecto
    activo: true,
    lista_utiles: null,
    materiales_adicionales: [],
  })

  // Grados disponibles según el nivel seleccionado
  const gradosDisponibles = useMemo(() => {
    if (formData.nivel === 'Basica') {
      return GRADOS_BASICA
    } else if (formData.nivel === 'Media') {
      return GRADOS_MEDIA
    }
    return []
  }, [formData.nivel])

  // Generar nombre_curso automáticamente
  const nombreCursoGenerado = useMemo(() => {
    if (!formData.nivel || !formData.grado) {
      return ''
    }
    const nivelLabel = NIVELES.find(n => n.value === formData.nivel)?.label || formData.nivel
    const gradoText = `${formData.grado}°`
    const paraleloText = formData.paralelo ? ` ${formData.paralelo}` : ''
    return `${gradoText} ${nivelLabel}${paraleloText}`
  }, [formData.nivel, formData.grado, formData.paralelo])


  const loadListasUtiles = async (nivelFilter?: string, gradoFilter?: string, añoFilter?: number | string) => {
    setLoadingListas(true)
    try {
      // Filtrar por nivel, grado y año si están seleccionados
      const params = new URLSearchParams()
      const nivelParam = nivelFilter || formData.nivel
      const gradoParam = gradoFilter || formData.grado
      const añoParam = añoFilter || formData.año
      
      if (nivelParam) {
        params.append('nivel', nivelParam)
      }
      if (gradoParam) {
        params.append('grado', gradoParam)
      }
      if (añoParam) {
        params.append('año', String(añoParam))
      }
      params.append('activo', 'true') // Solo listas activas

      const queryString = params.toString()
      const url = `/api/crm/listas-utiles${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const opciones = result.data.map((lista: any) => {
          const attrs = lista.attributes || lista
          const materiales = attrs.materiales || []
          return {
            value: lista.id || lista.documentId,
            label: `${attrs.nombre} (${materiales.length} materiales)`,
            cantidadMateriales: materiales.length,
          }
        })
        setListasUtiles(opciones)
      } else {
        setListasUtiles([])
      }
    } catch (err) {
      console.error('Error al cargar listas de útiles:', err)
      setListasUtiles([])
    } finally {
      setLoadingListas(false)
    }
  }

  // Cargar listas cuando se abre el modal o cuando cambian nivel/grado/año
  useEffect(() => {
    if (show) {
      loadListasUtiles(formData.nivel, formData.grado, formData.año)
    }
  }, [show, formData.nivel, formData.grado, formData.año])

  // Cargar datos del curso si se está editando
  useEffect(() => {
    if (show) {
      if (curso) {
        const attrs = curso.attributes || curso
        // Parsear nombre_curso para extraer nivel, grado y paralelo si es posible
        const nombreCompleto = attrs.nombre_curso || attrs.curso_nombre || attrs.titulo || attrs.nombre || ''
        
        // Intentar parsear nombre_curso para obtener nivel, grado, paralelo
        let nivel = attrs.nivel || ''
        let grado = attrs.grado || ''
        let paralelo = attrs.paralelo || ''
        
        // Si no hay nivel/grado en attrs, intentar parsear del nombre
        if (!nivel || !grado) {
          const match = nombreCompleto.match(/(\d+)°\s*(Básica|Media|Basica)\s*([A-F])?/i)
          if (match) {
            grado = grado || match[1] || ''
            nivel = nivel || (match[2] === 'Básica' || match[2] === 'Basica' ? 'Basica' : match[2] === 'Media' ? 'Media' : '')
            paralelo = paralelo || match[3] || ''
          }
        }
        
        setFormData({
          nombre_curso: nombreCompleto,
          nivel: nivel || '',
          grado: grado || '',
          paralelo: paralelo || '',
          año: attrs.año || attrs.ano || new Date().getFullYear(), // Año del curso
          activo: attrs.activo !== false,
          lista_utiles: attrs.lista_utiles?.data?.id || attrs.lista_utiles?.id || attrs.lista_utiles || null,
          materiales_adicionales: (attrs.materiales || []).map((m: any) => ({
            material_nombre: m.material_nombre || '',
            tipo: m.tipo || 'util',
            cantidad: m.cantidad || 1,
            obligatorio: m.obligatorio !== false,
            descripcion: m.descripcion || '',
          })),
        })
        
        // Si hay lista_utiles, mostrar materiales adicionales como colapsable
        if (attrs.lista_utiles) {
          setShowMaterialesAdicionales(attrs.materiales && attrs.materiales.length > 0)
        }
      } else {
        // Resetear formulario para nuevo curso
        setFormData({
          nombre_curso: '',
          nivel: '',
          grado: '',
          paralelo: '',
          año: new Date().getFullYear(), // Año actual por defecto
          activo: true,
          lista_utiles: null,
          materiales_adicionales: [],
        })
      }
      setError(null)
    }
  }, [show, curso])

  const handleFieldChange = (field: keyof CursoData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMaterialChange = (index: number, field: keyof Material, value: any) => {
    setFormData((prev) => ({
      ...prev,
      materiales_adicionales: prev.materiales_adicionales.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }))
  }

  const handleAddMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materiales_adicionales: [
        ...prev.materiales_adicionales,
        {
          material_nombre: '',
          tipo: 'util',
          cantidad: 1,
          obligatorio: true,
          descripcion: '',
        },
      ],
    }))
    setShowMaterialesAdicionales(true)
  }

  // Función de importar materiales eliminada - los materiales ahora se gestionan mediante PDFs

  // Función de exportar eliminada - los materiales ahora se gestionan mediante PDFs
  // La exportación se realiza desde la página de detalle del curso

  const handleRemoveMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materiales_adicionales: prev.materiales_adicionales.filter((_, i) => i !== index),
    }))
  }

  const handleNivelChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      nivel: value,
      grado: '', // Resetear grado al cambiar nivel
      lista_utiles: null, // Resetear lista al cambiar nivel
    }))
  }

  const handleListaUtilesChange = (option: ListaUtilesOption | null) => {
    setFormData((prev) => ({
      ...prev,
      lista_utiles: option?.value || null,
    }))
    // Los materiales ahora se gestionan mediante PDFs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nivel || !formData.grado) {
        throw new Error('El nivel y grado son obligatorios')
      }

      // Validar que no exista otro curso con mismo nivel+grado+paralelo+año en el mismo colegio
      if (!curso) {
        // Solo validar duplicados al crear (no al editar)
        const checkResponse = await fetch(`/api/crm/colegios/${colegioId}/cursos`)
        const checkResult = await checkResponse.json()
        if (checkResult.success && Array.isArray(checkResult.data)) {
          const existe = checkResult.data.some((c: any) => {
            const attrs = c.attributes || c
            const añoCurso = attrs.año || attrs.ano || new Date().getFullYear()
            return (
              attrs.nivel === formData.nivel &&
              attrs.grado === formData.grado &&
              (attrs.paralelo || '') === (formData.paralelo || '') &&
              String(añoCurso) === String(formData.año)
            )
          })
          if (existe) {
            throw new Error(`Ya existe un curso con ${nombreCursoGenerado} para el año ${formData.año} en este colegio`)
          }
        }
      }

      // Los materiales ahora se gestionan mediante PDFs, no se validan aquí

      const url = curso
        ? `/api/crm/cursos/${curso.documentId || curso.id}`
        : `/api/crm/colegios/${colegioId}/cursos`

      const method = curso ? 'PUT' : 'POST'

      const payload: any = {
        nombre_curso: nombreCursoGenerado, // Campo generado automáticamente
        nivel: formData.nivel,
        grado: formData.grado,
        año: formData.año, // Año del curso
        activo: formData.activo,
      }

      // Agregar paralelo si está seleccionado
      if (formData.paralelo) {
        payload.paralelo = formData.paralelo
      }

      // Agregar relación lista_utiles si está seleccionada
      if (formData.lista_utiles) {
        payload.lista_utiles = formData.lista_utiles
      }

      // Agregar materiales adicionales si existen
      if (formData.materiales_adicionales.length > 0) {
        payload.materiales = formData.materiales_adicionales.filter((m) => m.material_nombre.trim())
      } else if (!formData.lista_utiles) {
        // Si no hay lista_utiles ni materiales adicionales, enviar array vacío para mantener compatibilidad
        payload.materiales = []
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al guardar el curso')
      }

      // Cerrar modal y ejecutar callback
      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al guardar curso:', err)
      setError(err.message || 'Error al guardar el curso')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!curso) return

    if (!confirm('¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/crm/cursos/${curso.documentId || curso.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al eliminar el curso')
      }

      // Cerrar modal y ejecutar callback
      onHide()
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 100)
      }
    } catch (err: any) {
      console.error('Error al eliminar curso:', err)
      setError(err.message || 'Error al eliminar el curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle>{curso ? 'Editar Curso' : 'Agregar Curso'}</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Nivel *</FormLabel>
                <Select
                  options={NIVELES}
                  value={NIVELES.find(n => n.value === formData.nivel) || null}
                  onChange={(option) => handleNivelChange(option?.value || '')}
                  placeholder="Seleccionar nivel"
                  isSearchable={false}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-3">
                <FormLabel>Grado *</FormLabel>
                <Select
                  options={gradosDisponibles}
                  value={gradosDisponibles.find(g => g.value === formData.grado) || null}
                  onChange={(option) => handleFieldChange('grado', option?.value || '')}
                  placeholder="Seleccionar grado"
                  isDisabled={!formData.nivel}
                  isSearchable={false}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-3">
                <FormLabel>Paralelo (opcional)</FormLabel>
                <Select
                  options={PARALELOS}
                  value={PARALELOS.find(p => p.value === formData.paralelo) || null}
                  onChange={(option) => handleFieldChange('paralelo', option?.value || '')}
                  placeholder="Ej: A, B, C"
                  isClearable
                  isSearchable={false}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-3">
                <FormLabel>Año *</FormLabel>
                <Select
                  options={AÑOS_DISPONIBLES}
                  value={AÑOS_DISPONIBLES.find(a => a.value === formData.año) || null}
                  onChange={(option) => handleFieldChange('año', option?.value || new Date().getFullYear())}
                  placeholder="Seleccionar año"
                  isSearchable={false}
                />
                <small className="text-muted">Año escolar del curso</small>
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>Nombre del Curso (generado automáticamente)</FormLabel>
                <FormControl
                  type="text"
                  value={nombreCursoGenerado || 'Seleccione nivel y grado'}
                  readOnly
                  className="bg-light"
                  style={{ cursor: 'not-allowed' }}
                />
                <small className="text-muted">Este nombre se genera automáticamente según el nivel, grado y paralelo seleccionados.</small>
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => handleFieldChange('activo', e.target.checked)}
                    id="activo"
                  />
                  <label className="form-check-label" htmlFor="activo">
                    Curso activo
                  </label>
                </div>
              </FormGroup>
            </Col>
          </Row>

          <hr className="my-4" />

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Lista de Útiles Predefinida (opcional)
                  {formData.nivel && formData.grado && formData.año && (
                    <small className="text-muted ms-2">- Filtrado por {formData.grado}° {formData.nivel === 'Basica' ? 'Básica' : 'Media'} - Año {formData.año}</small>
                  )}
                </FormLabel>
                <Select
                  options={listasUtiles}
                  value={listasUtiles.find(l => l.value === formData.lista_utiles) || null}
                  onChange={handleListaUtilesChange}
                  placeholder={
                    loadingListas 
                      ? 'Cargando listas...' 
                      : !formData.nivel || !formData.grado || !formData.año
                      ? 'Seleccione nivel, grado y año primero'
                      : listasUtiles.length === 0
                      ? 'No hay listas disponibles para este nivel/grado/año'
                      : 'Seleccionar lista de útiles'
                  }
                  isClearable
                  isLoading={loadingListas}
                  isDisabled={!formData.nivel || !formData.grado || !formData.año}
                />
                {formData.lista_utiles && (
                  <div className="mt-2">
                    <Badge bg="info" className="me-2">
                      {listasUtiles.find(l => l.value === formData.lista_utiles)?.cantidadMateriales || 0} materiales
                    </Badge>
                    <small className="text-muted">incluidos en esta lista</small>
                  </div>
                )}
                {!loadingListas && formData.nivel && formData.grado && listasUtiles.length === 0 && (
                  <Alert variant="info" className="mt-2 mb-0 py-2">
                    <small>No hay listas de útiles disponibles para {formData.grado}° {formData.nivel === 'Basica' ? 'Básica' : 'Media'}. Puede agregar materiales adicionales manualmente.</small>
                  </Alert>
                )}
              </FormGroup>
            </Col>
          </Row>

          <Alert variant="info" className="mt-3">
            <strong>Nota:</strong> Los materiales se gestionan mediante PDFs. Sube un PDF desde la página de detalle del curso para agregar materiales.
          </Alert>
        </ModalBody>
        <ModalFooter>
          {curso && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={loading}
              className="me-auto"
            >
              Eliminar
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : curso ? 'Actualizar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Form>

    </Modal>
  )
}
