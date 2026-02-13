/**
 * Componente para filtros y búsqueda de productos
 */

'use client'

import { Form, Badge } from 'react-bootstrap'
import type { ProductoIdentificado } from '../../types'

interface ProductosFiltrosProps {
  productos: ProductoIdentificado[]
  productosDisponibles: ProductoIdentificado[]
  productosNoDisponibles: ProductoIdentificado[]
  tabActivo: 'todos' | 'disponibles' | 'no-disponibles'
  setTabActivo: (tab: 'todos' | 'disponibles' | 'no-disponibles') => void
  filtroEstado: 'todos' | 'aprobados' | 'pendientes'
  setFiltroEstado: (filtro: 'todos' | 'aprobados' | 'pendientes') => void
  busqueda: string
  setBusqueda: (busqueda: string) => void
  productosAMostrar: ProductoIdentificado[]
}

export default function ProductosFiltros({
  productos,
  productosDisponibles,
  productosNoDisponibles,
  tabActivo,
  setTabActivo,
  filtroEstado,
  setFiltroEstado,
  busqueda,
  setBusqueda,
  productosAMostrar
}: ProductosFiltrosProps) {
  const disponibles = productosDisponibles.length
  const noDisponibles = productosNoDisponibles.length

  return (
    <>
      {/* Tabs de filtrado */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        borderBottom: '1px solid #dee2e6',
        background: '#f8f9fa'
      }}>
        <div className="btn-group" role="group">
          <button
            type="button"
            className={`btn btn-sm ${tabActivo === 'todos' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTabActivo('todos')}
          >
            Todos ({productos.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tabActivo === 'disponibles' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setTabActivo('disponibles')}
          >
            Disponibles ({disponibles})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tabActivo === 'no-disponibles' ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => setTabActivo('no-disponibles')}
          >
            No Disponibles ({noDisponibles})
          </button>
        </div>
      </div>
      
      {/* Controles de filtros y búsqueda */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        borderBottom: '1px solid #dee2e6',
        background: '#f8f9fa',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <Form.Control
          type="text"
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: '300px', flex: '1 1 auto' }}
        />
        <Form.Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'aprobados' | 'pendientes')}
          style={{ width: '180px', flexShrink: 0 }}
        >
          <option value="todos">Todos los estados</option>
          <option value="aprobados">Solo aprobados</option>
          <option value="pendientes">Solo pendientes</option>
        </Form.Select>
        {busqueda && (
          <Badge bg="info" style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}>
            {productosAMostrar.length} resultado{productosAMostrar.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </>
  )
}
