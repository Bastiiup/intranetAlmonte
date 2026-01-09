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

        console.log('🔍 [EditarPersonaPage] Fetching persona:', personaId)
        console.log('📥 [EditarPersonaPage] Persona data recibida:', JSON.stringify(attrs, null, 2))

        // Transformar trayectorias con TODOS los datos
        const trayectorias = (attrs.trayectorias?.data || attrs.trayectorias || []).map((t: any) => {
          const tAttrs = t.attributes || t

          // Extraer colegio completo
          const colegioData = tAttrs.colegio?.data || tAttrs.colegio
          const colegioAttrs = colegioData?.attributes || colegioData

          // Extraer comuna del colegio
          const comunaData = colegioAttrs?.comuna?.data || colegioAttrs?.comuna
          const comunaAttrs = comunaData?.attributes || comunaData

          // ⚠️ Extraer curso (ES UNA RELACIÓN)
          const cursoData = tAttrs.curso?.data || tAttrs.curso
          const cursoAttrs = cursoData?.attributes || cursoData

          // ⚠️ Extraer asignatura (ES UNA RELACIÓN)
          const asignaturaData = tAttrs.asignatura?.data || tAttrs.asignatura
          const asignaturaAttrs = asignaturaData?.attributes || asignaturaData

          const trayectoriaTransformada = {
            id: t.id || t.documentId,
            documentId: t.documentId || String(t.id || ''),

            // Datos del colegio (para mostrar)
            colegioId: colegioData?.id || colegioData?.documentId,
            colegioNombre: colegioAttrs?.colegio_nombre || 'Sin nombre',
            colegioRBD: colegioAttrs?.rbd || '',
            colegioDependencia: colegioAttrs?.dependencia || '', // ✅ DEPENDENCIA
            colegioRegion: colegioAttrs?.region || '', // ✅ REGIÓN
            colegioZona: colegioAttrs?.zona || '',

            // Datos de la comuna (para mostrar)
            comunaId: comunaData?.id || comunaData?.documentId,
            comunaNombre: comunaAttrs?.nombre || comunaAttrs?.comuna_nombre || '', // ✅ COMUNA

            // Datos de la trayectoria
            cargo: tAttrs.cargo || '', // ✅ CARGO
            anio: tAttrs.anio || null, // ⚠️ Usar anio, NO nivel ni grado

            // ⚠️ Datos del curso (RELACIÓN)
            cursoId: cursoData?.id || cursoData?.documentId,
            cursoNombre: cursoAttrs?.nombre || '', // ✅ CURSO

            // ⚠️ Datos de la asignatura (RELACIÓN)
            asignaturaId: asignaturaData?.id || asignaturaData?.documentId,
            asignaturaNombre: asignaturaAttrs?.nombre || '', // ✅ ASIGNATURA

            // Estados
            is_current: tAttrs.is_current !== undefined ? tAttrs.is_current : false,
            activo: tAttrs.activo !== undefined ? tAttrs.activo : true,

            // Fechas
            fecha_inicio: tAttrs.fecha_inicio || null,
            fecha_fin: tAttrs.fecha_fin || null,

            // Notas
            notas: tAttrs.notas || '',
          }

          console.log('📍 [EditarPersonaPage] Trayectoria transformada:', trayectoriaTransformada)

          return trayectoriaTransformada
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
        // Obtener el ID numérico de la persona si es documentId
        let personaIdNum: number | null = null
        const isDocumentId = typeof personaId === 'string' && !/^\d+$/.test(personaId)
        
        if (isDocumentId) {
          try {
            // Obtener el ID numérico de la persona desde la respuesta del PUT
            const personaResponse = await fetch(`/api/crm/contacts/${personaId}?fields=id`)
            const personaResult = await personaResponse.json()
            if (personaResult.success && personaResult.data) {
              const personaData = Array.isArray(personaResult.data) ? personaResult.data[0] : personaResult.data
              if (personaData && typeof personaData === 'object' && 'id' in personaData) {
                personaIdNum = personaData.id as number
                console.log('✅ [EditarPersonaPage] ID numérico de persona obtenido:', personaIdNum)
              }
            }
          } catch (err) {
            console.error('❌ [EditarPersonaPage] Error obteniendo ID numérico de persona:', err)
          }
        } else {
          personaIdNum = parseInt(personaId)
        }

        if (!personaIdNum || isNaN(personaIdNum)) {
          console.error('❌ [EditarPersonaPage] No se pudo obtener ID numérico de persona:', personaId)
          throw new Error('No se pudo obtener el ID de la persona para crear trayectorias')
        }

        const trayectoriasToCreate = data.trayectorias.filter((t: any) => t.isNew && !t.toDelete)
        const trayectoriasToUpdate = data.trayectorias.filter((t: any) => !t.isNew && !t.toDelete && t.isEditing)
        const trayectoriasToDelete = data.trayectorias.filter((t: any) => t.toDelete && !t.isNew)

        // Crear nuevas trayectorias
        for (const trayectoria of trayectoriasToCreate) {
          try {
            // Validar colegioId
            const colegioIdNum = trayectoria.colegioId ? parseInt(String(trayectoria.colegioId)) : null
            if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
              console.warn('⚠️ [EditarPersonaPage] ID de colegio inválido, omitiendo trayectoria:', {
                colegioId: trayectoria.colegioId,
                colegioIdNum,
                cargo: trayectoria.cargo,
              })
              continue
            }

            console.log('📤 [EditarPersonaPage] Creando trayectoria:', {
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
            console.log('✅ [EditarPersonaPage] Trayectoria creada exitosamente')
          } catch (err: any) {
            console.error('❌ [EditarPersonaPage] Error al crear trayectoria:', {
              message: err.message,
              trayectoria,
            })
            // Continuar con las demás trayectorias
          }
        }

        // Actualizar trayectorias existentes
        for (const trayectoria of trayectoriasToUpdate) {
          try {
            const trayectoriaId = trayectoria.documentId || trayectoria.id
            if (!trayectoriaId) {
              console.warn('⚠️ [EditarPersonaPage] Trayectoria sin ID, omitiendo actualización:', trayectoria)
              continue
            }

            // Validar colegioId
            const colegioIdNum = trayectoria.colegioId ? parseInt(String(trayectoria.colegioId)) : null
            if (!colegioIdNum || colegioIdNum === 0 || isNaN(colegioIdNum)) {
              console.warn('⚠️ [EditarPersonaPage] ID de colegio inválido, omitiendo actualización:', {
                trayectoriaId,
                colegioId: trayectoria.colegioId,
                colegioIdNum,
              })
              continue
            }

            console.log('📤 [EditarPersonaPage] Actualizando trayectoria:', {
              trayectoriaId,
              colegioId: colegioIdNum,
              cargo: trayectoria.cargo,
            })

            await fetch(`/api/persona-trayectorias/${trayectoriaId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: {
                  colegio: { connect: [colegioIdNum] },
                  cargo: trayectoria.cargo || null,
                  anio: trayectoria.anio ? parseInt(String(trayectoria.anio)) : null,
                  curso: trayectoria.cursoId ? { connect: [parseInt(String(trayectoria.cursoId))] } : null,
                  asignatura: trayectoria.asignaturaId ? { connect: [parseInt(String(trayectoria.asignaturaId))] } : null,
                  is_current: trayectoria.is_current || false,
                },
              }),
            })
            console.log('✅ [EditarPersonaPage] Trayectoria actualizada exitosamente')
          } catch (err: any) {
            console.error('❌ [EditarPersonaPage] Error al actualizar trayectoria:', {
              message: err.message,
              trayectoria,
            })
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

      // ✅ CRÍTICO: Forzar refresco
      router.refresh()

      // Esperar un momento para que Strapi procese
      await new Promise(resolve => setTimeout(resolve, 500))

      // Redirigir al colegio si se asignó uno, o a la ficha del contacto
      const trayectoriaActual = data.trayectorias?.find((t: any) => t.is_current && !t.toDelete)
      if (trayectoriaActual?.colegioId) {
        router.push(`/crm/colegios/${trayectoriaActual.colegioId}`)
      } else {
        router.push(`/crm/personas/${personaId}`)
      }
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

