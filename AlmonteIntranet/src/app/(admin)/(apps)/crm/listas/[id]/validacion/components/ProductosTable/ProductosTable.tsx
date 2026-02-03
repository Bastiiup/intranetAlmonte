/**
 * Componente principal de la tabla de productos
 * Orquesta todos los subcomponentes de la tabla
 */

'use client'

import { useMemo, useState } from 'react'
import { Table, Spinner, Alert } from 'react-bootstrap'
import ProductosFiltros from './ProductosFiltros'
import ProductoRow from './ProductoRow'
import ProductosResumen from './ProductosResumen'
import type { ProductoIdentificado, ListaData } from '../../types'

interface ProductosTableProps {
  productos: ProductoIdentificado[]
  loading: boolean
  selectedProduct: string | number | null
  onProductoClick: (id: string | number) => void
  onToggleValidado: (id: string | number) => Promise<void>
  onEditarProducto: (producto: ProductoIdentificado) => void
  onEliminarProducto: (producto: ProductoIdentificado) => void
  onNavegarAPDF?: (producto: ProductoIdentificado) => void
  isApprovingProduct: string | number | null
  estadoRevision: 'borrador' | 'revisado' | 'publicado' | null
  isApproving: boolean
  onAprobarListaCompleta: (e?: React.MouseEvent) => void
  lista?: ListaData | null
  versionActual?: any
  processingPDF?: boolean
  autoProcessAttempted?: boolean
}

export default function ProductosTable({
  productos,
  loading,
  selectedProduct,
  onProductoClick,
  onToggleValidado,
  onEditarProducto,
  onEliminarProducto,
  onNavegarAPDF,
  isApprovingProduct,
  estadoRevision,
  isApproving,
  onAprobarListaCompleta,
  lista,
  versionActual,
  processingPDF,
  autoProcessAttempted
}: ProductosTableProps) {
  const [tabActivo, setTabActivo] = useState<'todos' | 'disponibles' | 'no-disponibles'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aprobados' | 'pendientes'>('todos')
  const [busqueda, setBusqueda] = useState('')

  // Calcular productos disponibles y no disponibles
  const productosDisponibles = useMemo(() => {
    return productos.filter(p => p.encontrado_en_woocommerce === true && p.disponibilidad === 'disponible')
  }, [productos])

  const productosNoDisponibles = useMemo(() => {
    return productos.filter(p => p.encontrado_en_woocommerce === false || p.disponibilidad === 'no_disponible' || p.disponibilidad === 'no_encontrado')
  }, [productos])

  // Filtros combinados: tab + estado + búsqueda
  const productosAMostrar = useMemo(() => {
    let productosFiltrados = productos
    
    // Filtro por tab (disponibilidad)
    if (tabActivo === 'disponibles') {
      productosFiltrados = productosDisponibles
    } else if (tabActivo === 'no-disponibles') {
      productosFiltrados = productosNoDisponibles
    }
    
    // Filtro por estado (aprobados/pendientes)
    if (filtroEstado === 'aprobados') {
      productosFiltrados = productosFiltrados.filter(p => p.validado)
    } else if (filtroEstado === 'pendientes') {
      productosFiltrados = productosFiltrados.filter(p => !p.validado)
    }
    
    // Filtro por búsqueda (nombre)
    if (busqueda.trim() !== '') {
      const busquedaLower = busqueda.toLowerCase()
      productosFiltrados = productosFiltrados.filter(p => 
        p.nombre.toLowerCase().includes(busquedaLower)
      )
    }
    
    return productosFiltrados
  }, [productos, productosDisponibles, productosNoDisponibles, tabActivo, filtroEstado, busqueda])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center flex-grow-1">
        <Spinner animation="border" />
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center flex-grow-1">
        <Alert variant="info" className="m-3">
          {processingPDF ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Procesando PDF con IA... Esto puede tomar algunos segundos.
            </>
          ) : autoProcessAttempted ? (
            <>
              No se encontraron productos en el PDF. Puedes intentar procesar nuevamente haciendo clic en "Procesar con IA" o agregar productos manualmente.
            </>
          ) : (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Iniciando procesamiento automático del PDF con IA...
            </>
          )}
        </Alert>
      </div>
    )
  }

  return (
    <>
      <ProductosFiltros
        productos={productos}
        productosDisponibles={productosDisponibles}
        productosNoDisponibles={productosNoDisponibles}
        tabActivo={tabActivo}
        setTabActivo={setTabActivo}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        productosAMostrar={productosAMostrar}
      />
      
      <div style={{ 
        overflowY: 'auto', 
        flex: '1 1 auto',
        minHeight: 0,
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'white'
      }}>
        <Table hover responsive className="mb-0" style={{ position: 'relative', zIndex: 10 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 11 }}>
            <tr>
              <th style={{ width: '50px' }}>Validado</th>
              <th style={{ width: '100px' }}>Imagen</th>
              <th>ISBN</th>
              <th>Nombre Producto</th>
              <th>Marca</th>
              <th style={{ width: '80px' }}>Cantidad</th>
              <th style={{ width: '100px' }}>Comprar</th>
              <th style={{ width: '140px' }}>Disponibilidad</th>
              <th style={{ width: '100px' }}>Precio</th>
              <th>Asignatura</th>
              <th style={{ width: '120px' }}>Ubicación PDF</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosAMostrar.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-4">
                  <Alert variant="info" className="mb-0">
                    No hay productos en esta categoría
                  </Alert>
                </td>
              </tr>
            ) : (
              productosAMostrar.map((producto) => (
                <ProductoRow
                  key={producto.id}
                  producto={producto}
                  selected={selectedProduct === producto.id}
                  onClick={() => onProductoClick(producto.id)}
                  onToggleValidado={() => onToggleValidado(producto.id)}
                  onEditar={() => onEditarProducto(producto)}
                  onEliminar={() => onEliminarProducto(producto)}
                  isApproving={isApprovingProduct === producto.id}
                  onNavegarAPDF={onNavegarAPDF}
                />
              ))
            )}
          </tbody>
        </Table>
      </div>

      <ProductosResumen
        productos={productos}
        estadoRevision={estadoRevision}
        loading={loading}
        isApproving={isApproving}
        onAprobarListaCompleta={onAprobarListaCompleta}
        lista={lista}
        versionActual={versionActual}
      />
    </>
  )
}
