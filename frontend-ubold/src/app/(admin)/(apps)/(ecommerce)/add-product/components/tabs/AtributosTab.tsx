'use client'

import { memo, useState, useEffect } from 'react'
import { Alert, Button, Badge, Table, Modal, Form, FormGroup, FormLabel, FormControl, FormCheck, FormSelect } from 'react-bootstrap'
import { LuX, LuPlus, LuTrash2 } from 'react-icons/lu'

interface WooCommerceAttribute {
  id: number
  name: string
  slug: string
  type: string
  order_by: string
  has_archives: boolean
}

interface ProductAttribute {
  id?: number
  name: string
  slug: string
  position: number
  visible: boolean
  variation: boolean
  options: string[]
}

interface AtributosTabProps {
  formData: any
  updateField: (field: string, value: any) => void
}

const AtributosTab = memo(function AtributosTab({ formData, updateField }: AtributosTabProps) {
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [loadingAttributes, setLoadingAttributes] = useState(false)
  const [wooAttributes, setWooAttributes] = useState<WooCommerceAttribute[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Estados para crear nuevo atributo
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    slug: '',
    type: 'select' as 'select' | 'text',
    order_by: 'menu_order' as 'menu_order' | 'name' | 'name_num' | 'id',
    has_archives: false,
  })
  const [newAttributeOptions, setNewAttributeOptions] = useState<string[]>([''])
  const [newAttributeVisible, setNewAttributeVisible] = useState(true)
  const [newAttributeVariation, setNewAttributeVariation] = useState(false)

  const attributes: ProductAttribute[] = formData.attributes || []

  // Cargar atributos existentes de WooCommerce
  const loadWooCommerceAttributes = async () => {
    setLoadingAttributes(true)
    setError(null)
    try {
      const response = await fetch('/api/woocommerce/products/attributes?per_page=100&platform=moraleja')
      const data = await response.json()
      
      if (data.success && data.data) {
        setWooAttributes(data.data)
      } else {
        throw new Error(data.error || 'Error al cargar atributos')
      }
    } catch (err: any) {
      console.error('[AtributosTab] Error al cargar atributos:', err)
      setError(err.message || 'Error al cargar atributos de WooCommerce')
      setWooAttributes([])
    } finally {
      setLoadingAttributes(false)
    }
  }

  // Cargar atributos cuando se abre el modal
  useEffect(() => {
    if (showAddExisting) {
      loadWooCommerceAttributes()
    }
  }, [showAddExisting])

  // Filtrar atributos por término de búsqueda
  const filteredAttributes = wooAttributes.filter((attr) =>
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agregar atributo existente al producto
  const handleAddExistingAttribute = async (wooAttr: WooCommerceAttribute) => {
    try {
      // Obtener términos (opciones) del atributo
      const termsResponse = await fetch(`/api/woocommerce/products/attributes/${wooAttr.id}/terms?per_page=100&platform=moraleja`)
      const termsData = await termsResponse.json()
      
      const options = termsData.success && termsData.data
        ? termsData.data.map((term: any) => term.name)
        : []

      const newAttribute: ProductAttribute = {
        id: wooAttr.id,
        name: wooAttr.name,
        slug: wooAttr.slug,
        position: attributes.length,
        visible: true,
        variation: false,
        options: options,
      }

      const updatedAttributes = [...attributes, newAttribute]
      updateField('attributes', updatedAttributes)
      setShowAddExisting(false)
      setSearchTerm('')
    } catch (err: any) {
      console.error('[AtributosTab] Error al obtener términos del atributo:', err)
      // Agregar sin opciones si falla
      const newAttribute: ProductAttribute = {
        id: wooAttr.id,
        name: wooAttr.name,
        slug: wooAttr.slug,
        position: attributes.length,
        visible: true,
        variation: false,
        options: [],
      }
      const updatedAttributes = [...attributes, newAttribute]
      updateField('attributes', updatedAttributes)
      setShowAddExisting(false)
      setSearchTerm('')
    }
  }

  // Crear nuevo atributo en WooCommerce y agregarlo al producto
  const handleCreateNewAttribute = async () => {
    if (!newAttribute.name.trim()) {
      setError('El nombre del atributo es obligatorio')
      return
    }

    setLoadingAttributes(true)
    setError(null)

    try {
      // Crear el atributo en WooCommerce
      const createResponse = await fetch('/api/woocommerce/products/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAttribute.name.trim(),
          slug: newAttribute.slug.trim() || newAttribute.name.trim().toLowerCase().replace(/\s+/g, '-'),
          type: newAttribute.type,
          order_by: newAttribute.order_by,
          has_archives: newAttribute.has_archives,
          platform: 'moraleja',
        }),
      })

      const createData = await createResponse.json()

      if (!createResponse.ok || !createData.success) {
        throw new Error(createData.error || 'Error al crear el atributo')
      }

      const createdAttr = createData.data

      // Si hay opciones, crearlas
      const validOptions = newAttributeOptions.filter(opt => opt.trim() !== '')
      if (validOptions.length > 0 && newAttribute.type === 'select') {
        for (const option of validOptions) {
          try {
            await fetch(`/api/woocommerce/products/attributes/${createdAttr.id}/terms?platform=moraleja`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: option.trim(),
              }),
            })
          } catch (err) {
            console.warn('[AtributosTab] Error al crear término:', err)
          }
        }
      }

      // Agregar el atributo al producto
      const productAttribute: ProductAttribute = {
        id: createdAttr.id,
        name: createdAttr.name,
        slug: createdAttr.slug,
        position: attributes.length,
        visible: newAttributeVisible,
        variation: newAttributeVariation,
        options: validOptions,
      }

      const updatedAttributes = [...attributes, productAttribute]
      updateField('attributes', updatedAttributes)

      // Resetear formulario
      setNewAttribute({
        name: '',
        slug: '',
        type: 'select',
        order_by: 'menu_order',
        has_archives: false,
      })
      setNewAttributeOptions([''])
      setNewAttributeVisible(true)
      setNewAttributeVariation(false)
      setShowCreateNew(false)
    } catch (err: any) {
      console.error('[AtributosTab] Error al crear atributo:', err)
      setError(err.message || 'Error al crear el atributo')
    } finally {
      setLoadingAttributes(false)
    }
  }

  // Eliminar atributo del producto
  const handleRemoveAttribute = (index: number) => {
    const updatedAttributes = attributes.filter((_, i) => i !== index)
    // Reordenar posiciones
    updatedAttributes.forEach((attr, i) => {
      attr.position = i
    })
    updateField('attributes', updatedAttributes)
  }

  // Actualizar opciones de un atributo
  const handleUpdateAttributeOptions = (index: number, options: string[]) => {
    const updatedAttributes = [...attributes]
    updatedAttributes[index].options = options
    updateField('attributes', updatedAttributes)
  }

  // Agregar opción a un atributo
  const handleAddOption = (index: number) => {
    const updatedAttributes = [...attributes]
    updatedAttributes[index].options.push('')
    updateField('attributes', updatedAttributes)
  }

  // Eliminar opción de un atributo
  const handleRemoveOption = (attrIndex: number, optionIndex: number) => {
    const updatedAttributes = [...attributes]
    updatedAttributes[attrIndex].options = updatedAttributes[attrIndex].options.filter(
      (_, i) => i !== optionIndex
    )
    updateField('attributes', updatedAttributes)
  }

  return (
    <div>
      <h5 className="mb-4">Atributos del Producto</h5>
      
      <Alert variant="info" dismissible>
        Agrega información descriptiva que los clientes puedan utilizar para buscar este producto en tu tienda, como "Material" o "Talla".
      </Alert>

      <div className="d-flex gap-2 mb-3">
        <Button 
          variant="outline-primary" 
          onClick={() => setShowAddExisting(true)}
        >
          <LuPlus className="fs-sm me-2" />
          Agregar existente
        </Button>
        <Button 
          variant="outline-secondary" 
          onClick={() => setShowCreateNew(true)}
        >
          <LuPlus className="fs-sm me-2" />
          Agregar nuevo
        </Button>
      </div>

      {attributes.length > 0 ? (
        <div className="mt-4">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Opciones</th>
                <th>Visible</th>
                <th>Variación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr, index) => (
                <tr key={index}>
                  <td>
                    <strong>{attr.name}</strong>
                    {attr.id && (
                      <Badge bg="secondary" className="ms-2">ID: {attr.id}</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {attr.options.length > 0 ? (
                        attr.options.map((option, optIndex) => (
                          <Badge key={optIndex} bg="info">{option}</Badge>
                        ))
                      ) : (
                        <span className="text-muted">Sin opciones</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <FormCheck
                      checked={attr.visible}
                      onChange={(e) => {
                        const updatedAttributes = [...attributes]
                        updatedAttributes[index].visible = e.target.checked
                        updateField('attributes', updatedAttributes)
                      }}
                    />
                  </td>
                  <td>
                    <FormCheck
                      checked={attr.variation}
                      onChange={(e) => {
                        const updatedAttributes = [...attributes]
                        updatedAttributes[index].variation = e.target.checked
                        updateField('attributes', updatedAttributes)
                      }}
                    />
                  </td>
                  <td>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() => handleRemoveAttribute(index)}
                    >
                      <LuTrash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <Alert variant="warning" className="mt-3">
          No hay atributos agregados. Usa los botones de arriba para agregar atributos existentes o crear nuevos.
        </Alert>
      )}

      {/* Modal para agregar atributo existente */}
      <Modal show={showAddExisting} onHide={() => setShowAddExisting(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agregar Atributo Existente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormGroup className="mb-3">
            <FormLabel>Buscar atributo</FormLabel>
            <FormControl
              type="text"
              placeholder="Buscar por nombre o slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormGroup>

          {loadingAttributes ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredAttributes.length > 0 ? (
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Slug</th>
                      <th>Tipo</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttributes.map((attr) => (
                      <tr key={attr.id}>
                        <td>{attr.name}</td>
                        <td>
                          <code>{attr.slug}</code>
                        </td>
                        <td>{attr.type}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAddExistingAttribute(attr)}
                            disabled={attributes.some(a => a.id === attr.id)}
                          >
                            {attributes.some(a => a.id === attr.id) ? 'Agregado' : 'Agregar'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">
                  {searchTerm ? 'No se encontraron atributos con ese término.' : 'No hay atributos disponibles.'}
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddExisting(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para crear nuevo atributo */}
      <Modal show={showCreateNew} onHide={() => setShowCreateNew(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Crear Nuevo Atributo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormGroup className="mb-3">
            <FormLabel>
              Nombre del atributo <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              type="text"
              placeholder="Ej: Color, Talla, Material"
              value={newAttribute.name}
              onChange={(e) => {
                setNewAttribute({ ...newAttribute, name: e.target.value })
                // Generar slug automáticamente
                if (!newAttribute.slug) {
                  const slug = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  setNewAttribute({ ...newAttribute, name: e.target.value, slug })
                }
              }}
              required
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>Slug</FormLabel>
            <FormControl
              type="text"
              placeholder="Se genera automáticamente"
              value={newAttribute.slug}
              onChange={(e) => setNewAttribute({ ...newAttribute, slug: e.target.value })}
            />
            <small className="text-muted">Identificador único del atributo (se genera automáticamente si está vacío)</small>
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>Tipo</FormLabel>
            <FormSelect
              value={newAttribute.type}
              onChange={(e) => setNewAttribute({ ...newAttribute, type: e.target.value as 'select' | 'text' })}
            >
              <option value="select">Select (Lista desplegable)</option>
              <option value="text">Text (Texto libre)</option>
            </FormSelect>
          </FormGroup>

          {newAttribute.type === 'select' && (
            <FormGroup className="mb-3">
              <FormLabel>Opciones</FormLabel>
              {newAttributeOptions.map((option, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <FormControl
                    type="text"
                    placeholder={`Opción ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const updated = [...newAttributeOptions]
                      updated[index] = e.target.value
                      setNewAttributeOptions(updated)
                    }}
                  />
                  {newAttributeOptions.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        const updated = newAttributeOptions.filter((_, i) => i !== index)
                        setNewAttributeOptions(updated)
                      }}
                    >
                      <LuX />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setNewAttributeOptions([...newAttributeOptions, ''])}
              >
                <LuPlus className="fs-sm me-1" />
                Agregar opción
              </Button>
            </FormGroup>
          )}

          <FormGroup className="mb-3">
            <FormCheck
              checked={newAttributeVisible}
              onChange={(e) => setNewAttributeVisible(e.target.checked)}
              label="Visible en la página del producto"
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormCheck
              checked={newAttributeVariation}
              onChange={(e) => setNewAttributeVariation(e.target.checked)}
              label="Usado para variaciones"
            />
            <small className="text-muted d-block">
              Si está marcado, este atributo se usará para crear variaciones del producto
            </small>
          </FormGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateNew(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateNewAttribute}
            disabled={loadingAttributes || !newAttribute.name.trim()}
          >
            {loadingAttributes ? 'Creando...' : 'Crear y Agregar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
})

export default AtributosTab
