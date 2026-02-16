// Mock de @tanstack/react-table - solo mockear flexRender
jest.mock('@tanstack/react-table', () => {
  const actual = jest.requireActual('@tanstack/react-table')
  return {
    ...actual,
    flexRender: jest.fn((component) => component),
  }
})

import { render, screen } from '@testing-library/react'
import DataTable from '../table/DataTable'
import { createColumnHelper, useReactTable, getCoreRowModel } from '@tanstack/react-table'

// Mock de @dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(() => jest.fn()),
  useSensors: jest.fn(() => []),
  DragEndEvent: jest.fn(),
}))

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn((arr) => arr),
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  horizontalListSortingStrategy: jest.fn(),
}))

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}))

// Mock de react-icons
jest.mock('react-icons/tb', () => ({
  TbArrowUp: () => <span data-testid="arrow-up">↑</span>,
  TbArrowDown: () => <span data-testid="arrow-down">↓</span>,
  TbGripVertical: () => <span data-testid="grip">⋮</span>,
}))

type TestData = {
  id: number
  name: string
}

// Componente wrapper para usar useReactTable
const TableWrapper = ({ data, columns, ...props }: any) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  return <DataTable table={table} {...props} />
}

describe('DataTable', () => {
  const columnHelper = createColumnHelper<TestData>()
  
  const columns = [
    columnHelper.accessor('id', {
      header: 'ID',
    }),
    columnHelper.accessor('name', {
      header: 'Name',
    }),
  ]

  const data: TestData[] = [
    { id: 1, name: 'Test 1' },
    { id: 2, name: 'Test 2' },
  ]

  it('debe renderizar la tabla', () => {
    render(<TableWrapper data={data} columns={columns} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('debe mostrar mensaje vacío cuando no hay datos', () => {
    render(<TableWrapper data={[]} columns={columns} emptyMessage="No data found" />)
    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('debe usar mensaje vacío por defecto', () => {
    render(<TableWrapper data={[]} columns={columns} />)
    expect(screen.getByText('Nothing found.')).toBeInTheDocument()
  })

  it('debe aplicar className personalizado', () => {
    const { container } = render(<TableWrapper data={data} columns={columns} className="custom-table" />)
    const wrapper = container.querySelector('.table-responsive')
    expect(wrapper).toHaveClass('custom-table')
  })

  it('debe mostrar headers por defecto', () => {
    render(<TableWrapper data={data} columns={columns} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('no debe mostrar headers cuando showHeaders es false', () => {
    render(<TableWrapper data={data} columns={columns} showHeaders={false} />)
    expect(screen.queryByText('ID')).not.toBeInTheDocument()
  })

  it('debe envolver con DndContext cuando enableColumnReordering es true', () => {
    render(<TableWrapper data={data} columns={columns} enableColumnReordering={true} />)
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
  })

  it('no debe envolver con DndContext cuando enableColumnReordering es false', () => {
    render(<TableWrapper data={data} columns={columns} enableColumnReordering={false} />)
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument()
  })
})

