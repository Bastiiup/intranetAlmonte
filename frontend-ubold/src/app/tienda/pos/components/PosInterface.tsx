'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardBody, Button, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap'
import { LuSearch, LuPlus, LuMinus, LuTrash2, LuShoppingCart, LuCheck, LuX, LuBarcode, LuDollarSign, LuMaximize, LuMinimize, LuHistory } from 'react-icons/lu'
import Image from 'next/image'
import type { WooCommerceProduct } from '@/lib/woocommerce/types'
import { usePosCart } from '../hooks/usePosCart'
import { usePosProducts } from '../hooks/usePosProducts'
import { usePosOrders, type PaymentMethod } from '../hooks/usePosOrders'
import { usePosToast } from '../hooks/usePosToast'
import PaymentModal from './PaymentModal'
import CustomerSelector from './CustomerSelector'
import DiscountInput from './DiscountInput'
import CashRegister from './CashRegister'
import RecentOrders from './RecentOrders'
import QuickStats from './QuickStats'
import { formatCurrencyNumber } from '../utils/calculations'
import { printReceipt, type ReceiptData } from '../utils/receipt'
import { isValidBarcode, normalizeBarcode } from '../utils/barcode'
import type { Discount } from '../utils/calculations'

interface PosInterfaceProps {}

// Componente de Producto
interface ProductCardProps {
  product: WooCommerceProduct
  onAddToCart: (product: WooCommerceProduct) => void
  onAddSuccess?: (productName: string) => void
}

const ProductCard = ({ product, onAddToCart, onAddSuccess }: ProductCardProps) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const price = parseFloat(product.price) || 0
  const inStock = product.stock_status === 'instock'
  const stockQuantity = product.stock_quantity
  const hasImage = product.images && product.images.length > 0 && !imageError
  const imageUrl = hasImage ? product.images[0].src : null

  const handleClick = () => {
    if (inStock) {
      // Verificar stock antes de agregar
      if (stockQuantity !== null && stockQuantity <= 0) {
        return
      }
      onAddToCart(product)
      onAddSuccess?.(product.name)
      
      // Mostrar advertencia si es el último producto
      if (stockQuantity !== null && stockQuantity === 1) {
        // La advertencia se mostrará a través del toast
      }
    }
  }

  const getStockBadgeVariant = () => {
    if (stockQuantity === null) return 'secondary'
    if (stockQuantity > 10) return 'success'
    if (stockQuantity > 5) return 'warning'
    if (stockQuantity > 0) return 'warning'
    return 'danger'
  }

  const isLowStock = stockQuantity !== null && stockQuantity <= 5 && stockQuantity > 0

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
              ${formatCurrencyNumber(price)}
            </span>
            {product.regular_price && parseFloat(product.regular_price) > price && (
              <div>
                <small className="text-muted text-decoration-line-through">
                  ${formatCurrencyNumber(parseFloat(product.regular_price))}
                </small>
              </div>
            )}
          </div>
          
          {stockQuantity !== null && (
            <Badge bg={getStockBadgeVariant()} className="ms-2">
              {stockQuantity} u.
              {isLowStock && <span className="ms-1">⚠</span>}
            </Badge>
          )}
          {isLowStock && (
            <div className="mt-1">
              <small className="text-warning fw-bold">⚠ Stock bajo</small>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// Componente de Item del Carrito
interface CartItemRowProps {
  item: any
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemove: (productId: number) => void
}

const CartItemRow = ({ item, onUpdateQuantity, onRemove }: CartItemRowProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.quantity.toString())
  const inputRef = useRef<HTMLInputElement>(null)
  const price = parseFloat(item.product.price) || 0
  const imageUrl = item.product.images && item.product.images.length > 0 
    ? item.product.images[0].src 
    : null
  const stockQuantity = item.product.stock_quantity

  const handleQuantityClick = () => {
    setIsEditing(true)
    setEditValue(item.quantity.toString())
    setTimeout(() => inputRef.current?.select(), 10)
  }

  const handleQuantityBlur = () => {
    const newQuantity = parseInt(editValue) || 1
    const finalQuantity = Math.max(1, Math.min(newQuantity, stockQuantity !== null ? stockQuantity : 9999))
    if (finalQuantity !== item.quantity) {
      onUpdateQuantity(item.product.id, finalQuantity)
    }
    setIsEditing(false)
  }

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuantityBlur()
    } else if (e.key === 'Escape') {
      setEditValue(item.quantity.toString())
      setIsEditing(false)
    }
  }

  return (
    <div className="cart-item border-bottom pb-3 mb-3">
      <div className="d-flex gap-2">
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
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuMinus size={16} />
            </Button>
            {isEditing ? (
              <Form.Control
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleQuantityBlur}
                onKeyDown={handleQuantityKeyPress}
                min="1"
                max={stockQuantity !== null ? stockQuantity : undefined}
                className="text-center fw-bold"
                style={{ width: '60px', height: '32px', padding: '4px' }}
                autoFocus
              />
            ) : (
              <span 
                className="fw-bold border rounded px-2 py-1" 
                style={{ 
                  minWidth: '50px', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: '#f8f9fa'
                }}
                onClick={handleQuantityClick}
                title="Click para editar cantidad"
              >
                {item.quantity}
              </span>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
              disabled={stockQuantity !== null && item.quantity >= stockQuantity}
              className="p-1"
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuPlus size={16} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onRemove(item.product.id)}
              className="ms-auto p-1"
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LuTrash2 size={16} />
            </Button>
          </div>
          {stockQuantity !== null && item.quantity >= stockQuantity && (
            <small className="text-warning d-block mt-1">
              Stock máximo alcanzado
            </small>
          )}
        </div>
        
        <div className="text-end" style={{ minWidth: '80px' }}>
          <div className="fw-bold fs-6">${formatCurrencyNumber(item.total)}</div>
          <small className="text-muted">${formatCurrencyNumber(price)} c/u</small>
        </div>
      </div>
    </div>
  )
}

export default function PosInterfaceNew({}: PosInterfaceProps) {
  const [discount, setDiscount] = useState<Discount | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCashRegister, setShowCashRegister] = useState(false)
  const [showRecentOrders, setShowRecentOrders] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [lastInvoiceStatus, setLastInvoiceStatus] = useState<{
    orderId: number
    success: boolean
    folio?: number
    pdfUrl?: string
    error?: string
  } | null>(null)

  // Hooks personalizados
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, totals } = usePosCart(discount)
  const { products, loading, error, searchTerm, setSearchTerm, searchByBarcode, reloadProducts } = usePosProducts()
  const { processing, error: orderError, success, orderId, processOrder, clearError, clearSuccess } = usePosOrders()
  const { showSuccess, showError, showWarning, showInfo, ToastComponent } = usePosToast()

  // Cargar historial de búsquedas desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_search_history')
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved))
      } catch {
        setSearchHistory([])
      }
    }
  }, [])

  // Guardar búsquedas en historial
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value.trim().length >= 2) {
      const newHistory = [value.trim(), ...searchHistory.filter(h => h !== value.trim())].slice(0, 10)
      setSearchHistory(newHistory)
      localStorage.setItem('pos_search_history', JSON.stringify(newHistory))
    }
  }

  // Atajos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // No procesar atajos si estamos en un input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+F: Focus en búsqueda
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
      }
      
      // Ctrl+N: Nueva venta (limpiar carrito)
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (cart.length > 0 && confirm('¿Limpiar carrito y empezar nueva venta?')) {
          clearCart()
          setDiscount(null)
          setSelectedCustomer(null)
          showInfo('Nueva venta iniciada')
        }
      }
      
      // Ctrl+P: Procesar pedido
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        if (cart.length > 0 && totals.total > 0) {
          setShowPaymentModal(true)
        } else {
          showWarning('El carrito está vacío')
        }
      }
      
      // Esc: Limpiar búsqueda o cerrar modales
      if (e.key === 'Escape') {
        if (showPaymentModal) {
          setShowPaymentModal(false)
        } else if (showCashRegister) {
          setShowCashRegister(false)
        } else if (showRecentOrders) {
          setShowRecentOrders(false)
        } else {
          setSearchTerm('')
          setBarcodeInput('')
        }
      }
      
      // Enter en búsqueda: buscar
      if (e.key === 'Enter' && document.activeElement === barcodeInputRef.current) {
        handleBarcodeSearch()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [searchTerm, barcodeInput, cart.length, totals.total, showPaymentModal, showCashRegister, showRecentOrders, clearCart])

  // Manejar búsqueda por código de barras
  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return

    const normalized = normalizeBarcode(barcodeInput)
    if (!isValidBarcode(normalized)) {
      clearError()
      return
    }

    const product = await searchByBarcode(normalized)
    if (product) {
      addToCart(product)
      setBarcodeInput('')
      showSuccess(`${product.name} agregado al carrito`)
    } else {
      showWarning('Producto no encontrado')
    }
  }

  // Procesar pedido con método de pago
  const handleProcessOrder = async (payments: PaymentMethod[]) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    
    if (totalPaid < totals.total) {
      clearError()
      return
    }

    // Pasar datos completos del cliente al processOrder
    const paymentMethodWithCustomer = {
      ...payments[0],
      customerData: selectedCustomer || null,
    }

    const order = await processOrder(
      cart,
      selectedCustomer?.id,
      paymentMethodWithCustomer as any, // Pasar método de pago con datos del cliente
      `Pago: ${payments.map(p => `${p.type} $${p.amount}`).join(', ')}`
    )

    if (order) {
      // Emitir factura electrónica a través de Haulmer y guardar en WooCommerce
      try {
        // Obtener datos completos del cliente para billing y shipping
        const customerRut = selectedCustomer?.billing?.rut || 
                           selectedCustomer?.meta_data?.find((m: any) => m.key === 'rut')?.value || 
                           '66666666-6'
        
        const facturaData = {
          tipo: 'boleta', // o 'factura' según corresponda
          fecha: new Date().toISOString().split('T')[0],
          receptor: selectedCustomer ? {
            rut: customerRut,
            razon_social: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim() || 'Consumidor Final',
            email: selectedCustomer.email || '',
            direccion: selectedCustomer.billing?.address_1 || '',
            comuna: selectedCustomer.billing?.city || '',
            ciudad: selectedCustomer.billing?.city || '',
            giro: selectedCustomer.billing?.company || '',
          } : {
            rut: '66666666-6', // Consumidor final
            razon_social: 'Consumidor Final',
          },
          items: cart.map(item => ({
            nombre: item.product.name,
            cantidad: item.quantity,
            precio: parseFloat(item.product.price),
            descuento: 0,
            impuesto: totals.tax / cart.length, // Distribuir IVA entre items
            codigo: item.product.sku || item.product.id.toString(),
          })),
          descuento_global: totals.discount,
          observaciones: `Pedido #${order.id} - Pago: ${payments.map(p => `${p.type} $${p.amount}`).join(', ')}`,
          referencia: order.id.toString(),
        }

        const facturaResponse = await fetch('/api/openfactura/emitir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(facturaData),
        })

        const facturaResult = await facturaResponse.json()
        
        if (facturaResult.success && facturaResult.data?.pdf_url) {
          console.log('[POS] Factura electrónica emitida (Haulmer):', facturaResult.data)
          showSuccess(`Factura electrónica emitida (Folio: ${facturaResult.data.folio || 'N/A'})`, 'Factura Emitida')
          
          // Guardar el PDF en WordPress y actualizar el pedido
          try {
            const guardarPdfResponse = await fetch('/api/openfactura/guardar-pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order_id: order.id,
                pdf_url: facturaResult.data.pdf_url,
                folio: facturaResult.data.folio,
                documento_id: facturaResult.data.documento_id,
                xml_url: facturaResult.data.xml_url,
                timbre: facturaResult.data.timbre,
              }),
            })

            const guardarPdfResult = await guardarPdfResponse.json()
            
            if (guardarPdfResult.success) {
              console.log('[POS] PDF de factura guardado en WordPress:', guardarPdfResult.data)
            } else {
              console.warn('[POS] Error al guardar PDF:', guardarPdfResult.error)
              showWarning('Factura emitida pero hubo un problema al guardar el PDF')
            }
          } catch (pdfError: any) {
            console.error('[POS] Error al guardar PDF de factura:', pdfError)
            showWarning('Factura emitida pero hubo un problema al guardar el PDF')
          }

          // Los datos de billing y shipping ya se guardaron correctamente al crear el pedido
          // con todos los campos detallados en meta_data a través de usePosOrders
          console.log('[POS] Datos de dirección ya guardados en el pedido')
        } else {
          console.warn('[POS] Error al emitir factura electrónica:', facturaResult.error)
          showWarning(`No se pudo emitir la factura: ${facturaResult.error || 'Error desconocido'}`)
          // No bloqueamos la venta si falla la factura electrónica
        }
      } catch (error: any) {
        console.error('[POS] Error al emitir factura electrónica:', error)
        showWarning('Error al emitir factura electrónica. La venta se completó correctamente.')
        // No bloqueamos la venta si falla la factura electrónica
      }

      // Imprimir ticket
      const receiptData: ReceiptData = {
        orderId: order.id,
        date: new Date().toISOString(),
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: parseFloat(item.product.price),
          total: item.total,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        payment: {
          method: payments[0].type,
          amount: totalPaid,
          change: totalPaid - totals.total,
        },
        customer: selectedCustomer ? {
          name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
          email: selectedCustomer.email,
        } : undefined,
      }

      printReceipt(receiptData)
      
      // Mostrar éxito
      showSuccess(`Pedido #${order.id} procesado exitosamente`, 'Venta Completada')
      
      // Limpiar carrito y recargar productos después de un delay para que se vea el mensaje
      setTimeout(() => {
        clearCart()
        setDiscount(null)
        setSelectedCustomer(null)
        setLastInvoiceStatus(null)
        reloadProducts()
      }, 5000) // Limpiar después de 5 segundos
    } else {
      showError('Error al procesar el pedido. Por favor, intente nuevamente.')
      setLastInvoiceStatus(null)
    }

    setShowPaymentModal(false)
  }

  // Toggle pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="pos-interface">
      <ToastComponent />
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

      {/* Header con controles */}
      <Card className="mb-3">
        <CardBody>
          <div className="mb-3">
            <QuickStats />
          </div>
          <Row className="g-3 align-items-center">
            <Col md={4}>
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                onSelect={setSelectedCustomer}
              />
            </Col>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <LuBarcode />
                </InputGroup.Text>
                <Form.Control
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Código de barras o SKU (Enter para buscar)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleBarcodeSearch()
                    }
                  }}
                />
              </InputGroup>
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button
                variant="outline-info"
                onClick={() => setShowRecentOrders(true)}
                title="Ver pedidos recientes"
              >
                <LuHistory className="me-1" />
                Historial
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => setShowCashRegister(true)}
              >
                <LuDollarSign className="me-1" />
                Caja
              </Button>
              <Button
                variant="outline-secondary"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <LuMinimize /> : <LuMaximize />}
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

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
              <div className="mb-4">
                <InputGroup>
                  <InputGroup.Text>
                    <LuSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Buscar productos por nombre, SKU o categoría..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="fs-6"
                    onFocus={() => {
                      // Mostrar historial cuando se enfoca
                    }}
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      onClick={() => {
                        setSearchTerm('')
                        handleSearchChange('')
                      }}
                    >
                      <LuX />
                    </Button>
                  )}
                </InputGroup>
                
                {/* Historial de búsquedas */}
                {!searchTerm && searchHistory.length > 0 && (
                  <div className="mt-2">
                    <small className="text-muted">Búsquedas recientes:</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {searchHistory.slice(0, 5).map((term, idx) => (
                        <Button
                          key={idx}
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleSearchChange(term)}
                        >
                          {term}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mensajes */}
              {error && (
                <Alert 
                  variant="danger" 
                  dismissible 
                  onClose={clearError}
                  className="mb-3"
                >
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {orderError && (
                <Alert 
                  variant="danger" 
                  dismissible 
                  onClose={clearError}
                  className="mb-3"
                >
                  <strong>Error:</strong> {orderError}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <LuCheck className="me-2" />
                      <strong>Pedido procesado exitosamente</strong>
                      {orderId && (
                        <span className="ms-2">(ID: #{orderId})</span>
                      )}
                    </div>
                    {lastInvoiceStatus && lastInvoiceStatus.orderId === orderId && (
                      <div className="d-flex gap-2 align-items-center">
                        {lastInvoiceStatus.success ? (
                          <>
                            <Badge bg="success">
                              ✓ Factura: {lastInvoiceStatus.folio || 'Emitida'}
                            </Badge>
                            {lastInvoiceStatus.pdfUrl && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => window.open(`/tienda/facturas/${orderId}`, '_blank')}
                              >
                                Ver Factura
                              </Button>
                            )}
                          </>
                        ) : (
                          <Badge bg="warning">
                            ⚠ Factura no emitida
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
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
                    maxHeight: 'calc(100vh - 450px)', 
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}
                >
                  {products.map((product) => (
                    <Col key={product.id} md={4} sm={6} xs={12}>
                      <ProductCard 
                        product={product} 
                        onAddToCart={addToCart}
                        onAddSuccess={(name) => showSuccess(`${name} agregado al carrito`)}
                      />
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
                  {totals.itemCount > 0 && (
                    <Badge bg="primary" className="ms-2">
                      {totals.itemCount}
                    </Badge>
                  )}
                </h5>
                {cart.length > 0 && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => {
                      if (confirm('¿Estás seguro de que deseas limpiar el carrito?')) {
                        clearCart()
                      }
                    }}
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
                      maxHeight: 'calc(100vh - 550px)', 
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

                  {/* Descuentos */}
                  <div className="mb-3">
                    <DiscountInput
                      discount={discount}
                      onDiscountChange={setDiscount}
                      subtotal={totals.subtotal}
                    />
                  </div>

                  {/* Totales */}
                  <div className="border-top pt-3 mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Subtotal:</span>
                      <span className="fw-bold">${formatCurrencyNumber(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Descuento:</span>
                        <span className="fw-bold text-success">
                          -${formatCurrencyNumber(totals.discount)}
                        </span>
                      </div>
                    )}
                    {totals.tax > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">IVA:</span>
                        <span className="fw-bold">${formatCurrencyNumber(totals.tax)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between mb-3">
                      <span className="fs-5 fw-bold">Total:</span>
                      <span className="fs-5 fw-bold text-primary">
                        ${formatCurrencyNumber(totals.total)}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-100"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={processing || cart.length === 0}
                    >
                      {processing ? (
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

      {/* Modales */}
      <PaymentModal
        show={showPaymentModal}
        total={totals.total}
        onComplete={handleProcessOrder}
        onCancel={() => setShowPaymentModal(false)}
      />

      <CashRegister
        show={showCashRegister}
        onClose={() => setShowCashRegister(false)}
      />

      <RecentOrders
        show={showRecentOrders}
        onClose={() => setShowRecentOrders(false)}
      />
    </div>
  )
}

