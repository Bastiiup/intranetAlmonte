/**
 * Solo las celdas (<td>) de una fila de producto.
 * Se usa dentro de un <tr> en ProductosTable para que @hello-pangea/dnd
 * reciba la ref en un HTMLElement directo (el <tr>).
 */

'use client'

import { FormCheck, Badge, Button, Spinner } from 'react-bootstrap'
import { TbEdit, TbTrash, TbSearch, TbGripVertical, TbCheck, TbAlertTriangle, TbPlus } from 'react-icons/tb'
import type { ProductoIdentificado } from '../../types'

export interface ProductoRowCellsProps {
  producto: ProductoIdentificado
  selected: boolean
  searchStatus?: 'idle' | 'searching' | 'found' | 'not-found'
  onToggleValidado: () => void
  onEditar: () => void
  onEliminar: () => void
  isApproving: boolean
  onNavegarAPDF?: (producto: ProductoIdentificado) => void
  /** Alta en catálogo: solo se muestra si el producto no está en WooCommerce */
  onAltaProductoCatalogo?: (producto: ProductoIdentificado) => void
  /** Props del handle de arrastre (solo cuando la fila es draggable) */
  dragHandleProps?: Record<string, unknown> | null
  hasDragHandle?: boolean
}

export default function ProductoRowCells({
  producto,
  selected,
  searchStatus = 'idle',
  onToggleValidado,
  onEditar,
  onEliminar,
  isApproving,
  onNavegarAPDF,
  onAltaProductoCatalogo,
  dragHandleProps = null,
  hasDragHandle = false,
}: ProductoRowCellsProps) {
  const noEstaEnCatalogo = producto.encontrado_en_woocommerce !== true
  return (
    <>
      <td style={{ verticalAlign: 'middle', width: '40px', padding: '4px' }} {...(dragHandleProps || {})}>
        {hasDragHandle && (
          <span style={{ cursor: 'grab', display: 'inline-flex', color: '#6c757d' }} title="Arrastrar para reordenar">
            <TbGripVertical size={18} />
          </span>
        )}
      </td>
      <td style={{ verticalAlign: 'middle', width: '56px', textAlign: 'center' }}>
        <Badge bg="secondary" style={{ fontWeight: 600 }}>
          {producto.orden ?? '—'}
        </Badge>
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FormCheck
            checked={producto.validado}
            onChange={onToggleValidado}
            onClick={(e) => e.stopPropagation()}
            disabled={isApproving}
            style={{ margin: 0 }}
          />
          {isApproving && (
            <Spinner size="sm" variant="primary" />
          )}
        </div>
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        {producto.imagen ? (
          <div
            style={{
              position: 'relative',
              width: '70px',
              height: '70px',
              cursor: 'pointer',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #dee2e6',
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
            }}
            onClick={(e) => {
              e.stopPropagation()
              window.open(producto.imagen, '_blank')
            }}
            title="Click para ver imagen completa"
          >
            <img
              src={producto.imagen}
              alt={producto.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.innerHTML = '<div style="width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #999;">Sin imagen</div>'
                }
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '70px',
            height: '70px',
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            color: '#999',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            Sin imagen
          </div>
        )}
      </td>
      <td style={{ verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {producto.isbn || <span style={{ color: '#adb5bd' }}>-</span>}
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 600,
              color: '#333',
              fontSize: '0.9rem',
              lineHeight: 1.3
            }}>
              {producto.nombre}
            </div>
            {producto.descripcion && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6c757d',
                marginTop: '2px',
                lineHeight: 1.2,
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {producto.descripcion}
              </div>
            )}
          </div>
          {selected && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: searchStatus === 'found'
                  ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
                  : searchStatus === 'not-found'
                    ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
                    : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 500,
                boxShadow: searchStatus === 'found'
                  ? '0 2px 6px rgba(76, 175, 80, 0.3)'
                  : searchStatus === 'not-found'
                    ? '0 2px 6px rgba(255, 152, 0, 0.3)'
                    : '0 2px 6px rgba(33, 150, 243, 0.3)',
                animation: searchStatus === 'searching' ? 'pulse-badge 2s ease-in-out infinite' : 'none',
                maxWidth: searchStatus === 'not-found' ? '180px' : undefined,
                lineHeight: 1.2,
              }}
              title={searchStatus === 'not-found' ? 'Prueba navegar a otras páginas del PDF' : undefined}
            >
              {(searchStatus === 'searching' || searchStatus === 'idle') && <TbSearch size={12} />}
              {searchStatus === 'found' && <TbCheck size={12} />}
              {searchStatus === 'not-found' && <TbAlertTriangle size={12} />}
              {searchStatus === 'searching' && 'Buscando...'}
              {searchStatus === 'found' && 'Encontrado'}
              {searchStatus === 'not-found' && 'No encontrado, prueba otra página'}
              {searchStatus === 'idle' && 'Buscando...'}
            </div>
          )}
        </div>
      </td>
      <td style={{ verticalAlign: 'middle', fontSize: '0.85rem', color: '#495057' }}>
        {producto.marca || <span style={{ color: '#adb5bd' }}>-</span>}
      </td>
      <td style={{ verticalAlign: 'middle', fontSize: '0.8rem' }}>
        {producto.categoria ? (
          <Badge bg="info" text="dark" style={{ fontWeight: 500 }}>{producto.categoria}</Badge>
        ) : (
          <span style={{ color: '#adb5bd' }}>-</span>
        )}
      </td>
      <td style={{ verticalAlign: 'middle', fontSize: '0.8rem' }}>
        {producto.asignatura ? (
          <span style={{ color: '#495057' }}>{producto.asignatura}</span>
        ) : (
          <span style={{ color: '#adb5bd' }}>-</span>
        )}
      </td>
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
        <Badge
          bg="light"
          text="dark"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '6px 10px',
            border: '1px solid #dee2e6'
          }}
        >
          {producto.cantidad}
        </Badge>
      </td>
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
        <Badge
          bg={producto.comprar ? 'dark' : 'secondary'}
          style={{
            fontSize: '0.75rem',
            padding: '5px 10px'
          }}
        >
          {producto.comprar ? 'Si' : 'No'}
        </Badge>
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        {producto.encontrado_en_woocommerce === true ? (
          <Badge
            bg={producto.disponibilidad === 'disponible' ? 'success' : 'danger'}
            style={{
              fontSize: '0.75rem',
              padding: '6px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {producto.disponibilidad === 'disponible' ? 'Disponible' : 'No disponible'}
            {producto.stock_quantity !== undefined && producto.stock_quantity > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.7rem'
              }}>
                {producto.stock_quantity}
              </span>
            )}
          </Badge>
        ) : (
          <Badge
            bg="warning"
            text="dark"
            style={{
              fontSize: '0.75rem',
              padding: '6px 10px'
            }}
          >
            No encontrado
          </Badge>
        )}
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        {producto.precio_woocommerce && producto.precio_woocommerce > 0 ? (
          <div>
            <div style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>
              ${producto.precio_woocommerce.toLocaleString('es-CL')}
            </div>
            {producto.precio !== producto.precio_woocommerce && producto.precio > 0 && (
              <div style={{
                fontSize: '0.7rem',
                color: '#6c757d',
                textDecoration: 'line-through'
              }}>
                PDF: ${producto.precio.toLocaleString('es-CL')}
              </div>
            )}
          </div>
        ) : producto.precio > 0 ? (
          <span style={{ fontWeight: 500, color: '#333' }}>
            ${producto.precio.toLocaleString('es-CL')}
          </span>
        ) : (
          <span style={{ color: '#adb5bd' }}>-</span>
        )}
      </td>
      <td style={{ verticalAlign: 'middle', padding: '4px 8px' }}>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {noEstaEnCatalogo && onAltaProductoCatalogo && (
            <Button
              variant="outline-success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAltaProductoCatalogo(producto)
              }}
              title="Alta producto en catálogo (relleno automático)"
              style={{
                padding: '4px 8px',
                fontSize: '14px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TbPlus />
            </Button>
          )}
          <Button
            variant="outline-primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEditar()
            }}
            title="Editar producto"
            style={{
              padding: '4px 8px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TbEdit />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEliminar()
            }}
            title="Eliminar producto"
            style={{
              padding: '4px 8px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TbTrash />
          </Button>
        </div>
      </td>
    </>
  )
}
