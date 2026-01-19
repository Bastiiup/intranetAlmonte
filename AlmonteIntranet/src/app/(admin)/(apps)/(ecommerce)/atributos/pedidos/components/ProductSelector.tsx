'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Modal, Form, Table, Badge, InputGroup, FormControl, Alert, Spinner } from 'react-bootstrap'
import { TbPlus, TbSearch, TbX } from 'react-icons/tb'

interface WooCommerceProduct {
  id: number
  name: string
  sku?: string
  price: string
  regular_price?: string
  sale_price?: string
  stock_quantity?: number
  stock_status?: 'instock' | 'outofstock' | 'onbackorder'
  images?: Array<{ src: string }>
}

interface SelectedProduct {
  id: number
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface ProductSelectorProps {
  originPlatform: 'woo_moraleja' | 'woo_escolar' | 'otros'
  selectedProducts: SelectedProduct[]
  onProductsChange: (products: SelectedProduct[]) => void
}

const ProductSelector = ({ originPlatform, selectedProducts, onProductsChange }: ProductSelectorProps) => {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<WooCommerceProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Debug: Log cuando cambia originPlatform
  useEffect(() => {
    console.log('[ProductSelector] 🔄 originPlatform cambió:', {
      originPlatform,
      isEscolar: originPlatform === 'woo_escolar',
      isMoraleja: originPlatform === 'woo_moraleja',
      isOtros: originPlatform === 'otros',
      buttonDisabled: originPlatform === 'otros'
    })
  }, [originPlatform])

  // Obtener productos de WooCommerce según la plataforma con paginación
  const fetchProducts = useCallback(async () => {
    if (originPlatform === 'otros') {
      setError('Selecciona una plataforma WooCommerce para ver productos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Obtener productos de WooCommerce según la plataforma
      const platformParam = originPlatform === 'woo_escolar' ? 'escolar' : 'moraleja'
      
      console.log('[ProductSelector] 🔍 Cargando productos para plataforma:', {
        originPlatform,
        platformParam
      })
      
      // Cargar todos los productos con paginación
      let allProducts: WooCommerceProduct[] = []
      let page = 1
      const perPage = 100
      let hasMore = true

      while (hasMore) {
        // No filtrar por stock_status para obtener todos los productos disponibles
        const url = `/api/woocommerce/products?platform=${platformParam}&per_page=${perPage}&page=${page}`
        
        console.log(`[ProductSelector] 📄 Cargando página ${page}...`)
        
        const response = await fetch(url)
        const data = await response.json()

        console.log(`[ProductSelector] 📦 Respuesta página ${page}:`, {
          success: data.success,
          hasData: !!data.data,
          dataLength: data.data?.length || 0,
          error: data.error
        })

        if (data.success && data.data) {
          const pageProducts = Array.isArray(data.data) ? data.data : [data.data]
          
          if (pageProducts.length > 0) {
            allProducts = [...allProducts, ...pageProducts]
            // Si recibimos menos productos que perPage, es la última página
            hasMore = pageProducts.length === perPage
            page++
          } else {
            hasMore = false
          }
        } else {
          const errorMsg = data.error || 'Error al obtener productos'
          console.error('[ProductSelector] ❌ Error en respuesta:', errorMsg)
          throw new Error(errorMsg)
        }
      }

      setProducts(allProducts)
      console.log('[ProductSelector] ✅ Productos cargados exitosamente:', {
        total: allProducts.length,
        platform: platformParam
      })
    } catch (err: any) {
      console.error('[ProductSelector] ❌ Error al obtener productos:', {
        error: err,
        message: err.message,
        originPlatform,
        stack: err.stack
      })
      setError(err.message || `Error al obtener productos de WooCommerce (${originPlatform === 'woo_escolar' ? 'Escolar' : 'Moraleja'})`)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [originPlatform])

  // Cargar productos cuando se abre el modal o cambia la plataforma
  useEffect(() => {
    if (originPlatform === 'otros') {
      // Si se selecciona "otros", cerrar modal y limpiar estado
      setShow(false)
      setProducts([])
      setSearchTerm('')
      setError('Selecciona una plataforma WooCommerce para ver productos')
      return
    }
    
    // Si el modal está abierto, cargar productos de la plataforma seleccionada
    if (show) {
      console.log('[ProductSelector] 🔄 Cargando productos:', { originPlatform, show })
      setProducts([]) // Limpiar productos anteriores
      setError(null) // Limpiar errores anteriores
      fetchProducts()
    }
  }, [show, originPlatform, fetchProducts])

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agregar producto al pedido
  const handleAddProduct = (product: WooCommerceProduct) => {
    // ⚠️ VALIDACIÓN CRÍTICA: Obtener y validar el precio
    // Usar regular_price si price es 0 o vacío (como en WooCommerce)
    const priceStr = product.price && parseFloat(product.price) > 0 
      ? product.price 
      : (product.regular_price || '0')
    const price = parseFloat(priceStr)
    
    console.log('[ProductSelector] 💰 Precio del producto:', {
      productName: product.name,
      price: product.price,
      regular_price: product.regular_price,
      priceStr,
      priceFinal: price
    })
    
    if (!price || price <= 0) {
      setError(`El producto "${product.name}" no tiene un precio válido (precio: ${product.price}, precio regular: ${product.regular_price}). No se puede agregar al pedido.`)
      setTimeout(() => setError(null), 5000)
      return
    }
    
    const existingProduct = selectedProducts.find((p) => p.id === product.id)

    if (existingProduct) {
      // Si ya existe, aumentar cantidad
      const updated = selectedProducts.map((p) =>
        p.id === product.id
          ? {
              ...p,
              quantity: p.quantity + 1,
              subtotal: (p.quantity + 1) * p.price,
            }
          : p
      )
      onProductsChange(updated)
    } else {
      // Si no existe, agregar nuevo con precio validado
      const newProduct: SelectedProduct = {
        id: product.id,
        name: product.name,
        price: price, // ✅ Precio validado (> 0)
        quantity: 1,
        subtotal: price, // ✅ Precio * cantidad
      }
      
      console.log('[ProductSelector] ✅ Agregando producto con precio válido:', {
        id: newProduct.id,
        name: newProduct.name,
        price: newProduct.price,
        quantity: newProduct.quantity,
        subtotal: newProduct.subtotal
      })
      
      onProductsChange([...selectedProducts, newProduct])
    }
  }

  // Actualizar cantidad de un producto
  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity < 1) {
      handleRemoveProduct(productId)
      return
    }

    const updated = selectedProducts.map((p) =>
      p.id === productId
        ? {
            ...p,
            quantity,
            subtotal: quantity * p.price,
          }
        : p
    )
    onProductsChange(updated)
  }

  // Eliminar producto del pedido
  const handleRemoveProduct = (productId: number) => {
    const updated = selectedProducts.filter((p) => p.id !== productId)
    onProductsChange(updated)
  }

  // Calcular totales
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0)

  return (
    <>
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Productos del Pedido</h6>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => {
              console.log('[ProductSelector] 🔘 Botón "Agregar Productos" clickeado:', {
                originPlatform,
                show,
                canOpen: originPlatform !== 'otros',
                isEscolar: originPlatform === 'woo_escolar',
                isMoraleja: originPlatform === 'woo_moraleja'
              })
              if (originPlatform === 'otros') {
                console.warn('[ProductSelector] ⚠️ Intento de abrir modal con plataforma "otros"')
                return
              }
              console.log('[ProductSelector] ✅ Abriendo modal para:', originPlatform)
              setShow(true)
            }}
            disabled={originPlatform === 'otros'}
            title={originPlatform === 'otros' ? 'Selecciona una plataforma WooCommerce primero' : `Agregar productos de ${originPlatform === 'woo_escolar' ? 'Escolar' : 'Moraleja'}`}
            style={{
              opacity: originPlatform === 'otros' ? 0.5 : 1,
              cursor: originPlatform === 'otros' ? 'not-allowed' : 'pointer'
            }}
          >
            <TbPlus className="me-1" />
            Agregar Productos
            {originPlatform === 'woo_escolar' && ' (Escolar)'}
            {originPlatform === 'woo_moraleja' && ' (Moraleja)'}
          </Button>
        </div>

        {originPlatform === 'otros' && (
          <Alert variant="info" className="mb-2 py-2">
            <small>Selecciona una plataforma WooCommerce para agregar productos</small>
          </Alert>
        )}

        {selectedProducts.length > 0 ? (
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ width: '100px' }}>Precio</th>
                <th style={{ width: '120px' }}>Cantidad</th>
                <th style={{ width: '100px' }}>Subtotal</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>${product.price.toLocaleString('es-CL')}</td>
                  <td>
                    <InputGroup size="sm">
                      <FormControl
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) =>
                          handleQuantityChange(product.id, parseInt(e.target.value) || 1)
                        }
                      />
                    </InputGroup>
                  </td>
                  <td>${product.subtotal.toLocaleString('es-CL')}</td>
                  <td>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      <TbX />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-end fw-bold">
                  Subtotal:
                </td>
                <td className="fw-bold">${subtotal.toLocaleString('es-CL')}</td>
                <td></td>
              </tr>
            </tfoot>
          </Table>
        ) : (
          <Alert variant="light" className="mb-0 py-2">
            <small className="text-muted">No hay productos agregados al pedido</small>
          </Alert>
        )}
      </div>

      <Modal 
        show={show} 
        onHide={() => {
          console.log('[ProductSelector] 🔒 Cerrando modal')
          setShow(false)
        }} 
        size="lg"
        onShow={() => {
          console.log('[ProductSelector] 🔓 Modal abierto para plataforma:', originPlatform)
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Seleccionar Productos - {originPlatform === 'woo_escolar' ? 'Escolar' : originPlatform === 'woo_moraleja' ? 'Moraleja' : 'Otros'}
            {originPlatform && (
              <small className="text-muted ms-2">
                ({originPlatform})
              </small>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              <strong>Error:</strong> {error}
              <br />
              <small>Plataforma: {originPlatform}</small>
            </Alert>
          )}
          
          {!error && originPlatform === 'otros' && (
            <Alert variant="warning">
              Selecciona una plataforma WooCommerce para ver productos
            </Alert>
          )}

          <div className="mb-3">
            <InputGroup>
              <InputGroup.Text>
                <TbSearch />
              </InputGroup.Text>
              <FormControl
                placeholder="Buscar productos por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Cargando productos...</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th style={{ width: '100px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const isSelected = selectedProducts.some((p) => p.id === product.id)
                      const stockStatus = product.stock_status || 'instock'
                      const stockQuantity = product.stock_quantity ?? 0

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              {product.images?.[0]?.src && (
                                <img
                                  src={product.images[0].src}
                                  alt={product.name}
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', marginRight: '10px' }}
                                />
                              )}
                              <span>{product.name}</span>
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">{product.sku || '-'}</small>
                          </td>
                          <td>
                            {(() => {
                              const displayPrice = product.price && parseFloat(product.price) > 0 
                                ? product.price 
                                : (product.regular_price || '0')
                              return `$${parseFloat(displayPrice).toLocaleString('es-CL')}`
                            })()}
                          </td>
                          <td>
                            <Badge
                              bg={
                                stockStatus === 'instock' && stockQuantity > 0
                                  ? 'success'
                                  : stockStatus === 'outofstock'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {stockStatus === 'instock' && stockQuantity > 0
                                ? `${stockQuantity} disponibles`
                                : stockStatus === 'outofstock'
                                ? 'Sin stock'
                                : 'Reserva'}
                            </Badge>
                          </td>
                          <td>
                            {(() => {
                              const priceToCheck = product.price && parseFloat(product.price) > 0 
                                ? product.price 
                                : (product.regular_price || '0')
                              const hasValidPrice = parseFloat(priceToCheck) > 0
                              const isOutOfStock = stockStatus === 'outofstock' && stockQuantity === 0
                              const canAdd = hasValidPrice && !isOutOfStock
                              
                              return (
                                <Button
                                  variant={isSelected ? 'success' : canAdd ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => {
                                    if (!hasValidPrice) {
                                      setError(`El producto "${product.name}" no tiene precio válido. No se puede agregar al pedido.`)
                                      setTimeout(() => setError(null), 5000)
                                      return
                                    }
                                    handleAddProduct(product)
                                  }}
                                  disabled={isSelected || !canAdd}
                                  title={
                                    isSelected 
                                      ? 'Ya está agregado'
                                      : !hasValidPrice
                                      ? 'Este producto no tiene precio válido'
                                      : isOutOfStock
                                      ? 'Este producto está agotado'
                                      : 'Agregar al pedido'
                                  }
                                >
                                  {isSelected ? '✓ Agregado' : <TbPlus />}
                                </Button>
                              )
                            })()}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        {error ? (
                          <div>
                            <strong className="text-danger">Error:</strong> {error}
                            <br />
                            <small>Verifica la conexión con WooCommerce {originPlatform === 'woo_escolar' ? 'Escolar' : 'Moraleja'}</small>
                          </div>
                        ) : searchTerm ? (
                          'No se encontraron productos con ese término de búsqueda'
                        ) : (
                          `No hay productos disponibles en ${originPlatform === 'woo_escolar' ? 'Escolar' : 'Moraleja'}`
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ProductSelector

