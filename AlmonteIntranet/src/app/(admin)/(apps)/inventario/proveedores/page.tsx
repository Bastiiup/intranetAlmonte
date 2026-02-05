'use client'

import { useState, useEffect, useMemo } from 'react'
import { Container, Card, CardHeader, CardBody, Button, Table, Form, FormCheck, InputGroup, FormControl, Badge, Alert, Spinner, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Row, Col } from 'react-bootstrap'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { LuShoppingCart, LuPackage, LuDollarSign, LuFileText, LuSearch, LuCheck, LuPencil, LuSave } from 'react-icons/lu'
import { useNotificationContext } from '@/context/useNotificationContext'

interface Producto {
  id: string | number
  documentId?: string
  nombre_libro?: string
  isbn_libro?: string
  sku?: string
  precio?: number
  precio_regular?: number
  stock_quantity?: number
  stock_status?: string
  autor?: string
  editorial?: string
  portada?: string
}

interface EmpresaOption {
  id: number | string
  documentId?: string
  internalId?: number | string
  empresa_nombre?: string
  nombre?: string
  emails?: Array<{ email: string }>
  es_empresa_propia?: boolean
}

export default function InventarioProveedoresPage() {
  const { showNotification } = useNotificationContext()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [productosCantidades, setProductosCantidades] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low' | 'outofstock'>('all')
  const [showProveedoresModal, setShowProveedoresModal] = useState(false)
  const [proveedores, setProveedores] = useState<EmpresaOption[]>([])
  const [selectedProveedores, setSelectedProveedores] = useState<Set<string>>(new Set())
  const [loadingProveedores, setLoadingProveedores] = useState(false)
  const [creatingRFQ, setCreatingRFQ] = useState(false)
  const [rfqData, setRfqData] = useState({
    nombre: '',
    descripcion: '',
    fecha_vencimiento: '',
    moneda: 'CLP',
    notas_internas: '',
  })
  
  // Estados para edición de precios (stock solo lectura - se actualiza via órdenes de compra)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    precio: number
    precio_oferta?: number
  } | null>(null)
  const [savingProduct, setSavingProduct] = useState(false)

  // Cargar productos
  useEffect(() => {
    loadProductos()
  }, [])

  const loadProductos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/tienda/productos?pagination[pageSize]=1000')
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar productos')
      }
      
      const productosData = Array.isArray(result.data) ? result.data : [result.data]
      
      // Transformar productos para mostrar información relevante
      const productosTransformados = productosData.map((producto: any) => {
        const attrs = producto.attributes || producto
        
        // Obtener stock
        let stock = 0
        if (attrs.stock_quantity !== undefined && attrs.stock_quantity !== null) {
          stock = parseInt(String(attrs.stock_quantity)) || 0
        } else {
          // Fallback: buscar en relación stocks
          const stocks = attrs.stocks?.data || attrs.STOCKS?.data || []
          if (Array.isArray(stocks) && stocks.length > 0) {
            stock = stocks.reduce((sum: number, stockItem: any) => {
              const cantidad = stockItem?.attributes?.cantidad_disponible || stockItem?.cantidad_disponible || 0
              return sum + (typeof cantidad === 'number' ? cantidad : parseInt(String(cantidad)) || 0)
            }, 0)
          }
        }
        
        // Obtener precio
        const precio = attrs.precio || attrs.precio_regular || 0
        
        // Obtener autor
        const autor = attrs.autor_relacion?.data?.attributes?.nombre_autor || 
                     attrs.autor_relacion?.attributes?.nombre_autor ||
                     attrs.autor || '-'
        
        // Obtener editorial
        const editorial = attrs.editorial?.data?.attributes?.nombre_editorial ||
                         attrs.editorial?.attributes?.nombre_editorial ||
                         attrs.editorial_nombre || '-'
        
        // Obtener portada
        const portada = attrs.portada_libro?.data?.attributes?.url ||
                       attrs.portada_libro?.attributes?.url ||
                       attrs.portada?.url
        
        return {
          id: producto.documentId || producto.id,
          documentId: producto.documentId,
          nombre_libro: attrs.nombre_libro || attrs.nombre || 'Sin nombre',
          isbn_libro: attrs.isbn_libro || attrs.isbn || attrs.sku || '-',
          sku: attrs.sku || attrs.isbn_libro || '-',
          precio: precio,
          precio_regular: attrs.precio_regular || precio,
          stock_quantity: stock,
          stock_status: attrs.stock_status || (stock > 0 ? 'instock' : 'outofstock'),
          autor: autor,
          editorial: editorial,
          portada: portada,
        }
      })
      
      setProductos(productosTransformados)
    } catch (err: any) {
      console.error('Error al cargar productos:', err)
      setError(err.message || 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar productos por búsqueda y stock
  const filteredProductos = useMemo(() => {
    let filtered = productos
    
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((p) => {
        return (
          p.nombre_libro?.toLowerCase().includes(term) ||
          p.isbn_libro?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.autor?.toLowerCase().includes(term) ||
          p.editorial?.toLowerCase().includes(term)
        )
      })
    }
    
    // Filtro por stock
    if (stockFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const stock = p.stock_quantity || 0
        switch (stockFilter) {
          case 'instock':
            return stock > 10
          case 'low':
            return stock > 0 && stock <= 10
          case 'outofstock':
            return stock === 0 || p.stock_status === 'outofstock'
          default:
            return true
        }
      })
    }
    
    return filtered
  }, [productos, searchTerm, stockFilter])

  // Manejar selección de productos
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
      // Eliminar cantidad cuando se deselecciona
      const newCantidades = { ...productosCantidades }
      delete newCantidades[productId]
      setProductosCantidades(newCantidades)
    } else {
      newSelected.add(productId)
      // Inicializar cantidad en 1 si no existe
      if (!productosCantidades[productId]) {
        setProductosCantidades({ ...productosCantidades, [productId]: 1 })
      }
    }
    setSelectedProducts(newSelected)
  }

  // Actualizar cantidad de un producto
  const updateCantidad = (productId: string, cantidad: number) => {
    const cantidadNum = Math.max(1, Math.floor(cantidad || 1))
    setProductosCantidades({ ...productosCantidades, [productId]: cantidadNum })
  }

  // Funciones para editar precios (stock solo lectura - se actualiza via órdenes de compra)
  const handleEditProduct = (producto: Producto) => {
    setEditingProduct(String(producto.id))
    setEditFormData({
      precio: producto.precio || 0,
      precio_oferta: producto.precio_regular && producto.precio_regular !== producto.precio ? producto.precio_regular : undefined,
    })
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditFormData(null)
  }

  const handleSaveProduct = async (producto: Producto) => {
    if (!editFormData) return

    setSavingProduct(true)
    try {
      const productId = producto.documentId || producto.id
      
      // Solo actualizar precios (stock se gestiona via órdenes de compra)
      const updateData: any = {
        precio: editFormData.precio,
      }
      
      if (editFormData.precio_oferta) {
        updateData.precio_oferta = editFormData.precio_oferta
      }

      const response = await fetch(`/api/tienda/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar producto')
      }

      // Actualizar producto en el estado local (solo precios, stock no cambia)
      setProductos(prev => prev.map(p => {
        if (String(p.id) === String(producto.id)) {
          return {
            ...p,
            precio: editFormData.precio,
            precio_regular: editFormData.precio_oferta || editFormData.precio,
          }
        }
        return p
      }))

      showNotification({
        title: 'Éxito',
        message: 'Precio actualizado correctamente',
        variant: 'success',
      })

      setEditingProduct(null)
      setEditFormData(null)
    } catch (err: any) {
      console.error('Error al guardar producto:', err)
      showNotification({
        title: 'Error',
        message: err.message || 'Error al actualizar el producto',
        variant: 'danger',
      })
    } finally {
      setSavingProduct(false)
    }
  }

  const selectAllProducts = () => {
    if (selectedProducts.size === filteredProductos.length) {
      setSelectedProducts(new Set())
      setProductosCantidades({})
    } else {
      const newSelected = new Set(filteredProductos.map(p => String(p.id)))
      setSelectedProducts(newSelected)
      // Inicializar todas las cantidades en 1
      const newCantidades = { ...productosCantidades }
      filteredProductos.forEach(p => {
        if (!newCantidades[String(p.id)]) {
          newCantidades[String(p.id)] = 1
        }
      })
      setProductosCantidades(newCantidades)
    }
  }

  // Abrir modal de proveedores
  const handleGenerarRFQ = async () => {
    if (selectedProducts.size === 0) {
      showNotification({
        title: 'Error',
        message: 'Debes seleccionar al menos un producto',
        variant: 'danger',
      })
      return
    }

    // Cargar empresas (propias y proveedoras) para RFQs
    // Las empresas propias también pueden recibir RFQs para vincular cotizaciones
    setLoadingProveedores(true)
    try {
      const response = await fetch('/api/crm/empresas?pagination[pageSize]=1000')
      const result = await response.json()
      
      if (result.success && result.data) {
        const empresasData = Array.isArray(result.data) ? result.data : [result.data]
        const proveedoresMapeados: EmpresaOption[] = empresasData.map((emp: any) => {
          const attrs = emp.attributes || emp
          
          // Validar y limpiar documentId
          let documentId = emp.documentId
          if (documentId && typeof documentId === 'string') {
            // Remover caracteres inválidos (como @) que no deberían estar en un documentId
            documentId = documentId.replace(/[@]/g, '0')
            // Validar que sea un UUID válido (27 caracteres alfanuméricos en Strapi v5)
            if (documentId.length < 20 || documentId.length > 30) {
              console.warn(`[Inventario/Proveedores] ⚠️ documentId con longitud inválida: ${documentId} (${documentId.length} caracteres)`)
            }
          }
          
          // Usar documentId como ID principal, con fallback a id numérico
          const empresaId = documentId || emp.id
          
          // Logging para debugging
          if (emp.documentId && emp.documentId !== documentId) {
            console.warn(`[Inventario/Proveedores] ⚠️ documentId corregido:`, {
              original: emp.documentId,
              corregido: documentId,
              empresa: attrs.empresa_nombre || attrs.nombre,
            })
          }
          
          return {
            id: empresaId,
            documentId: documentId,
            internalId: emp.id, // Guardar también el ID numérico por si acaso
            empresa_nombre: attrs.empresa_nombre || attrs.nombre,
            nombre: attrs.nombre,
            emails: attrs.emails?.data || attrs.emails || [],
            es_empresa_propia: attrs.es_empresa_propia || false,
          } as EmpresaOption
        })
        console.log('[Inventario/Proveedores] Proveedores cargados:', {
          total: proveedoresMapeados.length,
          primeros: proveedoresMapeados.slice(0, 5).map((p: EmpresaOption) => ({
            id: p.id,
            documentId: p.documentId,
            internalId: p.internalId,
            nombre: p.empresa_nombre,
            tipoId: typeof p.id,
            tieneDocumentId: !!p.documentId,
          })),
          todosLosIds: proveedoresMapeados.map((p: EmpresaOption) => ({
            id: p.id,
            documentId: p.documentId,
            nombre: p.empresa_nombre,
          })),
        })
        setProveedores(proveedoresMapeados)
        setShowProveedoresModal(true)
      }
    } catch (err: any) {
      console.error('Error al cargar proveedores:', err)
      showNotification({
        title: 'Error',
        message: 'Error al cargar proveedores',
        variant: 'danger',
      })
    } finally {
      setLoadingProveedores(false)
    }
  }

  // Crear RFQ
  const handleCrearRFQ = async () => {
    if (selectedProveedores.size === 0) {
      showNotification({
        title: 'Error',
        message: 'Debes seleccionar al menos un proveedor',
        variant: 'danger',
      })
      return
    }

    if (!rfqData.nombre.trim()) {
      showNotification({
        title: 'Error',
        message: 'El nombre de la RFQ es obligatorio',
        variant: 'danger',
      })
      return
    }

    setCreatingRFQ(true)
    try {
      // Obtener productos seleccionados con cantidades
      const productosSeleccionados = Array.from(selectedProducts).map(id => {
        const producto = productos.find(p => String(p.id) === id)
        return {
          id: producto?.documentId || producto?.id || id,
          cantidad: productosCantidades[id] || 1,
        }
      })

      // Preparar IDs de empresas (usar documentId si está disponible)
      const empresasIds = Array.from(selectedProveedores).map(id => {
        // Limpiar el ID de caracteres inválidos
        const idLimpio = typeof id === 'string' ? id.replace(/[@]/g, '0') : id
        
        console.log(`[Inventario/Proveedores] 🔍 Procesando ID de proveedor:`, {
          idOriginal: id,
          idLimpio: idLimpio,
          tipo: typeof id,
        })
        
        // Buscar el proveedor por id o documentId
        const proveedor = proveedores.find(p => 
          String(p.id) === String(idLimpio) || 
          String(p.documentId) === String(idLimpio) ||
          String(p.internalId) === String(idLimpio) ||
          String(p.id) === String(id) || 
          String(p.documentId) === String(id) ||
          String(p.internalId) === String(id)
        )
        
        if (!proveedor) {
          console.error(`[Inventario/Proveedores] ❌ Proveedor con ID ${id} (limpio: ${idLimpio}) no encontrado en la lista cargada`, {
            idBuscado: id,
            idLimpio: idLimpio,
            proveedoresDisponibles: proveedores.map(p => ({
              id: p.id,
              documentId: p.documentId,
              internalId: p.internalId,
              nombre: p.empresa_nombre || p.nombre,
            })),
          })
          // Intentar usar el ID limpio directamente (podría ser un documentId válido)
          return idLimpio
        }
        
        // Priorizar documentId, luego id, luego internalId
        const empresaId = proveedor.documentId || proveedor.id || proveedor.internalId || idLimpio
        
        // Validar que el ID final sea válido
        if (!empresaId || empresaId === 'undefined' || empresaId === 'null') {
          console.error(`[Inventario/Proveedores] ❌ ID de empresa inválido:`, {
            empresaId,
            proveedor: {
              nombre: proveedor.empresa_nombre || proveedor.nombre,
              documentId: proveedor.documentId,
              id: proveedor.id,
              internalId: proveedor.internalId,
            },
          })
          throw new Error(`ID de empresa inválido para ${proveedor.empresa_nombre || proveedor.nombre}`)
        }
        
        console.log(`[Inventario/Proveedores] ✅ Empresa mapeada:`, {
          idSeleccionado: id,
          idLimpio: idLimpio,
          proveedorEncontrado: !!proveedor,
          nombre: proveedor.empresa_nombre || proveedor.nombre,
          documentId: proveedor.documentId,
          id: proveedor.id,
          internalId: proveedor.internalId,
          idFinal: empresaId,
          tipoIdFinal: typeof empresaId,
        })
        
        return empresaId
      }).filter(id => {
        // Filtrar IDs inválidos
        if (!id || id === 'undefined' || id === 'null') return false
        // Aceptar strings (documentIds) o números válidos
        if (typeof id === 'string' && id.length > 0) return true
        if (typeof id === 'number' && !isNaN(id) && id > 0) return true
        return false
      })

      console.log('[Inventario/Proveedores] 📊 Preparando RFQ:', {
        empresasSeleccionadas: Array.from(selectedProveedores),
        empresasIds,
        empresasIdsCount: empresasIds.length,
        proveedoresCargados: proveedores.length,
        productosSeleccionados: productosSeleccionados.map(p => ({ id: p.id, cantidad: p.cantidad })),
        productosCantidades: productosSeleccionados.reduce((acc, p) => {
          acc[String(p.id)] = p.cantidad
          return acc
        }, {} as Record<string, number>),
      })
      
      // Validar que tengamos al menos una empresa válida
      if (empresasIds.length === 0) {
        throw new Error('No se encontraron empresas válidas. Por favor, selecciona al menos un proveedor.')
      }

      const rfqPayload = {
        nombre: rfqData.nombre,
        descripcion: rfqData.descripcion || '',
        fecha_solicitud: new Date().toISOString().split('T')[0],
        fecha_vencimiento: rfqData.fecha_vencimiento || '',
        moneda: rfqData.moneda,
        notas_internas: rfqData.notas_internas || '',
        empresas: empresasIds,
        productos: productosSeleccionados.map(p => p.id),
        productos_cantidades: productosSeleccionados.reduce((acc, p) => {
          acc[String(p.id)] = p.cantidad
          return acc
        }, {} as Record<string, number>),
      }

      const response = await fetch('/api/compras/rfqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rfqPayload),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al crear RFQ')
      }

      showNotification({
        title: 'Éxito',
        message: 'RFQ creada exitosamente',
        variant: 'success',
      })

      // Limpiar selección y cerrar modal
      setSelectedProducts(new Set())
      setProductosCantidades({})
      setSelectedProveedores(new Set())
      setShowProveedoresModal(false)
      setRfqData({
        nombre: '',
        descripcion: '',
        fecha_vencimiento: '',
        moneda: 'CLP',
        notas_internas: '',
      })

      // Redirigir a la RFQ creada
      if (result.data) {
        const rfqId = result.data.documentId || result.data.id
        window.location.href = `/crm/compras/rfqs/${rfqId}`
      }
    } catch (err: any) {
      console.error('Error al crear RFQ:', err)
      showNotification({
        title: 'Error',
        message: err.message || 'Error al crear RFQ',
        variant: 'danger',
      })
    } finally {
      setCreatingRFQ(false)
    }
  }

  const toggleProveedorSelection = (proveedorId: string) => {
    const newSelected = new Set(selectedProveedores)
    if (newSelected.has(proveedorId)) {
      newSelected.delete(proveedorId)
    } else {
      newSelected.add(proveedorId)
    }
    setSelectedProveedores(newSelected)
  }

  const getStockBadge = (stock: number, status?: string) => {
    if (stock === 0 || status === 'outofstock') {
      return <Badge bg="danger">Sin Stock</Badge>
    }
    if (stock < 10) {
      return <Badge bg="warning">{stock} unidades</Badge>
    }
    return <Badge bg="success">{stock} unidades</Badge>
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Inventario - Proveedores" subtitle="Inventario · Compras" />
      
      {/* Información sobre gestión de stock */}
      <Alert variant="info" className="mb-3">
        <div className="d-flex align-items-center">
          <LuPackage className="me-2" size={20} />
          <div>
            <strong>Gestión de Inventario:</strong> El <strong>precio</strong> se puede editar directamente. 
            El <strong>stock</strong> solo se actualiza automáticamente cuando se confirma la recepción de una <strong>Orden de Compra</strong>.
            <br />
            <small className="text-muted">
              Para aumentar stock: Crear RFQ → Recibir Cotización → Generar Orden de Compra → Confirmar Recepción
            </small>
          </div>
        </div>
      </Alert>
      
      {/* Panel de productos seleccionados */}
      {selectedProducts.size > 0 && (
        <Card className="mb-3 border-primary">
          <CardHeader className="bg-primary-subtle">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <LuShoppingCart className="me-2" />
                Productos Seleccionados ({selectedProducts.size})
              </h5>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  setSelectedProducts(new Set())
                  setProductosCantidades({})
                }}
              >
                Limpiar Selección
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-responsive">
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>ISBN</th>
                    <th style={{ width: '120px' }}>Cantidad</th>
                    <th className="text-end">Stock Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(selectedProducts).map((productId) => {
                    const producto = productos.find(p => String(p.id) === productId)
                    if (!producto) return null
                    const cantidad = productosCantidades[productId] || 1
                    return (
                      <tr key={productId}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {producto.portada && (
                              <img
                                src={producto.portada.startsWith('http') ? producto.portada : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${producto.portada}`}
                                alt={producto.nombre_libro}
                                style={{ width: '30px', height: '45px', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            )}
                            <div>
                              <div className="fw-semibold small">{producto.nombre_libro}</div>
                              <small className="text-muted">{producto.autor}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <small>{producto.isbn_libro}</small>
                        </td>
                        <td>
                          <InputGroup size="sm">
                            <Button
                              variant="outline-secondary"
                              onClick={() => updateCantidad(productId, cantidad - 1)}
                              disabled={cantidad <= 1}
                            >
                              -
                            </Button>
                            <FormControl
                              type="number"
                              min="1"
                              value={cantidad}
                              onChange={(e) => updateCantidad(productId, parseInt(e.target.value) || 1)}
                              style={{ textAlign: 'center' }}
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => updateCantidad(productId, cantidad + 1)}
                            >
                              +
                            </Button>
                          </InputGroup>
                        </td>
                        <td className="text-end">
                          {getStockBadge(producto.stock_quantity || 0, producto.stock_status)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}
      
      <Card className="mb-4">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Productos Disponibles
            {selectedProducts.size > 0 && (
              <Badge bg="primary" className="ms-2">{selectedProducts.size} seleccionados</Badge>
            )}
          </h5>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={selectAllProducts}
            >
              {selectedProducts.size === filteredProductos.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerarRFQ}
              disabled={selectedProducts.size === 0}
            >
              <LuShoppingCart className="me-1" />
              Generar RFQ ({selectedProducts.size})
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Filtros y Búsqueda */}
          <Row className="mb-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <LuSearch />
                </InputGroup.Text>
                <FormControl
                  placeholder="Buscar por nombre, ISBN, SKU, autor o editorial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
              >
                <option value="all">Todos los productos</option>
                <option value="instock">Con stock (10+)</option>
                <option value="low">Stock bajo (1-10)</option>
                <option value="outofstock">Sin stock</option>
              </Form.Select>
            </Col>
          </Row>
          
          {selectedProducts.size > 0 && (
            <Alert variant="info" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span>
                  <strong>{selectedProducts.size} producto(s)</strong> seleccionado(s). 
                  {Object.values(productosCantidades).reduce((sum, cant) => sum + cant, 0) > 0 && (
                    <span className="ms-2">
                      Total: <strong>{Object.values(productosCantidades).reduce((sum, cant) => sum + cant, 0)} unidades</strong>
                    </span>
                  )}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerarRFQ}
                >
                  <LuShoppingCart className="me-1" />
                  Generar RFQ
                </Button>
              </div>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Cargando productos...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : filteredProductos.length === 0 ? (
            <Alert variant="info">
              {searchTerm ? 'No se encontraron productos con ese criterio de búsqueda' : 'No hay productos disponibles'}
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <FormCheck
                        checked={selectedProducts.size === filteredProductos.length && filteredProductos.length > 0}
                        onChange={selectAllProducts}
                      />
                    </th>
                    <th>Producto</th>
                    <th>ISBN/SKU</th>
                    <th>Autor</th>
                    <th>Editorial</th>
                    <th className="text-center">Stock</th>
                    <th className="text-end">Precio</th>
                    <th className="text-center" style={{ width: '100px' }}>Acciones</th>
                    {selectedProducts.size > 0 && (
                      <th className="text-center" style={{ width: '120px' }}>Cantidad</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredProductos.map((producto) => {
                    const isSelected = selectedProducts.has(String(producto.id))
                    return (
                      <tr key={producto.id} className={isSelected ? 'table-active' : ''}>
                        <td>
                          <FormCheck
                            checked={isSelected}
                            onChange={() => toggleProductSelection(String(producto.id))}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {producto.portada && (
                              <img
                                src={producto.portada.startsWith('http') ? producto.portada : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'}${producto.portada}`}
                                alt={producto.nombre_libro}
                                style={{ width: '40px', height: '60px', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            )}
                            <div>
                              <div className="fw-semibold">{producto.nombre_libro}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{producto.isbn_libro}</div>
                            {producto.sku && producto.sku !== producto.isbn_libro && (
                              <small className="text-muted">SKU: {producto.sku}</small>
                            )}
                          </div>
                        </td>
                        <td>{producto.autor}</td>
                        <td>{producto.editorial}</td>
                        <td className="text-center">
                          {/* Stock solo lectura - se actualiza mediante órdenes de compra */}
                          {getStockBadge(producto.stock_quantity || 0, producto.stock_status)}
                        </td>
                        <td className="text-end">
                          {editingProduct === String(producto.id) && editFormData ? (
                            <div>
                              <FormControl
                                type="number"
                                step="0.01"
                                min="0"
                                size="sm"
                                style={{ width: '100px' }}
                                placeholder="Precio"
                                value={editFormData.precio}
                                onChange={(e) => setEditFormData({
                                  ...editFormData,
                                  precio: parseFloat(e.target.value) || 0,
                                })}
                              />
                              <FormControl
                                type="number"
                                step="0.01"
                                min="0"
                                size="sm"
                                className="mt-1"
                                style={{ width: '100px' }}
                                placeholder="Precio oferta"
                                value={editFormData.precio_oferta || ''}
                                onChange={(e) => setEditFormData({
                                  ...editFormData,
                                  precio_oferta: e.target.value ? parseFloat(e.target.value) : undefined,
                                })}
                              />
                            </div>
                          ) : (
                            producto.precio ? (
                              <div>
                                <strong>${Number(producto.precio).toLocaleString('es-CL')}</strong>
                                {producto.precio_regular && producto.precio_regular !== producto.precio && (
                                  <div>
                                    <small className="text-muted text-decoration-line-through">
                                      ${Number(producto.precio_regular).toLocaleString('es-CL')}
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )
                          )}
                        </td>
                        <td className="text-center">
                          {editingProduct === String(producto.id) ? (
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleSaveProduct(producto)}
                                disabled={savingProduct}
                              >
                                {savingProduct ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <LuSave size={16} />
                                )}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={savingProduct}
                              >
                                <LuCheck size={16} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditProduct(producto)}
                              title="Editar inventario y precio"
                            >
                              <LuPencil size={16} />
                            </Button>
                          )}
                        </td>
                        {selectedProducts.size > 0 && (
                          <td className="text-center">
                            {isSelected ? (
                              <InputGroup size="sm">
                                <Button
                                  variant="outline-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateCantidad(String(producto.id), (productosCantidades[String(producto.id)] || 1) - 1)
                                  }}
                                  disabled={(productosCantidades[String(producto.id)] || 1) <= 1}
                                >
                                  -
                                </Button>
                                <FormControl
                                  type="number"
                                  min="1"
                                  value={productosCantidades[String(producto.id)] || 1}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateCantidad(String(producto.id), parseInt(e.target.value) || 1)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ textAlign: 'center', width: '60px' }}
                                />
                                <Button
                                  variant="outline-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateCantidad(String(producto.id), (productosCantidades[String(producto.id)] || 1) + 1)
                                  }}
                                >
                                  +
                                </Button>
                              </InputGroup>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de Selección de Proveedores */}
      <Modal show={showProveedoresModal} onHide={() => setShowProveedoresModal(false)} size="lg">
        <ModalHeader closeButton>
          <ModalTitle>Generar RFQ - Seleccionar Proveedores</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Alert variant="info" className="mb-3">
            <div>
              <strong>{selectedProducts.size} producto(s)</strong> seleccionado(s) para la RFQ
              {Object.values(productosCantidades).length > 0 && (
                <div className="mt-2">
                  <strong>Total de unidades:</strong> {Object.values(productosCantidades).reduce((sum, cant) => sum + cant, 0)}
                </div>
              )}
            </div>
          </Alert>
          
          {/* Resumen de productos seleccionados */}
          {selectedProducts.size > 0 && (
            <div className="mb-3 p-3 bg-light rounded">
              <h6 className="mb-2">Productos Seleccionados:</h6>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {Array.from(selectedProducts).map((productId) => {
                  const producto = productos.find(p => String(p.id) === productId)
                  if (!producto) return null
                  const cantidad = productosCantidades[productId] || 1
                  return (
                    <div key={productId} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <div className="flex-grow-1">
                        <small className="fw-semibold">{producto.nombre_libro}</small>
                        <br />
                        <small className="text-muted">{producto.isbn_libro}</small>
                      </div>
                      <div className="text-end">
                        <Badge bg="primary">{cantidad} unidad{cantidad !== 1 ? 'es' : ''}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Nombre de la RFQ *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Solicitud de cotización - Enero 2026"
              value={rfqData.nombre}
              onChange={(e) => setRfqData({ ...rfqData, nombre: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Descripción opcional de la solicitud..."
              value={rfqData.descripcion}
              onChange={(e) => setRfqData({ ...rfqData, descripcion: e.target.value })}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha de Vencimiento</Form.Label>
                <Form.Control
                  type="date"
                  value={rfqData.fecha_vencimiento}
                  onChange={(e) => setRfqData({ ...rfqData, fecha_vencimiento: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Moneda</Form.Label>
                <Form.Select
                  value={rfqData.moneda}
                  onChange={(e) => setRfqData({ ...rfqData, moneda: e.target.value })}
                >
                  <option value="CLP">CLP (Peso Chileno)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Notas Internas</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Notas internas (no se enviarán a los proveedores)..."
              value={rfqData.notas_internas}
              onChange={(e) => setRfqData({ ...rfqData, notas_internas: e.target.value })}
            />
          </Form.Group>

          <hr />

          <div className="mb-3">
            <Form.Label className="fw-semibold">Seleccionar Empresas *</Form.Label>
            <small className="text-muted d-block mb-2">
              Las empresas proveedoras recibirán la RFQ por email. Las empresas propias se vincularán sin recibir email.
            </small>
            {loadingProveedores ? (
              <div className="text-center py-3">
                <Spinner size="sm" />
                <p className="text-muted mt-2 mb-0">Cargando empresas...</p>
              </div>
            ) : proveedores.length === 0 ? (
              <Alert variant="warning">No hay empresas disponibles</Alert>
            ) : (
              <>
                {/* Sección de Empresas Proveedoras */}
                <div className="mb-3">
                  <h6 className="text-info mb-2">
                    <span className="badge bg-info-subtle text-info me-2">Proveedoras</span>
                    Empresas que recibirán la RFQ por email
                  </h6>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                    {proveedores.filter((p: any) => !p.es_empresa_propia).length === 0 ? (
                      <Alert variant="info" className="mb-0 py-2">
                        <small>No hay empresas proveedoras disponibles</small>
                      </Alert>
                    ) : (
                      proveedores
                        .filter((p: any) => !p.es_empresa_propia)
                        .map((proveedor) => {
                          const isSelected = selectedProveedores.has(String(proveedor.id))
                          const emailPrincipal = proveedor.emails?.[0]?.email
                          return (
                            <div
                              key={proveedor.id}
                              className={`p-2 mb-2 border rounded ${isSelected ? 'bg-info-subtle' : 'bg-light'}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleProveedorSelection(String(proveedor.id))}
                            >
                              <FormCheck
                                checked={isSelected}
                                onChange={() => toggleProveedorSelection(String(proveedor.id))}
                                label={
                                  <div>
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="fw-semibold">{proveedor.empresa_nombre || proveedor.nombre}</span>
                                      <span className="badge bg-info-subtle text-info border border-info-subtle" style={{ fontSize: '0.7rem' }}>
                                        Proveedora
                                      </span>
                                    </div>
                                    {emailPrincipal && (
                                      <small className="text-muted">{emailPrincipal}</small>
                                    )}
                                  </div>
                                }
                              />
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>

                {/* Sección de Empresas Propias */}
                <div className="mb-3">
                  <h6 className="text-success mb-2">
                    <span className="badge bg-success-subtle text-success me-2">Propias</span>
                    Empresas que se vincularán sin recibir email
                  </h6>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                    {proveedores.filter((p: any) => p.es_empresa_propia).length === 0 ? (
                      <Alert variant="info" className="mb-0 py-2">
                        <small>No hay empresas propias disponibles</small>
                      </Alert>
                    ) : (
                      proveedores
                        .filter((p: any) => p.es_empresa_propia)
                        .map((proveedor) => {
                          const isSelected = selectedProveedores.has(String(proveedor.id))
                          const emailPrincipal = proveedor.emails?.[0]?.email
                          return (
                            <div
                              key={proveedor.id}
                              className={`p-2 mb-2 border rounded ${isSelected ? 'bg-success-subtle' : 'bg-light'}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => toggleProveedorSelection(String(proveedor.id))}
                            >
                              <FormCheck
                                checked={isSelected}
                                onChange={() => toggleProveedorSelection(String(proveedor.id))}
                                label={
                                  <div>
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="fw-semibold">{proveedor.empresa_nombre || proveedor.nombre}</span>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.7rem' }}>
                                        Empresa Propia
                                      </span>
                                    </div>
                                    {emailPrincipal && (
                                      <small className="text-muted">{emailPrincipal}</small>
                                    )}
                                  </div>
                                }
                              />
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowProveedoresModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCrearRFQ}
            disabled={creatingRFQ || selectedProveedores.size === 0 || !rfqData.nombre.trim()}
          >
            {creatingRFQ ? (
              <>
                <Spinner size="sm" className="me-2" />
                Creando...
              </>
            ) : (
              <>
                <LuCheck className="me-1" />
                Crear RFQ
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  )
}

