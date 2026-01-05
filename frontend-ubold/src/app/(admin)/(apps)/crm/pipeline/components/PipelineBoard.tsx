import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import { useKanbanContext } from '@/context/useKanbanContext'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Button, CardBody } from 'react-bootstrap'
import { TbPlus } from 'react-icons/tb'
import TaskItem from '@/app/(admin)/(apps)/crm/pipeline/components/TaskItem'
import type { DropResult } from '@hello-pangea/dnd'
import { getEtapaFromSectionId } from '../data'

type PipelineBoardProps = {
  onTaskMove: (taskId: string, newSectionId: string) => Promise<void>
  onAddClick?: (sectionId?: string) => void
}

const PipelineBoard = ({ onTaskMove, onAddClick }: PipelineBoardProps) => {
  const { sections, getAllTasksPerSection, newTaskModal, onDragEnd: contextOnDragEnd } = useKanbanContext()
  
  const handleAddClick = (sectionId: string) => {
    if (onAddClick) {
      onAddClick(sectionId)
    } else {
      // Fallback al comportamiento original si no hay callback
      newTaskModal.toggle(sectionId)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    console.log('========================================')
    console.log('[PipelineBoard] 🎯 handleDragEnd INICIADO')
    console.log('[PipelineBoard] Result completo:', JSON.stringify(result, null, 2))
    console.log('[PipelineBoard] destination:', result.destination)
    console.log('[PipelineBoard] draggableId:', result.draggableId, 'tipo:', typeof result.draggableId)
    console.log('[PipelineBoard] source:', result.source)
    
    const { destination, draggableId, source } = result
    
    // Si no hay destino, cancelar
    if (!destination) {
      console.log('[PipelineBoard] ❌ No hay destino, cancelando drag')
      console.log('========================================')
      return
    }

    // Si se soltó en la misma posición, no hacer nada
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('[PipelineBoard] ⚠️ Misma posición, no hacer nada')
      console.log('========================================')
      return
    }

    console.log('[PipelineBoard] ✅ Hay destino válido:', destination.droppableId)
    console.log('[PipelineBoard] 📋 Secciones disponibles:', sections.map(s => ({ id: s.id, title: s.title })))

    // Obtener todas las tareas de todas las secciones
    const allTasks = sections.flatMap((section) => getAllTasksPerSection(section.id))
    console.log('[PipelineBoard] 📦 Total de tareas encontradas:', allTasks.length)
    console.log('[PipelineBoard] 📦 Tareas por sección:')
    sections.forEach(section => {
      const sectionTasks = getAllTasksPerSection(section.id)
      console.log(`  - ${section.title} (${section.id}): ${sectionTasks.length} tareas`, 
        sectionTasks.map(t => ({ id: t.id, idType: typeof t.id, title: t.title })))
    })
    
    console.log('[PipelineBoard] 🔍 Buscando tarea con draggableId:', draggableId)
    const task = allTasks.find((t) => {
      const taskIdStr = String(t.id)
      const draggableIdStr = String(draggableId)
      const match = taskIdStr === draggableIdStr
      if (match) {
        console.log('[PipelineBoard] ✅ TAREA ENCONTRADA:', { taskId: taskIdStr, title: t.title, sectionId: t.sectionId })
      }
      return match
    })
    
    if (!task) {
      console.error('[PipelineBoard] ❌ ERROR: No se encontró la tarea')
      console.error('[PipelineBoard] draggableId buscado:', draggableId)
      console.error('[PipelineBoard] Tareas disponibles:', allTasks.map(t => ({ id: t.id, idType: typeof t.id, title: t.title })))
      console.log('========================================')
      return
    }

    const newSectionId = destination.droppableId
    console.log('[PipelineBoard] 📍 Sección actual:', task.sectionId)
    console.log('[PipelineBoard] 📍 Sección destino:', newSectionId)

    // Si la sección no cambió, no hacer nada
    if (task.sectionId === newSectionId) {
      console.log('[PipelineBoard] ⚠️ La tarea ya está en la misma sección:', newSectionId)
      console.log('========================================')
      return
    }

    console.log('[PipelineBoard] 🚀 INICIANDO MOVIMIENTO DE TAREA')
    console.log('[PipelineBoard] Tarea:', {
      id: task.id,
      idType: typeof task.id,
      title: task.title,
      fromSection: task.sectionId,
      toSection: newSectionId,
    })

    // Actualizar el estado local primero para feedback inmediato (optimistic update)
    if (contextOnDragEnd) {
      console.log('[PipelineBoard] 🔄 Llamando contextOnDragEnd para optimistic update...')
      try {
        contextOnDragEnd(result)
        console.log('[PipelineBoard] ✅ contextOnDragEnd ejecutado exitosamente')
      } catch (contextError: any) {
        console.error('[PipelineBoard] ❌ Error en contextOnDragEnd:', contextError)
      }
    } else {
      console.warn('[PipelineBoard] ⚠️ contextOnDragEnd no está disponible')
    }

    // Luego actualizar en Strapi
    try {
      const taskIdStr = String(task.id)
      console.log('[PipelineBoard] 🌐 Llamando onTaskMove (API Strapi)...')
      console.log('[PipelineBoard] Parámetros:', { taskId: taskIdStr, newSectionId })
      
      await onTaskMove(taskIdStr, newSectionId)
      
      console.log('[PipelineBoard] ✅ Tarea actualizada exitosamente en Strapi')
      console.log('[PipelineBoard] ⏳ Programando sincronización en 500ms...')
      
      // Recargar tareas después de un pequeño delay para asegurar que Strapi procesó el cambio
      setTimeout(async () => {
        console.log('[PipelineBoard] 🔄 Sincronizando con Strapi...')
        // Esto se maneja en PipelinePage con loadTasks()
      }, 500)
    } catch (error: any) {
      console.error('[PipelineBoard] ❌ ERROR al actualizar oportunidad en Strapi')
      console.error('[PipelineBoard] Error completo:', error)
      console.error('[PipelineBoard] Error message:', error.message)
      console.error('[PipelineBoard] Error stack:', error.stack)
      
      // Revertir el cambio optimista si falla
      if (contextOnDragEnd) {
        console.log('[PipelineBoard] 🔄 Revirtiendo cambio optimista...')
        const revertResult = {
          ...result,
          destination: source,
          source: destination,
        }
        try {
          contextOnDragEnd(revertResult)
          console.log('[PipelineBoard] ✅ Cambio revertido')
        } catch (revertError: any) {
          console.error('[PipelineBoard] ❌ Error al revertir:', revertError)
        }
      }
      
      alert(`Error al actualizar la oportunidad: ${error.message || 'Error desconocido'}. Por favor, intenta de nuevo.`)
    }
    
    console.log('[PipelineBoard] ✅ handleDragEnd COMPLETADO')
    console.log('========================================')
  }

  return (
    <CardBody className="p-0">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-content">
          {sections.map((section) => (
            <Droppable key={section.id} droppableId={section.id}>
              {(provided) => (
                <div className={`kanban-board bg-${section.variant} bg-opacity-10`} ref={provided.innerRef}>
                  <div className="kanban-item py-2 px-3 d-flex align-items-center">
                    <h5 className="m-0">
                      {section.title} ({getAllTasksPerSection(section.id).length})
                    </h5>
                    <Button className="ms-auto btn btn-sm btn-icon rounded-circle btn-primary" onClick={() => handleAddClick(section.id)}>
                      <TbPlus />
                    </Button>
                  </div>
                  <SimplebarClient className="kanban-board-group px-2">
                    <ul>
                      {getAllTasksPerSection(section.id).map((task, idx) => {
                        const taskIdStr = String(task.id)
                        return (
                          <Draggable key={taskIdStr} draggableId={taskIdStr} index={idx}>
                            {(provided, snapshot) => (
                              <li 
                                className={`kanban-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.5 : 1,
                                }}
                              >
                                <TaskItem item={task} />
                              </li>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </ul>
                  </SimplebarClient>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </CardBody>
  )
}

export default PipelineBoard
