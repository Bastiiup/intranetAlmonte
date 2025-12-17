'use client'

import { useState, useEffect, useCallback } from 'react'
import { Form, InputGroup, Button, ListGroup, Badge, Modal, Alert, Spinner } from 'react-bootstrap'
import { LuSearch, LuUserPlus, LuUser, LuX } from 'react-icons/lu'

interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  username?: string
  billing?: {
    phone?: string
  }
}

interface CustomerSelectorProps {
  selectedCustomer: Customer | null
  onSelect: (customer: Customer | null) => void
}

export default function CustomerSelector({ selectedCustomer, onSelect }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Formulario de nuevo cliente
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
  })

  // Buscar clientes
  const searchCustomers = useCallback(async (search: string) => {
    if (search.length < 2) {
      setCustomers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/woocommerce/customers?search=${encodeURIComponent(search)}&per_page=10`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data || [])
      } else {
        setError(data.error || 'Error al buscar clientes')
        setCustomers([])
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchCustomers(searchTerm)
      } else {
        setCustomers([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchCustomers])

  // Crear cliente rápido
  const handleCreateCustomer = async () => {
    if (!newCustomer.email || !newCustomer.first_name) {
      setError('Email y nombre son requeridos')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/woocommerce/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer),
      })

      const data = await response.json()

      if (data.success) {
        onSelect(data.data)
        setShowCreateModal(false)
        setNewCustomer({ email: '', first_name: '', last_name: '', phone: '' })
        setSearchTerm('')
        setCustomers([])
      } else {
        setError(data.error || 'Error al crear cliente')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="customer-selector">
      <InputGroup>
        <InputGroup.Text>
          <LuSearch />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder={selectedCustomer ? selectedCustomer.first_name + ' ' + selectedCustomer.last_name : 'Buscar cliente...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (selectedCustomer) {
              setSearchTerm('')
            }
          }}
        />
        {selectedCustomer && (
          <Button
            variant="outline-secondary"
            onClick={() => {
              onSelect(null)
              setSearchTerm('')
            }}
          >
            <LuX />
          </Button>
        )}
        <Button
          variant="outline-primary"
          onClick={() => setShowCreateModal(true)}
          title="Crear cliente nuevo"
        >
          <LuUserPlus />
        </Button>
      </InputGroup>

      {/* Lista de resultados */}
      {searchTerm && !selectedCustomer && (
        <div className="position-relative">
          <div
            className="position-absolute w-100 bg-white border rounded shadow-lg"
            style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto', marginTop: '4px' }}
          >
            {loading ? (
              <div className="text-center p-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : error ? (
              <Alert variant="danger" className="m-2 mb-0">
                {error}
              </Alert>
            ) : customers.length === 0 ? (
              <div className="p-3 text-muted text-center">
                No se encontraron clientes
              </div>
            ) : (
              <ListGroup variant="flush">
                {customers.map((customer) => (
                  <ListGroup.Item
                    key={customer.id}
                    action
                    onClick={() => {
                      onSelect(customer)
                      setSearchTerm('')
                      setCustomers([])
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <small className="text-muted">{customer.email}</small>
                        {customer.billing?.phone && (
                          <div>
                            <small className="text-muted">{customer.billing.phone}</small>
                          </div>
                        )}
                      </div>
                      <Badge bg="primary">
                        <LuUser />
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear cliente */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crear Cliente Nuevo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                value={newCustomer.first_name}
                onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control
                type="text"
                value={newCustomer.last_name}
                onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateCustomer}
            disabled={creating || !newCustomer.email || !newCustomer.first_name}
          >
            {creating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creando...
              </>
            ) : (
              'Crear Cliente'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

