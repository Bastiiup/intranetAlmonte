'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import PlatformSelector from './PlatformSelector'

interface AddClienteFormProps {
  onSave?: () => void
  onCancel?: () => void
  showCard?: boolean
}

const AddClienteForm = ({ onSave, onCancel, showCard = true }: AddClienteFormProps = {}) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

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

      // Preparar datos para la API en formato Strapi
      const nombreCompleto = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      const personaData: any = {
        nombre_completo: nombreCompleto,
        nombres: formData.first_name.trim(),
        primer_apellido: formData.last_name.trim() || null,
        emails: [
          {
            email: formData.email.trim(),
            tipo: 'Personal', // Valores válidos en Strapi: "Personal", "Laboral", "Institucional"
          },
        ],
      }

      // Agregar teléfono si existe
      if (formData.phone.trim()) {
        personaData.telefonos = [
          {
            numero: formData.phone.trim(), // Campo correcto según schema de Strapi
            tipo: 'principal',
          },
        ]
      }

      const dataToSend: any = {
        data: {
          persona: personaData,
        },
      }

      // Agregar canales basados en plataformas seleccionadas
      if (selectedPlatforms.length > 0) {
        // Obtener IDs de canales desde Strapi
        try {
          const canalesResponse = await fetch('/api/tienda/canales', {
            // Agregar timeout para evitar esperar demasiado
            signal: AbortSignal.timeout(5000) // 5 segundos timeout
          })
          
          if (!canalesResponse.ok) {
            throw new Error(`Error ${canalesResponse.status}: ${canalesResponse.statusText}`)
          }
          
          const canalesData = await canalesResponse.json()
          
          if (canalesData.success && canalesData.data) {
            const canalesIds: string[] = []
            
            selectedPlatforms.forEach((platform) => {
              const canal = canalesData.data.find((c: any) => {
                const attrs = c.attributes || c
                const key = attrs.key || attrs.nombre?.toLowerCase()
                return (
                  (platform === 'woo_moraleja' && (key === 'moraleja' || key === 'woo_moraleja')) ||
                  (platform === 'woo_escolar' && (key === 'escolar' || key === 'woo_escolar'))
                )
              })
              
              if (canal) {
                const docId = canal.documentId || canal.id
                if (docId) canalesIds.push(String(docId))
              }
            })
            
            if (canalesIds.length > 0) {
              dataToSend.data.canales = canalesIds
              console.log('[AddCliente] ✅ Canales obtenidos exitosamente:', canalesIds)
            }
          }
        } catch (err: any) {
          // Si hay error al obtener canales (502, timeout, etc.), usar valores por defecto
          console.warn('[AddCliente] ⚠️ No se pudieron obtener canales desde Strapi:', err.message)
          console.warn('[AddCliente] ⚠️ El cliente se creará sin canales específicos, se asignarán ambos por defecto en el servidor')
        }
      }

      // Crear el cliente en Strapi (se sincronizará con WordPress según los canales)
      const response = await fetch('/api/tienda/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el cliente')
      }

      setSuccess(true)
      
      // Si hay callback onSave, usarlo (modal), sino redirigir (página completa)
      if (onSave) {
        setTimeout(() => {
          onSave()
          router.refresh()
        }, 1500)
      } else {
        setTimeout(() => {
          router.push('/clientes')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Error al crear cliente:', err)
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                Cliente creado exitosamente. Se sincronizará con las plataformas seleccionadas según los canales asignados. Redirigiendo...
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onChange={setSelectedPlatforms}
              />

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Nombre <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Juan"
                      value={formData.first_name}
                      onChange={(e) => handleFieldChange('first_name', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Ej: Pérez"
                      value={formData.last_name}
                      onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>
                      Correo Electrónico <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="email"
                      placeholder="Ej: juan.perez@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      required
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="mb-3">
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl
                      type="tel"
                      placeholder="Ej: +56 9 1234 5678"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  </FormGroup>
                </Col>
              </Row>

              <div className="d-flex gap-2 justify-content-end">
                <Button
                  variant="light"
                  onClick={() => {
                    if (onCancel) {
                      onCancel()
                    } else {
                      router.back()
                    }
                  }}
                  disabled={loading}
                >
                  <LuX className="me-1" /> Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <LuSave className="me-1" /> Guardar Cliente
                    </>
                  )}
                </Button>
              </div>
            </Form>
    </>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader>
            <h4 className="card-title mb-0">Agregar Cliente</h4>
          </CardHeader>
          <CardBody>
            {formContent}
          </CardBody>
        </Card>
      </Col>
    </Row>
  )
}

export default AddClienteForm

