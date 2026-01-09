import { ChildrenType, VariantType } from '@/types/index'
import { DropResult } from '@hello-pangea/dnd'
import { StaticImageData } from 'next/image'
import { BaseSyntheticEvent } from 'react'
import { Control } from 'react-hook-form'

export type KanbanProviderProps = {
  sectionsData: KanbanSectionType[]
  tasksData: KanbanTaskType[]
} & ChildrenType

export type KanbanDialogType = {
  showNewTaskModal: boolean
  showSectionModal: boolean
}

export type KanbanTaskType = {
  id: string
  realId?: string // ID real (documentId) para actualizaciones en Strapi
  sectionId: KanbanSectionType['id']
  title: string
  user: StaticImageData
  userName: string
  company: string
  date: string
  messages:number,
  tasks:number,
  amount:number,
  status: 'lead' | 'negotiation' | 'won' | 'lost'
}

export type KanbanSectionType = {
  id: string
  title: string
  variant: VariantType
}

export type FormControlSubmitType = {
  control: Control<any>
  newRecord: (values: BaseSyntheticEvent) => void
  editRecord: (values: BaseSyntheticEvent) => void
  deleteRecord: (id: string) => void
}

export type KanbanType = {
  sections: KanbanSectionType[]
  activeSectionId: KanbanSectionType['id'] | undefined
  newTaskModal: {
    open: boolean
    toggle: (sectionId?: KanbanSectionType['id'], taskId?: KanbanTaskType['id']) => void
  }
  sectionModal: {
    open: boolean
    toggle: (sectionId?: KanbanSectionType['id']) => void
  }
  taskFormData: KanbanTaskType | undefined
  sectionFormData: KanbanSectionType | undefined
  taskForm: FormControlSubmitType
  sectionForm: FormControlSubmitType
  getAllTasksPerSection: (sectionId: KanbanSectionType['id']) => KanbanTaskType[]
  onDragEnd: (result: DropResult) => void
}
