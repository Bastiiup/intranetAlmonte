'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Container, Card, CardHeader, CardBody, Alert, Spinner } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useNotificationContext } from '@/context/useNotificationContext'
import PersonaForm from '../../components/PersonaForm'

const EditarPersonaPage = () => {
  const router = useRouter()
  const params = useParams()
  const personaId = params?.id as string
  const { showNotification } = useNotificationContext()

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

        // Transformar trayectorias
        const trayectorias = (attrs.trayectorias || []).map((t: any) => {
          const tAttrs = t.attributes || t
          const colegio = tAttrs.colegio?.data?.attributes || tAttrs.colegio?.attributes || tAttrs.colegio
          return {
            id: t.id || t.documentId,
            documentId: t.documentId || String(t.id || ''),
            colegioId: colegio?.id || colegio?.documentId,
            colegioNombre: colegio?.colegio_nombre || 'Sin nombre',
            cargo: tAttrs.cargo || '',
            curso: tAttrs.curso || '',
            nivel: tAttrs.nivel || '',
            grado: tAttrs.grado || '',
            is_current: tAttrs.is_current !== undefined ? tAttrs.is_current : false,
          }
        })

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
          trayectorias: trayectorias,
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

      // Gestionar trayectorias
      if (data.trayectorias && Array.isArray(data.trayectorias)) {
        const trayectoriasToCreate = data.trayectorias.filter((t: any) => t.isNew && !t.toDelete)
        const trayectoriasToUpdate = data.trayectorias.filter((t: any) => !t.isNew && !t.toDelete && t.isEditing)
        const trayectoriasToDelete = data.trayectorias.filter((t: any) => t.toDelete && !t.isNew)

        // Crear nuevas trayectorias
        for (const trayectoria of trayectoriasToCreate) {
          try {
            await fetch('/api/persona-trayectorias', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  persona: { connect: [parseInt(personaId)] },
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
          }
        }

        // Actualizar trayectorias existentes
        for (const trayectoria of trayectoriasToUpdate) {
          try {
            const trayectoriaId = trayectoria.documentId || trayectoria.id
            if (trayectoriaId) {
              await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  data: {
                    colegio: { connect: [parseInt(String(trayectoria.colegioId))] },
                    cargo: trayectoria.cargo || null,
                    curso: trayectoria.curso || null,
                    nivel: trayectoria.nivel || null,
                    grado: trayectoria.grado || null,
                    is_current: trayectoria.is_current || false,
                  },
                }),
              })
            }
          } catch (err) {
            console.error('Error al actualizar trayectoria:', err)
          }
        }

        // Eliminar trayectorias
        for (const trayectoria of trayectoriasToDelete) {
          try {
            const trayectoriaId = trayectoria.documentId || trayectoria.id
            if (trayectoriaId) {
              await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
                method: 'DELETE',
              })
            }
          } catch (err) {
            console.error('Error al eliminar trayectoria:', err)
          }
        }
      }

      // Mostrar notificación de éxito
      showNotification({
        title: 'Éxito',
        message: 'Colaborador actualizado correctamente',
        variant: 'success',
      })

      // Revalidar datos para sincronización bidireccional
      router.refresh()
      
      // Redirigir a la ficha del contacto después de un breve delay
      setTimeout(() => {
        router.push(`/crm/personas/${personaId}`)
      }, 1000)
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

