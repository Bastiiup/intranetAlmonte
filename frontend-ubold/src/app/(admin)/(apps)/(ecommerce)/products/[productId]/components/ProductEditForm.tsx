'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody, CardHeader, Button, Alert, Form, Row, Col, Spinner, FormCheck, FormControl, FormGroup, FormLabel, FormSelect } from 'react-bootstrap'
import { TbCheck, TbX } from 'react-icons/tb'
import { RelationSelector } from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/RelationSelector'
import ProductImage from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/ProductImage'

interface ProductEditFormProps {
  producto: any
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

// Helper para obtener campo con múltiples variaciones
const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

// Helper para extraer texto de descripción
const extractDescriptionText = (descripcion: any): string => {
  if (!descripcion) return ''
  if (typeof descripcion === 'string') return descripcion
  if (Array.isArray(descripcion)) {
    return descripcion
      .map((block: any) => {
        if (block.children) {
          return block.children
            .map((child: any) => child.text || '')
            .join('')
        }
        return ''
      })
      .join('\n')
  }
  return ''
}

// Helper para extraer relaciones (puede venir como objeto o array)
const extractRelation = (rel: any): string => {
  if (!rel) return ''
  if (typeof rel === 'string') return rel
  if (typeof rel === 'number') return String(rel)
  if (rel.data) {
    if (Array.isArray(rel.data)) {
      return rel.data.map((item: any) => item.documentId || item.id || '').filter(Boolean)
    }
    return String(rel.data.documentId || rel.data.id || '')
  }
  if (rel.documentId) return String(rel.documentId)
  if (rel.id) return String(rel.id)
  return ''
}

// Helper para extraer relaciones múltiples
const extractMultipleRelations = (rel: any): string[] => {
  if (!rel) return []
  if (Array.isArray(rel)) {
    return rel.map((item: any) => {
      if (typeof item === 'string') return item
      if (typeof item === 'number') return String(item)
      if (item.data) {
        if (Array.isArray(item.data)) {
          return item.data.map((d: any) => String(d.documentId || d.id || '')).filter(Boolean)
        }
        return [String(item.data.documentId || item.data.id || '')]
      }
      return String(item.documentId || item.id || '')
    }).flat().filter(Boolean)
  }
  const single = extractRelation(rel)
  return single ? [single] : []
}

export function ProductEditForm({ producto, onSave, onCancel, saving = false }: ProductEditFormProps) {
  const [error, setError] = useState<string | null>(null)
  
  // Obtener datos del producto
  const attrs = producto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
  
  // Estados para todos los campos
  const [formData, setFormData] = useState({
    // === BÁSICOS ===
    isbn_libro: getField(data, 'isbn_libro', 'ISBN_LIBRO', 'isbnLibro') || '',
    nombre_libro: getField(data, 'nombre_libro', 'NOMBRE_LIBRO', 'nombreLibro') || '',
    subtitulo_libro: getField(data, 'subtitulo_libro', 'SUBTITULO_LIBRO', 'subtituloLibro') || '',
    descripcion: extractDescriptionText(getField(data, 'descripcion', 'DESCRIPCION', 'descripcion')) || '',
    
    // === WOOCOMMERCE: PRECIO ===
    precio: getField(data, 'precio', 'PRECIO') || '',
    precio_oferta: getField(data, 'precio_oferta', 'PRECIO_OFERTA', 'precioOferta') || '',
    
    // === WOOCOMMERCE: INVENTARIO ===
    stock_quantity: getField(data, 'stock_quantity', 'STOCK_QUANTITY', 'stockQuantity') || '',
    manage_stock: getField(data, 'manage_stock', 'MANAGE_STOCK', 'manageStock') !== false,
    stock_status: (getField(data, 'stock_status', 'STOCK_STATUS', 'stockStatus') || 'instock') as 'instock' | 'outofstock' | 'onbackorder',
    backorders: (getField(data, 'backorders', 'BACKORDERS') || 'no') as 'no' | 'notify' | 'yes',
    
    // === WOOCOMMERCE: TIPO DE PRODUCTO ===
    type: (getField(data, 'type', 'TYPE') || 'simple') as 'simple' | 'grouped' | 'external' | 'variable',
    
    // === WOOCOMMERCE: PESO Y DIMENSIONES ===
    weight: getField(data, 'weight', 'WEIGHT') || '',
    length: getField(data, 'length', 'LENGTH') || '',
    width: getField(data, 'width', 'WIDTH') || '',
    height: getField(data, 'height', 'HEIGHT') || '',
    
    // === WOOCOMMERCE: OPCIONES ADICIONALES ===
    virtual: getField(data, 'virtual', 'VIRTUAL') === true,
    downloadable: getField(data, 'downloadable', 'DOWNLOADABLE') === true,
    featured: getField(data, 'featured', 'FEATURED') === true,
    sold_individually: getField(data, 'sold_individually', 'SOLD_INDIVIDUALLY', 'soldIndividually') === true,
    reviews_allowed: getField(data, 'reviews_allowed', 'REVIEWS_ALLOWED', 'reviewsAllowed') !== false,
    catalog_visibility: (getField(data, 'catalog_visibility', 'CATALOG_VISIBILITY', 'catalogVisibility') || 'visible') as 'visible' | 'catalog' | 'search' | 'hidden',
    
    // === RELACIONES SIMPLES ===
    obra: extractRelation(getField(data, 'obra', 'OBRA')),
    autor_relacion: extractRelation(getField(data, 'autor_relacion', 'AUTOR_RELACION', 'autorRelacion')),
    editorial: extractRelation(getField(data, 'editorial', 'EDITORIAL')),
    sello: extractRelation(getField(data, 'sello', 'SELLO')),
    coleccion: extractRelation(getField(data, 'coleccion', 'COLECCION')),
    
    // === RELACIONES MÚLTIPLES ===
    canales: extractMultipleRelations(getField(data, 'canales', 'CANALES')),
    marcas: extractMultipleRelations(getField(data, 'marcas', 'MARCAS')),
    etiquetas: extractMultipleRelations(getField(data, 'etiquetas', 'ETIQUETAS')),
    categorias_producto: extractMultipleRelations(getField(data, 'categorias_producto', 'CATEGORIAS_PRODUCTO', 'categoriasProducto')),
    
    // === IDs NUMÉRICOS ===
    id_autor: getField(data, 'id_autor', 'ID_AUTOR', 'idAutor') || '',
    id_editorial: getField(data, 'id_editorial', 'ID_EDITORIAL', 'idEditorial') || '',
    id_sello: getField(data, 'id_sello', 'ID_SELLO', 'idSello') || '',
    id_coleccion: getField(data, 'id_coleccion', 'ID_COLECCION', 'idColeccion') || '',
    id_obra: getField(data, 'id_obra', 'ID_OBRA', 'idObra') || '',
    
    // === INFORMACIÓN DE EDICIÓN ===
    numero_edicion: getField(data, 'numero_edicion', 'NUMERO_EDICION', 'numeroEdicion') || '',
    agno_edicion: getField(data, 'agno_edicion', 'AGNO_EDICION', 'agnoEdicion') || '',
    idioma: getField(data, 'idioma', 'IDIOMA', 'idioma') || '',
    tipo_libro: getField(data, 'tipo_libro', 'TIPO_LIBRO', 'tipoLibro') || '',
    estado_edicion: getField(data, 'estado_edicion', 'ESTADO_EDICION', 'estadoEdicion') || 'Vigente',
    
    // === MEDIA ===
    portada_libro: null as File | null,
  })

  // Memoizar la función onImageChange
  const handleImageChange = useCallback((file: File | null) => {
    setFormData(prev => ({ ...prev, portada_libro: file }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!formData.nombre_libro.trim()) {
        setError('El nombre del libro es obligatorio')
        return
      }

      // Preparar datos para enviar (similar a add-product)
      const dataToSend: any = {
        nombre_libro: formData.nombre_libro.trim()
      }
      
      // Campos básicos
      if (formData.isbn_libro?.trim()) dataToSend.isbn_libro = formData.isbn_libro.trim()
      if (formData.subtitulo_libro?.trim()) dataToSend.subtitulo_libro = formData.subtitulo_libro.trim()
      if (formData.descripcion?.trim()) {
        dataToSend.descripcion = [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: formData.descripcion.trim() }]
          }
        ]
      }
      
      // WooCommerce: Precio
      if (formData.precio?.trim()) dataToSend.precio = parseFloat(formData.precio) || 0
      if (formData.precio_oferta?.trim()) dataToSend.precio_oferta = parseFloat(formData.precio_oferta) || 0
      
      // WooCommerce: Inventario
      dataToSend.manage_stock = formData.manage_stock
      if (formData.stock_quantity?.trim()) {
        dataToSend.stock_quantity = parseInt(formData.stock_quantity) || 0
      } else {
        dataToSend.stock_quantity = 0
      }
      dataToSend.stock_status = formData.stock_status
      dataToSend.backorders = formData.backorders
      
      // WooCommerce: Tipo
      dataToSend.type = formData.type
      
      // WooCommerce: Peso y dimensiones
      if (formData.weight?.trim()) dataToSend.weight = formData.weight.trim()
      if (formData.length?.trim()) dataToSend.length = formData.length.trim()
      if (formData.width?.trim()) dataToSend.width = formData.width.trim()
      if (formData.height?.trim()) dataToSend.height = formData.height.trim()
      
      // WooCommerce: Opciones adicionales
      dataToSend.virtual = formData.virtual
      dataToSend.downloadable = formData.downloadable
      dataToSend.featured = formData.featured
      dataToSend.sold_individually = formData.sold_individually
      dataToSend.reviews_allowed = formData.reviews_allowed
      dataToSend.catalog_visibility = formData.catalog_visibility
      
      // Relaciones simples
      if (formData.obra) dataToSend.obra = formData.obra
      if (formData.autor_relacion) dataToSend.autor_relacion = formData.autor_relacion
      if (formData.editorial) dataToSend.editorial = formData.editorial
      if (formData.sello) dataToSend.sello = formData.sello
      if (formData.coleccion) dataToSend.coleccion = formData.coleccion
      
      // Relaciones múltiples
      if (formData.canales.length > 0) dataToSend.canales = formData.canales
      if (formData.marcas.length > 0) dataToSend.marcas = formData.marcas
      if (formData.etiquetas.length > 0) dataToSend.etiquetas = formData.etiquetas
      if (formData.categorias_producto.length > 0) dataToSend.categorias_producto = formData.categorias_producto
      
      // IDs numéricos
      if (formData.id_autor) dataToSend.id_autor = parseInt(formData.id_autor)
      if (formData.id_editorial) dataToSend.id_editorial = parseInt(formData.id_editorial)
      if (formData.id_sello) dataToSend.id_sello = parseInt(formData.id_sello)
      if (formData.id_coleccion) dataToSend.id_coleccion = parseInt(formData.id_coleccion)
      if (formData.id_obra) dataToSend.id_obra = parseInt(formData.id_obra)
      
      // Información de edición
      if (formData.numero_edicion) dataToSend.numero_edicion = parseInt(formData.numero_edicion)
      if (formData.agno_edicion) dataToSend.agno_edicion = parseInt(formData.agno_edicion)
      if (formData.idioma && formData.idioma !== '') dataToSend.idioma = formData.idioma
      if (formData.tipo_libro && formData.tipo_libro !== '') dataToSend.tipo_libro = formData.tipo_libro
      if (formData.estado_edicion && formData.estado_edicion !== '') dataToSend.estado_edicion = formData.estado_edicion

      // Subir imagen si hay una nueva
      if (formData.portada_libro) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.portada_libro)
        
        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success) {
          if (uploadResult.url) {
            dataToSend.portada_libro = uploadResult.url
            dataToSend.portada_libro_id = uploadResult.id
          } else if (uploadResult.id) {
            dataToSend.portada_libro = uploadResult.id
          }
        }
      }

      await onSave(dataToSend)
    } catch (err: any) {
      setError(err.message || 'Error al guardar cambios')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
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
                  onChange={(e) => setFormData(prev => ({...prev, isbn_libro: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, nombre_libro: e.target.value}))}
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
              onChange={(e) => setFormData(prev => ({...prev, subtitulo_libro: e.target.value}))}
            />
          </FormGroup>
          
          <FormGroup className="mb-3">
            <FormLabel>Descripción</FormLabel>
            <FormControl
              as="textarea"
              rows={4}
              placeholder="Descripción del libro"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({...prev, descripcion: e.target.value}))}
            />
          </FormGroup>

          <ProductImage 
            onImageChange={handleImageChange}
          />
        </CardBody>
      </Card>

      {/* SECCIÓN 2: WOOCOMMERCE - PRECIO E INVENTARIO */}
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
                  onChange={(e) => setFormData(prev => ({...prev, precio: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, precio_oferta: e.target.value}))}
                />
              </FormGroup>
            </Col>
            
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Tipo de Producto</FormLabel>
                <FormSelect
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({...prev, type: e.target.value as any}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, stock_quantity: e.target.value}))}
                />
              </FormGroup>
            </Col>
            
            <Col md={4}>
              <FormGroup className="mb-3">
                <FormLabel>Estado de Stock</FormLabel>
                <FormSelect
                  value={formData.stock_status}
                  onChange={(e) => setFormData(prev => ({...prev, stock_status: e.target.value as any}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, backorders: e.target.value as any}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, manage_stock: e.target.checked}))}
                  label="Gestionar Stock"
                />
              </FormGroup>
            </Col>
            
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  checked={formData.sold_individually}
                  onChange={(e) => setFormData(prev => ({...prev, sold_individually: e.target.checked}))}
                  label="Vender Individualmente"
                />
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* SECCIÓN 3: WOOCOMMERCE - PESO Y DIMENSIONES */}
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
                  onChange={(e) => setFormData(prev => ({...prev, weight: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, length: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, width: e.target.value}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, height: e.target.value}))}
                />
              </FormGroup>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* SECCIÓN 4: WOOCOMMERCE - OPCIONES ADICIONALES */}
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
                  onChange={(e) => setFormData(prev => ({...prev, virtual: e.target.checked}))}
                  label="Producto Virtual"
                />
              </FormGroup>
            </Col>
            
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  checked={formData.downloadable}
                  onChange={(e) => setFormData(prev => ({...prev, downloadable: e.target.checked}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, featured: e.target.checked}))}
                  label="Producto Destacado"
                />
              </FormGroup>
            </Col>
            
            <Col md={6}>
              <FormGroup className="mb-3">
                <FormCheck
                  type="checkbox"
                  checked={formData.reviews_allowed}
                  onChange={(e) => setFormData(prev => ({...prev, reviews_allowed: e.target.checked}))}
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
                  onChange={(e) => setFormData(prev => ({...prev, catalog_visibility: e.target.value as any}))}
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

      {/* SECCIÓN 5: RELACIONES */}
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
                displayField="nombre_obra"
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
                displayField="nombre_editorial"
              />
            </Col>
            
            <Col md={6}>
              <RelationSelector
                label="Sello"
                value={formData.sello}
                onChange={(val) => setFormData(prev => ({...prev, sello: val as string}))}
                endpoint="/api/tienda/sellos"
                displayField="nombre_sello"
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
                displayField="nombre_coleccion"
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* SECCIÓN 6: CATEGORIZACIÓN Y PUBLICACIÓN */}
      <Card className="mb-3">
        <CardHeader>
          <h5 className="card-title mb-0">Categorización y Publicación</h5>
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
          
          <Row>
            <Col md={6}>
              <RelationSelector
                label="Categorías de Producto"
                value={formData.categorias_producto}
                onChange={(val) => setFormData(prev => ({...prev, categorias_producto: val as string[]}))}
                endpoint="/api/tienda/categorias"
                multiple={true}
                displayField="nombre"
              />
            </Col>
            
            <Col md={6}>
              <div className="mb-3">
                <p className="text-muted mb-2 small">
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
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* SECCIÓN 7: INFORMACIÓN DE EDICIÓN */}
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

      {/* SECCIÓN 8: IDs OPCIONALES */}
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

      {/* BOTONES DE ACCIÓN */}
      <Row>
        <Col xs={12}>
          <div className="text-end mb-4">
            <Button 
              type="button" 
              variant="secondary" 
              className="me-2" 
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <TbCheck className="me-1" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </form>
  )
}

export default ProductEditForm

