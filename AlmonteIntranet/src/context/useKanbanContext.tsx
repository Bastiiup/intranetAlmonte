'use client'
import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import { KanbanDialogType, KanbanProviderProps, KanbanSectionType, KanbanTaskType, KanbanType } from '@/types/kanban'
import type { DropResult } from '@hello-pangea/dnd'
import { yupResolver } from '@hookform/resolvers/yup'
import { createContext, startTransition, use, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { VariantType } from '@/types'

const defaultUsers = [user1, user2, user3]
const KanbanContext = createContext<KanbanType | undefined>(undefined)

export const kanbanTaskSchema = yup.object({
  title: yup.string().required('Please enter project title'),
  userName: yup.string().required('Please enter username'),
  date: yup.string().required('Please enter project Date'),
  amount: yup.number().required('Please enter amount'),
  companyName: yup.mixed<KanbanTaskType['company']>().required('Please Enter Company Name'),
})

export type TaskFormFields = yup.InferType<typeof kanbanTaskSchema>

export const kanbanSectionSchema = yup.object({
  sectionTitle: yup.string().required('Section title is required'),
  sectionVariant: yup.mixed<VariantType>().required('Section variant is required'),
})

export type SectionFormFields = yup.InferType<typeof kanbanSectionSchema>

const useKanbanContext = () => {
  const context = use(KanbanContext)
  if (!context) {
    throw new Error('useKanbanContext can only be used within KanbanProvider')
  }
  return context
}

const KanbanProvider = ({ children, tasksData, sectionsData }: KanbanProviderProps) => {
  const [sections, setSections] = useState<KanbanSectionType[]>(sectionsData)
  const [tasks, setTasks] = useState<KanbanTaskType[]>(tasksData)
  const [activeSectionId, setActiveSectionId] = useState<KanbanSectionType['id']>()
  const [activeTaskId, setActiveTaskId] = useState<KanbanTaskType['id']>()
  const [taskFormData, setTaskFormData] = useState<KanbanTaskType>()
  const [sectionFormData, setSectionFormData] = useState<KanbanSectionType>()
  const [dialogStates, setDialogStates] = useState<KanbanDialogType>({
    showNewTaskModal: false,
    showSectionModal: false,
  })

  // Sincronizar estado cuando cambian las props
  useEffect(() => {
    setTasks(tasksData)
  }, [tasksData])

  useEffect(() => {
    setSections(sectionsData)
  }, [sectionsData])

  const {
    control: newTaskControl,
    handleSubmit: newTaskHandleSubmit,
    reset: newTaskReset,
  } = useForm({
    resolver: yupResolver(kanbanTaskSchema),
  })

  const {
    control: sectionControl,
    handleSubmit: sectionHandleSubmit,
    reset: sectionReset,
  } = useForm({
    resolver: yupResolver(kanbanSectionSchema),
  })

  const emptySectionForm = useCallback(() => {
    sectionReset({ sectionTitle: '', sectionVariant: 'primary' })
  }, [])

  const emptyTaskForm = useCallback(() => {
    newTaskReset({
      title: undefined,
      companyName: undefined,
      amount: undefined,
      date: undefined,
    })
  }, [])

  const toggleNewTaskModal = (sectionId?: KanbanSectionType['id'], taskId?: KanbanTaskType['id']) => {
    if (sectionId) setActiveSectionId(sectionId)
    if (taskId) {
      const foundTask = tasks.find((task) => task.id === taskId)
      if (foundTask) {
        newTaskReset({
          title: foundTask.title,
          amount: foundTask.amount,
          companyName: foundTask.company,
          date: foundTask.date,
        })
        startTransition(() => {
          setActiveTaskId(taskId)
        })
        startTransition(() => {
          setTaskFormData(foundTask)
        })
      }
    }
    if (dialogStates.showNewTaskModal) emptyTaskForm()
    startTransition(() => {
      setDialogStates({ ...dialogStates, showNewTaskModal: !dialogStates.showNewTaskModal })
    })
  }

  const toggleSectionModal = (sectionId?: KanbanSectionType['id']) => {
    console.log(sectionFormData)
    if (sectionId) {
      const foundSection = sections.find((section) => section.id === sectionId)
      if (foundSection) {
        startTransition(() => {
          setSectionFormData(foundSection)
        })
        startTransition(() => {
          setActiveSectionId(foundSection.id)
        })
        sectionReset({
          sectionTitle: foundSection.title,
          sectionVariant: foundSection.variant,
        })
      }
    }
    if (dialogStates.showSectionModal) emptySectionForm()
    startTransition(() => {
      setDialogStates({ ...dialogStates, showSectionModal: !dialogStates.showSectionModal })
    })
  }

  const getAllTasksPerSection = useCallback(
    (id: KanbanSectionType['id']) => {
      return tasks.filter((task) => task.sectionId == id)
    },
    [tasks],
  )

  const handleNewTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      companyName: values.companyName,
      amount: values.amount,
      userName: values.userName,
      date: values.date,
    }

    if (activeSectionId) {
      const newTask: KanbanTaskType = {
        ...formData,
        title: formData.title,
        company: formData.companyName,
        amount: formData.amount,
        date: formData.date,
        tasks: taskFormData?.tasks || 5,
        messages: taskFormData?.messages || 2,
        userName: formData.userName,
        user: taskFormData?.user || defaultUsers[0],
        status: taskFormData?.status || 'lead',
        sectionId: activeSectionId,
        id: Number(tasks.slice(-1)[0].id) + 1 + '',
      }
      setTasks([...tasks, newTask])
    }
    startTransition(() => {
      toggleNewTaskModal()
    })
    setActiveSectionId(undefined)
    newTaskReset()
  })

  const handleEditTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      userName: values.userName,
      amount: values.amount,
      companyName: values.companyName,
      date: values.date,
    }

    if (activeSectionId && activeTaskId) {
      const newTask: KanbanTaskType = {
        ...formData,
        title: formData.title,
        userName: formData.userName,
        company: formData.companyName,
        amount: formData.amount,
        tasks: taskFormData?.tasks || 5,
        messages: taskFormData?.messages || 2,
        date: formData.date,
        user: taskFormData?.user || defaultUsers[0],
        sectionId: activeSectionId,
        status: taskFormData?.status || 'lead',
        id: activeTaskId,
      }
      setTasks(tasks.map((t) => (t.id === activeTaskId ? newTask : t)))
    }
    startTransition(() => {
      toggleNewTaskModal()
    })
    startTransition(() => {
      setActiveSectionId(undefined)
    })
    startTransition(() => {
      newTaskReset()
    })
    startTransition(() => {
      setTaskFormData(undefined)
    })
  })



  const handleDeleteTask = (taskId: KanbanTaskType['id']) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const onDragEnd = (result: DropResult) => {
    console.log('========================================')
    console.log('[KanbanContext] 🎯 onDragEnd INICIADO')
    console.log('[KanbanContext] Result:', JSON.stringify(result, null, 2))
    
    const { destination, draggableId } = result
    if (!destination) {
      console.log('[KanbanContext] ❌ No hay destino, cancelando')
      console.log('========================================')
      return
    }

    console.log('[KanbanContext] 📦 Total de tareas en estado:', tasks.length)
    console.log('[KanbanContext] 🔍 Buscando tarea con ID:', draggableId)
    
    const taskIndex = tasks.findIndex((task) => {
      const taskIdStr = String(task.id)
      const draggableIdStr = String(draggableId)
      const match = taskIdStr === draggableIdStr
      if (match) {
        console.log('[KanbanContext] ✅ Tarea encontrada en índice:', taskIndex)
      }
      return match
    })
    
    if (taskIndex === -1) {
      console.error('[KanbanContext] ❌ ERROR: Tarea no encontrada')
      console.error('[KanbanContext] draggableId buscado:', draggableId)
      console.error('[KanbanContext] Tareas disponibles:', tasks.map(t => ({ id: t.id, idType: typeof t.id, title: t.title })))
      console.log('========================================')
      return
    }

    const task = tasks[taskIndex]
    console.log('[KanbanContext] 📋 Tarea encontrada:', { id: task.id, title: task.title, currentSection: task.sectionId })
    console.log('[KanbanContext] 📍 Nueva sección:', destination.droppableId)

    let newTasks = tasks.filter((t) => String(t.id) !== String(draggableId))
    console.log('[KanbanContext] 📦 Tareas después de filtrar:', newTasks.length)

    const updatedTask = { ...task, sectionId: destination.droppableId }
    console.log('[KanbanContext] ✏️ Tarea actualizada:', updatedTask)

    let destIdx = 0
    let count = 0
    for (let i = 0; i < newTasks.length; i++) {
      if (newTasks[i].sectionId === destination.droppableId) {
        if (count === destination.index) {
          destIdx = i
          break
        }
        count++
      }
      if (i === newTasks.length - 1) {
        destIdx = newTasks.length
      }
    }

    console.log('[KanbanContext] 📍 Índice destino calculado:', destIdx)

    newTasks = [...newTasks.slice(0, destIdx), updatedTask, ...newTasks.slice(destIdx)]
    console.log('[KanbanContext] 📦 Nuevas tareas ordenadas:', newTasks.length)
    console.log('[KanbanContext] 📋 Tareas por sección después del cambio:')
    const sectionsMap = new Map<string, number>()
    newTasks.forEach(t => {
      const count = sectionsMap.get(t.sectionId) || 0
      sectionsMap.set(t.sectionId, count + 1)
    })
    sectionsMap.forEach((count, sectionId) => {
      console.log(`  - ${sectionId}: ${count} tareas`)
    })

    console.log('[KanbanContext] 🔄 Llamando setTasks...')
    setTasks(newTasks)
    console.log('[KanbanContext] ✅ setTasks ejecutado')
    console.log('[KanbanContext] ✅ onDragEnd COMPLETADO')
    console.log('========================================')
  }

  const handleNewSection = sectionHandleSubmit((values: SectionFormFields) => {
    const section: KanbanSectionType = {
      // TODO test, test when array is empty
      id: Number(sections.slice(-1)[0].id) + 1 + '',
      title: values.sectionTitle,
      variant: values.sectionVariant,
    }
    setSections([...sections, section])
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleEditSection = sectionHandleSubmit((values: SectionFormFields) => {
    if (activeSectionId) {
      const newSection = {
        id: activeSectionId,
        title: values.sectionTitle,
        variant: values.sectionVariant,
      }
      setSections(
        sections.map((section) => {
          return section.id === activeSectionId ? newSection : section
        }),
      )
    }
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleDeleteSection = (sectionId: KanbanSectionType['id']) => {
    setSections(sections.filter((section) => section.id !== sectionId))
  }

  return (
    <KanbanContext.Provider
      value={useMemo(
        () => ({
          sections,
          activeSectionId,
          taskFormData,
          sectionFormData,
          newTaskModal: {
            open: dialogStates.showNewTaskModal,
            toggle: toggleNewTaskModal,
          },
          sectionModal: {
            open: dialogStates.showSectionModal,
            toggle: toggleSectionModal,
          },
          taskForm: {
            control: newTaskControl,
            newRecord: handleNewTask,
            editRecord: handleEditTask,
            deleteRecord: handleDeleteTask,
          },
          sectionForm: {
            control: sectionControl,
            newRecord: handleNewSection,
            editRecord: handleEditSection,
            deleteRecord: handleDeleteSection,
          },
          getAllTasksPerSection,
          onDragEnd,
        }),
        [sections, tasks, activeSectionId, taskFormData, sectionFormData, dialogStates],
      )}>
      {children}
    </KanbanContext.Provider>
  )
}

export { KanbanProvider, useKanbanContext }
