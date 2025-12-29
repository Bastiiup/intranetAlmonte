'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import ProductImage from './components/ProductImage'
import ProductTabs, { TabType } from './components/ProductTabs'
import PlatformSelector from './components/PlatformSelector'
import GeneralTab from './components/tabs/GeneralTab'
import InventarioTab from './components/tabs/InventarioTab'
import EnvioTab from './components/tabs/EnvioTab'
import VinculadosTab from './components/tabs/VinculadosTab'
import AtributosTab from './components/tabs/AtributosTab'
import AvanzadoTab from './components/tabs/AvanzadoTab'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Alert, Button, Card, CardBody, Col, Container, FormControl, FormGroup, FormLabel, FormSelect, Row } from 'react-bootstrap'

export default function AddProductPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [responseData, setResponseData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  
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

      // Subir imagen primero si hay una
      let portadaLibroId: number | null = null
      let portadaLibroUrl: string | null = null
      if (formData.portada_libro) {
        console.log('[AddProduct] Subiendo imagen...')
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
        console.log('[AddProduct] Imagen subida:', { id: portadaLibroId, url: portadaLibroUrl })
      }

      // Construir payload - Campos básicos que Strapi acepta
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion?.trim() || '',
        // descripcion_corta: NO se envía - no está en schema de Strapi
        // Se usa solo en raw_woo_data para WooCommerce
        subtitulo_libro: formData.descripcion_corta?.trim() || formData.descripcion?.substring(0, 255) || '', // ✅ Para Strapi (descripción corta)
        isbn_libro: formData.isbn_libro?.trim() || '',
        precio: formData.precio,
        precio_oferta: formData.precio_oferta || '',
        stock_quantity: formData.stock_quantity || '0',
        // Campos WooCommerce que NO están en schema de Strapi:
        // manage_stock, stock_status, sold_individually
        // type, virtual, downloadable, reviews_allowed, menu_order, purchase_note, sku
        // weight, length, width, height, shipping_class
        // Estos se manejan en Strapi a través de raw_woo_data en los lifecycles
      }

      // Agregar imagen
      let imagenUrlFinal: string | null = null
      if (portadaLibroUrl) {
        dataToSend.portada_libro = portadaLibroUrl
        dataToSend.portada_libro_id = portadaLibroId
        // Construir URL completa de la imagen
        const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
        imagenUrlFinal = portadaLibroUrl.startsWith('http') 
          ? portadaLibroUrl 
          : `${baseUrl}${portadaLibroUrl.startsWith('/') ? portadaLibroUrl : `/${portadaLibroUrl}`}`
      } else if (portadaLibroId) {
        dataToSend.portada_libro = portadaLibroId
      }

      // ⚠️ IMPORTANTE: Construir rawWooData con formato correcto para WooCommerce
      // Este objeto se enviará como campo adicional para que Strapi lo use en sus lifecycles
      // Si Strapi rechaza este campo, se construirá en los lifecycles de Strapi
      
      // Helper 1: Convierte texto plano o HTML a HTML válido con párrafos
      // Quill puede enviar HTML, pero esta función asegura formato válido
      const textoAHTML = (texto: string): string => {
        if (!texto || texto.trim() === '') return ''
        
        const textoTrimmed = texto.trim()
        
        // Si ya es HTML válido (tiene etiquetas <p>, <div>, etc.), usar directamente
        if (textoTrimmed.includes('<') && textoTrimmed.includes('>')) {
          // Verificar que tenga al menos un <p>, <div>, <h>, <ul>, <ol>, <li>
          if (textoTrimmed.match(/<[p|div|h\d|ul|ol|li|strong|em|b|i][^>]*>/i)) {
            // Ya es HTML válido, retornar tal cual
            return textoTrimmed
          }
          // Si tiene HTML pero no párrafos válidos, limpiar y envolver en <p>
          const textoLimpio = textoTrimmed.replace(/<[^>]+>/g, '').trim()
          return textoLimpio ? `<p>${textoLimpio}</p>` : ''
        }
        
        // Si es texto plano, convertir a HTML
        // Convertir saltos de línea dobles en párrafos
        const parrafos = textoTrimmed
          .split(/\n\n+/)
          .map(parrafo => parrafo.trim())
          .filter(parrafo => parrafo.length > 0)
        
        if (parrafos.length === 0) {
          return `<p>${textoTrimmed}</p>`
        }
        
        return parrafos
          .map(parrafo => `<p>${parrafo.replace(/\n/g, '<br>')}</p>`)
          .join('')
      }
      
      // Helper 2: Genera descripción CORTA limitada a X caracteres de TEXTO (no HTML)
      const generarDescripcionCorta = (texto: string, maxCaracteres: number = 150): string => {
        if (!texto || texto.trim() === '') return ''
        
        // Primero extraer solo el texto (sin HTML)
        const textoLimpio = texto
          .replace(/<[^>]+>/g, ' ')  // Remover todas las etiquetas HTML
          .replace(/\s+/g, ' ')      // Normalizar espacios múltiples
          .trim()
        
        if (textoLimpio.length === 0) return ''
        
        // Limitar a X caracteres de TEXTO
        let textoCorto: string
        if (textoLimpio.length > maxCaracteres) {
          // Cortar en la última palabra completa antes del límite
          textoCorto = textoLimpio.substring(0, maxCaracteres)
          const ultimoEspacio = textoCorto.lastIndexOf(' ')
          if (ultimoEspacio > 0 && ultimoEspacio > maxCaracteres * 0.7) {
            // Si encontramos un espacio razonablemente cerca del final, cortar ahí
            textoCorto = textoCorto.substring(0, ultimoEspacio)
          }
          textoCorto = textoCorto.trim() + '...'
        } else {
          textoCorto = textoLimpio
        }
        
        // Envolver en <p> para formato HTML válido
        return `<p>${textoCorto}</p>`
      }
      
      const rawWooData: any = {
        name: formData.nombre_libro.trim(),
        type: 'simple',
        status: 'publish',
        
        // ✅ DESCRIPCIÓN COMPLETA (HTML) - CRÍTICO para WooCommerce
        // Procesar descripción completa con función helper
        description: formData.descripcion?.trim()
          ? textoAHTML(formData.descripcion)
          : '<p>Sin descripción</p>',
        
        // ✅ DESCRIPCIÓN CORTA (HTML) - CRÍTICO para WooCommerce
        // Si hay descripción corta específica, usarla; si no, generar desde descripción completa
        // ⚠️ IMPORTANTE: La descripción corta debe ser DIFERENTE y limitada a 150 caracteres
        short_description: formData.descripcion_corta?.trim()
          ? textoAHTML(formData.descripcion_corta)  // Si hay descripción corta específica, usarla
          : (formData.descripcion?.trim() 
              ? generarDescripcionCorta(formData.descripcion, 150)  // Generar desde descripción completa (limitada)
              : '<p>Sin descripción</p>'),
        
        // Precio
        regular_price: formData.precio ? parseFloat(formData.precio).toFixed(2) : '0.00',
        sale_price: formData.precio_oferta ? parseFloat(formData.precio_oferta).toFixed(2) : '',
        
        // Stock
        manage_stock: true,
        stock_quantity: parseInt(formData.stock_quantity || '0'),
        stock_status: parseInt(formData.stock_quantity || '0') > 0 ? 'instock' : 'outofstock',
        backorders: 'no',
        
        // ✅ IMÁGENES (array de objetos con formato WooCommerce)
        images: imagenUrlFinal ? [
          {
            src: imagenUrlFinal,
            name: formData.nombre_libro.trim(),
            alt: formData.nombre_libro.trim()
          }
        ] : [],
        
        // SKU
        sku: formData.isbn_libro?.trim() || '',
      }

      // ⚠️ IMPORTANTE: raw_woo_data NO se envía directamente a Strapi porque no está en el schema
      // Strapi debe construir raw_woo_data en sus lifecycles basándose en los campos individuales
      // Los campos individuales (descripcion, subtitulo_libro, precio, etc.) ya están en dataToSend
      // Strapi usará estos campos para construir raw_woo_data en afterCreate/afterUpdate
      
      // NOTA: Si necesitas que Strapi use raw_woo_data directamente, debes agregarlo al schema de Strapi
      // Por ahora, NO lo incluimos para evitar el error "Invalid key raw_woo_data"
      // dataToSend.raw_woo_data = rawWooData  // ❌ Comentado - Strapi lo rechaza
      
      // Debug: Verificar que las descripciones son diferentes
      const descripcionCompletaTexto = rawWooData.description.replace(/<[^>]+>/g, '').trim()
      const descripcionCortaTexto = rawWooData.short_description.replace(/<[^>]+>/g, '').trim()
      
      console.log('[AddProduct] 📦 Datos preparados para Strapi:', JSON.stringify(dataToSend, null, 2))
      console.log('[AddProduct] 🖼️ raw_woo_data construido:', JSON.stringify(rawWooData, null, 2))
      console.log('[AddProduct] 📝 Descripción completa (HTML):', rawWooData.description)
      console.log('[AddProduct] 📝 Descripción corta (HTML):', rawWooData.short_description)
      console.log('[AddProduct] 📝 Descripción completa (TEXTO):', descripcionCompletaTexto.substring(0, 100) + '...')
      console.log('[AddProduct] 📝 Descripción corta (TEXTO):', descripcionCortaTexto)
      console.log('[AddProduct] 🔍 Verificación:', {
        tieneDescripcion: !!rawWooData.description && rawWooData.description.length > 0,
        tieneDescripcionCorta: !!rawWooData.short_description && rawWooData.short_description.length > 0,
        longitudDescripcion: descripcionCompletaTexto.length,
        longitudDescripcionCorta: descripcionCortaTexto.length,
        sonDiferentes: descripcionCompletaTexto !== descripcionCortaTexto,
        descripcionCortaEsMasCorta: descripcionCortaTexto.length < descripcionCompletaTexto.length
      })

      // Agregar canales basados en plataformas seleccionadas
      if (selectedPlatforms.length > 0) {
        // Obtener IDs de canales desde Strapi
        try {
          const canalesResponse = await fetch('/api/tienda/canales', {
            // Agregar timeout para evitar esperar demasiado
            signal: AbortSignal.timeout(5000) // 5 segundos timeout
          })
          
          if (!canalesResponse.ok) {
            throw new Error(`Error ${canalesResponse.status}: ${canalesResponse.statusText}`)
          }
          
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
              console.log('[AddProduct] ✅ Canales obtenidos exitosamente:', canalesIds)
            }
          }
        } catch (err: any) {
          // Si hay error al obtener canales (502, timeout, etc.), usar valores por defecto
          console.warn('[AddProduct] ⚠️ No se pudieron obtener canales desde Strapi:', err.message)
          console.warn('[AddProduct] ⚠️ Usando canales por defecto basados en plataformas seleccionadas')
          
          // Usar IDs por defecto conocidos (Moraleja=1, Escolar=2) si no se pueden obtener
          const canalesIds: string[] = []
          if (selectedPlatforms.includes('woo_moraleja')) {
            canalesIds.push('1') // ID por defecto de Moraleja
          }
          if (selectedPlatforms.includes('woo_escolar')) {
            canalesIds.push('2') // ID por defecto de Escolar
          }
          
          if (canalesIds.length > 0) {
            dataToSend.canales = canalesIds
            console.log('[AddProduct] ✅ Usando canales por defecto:', canalesIds)
          } else {
            console.warn('[AddProduct] ⚠️ No se asignaron canales. El producto se creará sin canales.')
          }
        }
      }

      console.log('[AddProduct] Enviando datos:', dataToSend)

      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error al crear producto' }))
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
        setError(data.error || 'Error al crear producto')
        setSuccess(false)
      }
    } catch (err: any) {
      console.error('[AddProduct] Error:', err)
      setError(err.message || 'Error de conexión al crear producto')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }


  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar nuevo producto" subtitle="Ecommerce" />

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            ✅ Producto creado exitosamente. Redirigiendo...
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

        {/* Descripción del producto */}
        <Card className="mb-3">
          <CardBody>
            <FormGroup>
              <FormLabel className="fw-bold">Descripción del producto</FormLabel>
              <FormControl
                as="textarea"
                rows={8}
                placeholder="Describe el producto..."
                value={formData.descripcion}
                onChange={(e) => updateField('descripcion', e.target.value)}
              />
            </FormGroup>
          </CardBody>
        </Card>

        {/* Descripción corta */}
        <Card className="mb-3">
          <CardBody>
            <FormGroup>
              <FormLabel className="fw-bold">Descripción corta del producto</FormLabel>
              <FormControl
                as="textarea"
                rows={4}
                placeholder="Breve descripción que aparecerá en listados y carrito..."
                value={formData.descripcion_corta}
                onChange={(e) => updateField('descripcion_corta', e.target.value)}
              />
            </FormGroup>
          </CardBody>
        </Card>

        {/* Imagen del producto */}
        <ProductImage
          onImageChange={(file) => updateField('portada_libro', file)}
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

