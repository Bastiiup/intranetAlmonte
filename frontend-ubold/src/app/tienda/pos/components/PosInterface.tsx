'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardBody, Button, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap'
import { LuSearch, LuPlus, LuMinus, LuTrash2, LuShoppingCart, LuCheck, LuX } from 'react-icons/lu'
import Image from 'next/image'
import type { WooCommerceProduct, CartItem } from '@/lib/woocommerce/types'

interface PosInterfaceProps {}

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Componente de Producto optimizado
interface ProductCardProps {
  product: WooCommerceProduct
  onAddToCart: (product: WooCommerceProduct) => void
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const price = parseFloat(product.price) || 0
  const inStock = product.stock_status === 'instock'
  const stockQuantity = product.stock_quantity
  const hasImage = product.images && product.images.length > 0 && !imageError
  const imageUrl = hasImage ? product.images[0].src : null

  const handleClick = () => {
    if (inStock) {
      onAddToCart(product)
    }
  }

  const getStockBadgeVariant = () => {
    if (stockQuantity === null) return 'secondary'
    if (stockQuantity > 10) return 'success'
    if (stockQuantity > 0) return 'warning'
    return 'danger'
  }

  return (
    <Card
      className={`h-100 product-card ${inStock ? 'border-primary' : 'border-secondary opacity-50'}`}
      style={{ 
        cursor: inStock ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease-in-out',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (inStock) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Imagen del producto */}
      <div 
        className="position-relative bg-light product-image-container" 
        style={{ 
          height: '220px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
        }}
      >
        {imageLoading && (
          <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
            <Spinner animation="border" size="sm" variant="primary" />
          </div>
        )}
        
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              style={{ 
                objectFit: 'contain',
                padding: '12px',
                opacity: imageLoading ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out',
              }}
              sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 25vw"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true)
                setImageLoading(false)
              }}
              priority={false}
            />
          </>
        ) : (
          <div
            className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted"
            style={{ fontSize: '3rem' }}
          >
            <div style={{ fontSize: '4rem', opacity: 0.3 }}>📦</div>
            <small style={{ fontSize: '0.75rem', marginTop: '8px' }}>Sin imagen</small>
          </div>
        )}
        
        {!inStock && (
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-60 d-flex align-items-center justify-content-center">
            <Badge bg="danger" className="fs-6 px-3 py-2">Sin Stock</Badge>
          </div>
        )}
      </div>

      {/* Información del producto */}
      <CardBody className="p-3 d-flex flex-column">
        <h6 
          className="mb-2 text-truncate flex-grow-1" 
          style={{ 
            fontSize: '0.95rem', 
            minHeight: '2.5rem',
            lineHeight: '1.3',
          }}
          title={product.name}
        >
          {product.name}
        </h6>
        
        <div className="d-flex justify-content-between align-items-center mt-auto">
          <div>
            <span className="fw-bold text-primary fs-5">
              ${price.toLocaleString('es-CL')}
            </span>
            {product.regular_price && parseFloat(product.regular_price) > price && (
              <div>
                <small className="text-muted text-decoration-line-through">
                  ${parseFloat(product.regular_price).toLocaleString('es-CL')}
                </small>
              </div>
            )}
          </div>
          
          {stockQuantity !== null && (
            <Badge bg={getStockBadgeVariant()} className="ms-2">
              {stockQuantity} u.
            </Badge>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// Componente de Item del Carrito
interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemove: (productId: number) => void
}

const CartItemRow = ({ item, onUpdateQuantity, onRemove }: CartItemRowProps) => {
  const price = parseFloat(item.product.price) || 0
  const imageUrl = item.product.images && item.product.images.length > 0 
    ? item.product.images[0].src 
    : null

  return (
    <div className="cart-item border-bottom pb-3 mb-3">
      <div className="d-flex gap-2">
        {/* Mini imagen */}
        {imageUrl && (
          <div 
            className="flex-shrink-0"
            style={{ width: '60px', height: '60px', position: 'relative' }}
          >
            <Image
              src={imageUrl}
              alt={item.product.name}
              fill
              style={{ objectFit: 'cover', borderRadius: '4px' }}
              sizes="60px"
            />
          </div>
        )}
        
        <div className="flex-grow-1">
          <h6 className="mb-1" style={{ fontSize: '0.9rem', lineHeight: '1.3' }}>
            {item.product.name}
          </h6>
          <div className="d-flex align-items-center gap-2 mt-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
              className="p-1"
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuMinus size={14} />
            </Button>
            <span className="fw-bold" style={{ minWidth: '30px', textAlign: 'center' }}>
              {item.quantity}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
              className="p-1"
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuPlus size={14} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onRemove(item.product.id)}
              className="ms-auto p-1"
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuTrash2 size={14} />
            </Button>
          </div>
        </div>
        
        <div className="text-end" style={{ minWidth: '80px' }}>
          <div className="fw-bold fs-6">${item.total.toLocaleString('es-CL')}</div>
          <small className="text-muted">${price.toLocaleString('es-CL')} c/u</small>
        </div>
      </div>
    </div>
  )
}

export default function PosInterface({}: PosInterfaceProps) {
  const [products, setProducts] = useState<WooCommerceProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  
  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Cargar productos
  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        per_page: '100',
        stock_status: 'instock',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
      })

      const response = await fetch(`/api/woocommerce/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.data || [])
      } else {
        setError(data.error || 'Error al cargar productos')
        setProducts([])
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con WooCommerce')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearchTerm])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Agregar producto al carrito
  const addToCart = useCallback((product: WooCommerceProduct) => {
    if (product.stock_status !== 'instock') return

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id)

      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: parseFloat(product.price) * (item.quantity + 1),
                total: parseFloat(product.price) * (item.quantity + 1),
              }
            : item
        )
      } else {
        const price = parseFloat(product.price) || 0
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            subtotal: price,
            total: price,
          },
        ]
      }
    })
  }, [])

  // Actualizar cantidad en carrito
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const price = parseFloat(item.product.price) || 0
          return {
            ...item,
            quantity,
            subtotal: price * quantity,
            total: price * quantity,
          }
        }
        return item
      })
    )
  }, [])

  // Remover producto del carrito
  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId))
  }, [])

  // Calcular totales (memoizado)
  const { subtotal, total, itemCount } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + item.total, 0)
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    return {
      subtotal: sub,
      total: sub, // Puedes agregar impuestos aquí
      itemCount: count,
    }
  }, [cart])

  // Procesar pedido
  const processOrder = async () => {
    if (cart.length === 0) {
      setError('El carrito está vacío')
      return
    }

    setProcessingOrder(true)
    setError(null)
    setOrderSuccess(false)
    setOrderId(null)

    try {
      const orderData = {
        payment_method: 'pos',
        payment_method_title: 'Punto de Venta',
        set_paid: true,
        status: 'completed',
        line_items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      }

      const response = await fetch('/api/woocommerce/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (data.success) {
        setOrderSuccess(true)
        setOrderId(data.data?.id || null)
        setCart([])
        // Recargar productos para actualizar stock
        loadProducts()
        setTimeout(() => {
          setOrderSuccess(false)
          setOrderId(null)
        }, 5000)
      } else {
        setError(data.error || 'Error al procesar el pedido')
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con WooCommerce')
    } finally {
      setProcessingOrder(false)
    }
  }

  // Limpiar carrito
  const clearCart = useCallback(() => {
    if (cart.length === 0) return
    if (confirm('¿Estás seguro de que deseas limpiar el carrito?')) {
      setCart([])
    }
  }, [cart.length])

  return (
    <div className="pos-interface">
      <style jsx global>{`
        .pos-interface .product-card {
          transition: all 0.2s ease-in-out;
        }
        .pos-interface .product-card:hover {
          border-color: var(--bs-primary) !important;
        }
        .pos-interface .product-image-container {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        .pos-interface .cart-item {
          transition: opacity 0.2s ease-in-out;
        }
        .pos-interface .cart-item:hover {
          background-color: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
          padding: 8px !important;
          margin: 0 -8px 12px -8px !important;
        }
      `}</style>

      <Row className="g-3">
        {/* Panel de Productos */}
        <Col lg={8}>
          <Card className="h-100">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Productos Disponibles</h5>
                <Badge bg="primary" className="fs-6 px-3 py-2">
                  {products.length} {products.length === 1 ? 'producto' : 'productos'}
                </Badge>
              </div>

              {/* Búsqueda */}
              <InputGroup className="mb-4">
                <InputGroup.Text>
                  <LuSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar productos por nombre, SKU o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="fs-6"
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <LuX />
                  </Button>
                )}
              </InputGroup>

              {/* Mensajes */}
              {error && (
                <Alert 
                  variant="danger" 
                  dismissible 
                  onClose={() => setError(null)}
                  className="mb-3"
                >
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {orderSuccess && (
                <Alert variant="success" className="mb-3">
                  <LuCheck className="me-2" />
                  <strong>Pedido procesado exitosamente</strong>
                  {orderId && (
                    <span className="ms-2">(ID: #{orderId})</span>
                  )}
                </Alert>
              )}

              {/* Lista de Productos */}
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                  <p className="mt-3 text-muted">Cargando productos...</p>
                </div>
              ) : products.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  {searchTerm 
                    ? `No se encontraron productos que coincidan con "${searchTerm}"`
                    : 'No hay productos disponibles en este momento'}
                </Alert>
              ) : (
                <div 
                  className="row g-3" 
                  style={{ 
                    maxHeight: 'calc(100vh - 350px)', 
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}
                >
                  {products.map((product) => (
                    <Col key={product.id} md={4} sm={6} xs={12}>
                      <ProductCard product={product} onAddToCart={addToCart} />
                    </Col>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Panel del Carrito */}
        <Col lg={4}>
          <Card className="sticky-top" style={{ top: '20px' }}>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  <LuShoppingCart className="me-2" />
                  Carrito
                  {itemCount > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {itemCount}
                    </Badge>
                  )}
                </h5>
                {cart.length > 0 && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={clearCart}
                  >
                    <LuTrash2 /> Limpiar
                  </Button>
                )}
              </div>

              {cart.length === 0 ? (
                <Alert variant="secondary" className="mb-0 text-center py-4">
                  <LuShoppingCart size={48} className="text-muted mb-2" />
                  <p className="mb-0">El carrito está vacío</p>
                  <small className="text-muted">Haz clic en un producto para agregarlo</small>
                </Alert>
              ) : (
                <>
                  <div 
                    style={{ 
                      maxHeight: 'calc(100vh - 450px)', 
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}
                  >
                    {cart.map((item) => (
                      <CartItemRow
                        key={item.product.id}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>

                  <div className="border-top pt-3 mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Subtotal:</span>
                      <span className="fw-bold">${subtotal.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span className="fs-5 fw-bold">Total:</span>
                      <span className="fs-5 fw-bold text-primary">
                        ${total.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-100"
                      onClick={processOrder}
                      disabled={processingOrder || cart.length === 0}
                    >
                      {processingOrder ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <LuCheck className="me-2" />
                          Procesar Pedido
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
