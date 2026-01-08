'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useNotificationContext } from '@/context/useNotificationContext'
import PersonaForm from '../components/PersonaForm'

const NuevaPersonaPage = () => {
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personaData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear el contacto')
      }

      // Obtener ID de la persona creada
      const personaId = result.data?.documentId || result.data?.id
      if (!personaId) {
        throw new Error('No se pudo obtener el ID de la persona creada')
      }

      // Crear trayectorias si existen
      if (data.trayectorias && Array.isArray(data.trayectorias) && data.trayectorias.length > 0) {
        const trayectoriasToCreate = data.trayectorias.filter((t: any) => !t.toDelete && t.colegioId)
        
        for (const trayectoria of trayectoriasToCreate) {
          try {
            await fetch('/api/persona-trayectorias', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  persona: { connect: [parseInt(String(personaId))] },
                  colegio: { connect: [parseInt(String(trayectoria.colegioId))] },
                  cargo: trayectoria.cargo || null,
                  curso: trayectoria.curso || null,
                  nivel: trayectoria.nivel || null,
                  grado: trayectoria.grado || null,
                  is_current: trayectoria.is_current || false,
                },
              }),
            })
          } catch (err) {
            console.error('Error al crear trayectoria:', err)
            // No lanzar error, solo loguear
          }
        }
      }

      // Mostrar notificación de éxito
      showNotification({
        title: 'Éxito',
        message: 'Colaborador creado correctamente',
        variant: 'success',
      })

      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Redirigir a la ficha del contacto creado después de un breve delay
      setTimeout(() => {
        router.push(`/crm/personas/${personaId}`)
      }, 1000)
    } catch (err: any) {
      console.error('Error al crear contacto:', err)
      setError(err.message || 'Error al crear el contacto')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/crm/personas')
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Nueva Persona" subtitle="CRM" />
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h4 className="mb-0">Crear Nueva Persona</h4>
        </CardHeader>
        <CardBody>
          <PersonaForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            error={error}
          />
        </CardBody>
      </Card>
    </Container>
  )
}

export default NuevaPersonaPage

