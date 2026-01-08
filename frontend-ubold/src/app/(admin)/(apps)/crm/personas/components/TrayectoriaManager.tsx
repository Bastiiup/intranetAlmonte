'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, Form, FormGroup, FormLabel, FormControl, Button, Alert, Row, Col, Badge } from 'react-bootstrap'
import { LuPlus, LuX, LuPencil, LuSave } from 'react-icons/lu'

interface ColegioOption {
  id: number
  documentId: string
  nombre: string
  rbd?: number | null
}

interface TrayectoriaItem {
  id?: string | number
  documentId?: string
  colegioId?: number | string
  colegioNombre?: string
  cargo?: string
  curso?: string
  nivel?: string
  grado?: string
  is_current?: boolean
  isNew?: boolean
  isEditing?: boolean
  toDelete?: boolean
}

interface TrayectoriaManagerProps {
  trayectorias: TrayectoriaItem[]
  onChange: (trayectorias: TrayectoriaItem[]) => void
  disabled?: boolean
}

const TrayectoriaManager = ({ trayectorias: initialTrayectorias, onChange, disabled = false }: TrayectoriaManagerProps) => {
  const [trayectorias, setTrayectorias] = useState<TrayectoriaItem[]>(initialTrayectorias || [])
  const [colegios, setColegios] = useState<ColegioOption[]>([])
  const [loadingColegios, setLoadingColegios] = useState(false)
  const [searchColegio, setSearchColegio] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Cargar lista de colegios
  useEffect(() => {
    const fetchColegios = async () => {
      setLoadingColegios(true)
      try {
        const response = await fetch(`/api/crm/colegios/list?search=${encodeURIComponent(searchColegio)}`)
        const result = await response.json()
        if (result.success) {
          setColegios(result.data || [])
        }
      } catch (err: any) {
        console.error('Error al cargar colegios:', err)
      } finally {
        setLoadingColegios(false)
      }
    }

    const timeoutId = setTimeout(() => {
      fetchColegios()
    }, 300) // Debounce

    return () => clearTimeout(timeoutId)
  }, [searchColegio])

  // Sincronizar con cambios externos
  useEffect(() => {
    setTrayectorias(initialTrayectorias || [])
  }, [initialTrayectorias])

  // Notificar cambios al padre
  useEffect(() => {
    onChange(trayectorias)
  }, [trayectorias, onChange])

  const handleTrayectoriaChange = (index: number, field: keyof TrayectoriaItem, value: any) => {
    const newTrayectorias = [...trayectorias]
    newTrayectorias[index] = { ...newTrayectorias[index], [field]: value }
    
    // Si cambia el colegio, actualizar el nombre
    if (field === 'colegioId') {
      const colegio = colegios.find(c => String(c.id) === String(value) || String(c.documentId) === String(value))
      if (colegio) {
        newTrayectorias[index].colegioNombre = colegio.nombre
      }
    }
    
    setTrayectorias(newTrayectorias)
  }

  const addTrayectoria = () => {
    setTrayectorias([
      ...trayectorias,
      {
        isNew: true,
        isEditing: true,
        is_current: trayectorias.length === 0, // Primera trayectoria es actual por defecto
      },
    ])
  }

  const removeTrayectoria = (index: number) => {
    const trayectoria = trayectorias[index]
    if (trayectoria.isNew) {
      // Si es nueva, simplemente eliminar
      setTrayectorias(trayectorias.filter((_, i) => i !== index))
    } else {
      // Si existe, marcar para eliminar
      const newTrayectorias = [...trayectorias]
      newTrayectorias[index] = { ...newTrayectorias[index], toDelete: true }
      setTrayectorias(newTrayectorias)
    }
  }

  const toggleEdit = (index: number) => {
    const newTrayectorias = [...trayectorias]
    newTrayectorias[index] = { ...newTrayectorias[index], isEditing: !newTrayectorias[index].isEditing }
    setTrayectorias(newTrayectorias)
  }

  const cancelEdit = (index: number) => {
    const trayectoria = trayectorias[index]
    if (trayectoria.isNew) {
      // Si es nueva, eliminar
      setTrayectorias(trayectorias.filter((_, i) => i !== index))
    } else {
      // Si existe, cancelar edición
      toggleEdit(index)
    }
  }

  const saveTrayectoria = (index: number) => {
    const trayectoria = trayectorias[index]
    
    // Validaciones
    if (!trayectoria.colegioId) {
      setError('Debe seleccionar un colegio')
      return
    }

    setError(null)
    const newTrayectorias = [...trayectorias]
    newTrayectorias[index] = { ...newTrayectorias[index], isEditing: false, isNew: false }
    setTrayectorias(newTrayectorias)
  }

  // Filtrar trayectorias eliminadas para mostrar
  const trayectoriasToShow = trayectorias.filter(t => !t.toDelete)

  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Trayectorias (Colegios)</h5>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={addTrayectoria}
          disabled={disabled}
        >
          <LuPlus size={16} className="me-1" />
          Agregar Trayectoria
        </Button>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}

        {trayectoriasToShow.length === 0 ? (
          <p className="text-muted text-center py-3">
            No hay trayectorias asignadas. Haz clic en "Agregar Trayectoria" para comenzar.
          </p>
        ) : (
          <div>
            {trayectoriasToShow.map((trayectoria, index) => {
              const originalIndex = trayectorias.findIndex(t => t === trayectoria)
              const isEditing = trayectoria.isEditing || trayectoria.isNew

              if (isEditing) {
                return (
                  <Card key={originalIndex} className="mb-3 border-primary">
                    <CardBody>
                      <Row>
                        <Col md={12}>
                          <FormGroup className="mb-3">
                            <FormLabel>
                              Colegio <span className="text-danger">*</span>
                            </FormLabel>
                            <FormControl
                              type="text"
                              placeholder="Buscar colegio..."
                              value={searchColegio}
                              onChange={(e) => setSearchColegio(e.target.value)}
                              disabled={disabled || loadingColegios}
                              className="mb-2"
                            />
                            <FormControl
                              as="select"
                              value={trayectoria.colegioId || ''}
                              onChange={(e) => handleTrayectoriaChange(originalIndex, 'colegioId', e.target.value)}
                              disabled={disabled || loadingColegios}
                              required
                            >
                              <option value="">Seleccionar colegio...</option>
                              {colegios.map((colegio) => (
                                <option key={colegio.id} value={colegio.id}>
                                  {colegio.nombre} {colegio.rbd ? `(RBD: ${colegio.rbd})` : ''}
                                </option>
                              ))}
                            </FormControl>
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <FormGroup className="mb-3">
                            <FormLabel>Cargo</FormLabel>
                            <FormControl
                              type="text"
                              placeholder="Ej: Profesor, Director, Coordinador"
                              value={trayectoria.cargo || ''}
                              onChange={(e) => handleTrayectoriaChange(originalIndex, 'cargo', e.target.value)}
                              disabled={disabled}
                            />
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <FormGroup className="mb-3">
                            <FormLabel>Curso</FormLabel>
                            <FormControl
                              type="text"
                              placeholder="Ej: Matemáticas, 1° Básico"
                              value={trayectoria.curso || ''}
                              onChange={(e) => handleTrayectoriaChange(originalIndex, 'curso', e.target.value)}
                              disabled={disabled}
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <FormGroup className="mb-3">
                            <FormLabel>Nivel</FormLabel>
                            <FormControl
                              type="text"
                              placeholder="Ej: Básico, Medio"
                              value={trayectoria.nivel || ''}
                              onChange={(e) => handleTrayectoriaChange(originalIndex, 'nivel', e.target.value)}
                              disabled={disabled}
                            />
                          </FormGroup>
                        </Col>
                        <Col md={6}>
                          <FormGroup className="mb-3">
                            <FormLabel>Grado</FormLabel>
                            <FormControl
                              type="text"
                              placeholder="Ej: 1°, 2°, 3°"
                              value={trayectoria.grado || ''}
                              onChange={(e) => handleTrayectoriaChange(originalIndex, 'grado', e.target.value)}
                              disabled={disabled}
                            />
                          </FormGroup>
                        </Col>
                      </Row>

                      <FormGroup className="mb-3">
                        <div className="d-flex align-items-center">
                          <FormControl
                            type="checkbox"
                            checked={trayectoria.is_current || false}
                            onChange={(e) => {
                              // Si se marca como actual, desmarcar las demás
                              const newTrayectorias = [...trayectorias]
                              if (e.target.checked) {
                                newTrayectorias.forEach((t, i) => {
                                  if (i !== originalIndex) {
                                    t.is_current = false
                                  }
                                })
                              }
                              newTrayectorias[originalIndex] = {
                                ...newTrayectorias[originalIndex],
                                is_current: e.target.checked,
                              }
                              setTrayectorias(newTrayectorias)
                            }}
                            disabled={disabled}
                            className="me-2"
                          />
                          <FormLabel className="mb-0">Trayectoria Actual</FormLabel>
                        </div>
                      </FormGroup>

                      <div className="d-flex gap-2 justify-content-end">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => cancelEdit(originalIndex)}
                          disabled={disabled}
                        >
                          <LuX className="me-1" /> Cancelar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => saveTrayectoria(originalIndex)}
                          disabled={disabled}
                        >
                          <LuSave className="me-1" /> Guardar
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )
              }

              return (
                <Card key={originalIndex} className="mb-2">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1">
                          {trayectoria.colegioNombre || 'Sin colegio'}
                          {trayectoria.is_current && (
                            <Badge bg="success" className="ms-2">Actual</Badge>
                          )}
                        </h6>
                        <div className="small text-muted">
                          {trayectoria.cargo && <span className="me-2">Cargo: {trayectoria.cargo}</span>}
                          {trayectoria.curso && <span className="me-2">Curso: {trayectoria.curso}</span>}
                          {trayectoria.nivel && <span className="me-2">Nivel: {trayectoria.nivel}</span>}
                          {trayectoria.grado && <span>Grado: {trayectoria.grado}</span>}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => toggleEdit(originalIndex)}
                          disabled={disabled}
                        >
                          <LuPencil size={14} />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeTrayectoria(originalIndex)}
                          disabled={disabled}
                        >
                          <LuX size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default TrayectoriaManager
