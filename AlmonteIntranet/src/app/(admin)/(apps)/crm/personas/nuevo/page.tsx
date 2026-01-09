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
        // Obtener el ID numérico de la persona si es documentId
        let personaIdNum: number | null = null
        const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
        
        if (isDocumentId) {
          try {
            const personaResponse = await fetch(`/api/crm/contacts/${personaId}?fields=id`)
            const personaResult = await personaResponse.json()
            if (personaResult.success && personaResult.data) {
              const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
              if (personaData && typeof personaData === 'object' && 'id' in personaData) {
                personaIdNum = personaData.id as number
                console.log('✅ [NuevaPersonaPage] ID numérico de persona obtenido:', personaIdNum)
              }
            }
          } catch (err) {
            console.error('❌ [NuevaPersonaPage] Error obteniendo ID numérico de persona:', err)
          }
        } else {
          personaIdNum = parseInt(String(personaId))
        }

        if (!personaIdNum || isNaN(personaIdNum)) {
          console.error('❌ [NuevaPersonaPage] No se pudo obtener ID numérico de persona:', personaId)
          // No lanzar error, solo loguear y continuar
        } else {
          const trayectoriasToCreate = data.trayectorias.filter((t: any) => !t.toDelete && t.colegioId)
          
          for (const trayectoria of trayectoriasToCreate) {
            try {
              // Validar colegioId
              const colegioIdNum = trayectoria.colegioId ? parseInt(String(trayectoria.colegioId)) : null
              if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
                console.warn('⚠️ [NuevaPersonaPage] ID de colegio inválido, omitiendo trayectoria:', {
                  colegioId: trayectoria.colegioId,
                  colegioIdNum,
                  cargo: trayectoria.cargo,
                })
                continue
              }

              console.log('📤 [NuevaPersonaPage] Creando trayectoria:', {
                personaId: personaIdNum,
                colegioId: colegioIdNum,
                cargo: trayectoria.cargo,
              })

              await fetch('/api/persona-trayectorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  data: {
                    persona: { connect: [personaIdNum] },
                    colegio: { connect: [colegioIdNum] },
                    cargo: trayectoria.cargo || null,
                    anio: trayectoria.anio ? parseInt(String(trayectoria.anio)) : null,
                    curso: trayectoria.cursoId ? { connect: [parseInt(String(trayectoria.cursoId))] } : null,
                    asignatura: trayectoria.asignaturaId ? { connect: [parseInt(String(trayectoria.asignaturaId))] } : null,
                    is_current: trayectoria.is_current || false,
                    activo: true,
                  },
                }),
              })
              console.log('✅ [NuevaPersonaPage] Trayectoria creada exitosamente')
            } catch (err: any) {
              console.error('❌ [NuevaPersonaPage] Error al crear trayectoria:', {
                message: err.message,
                trayectoria,
              })
              // No lanzar error, solo loguear
            }
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

