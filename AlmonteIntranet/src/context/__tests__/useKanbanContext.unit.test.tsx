import { renderHook, act } from '@testing-library/react'
import { KanbanProvider, useKanbanContext } from '@/context/useKanbanContext'
import { KanbanSectionType, KanbanTaskType } from '@/types/kanban'
import { ReactNode } from 'react'
import { DropResult } from '@hello-pangea/dnd'

// Mock de react-hook-form
const mockControl = {} as any
const mockHandleSubmit = jest.fn((fn) => fn)
const mockReset = jest.fn()

jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    control: mockControl,
    handleSubmit: mockHandleSubmit,
    reset: mockReset,
  })),
}))

// Mock de yup
jest.mock('yup', () => ({
  object: jest.fn(() => ({
    required: jest.fn(),
  })),
  string: jest.fn(() => ({
    required: jest.fn(),
  })),
  number: jest.fn(() => ({
    required: jest.fn(),
  })),
  mixed: jest.fn(() => ({
    required: jest.fn(),
  })),
}))

// Mock de @hookform/resolvers
jest.mock('@hookform/resolvers/yup', () => ({
  yupResolver: jest.fn(() => ({})),
}))

// Mock de imágenes
jest.mock('@/assets/images/users/user-1.jpg', () => 'user1.jpg')
jest.mock('@/assets/images/users/user-2.jpg', () => 'user2.jpg')
jest.mock('@/assets/images/users/user-3.jpg', () => 'user3.jpg')

const mockSections: KanbanSectionType[] = [
  { id: '1', title: 'To Do', variant: 'primary' },
  { id: '2', title: 'In Progress', variant: 'warning' },
]

const mockTasks: KanbanTaskType[] = [
  {
    id: '1',
    sectionId: '1',
    title: 'Task 1',
    userName: 'User 1',
    user: 'user1.jpg' as any,
    company: 'Company 1',
    date: '2024-01-01',
    messages: 2,
    tasks: 5,
    amount: 1000,
    status: 'lead',
  },
  {
    id: '2',
    sectionId: '1',
    title: 'Task 2',
    userName: 'User 2',
    user: 'user2.jpg' as any,
    company: 'Company 2',
    date: '2024-01-02',
    messages: 3,
    tasks: 7,
    amount: 2000,
    status: 'negotiation',
  },
]

describe('useKanbanContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <KanbanProvider sectionsData={mockSections} tasksData={mockTasks}>
      {children}
    </KanbanProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debe proporcionar el contexto correctamente', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    expect(result.current).toBeDefined()
    expect(result.current.sections).toEqual(mockSections)
    expect(result.current.tasks).toEqual(mockTasks)
  })

  it('debe tener newTaskModal con open y toggle', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    expect(result.current.newTaskModal).toBeDefined()
    expect(result.current.newTaskModal.open).toBe(false)
    expect(typeof result.current.newTaskModal.toggle).toBe('function')
  })

  it('debe abrir newTaskModal cuando se llama toggle', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    act(() => {
      result.current.newTaskModal.toggle('1')
    })

    expect(result.current.newTaskModal.open).toBe(true)
    expect(result.current.activeSectionId).toBe('1')
  })

  it('debe tener sectionModal con open y toggle', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    expect(result.current.sectionModal).toBeDefined()
    expect(result.current.sectionModal.open).toBe(false)
    expect(typeof result.current.sectionModal.toggle).toBe('function')
  })

  it('debe abrir sectionModal cuando se llama toggle', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    act(() => {
      result.current.sectionModal.toggle('1')
    })

    expect(result.current.sectionModal.open).toBe(true)
    expect(result.current.activeSectionId).toBe('1')
  })

  it('debe tener taskForm con control y handlers', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    expect(result.current.taskForm).toBeDefined()
    expect(result.current.taskForm.control).toBeDefined()
    expect(typeof result.current.taskForm.newRecord).toBe('function')
    expect(typeof result.current.taskForm.editRecord).toBe('function')
    expect(typeof result.current.taskForm.deleteRecord).toBe('function')
  })

  it('debe tener sectionForm con control y handlers', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    expect(result.current.sectionForm).toBeDefined()
    expect(result.current.sectionForm.control).toBeDefined()
    expect(typeof result.current.sectionForm.newRecord).toBe('function')
    expect(typeof result.current.sectionForm.editRecord).toBe('function')
    expect(typeof result.current.sectionForm.deleteRecord).toBe('function')
  })

  it('debe obtener todas las tareas de una sección', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    const tasks = result.current.getAllTasksPerSection('1')
    expect(tasks).toHaveLength(2)
    expect(tasks[0].sectionId).toBe('1')
  })

  it('debe retornar array vacío cuando no hay tareas en la sección', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    const tasks = result.current.getAllTasksPerSection('999')
    expect(tasks).toHaveLength(0)
  })

  it('debe manejar onDragEnd correctamente', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    const dropResult: DropResult = {
      draggableId: '1',
      type: 'TASK',
      source: { droppableId: '1', index: 0 },
      destination: { droppableId: '2', index: 0 },
      reason: 'DROP',
      mode: 'FLUID',
    }

    act(() => {
      result.current.onDragEnd(dropResult)
    })

    // La tarea debería moverse a la nueva sección
    const tasksInSection2 = result.current.getAllTasksPerSection('2')
    expect(tasksInSection2.some(t => t.id === '1')).toBe(true)
  })

  it('debe cancelar drag cuando no hay destino', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    const initialTasks = result.current.tasks
    
    const dropResult: DropResult = {
      draggableId: '1',
      type: 'TASK',
      source: { droppableId: '1', index: 0 },
      destination: null,
      reason: 'CANCEL',
      mode: 'FLUID',
    }

    act(() => {
      result.current.onDragEnd(dropResult)
    })

    // Las tareas no deberían cambiar
    expect(result.current.tasks).toEqual(initialTasks)
  })

  it('debe eliminar tarea cuando se llama deleteRecord', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    const initialTaskCount = result.current.tasks.length
    
    act(() => {
      result.current.taskForm.deleteRecord('1')
    })

    expect(result.current.tasks).toHaveLength(initialTaskCount - 1)
    expect(result.current.tasks.find(t => t.id === '1')).toBeUndefined()
  })

  it('debe eliminar sección cuando se llama deleteRecord en sectionForm', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    const initialSectionCount = result.current.sections.length
    
    act(() => {
      result.current.sectionForm.deleteRecord('1')
    })

    expect(result.current.sections).toHaveLength(initialSectionCount - 1)
    expect(result.current.sections.find(s => s.id === '1')).toBeUndefined()
  })

  it('debe cargar datos de tarea cuando se abre modal para editar', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    act(() => {
      result.current.newTaskModal.toggle('1', '1')
    })

    expect(result.current.taskFormData).toBeDefined()
    expect(result.current.taskFormData?.id).toBe('1')
    expect(result.current.activeTaskId).toBe('1')
  })

  it('debe cargar datos de sección cuando se abre modal para editar', () => {
    const { result } = renderHook(() => useKanbanContext(), { wrapper })
    
    act(() => {
      result.current.sectionModal.toggle('1')
    })

    expect(result.current.sectionFormData).toBeDefined()
    expect(result.current.sectionFormData?.id).toBe('1')
  })

  it('debe sincronizar cuando cambian las props', () => {
    const { rerender } = renderHook(
      () => useKanbanContext(),
      {
        wrapper: ({ children }) => (
          <KanbanProvider sectionsData={mockSections} tasksData={mockTasks}>
            {children}
          </KanbanProvider>
        ),
      }
    )

    const newTasks: KanbanTaskType[] = [
      ...mockTasks,
      {
        id: '3',
        sectionId: '2',
        title: 'Task 3',
        userName: 'User 3',
        user: 'user3.jpg' as any,
        company: 'Company 3',
        date: '2024-01-03',
        messages: 1,
        tasks: 3,
        amount: 3000,
        status: 'won',
      },
    ]

    rerender({
      wrapper: ({ children }) => (
        <KanbanProvider sectionsData={mockSections} tasksData={newTasks}>
          {children}
        </KanbanProvider>
      ),
    })

    const { result } = renderHook(() => useKanbanContext(), {
      wrapper: ({ children }) => (
        <KanbanProvider sectionsData={mockSections} tasksData={newTasks}>
          {children}
        </KanbanProvider>
      ),
    })

    expect(result.current.tasks).toHaveLength(3)
  })

  it('debe lanzar error cuando se usa fuera del provider', () => {
    // Suprimir console.error para este test
    const originalError = console.error
    console.error = jest.fn()
    
    expect(() => {
      renderHook(() => useKanbanContext())
    }).toThrow('useKanbanContext can only be used within KanbanProvider')
    
    console.error = originalError
  })
})

