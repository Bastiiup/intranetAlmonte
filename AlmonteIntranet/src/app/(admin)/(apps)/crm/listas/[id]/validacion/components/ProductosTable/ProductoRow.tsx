/**
 * Componente para una fila individual de producto en la tabla
 */

'use client'

import { FormCheck, Badge, Button, Spinner } from 'react-bootstrap'
import { TbEdit, TbTrash } from 'react-icons/tb'
import type { ProductoIdentificado } from '../../types'

interface ProductoRowProps {
  producto: ProductoIdentificado
  selected: boolean
  onClick: () => void
  onToggleValidado: () => void
  onEditar: () => void
  onEliminar: () => void
  isApproving: boolean
  onNavegarAPDF?: (producto: ProductoIdentificado) => void
}

export default function ProductoRow({
  producto,
  selected,
  onClick,
  onToggleValidado,
  onEditar,
  onEliminar,
  isApproving,
  onNavegarAPDF
}: ProductoRowProps) {
  return (
    <tr 
      onClick={onClick}
      style={{ 
        cursor: 'pointer',
        backgroundColor: selected ? '#e7f3ff' : 'transparent'
      }}
    >
      <td>
        <FormCheck
          checked={producto.validado}
          onChange={onToggleValidado}
          onClick={(e) => e.stopPropagation()}
          disabled={isApproving}
        />
        {isApproving && (
          <Spinner size="sm" className="ms-2" />
        )}
      </td>
      <td>
        {producto.imagen ? (
          <div 
            style={{ 
              position: 'relative',
              width: '80px', 
              height: '80px',
              cursor: 'pointer',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #dee2e6'
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
                console.warn('[ProductoRow] ⚠️ Error cargando imagen:', producto.imagen)
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.innerHTML = '<div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #999;">Sin imagen</div>'
                }
              }}
            />
          </div>
        ) : (
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            color: '#999',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            Sin imagen
          </div>
        )}
      </td>
      <td>{producto.isbn || '-'}</td>
      <td><strong>{producto.nombre}</strong></td>
      <td>{producto.marca || '-'}</td>
      <td className="text-center">{producto.cantidad}</td>
      <td className="text-center">
        <Badge bg={producto.comprar ? 'dark' : 'secondary'}>
          {producto.comprar ? 'Sí' : 'No'}
        </Badge>
      </td>
      <td>
        {producto.encontrado_en_woocommerce === true ? (
          <Badge bg={producto.disponibilidad === 'disponible' ? 'success' : 'danger'}>
            {producto.disponibilidad === 'disponible' ? '✅ Disponible' : '❌ No disponible'}
            {producto.stock_quantity !== undefined && producto.stock_quantity > 0 && (
              <span className="ms-1">({producto.stock_quantity})</span>
            )}
          </Badge>
        ) : (
          <Badge bg="warning" text="dark">
            ⚠️ No encontrado
          </Badge>
        )}
      </td>
      <td>
        {producto.precio_woocommerce && producto.precio_woocommerce > 0 ? (
          <div>
            <strong>${producto.precio_woocommerce.toLocaleString('es-CL')}</strong>
            {producto.precio !== producto.precio_woocommerce && (
              <small className="text-muted d-block">
                PDF: ${producto.precio.toLocaleString('es-CL')}
              </small>
            )}
          </div>
        ) : producto.precio > 0 ? (
          `$${producto.precio.toLocaleString('es-CL')}`
        ) : (
          '-'
        )}
      </td>
      <td>{producto.asignatura || '-'}</td>
      <td>
        {producto.coordenadas ? (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              if (onNavegarAPDF) {
                onNavegarAPDF(producto)
              }
            }}
            title={`Ir a página ${producto.coordenadas.pagina} del PDF`}
            style={{ fontSize: '0.75rem' }}
          >
            📄 Pág. {producto.coordenadas.pagina}
            {producto.coordenadas.region && (
              <small className="d-block" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                {producto.coordenadas.region}
              </small>
            )}
          </Button>
        ) : (
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>-</span>
        )}
      </td>
      <td>
        <div className="d-flex gap-1">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEditar()
            }}
            title="Editar producto"
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
          >
            <TbTrash />
          </Button>
        </div>
      </td>
    </tr>
  )
}
