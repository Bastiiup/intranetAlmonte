'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Form, FormGroup, FormLabel, FormControl, Alert, Row, Col, Badge } from 'react-bootstrap'
import { LuCheck, LuX, LuPlus } from 'react-icons/lu'

interface EmpresaOption {
  id: number | string
  internalId?: number
  documentId?: string
  empresa_nombre?: string
  nombre?: string
  emails?: Array<{ email: string }>
}

interface ProductoOption {
  id: number | string
  internalId?: number
  documentId?: string
  nombre_libro?: string
  nombre?: string
  sku?: string
  isbn_libro?: string // ISBN del libro
}

interface RFQModalProps {
  show: boolean
  onHide: () => void
  onSuccess?: () => void
  rfq?: any // Para edición
}

const MONEDAS = [
  { value: 'CLP', label: 'CLP (Peso Chileno)' },
  { value: 'USD', label: 'USD (Dólar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
]

const RFQModal = ({ show, onHide, onSuccess, rfq }: RFQModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [productos, setProductos] = useState<ProductoOption[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fecha_solicitud: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    moneda: 'CLP',
    notas_internas: '',
    empresasSeleccionadas: [] as string[],
    productosSeleccionados: [] as string[],
    productosCantidades: {} as Record<string, number>, // { productoId: cantidad }
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (show) {
      loadData()
      setError(null)
    }
  }, [show])

  // Establecer datos de RFQ después de cargar empresas y productos
  useEffect(() => {
    if (show && rfq && empresas.length > 0 && productos.length > 0) {
      // Modo edición: cargar datos de la RFQ
      const attrs = rfq.attributes || rfq
      
      // Extraer empresas con manejo robusto
      let empresasData: any[] = []
      if (attrs.empresas) {
        if (Array.isArray(attrs.empresas)) {
          empresasData = attrs.empresas
        } else if (attrs.empresas.data && Array.isArray(attrs.empresas.data)) {
          empresasData = attrs.empresas.data
        } else if (attrs.empresas.data && !Array.isArray(attrs.empresas.data)) {
          empresasData = [attrs.empresas.data]
        } else if (typeof attrs.empresas === 'object' && attrs.empresas.id) {
          empresasData = [attrs.empresas]
        }
      } else if ((rfq as any).empresas) {
        if (Array.isArray((rfq as any).empresas)) {
          empresasData = (rfq as any).empresas
        } else if ((rfq as any).empresas.data && Array.isArray((rfq as any).empresas.data)) {
          empresasData = (rfq as any).empresas.data
        }
      }
      
      // Extraer productos con manejo robusto
      let productosData: any[] = []
      if (attrs.productos) {
        if (Array.isArray(attrs.productos)) {
          productosData = attrs.productos
        } else if (attrs.productos.data && Array.isArray(attrs.productos.data)) {
          productosData = attrs.productos.data
        } else if (attrs.productos.data && !Array.isArray(attrs.productos.data)) {
          productosData = [attrs.productos.data]
        } else if (typeof attrs.productos === 'object' && attrs.productos.id) {
          productosData = [attrs.productos]
        }
      } else if ((rfq as any).productos) {
        if (Array.isArray((rfq as any).productos)) {
          productosData = (rfq as any).productos
        } else if ((rfq as any).productos.data && Array.isArray((rfq as any).productos.data)) {
          productosData = (rfq as any).productos.data
        }
      }
      
      console.log('[RFQModal] Datos extraídos de RFQ para edición:', {
        rfqId: rfq.id || rfq.documentId,
        empresasRaw: attrs.empresas || (rfq as any).empresas,
        empresasExtracted: empresasData,
        empresasCount: empresasData.length,
        productosRaw: attrs.productos || (rfq as any).productos,
        productosExtracted: productosData,
        productosCount: productosData.length,
        attrsKeys: Object.keys(attrs || {}),
        rfqKeys: Object.keys(rfq || {}),
      })
      
      // Mapear IDs de empresas - buscar en la lista cargada para obtener el ID correcto
      const empresasSeleccionadas = empresasData.map((e: any) => {
        const empId = e.id || e.documentId
        // Buscar en la lista de empresas cargadas para obtener el ID correcto
        const empresaEncontrada = empresas.find((emp) => 
          String(emp.id) === String(empId) || 
          String(emp.documentId) === String(empId) ||
          String(emp.internalId) === String(empId)
        )
        // Usar el ID de la empresa encontrada, o el ID original como fallback
        return String(empresaEncontrada?.id || empId)
      })
      
      // Mapear IDs de productos - buscar en la lista cargada para obtener el ID correcto
      const productosSeleccionados = productosData.map((p: any) => {
        const prodId = p.id || p.documentId
        // Buscar en la lista de productos cargados para obtener el ID correcto
        const productoEncontrado = productos.find((prod) => 
          String(prod.id) === String(prodId) || 
          String(prod.documentId) === String(prodId) ||
          String(prod.internalId) === String(prodId)
        )
        // Usar el ID del producto encontrado, o el ID original como fallback
        return String(productoEncontrado?.id || prodId)
      })
      
      // Cargar cantidades de productos si existen (usar documentId como key)
      const productosCantidades: Record<string, number> = {}
      if (attrs.productos_cantidades) {
        try {
          const cantidades = typeof attrs.productos_cantidades === 'string' 
            ? JSON.parse(attrs.productos_cantidades) 
            : attrs.productos_cantidades
          
          // Si es un objeto con documentId como keys (o IDs numéricos que necesitan conversión)
          if (typeof cantidades === 'object' && !Array.isArray(cantidades)) {
            Object.keys(cantidades).forEach((key) => {
              const cantidad = cantidades[key]
              if (typeof cantidad === 'number' && cantidad > 0) {
                // La key puede ser documentId (UUID) o ID numérico
                const isUUID = key.length > 10 && !/^\d+$/.test(key)
                
                let productoEncontrado: any = null
                
                if (isUUID) {
                  // Es un documentId, buscar directamente por documentId
                  productoEncontrado = productos.find((prod) => 
                    String(prod.documentId) === String(key)
                  )
                } else {
                  // Es un ID numérico, buscar por ID numérico o internalId
                  // Luego obtener su documentId para mapear correctamente
                  productoEncontrado = productos.find((prod) => 
                    String(prod.id) === String(key) ||
                    String(prod.internalId) === String(key)
                  )
                }
                
                if (productoEncontrado) {
                  // Usar el ID del formulario (puede ser id o documentId) como key
                  // Priorizar documentId si está disponible
                  const keyParaFormulario = productoEncontrado.documentId 
                    ? String(productoEncontrado.documentId) 
                    : String(productoEncontrado.id)
                  productosCantidades[keyParaFormulario] = cantidad
                  
                  console.log(`[RFQModal] ✅ Cantidad cargada: key original=${key}, producto encontrado (documentId=${productoEncontrado.documentId}, id=${productoEncontrado.id}), cantidad=${cantidad}, key para formulario=${keyParaFormulario}`)
                } else {
                  console.warn(`[RFQModal] ⚠️ No se encontró producto para key de cantidad: ${key}`)
                }
              }
            })
          }
        } catch (e) {
          console.warn('[RFQModal] Error al parsear productos_cantidades:', e)
        }
      }
      
      setFormData((prev) => ({
        ...prev,
        nombre: attrs.nombre || '',
        descripcion: attrs.descripcion || '',
        fecha_solicitud: attrs.fecha_solicitud || new Date().toISOString().split('T')[0],
        fecha_vencimiento: attrs.fecha_vencimiento || '',
        moneda: attrs.moneda || 'CLP',
        notas_internas: attrs.notas_internas || '',
        empresasSeleccionadas,
        productosSeleccionados,
        productosCantidades, // Cargar cantidades guardadas
      }))
    } else if (show && !rfq) {
      // Modo creación: resetear formulario
      setFormData({
        nombre: '',
        descripcion: '',
        fecha_solicitud: new Date().toISOString().split('T')[0],
        fecha_vencimiento: '',
        moneda: 'CLP',
        notas_internas: '',
        empresasSeleccionadas: [],
        productosSeleccionados: [],
        productosCantidades: {}, // Resetear cantidades
      })
    }
  }, [show, rfq, empresas, productos])

  const loadData = async () => {
    setLoadingData(true)
    try {
      // Cargar empresas
      const empresasRes = await fetch('/api/crm/empresas?pageSize=1000')
      const empresasData = await empresasRes.json()
      if (empresasData.success && Array.isArray(empresasData.data)) {
        const empresasNormalizadas = empresasData.data.map((e: any) => {
          const attrs = e.attributes || e
          // Asegurar que siempre tengamos el ID interno (necesario para relaciones en Strapi)
          const internalId = e.id || (typeof e.id === 'number' ? e.id : null)
          const documentId = e.documentId || e.id
          const finalId = internalId || documentId
          
          return {
            id: finalId, // ID para usar en el formulario
            internalId: internalId, // ID interno numérico (necesario para relaciones)
            documentId: documentId,
            empresa_nombre: attrs.empresa_nombre || attrs.nombre || e.empresa_nombre || e.nombre,
            nombre: attrs.nombre || e.nombre,
            emails: attrs.emails || e.emails || [],
          }
        }).filter((e: any) => e.id) // Filtrar empresas sin ID válido
        
        setEmpresas(empresasNormalizadas)
        console.log('[RFQModal] Empresas cargadas:', empresasNormalizadas.length, 'empresas')
      }

      // Cargar productos (libros desde Strapi)
      const productosRes = await fetch('/api/tienda/productos?pagination[pageSize]=1000')
      const productosData = await productosRes.json()
      if (productosData.success && Array.isArray(productosData.data)) {
        const productosNormalizados = productosData.data.map((p: any) => {
          const attrs = p.attributes || p
          // Asegurar que siempre tengamos el ID interno (necesario para relaciones en Strapi)
          // El ID interno es numérico y es el que se usa para relaciones
          // En Strapi v5, el ID puede ser numérico o puede venir como documentId
          let internalId: number | null = null
          
          // Intentar obtener ID numérico
          if (typeof p.id === 'number' && p.id > 0) {
            internalId = p.id
          } else if (typeof p.id === 'string' && !isNaN(parseInt(p.id)) && parseInt(p.id) > 0) {
            internalId = parseInt(p.id)
          }
          
          const documentId = p.documentId || (typeof p.id === 'string' && p.id.length > 10 ? p.id : null)
          
          // IMPORTANTE: Si no hay ID interno válido, usar documentId como ID principal
          // El backend resolverá el documentId a ID numérico cuando sea necesario
          const finalId = internalId || documentId || p.id
          
          return {
            id: finalId, // ID para usar en el formulario (puede ser número o documentId)
            internalId: internalId, // ID interno numérico (null si no existe)
            documentId: documentId, // documentId (UUID string)
            nombre_libro: attrs.nombre_libro || attrs.nombre || p.nombre_libro || p.nombre,
            nombre: attrs.nombre || p.nombre,
            sku: attrs.sku || p.sku,
            isbn_libro: attrs.isbn_libro || attrs.isbn || p.isbn_libro || p.isbn || attrs.sku || p.sku, // Priorizar isbn_libro, luego isbn, luego sku
          }
        }).filter((p: any) => p.id) // Filtrar productos sin ID válido
        
        console.log('[RFQModal] Productos cargados:', {
          total: productosNormalizados.length,
          conInternalId: productosNormalizados.filter((p: any) => p.internalId).length,
          sinInternalId: productosNormalizados.filter((p: any) => !p.internalId).length,
          primerosIds: productosNormalizados.slice(0, 5).map((p: any) => ({
            id: p.id,
            internalId: p.internalId,
            documentId: p.documentId,
            nombre: p.nombre_libro || p.nombre,
          })),
          // Mostrar algunos productos sin internalId para debugging
          sinInternalIdEjemplos: productosNormalizados.filter((p: any) => !p.internalId).slice(0, 3).map((p: any) => ({
            id: p.id,
            internalId: p.internalId,
            documentId: p.documentId,
            nombre: p.nombre_libro || p.nombre,
          })),
        })
        
        setProductos(productosNormalizados)
      }
    } catch (err) {
      console.error('Error al cargar datos:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleEmpresa = (empresaId: string) => {
    setFormData((prev) => {
      const empresas = prev.empresasSeleccionadas
      const index = empresas.indexOf(empresaId)
      if (index >= 0) {
        return {
          ...prev,
          empresasSeleccionadas: empresas.filter((id) => id !== empresaId),
        }
      } else {
        return {
          ...prev,
          empresasSeleccionadas: [...empresas, empresaId],
        }
      }
    })
  }

  const toggleProducto = (productoId: string) => {
    setFormData((prev) => {
      const productos = prev.productosSeleccionados
      const index = productos.indexOf(productoId)
      if (index >= 0) {
        // Deseleccionar: remover de seleccionados y de cantidades
        const newCantidades = { ...prev.productosCantidades }
        delete newCantidades[productoId]
        return {
          ...prev,
          productosSeleccionados: productos.filter((id) => id !== productoId),
          productosCantidades: newCantidades,
        }
      } else {
        // Seleccionar: agregar a seleccionados con cantidad por defecto 1
        return {
          ...prev,
          productosSeleccionados: [...productos, productoId],
          productosCantidades: {
            ...prev.productosCantidades,
            [productoId]: 1, // Cantidad por defecto
          },
        }
      }
    })
  }
  
  const updateProductoCantidad = (productoId: string, cantidad: number) => {
    setFormData((prev) => ({
      ...prev,
      productosCantidades: {
        ...prev.productosCantidades,
        [productoId]: Math.max(1, cantidad), // Mínimo 1
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es obligatorio')
      }

      if (formData.empresasSeleccionadas.length === 0) {
        throw new Error('Debe seleccionar al menos una empresa')
      }

      if (formData.productosSeleccionados.length === 0) {
        throw new Error('Debe seleccionar al menos un producto')
      }

      // Obtener IDs internos de empresas y productos seleccionados
      const empresasIds = formData.empresasSeleccionadas.map((selectedId) => {
        const empresa = empresas.find((e) => 
          String(e.id) === selectedId || 
          String(e.documentId) === selectedId ||
          String(e.internalId) === selectedId
        )
        // Preferir ID interno numérico, si no existe intentar convertir el ID seleccionado
        if (empresa?.internalId && typeof empresa.internalId === 'number') {
          return empresa.internalId
        }
        // Intentar convertir el ID seleccionado a número
        const idNum = Number(selectedId)
        if (!isNaN(idNum) && idNum > 0) {
          return idNum
        }
        return null
      }).filter((id): id is number => id !== null && !isNaN(id) && id > 0)
      
      const productosIds = formData.productosSeleccionados.map((selectedId) => {
        const producto = productos.find((p) => 
          String(p.id) === selectedId || 
          String(p.documentId) === selectedId ||
          String(p.internalId) === selectedId
        )
        
        if (!producto) {
          console.warn(`[RFQModal] ⚠️ Producto no encontrado para selectedId: ${selectedId}`)
          return null
        }
        
        console.log(`[RFQModal] 🔍 Procesando producto seleccionado:`, {
          selectedId,
          productoId: producto.id,
          internalId: producto.internalId,
          documentId: producto.documentId,
        })
        
        // IMPORTANTE: En Strapi v5, usar documentId es más confiable que internalId
        // Los internalId pueden no existir cuando se accede directamente
        // Preferir documentId si está disponible
        if (producto.documentId && typeof producto.documentId === 'string' && producto.documentId.length > 10) {
          console.log(`[RFQModal] ✅ Usando documentId (más confiable): ${producto.documentId}`)
          // Enviar documentId como string, el backend lo resolverá a ID numérico
          return producto.documentId
        }
        
        // Si no hay documentId, usar internalId como fallback
        if (producto.internalId && typeof producto.internalId === 'number' && producto.internalId > 0) {
          console.log(`[RFQModal] ⚠️ Usando internalId (fallback): ${producto.internalId}`)
          return producto.internalId
        }
        
        // Último recurso: intentar convertir el ID seleccionado a número
        const idNum = Number(selectedId)
        if (!isNaN(idNum) && idNum > 0) {
          console.log(`[RFQModal] ⚠️ Usando selectedId convertido a número: ${idNum} (puede no existir)`)
          return idNum
        }
        
        console.warn(`[RFQModal] ❌ No se pudo obtener ID válido para producto:`, producto)
        return null
      }).filter((id): id is number | string => id !== null && (typeof id === 'number' || typeof id === 'string'))
      
      console.log('[RFQModal] IDs procesados:', {
        empresasSeleccionadas: formData.empresasSeleccionadas,
        empresasIds,
        productosSeleccionados: formData.productosSeleccionados,
        productosIds,
      })
      
      if (empresasIds.length === 0) {
        throw new Error('No se pudieron obtener IDs válidos de las empresas seleccionadas')
      }
      
      if (productosIds.length === 0) {
        throw new Error('No se pudieron obtener IDs válidos de los productos seleccionados')
      }
      
      // Mapear cantidades usando documentId como key (más confiable que ID numérico)
      const productosCantidadesConDocumentId: Record<string, number> = {}
      Object.keys(formData.productosCantidades).forEach((productoIdKey) => {
        const producto = productos.find((p) => 
          String(p.id) === productoIdKey || 
          String(p.documentId) === productoIdKey ||
          String(p.internalId) === productoIdKey
        )
        if (producto && producto.documentId) {
          // Usar documentId como key en lugar del ID numérico
          productosCantidadesConDocumentId[producto.documentId] = formData.productosCantidades[productoIdKey]
        } else if (producto && producto.id) {
          // Fallback: si no hay documentId, usar el ID que tengamos
          productosCantidadesConDocumentId[String(producto.id)] = formData.productosCantidades[productoIdKey]
        }
      })
      
      const rfqData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        fecha_solicitud: formData.fecha_solicitud,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        moneda: formData.moneda,
        notas_internas: formData.notas_internas?.trim() || null,
        empresas: empresasIds,
        productos: productosIds,
        productos_cantidades: productosCantidadesConDocumentId, // Guardar cantidades usando documentId como key
        estado: 'draft',
      }
      
      console.log('[RFQModal] Cantidades a guardar (con documentId):', {
        productosCantidadesOriginales: formData.productosCantidades,
        productosCantidadesConDocumentId,
        productosMapeados: Object.keys(productosCantidadesConDocumentId).map(docId => {
          const prod = productos.find(p => String(p.documentId) === docId)
          return {
            documentId: docId,
            nombre: prod?.nombre_libro || prod?.nombre,
            cantidad: productosCantidadesConDocumentId[docId],
          }
        }),
      })

      console.log('[RFQModal] Enviando datos:', {
        isEdit: !!rfq,
        rfqId: rfq ? (rfq.documentId || rfq.id) : 'nuevo',
        rfqInfo: rfq ? {
          id: rfq.id,
          documentId: rfq.documentId,
          idUsado: rfq.documentId || rfq.id,
        } : null,
        rfqData: {
          nombre: rfqData.nombre,
          empresasCount: rfqData.empresas.length,
          empresasIds: rfqData.empresas,
          productosCount: rfqData.productos.length,
          productosIds: rfqData.productos,
        },
      })

      let response
      if (rfq) {
        // Editar
        // En Strapi v5, para operaciones PUT debemos usar documentId, no el id numérico
        const rfqId = rfq.documentId || rfq.id
        const url = `/api/compras/rfqs/${rfqId}`
        console.log('[RFQModal] Editando RFQ:', {
          url,
          documentId: rfq.documentId,
          id: rfq.id,
          rfqIdUsado: rfqId,
        })
        response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rfqData),
        })
      } else {
        // Crear
        const url = '/api/compras/rfqs'
        console.log('[RFQModal] Creando RFQ:', url)
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rfqData),
        })
      }

      console.log('[RFQModal] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      let result
      try {
        const responseText = await response.text()
        console.log('[RFQModal] Texto de respuesta:', responseText)
        result = JSON.parse(responseText)
      } catch (jsonError: any) {
        console.error('[RFQModal] Error al parsear JSON:', jsonError)
        // Si la respuesta no es JSON, usar el texto de la respuesta
        throw new Error(`Error ${response.status}: ${response.statusText}. La respuesta no es JSON válido.`)
      }

      console.log('[RFQModal] Resultado parseado:', result)

      if (!response.ok || !result.success) {
        let errorMessage = result.error || result.message || `Error ${response.status}: ${response.statusText}`
        
        // Mensajes específicos para errores comunes
        if (response.status === 404) {
          if (rfq) {
            errorMessage = `RFQ no encontrada con ID: ${rfq.id || rfq.documentId}. Verifica que la RFQ exista en Strapi.`
          } else {
            errorMessage = 'RFQ no encontrada. Verifica que la RFQ exista en Strapi.'
          }
        } else if (response.status === 400) {
          if (errorMessage.includes('productos') || errorMessage.includes('producto')) {
            errorMessage = 'Error al vincular productos. Verifica que los productos seleccionados existan en Strapi.'
          } else if (errorMessage.includes('empresas') || errorMessage.includes('empresa')) {
            errorMessage = 'Error al vincular empresas. Verifica que las empresas seleccionadas existan en Strapi.'
          }
        }
        
        // Log con template strings para evitar objetos vacíos
        const status = response.status ?? 0
        const statusText = response.statusText || 'No status text'
        const url = rfq ? `/api/compras/rfqs/${rfq.id || rfq.documentId}` : '/api/compras/rfqs'
        const method = rfq ? 'PUT' : 'POST'
        
        console.error(
          `[RFQModal] ❌ Error en respuesta\n` +
          `  Status: ${status}\n` +
          `  StatusText: ${statusText}\n` +
          `  URL: ${url}\n` +
          `  Method: ${method}\n` +
          `  Error: ${errorMessage}`
        )
        
        // Si result tiene detalles específicos útiles, mostrarlos
        if (result && typeof result === 'object') {
          const details: string[] = []
          
          if (result.details && typeof result.details === 'object') {
            if (result.details.hint) {
              details.push(`  Hint: ${result.details.hint}`)
            }
            if (result.details.id) {
              details.push(`  ID buscado: ${result.details.id}`)
            }
            if (result.details.isNumericId !== undefined) {
              details.push(`  Tipo ID: ${result.details.isNumericId ? 'numérico' : 'documentId'}`)
            }
          }
          
          if (result.status && result.status !== status) {
            details.push(`  Status en respuesta: ${result.status}`)
          }
          
          if (details.length > 0) {
            console.error('[RFQModal] Detalles adicionales:\n' + details.join('\n'))
          }
        }
        
        throw new Error(errorMessage)
      }

      if (onSuccess) {
        onSuccess()
      }
      onHide()
    } catch (err: any) {
      // Construir mensaje de log con información útil
      const errorMsg = err.message || 'Error desconocido al guardar RFQ'
      const logParts: string[] = [
        `[RFQModal] ❌ Error al guardar RFQ`,
        `  Modo: ${rfq ? 'Edición' : 'Creación'}`,
        `  RFQ ID: ${rfq ? (rfq.id || rfq.documentId || 'unknown') : 'nuevo'}`,
        `  Error: ${errorMsg}`,
      ]
      
      if (err.status) {
        logParts.push(`  HTTP Status: ${err.status}`)
      }
      
      console.error(logParts.join('\n'))
      
      // Si hay stack trace, mostrarlo por separado (truncado)
      if (err.stack) {
        console.error('[RFQModal] Stack trace:', err.stack.substring(0, 300))
      }
      
      // Mensajes de error más específicos
      let errorMessage = errorMsg
      
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'El content type "rfqs" no existe en Strapi. Por favor, créalo primero según la documentación en docs/crm/STRAPI-SCHEMA-COMPRAS-PROVEEDORES.md'
      } else if (errorMessage.includes('relation') || errorMessage.includes('no existe')) {
        errorMessage = 'Una o más empresas/productos seleccionados no existen en Strapi. Por favor, verifica que estén creados correctamente.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit}>
        <ModalHeader closeButton>
          <ModalTitle>{rfq ? 'Editar RFQ' : 'Nueva Solicitud de Cotización'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={12}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Nombre <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="text"
                  placeholder="Ej: RFQ - Libros Educativos Q1 2026"
                  value={formData.nombre}
                  onChange={(e) => handleFieldChange('nombre', e.target.value)}
                  required
                  disabled={loading || loadingData}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>
                  Fecha de Solicitud <span className="text-danger">*</span>
                </FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_solicitud}
                  onChange={(e) => handleFieldChange('fecha_solicitud', e.target.value)}
                  required
                  disabled={loading || loadingData}
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleFieldChange('fecha_vencimiento', e.target.value)}
                  disabled={loading || loadingData}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormLabel>Moneda</FormLabel>
                <FormControl
                  as="select"
                  value={formData.moneda}
                  onChange={(e) => handleFieldChange('moneda', e.target.value)}
                  disabled={loading || loadingData}
                >
                  {MONEDAS.map((moneda) => (
                    <option key={moneda.value} value={moneda.value}>
                      {moneda.label}
                    </option>
                  ))}
                </FormControl>
              </FormGroup>
            </Col>
          </Row>

          <FormGroup className="mb-3">
            <FormLabel>Descripción</FormLabel>
            <FormControl
              as="textarea"
              rows={3}
              placeholder="Descripción detallada de la solicitud de cotización..."
              value={formData.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
              disabled={loading || loadingData}
            />
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>
              Empresas/Proveedores <span className="text-danger">*</span>
            </FormLabel>
            {loadingData ? (
              <p className="text-muted">Cargando empresas...</p>
            ) : (
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {empresas.length === 0 ? (
                  <p className="text-muted mb-0">No hay empresas disponibles</p>
                ) : (
                  empresas.map((empresa) => {
                    const isSelected = formData.empresasSeleccionadas.includes(String(empresa.id))
                    return (
                      <div key={empresa.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmpresa(String(empresa.id))}
                          id={`empresa-${empresa.id}`}
                          disabled={loading || loadingData}
                        />
                        <label className="form-check-label" htmlFor={`empresa-${empresa.id}`}>
                          {empresa.empresa_nombre || empresa.nombre || 'Empresa'}
                          {isSelected && <Badge bg="primary" className="ms-2">Seleccionada</Badge>}
                        </label>
                      </div>
                    )
                  })
                )}
              </div>
            )}
            {formData.empresasSeleccionadas.length > 0 && (
              <small className="text-muted">
                {formData.empresasSeleccionadas.length} empresa(s) seleccionada(s)
              </small>
            )}
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>
              Productos <span className="text-danger">*</span>
            </FormLabel>
            {loadingData ? (
              <p className="text-muted">Cargando productos...</p>
            ) : (
              <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {productos.length === 0 ? (
                  <p className="text-muted mb-0">No hay productos disponibles</p>
                ) : (
                  productos.map((producto) => {
                    const isSelected = formData.productosSeleccionados.includes(String(producto.id))
                    const cantidad = formData.productosCantidades[String(producto.id)] || 1
                    const productoSeleccionado = productos.find((p) => String(p.id) === String(producto.id))
                    const nombreProducto = productoSeleccionado?.nombre_libro || productoSeleccionado?.nombre || producto.nombre_libro || producto.nombre || 'Producto'
                    const isbnProducto = productoSeleccionado?.isbn_libro || productoSeleccionado?.sku || producto.isbn_libro || producto.sku || ''
                    
                    return (
                      <div key={producto.id} className="mb-3 p-2 border rounded">
                        <div className="form-check mb-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProducto(String(producto.id))}
                            id={`producto-${producto.id}`}
                            disabled={loading || loadingData}
                          />
                          <label className="form-check-label" htmlFor={`producto-${producto.id}`}>
                            <strong>{nombreProducto}</strong>
                            {isbnProducto && <span className="text-muted ms-2">(ISBN: {isbnProducto})</span>}
                            {isSelected && <Badge bg="primary" className="ms-2">Seleccionado</Badge>}
                          </label>
                        </div>
                        {isSelected && (
                          <div className="ms-4">
                            <FormGroup>
                              <FormLabel className="small">Cantidad:</FormLabel>
                              <FormControl
                                type="number"
                                min="1"
                                value={cantidad}
                                onChange={(e) => updateProductoCantidad(String(producto.id), parseInt(e.target.value) || 1)}
                                disabled={loading || loadingData}
                                style={{ maxWidth: '100px' }}
                              />
                            </FormGroup>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
            {formData.productosSeleccionados.length > 0 && (
              <small className="text-muted">
                {formData.productosSeleccionados.length} producto(s) seleccionado(s)
              </small>
            )}
          </FormGroup>

          <FormGroup className="mb-3">
            <FormLabel>Notas Internas</FormLabel>
            <FormControl
              as="textarea"
              rows={2}
              placeholder="Notas internas (no visibles para proveedores)..."
              value={formData.notas_internas}
              onChange={(e) => handleFieldChange('notas_internas', e.target.value)}
              disabled={loading || loadingData}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            <LuX className="me-1" />
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading || loadingData}>
            <LuCheck className="me-1" />
            {loading ? 'Guardando...' : rfq ? 'Actualizar' : 'Crear RFQ'}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

export default RFQModal

