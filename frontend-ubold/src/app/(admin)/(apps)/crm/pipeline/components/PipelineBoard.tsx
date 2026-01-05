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
    const { destination, draggableId, source } = result
    
    console.log('[PipelineBoard] handleDragEnd llamado:', { destination, draggableId, source })
    
    // Si no hay destino, cancelar
    if (!destination) {
      console.log('[PipelineBoard] No hay destino, cancelando')
      return
    }

    // Si se soltó en la misma posición, no hacer nada
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('[PipelineBoard] Misma posición, no hacer nada')
      return
    }

    // Obtener todas las tareas de todas las secciones
    const allTasks = sections.flatMap((section) => getAllTasksPerSection(section.id))
    console.log('[PipelineBoard] Todas las tareas:', allTasks.map(t => ({ id: t.id, sectionId: t.sectionId })))
    
    const task = allTasks.find((t) => {
      const taskIdStr = String(t.id)
      const draggableIdStr = String(draggableId)
      console.log('[PipelineBoard] Comparando:', { taskIdStr, draggableIdStr, match: taskIdStr === draggableIdStr })
      return taskIdStr === draggableIdStr
    })
    
    if (!task) {
      console.error('[PipelineBoard] No se encontró la tarea con ID:', draggableId, 'Tareas disponibles:', allTasks.map(t => t.id))
      return
    }

    const newSectionId = destination.droppableId

    // Si la sección no cambió, no hacer nada
    if (task.sectionId === newSectionId) {
      console.log('[PipelineBoard] La tarea ya está en la misma sección:', newSectionId)
      return
    }

    console.log('[PipelineBoard] Moviendo tarea:', {
      taskId: task.id,
      taskIdType: typeof task.id,
      fromSection: task.sectionId,
      toSection: newSectionId,
    })

    // Actualizar en Strapi primero
    try {
      const taskIdStr = String(task.id)
      console.log('[PipelineBoard] Llamando onTaskMove con:', { taskId: taskIdStr, newSectionId })
      await onTaskMove(taskIdStr, newSectionId)
      console.log('[PipelineBoard] Tarea actualizada exitosamente en Strapi')
      
      // Después de actualizar en Strapi, actualizar el estado local del contexto
      // Esto mantiene la UI sincronizada mientras se recargan las tareas
      if (contextOnDragEnd) {
        console.log('[PipelineBoard] Actualizando estado local del contexto')
        contextOnDragEnd(result)
      }
    } catch (error: any) {
      console.error('[PipelineBoard] Error al actualizar oportunidad:', error)
      alert(`Error al actualizar la oportunidad: ${error.message || 'Error desconocido'}. Por favor, intenta de nuevo.`)
      // Recargar la página para restaurar el estado anterior
      window.location.reload()
    }
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
