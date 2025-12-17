'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RelationSelector } from './components/RelationSelector'
import ProductImage from './components/ProductImage'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Alert, Button, Card, CardBody, CardHeader, Col, Container, FormControl, FormGroup, FormLabel, FormSelect, Row } from 'react-bootstrap'

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    // === BÁSICOS ===
    isbn_libro: '',
    nombre_libro: '',
    subtitulo_libro: '',
    descripcion: '',
    
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
      if (formData.portada_libro) {
        console.log('[AddProduct] Subiendo imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.portada_libro)
        
        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success && uploadResult.id) {
          portadaLibroId = uploadResult.id
          console.log('[AddProduct] Imagen subida con ID:', portadaLibroId)
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
      if (portadaLibroId) dataToSend.portada_libro = portadaLibroId
      
      // === RELACIONES SIMPLES (enviar documentId si hay valor) ===
      if (formData.obra) dataToSend.obra = formData.obra
      if (formData.autor_relacion) dataToSend.autor_relacion = formData.autor_relacion
      if (formData.editorial) dataToSend.editorial = formData.editorial
      if (formData.sello) dataToSend.sello = formData.sello
      if (formData.coleccion) dataToSend.coleccion = formData.coleccion
      
      // === RELACIONES MÚLTIPLES (enviar array si tiene elementos) ===
      if (formData.canales.length > 0) dataToSend.canales = formData.canales
      if (formData.marcas.length > 0) dataToSend.marcas = formData.marcas
      if (formData.etiquetas.length > 0) dataToSend.etiquetas = formData.etiquetas
      if (formData.categorias_producto.length > 0) dataToSend.categorias_producto = formData.categorias_producto
      
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/products')
        }, 1500)
      } else {
        setError(data.error || 'Error al crear producto')
      }
    } catch (err: any) {
      console.error('[AddProduct] Error:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Agregar Producto" subtitle="Ecommerce" />

      <form onSubmit={handleSubmit}>
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
              onImageChange={(file) => setFormData(prev => ({ ...prev, portada_libro: file }))}
            />
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
                onClick={() => router.back()}
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
