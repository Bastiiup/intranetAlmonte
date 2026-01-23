import { render, screen, fireEvent } from '@testing-library/react'
import NestableList from '../NestableList'

// Mock de @dnd-kit
jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({ children, onDragStart, onDragMove, onDragEnd }: any) => {
      const handleDragStart = (e: any) => {
        if (onDragStart) onDragStart(e)
      }
      return (
        <div data-testid="dnd-context" onClick={() => handleDragStart({ active: { id: 'Item 1' } })}>
          {children}
        </div>
      )
    },
    DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
    useSensor: jest.fn(() => jest.fn()),
    useSensors: jest.fn(() => []),
  }
})

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  arrayMove: jest.fn((arr, oldIndex, newIndex) => {
    const newArr = [...arr]
    const [removed] = newArr.splice(oldIndex, 1)
    newArr.splice(newIndex, 0, removed)
    return newArr
  }),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: jest.fn(),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}))

describe('NestableList', () => {
  it('debe renderizar la lista', () => {
    render(<NestableList />)
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
  })

  it('debe mostrar items iniciales', () => {
    render(<NestableList />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('debe mostrar items anidados', () => {
    render(<NestableList />)
    expect(screen.getByText('Item 2.1')).toBeInTheDocument()
    expect(screen.getByText('Item 2.2')).toBeInTheDocument()
  })

  it('debe tener SortableContext', () => {
    render(<NestableList />)
    expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
  })

  it('debe tener DragOverlay', () => {
    render(<NestableList />)
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
  })
})

