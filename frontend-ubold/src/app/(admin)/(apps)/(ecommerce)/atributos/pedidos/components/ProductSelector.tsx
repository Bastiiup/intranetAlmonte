'use client'

import { useState, useEffect } from 'react'
import { Button, Modal, Form, Table, Badge, InputGroup, FormControl, Alert, Spinner } from 'react-bootstrap'
import { TbPlus, TbSearch, TbX } from 'react-icons/tb'

interface WooCommerceProduct {
  id: number
  name: string
  sku?: string
  price: string
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

  // Obtener productos de WooCommerce según la plataforma
  const fetchProducts = async () => {
    if (originPlatform === 'otros') {
      setError('Selecciona una plataforma WooCommerce para ver productos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Obtener productos de WooCommerce según la plataforma
      const platformParam = originPlatform === 'woo_escolar' ? 'escolar' : 'moraleja'
      const response = await fetch(`/api/woocommerce/products?platform=${platformParam}&per_page=100`)
      const data = await response.json()

      if (data.success && data.data) {
        setProducts(data.data)
      } else {
        throw new Error(data.error || 'Error al obtener productos')
      }
    } catch (err: any) {
      console.error('[ProductSelector] Error al obtener productos:', err)
      setError(err.message || 'Error al obtener productos de WooCommerce')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar productos cuando se abre el modal
  useEffect(() => {
    if (show && originPlatform !== 'otros') {
      fetchProducts()
    }
  }, [show, originPlatform])

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agregar producto al pedido
  const handleAddProduct = (product: WooCommerceProduct) => {
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
      // Si no existe, agregar nuevo
      const price = parseFloat(product.price) || 0
      const newProduct: SelectedProduct = {
        id: product.id,
        name: product.name,
        price,
        quantity: 1,
        subtotal: price,
      }
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
            onClick={() => setShow(true)}
            disabled={originPlatform === 'otros'}
          >
            <TbPlus className="me-1" />
            Agregar Productos
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

      <Modal show={show} onHide={() => setShow(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Seleccionar Productos - {originPlatform === 'woo_escolar' ? 'Escolar' : 'Moraleja'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
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
                          <td>${parseFloat(product.price || '0').toLocaleString('es-CL')}</td>
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
                            <Button
                              variant={isSelected ? 'success' : 'primary'}
                              size="sm"
                              onClick={() => handleAddProduct(product)}
                              disabled={stockStatus === 'outofstock' && stockQuantity === 0}
                            >
                              {isSelected ? '✓ Agregado' : <TbPlus />}
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
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

