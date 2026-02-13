/**
 * Componente para una fila individual de producto en la tabla.
 * Para filas dentro de DragDropContext use en ProductosTable el <tr> directo + ProductoRowCells,
 * así @hello-pangea/dnd recibe la ref en un HTMLElement. Este componente se mantiene por compatibilidad.
 */

'use client'

import ProductoRowCells from './ProductoRowCells'
import type { ProductoIdentificado } from '../../types'

export type DraggableProvided = {
  innerRef: (el: HTMLTableRowElement | null) => void
  draggableProps: Record<string, unknown>
  dragHandleProps: Record<string, unknown> | null
}

interface ProductoRowProps {
  producto: ProductoIdentificado
  selected: boolean
  onClick: () => void
  onToggleValidado: () => void
  onEditar: () => void
  onEliminar: () => void
  isApproving: boolean
  onNavegarAPDF?: (producto: ProductoIdentificado) => void
  dragProvided?: DraggableProvided
  isDragging?: boolean
}

export default function ProductoRow({
  producto,
  selected,
  onClick,
  onToggleValidado,
  onEditar,
  onEliminar,
  isApproving,
  onNavegarAPDF,
  dragProvided,
  isDragging
}: ProductoRowProps) {
  return (
    <tr
      {...(dragProvided?.draggableProps || {})}
      ref={dragProvided?.innerRef}
      onClick={onClick}
      style={{
        cursor: dragProvided ? 'grab' : 'pointer',
        backgroundColor: isDragging ? '#e3f2fd' : selected ? '#e3f2fd' : 'transparent',
        borderLeft: selected ? '4px solid #2196f3' : '4px solid transparent',
        transition: 'all 0.2s ease',
        position: 'relative',
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
      }}
      className={selected ? 'table-row-selected' : ''}
    >
      <ProductoRowCells
        producto={producto}
        selected={selected}
        onToggleValidado={onToggleValidado}
        onEditar={onEditar}
        onEliminar={onEliminar}
        isApproving={isApproving}
        onNavegarAPDF={onNavegarAPDF}
        dragHandleProps={dragProvided?.dragHandleProps ?? null}
        hasDragHandle={!!dragProvided}
      />
    </tr>
  )
}
