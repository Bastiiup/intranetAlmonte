'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap'
import { validarRUTChileno, formatearRUT } from '@/lib/utils/rut'

interface Cliente {
  id: number | string
  documentId?: string
  personaDocumentId?: string
  woocommerce_id?: number | string
  nombre: string
  correo_electronico: string
  telefono?: string
  rut?: string
}

interface EditClienteModalProps {
  show: boolean
  onHide: () => void
  cliente: Cliente | null
  onSave: () => void
}

const EditClienteModal = ({ show, onHide, cliente, onSave }: EditClienteModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    rut: '',
  })
  const [rutError, setRutError] = useState<string | null>(null)
  // Guardar datos originales y documentId de Persona para comparar cambios y editar correctamente
  const [originalData, setOriginalData] = useState<{
    nombre: string
    email: string
    phone: string
    rut: string
    personaDocumentId?: string
  } | null>(null)

  // Cargar datos del cliente cuando se abre el modal
  useEffect(() => {
    if (cliente && show) {
      // Parsear nombre completo en nombre y apellido
      const nombreCompleto = cliente.nombre || ''
      const partes = nombreCompleto.trim().split(' ')
      const firstName = partes[0] || ''
      const lastName = partes.slice(1).join(' ') || ''

      // Extraer teléfono, manejando casos como "Sin teléfono"
      let phoneValue = cliente.telefono || ''
      if (phoneValue === 'Sin teléfono') {
        phoneValue = ''
      }

      const formDataToSet = {
        first_name: firstName,
        last_name: lastName,
        email: cliente.correo_electronico || '',
        phone: phoneValue,
        rut: cliente.rut || '',
      }

      setFormData(formDataToSet)
      
      // Guardar datos originales y documentId de Persona para comparación y edición
      setOriginalData({
        nombre: nombreCompleto,
        email: cliente.correo_electronico || '',
        phone: phoneValue,
        rut: cliente.rut || '',
        personaDocumentId: cliente.personaDocumentId,
      })
      
      setError(null)
      setRutError(null)
      
      console.log('[EditClienteModal] 📌 Datos originales guardados:', {
        personaDocumentId: cliente.personaDocumentId,
        nombre: nombreCompleto,
        email: cliente.correo_electronico,
      })
    }
  }, [cliente, show])

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    
    // Validar RUT en tiempo real si se está editando
    if (field === 'rut' && value.trim()) {
      const validacion = validarRUTChileno(value.trim())
      if (!validacion.valid) {
        setRutError(validacion.error || 'RUT inválido')
      } else {
        setRutError(null)
        // Formatear el RUT mientras se escribe
        const rutFormateado = formatearRUT(value.trim())
        if (rutFormateado !== value) {
          setFormData((prev) => ({
            ...prev,
            rut: rutFormateado,
          }))
        }
      }
    } else if (field === 'rut' && !value.trim()) {
      setRutError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar campos obligatorios
      if (!formData.first_name.trim()) {
        throw new Error('El nombre del cliente es obligatorio')
      }
      if (!formData.email.trim()) {
        throw new Error('El correo electrónico es obligatorio')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('El correo electrónico no tiene un formato válido')
      }

      // Validar RUT si se proporciona
      let rutFormateado: string | undefined = undefined
      if (formData.rut.trim()) {
        const validacionRUT = validarRUTChileno(formData.rut.trim())
        if (!validacionRUT.valid) {
          setRutError(validacionRUT.error || 'El RUT no es válido')
          throw new Error(validacionRUT.error || 'El RUT no es válido')
        }
        rutFormateado = validacionRUT.formatted
      }

      // IMPORTANTE: En Strapi v4, siempre usar documentId para las operaciones
      // El documentId es el identificador correcto para las rutas de API
      // Priorizar documentId, sino usar el id (que debería ser string si viene del mapeo)
      const clienteId = cliente?.documentId || cliente?.id
      if (!clienteId || clienteId === '0' || clienteId === 0) {
        throw new Error('No se puede editar: el cliente no tiene ID válido (documentId o id)')
      }

      // Log para diagnóstico
      console.log('[EditClienteModal] 🔍 ID del cliente a usar:', clienteId, '(tipo:', typeof clienteId, ')')
      console.log('[EditClienteModal] 📦 Cliente completo:', cliente)
      console.log('[EditClienteModal] 📌 documentId:', cliente?.documentId, '| id:', cliente?.id, '| id usado:', clienteId)

      // Preparar datos para la API en formato Strapi
      const nombreCompleto = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      const updateData: any = {
        data: {
          nombre: nombreCompleto,
          correo_electronico: formData.email.trim(),
          persona: {},
        },
      }

      // Agregar documentId de Persona si está disponible (importante para edición correcta)
      if (originalData?.personaDocumentId) {
        updateData.data.persona.documentId = originalData.personaDocumentId
        console.log('[EditClienteModal] 📌 Enviando personaDocumentId al backend:', originalData.personaDocumentId)
      }

      // Agregar teléfono si existe (se actualizará en Persona)
      if (formData.phone.trim()) {
        updateData.data.persona.telefonos = [
          {
            telefono_raw: formData.phone.trim(),
            telefono_norm: formData.phone.trim(),
            tipo: 'Personal',
            principal: true,
            status: true,
          },
        ]
      }

      // Agregar RUT si se proporcionó y es válido (se actualizará en Persona)
      if (rutFormateado) {
        updateData.data.persona.rut = rutFormateado
      }
      
      const response = await fetch(`/api/tienda/clientes/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el cliente')
      }

      // Llamar callback para refrescar la lista
      onSave()
      onHide()
    } catch (err: any) {
      console.error('Error al actualizar cliente:', err)
      setError(err.message || 'Error al actualizar el cliente')
    } finally {
      setLoading(false)
    }
  }

  if (!cliente) return null

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Cliente</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              Nombre <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Juan"
              value={formData.first_name}
              onChange={(e) => handleFieldChange('first_name', e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Apellido</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Pérez"
              value={formData.last_name}
              onChange={(e) => handleFieldChange('last_name', e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Correo Electrónico <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="Ej: juan.perez@ejemplo.com"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>RUT</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: 12345678-9"
              value={formData.rut}
              onChange={(e) => handleFieldChange('rut', e.target.value)}
              isInvalid={!!rutError}
            />
            {rutError && (
              <Form.Control.Feedback type="invalid">
                {rutError}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              type="tel"
              placeholder="Ej: +56 9 1234 5678"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
            />
          </Form.Group>

          <div className="d-flex gap-2 justify-content-end">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  )
}

export default EditClienteModal

