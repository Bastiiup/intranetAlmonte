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
  const { sections, getAllTasksPerSection, newTaskModal } = useKanbanContext()
  
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
    
    // Si no hay destino, cancelar
    if (!destination) return

    // Si se soltó en la misma posición, no hacer nada
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Obtener todas las tareas de todas las secciones
    const allTasks = sections.flatMap((section) => getAllTasksPerSection(section.id))
    const task = allTasks.find((t) => String(t.id) === String(draggableId))
    
    if (!task) {
      console.error('[PipelineBoard] No se encontró la tarea con ID:', draggableId)
      return
    }

    const newSectionId = destination.droppableId

    // Si la sección no cambió, no hacer nada
    if (task.sectionId === newSectionId) {
      console.log('[PipelineBoard] La tarea ya está en la misma sección')
      return
    }

    console.log('[PipelineBoard] Moviendo tarea:', {
      taskId: task.id,
      fromSection: task.sectionId,
      toSection: newSectionId,
    })

    // Actualizar en Strapi
    try {
      await onTaskMove(String(task.id), newSectionId)
      console.log('[PipelineBoard] Tarea actualizada exitosamente')
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
                      {getAllTasksPerSection(section.id).map((task, idx) => (
                        <Draggable draggableId={task.id} index={idx} key={task.id}>
                          {(provided) => (
                            <li className="kanban-item" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <TaskItem item={task} />
                            </li>
                          )}
                        </Draggable>
                      ))}
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
