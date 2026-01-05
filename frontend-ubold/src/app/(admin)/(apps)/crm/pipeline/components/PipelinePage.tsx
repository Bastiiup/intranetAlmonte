'use client'
import { Card, Spinner } from 'react-bootstrap'
import { useEffect, useState, useCallback } from 'react'

import { KanbanProvider } from '@/context/useKanbanContext'
import { kanbanSectionsData, getPipelineTasks, getEtapaFromSectionId, getSectionIdFromEtapa } from '@/app/(admin)/(apps)/crm/pipeline/data'
import type { KanbanTaskType } from '@/types/kanban'
import PipelineHeader from '@/app/(admin)/(apps)/crm/pipeline/components/PipelineHeader'
import PipelineBoard from '@/app/(admin)/(apps)/crm/pipeline/components/PipelineBoard'
import Modals from '@/app/(admin)/(apps)/crm/pipeline/components/Modals'
import AddOpportunityModal from '@/app/(admin)/(apps)/crm/opportunities/components/AddOpportunityModal'

const PipelinePage = () => {
  const [tasks, setTasks] = useState<KanbanTaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [defaultEtapa, setDefaultEtapa] = useState<string>('Qualification')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const pipelineTasks = await getPipelineTasks()
      setTasks(pipelineTasks)
    } catch (err: any) {
      console.error('Error al cargar tareas del pipeline:', err)
      setError(err.message || 'Error al cargar tareas del pipeline')
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar la etapa cuando se mueve un card
  const handleTaskMove = useCallback(async (taskId: string, newSectionId: string) => {
    console.log('========================================')
    console.log('[PipelinePage] 🎯 handleTaskMove INICIADO')
    console.log('[PipelinePage] Parámetros recibidos:', { taskId, newSectionId })
    
    try {
      const nuevaEtapa = getEtapaFromSectionId(newSectionId)
      console.log('[PipelinePage] 📝 Mapeo de sección a etapa:', { newSectionId, nuevaEtapa })
      
      const url = `/api/crm/oportunidades/${taskId}`
      const body = { etapa: nuevaEtapa }
      
      console.log('[PipelinePage] 🌐 Preparando request a Strapi')
      console.log('[PipelinePage] URL:', url)
      console.log('[PipelinePage] Body:', body)
      
      // Actualizar la oportunidad en Strapi
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      console.log('[PipelinePage] 📡 Response recibido')
      console.log('[PipelinePage] Status:', response.status)
      console.log('[PipelinePage] StatusText:', response.statusText)
      console.log('[PipelinePage] OK:', response.ok)

      const result = await response.json()
      console.log('[PipelinePage] 📦 Response data:', result)

      if (!response.ok || !result.success) {
        const errorMessage = result.error || result.details?.errors?.[0]?.message || 'Error al actualizar la oportunidad'
        console.error('[PipelinePage] ❌ ERROR en respuesta de Strapi')
        console.error('[PipelinePage] Error message:', errorMessage)
        console.error('[PipelinePage] Response completa:', result)
        throw new Error(errorMessage)
      }

      console.log('[PipelinePage] ✅ Oportunidad actualizada exitosamente en Strapi')
      console.log('[PipelinePage] ⏳ Programando recarga de tareas en 300ms...')
      
      // Recargar tareas después de un pequeño delay para asegurar que Strapi procesó el cambio
      // El estado local ya está actualizado (optimistic update), así que esto solo sincroniza
      setTimeout(async () => {
        console.log('[PipelinePage] 🔄 Ejecutando loadTasks()...')
        await loadTasks()
        console.log('[PipelinePage] ✅ loadTasks() completado')
      }, 300)
    } catch (err: any) {
      console.error('[PipelinePage] ❌ ERROR en handleTaskMove')
      console.error('[PipelinePage] Error completo:', err)
      console.error('[PipelinePage] Error message:', err.message)
      console.error('[PipelinePage] Error stack:', err.stack)
      throw err
    }
    
    console.log('[PipelinePage] ✅ handleTaskMove COMPLETADO')
    console.log('========================================')
  }, [loadTasks])

  // Función para abrir modal desde una sección específica
  const handleOpenAddModal = (sectionId?: string) => {
    if (sectionId) {
      const etapa = getEtapaFromSectionId(sectionId)
      setDefaultEtapa(etapa)
    }
    setAddModal(true)
  }

  // Función para recargar tareas después de crear
  const handleOpportunityCreated = () => {
    loadTasks()
    // También recargar la página para asegurar sincronización
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }


  if (loading) {
    return (
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
            <span className="ms-2">Cargando pipeline...</span>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <div className="alert alert-danger m-3" role="alert">
            <strong>Error:</strong> {error}
            <button className="btn btn-sm btn-primary ms-2" onClick={loadTasks}>
              Reintentar
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <KanbanProvider sectionsData={kanbanSectionsData} tasksData={tasks}>
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <PipelineHeader onAddClick={() => handleOpenAddModal()} />
          <PipelineBoard onTaskMove={handleTaskMove} onAddClick={handleOpenAddModal} />
          <Modals />
        </Card>
      </div>
      
      {/* Modal de agregar oportunidad */}
      <AddOpportunityModal
        show={addModal}
        onHide={() => setAddModal(false)}
        onSuccess={handleOpportunityCreated}
        defaultEtapa={defaultEtapa}
      />
    </KanbanProvider>
  )
}

export default PipelinePage
