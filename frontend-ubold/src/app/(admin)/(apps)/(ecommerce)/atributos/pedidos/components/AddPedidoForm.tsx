'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, Spinner } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'
import ProductSelector from './ProductSelector'

const AddPedidoForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    id: number
    name: string
    price: number
    quantity: number
    subtotal: number
  }>>([])

  const [clientes, setClientes] = useState<Array<{
    id: string | number
    documentId?: string
    nombre: string
    email?: string
    displayName: string
  }>>([])
  const [loadingClientes, setLoadingClientes] = useState(false)

  const [formData, setFormData] = useState({
    numero_pedido: '',
    fecha_pedido: new Date().toISOString().slice(0, 16),
    estado: 'pendiente',
    total: '',
    subtotal: '',
    impuestos: '',
    envio: '',
    descuento: '',
    moneda: 'CLP',
    origen: 'woocommerce',
    cliente: null as string | null,
    items: [] as any[],
    metodo_pago: '',
    metodo_pago_titulo: '',
    nota_cliente: '',
    originPlatform: 'woo_moraleja' as 'woo_moraleja' | 'woo_escolar' | 'otros',
  })

  // Cargar clientes cuando cambia la plataforma
  useEffect(() => {
    const fetchClientes = async () => {
      if (formData.originPlatform === 'otros') {
        setClientes([])
        return
      }

      setLoadingClientes(true)
      try {
        // Obtener clientes desde Strapi (WO-Clientes)
        const response = await fetch('/api/tienda/clientes?pagination[pageSize]=500')
        const data = await response.json()

        if (data.success && data.data) {
          const clientesMapeados = data.data.map((cliente: any) => {
            const attrs = cliente.attributes || {}
            const clienteData = (attrs && Object.keys(attrs).length > 0) ? attrs : cliente
            
            // Obtener nombre del cliente
            let nombre = 'Cliente sin nombre'
            if (clienteData.persona?.data?.attributes) {
              const persona = clienteData.persona.data.attributes
              const nombreCompleto = `${persona.nombre || ''} ${persona.apellido || ''}`.trim()
              nombre = nombreCompleto || persona.nombre || persona.apellido || 'Cliente sin nombre'
            } else if (clienteData.nombre) {
              nombre = clienteData.nombre
            } else if (clienteData.correo_electronico) {
              nombre = clienteData.correo_electronico.split('@')[0]
            }

            const email = clienteData.correo_electronico || ''
            const displayName = email ? `${nombre} (${email})` : nombre

            return {
              id: cliente.id || cliente.documentId || cliente.id,
              documentId: cliente.documentId || cliente.id,
              nombre,
              email,
              displayName,
            }
          })

          // Agregar opción "Invitado" al inicio
          setClientes([
            {
              id: 'invitado',
              nombre: 'Invitado',
              email: '',
              displayName: 'Invitado',
            },
            ...clientesMapeados,
          ])
        } else {
          // Si no hay clientes, al menos mostrar "Invitado"
          setClientes([
            {
              id: 'invitado',
              nombre: 'Invitado',
              email: '',
              displayName: 'Invitado',
            },
          ])
        }
      } catch (error: any) {
        console.error('[AddPedidoForm] Error al cargar clientes:', error)
        // Al menos mostrar "Invitado" si hay error
        setClientes([
          {
            id: 'invitado',
            nombre: 'Invitado',
            email: '',
            displayName: 'Invitado',
          },
        ])
      } finally {
        setLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [formData.originPlatform])

  // Calcular subtotal y total cuando cambian los productos
  useEffect(() => {
    const subtotal = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0)
    const impuestos = formData.impuestos ? parseFloat(formData.impuestos) : 0
    const envio = formData.envio ? parseFloat(formData.envio) : 0
    const descuento = formData.descuento ? parseFloat(formData.descuento) : 0
    const total = subtotal + impuestos + envio - descuento

    setFormData((prev) => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    }))
  }, [selectedProducts, formData.impuestos, formData.envio, formData.descuento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validaciones
      if (!formData.numero_pedido.trim()) {
        throw new Error('El número de pedido es obligatorio')
      }

      // Validar que hay productos seleccionados
      if (selectedProducts.length === 0) {
        throw new Error('Debes agregar al menos un producto al pedido')
      }

      // Convertir productos seleccionados al formato de items de Strapi
      // IMPORTANTE: Cada item DEBE tener nombre, cantidad, precio_unitario y total
      const items = selectedProducts.map((product) => {
        // Validar que el producto tiene todos los campos necesarios
        if (!product.name) {
          throw new Error(`Producto inválido: falta nombre - ${JSON.stringify(product)}`)
        }
        
        if (!product.quantity || product.quantity <= 0) {
          throw new Error(`Producto "${product.name}": cantidad inválida (${product.quantity})`)
        }
        
        // ⚠️ VALIDACIÓN CRÍTICA: Precio debe ser > 0
        if (product.price === undefined || product.price === null || product.price <= 0) {
          throw new Error(`Producto "${product.name}": precio inválido (${product.price}). El precio debe ser mayor a 0.`)
        }
        
        // Calcular total del item (precio_unitario * cantidad)
        const precioUnitario = product.price
        const cantidad = product.quantity
        const totalItem = precioUnitario * cantidad
        
        // Validar que el total calculado coincide con el subtotal
        if (Math.abs(totalItem - product.subtotal) > 0.01) {
          console.warn(`[AddPedidoForm] ⚠️ Total calculado (${totalItem}) no coincide con subtotal (${product.subtotal}), usando total calculado`)
        }
        
        const item = {
          nombre: product.name, // ⚠️ OBLIGATORIO
          cantidad: cantidad, // ⚠️ OBLIGATORIO
          precio_unitario: precioUnitario, // ⚠️ OBLIGATORIO (> 0)
          total: totalItem, // ⚠️ OBLIGATORIO (precio_unitario * cantidad)
          producto_id: product.id, // ID de WooCommerce (recomendado)
          product_id: product.id, // Para WooCommerce
          quantity: cantidad, // Para WooCommerce
          price: precioUnitario.toString(), // Para WooCommerce
        }
        
        console.log(`[AddPedidoForm] ✅ Item construido:`, {
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          total: item.total,
          producto_id: item.producto_id,
          validacion: {
            precioValido: item.precio_unitario > 0,
            totalValido: item.total > 0,
            totalCoincide: Math.abs(item.total - (item.precio_unitario * item.cantidad)) < 0.01
          }
        })
        
        return item
      })
      
      // Validar que todos los items tienen los campos obligatorios y precios válidos
      const itemsInvalidos = items.filter(item => {
        const tieneNombre = !!item.nombre
        const tieneCantidad = item.cantidad > 0
        const tienePrecio = item.precio_unitario > 0
        const tieneTotal = item.total > 0
        const totalCoincide = Math.abs(item.total - (item.precio_unitario * item.cantidad)) < 0.01
        
        if (!tieneNombre || !tieneCantidad || !tienePrecio || !tieneTotal || !totalCoincide) {
          console.error(`[AddPedidoForm] ❌ Item inválido:`, {
            item,
            validaciones: { tieneNombre, tieneCantidad, tienePrecio, tieneTotal, totalCoincide }
          })
          return true
        }
        return false
      })
      
      if (itemsInvalidos.length > 0) {
        console.error('[AddPedidoForm] ❌ Items inválidos:', itemsInvalidos)
        throw new Error(`Hay ${itemsInvalidos.length} producto(s) con datos inválidos. Verifica que todos tengan precio > 0.`)
      }
      
      // Validar que el total del pedido NO sea 0
      const sumaItems = items.reduce((sum, item) => sum + item.total, 0)
      const totalCalculado = sumaItems + 
        (formData.impuestos ? parseFloat(formData.impuestos) : 0) +
        (formData.envio ? parseFloat(formData.envio) : 0) -
        (formData.descuento ? parseFloat(formData.descuento) : 0)
      
      if (totalCalculado <= 0) {
        throw new Error(`El total del pedido es $${totalCalculado}. Verifica que los productos tengan precios válidos.`)
      }
      
      console.log('[AddPedidoForm] ✅ Validación de items exitosa:', {
        totalItems: items.length,
        sumaItems,
        totalCalculado,
        items: items.map(i => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          total: i.total,
          producto_id: i.producto_id
        }))
      })

      // Obtener información del cliente seleccionado si existe
      let billingInfo = null
      let clienteSeleccionado = null
      
      if (formData.cliente && formData.cliente !== 'invitado') {
        clienteSeleccionado = clientes.find(c => 
          (c.documentId || c.id) === formData.cliente
        )
        
        if (clienteSeleccionado && clienteSeleccionado.email) {
          // Construir información de billing desde el cliente
          const nombreCompleto = clienteSeleccionado.nombre.split(' ')
          const firstName = nombreCompleto[0] || ''
          const lastName = nombreCompleto.slice(1).join(' ') || ''
          
          billingInfo = {
            first_name: firstName,
            last_name: lastName,
            email: clienteSeleccionado.email,
            address_1: '',
            city: '',
            state: '',
            postcode: '',
            country: 'CL',
          }
        }
      }

      // ⚠️ VALIDACIÓN CRÍTICA: Verificar que items NO esté vacío
      if (!items || items.length === 0) {
        console.error('[AddPedidoForm] ❌ ERROR CRÍTICO: items está vacío o no existe')
        console.error('[AddPedidoForm] selectedProducts:', selectedProducts)
        console.error('[AddPedidoForm] items construidos:', items)
        throw new Error('El pedido debe tener al menos un producto. Agrega productos antes de crear el pedido.')
      }

      const pedidoData: any = {
        data: {
          numero_pedido: formData.numero_pedido.trim(),
          fecha_pedido: formData.fecha_pedido || new Date().toISOString(),
          estado: formData.estado || 'pendiente',
          total: formData.total ? parseFloat(formData.total) : null,
          subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
          impuestos: formData.impuestos ? parseFloat(formData.impuestos) : null,
          envio: formData.envio ? parseFloat(formData.envio) : null,
          descuento: formData.descuento ? parseFloat(formData.descuento) : null,
          moneda: formData.moneda || 'CLP',
          origen: formData.origen || 'woocommerce',
          cliente: formData.cliente && formData.cliente !== 'invitado' ? formData.cliente : null,
          billing: billingInfo,
          items: items, // ⚠️ CRÍTICO: Siempre incluir items (ya validado que no está vacío)
          metodo_pago: formData.metodo_pago || null,
          metodo_pago_titulo: formData.metodo_pago_titulo || null,
          nota_cliente: formData.nota_cliente || null,
          originPlatform: formData.originPlatform,
        },
      }

      // ═══════════════════════════════════════════════════════════════
      // DEBUGGING DETALLADO: Imprimir payload completo antes de enviar
      // ═══════════════════════════════════════════════════════════════
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('🔍 DEBUGGING: Payload ANTES de enviar a Strapi')
      console.log('═══════════════════════════════════════════════════════')
      console.log('📦 Payload completo:')
      console.log(JSON.stringify(pedidoData, null, 2))
      console.log('═══════════════════════════════════════════════════════')
      console.log('✅ Verificaciones:')
      console.log('- payload existe?', !!pedidoData)
      console.log('- payload.data existe?', !!pedidoData.data)
      console.log('- payload.data.items existe?', !!pedidoData.data?.items)
      console.log('- payload.data.items es array?', Array.isArray(pedidoData.data?.items))
      console.log('- payload.data.items.length:', pedidoData.data?.items?.length || 0)
      
      if (pedidoData.data?.items && pedidoData.data.items.length > 0) {
        console.log('- items[0]:', pedidoData.data.items[0])
        console.log('- Todos los items:', pedidoData.data.items.map((item: any, idx: number) => ({
          index: idx + 1,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          total: item.total,
          producto_id: item.producto_id
        })))
      }
      console.log('- selectedProducts.length:', selectedProducts.length)
      console.log('- items.length (construidos):', items.length)
      console.log('═══════════════════════════════════════════════════════')
      
      // ⚠️ VALIDACIÓN FINAL: Verificar que items está en el payload
      if (!pedidoData.data.items) {
        console.error('❌ ERROR CRÍTICO: El payload NO tiene items o está vacío')
        console.error('❌ NO SE PUEDE CREAR EL PEDIDO')
        throw new Error('Error interno: El campo items no se incluyó en el payload')
      }
      
      if (!Array.isArray(pedidoData.data.items)) {
        console.error('❌ ERROR CRÍTICO: pedidoData.data.items NO es un array!', typeof pedidoData.data.items)
        throw new Error('Error interno: El campo items no es un array')
      }
      
      if (pedidoData.data.items.length === 0) {
        console.error('❌ ERROR CRÍTICO: El payload NO tiene items o está vacío')
        console.error('❌ NO SE PUEDE CREAR EL PEDIDO')
        throw new Error('El pedido debe tener al menos un producto. Agrega productos antes de crear el pedido.')
      }
      
      console.log('✅ Validación OK: Items presentes')

      // ═══════════════════════════════════════════════════════════════
      // PASO 1: ENVIAR AL ENDPOINT DE DEBUG (si está disponible)
      // ═══════════════════════════════════════════════════════════════
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('📤 Enviando al endpoint de DEBUG (Strapi)...')
      console.log('═══════════════════════════════════════════════════════')
      
      try {
        const debugResponse = await fetch('https://strapi.moraleja.cl/api/pedidos/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedidoData)
        })

        if (debugResponse.ok) {
          const debugResult = await debugResponse.json()

          console.log('═══════════════════════════════════════════════════════')
          console.log('📥 RESPUESTA DEL DEBUG ENDPOINT:')
          console.log(JSON.stringify(debugResult, null, 2))
          console.log('═══════════════════════════════════════════════════════')

          // Analizar respuesta del debug
          if (debugResult.received) {
            console.log('🔍 Análisis de lo que Strapi recibió:')
            console.log('- hasData:', debugResult.received.hasData)
            console.log('- hasItems:', debugResult.received.hasItems)
            console.log('- hasProductos:', debugResult.received.hasProductos)
            console.log('- itemsLength:', debugResult.received.itemsLength)
            console.log('- productosLength:', debugResult.received.productosLength)

            // Verificar si hay problema
            if (!debugResult.received.hasItems && !debugResult.received.hasProductos) {
              console.error('❌ CONFIRMADO: Strapi NO recibió items ni productos')
              console.error('❌ El problema está en cómo se construye o envía el payload')
              throw new Error('ERROR CONFIRMADO: Strapi no está recibiendo los items. Revisa la consola (F12).')
            }

            if (debugResult.received.itemsLength === 0 && debugResult.received.productosLength === 0) {
              console.error('❌ CONFIRMADO: El array de items está VACÍO en Strapi')
              console.error('❌ Los items se están perdiendo durante el envío')
              throw new Error('ERROR CONFIRMADO: Los items llegan vacíos a Strapi. Revisa la consola (F12).')
            }

            console.log('✅ DEBUG OK: Strapi recibió los items correctamente')
            console.log(`✅ Total de items detectados: ${debugResult.received.itemsLength || debugResult.received.productosLength}`)
          }
        } else {
          console.warn('⚠️ Endpoint de debug no disponible o error:', debugResponse.status)
          console.warn('⚠️ Continuando con el envío normal...')
        }
      } catch (debugError: any) {
        console.warn('⚠️ Error al llamar al debug endpoint (continuando):', debugError.message)
        console.warn('⚠️ Esto es normal si el endpoint de debug no está disponible')
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: ENVIAR AL ENDPOINT REAL
      // ═══════════════════════════════════════════════════════════════
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('📤 Enviando al endpoint REAL de creación...')
      console.log('═══════════════════════════════════════════════════════')

      const response = await fetch('/api/tienda/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pedidoData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Error ${response.status}: ${response.statusText}` }
        }
        
        console.error('═══════════════════════════════════════════════════════')
        console.error('❌ ERROR AL CREAR PEDIDO')
        console.error('═══════════════════════════════════════════════════════')
        console.error('Status:', response.status)
        console.error('Error:', errorData)
        console.error('═══════════════════════════════════════════════════════')
        
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      console.log('═══════════════════════════════════════════════════════')
      console.log('✅ PEDIDO CREADO EXITOSAMENTE')
      console.log('═══════════════════════════════════════════════════════')
      console.log('Resultado:', JSON.stringify(result, null, 2))
      console.log('Número de pedido:', result.data?.numero_pedido)
      console.log('ID:', result.data?.id || result.data?.documentId)
      console.log('═══════════════════════════════════════════════════════')

      if (!result.success) {
        throw new Error(result.error || 'Error al crear el pedido')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/atributos/pedidos')
      }, 1500)
    } catch (err: any) {
      console.error('[AddPedidoForm] Error al crear pedido:', err)
      setError(err.message || 'Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">Agregar Nuevo Pedido</h5>
        <p className="text-muted mb-0 mt-2 small">
          Completa los campos requeridos para crear un nuevo pedido en el sistema.
        </p>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            ¡Pedido creado exitosamente! Redirigiendo...
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Número de Pedido <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: PED-001, ORD-2024-001"
                  value={formData.numero_pedido}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, numero_pedido: e.target.value }))
                  }
                  required
                />
                <small className="text-muted">
                  Número único del pedido (requerido).
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Fecha del Pedido <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="datetime-local"
                  value={formData.fecha_pedido}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fecha_pedido: e.target.value }))
                  }
                  required
                />
                <small className="text-muted">
                  Fecha y hora del pedido.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Estado <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, estado: e.target.value }))
                  }
                  required
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="procesando">Procesando</option>
                  <option value="en_espera">En Espera</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="reembolsado">Reembolsado</option>
                  <option value="fallido">Fallido</option>
                </FormControl>
                <small className="text-muted">
                  Estado actual del pedido.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Plataforma de Origen <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  as="select"
                  value={formData.originPlatform}
                  onChange={(e) => {
                    const value = e.target.value as 'woo_moraleja' | 'woo_escolar' | 'otros'
                    setFormData((prev) => ({ ...prev, originPlatform: value }))
                  }}
                  required
                >
                  <option value="woo_moraleja">WooCommerce Moraleja</option>
                  <option value="woo_escolar">WooCommerce Escolar</option>
                  <option value="otros">Otros</option>
                </FormControl>
                <small className="text-muted">
                  Plataforma de origen del pedido.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>
                  Cliente
                </FormLabel>
                {loadingClientes ? (
                  <div className="d-flex align-items-center">
                    <Spinner size="sm" className="me-2" />
                    <span className="text-muted">Cargando clientes...</span>
                  </div>
                ) : (
                  <FormControl
                    as="select"
                    value={formData.cliente || 'invitado'}
                    onChange={(e) => {
                      const clienteId = e.target.value
                      setFormData((prev) => ({ ...prev, cliente: clienteId === 'invitado' ? null : clienteId }))
                    }}
                  >
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id === 'invitado' ? 'invitado' : cliente.documentId || cliente.id}>
                        {cliente.displayName}
                      </option>
                    ))}
                  </FormControl>
                )}
                <small className="text-muted">
                  Selecciona el cliente del pedido. Si no hay cliente, selecciona "Invitado".
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Total</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.total}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, total: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Total del pedido.
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Subtotal</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.subtotal}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subtotal: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Subtotal del pedido.
                </small>
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Impuestos</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.impuestos}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, impuestos: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Envío</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.envio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, envio: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={4}>
              <FormGroup>
                <FormLabel>Descuento</FormLabel>
                <FormControl
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.descuento}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, descuento: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Moneda</FormLabel>
                <FormControl
                  type="text"
                  placeholder="CLP"
                  value={formData.moneda}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, moneda: e.target.value }))
                  }
                />
                <small className="text-muted">
                  Moneda del pedido (por defecto: CLP).
                </small>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Método de Pago</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: transferencia, tarjeta"
                  value={formData.metodo_pago}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, metodo_pago: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Nota del Cliente</FormLabel>
                <FormControl
                  as="textarea"
                  rows={3}
                  placeholder="Notas adicionales del cliente..."
                  value={formData.nota_cliente}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nota_cliente: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <ProductSelector
                originPlatform={formData.originPlatform}
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
              />
            </Col>
          </Row>

          <div className="d-flex gap-2 mt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              <LuSave className="fs-sm me-2" />
              {loading ? 'Guardando...' : 'Guardar Pedido'}
            </Button>
            <Button
              type="button"
              variant="light"
              onClick={() => router.back()}
            >
              <LuX className="fs-sm me-2" />
              Cancelar
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  )
}

export default AddPedidoForm

