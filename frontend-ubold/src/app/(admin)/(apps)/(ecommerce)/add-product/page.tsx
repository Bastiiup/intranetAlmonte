'use client'

import { useState, useCallback } from 'react'
import { RelationSelector } from './components/RelationSelector'
import ProductImage from './components/ProductImage'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Alert, Button, Card, CardBody, CardHeader, Col, Container, FormCheck, FormControl, FormGroup, FormLabel, FormSelect, Row } from 'react-bootstrap'

export default function AddProductPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [responseData, setResponseData] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    // === BÁSICOS ===
    isbn_libro: '',
    nombre_libro: '',
    subtitulo_libro: '',
    descripcion: '',
    
    // === WOOCOMMERCE: PRECIO ===
    precio: '',
    precio_oferta: '',
    
    // === WOOCOMMERCE: INVENTARIO ===
    stock_quantity: '',
    manage_stock: true,
    stock_status: 'instock' as 'instock' | 'outofstock' | 'onbackorder',
    backorders: 'no' as 'no' | 'notify' | 'yes',
    
    // === WOOCOMMERCE: TIPO DE PRODUCTO ===
    type: 'simple' as 'simple' | 'grouped' | 'external' | 'variable',
    
    // === WOOCOMMERCE: CATEGORÍAS Y TAGS ===
    woocommerce_categories: [] as number[],
    woocommerce_tags: [] as number[],
    
    // === WOOCOMMERCE: PESO Y DIMENSIONES ===
    weight: '',
    length: '',
    width: '',
    height: '',
    
    // === WOOCOMMERCE: OPCIONES ADICIONALES ===
    virtual: false,
    downloadable: false,
    featured: false,
    sold_individually: false,
    reviews_allowed: true,
    catalog_visibility: 'visible' as 'visible' | 'catalog' | 'search' | 'hidden',
    
    // === RELACIONES SIMPLES (documentId) ===
    obra: '',
    autor_relacion: '',
    editorial: '',
    sello: '',
    coleccion: '',
    
    // === RELACIONES MÚLTIPLES (array de documentIds) ===
    canales: [] as string[],
    marcas: [] as string[],
    etiquetas: [] as string[],
    categorias_producto: [] as string[],
    
    // === IDs NUMÉRICOS OPCIONALES ===
    id_autor: '',
    id_editorial: '',
    id_sello: '',
    id_coleccion: '',
    id_obra: '',
    
    // === INFORMACIÓN DE EDICIÓN ===
    numero_edicion: '',
    agno_edicion: '',
    idioma: '',
    tipo_libro: '',
    estado_edicion: 'Vigente',
    
    // === MEDIA ===
    portada_libro: null as File | null,
  })

  // Memoizar la función onImageChange para evitar loops infinitos
  const handleImageChange = useCallback((file: File | null) => {
    setFormData(prev => ({ ...prev, portada_libro: file }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar nombre requerido
      if (!formData.nombre_libro.trim()) {
        setError('El nombre del libro es obligatorio')
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
          credentials: 'include', // Incluir cookies
          body: uploadFormData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success) {
          if (uploadResult.id) {
            portadaLibroId = uploadResult.id
            console.log('[AddProduct] Imagen subida con ID:', portadaLibroId)
          }
          if (uploadResult.url) {
            portadaLibroUrl = uploadResult.url
            console.log('[AddProduct] URL de imagen obtenida:', portadaLibroUrl)
          }
        } else {
          console.warn('[AddProduct] No se pudo subir la imagen:', uploadResult.error)
        }
      }

      // Preparar datos (solo enviar campos con valor)
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim()
      }
      
      // === CAMPOS BÁSICOS ===
      if (formData.isbn_libro?.trim()) dataToSend.isbn_libro = formData.isbn_libro.trim()
      if (formData.subtitulo_libro?.trim()) dataToSend.subtitulo_libro = formData.subtitulo_libro.trim()
      if (formData.descripcion?.trim()) dataToSend.descripcion = formData.descripcion.trim()
      
      // === WOOCOMMERCE: PRECIO ===
      if (formData.precio?.trim()) dataToSend.precio = parseFloat(formData.precio) || 0
      if (formData.precio_oferta?.trim()) dataToSend.precio_oferta = parseFloat(formData.precio_oferta) || 0
      
      // === WOOCOMMERCE: INVENTARIO ===
      dataToSend.manage_stock = formData.manage_stock
      if (formData.stock_quantity?.trim()) {
        dataToSend.stock_quantity = parseInt(formData.stock_quantity) || 0
      } else {
        dataToSend.stock_quantity = 0
      }
      dataToSend.stock_status = formData.stock_status
      dataToSend.backorders = formData.backorders
      
      // === WOOCOMMERCE: TIPO DE PRODUCTO ===
      dataToSend.type = formData.type
      
      // === WOOCOMMERCE: CATEGORÍAS Y TAGS ===
      if (formData.woocommerce_categories.length > 0) {
        dataToSend.woocommerce_categories = formData.woocommerce_categories
      }
      if (formData.woocommerce_tags.length > 0) {
        dataToSend.woocommerce_tags = formData.woocommerce_tags
      }
      
      // === WOOCOMMERCE: PESO Y DIMENSIONES ===
      if (formData.weight?.trim()) dataToSend.weight = formData.weight.trim()
      if (formData.length?.trim()) dataToSend.length = formData.length.trim()
      if (formData.width?.trim()) dataToSend.width = formData.width.trim()
      if (formData.height?.trim()) dataToSend.height = formData.height.trim()
      
      // === WOOCOMMERCE: OPCIONES ADICIONALES ===
      dataToSend.virtual = formData.virtual
      dataToSend.downloadable = formData.downloadable
      dataToSend.featured = formData.featured
      dataToSend.sold_individually = formData.sold_individually
      dataToSend.reviews_allowed = formData.reviews_allowed
      dataToSend.catalog_visibility = formData.catalog_visibility
      // Enviar URL de imagen si está disponible (para WooCommerce), o ID para Strapi
      if (portadaLibroUrl) {
        dataToSend.portada_libro = portadaLibroUrl  // URL completa para WooCommerce
        dataToSend.portada_libro_id = portadaLibroId  // ID para Strapi
      } else if (portadaLibroId) {
        dataToSend.portada_libro = portadaLibroId  // Fallback: solo ID
      }
      
      // === RELACIONES SIMPLES (enviar documentId si hay valor) ===
      if (formData.obra) dataToSend.obra = formData.obra
      if (formData.autor_relacion) dataToSend.autor_relacion = formData.autor_relacion
      if (formData.editorial) dataToSend.editorial = formData.editorial
      if (formData.sello) dataToSend.sello = formData.sello
      if (formData.coleccion) dataToSend.coleccion = formData.coleccion
      
      // === RELACIONES MÚLTIPLES (enviar array si tiene elementos) ===
      // CRÍTICO: Los canales son necesarios para sincronizar con WordPress
      if (formData.canales.length > 0) {
        dataToSend.canales = formData.canales
      } else {
        console.warn('[AddProduct] ⚠️ ADVERTENCIA: No se han seleccionado canales. El producto NO se sincronizará con WordPress hasta que se asignen canales.')
      }
      if (formData.marcas.length > 0) dataToSend.marcas = formData.marcas
      if (formData.etiquetas.length > 0) dataToSend.etiquetas = formData.etiquetas
      if (formData.categorias_producto.length > 0) dataToSend.categorias_producto = formData.categorias_producto
      
      // === ESTADO DE PUBLICACIÓN ===
      // Nota: Por defecto se crea como "Pendiente" en el backend
      // Si se quiere crear directamente como "Publicado", descomentar:
      // dataToSend.estado_publicacion = 'Publicado'
      
      // ════════════════════════════════════════════════════════════════
      // LOGGING DETALLADO DEL PAYLOAD
      // ════════════════════════════════════════════════════════════════
      console.log('═══════════════════════════════════════════════════════')
      console.log('[AddProduct] 📦 Payload que se envía a Strapi:')
      console.log(JSON.stringify(dataToSend, null, 2))
      console.log('[AddProduct] 🔍 Campos críticos:')
      console.log('  - Canales incluidos:', dataToSend.canales || '❌ NO HAY CANALES (el producto NO se sincronizará con WordPress)')
      console.log('  - Estado de publicación:', dataToSend.estado_publicacion || 'Pendiente (por defecto)')
      console.log('  - Nombre:', dataToSend.nombre_libro)
      console.log('  - ISBN:', dataToSend.isbn_libro || 'No especificado')
      console.log('═══════════════════════════════════════════════════════')
      
      // === IDS NUMÉRICOS ===
      if (formData.id_autor) dataToSend.id_autor = parseInt(formData.id_autor)
      if (formData.id_editorial) dataToSend.id_editorial = parseInt(formData.id_editorial)
      if (formData.id_sello) dataToSend.id_sello = parseInt(formData.id_sello)
      if (formData.id_coleccion) dataToSend.id_coleccion = parseInt(formData.id_coleccion)
      if (formData.id_obra) dataToSend.id_obra = parseInt(formData.id_obra)
      
      // === EDICIÓN (solo enviar si tienen valor) ===
      if (formData.numero_edicion) dataToSend.numero_edicion = parseInt(formData.numero_edicion)
      if (formData.agno_edicion) dataToSend.agno_edicion = parseInt(formData.agno_edicion)
      if (formData.idioma && formData.idioma !== '') dataToSend.idioma = formData.idioma
      if (formData.tipo_libro && formData.tipo_libro !== '') dataToSend.tipo_libro = formData.tipo_libro
      if (formData.estado_edicion && formData.estado_edicion !== '') dataToSend.estado_edicion = formData.estado_edicion
      
      console.log('[AddProduct] Enviando datos:', dataToSend)

      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        credentials: 'include', // Incluir cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      // Verificar que la respuesta sea exitosa
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error al crear producto' }))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResponseData(data) // Guardar datos de respuesta para mostrar en UI
      
      // ════════════════════════════════════════════════════════════════
      // LOGGING DETALLADO DE LA RESPUESTA
      // ════════════════════════════════════════════════════════════════
      console.log('═══════════════════════════════════════════════════════')
      console.log('[AddProduct] ✅ Respuesta de Strapi:')
      console.log('  - Status:', response.status)
      console.log('  - Success:', data.success)
      if (data.data) {
        const producto = data.data.strapi?.data || data.data.strapi || data.data
        const attrs = producto?.attributes || producto || {}
        console.log('  - Libro creado ID:', producto?.id || producto?.documentId)
        console.log('  - Libro creado DocumentId:', producto?.documentId || producto?.id)
        console.log('  - Nombre:', attrs.nombre_libro || 'Sin nombre')
        console.log('  - Estado:', attrs.estado_publicacion || 'Sin estado')
        console.log('  - Canales del libro:', attrs.canales?.data?.length || attrs.canales?.length || 0, 'canales')
        if (attrs.canales?.data) {
          console.log('  - Canales asignados:', attrs.canales.data.map((c: any) => c.attributes?.nombre || c.nombre || c.id).join(', '))
        }
      }
      if (data.error) {
        console.error('  - Error:', data.error)
      }
      console.log('═══════════════════════════════════════════════════════')

      if (data.success) {
        setSuccess(true)
        setError(null)
        
        // Mostrar mensaje especial si se regeneró el ISBN (sin alert bloqueante)
        if (data.isbnRegenerado) {
          // El mensaje se mostrará en el Alert de éxito
          console.log(`[AddProduct] ISBN regenerado: "${data.isbnOriginal}" → "${data.isbnNuevo}"`)
        }
        
        // Redirigir después de un breve delay (reducido para mejor UX)
        setTimeout(() => {
          window.location.href = '/products'
        }, 1000)
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
      <PageBreadcrumb title="Agregar Producto" subtitle="Ecommerce" />

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
            <br />
            <small className="text-muted">Puedes cerrar esta página y volver a la lista de productos.</small>
          </Alert>
        )}
        
        {success && (
          <Alert variant="success">
            ✅ Producto creado exitosamente. Redirigiendo...
            {responseData?.isbnRegenerado && (
              <>
                <br />
                <small className="text-muted">
                  <strong>Nota:</strong> El ISBN "{responseData.isbnOriginal}" ya existía, se generó uno nuevo automáticamente: "{responseData.isbnNuevo}"
                </small>
              </>
            )}
            <br />
            <small className="text-muted">Si no se redirige automáticamente, <a href="/products" className="alert-link">haz clic aquí</a>.</small>
          </Alert>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">Información Básica</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    ISBN <span className="text-muted">(se genera automático si se deja vacío)</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    placeholder="Ejemplo: 978-3-16-148410-0"
                    value={formData.isbn_libro}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({...prev, isbn_libro: value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    Nombre del Libro <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    required
                    placeholder="Título del libro"
                    value={formData.nombre_libro}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({...prev, nombre_libro: value}))
                    }}
                  />
                </FormGroup>
              </Col>
            </Row>
            
            <FormGroup className="mb-3">
              <FormLabel>Subtítulo</FormLabel>
              <FormControl
                type="text"
                placeholder="Subtítulo del libro (opcional)"
                value={formData.subtitulo_libro}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({...prev, subtitulo_libro: value}))
                }}
              />
            </FormGroup>
            
            <FormGroup className="mb-3">
              <FormLabel>Descripción</FormLabel>
              <FormControl
                as="textarea"
                rows={4}
                placeholder="Descripción del libro"
                value={formData.descripcion}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData(prev => ({...prev, descripcion: value}))
                }}
              />
            </FormGroup>

            <ProductImage 
              onImageChange={handleImageChange}
            />
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN: WOOCOMMERCE - PRECIO E INVENTARIO */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">WooCommerce - Precio e Inventario</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>
                    Precio Regular <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.precio}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, precio: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Precio de Oferta</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.precio_oferta}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, precio_oferta: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Tipo de Producto</FormLabel>
                  <FormSelect
                    value={formData.type}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, type: e.target.value as any}))
                    }}
                  >
                    <option value="simple">Simple</option>
                    <option value="grouped">Agrupado</option>
                    <option value="external">Externo</option>
                    <option value="variable">Variable</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Stock</FormLabel>
                  <FormControl
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, stock_quantity: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Estado de Stock</FormLabel>
                  <FormSelect
                    value={formData.stock_status}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, stock_status: e.target.value as any}))
                    }}
                  >
                    <option value="instock">En Stock</option>
                    <option value="outofstock">Sin Stock</option>
                    <option value="onbackorder">Pedido Pendiente</option>
                  </FormSelect>
                </FormGroup>
              </Col>
              
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Backorders</FormLabel>
                  <FormSelect
                    value={formData.backorders}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, backorders: e.target.value as any}))
                    }}
                  >
                    <option value="no">No Permitir</option>
                    <option value="notify">Permitir, Notificar Cliente</option>
                    <option value="yes">Permitir</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.manage_stock}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, manage_stock: e.target.checked}))
                    }}
                    label="Gestionar Stock"
                  />
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.sold_individually}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, sold_individually: e.target.checked}))
                    }}
                    label="Vender Individualmente"
                  />
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN: WOOCOMMERCE - PESO Y DIMENSIONES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">WooCommerce - Peso y Dimensiones</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.weight}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, weight: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Largo (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.length}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, length: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Ancho (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.width}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, width: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>Alto (cm)</FormLabel>
                  <FormControl
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.height}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, height: e.target.value}))
                    }}
                  />
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN: WOOCOMMERCE - OPCIONES ADICIONALES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">WooCommerce - Opciones Adicionales</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.virtual}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, virtual: e.target.checked}))
                    }}
                    label="Producto Virtual"
                  />
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.downloadable}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, downloadable: e.target.checked}))
                    }}
                    label="Producto Descargable"
                  />
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, featured: e.target.checked}))
                    }}
                    label="Producto Destacado"
                  />
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormCheck
                    type="checkbox"
                    checked={formData.reviews_allowed}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, reviews_allowed: e.target.checked}))
                    }}
                    label="Permitir Reseñas"
                  />
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Visibilidad en Catálogo</FormLabel>
                  <FormSelect
                    value={formData.catalog_visibility}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, catalog_visibility: e.target.value as any}))
                    }}
                  >
                    <option value="visible">Visible</option>
                    <option value="catalog">Solo Catálogo</option>
                    <option value="search">Solo Búsqueda</option>
                    <option value="hidden">Oculto</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 2: RELACIONES PRINCIPALES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">Relaciones</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={6}>
                <RelationSelector
                  label="Obra"
                  value={formData.obra}
                  onChange={(val) => setFormData(prev => ({...prev, obra: val as string}))}
                  endpoint="/api/tienda/obras"
                  displayField="titulo"
                />
              </Col>
              
              <Col md={6}>
                <RelationSelector
                  label="Autor"
                  value={formData.autor_relacion}
                  onChange={(val) => setFormData(prev => ({...prev, autor_relacion: val as string}))}
                  endpoint="/api/tienda/autores"
                  displayField="nombre"
                />
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <RelationSelector
                  label="Editorial"
                  value={formData.editorial}
                  onChange={(val) => setFormData(prev => ({...prev, editorial: val as string}))}
                  endpoint="/api/tienda/editoriales"
                  displayField="nombre"
                />
              </Col>
              
              <Col md={6}>
                <RelationSelector
                  label="Sello"
                  value={formData.sello}
                  onChange={(val) => setFormData(prev => ({...prev, sello: val as string}))}
                  endpoint="/api/tienda/sellos"
                  displayField="nombre"
                />
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <RelationSelector
                  label="Colección / Serie"
                  value={formData.coleccion}
                  onChange={(val) => setFormData(prev => ({...prev, coleccion: val as string}))}
                  endpoint="/api/tienda/colecciones"
                  displayField="nombre"
                />
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 3: CANALES DE PUBLICACIÓN */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">Publicación</h5>
          </CardHeader>
          <CardBody>
            <p className="text-muted mb-2">
              Selecciona en qué canales/sitios web se publicará este libro. 
              <strong className="text-primary"> Puedes seleccionar múltiples canales manteniendo presionada la tecla Ctrl (Windows) o Cmd (Mac) mientras haces clic.</strong>
            </p>
            
            <RelationSelector
              label="Canales"
              value={formData.canales}
              onChange={(val) => setFormData(prev => ({...prev, canales: val as string[]}))}
              endpoint="/api/tienda/canales"
              multiple={true}
              displayField="nombre"
            />
            
            {formData.canales.length > 0 && (
              <div className="mt-2">
                <small className="text-success">
                  ✓ {formData.canales.length} canal{formData.canales.length > 1 ? 'es' : ''} seleccionado{formData.canales.length > 1 ? 's' : ''}
                </small>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 4: CATEGORIZACIÓN */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">Categorización</h5>
          </CardHeader>
          <CardBody>
          <Row>
              <Col md={6}>
                <RelationSelector
                  label="Marcas"
                  value={formData.marcas}
                  onChange={(val) => setFormData(prev => ({...prev, marcas: val as string[]}))}
                  endpoint="/api/tienda/marcas"
                  multiple={true}
                  displayField="nombre"
                />
              </Col>
              
              <Col md={6}>
                <RelationSelector
                  label="Etiquetas"
                  value={formData.etiquetas}
                  onChange={(val) => setFormData(prev => ({...prev, etiquetas: val as string[]}))}
                  endpoint="/api/tienda/etiquetas"
                  multiple={true}
                  displayField="nombre"
                />
              </Col>
            </Row>
            
            <RelationSelector
              label="Categorías de Producto"
              value={formData.categorias_producto}
              onChange={(val) => setFormData(prev => ({...prev, categorias_producto: val as string[]}))}
              endpoint="/api/tienda/categorias"
              multiple={true}
              displayField="nombre"
            />
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 5: INFORMACIÓN DE EDICIÓN */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">Información de Edición</h5>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Número de Edición</FormLabel>
                  <FormControl
                    type="number"
                    placeholder="Ej: 1"
                    value={formData.numero_edicion}
                    onChange={(e) => setFormData(prev => ({...prev, numero_edicion: e.target.value}))}
                  />
                </FormGroup>
            </Col>

              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Año de Edición</FormLabel>
                  <FormControl
                    type="number"
                    placeholder="Ej: 2024"
                    value={formData.agno_edicion}
                    onChange={(e) => setFormData(prev => ({...prev, agno_edicion: e.target.value}))}
                  />
                </FormGroup>
              </Col>
              
              <Col md={4}>
                <FormGroup className="mb-3">
                  <FormLabel>Estado de Edición</FormLabel>
                  <FormSelect
                    value={formData.estado_edicion}
                    onChange={(e) => setFormData(prev => ({...prev, estado_edicion: e.target.value}))}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Vigente">Vigente</option>
                    <option value="Agotado">Agotado</option>
                    <option value="Descatalogado">Descatalogado</option>
                  </FormSelect>
                </FormGroup>
            </Col>
          </Row>

            <Row>
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Idioma</FormLabel>
                  <FormSelect
                    value={formData.idioma}
                    onChange={(e) => setFormData(prev => ({...prev, idioma: e.target.value}))}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Español">Español</option>
                    <option value="Inglés">Inglés</option>
                    <option value="Francés">Francés</option>
                    <option value="Alemán">Alemán</option>
                    <option value="Portugués">Portugués</option>
                    <option value="Otro">Otro</option>
                  </FormSelect>
                </FormGroup>
              </Col>
              
              <Col md={6}>
                <FormGroup className="mb-3">
                  <FormLabel>Tipo de Libro</FormLabel>
                  <FormSelect
                    value={formData.tipo_libro}
                    onChange={(e) => setFormData(prev => ({...prev, tipo_libro: e.target.value}))}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Plan Lector">Plan Lector</option>
                    <option value="Texto Curricular">Texto Curricular</option>
                    <option value="Texto PAES">Texto PAES</option>
                    <option value="Texto Complementario">Texto Complementario</option>
                    <option value="Otro">Otro</option>
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN 6: IDs OPCIONALES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Card className="mb-3">
          <CardHeader>
            <h5 className="card-title mb-0">
              IDs de Integración <span className="text-muted">(Opcional)</span>
            </h5>
          </CardHeader>
          <CardBody>
            <p className="text-muted small">IDs numéricos para integración con sistemas externos</p>
            
            <Row>
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>ID Autor</FormLabel>
                  <FormControl
                    type="number"
                    value={formData.id_autor}
                    onChange={(e) => setFormData(prev => ({...prev, id_autor: e.target.value}))}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>ID Editorial</FormLabel>
                  <FormControl
                    type="number"
                    value={formData.id_editorial}
                    onChange={(e) => setFormData(prev => ({...prev, id_editorial: e.target.value}))}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>ID Sello</FormLabel>
                  <FormControl
                    type="number"
                    value={formData.id_sello}
                    onChange={(e) => setFormData(prev => ({...prev, id_sello: e.target.value}))}
                  />
                </FormGroup>
              </Col>
              
              <Col md={3}>
                <FormGroup className="mb-3">
                  <FormLabel>ID Colección</FormLabel>
                  <FormControl
                    type="number"
                    value={formData.id_coleccion}
                    onChange={(e) => setFormData(prev => ({...prev, id_coleccion: e.target.value}))}
                  />
                </FormGroup>
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* BOTONES DE ACCIÓN */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <Row>
          <Col xs={12}>
            <div className="text-end mb-4">
              <Button 
                type="button" 
                variant="secondary" 
                className="me-2" 
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back()
                  } else {
                    window.location.href = '/products'
                  }
                }}
                disabled={loading}
              >
                Cancelar
            </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creando...
                  </>
                ) : (
                  'Crear Producto'
                )}
            </Button>
          </div>
        </Col>
      </Row>
      </form>
    </Container>
  )
}
