'use client'

import { useState, useCallback } from 'react'
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

      // Construir payload
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion?.trim() || '',
        isbn_libro: formData.isbn_libro?.trim() || '',
        precio: formData.precio,
        precio_oferta: formData.precio_oferta || '',
        stock_quantity: formData.stock_quantity || '0',
        manage_stock: formData.manage_stock,
        stock_status: formData.stock_status,
        sold_individually: formData.sold_individually,
        type: formData.type,
        weight: formData.weight || '',
        length: formData.length || '',
        width: formData.width || '',
        height: formData.height || '',
        virtual: formData.virtual,
        downloadable: formData.downloadable,
        reviews_allowed: formData.reviews_allowed,
        menu_order: formData.menu_order || '0',
        sku: formData.sku || formData.isbn_libro || '',
      }

      // Agregar imagen
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
          console.warn('[AddProduct] No se pudieron obtener canales, se asignarán automáticamente')
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab formData={formData} setFormData={setFormData} />
      case 'inventario':
        return <InventarioTab formData={formData} setFormData={setFormData} />
      case 'envio':
        return <EnvioTab formData={formData} setFormData={setFormData} />
      case 'vinculados':
        return <VinculadosTab formData={formData} setFormData={setFormData} />
      case 'atributos':
        return <AtributosTab formData={formData} setFormData={setFormData} />
      case 'avanzado':
        return <AvanzadoTab formData={formData} setFormData={setFormData} />
      default:
        return <GeneralTab formData={formData} setFormData={setFormData} />
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
                onChange={(e) => setFormData({ ...formData, nombre_libro: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, descripcion_corta: e.target.value })}
              />
            </FormGroup>
          </CardBody>
        </Card>

        {/* Imagen del producto */}
        <ProductImage
          onImageChange={(file) => setFormData({ ...formData, portada_libro: file })}
        />

        {/* Pestañas de datos del producto */}
        <div className="mb-3">
          <div className="bg-white border rounded p-3 mb-2">
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Datos del producto</h5>
              <div className="d-flex align-items-center gap-2">
                <FormSelect
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
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
                    onChange={(e) => setFormData({ ...formData, virtual: e.target.checked })}
                    className="form-check-input me-2"
                  />
                  <label htmlFor="virtual" className="form-check-label me-3">Virtual</label>
                </FormGroup>
                <FormGroup className="mb-0">
                  <input
                    type="checkbox"
                    id="downloadable"
                    checked={formData.downloadable}
                    onChange={(e) => setFormData({ ...formData, downloadable: e.target.checked })}
                    className="form-check-input me-2"
                  />
                  <label htmlFor="downloadable" className="form-check-label">Descargable</label>
                </FormGroup>
              </div>
            </div>
          </div>

          <ProductTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {renderTabContent()}
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

