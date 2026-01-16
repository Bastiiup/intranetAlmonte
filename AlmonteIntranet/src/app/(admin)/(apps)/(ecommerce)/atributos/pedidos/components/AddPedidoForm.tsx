'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, Form, Button, Row, Col, FormGroup, FormLabel, FormControl, Alert, Spinner } from 'react-bootstrap'
import { LuSave, LuX } from 'react-icons/lu'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'
import ProductSelector from './ProductSelector'
import ChileRegionComuna, { CHILE_REGIONS } from '@/components/common/ChileRegionsComunas'
import { parseWooCommerceAddress, buildWooCommerceAddress, type DetailedAddress } from '@/lib/woocommerce/address-utils'

// Generar número de pedido automático
const generarNumeroPedido = async (platform: 'woo_moraleja' | 'woo_escolar' | 'otros'): Promise<string> => {
    if (platform === 'otros') {
      // Para "otros", usar formato simple con timestamp
      const year = new Date().getFullYear().toString().slice(-2)
      const timestamp = Date.now().toString().slice(-8)
      return `ord${year}${timestamp}`
    }

    try {
      // Obtener pedidos de la plataforma (obtener más para asegurar que tenemos el último)
      const response = await fetch(`/api/tienda/pedidos?pagination[pageSize]=1000`)
      const data = await response.json()
      
      const year = new Date().getFullYear().toString().slice(-2)
      let nextNumber = 1
      
      if (data.success && data.data && data.data.length > 0) {
        // Filtrar pedidos de la plataforma y del mismo año, extraer números
        const pedidosDePlataforma = data.data
          .filter((p: any) => {
            const attrs = p.attributes || {}
            const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : p
            const pedidoPlatform = pedidoData.originPlatform || p.originPlatform
            return pedidoPlatform === platform
          })
          .map((p: any) => {
            const attrs = p.attributes || {}
            const pedidoData = (attrs && Object.keys(attrs).length > 0) ? attrs : p
            const numeroPedido = pedidoData.numero_pedido || pedidoData.numeroPedido || ''
            
            // Extraer año y número secuencial del formato ord{YY}{NNNNNNNNNN}
            const match = numeroPedido.match(/ord(\d{2})(\d+)/)
            if (match && match[1] && match[2]) {
              const pedidoYear = match[1]
              const secuencial = parseInt(match[2], 10)
              
              // Solo incluir si es del mismo año
              if (!isNaN(secuencial) && secuencial >= 0 && pedidoYear === year) {
                return {
                  numeroPedido,
                  secuencial,
                  year: pedidoYear,
                  pedido: p
                }
              }
            }
            return null
          })
          .filter((item: any) => item !== null) // Eliminar nulls
          .sort((a: any, b: any) => b.secuencial - a.secuencial) // Ordenar descendente por número secuencial
        
        // Obtener el último número secuencial del año actual
        if (pedidosDePlataforma.length > 0) {
          const ultimoPedido = pedidosDePlataforma[0]
          nextNumber = ultimoPedido.secuencial + 1
          console.log('[generarNumeroPedido] ✅ Último número encontrado para', platform, 'año', year, ':', ultimoPedido.numeroPedido, '-> Siguiente:', nextNumber)
        } else {
          console.log('[generarNumeroPedido] ℹ️ No se encontraron pedidos previos de la plataforma', platform, 'para el año', year, ', empezando desde 1')
        }
      } else {
        console.log('[generarNumeroPedido] ℹ️ No hay pedidos en el sistema, empezando desde 1 para', platform, 'año', year)
      }
      
      // Formato: ord{YY}{NNNNNNNNNN} donde NNNNNNNNNN es el número secuencial con ceros a la izquierda
      const numeroSecuencial = nextNumber.toString().padStart(10, '0')
      const numeroFinal = `ord${year}${numeroSecuencial}`
      console.log('[generarNumeroPedido] ✅ Número generado:', numeroFinal)
      return numeroFinal
    } catch (error) {
      console.error('[AddPedidoForm] Error al generar número de pedido:', error)
      // Fallback: usar timestamp si falla
      const year = new Date().getFullYear().toString().slice(-2)
      const timestamp = Date.now().toString().slice(-8)
      return `ord${year}${timestamp}`
    }
}

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
    clienteData?: any
    woocommerce_id?: number
  }>>([])
  const [loadingClientes, setLoadingClientes] = useState(false)

  const [cupones, setCupones] = useState<Array<{
    id: string | number
    documentId?: string
    codigo: string
    tipo_cupon?: string
    importe_cupon?: number
    descripcion?: string
    displayName: string
  }>>([])
  const [loadingCupones, setLoadingCupones] = useState(false)

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
    cupon_code: null as string | null,
    items: [] as any[],
    metodo_pago: '',
    metodo_pago_titulo: '',
    nota_cliente: '',
    originPlatform: 'woo_moraleja' as 'woo_moraleja' | 'woo_escolar' | 'otros',
  })

  // Estados para billing (facturación)
  const [billingAddress, setBillingAddress] = useState({
    first_name: '',
    last_name: '',
    company: '',
    calle: '',
    numero: '',
    dpto: '',
    block: '',
    condominio: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'CL',
    email: '',
    phone: '',
  })

  // Estados para shipping (envío)
  const [shippingAddress, setShippingAddress] = useState({
    first_name: '',
    last_name: '',
    company: '',
    calle: '',
    numero: '',
    dpto: '',
    block: '',
    condominio: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'CL',
    phone: '',
  })

  // Estado para usar misma dirección de facturación para envío
  const [useSameAddress, setUseSameAddress] = useState(true)

  // Mapeo de nombres de región a códigos de provincia (para enviar a WooCommerce)
  const REGION_NAME_TO_PROVINCE_CODE: Record<string, string> = {
    'Tarapacá': '011',
    'Antofagasta': '021',
    'Atacama': '031',
    'Coquimbo': '041',
    'Valparaíso': '051',
    'Región del Libertador General Bernardo O\'Higgins': '061',
    'Región del Maule': '071',
    'Región del Biobío': '081',
    'Región de la Araucanía': '091',
    'Región de Los Lagos': '101',
    'Región de Aysén del General Carlos Ibáñez del Campo': '111',
    'Región de Magallanes y de la Antártica Chilena': '121',
    'Región Metropolitana de Santiago': '131',
    'Región de Los Ríos': '141',
    'Arica y Parinacota': '151',
    'Ñuble': '161',
  }

  // Mapeo de códigos de provincia a nombres de región (para convertir de vuelta desde WooCommerce)
  const PROVINCE_CODE_TO_REGION_NAME: Record<string, string> = {
    '011': 'Tarapacá',
    '014': 'Tarapacá',
    '021': 'Antofagasta',
    '022': 'Antofagasta',
    '023': 'Antofagasta',
    '031': 'Atacama',
    '032': 'Atacama',
    '033': 'Atacama',
    '041': 'Coquimbo',
    '042': 'Coquimbo',
    '043': 'Coquimbo',
    '051': 'Valparaíso',
    '052': 'Valparaíso',
    '053': 'Valparaíso',
    '054': 'Valparaíso',
    '055': 'Valparaíso',
    '061': 'Región del Libertador General Bernardo O\'Higgins',
    '062': 'Región del Libertador General Bernardo O\'Higgins',
    '063': 'Región del Libertador General Bernardo O\'Higgins',
    '071': 'Región del Maule',
    '072': 'Región del Maule',
    '073': 'Región del Maule',
    '074': 'Región del Maule',
    '081': 'Región del Biobío',
    '082': 'Región del Biobío',
    '083': 'Región del Biobío',
    '091': 'Región de la Araucanía',
    '092': 'Región de la Araucanía',
    '101': 'Región de Los Lagos',
    '102': 'Región de Los Lagos',
    '103': 'Región de Los Lagos',
    '104': 'Región de Los Lagos',
    '111': 'Región de Aysén del General Carlos Ibáñez del Campo',
    '112': 'Región de Aysén del General Carlos Ibáñez del Campo',
    '113': 'Región de Aysén del General Carlos Ibáñez del Campo',
    '114': 'Región de Aysén del General Carlos Ibáñez del Campo',
    '121': 'Región de Magallanes y de la Antártica Chilena',
    '122': 'Región de Magallanes y de la Antártica Chilena',
    '131': 'Región Metropolitana de Santiago',
    '132': 'Región Metropolitana de Santiago',
    '133': 'Región Metropolitana de Santiago',
    '134': 'Región Metropolitana de Santiago',
    '135': 'Región Metropolitana de Santiago',
    '141': 'Región de Los Ríos',
    '142': 'Región de Los Ríos',
    '151': 'Arica y Parinacota',
    '152': 'Arica y Parinacota',
    '161': 'Ñuble',
    '162': 'Ñuble',
    '163': 'Ñuble',
  }

  // Helper para convertir código de provincia a nombre de región
  const getRegionNameFromProvinceCode = (provinceCode: string): string => {
    if (!provinceCode) return ''
    // Si ya es un nombre de región (no código), devolverlo tal cual
    const region = CHILE_REGIONS.find(r => r.name === provinceCode)
    if (region) return provinceCode
    // Si es un código de provincia, convertir a nombre de región
    return PROVINCE_CODE_TO_REGION_NAME[provinceCode] || provinceCode
  }

  // Cargar cupones cuando cambia la plataforma
  useEffect(() => {
    const fetchCupones = async () => {
      if (formData.originPlatform === 'otros') {
        setCupones([])
        return
      }

      setLoadingCupones(true)
      try {
        const response = await fetch('/api/tienda/cupones?pagination[pageSize]=1000')
        const data = await response.json()

        if (data.success && data.data) {
          const cuponesMapeados = data.data
            .filter((cupon: any) => {
              const attrs = cupon.attributes || {}
              const cuponData = (attrs && Object.keys(attrs).length > 0) ? attrs : cupon
              const cuponPlatform = cuponData.originPlatform || cupon.originPlatform
              return cuponPlatform === formData.originPlatform
            })
            .map((cupon: any) => {
              const attrs = cupon.attributes || {}
              const cuponData = (attrs && Object.keys(attrs).length > 0) ? attrs : cupon
              const codigo = cuponData.codigo || cupon.codigo || ''
              const tipoCupon = cuponData.tipo_cupon || cupon.tipo_cupon || 'fixed_cart'
              const importeCupon = cuponData.importe_cupon || cupon.importe_cupon || 0
              const descripcion = cuponData.descripcion || cupon.descripcion || ''
              
              let displayText = codigo
              if (tipoCupon === 'percent' || tipoCupon === 'percent_product') {
                displayText = `${codigo} (${importeCupon}%)`
              } else {
                displayText = `${codigo} ($${importeCupon.toLocaleString('es-CL')})`
              }
              if (descripcion) {
                displayText += ` - ${descripcion}`
              }

              return {
                id: cupon.id || cupon.documentId,
                documentId: cupon.documentId || cupon.id,
                codigo,
                tipo_cupon: tipoCupon,
                importe_cupon: importeCupon,
                descripcion,
                displayName: displayText,
              }
            })

          setCupones(cuponesMapeados)
        } else {
          setCupones([])
        }
      } catch (error: any) {
        console.error('[AddPedidoForm] Error al cargar cupones:', error)
        setCupones([])
      } finally {
        setLoadingCupones(false)
      }
    }

    fetchCupones()
  }, [formData.originPlatform])

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
          const clientesMapeados = data.data
            .filter((cliente: any) => {
              // Filtrar clientes por originPlatform
              const attrs = cliente.attributes || {}
              const clienteData = (attrs && Object.keys(attrs).length > 0) ? attrs : cliente
              const clientePlatform = clienteData.originPlatform || cliente.originPlatform
              // Solo incluir clientes de la plataforma seleccionada
              return clientePlatform === formData.originPlatform
            })
            .map((cliente: any) => {
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
              
              // Obtener woocommerce_id del cliente (buscar en wooId primero, luego woocommerce_id para compatibilidad)
              const woocommerceId = clienteData.wooId || clienteData.woocommerce_id || cliente.wooId || cliente.woocommerce_id || null
              
              console.log('[AddPedidoForm] 🔍 Mapeando cliente:', {
                nombre,
                email,
                woocommerceId,
                clienteData_wooId: clienteData.wooId,
                clienteData_woocommerce_id: clienteData.woocommerce_id,
                cliente_wooId: cliente.wooId,
                cliente_woocommerce_id: cliente.woocommerce_id,
              })

              return {
                id: cliente.id || cliente.documentId || cliente.id,
                documentId: cliente.documentId || cliente.id,
                nombre,
                email,
                displayName,
                clienteData, // Guardar datos completos para usar después
                woocommerce_id: woocommerceId ? parseInt(String(woocommerceId), 10) : undefined,
              }
            })

          // Agregar opción "Invitado" al inicio
          setClientes([
            {
              id: 'invitado',
              nombre: 'Invitado',
              email: '',
              displayName: 'Invitado',
              clienteData: null,
              woocommerce_id: undefined,
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
              clienteData: null,
              woocommerce_id: undefined,
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
            clienteData: null,
            woocommerce_id: undefined,
          },
        ])
      } finally {
        setLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [formData.originPlatform])

  // Generar número de pedido automático cuando cambia la plataforma
  // También resetear cliente seleccionado cuando cambia la plataforma
  useEffect(() => {
    const generarNumero = async () => {
      const numero = await generarNumeroPedido(formData.originPlatform)
      setFormData((prev) => ({ ...prev, numero_pedido: numero, cliente: null }))
    }
    generarNumero()
  }, [formData.originPlatform])

  // Cargar datos de billing/shipping cuando se selecciona un cliente
  useEffect(() => {
    const loadClienteData = async () => {
      console.log('[AddPedidoForm] 🔄 useEffect loadClienteData ejecutado:', {
        clienteId: formData.cliente,
        totalClientes: clientes.length,
        originPlatform: formData.originPlatform,
      })
      
      if (formData.cliente && formData.cliente !== 'invitado') {
        const clienteSeleccionado = clientes.find(c => 
          (c.documentId || c.id) === formData.cliente
        ) as any

        console.log('[AddPedidoForm] 🔍 Cliente seleccionado encontrado:', {
          encontrado: !!clienteSeleccionado,
          nombre: clienteSeleccionado?.nombre,
          email: clienteSeleccionado?.email,
          woocommerce_id: clienteSeleccionado?.woocommerce_id,
          hasWoocommerceId: !!clienteSeleccionado?.woocommerce_id,
          clienteCompleto: clienteSeleccionado,
        })

        if (clienteSeleccionado) {
          const nombreCompleto = clienteSeleccionado.nombre.split(' ')
          const firstName = nombreCompleto[0] || ''
          const lastName = nombreCompleto.slice(1).join(' ') || ''

          // Intentar cargar datos desde rawWooData primero (más rápido, sin llamada a API)
          const rawWooData = clienteSeleccionado.clienteData?.rawWooData || (clienteSeleccionado as any).rawWooData
          
          if (rawWooData && (rawWooData.billing || rawWooData.shipping)) {
            console.log('[AddPedidoForm] ✅ Cliente tiene rawWooData, cargando desde Strapi (más rápido)')
            const wooCustomer = rawWooData
            
            // Cargar billing desde rawWooData
            if (wooCustomer.billing) {
              const billingWoo = wooCustomer.billing
              const billingParsed = billingWoo.address_1 && billingWoo.address_2 
                ? parseWooCommerceAddress(billingWoo.address_1 || '', billingWoo.address_2 || '')
                : { calle: '', numero: '', dpto: '', block: '', condominio: '' }
              
              const billingStateName = getRegionNameFromProvinceCode(billingWoo.state || '')
              
              setBillingAddress({
                first_name: billingWoo.first_name || firstName,
                last_name: billingWoo.last_name || lastName,
                company: billingWoo.company || '',
                calle: billingParsed.calle || '',
                numero: billingParsed.numero || '',
                dpto: billingParsed.dpto || '',
                block: billingParsed.block || '',
                condominio: billingParsed.condominio || '',
                address_1: billingWoo.address_1 || '',
                address_2: billingWoo.address_2 || '',
                city: billingWoo.city || '',
                state: billingStateName,
                postcode: billingWoo.postcode || '',
                country: billingWoo.country || 'CL',
                email: billingWoo.email || clienteSeleccionado.email || '',
                phone: billingWoo.phone || '',
              })
              
              console.log('[AddPedidoForm] ✅ Billing cargado desde rawWooData (Strapi)')
            }
            
            // Cargar shipping desde rawWooData
            if (wooCustomer.shipping && !useSameAddress) {
              const shippingWoo = wooCustomer.shipping
              const shippingParsed = shippingWoo.address_1 && shippingWoo.address_2 
                ? parseWooCommerceAddress(shippingWoo.address_1 || '', shippingWoo.address_2 || '')
                : { calle: '', numero: '', dpto: '', block: '', condominio: '' }
              
              const shippingStateName = getRegionNameFromProvinceCode(shippingWoo.state || '')
              
              setShippingAddress({
                first_name: shippingWoo.first_name || firstName,
                last_name: shippingWoo.last_name || lastName,
                company: shippingWoo.company || '',
                calle: shippingParsed.calle || '',
                numero: shippingParsed.numero || '',
                dpto: shippingParsed.dpto || '',
                block: shippingParsed.block || '',
                condominio: shippingParsed.condominio || '',
                address_1: shippingWoo.address_1 || '',
                address_2: shippingWoo.address_2 || '',
                city: shippingWoo.city || '',
                state: shippingStateName,
                postcode: shippingWoo.postcode || '',
                country: shippingWoo.country || 'CL',
                phone: shippingWoo.phone || '',
              })
              
              console.log('[AddPedidoForm] ✅ Shipping cargado desde rawWooData (Strapi)')
            }
          } else if (clienteSeleccionado.woocommerce_id) {
            // Si no hay rawWooData pero tiene woocommerce_id, cargar desde WooCommerce API
            console.log('[AddPedidoForm] ⚠️ No hay rawWooData, cargando desde WooCommerce API...')
            try {
              // Determinar la plataforma según el originPlatform del pedido
              const platform = formData.originPlatform === 'woo_moraleja' ? 'woo_moraleja' : 'woo_escolar'
              console.log('[AddPedidoForm] 🔍 Cargando datos de WooCommerce para cliente ID:', clienteSeleccionado.woocommerce_id, 'de plataforma:', platform)
              const wooResponse = await fetch(`/api/woocommerce/customers/${clienteSeleccionado.woocommerce_id}?platform=${platform}`)
              const wooResult = await wooResponse.json()
              
              if (wooResponse.ok && wooResult.success && wooResult.data) {
                const wooCustomer = wooResult.data
                
                console.log('[AddPedidoForm] 📦 Datos completos de WooCommerce recibidos:', {
                  id: wooCustomer.id,
                  email: wooCustomer.email,
                  first_name: wooCustomer.first_name,
                  last_name: wooCustomer.last_name,
                  hasBilling: !!wooCustomer.billing,
                  hasShipping: !!wooCustomer.shipping,
                  billing: wooCustomer.billing,
                  shipping: wooCustomer.shipping,
                })
                
                // Cargar billing desde WooCommerce
                // Verificar que billing existe y tiene al menos un campo de dirección
                const hasBillingData = wooCustomer.billing && (
                  wooCustomer.billing.address_1 || 
                  wooCustomer.billing.city || 
                  wooCustomer.billing.phone ||
                  wooCustomer.billing.company
                )
                
                if (hasBillingData) {
                  const billingWoo = wooCustomer.billing
                  const billingParsed = billingWoo.address_1 && billingWoo.address_2 
                    ? parseWooCommerceAddress(billingWoo.address_1 || '', billingWoo.address_2 || '')
                    : { calle: '', numero: '', dpto: '', block: '', condominio: '' }
                  
                  // Convertir código de provincia a nombre de región si viene como código
                  const billingStateName = getRegionNameFromProvinceCode(billingWoo.state || '')
                  
                  setBillingAddress({
                    first_name: billingWoo.first_name || firstName,
                    last_name: billingWoo.last_name || lastName,
                    company: billingWoo.company || '',
                    calle: billingParsed.calle || '',
                    numero: billingParsed.numero || '',
                    dpto: billingParsed.dpto || '',
                    block: billingParsed.block || '',
                    condominio: billingParsed.condominio || '',
                    address_1: billingWoo.address_1 || '',
                    address_2: billingWoo.address_2 || '',
                    city: billingWoo.city || '',
                    state: billingStateName, // Convertir código de provincia a nombre de región
                    postcode: billingWoo.postcode || '',
                    country: billingWoo.country || 'CL',
                    email: billingWoo.email || clienteSeleccionado.email || '',
                    phone: billingWoo.phone || '',
                  })
                  
                  console.log('[AddPedidoForm] ✅ Billing cargado desde WooCommerce:', {
                    stateOriginal: billingWoo.state,
                    stateConverted: billingStateName,
                    company: billingWoo.company || '(vacío)',
                    phone: billingWoo.phone || '(vacío)',
                    postcode: billingWoo.postcode || '(vacío)',
                    address_1: billingWoo.address_1 || '(vacío)',
                    city: billingWoo.city || '(vacío)',
                    calle: billingParsed.calle || '(vacío)',
                    numero: billingParsed.numero || '(vacío)',
                    dpto: billingParsed.dpto || '(vacío)',
                  })
                } else {
                  // Si no hay billing o está vacío en WooCommerce
                  console.warn('[AddPedidoForm] ⚠️ No hay datos de billing en WooCommerce o están vacíos:', {
                    hasBilling: !!wooCustomer.billing,
                    billing: wooCustomer.billing,
                  })
                  // Usar datos básicos
                  setBillingAddress(prev => ({
                    ...prev,
                    first_name: firstName,
                    last_name: lastName,
                    email: clienteSeleccionado.email || '',
                  }))
                }
                
                // Cargar shipping desde WooCommerce
                if (wooCustomer.shipping && !useSameAddress) {
                  const shippingWoo = wooCustomer.shipping
                  const shippingParsed = shippingWoo.address_1 && shippingWoo.address_2 
                    ? parseWooCommerceAddress(shippingWoo.address_1 || '', shippingWoo.address_2 || '')
                    : { calle: '', numero: '', dpto: '', block: '', condominio: '' }
                  
                  // Convertir código de provincia a nombre de región si viene como código
                  const shippingStateName = getRegionNameFromProvinceCode(shippingWoo.state || '')
                  
                  setShippingAddress({
                    first_name: shippingWoo.first_name || firstName,
                    last_name: shippingWoo.last_name || lastName,
                    company: shippingWoo.company || '',
                    calle: shippingParsed.calle || '',
                    numero: shippingParsed.numero || '',
                    dpto: shippingParsed.dpto || '',
                    block: shippingParsed.block || '',
                    condominio: shippingParsed.condominio || '',
                    address_1: shippingWoo.address_1 || '',
                    address_2: shippingWoo.address_2 || '',
                    city: shippingWoo.city || '',
                    state: shippingStateName, // Convertir código de provincia a nombre de región
                    postcode: shippingWoo.postcode || '',
                    country: shippingWoo.country || 'CL',
                    phone: shippingWoo.phone || '',
                  })
                  
                  console.log('[AddPedidoForm] 📦 Shipping cargado:', {
                    stateOriginal: shippingWoo.state,
                    stateConverted: shippingStateName,
                    company: shippingWoo.company,
                    phone: shippingWoo.phone,
                    postcode: shippingWoo.postcode,
                  })
                }
                // Nota: Si useSameAddress está activo, el useEffect de sincronización se encargará
                // de copiar todos los datos de billing a shipping después de que billingAddress se actualice
                
                console.log('[AddPedidoForm] ✅ Datos de billing/shipping cargados desde WooCommerce')
              }
            } catch (wooError: any) {
              console.error('[AddPedidoForm] ❌ Error al cargar datos de WooCommerce:', {
                error: wooError.message,
                stack: wooError.stack,
                clienteId: clienteSeleccionado.woocommerce_id,
                platform: formData.originPlatform,
              })
              // Usar datos básicos si falla la carga desde WooCommerce
              setBillingAddress(prev => ({
                ...prev,
                first_name: firstName,
                last_name: lastName,
                email: clienteSeleccionado.email || '',
              }))
              if (useSameAddress) {
                setShippingAddress(prev => ({
                  ...prev,
                  first_name: firstName,
                  last_name: lastName,
                }))
              }
            }
          } else {
            // Si no tiene woocommerce_id, usar datos básicos
            console.log('[AddPedidoForm] ⚠️ Cliente NO tiene woocommerce_id, usando solo datos básicos:', {
              nombre: clienteSeleccionado.nombre,
              email: clienteSeleccionado.email,
              woocommerce_id: clienteSeleccionado.woocommerce_id,
            })
            setBillingAddress(prev => ({
              ...prev,
              first_name: firstName,
              last_name: lastName,
              email: clienteSeleccionado.email || '',
            }))
            if (useSameAddress) {
              setShippingAddress(prev => ({
                ...prev,
                first_name: firstName,
                last_name: lastName,
              }))
            }
          }
        }
      } else {
        // Resetear campos si se selecciona "Invitado"
        setBillingAddress({
          first_name: '',
          last_name: '',
          company: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: 'CL',
          email: '',
          phone: '',
        })
        if (useSameAddress) {
          setShippingAddress({
            first_name: '',
            last_name: '',
            company: '',
            address_1: '',
            address_2: '',
            city: '',
            state: '',
            postcode: '',
            country: 'CL',
            phone: '',
          })
        }
      }
    }

    loadClienteData()
  }, [formData.cliente, clientes, useSameAddress])

  // Sincronizar shipping con billing cuando useSameAddress está activo
  useEffect(() => {
    if (useSameAddress) {
      setShippingAddress(prev => ({
        ...prev,
        first_name: billingAddress.first_name,
        last_name: billingAddress.last_name,
        company: billingAddress.company,
        calle: billingAddress.calle,
        numero: billingAddress.numero,
        dpto: billingAddress.dpto,
        block: billingAddress.block,
        condominio: billingAddress.condominio,
        address_1: billingAddress.address_1,
        address_2: billingAddress.address_2,
        city: billingAddress.city,
        state: billingAddress.state,
        postcode: billingAddress.postcode,
        country: billingAddress.country,
        phone: billingAddress.phone,
      }))
    }
  }, [useSameAddress, billingAddress])

  // Calcular subtotal y total cuando cambian los productos o el cupón
  useEffect(() => {
    const subtotal = selectedProducts.reduce((sum, p) => sum + p.subtotal, 0)
    const impuestos = formData.impuestos ? parseFloat(formData.impuestos) : 0
    const envio = formData.envio ? parseFloat(formData.envio) : 0
    
    // Calcular descuento del cupón si existe
    let descuentoCupon = 0
    if (formData.cupon_code) {
      const cuponSeleccionado = cupones.find(c => c.codigo === formData.cupon_code)
      if (cuponSeleccionado && cuponSeleccionado.importe_cupon) {
        if (cuponSeleccionado.tipo_cupon === 'percent' || cuponSeleccionado.tipo_cupon === 'percent_product') {
          descuentoCupon = (subtotal * cuponSeleccionado.importe_cupon) / 100
        } else {
          descuentoCupon = cuponSeleccionado.importe_cupon
        }
        // Asegurar que el descuento no exceda el subtotal
        descuentoCupon = Math.min(descuentoCupon, subtotal)
      }
    }
    
    const descuento = descuentoCupon > 0 ? descuentoCupon : (formData.descuento ? parseFloat(formData.descuento) : 0)
    const total = subtotal + impuestos + envio - descuento

    setFormData((prev) => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      descuento: descuentoCupon > 0 ? descuentoCupon.toFixed(2) : prev.descuento,
      total: total.toFixed(2),
    }))
  }, [selectedProducts, formData.impuestos, formData.envio, formData.descuento, formData.cupon_code, cupones])

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

      // Construir direcciones detalladas para billing y shipping
      const billingDetailed: DetailedAddress = {
        calle: billingAddress.calle || '',
        numero: billingAddress.numero || '',
        dpto: billingAddress.dpto || '',
        block: billingAddress.block || '',
        condominio: billingAddress.condominio || '',
        address_1: billingAddress.address_1 || '',
        address_2: billingAddress.address_2 || '',
        city: billingAddress.city || '',
        state: billingAddress.state || '',
        postcode: billingAddress.postcode || '',
        country: billingAddress.country || 'CL',
      }
      
      const shippingDetailed: DetailedAddress = {
        calle: shippingAddress.calle || '',
        numero: shippingAddress.numero || '',
        dpto: shippingAddress.dpto || '',
        block: shippingAddress.block || '',
        condominio: shippingAddress.condominio || '',
        address_1: shippingAddress.address_1 || '',
        address_2: shippingAddress.address_2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        postcode: shippingAddress.postcode || '',
        country: shippingAddress.country || 'CL',
      }
      
      // Construir address_1 y address_2 desde campos detallados
      const billingWooCommerce = buildWooCommerceAddress(billingDetailed)
      const shippingWooCommerce = buildWooCommerceAddress(shippingDetailed)
      
      // Convertir nombre de región a código de provincia para WooCommerce
      const billingStateCode = billingAddress.state 
        ? (REGION_NAME_TO_PROVINCE_CODE[billingAddress.state] || 
           (/^\d{3}$/.test(billingAddress.state) ? billingAddress.state : ''))
        : ''
      
      const shippingStateCode = shippingAddress.state 
        ? (REGION_NAME_TO_PROVINCE_CODE[shippingAddress.state] || 
           (/^\d{3}$/.test(shippingAddress.state) ? shippingAddress.state : ''))
        : ''

      // Construir información de billing y shipping desde los estados
      const billingInfo = {
        first_name: billingAddress.first_name || '',
        last_name: billingAddress.last_name || '',
        company: billingAddress.company || '',
        address_1: billingWooCommerce.address_1 || billingAddress.address_1 || '',
        address_2: billingWooCommerce.address_2 || billingAddress.address_2 || '',
        city: billingAddress.city || '',
        state: billingStateCode || billingAddress.state || '', // Usar código de provincia
        postcode: billingAddress.postcode || '',
        country: billingAddress.country || 'CL',
        email: billingAddress.email || '',
        phone: billingAddress.phone || '',
      }

      const shippingInfo = {
        first_name: shippingAddress.first_name || '',
        last_name: shippingAddress.last_name || '',
        company: shippingAddress.company || '',
        address_1: shippingWooCommerce.address_1 || shippingAddress.address_1 || '',
        address_2: shippingWooCommerce.address_2 || shippingAddress.address_2 || '',
        city: shippingAddress.city || '',
        state: shippingStateCode || shippingAddress.state || '', // Usar código de provincia
        postcode: shippingAddress.postcode || '',
        country: shippingAddress.country || 'CL',
        phone: shippingAddress.phone || '',
      }
      
      console.log('[AddPedidoForm] 📦 Billing/Shipping preparados:', {
        billing: {
          stateOriginal: billingAddress.state,
          stateCode: billingStateCode,
          company: billingInfo.company,
          phone: billingInfo.phone,
          postcode: billingInfo.postcode,
          address_1: billingInfo.address_1,
          address_2: billingInfo.address_2,
        },
        shipping: {
          stateOriginal: shippingAddress.state,
          stateCode: shippingStateCode,
          company: shippingInfo.company,
          phone: shippingInfo.phone,
          postcode: shippingInfo.postcode,
        },
      })

      // ⚠️ VALIDACIÓN CRÍTICA: Verificar que items NO esté vacío
      if (!items || items.length === 0) {
        console.error('[AddPedidoForm] ❌ ERROR CRÍTICO: items está vacío o no existe')
        console.error('[AddPedidoForm] selectedProducts:', selectedProducts)
        console.error('[AddPedidoForm] items construidos:', items)
        throw new Error('El pedido debe tener al menos un producto. Agrega productos antes de crear el pedido.')
      }

      // Obtener woocommerce_id del cliente seleccionado si existe
      let customerIdWoo: number | undefined = undefined
      if (formData.cliente && formData.cliente !== 'invitado') {
        const clienteSeleccionado = clientes.find(c => 
          (c.documentId || c.id) === formData.cliente
        )
        if (clienteSeleccionado && clienteSeleccionado.woocommerce_id) {
          customerIdWoo = clienteSeleccionado.woocommerce_id
          console.log('[AddPedidoForm] ✅ Cliente seleccionado tiene woocommerce_id:', customerIdWoo)
        } else {
          console.warn('[AddPedidoForm] ⚠️ Cliente seleccionado no tiene woocommerce_id, se buscará por email')
        }
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
          customer_id_woo: customerIdWoo, // ⚠️ CRÍTICO: Enviar woocommerce_id para vincular el pedido con el cliente
          cupon_code: formData.cupon_code || null,
          billing: billingInfo,
          shipping: shippingInfo,
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
                  value={formData.numero_pedido}
                  readOnly
                  disabled
                  className="bg-light"
                />
                <small className="text-muted">
                  Número generado automáticamente (no editable).
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
                <FormLabel>
                  Cupón
                </FormLabel>
                {loadingCupones ? (
                  <div className="d-flex align-items-center">
                    <Spinner size="sm" className="me-2" />
                    <span className="text-muted">Cargando cupones...</span>
                  </div>
                ) : (
                  <FormControl
                    as="select"
                    value={formData.cupon_code || ''}
                    onChange={(e) => {
                      const cuponCode = e.target.value
                      setFormData((prev) => ({ ...prev, cupon_code: cuponCode || null }))
                    }}
                  >
                    <option value="">Sin cupón</option>
                    {cupones.map((cupon) => (
                      <option key={cupon.id} value={cupon.codigo}>
                        {cupon.displayName}
                      </option>
                    ))}
                  </FormControl>
                )}
                <small className="text-muted">
                  Selecciona un cupón para aplicar descuento al pedido (solo cupones de la plataforma seleccionada).
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
              <hr className="my-4" />
              <h5 className="mb-3">Datos de Facturación</h5>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Nombre</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre"
                  value={billingAddress.first_name}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Apellido</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Apellido"
                  value={billingAddress.last_name}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Email</FormLabel>
                <FormControl
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={billingAddress.email}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Teléfono</FormLabel>
                <FormControl
                  type="text"
                  placeholder="+56912345678"
                  value={billingAddress.phone}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Empresa</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Nombre de la empresa (opcional)"
                  value={billingAddress.company}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Dirección</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Calle y número"
                  value={billingAddress.address_1}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, address_1: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <FormGroup>
                <FormLabel>Dirección 2 (opcional)</FormLabel>
                <FormControl
                  type="text"
                  placeholder="Depto, Block, Condominio, etc."
                  value={billingAddress.address_2}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, address_2: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <ChileRegionComuna
                regionValue={billingAddress.state}
                comunaValue={billingAddress.city}
                onRegionChange={(region) =>
                  setBillingAddress((prev) => ({ ...prev, state: region, postcode: '' }))
                }
                onComunaChange={(comuna) =>
                  setBillingAddress((prev) => ({ ...prev, city: comuna }))
                }
                onPostalCodeChange={(postalCode) =>
                  setBillingAddress((prev) => ({ ...prev, postcode: postalCode }))
                }
                regionLabel="Región"
                comunaLabel="Comuna"
                autoGeneratePostalCode={true}
              />
            </Col>

            <Col md={6}>
              <FormGroup>
                <FormLabel>Código Postal</FormLabel>
                <FormControl
                  type="text"
                  placeholder="1234567"
                  value={billingAddress.postcode}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, postcode: e.target.value }))
                  }
                />
              </FormGroup>
            </Col>

            <Col md={12}>
              <hr className="my-4" />
              <h5 className="mb-3">Datos de Envío</h5>
            </Col>

            <Col md={12}>
              <FormGroup>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="useSameAddress"
                    checked={useSameAddress}
                    onChange={(e) => setUseSameAddress(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="useSameAddress">
                    Usar la misma dirección de facturación para envío
                  </label>
                </div>
              </FormGroup>
            </Col>

            {!useSameAddress && (
              <>
                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Nombre"
                      value={shippingAddress.first_name}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Apellido"
                      value={shippingAddress.last_name}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="+56912345678"
                      value={shippingAddress.phone}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Nombre de la empresa (opcional)"
                      value={shippingAddress.company}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, company: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Calle y número"
                      value={shippingAddress.address_1}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, address_1: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <FormGroup>
                    <FormLabel>Dirección 2 (opcional)</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="Depto, Block, Condominio, etc."
                      value={shippingAddress.address_2}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, address_2: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>

                <Col md={12}>
                  <ChileRegionComuna
                    regionValue={shippingAddress.state}
                    comunaValue={shippingAddress.city}
                    onRegionChange={(region) =>
                      setShippingAddress((prev) => ({ ...prev, state: region, postcode: '' }))
                    }
                    onComunaChange={(comuna) =>
                      setShippingAddress((prev) => ({ ...prev, city: comuna }))
                    }
                    onPostalCodeChange={(postalCode) =>
                      setShippingAddress((prev) => ({ ...prev, postcode: postalCode }))
                    }
                    regionLabel="Región"
                    comunaLabel="Comuna"
                    autoGeneratePostalCode={true}
                  />
                </Col>

                <Col md={6}>
                  <FormGroup>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl
                      type="text"
                      placeholder="1234567"
                      value={shippingAddress.postcode}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, postcode: e.target.value }))
                      }
                    />
                  </FormGroup>
                </Col>
              </>
            )}

            <Col md={12}>
              <hr className="my-4" />
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

