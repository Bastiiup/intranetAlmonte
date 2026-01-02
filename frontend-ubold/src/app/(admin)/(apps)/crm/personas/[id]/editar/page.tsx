'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import PersonaForm from '../../components/PersonaForm'

const EditarPersonaPage = () => {
  const router = useRouter()
  const params = useParams()
  const personaId = params?.id as string

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personaData, setPersonaData] = useState<any>(null)

  useEffect(() => {
    const fetchPersona = async () => {
      if (!personaId) return

      setLoadingData(true)
      try {
        const response = await fetch(`/api/crm/contacts/${personaId}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar el contacto')
        }

        const persona = result.data
        const attrs = persona.attributes || persona

        // Transformar datos para el formulario
        const formData = {
          rut: attrs.rut || '',
          nombres: attrs.nombres || '',
          primer_apellido: attrs.primer_apellido || '',
          segundo_apellido: attrs.segundo_apellido || '',
          nombre_completo: attrs.nombre_completo || '',
          genero: attrs.genero || '',
          cumpleagno: attrs.cumpleagno || '',
          telefonos: (attrs.telefonos || []).map((t: any) => ({
            telefono_raw: t.telefono_raw || t.telefono_norm || '',
            tipo: t.tipo || '',
            principal: t.principal || false,
          })),
          emails: (attrs.emails || []).map((e: any) => ({
            email: e.email || '',
            tipo: e.tipo || '',
            principal: e.principal || false,
          })),
          activo: attrs.activo !== undefined ? attrs.activo : true,
          origen: attrs.origen || 'manual',
          nivel_confianza: attrs.nivel_confianza || 'media',
        }

        setPersonaData(formData)
      } catch (err: any) {
        console.error('Error al cargar contacto:', err)
        setError(err.message || 'Error al cargar el contacto')
      } finally {
        setLoadingData(false)
      }
    }

    fetchPersona()
  }, [personaId])

  const handleSubmit = async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      // Preparar datos para la API
      const personaData = {
        rut: data.rut,
        nombres: data.nombres,
        primer_apellido: data.primer_apellido,
        segundo_apellido: data.segundo_apellido,
        nombre_completo: data.nombre_completo,
        genero: data.genero,
        cumpleagno: data.cumpleagno,
        telefonos: data.telefonos.filter((t: any) => t.telefono_raw),
        emails: data.emails.filter((e: any) => e.email),
        activo: data.activo,
        origen: data.origen,
        nivel_confianza: data.nivel_confianza,
      }

      const response = await fetch(`/api/crm/contacts/${personaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personaData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el contacto')
      }

      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Redirigir a la ficha del contacto
      router.push(`/crm/personas/${personaId}`)
    } catch (err: any) {
      console.error('Error al actualizar contacto:', err)
      setError(err.message || 'Error al actualizar el contacto')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/crm/personas/${personaId}`)
  }

  if (loadingData) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Persona" subtitle="CRM" />
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Cargando datos del contacto...</p>
        </div>
      </Container>
    )
  }

  if (error && !personaData) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar Persona" subtitle="CRM" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Editar Persona" subtitle="CRM" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h4 className="mb-0">Editar Persona</h4>
        </CardHeader>
        <CardBody>
          {personaData && (
            <PersonaForm
              initialData={personaData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={loading}
              error={error}
            />
          )}
        </CardBody>
      </Card>
    </Container>
  )
}

export default EditarPersonaPage

