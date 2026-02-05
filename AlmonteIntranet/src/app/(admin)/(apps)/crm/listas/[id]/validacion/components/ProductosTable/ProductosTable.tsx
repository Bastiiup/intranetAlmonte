/**
 * Componente principal de la tabla de productos
 * Orquesta todos los subcomponentes de la tabla
 */

'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Table, Spinner, Alert } from 'react-bootstrap'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import ProductosFiltros from './ProductosFiltros'
import ProductoRowCells from './ProductoRowCells'
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
  onReorder?: (orderedProductos: ProductoIdentificado[]) => Promise<void>
  listaIdFromUrl?: string
  onSugerirAsignaturasIA?: () => Promise<void>
  sugiriendoIA?: boolean
  onVerificarDisponibilidad?: () => Promise<void>
  verificandoDisponibilidad?: boolean
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
  autoProcessAttempted,
  onReorder,
  listaIdFromUrl,
  onSugerirAsignaturasIA,
  sugiriendoIA = false,
  onVerificarDisponibilidad,
  verificandoDisponibilidad = false,
}: ProductosTableProps) {
  const [tabActivo, setTabActivo] = useState<'todos' | 'disponibles' | 'no-disponibles'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aprobados' | 'pendientes'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [reordering, setReordering] = useState(false)

  // Scroll la fila seleccionada into view (como Ctrl+F)
  useEffect(() => {
    if (selectedProduct) {
      const row = document.querySelector(`tr[data-product-id="${selectedProduct}"]`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedProduct])

  // Calcular productos disponibles y no disponibles (antes que handleDragEnd y productosAMostrar)
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

  // Agrupar por asignatura y ordenar: grupos (LENGUAJE, MATEMÁTICAS, RELIGIÓN...) y dentro de cada grupo por orden del PDF
  type RowItem = { type: 'section'; asignatura: string } | { type: 'product'; product: ProductoIdentificado }
  const { itemsOrdenados } = useMemo(() => {
    const key = (p: ProductoIdentificado) =>
      (p.asignatura || 'Sin asignatura').trim().toUpperCase() || 'Sin asignatura'
    const groups = new Map<string, ProductoIdentificado[]>()
    for (const p of productosAMostrar) {
      const k = key(p)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(p)
    }
    // Dentro de cada grupo, ordenar por orden del PDF
    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999))
    }
    // Orden de grupos: por primera aparición en el PDF (mínimo orden del grupo)
    const groupEntries = [...groups.entries()].map(([asig, arr]) => ({
      asignatura: asig,
      minOrden: Math.min(...arr.map(p => p.orden ?? 9999)),
      products: arr,
    }))
    groupEntries.sort((a, b) => a.minOrden - b.minOrden)
    // Lista con filas de sección + productos para mostrar en pantalla
    const items: RowItem[] = []
    for (const g of groupEntries) {
      items.push({ type: 'section', asignatura: g.asignatura })
      for (const p of g.products) items.push({ type: 'product', product: p })
    }
    return { itemsOrdenados: items }
  }, [productosAMostrar])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || result.destination.index === result.source.index) return
      const srcItem = itemsOrdenados[result.source.index]
      if (srcItem.type === 'section') return
      // Reordenar la lista mixta (secciones + productos)
      const newItems = Array.from(itemsOrdenados)
      const [removed] = newItems.splice(result.source.index, 1)
      newItems.splice(result.destination.index, 0, removed)
      const newProductOrder = newItems.filter((i): i is { type: 'product'; product: ProductoIdentificado } => i.type === 'product').map(i => i.product)
      const rest = productos.filter(p => !newProductOrder.some(np => np.id === p.id))
      const fullOrdered = [...newProductOrder, ...rest]
      const withNewOrden = fullOrdered.map((p, i) => ({ ...p, orden: i + 1 }))
      if (onReorder) {
        setReordering(true)
        onReorder(withNewOrden).finally(() => setReordering(false))
      }
    },
    [productos, itemsOrdenados, onReorder]
  )

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
      {((onSugerirAsignaturasIA || onVerificarDisponibilidad) && productos.length > 0) && (
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #dee2e6', background: '#f0f4ff', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onSugerirAsignaturasIA && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={onSugerirAsignaturasIA}
              disabled={sugiriendoIA || verificandoDisponibilidad}
            >
              {sugiriendoIA ? 'Detectando...' : '✨ Sugerir asignaturas/categoría con IA'}
            </button>
          )}
          {onVerificarDisponibilidad && (
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              onClick={onVerificarDisponibilidad}
              disabled={sugiriendoIA || verificandoDisponibilidad}
              title="Consultar disponibilidad en WooCommerce y Strapi"
            >
              {verificandoDisponibilidad ? 'Consultando...' : '📦 Ver disponibilidad'}
            </button>
          )}
          <small className="text-muted">La IA sugiere asignatura y categoría; Ver disponibilidad actualiza stock.</small>
        </div>
      )}
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table hover responsive className="mb-0" style={{ position: 'relative', zIndex: 10 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 11 }}>
              <tr>
                <th style={{ width: '40px' }} title="Arrastrar para reordenar"></th>
                <th style={{ width: '56px' }}>Orden</th>
                <th style={{ width: '50px' }}>Validado</th>
                <th style={{ width: '100px' }}>Imagen</th>
                <th>ISBN</th>
                <th>Nombre Producto</th>
                <th>Marca</th>
                <th style={{ width: '100px' }}>Categoría</th>
                <th style={{ width: '120px' }}>Asignatura</th>
                <th style={{ width: '80px' }}>Cantidad</th>
                <th style={{ width: '100px' }}>Comprar</th>
                <th style={{ width: '140px' }}>Disponibilidad</th>
                <th style={{ width: '100px' }}>Precio</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <Droppable droppableId="productos-tbody">
              {(droppableProvided) => (
                <tbody
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                >
                  {itemsOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-4">
                        <Alert variant="info" className="mb-0">
                          No hay productos en esta categoría
                        </Alert>
                      </td>
                    </tr>
                  ) : (
                    itemsOrdenados.map((item, index) => {
                      if (item.type === 'section') {
                        return (
                          <Draggable
                            key={`section-${item.asignatura}`}
                            draggableId={`section-${item.asignatura}`}
                            index={index}
                            isDragDisabled
                          >
                            {(provided) => (
                              <tr
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  backgroundColor: '#e9ecef',
                                  borderLeft: '4px solid #495057',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <td colSpan={14} style={{ padding: '10px 12px' }}>
                                  {item.asignatura}
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        )
                      }
                      const producto = item.product
                      return (
                        <Draggable
                          key={String(producto.id)}
                          draggableId={String(producto.id)}
                          index={index}
                          isDragDisabled={reordering}
                        >
                          {(provided, snapshot) => {
                            const isSelected = selectedProduct === producto.id
                            return (
                            <tr
                              ref={provided.innerRef}
                              data-product-id={producto.id}
                              {...provided.draggableProps}
                              onClick={() => onProductoClick(producto.id)}
                              style={{
                                cursor: 'grab',
                                backgroundColor: snapshot.isDragging
                                  ? '#e3f2fd'
                                  : isSelected
                                    ? '#e3f2fd'
                                    : 'transparent',
                                borderLeft: isSelected ? '4px solid #2196f3' : '4px solid transparent',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                opacity: snapshot.isDragging ? 0.9 : 1,
                                boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                              }}
                              className={isSelected ? 'table-row-selected' : ''}
                            >
                              <ProductoRowCells
                                producto={producto}
                                selected={selectedProduct === producto.id}
                                onToggleValidado={() => onToggleValidado(producto.id)}
                                onEditar={() => onEditarProducto(producto)}
                                onEliminar={() => onEliminarProducto(producto)}
                                isApproving={isApprovingProduct === producto.id}
                                onNavegarAPDF={onNavegarAPDF}
                                dragHandleProps={provided.dragHandleProps}
                                hasDragHandle
                              />
                            </tr>
                            )
                          }}
                        </Draggable>
                      )
                    })
                  )}
                  {droppableProvided.placeholder}
                </tbody>
              )}
            </Droppable>
          </Table>
          <style jsx global>{`
            @keyframes pulse-badge {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.02); }
            }
            .table-row-selected:hover { background-color: #bbdefb !important; }
            tr:hover:not(.table-row-selected) { background-color: #f8f9fa !important; }
          `}</style>
        </DragDropContext>
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
