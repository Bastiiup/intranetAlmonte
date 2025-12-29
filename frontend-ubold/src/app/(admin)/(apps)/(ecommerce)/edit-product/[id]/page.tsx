'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuillClient from '@/components/client-wrapper/QuillClient'
import ProductImage from '../../add-product/components/ProductImage'
import ProductTabs, { TabType } from '../../add-product/components/ProductTabs'
import PlatformSelector from '../../add-product/components/PlatformSelector'
import GeneralTab from '../../add-product/components/tabs/GeneralTab'
import InventarioTab from '../../add-product/components/tabs/InventarioTab'
import EnvioTab from '../../add-product/components/tabs/EnvioTab'
import VinculadosTab from '../../add-product/components/tabs/VinculadosTab'
import AtributosTab from '../../add-product/components/tabs/AtributosTab'
import AvanzadoTab from '../../add-product/components/tabs/AvanzadoTab'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Alert, Button, Card, CardBody, Col, Container, FormControl, FormGroup, FormLabel, FormSelect, Row } from 'react-bootstrap'

// Configuración del editor Quill para descripción
const quillModules = {
  toolbar: [
    [{ header: [false, 1, 2, 3] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    [{ align: [] }],
    ['link', 'image'],
    ['clean'],
  ],
}

// Configuración del editor Quill para descripción corta (más simple)
const quillModulesShort = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter()
  const [productId, setProductId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true) // Carga inicial de datos
  const [loading, setLoading] = useState(false) // Carga del submit (igual que add-product)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [responseData, setResponseData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // === BÁSICOS ===
    nombre_libro: '',
    descripcion: '',
    descripcion_corta: '',
    isbn_libro: '',
    
    // === WOOCOMMERCE: PRECIO ===
    precio: '',
    precio_oferta: '',
    sale_quantity: '',
    sold_items: '0',
    tax_status: 'taxable',
    tax_class: 'standard',
    
    // === WOOCOMMERCE: INVENTARIO ===
    sku: '',
    stock_quantity: '',
    manage_stock: true,
    stock_status: 'instock' as 'instock' | 'outofstock' | 'onbackorder',
    sold_individually: false,
    
    // === WOOCOMMERCE: TIPO DE PRODUCTO ===
    type: 'simple' as 'simple' | 'grouped' | 'external' | 'variable',
    
    // === WOOCOMMERCE: PESO Y DIMENSIONES ===
    weight: '',
    length: '',
    width: '',
    height: '',
    shipping_class: '',
    
    // === WOOCOMMERCE: OPCIONES ADICIONALES ===
    virtual: false,
    downloadable: false,
    reviews_allowed: true,
    menu_order: '0',
    purchase_note: '',
    
    // === PRODUCTOS VINCULADOS ===
    upsell_ids: '',
    cross_sell_ids: '',
    
    // === MEDIA ===
    portada_libro: null as File | null,
  })

  // Obtener ID del producto desde params
  useEffect(() => {
    params.then((p) => {
      setProductId(p.id)
    })
  }, [params])

  // Cargar datos del producto (precarga)
  useEffect(() => {
    if (!productId) return

    async function fetchProducto() {
      try {
        setInitialLoading(true)
        setError(null)
        const response = await fetch(`/api/tienda/productos/${productId}`)
        
        if (!response.ok) {
          throw new Error('Producto no encontrado')
        }

        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error('Error al cargar el producto')
        }

        const producto = result.data
        const attrs = producto.attributes || producto

        // Extraer descripción (puede ser string HTML, string plano, o array de blocks)
        let descripcion = ''
        if (typeof attrs.descripcion === 'string') {
          // Si es string, puede ser HTML o texto plano
          descripcion = attrs.descripcion
        } else if (Array.isArray(attrs.descripcion)) {
          // Si es array de blocks (Strapi Rich Text), convertir a HTML
          // Por ahora, extraer texto plano. Si necesitas HTML completo, usar una librería de conversión
          descripcion = attrs.descripcion
            .map((block: any) => {
              if (block.type === 'paragraph' && block.children) {
                return block.children.map((child: any) => {
                  if (child.type === 'text') {
                    return child.text || ''
                  }
                  return ''
                }).join('')
              }
              return ''
            })
            .filter((text: string) => text.trim() !== '')
            .join('<p>')
        }
        
        // Si la descripción está vacía pero hay texto, intentar extraerlo
        if (!descripcion && attrs.descripcion) {
          descripcion = String(attrs.descripcion)
        }

        // Obtener imagen
        const portada = attrs.portada_libro?.data || attrs.PORTADA_LIBRO?.data
        if (portada) {
          const url = portada.attributes?.url || portada.url
          if (url) {
            const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
            setCurrentImageUrl(url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`)
          }
        }

        // Obtener canales
        const canales = attrs.canales?.data || attrs.canales || []
        const platformIds: string[] = []
        canales.forEach((canal: any) => {
          const canalAttrs = canal.attributes || canal
          const key = canalAttrs.key || canalAttrs.nombre?.toLowerCase()
          if (key === 'moraleja' || key === 'woo_moraleja') {
            platformIds.push('woo_moraleja')
          } else if (key === 'escolar' || key === 'woo_escolar') {
            platformIds.push('woo_escolar')
          }
        })
        setSelectedPlatforms(platformIds)

        // Precargar datos del formulario - EXACTAMENTE igual que agregar producto
        setFormData({
          nombre_libro: attrs.nombre_libro || attrs.NOMBRE_LIBRO || '',
          descripcion: descripcion,
          descripcion_corta: attrs.descripcion_corta || '',
          isbn_libro: attrs.isbn_libro || attrs.ISBN_LIBRO || '',
          precio: attrs.precio ? String(attrs.precio) : '',
          precio_oferta: attrs.precio_oferta ? String(attrs.precio_oferta) : '',
          sale_quantity: attrs.sale_quantity ? String(attrs.sale_quantity) : '',
          sold_items: attrs.sold_items ? String(attrs.sold_items) : '0',
          tax_status: attrs.tax_status || 'taxable',
          tax_class: attrs.tax_class || 'standard',
          sku: attrs.sku || attrs.SKU || attrs.isbn_libro || '',
          stock_quantity: attrs.stock_quantity ? String(attrs.stock_quantity) : '0',
          manage_stock: attrs.manage_stock !== false,
          stock_status: attrs.stock_status || 'instock',
          sold_individually: attrs.sold_individually || false,
          type: attrs.type || 'simple',
          weight: attrs.weight ? String(attrs.weight) : '',
          length: attrs.length ? String(attrs.length) : '',
          width: attrs.width ? String(attrs.width) : '',
          height: attrs.height ? String(attrs.height) : '',
          shipping_class: attrs.shipping_class || '',
          virtual: attrs.virtual || false,
          downloadable: attrs.downloadable || false,
          reviews_allowed: attrs.reviews_allowed !== false,
          menu_order: attrs.menu_order ? String(attrs.menu_order) : '0',
          purchase_note: attrs.purchase_note || '',
          upsell_ids: attrs.upsell_ids || '',
          cross_sell_ids: attrs.cross_sell_ids || '',
          portada_libro: null,
        })
      } catch (err: any) {
        console.error('[EditProduct] Error al cargar producto:', err)
        setError(err.message || 'Error al cargar el producto')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchProducto()
  }, [productId])

  // ⚡ OPTIMIZACIÓN: Función memoizada para actualizar campos individuales
  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev) => {
      // Solo actualizar si el valor realmente cambió
      if (prev[field as keyof typeof prev] === value) {
        return prev
      }
      return { ...prev, [field]: value }
    })
  }, [])

  // ⚡ OPTIMIZACIÓN: Función memoizada para actualizar múltiples campos
  const updateFields = useCallback((updates: Partial<typeof formData>) => {
    setFormData((prev) => {
      // Verificar si hay cambios reales
      const hasChanges = Object.keys(updates).some(
        (key) => prev[key as keyof typeof prev] !== updates[key as keyof typeof updates]
      )
      if (!hasChanges) return prev
      return { ...prev, ...updates }
    })
  }, [])

  // ⚡ OPTIMIZACIÓN: Memoizar el contenido de las pestañas
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab formData={formData} updateField={updateField} />
      case 'inventario':
        return <InventarioTab formData={formData} updateField={updateField} />
      case 'envio':
        return <EnvioTab formData={formData} updateField={updateField} />
      case 'vinculados':
        return <VinculadosTab formData={formData} updateField={updateField} />
      case 'atributos':
        return <AtributosTab formData={formData} updateField={updateField} />
      case 'avanzado':
        return <AvanzadoTab formData={formData} updateField={updateField} />
      default:
        return <GeneralTab formData={formData} updateField={updateField} />
    }
  }, [activeTab, formData, updateField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!productId) {
        throw new Error('ID de producto no válido')
      }

      // Validar nombre requerido
      if (!formData.nombre_libro.trim()) {
        setError('El nombre del producto es obligatorio')
        setLoading(false)
        return
      }

      // Validar precio
      if (!formData.precio || parseFloat(formData.precio) <= 0) {
        setError('El precio es obligatorio y debe ser mayor a 0')
        setLoading(false)
        return
      }

      // Subir imagen primero si hay una nueva
      let portadaLibroId: number | null = null
      let portadaLibroUrl: string | null = null
      if (formData.portada_libro) {
        console.log('[EditProduct] Subiendo imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.portada_libro)
        
        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen')
        }

        const uploadData = await uploadResponse.json()
        portadaLibroId = uploadData.data?.id || null
        portadaLibroUrl = uploadData.data?.url || null
        console.log('[EditProduct] Imagen subida:', { id: portadaLibroId, url: portadaLibroUrl })
      }

      // Construir payload - Solo campos que Strapi acepta
      // ⚠️ IMPORTANTE: NO incluir campos que no están en el schema de Strapi:
      // - type, virtual, downloadable, reviews_allowed, menu_order, purchase_note, sku
      // Estos campos se manejan en Strapi a través de raw_woo_data en los lifecycles
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion?.trim() || '',
        descripcion_corta: formData.descripcion_corta?.trim() || '', // ⚠️ CRÍTICO: Descripción corta
        isbn_libro: formData.isbn_libro?.trim() || '',
        precio: formData.precio,
        precio_oferta: formData.precio_oferta || '',
        stock_quantity: formData.stock_quantity || '0',
        manage_stock: formData.manage_stock,
        stock_status: formData.stock_status,
        sold_individually: formData.sold_individually,
        // type: formData.type, // ❌ NO se envía - no está en schema de Strapi
        weight: formData.weight || '',
        length: formData.length || '',
        width: formData.width || '',
        height: formData.height || '',
        shipping_class: formData.shipping_class || '',
        // virtual: formData.virtual, // ❌ NO se envía - no está en schema de Strapi
        // downloadable: formData.downloadable, // ❌ NO se envía - no está en schema de Strapi
        // reviews_allowed: formData.reviews_allowed, // ❌ NO se envía - no está en schema de Strapi
        // menu_order: formData.menu_order || '0', // ❌ NO se envía - no está en schema de Strapi
        // sku: formData.sku || formData.isbn_libro || '', // ❌ NO se envía - se usa isbn_libro
        // purchase_note: formData.purchase_note || '', // ❌ NO se envía - no está en schema de Strapi
      }

      // ⚠️ IMPORTANTE: raw_woo_data NO se envía a Strapi porque no está en el schema
      // Strapi debe construir raw_woo_data en sus lifecycles basándose en los campos individuales
      // Solo enviamos los campos que Strapi acepta (precio, descripcion, etc.)
      // El raw_woo_data se construye en Strapi automáticamente cuando se actualiza el producto
      
      console.log('[EditProduct] 📦 Datos preparados para Strapi (raw_woo_data se construirá en Strapi):', JSON.stringify(dataToSend, null, 2))

      // Agregar imagen si hay una nueva
      if (portadaLibroUrl) {
        dataToSend.portada_libro = portadaLibroUrl
        dataToSend.portada_libro_id = portadaLibroId
      } else if (portadaLibroId) {
        dataToSend.portada_libro = portadaLibroId
      }

      // Agregar canales basados en plataformas seleccionadas
      if (selectedPlatforms.length > 0) {
        // Obtener IDs de canales desde Strapi
        try {
          const canalesResponse = await fetch('/api/tienda/canales')
          const canalesData = await canalesResponse.json()
          
          if (canalesData.success && canalesData.data) {
            const canalesIds: string[] = []
            
            selectedPlatforms.forEach((platform) => {
              const canal = canalesData.data.find((c: any) => {
                const attrs = c.attributes || c
                const key = attrs.key || attrs.nombre?.toLowerCase()
                return (
                  (platform === 'woo_moraleja' && (key === 'moraleja' || key === 'woo_moraleja')) ||
                  (platform === 'woo_escolar' && (key === 'escolar' || key === 'woo_escolar'))
                )
              })
              
              if (canal) {
                const docId = canal.documentId || canal.id
                if (docId) canalesIds.push(String(docId))
              }
            })
            
            if (canalesIds.length > 0) {
              dataToSend.canales = canalesIds
            }
          }
        } catch (err) {
          console.warn('[EditProduct] No se pudieron obtener canales, se asignarán automáticamente')
        }
      }

      console.log('[EditProduct] Enviando datos:', dataToSend)

      const response = await fetch(`/api/tienda/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error al actualizar producto' }))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResponseData(data)

      if (data.success) {
        setSuccess(true)
        setError(null)
        setTimeout(() => {
          window.location.href = '/products'
        }, 1500)
      } else {
        setError(data.error || 'Error al actualizar producto')
        setSuccess(false)
      }
    } catch (err: any) {
      console.error('[EditProduct] Error:', err)
      setError(err.message || 'Error de conexión al actualizar producto')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  // Estado de carga inicial (precarga de datos)
  if (initialLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar producto" subtitle="Ecommerce" />
        <Alert variant="info">Cargando producto...</Alert>
      </Container>
    )
  }

  // Error al cargar producto inicial
  if (error && !formData.nombre_libro) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Editar producto" subtitle="Ecommerce" />
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Editar producto" subtitle="Ecommerce" />

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            ✅ Producto actualizado exitosamente. Redirigiendo...
          </Alert>
        )}

        {/* Nombre del producto - Parte superior como WordPress */}
        <Card className="mb-3">
          <CardBody>
            <FormGroup>
              <FormLabel className="fw-bold">Nombre del producto</FormLabel>
              <FormControl
                type="text"
                placeholder="Ingresa el nombre del producto"
                value={formData.nombre_libro}
                onChange={(e) => updateField('nombre_libro', e.target.value)}
                required
                className="fs-5"
              />
            </FormGroup>
          </CardBody>
        </Card>

        {/* Selector de plataforma */}
        <PlatformSelector
          selectedPlatforms={selectedPlatforms}
          onChange={setSelectedPlatforms}
        />

        {/* Descripción del producto - Editor de texto rico */}
        <Card className="mb-3">
          <CardBody>
            <FormGroup>
              <FormLabel className="fw-bold mb-3">Descripción del producto</FormLabel>
              <div id="descripcion-editor" style={{ minHeight: '200px' }}>
                <QuillClient
                  theme="snow"
                  modules={quillModules}
                  value={formData.descripcion || ''}
                  onChange={(value: string) => updateField('descripcion', value)}
                  placeholder="Describe el producto..."
                />
              </div>
            </FormGroup>
          </CardBody>
        </Card>

        {/* Descripción corta - Editor de texto rico */}
        <Card className="mb-3">
          <CardBody>
            <FormGroup>
              <FormLabel className="fw-bold mb-3">Descripción corta del producto</FormLabel>
              <div id="descripcion-corta-editor" style={{ minHeight: '150px' }}>
                <QuillClient
                  theme="snow"
                  modules={quillModulesShort}
                  value={formData.descripcion_corta || ''}
                  onChange={(value: string) => updateField('descripcion_corta', value)}
                  placeholder="Breve descripción que aparecerá en listados y carrito..."
                />
              </div>
            </FormGroup>
          </CardBody>
        </Card>

        {/* Imagen del producto */}
        <ProductImage
          onImageChange={(file) => updateField('portada_libro', file)}
          currentImageUrl={currentImageUrl}
        />

        {/* Pestañas de datos del producto */}
        <div className="mb-3">
          <div className="bg-white border rounded p-3 mb-2">
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Datos del producto</h5>
              <div className="d-flex align-items-center gap-2">
                <FormSelect
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="simple">Producto simple</option>
                  <option value="grouped">Producto agrupado</option>
                  <option value="external">Producto externo</option>
                  <option value="variable">Producto variable</option>
                </FormSelect>
                <FormGroup className="mb-0">
                  <input
                    type="checkbox"
                    id="virtual"
                    checked={formData.virtual}
                    onChange={(e) => updateField('virtual', e.target.checked)}
                    className="form-check-input me-2"
                  />
                  <label htmlFor="virtual" className="form-check-label me-3">Virtual</label>
                </FormGroup>
                <FormGroup className="mb-0">
                  <input
                    type="checkbox"
                    id="downloadable"
                    checked={formData.downloadable}
                    onChange={(e) => updateField('downloadable', e.target.checked)}
                    className="form-check-input me-2"
                  />
                  <label htmlFor="downloadable" className="form-check-label">Descargable</label>
                </FormGroup>
              </div>
            </div>
          </div>

          <ProductTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {tabContent}
          </ProductTabs>
        </div>

        {/* Botones de acción */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => window.history.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              type="button"
              disabled={loading}
              onClick={() => {
                // Guardar como borrador (implementar si es necesario)
                console.log('Guardar como borrador')
              }}
            >
              Guardar borrador
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </form>
    </Container>
  )
}
