'use client'

import { useState, useEffect } from 'react'
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
import Select from 'react-select'

interface ListaType {
  id: number | string
  documentId?: string
  nombre: string
  nivel: 'Basica' | 'Media'
  grado: number
  año?: number
  colegio?: {
    id: number | string
    nombre: string
  }
}

interface ColegioOption {
  value: number | string
  label: string
}

interface DuplicarListaModalProps {
  show: boolean
  onHide: () => void
  lista: ListaType | null
  onSuccess?: () => void
}

export default function DuplicarListaModal({
  show,
  onHide,
  lista,
  onSuccess,
}: DuplicarListaModalProps) {
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoAño, setNuevoAño] = useState(new Date().getFullYear())
  const [nuevoColegio, setNuevoColegio] = useState<ColegioOption | null>(null)
  const [copiarMateriales, setCopiarMateriales] = useState(true)
  const [copiarPDF, setCopiarPDF] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)

  // Cargar colegios al abrir
  useEffect(() => {
    if (show) {
      loadColegios()
      // Inicializar valores desde la lista
      if (lista) {
        setNuevoNombre(`${lista.nombre} (Copia)`)
        setNuevoAño(lista.año || new Date().getFullYear())
        if (lista.colegio) {
          setNuevoColegio({
            value: lista.colegio.id,
            label: lista.colegio.nombre,
          })
        }
      }
    }
  }, [show, lista])

  const loadColegios = async () => {
    setLoadingColegios(true)
    try {
      const response = await fetch('/api/crm/colegios?page=1&pageSize=1000')
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const colegiosOptions: ColegioOption[] = result.data.map((colegio: any) => ({
          value: colegio.id || colegio.documentId,
          label: colegio.colegio_nombre || colegio.nombre || 'Sin nombre',
        }))
        setColegios(colegiosOptions)
      }
    } catch (err: any) {
      console.error('Error al cargar colegios:', err)
    } finally {
      setLoadingColegios(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lista) return

    setLoading(true)
    setError(null)

    try {
      const listaId = lista.documentId || lista.id

      const response = await fetch(`/api/crm/listas/${listaId}/duplicar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nuevoNombre: nuevoNombre.trim() || undefined,
          nuevoAño: nuevoAño || undefined,
          nuevoColegioId: nuevoColegio?.value || undefined,
          copiarMateriales,
          copiarPDF,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al duplicar la lista')
      }

      // Éxito
      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      console.error('Error al duplicar lista:', err)
      setError(err.message || 'Error al duplicar la lista')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setNuevoNombre('')
    setNuevoAño(new Date().getFullYear())
    setNuevoColegio(null)
    setCopiarMateriales(true)
    setCopiarPDF(false)
    onHide()
  }

  if (!lista) return null

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <ModalHeader closeButton>
        <ModalTitle>Duplicar Lista</ModalTitle>
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Alert variant="info">
            <strong>Duplicando:</strong> {lista.nombre}
          </Alert>

          <Row>
            <Col xs={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nuevo Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del curso duplicado"
                  required
                />
              </FormGroup>
            </Col>

            <Col xs={12} sm={6}>
              <FormGroup className="mb-3">
                <FormLabel>Año</FormLabel>
                <FormControl
                  type="number"
                  value={nuevoAño}
                  onChange={(e) => setNuevoAño(parseInt(e.target.value) || new Date().getFullYear())}
                  min={2020}
                  max={2100}
                />
              </FormGroup>
            </Col>


            <Col xs={12}>
              <FormGroup className="mb-3">
                <FormLabel>Colegio</FormLabel>
                <Select
                  options={colegios}
                  value={nuevoColegio}
                  onChange={(option) => setNuevoColegio(option)}
                  isLoading={loadingColegios}
                  isClearable
                  placeholder="Seleccionar colegio (opcional)"
                  isSearchable
                />
                <small className="text-muted">
                  Si no se selecciona, se usará el mismo colegio de la lista original
                </small>
              </FormGroup>
            </Col>

            <Col xs={12}>
              <FormGroup className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={copiarMateriales}
                    onChange={(e) => setCopiarMateriales(e.target.checked)}
                    id="copiarMateriales"
                  />
                  <label className="form-check-label" htmlFor="copiarMateriales">
                    Copiar materiales de la lista original
                  </label>
                </div>
              </FormGroup>
            </Col>

            <Col xs={12}>
              <FormGroup className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={copiarPDF}
                    onChange={(e) => setCopiarPDF(e.target.checked)}
                    id="copiarPDF"
                    disabled={!copiarMateriales}
                  />
                  <label className="form-check-label" htmlFor="copiarPDF">
                    Copiar PDF asociado (solo si se copian materiales)
                  </label>
                </div>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !nuevoNombre.trim()}>
            {loading ? 'Duplicando...' : 'Duplicar Lista'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
