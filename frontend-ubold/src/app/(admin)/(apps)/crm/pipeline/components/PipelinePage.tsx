'use client'
import { Card, Spinner } from 'react-bootstrap'
import { useEffect, useState, useCallback } from 'react'

import { KanbanProvider } from '@/context/useKanbanContext'
import { kanbanSectionsData, getPipelineTasks, getEtapaFromSectionId } from '@/app/(admin)/(apps)/crm/pipeline/data'
import type { KanbanTaskType } from '@/types/kanban'
import PipelineHeader from '@/app/(admin)/(apps)/crm/pipeline/components/PipelineHeader'
import PipelineBoard from '@/app/(admin)/(apps)/crm/pipeline/components/PipelineBoard'
import Modals from '@/app/(admin)/(apps)/crm/pipeline/components/Modals'

const PipelinePage = () => {
  const [tasks, setTasks] = useState<KanbanTaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    try {
      const nuevaEtapa = getEtapaFromSectionId(newSectionId)
      
      // Actualizar la oportunidad en Strapi
      const response = await fetch(`/api/crm/oportunidades/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          etapa: nuevaEtapa,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar la oportunidad')
      }
    } catch (err: any) {
      console.error('Error al actualizar oportunidad:', err)
      throw err
    }
  }, [])


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
          <PipelineHeader />
          <PipelineBoard onTaskMove={handleTaskMove} />
          <Modals />
        </Card>
      </div>
    </KanbanProvider>
  )
}

export default PipelinePage
