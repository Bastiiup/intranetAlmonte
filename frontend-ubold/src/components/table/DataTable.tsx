'use client'

import { flexRender, Table as TableType } from '@tanstack/react-table'
import clsx from 'clsx'
import { Table } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp, TbGripVertical } from 'react-icons/tb'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type DataTableProps<TData> = {
  /**
   * The table instance from useReactTable
   */
  table: TableType<TData>
  /**
   * Optional class name for the table container
   */
  className?: string
  /**
   * Optional message to display when no data is available
   * @default 'Nothing found.'
   */
  emptyMessage?: React.ReactNode

  /**
   * Optional boolean to display headers
   * @default true
   */
  showHeaders?: boolean

  /**
   * Optional callback when column order changes
   */
  onColumnOrderChange?: (columnOrder: string[]) => void

  /**
   * Optional flag to enable column reordering
   * @default false
   */
  enableColumnReordering?: boolean
}

// Componente para header arrastrable
const SortableHeader = <TData,>({
  header,
  table,
  enableReordering,
}: {
  header: any
  table: TableType<TData>
  enableReordering: boolean
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        cursor: header.column.getCanSort() ? 'pointer' : 'default',
        userSelect: 'none',
        position: 'relative',
      }}
      onClick={header.column.getToggleSortingHandler()}>
      <div className="d-flex align-items-center">
        {enableReordering && (
          <span
            {...attributes}
            {...listeners}
            className="me-2"
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
            onMouseDown={(e) => {
              // Prevenir que el click active el sorting cuando se arrastra
              e.stopPropagation()
            }}>
            <TbGripVertical className="text-muted" style={{ fontSize: '14px' }} />
          </span>
        )}
        {flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getCanSort() &&
          ({
            asc: <TbArrowUp className="ms-1" />,
            desc: <TbArrowDown className="ms-1" />,
          }[header.column.getIsSorted() as string] ?? null)}
      </div>
    </th>
  )
}

const DataTable = <TData,>({
  table,
  className = '',
  emptyMessage = 'Nothing found.',
  showHeaders = true,
  onColumnOrderChange,
  enableColumnReordering = false,
}: DataTableProps<TData>) => {
  const columns = table.getAllColumns()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = table.getAllColumns().findIndex((col) => col.id === active.id)
      const newIndex = table.getAllColumns().findIndex((col) => col.id === over.id)

      const newColumnOrder = arrayMove(
        table.getAllColumns().map((col) => col.id),
        oldIndex,
        newIndex
      )

      // Actualizar el orden de columnas en la tabla
      table.setColumnOrder(newColumnOrder)

      // Llamar al callback si existe
      if (onColumnOrderChange) {
        onColumnOrderChange(newColumnOrder)
      }
    }
  }

  const headerGroups = table.getHeaderGroups()
  const columnIds = headerGroups[0]?.headers.map((header) => header.id) || []

  const tableContent = (
    <Table responsive hover className="table table-custom table-centered table-select w-100 mb-0">
      {showHeaders && (
        <thead className="bg-light align-middle bg-opacity-25 thead-sm">
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id} className="text-uppercase fs-xxs">
              {enableColumnReordering ? (
                <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                  {headerGroup.headers.map((header) => (
                    <SortableHeader
                      key={header.id}
                      header={header}
                      table={table}
                      enableReordering={enableColumnReordering}
                    />
                  ))}
                </SortableContext>
              ) : (
                headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}>
                    <div className="d-flex align-items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        ({
                          asc: <TbArrowUp className="ms-1" />,
                          desc: <TbArrowDown className="ms-1" />,
                        }[header.column.getIsSorted() as string] ?? null)}
                    </div>
                  </th>
                ))
              )}
            </tr>
          ))}
        </thead>
      )}
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-3 text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
  )

  const wrapperContent = (
    <div className={clsx('table-responsive', className)}>
      {tableContent}
    </div>
  )

  return enableColumnReordering ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {wrapperContent}
    </DndContext>
  ) : (
    wrapperContent
  )
}

export default DataTable
