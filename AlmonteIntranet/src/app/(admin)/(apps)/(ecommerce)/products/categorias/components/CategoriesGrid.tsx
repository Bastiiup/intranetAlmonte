'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Image from 'next/image'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface CategoriesGridProps {
  categorias?: any[]
  error?: string | null
  onCategorySelect?: (categoryId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const CategoriesGrid = ({ categorias = [], error, onCategorySelect }: CategoriesGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCategorias = useMemo(() => {
    if (!categorias || categorias.length === 0) return []
    
    if (!searchTerm) return categorias
    
    const term = searchTerm.toLowerCase()
    return categorias.filter((cat: any) => {
      const attrs = cat.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : cat
      const nombre = getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || ''
      const slug = getField(data, 'slug', 'SLUG') || ''
      const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
      
      return nombre.toLowerCase().includes(term) || 
             slug.toLowerCase().includes(term) || 
             descripcion.toLowerCase().includes(term)
    })
  }, [categorias, searchTerm])

  const getImageUrl = (categoria: any): string | null => {
    const attrs = categoria.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : categoria
    let imagen = data.imagen?.data || data.imagen
    
    if (!imagen) return null
    
    const url = imagen.attributes?.url || imagen.url
    if (!url) return null
    
    if (url.startsWith('http')) return url
    
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const getCategoryName = (categoria: any): string => {
    const attrs = categoria.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : categoria
    return getField(data, 'name', 'nombre', 'NOMBRE', 'NAME') || 'Sin nombre'
  }

  const getCategorySlug = (categoria: any): string => {
    const attrs = categoria.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : categoria
    return getField(data, 'slug', 'SLUG') || ''
  }

  const getCategoryId = (categoria: any): string => {
    return categoria.id?.toString() || categoria.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!categorias || categorias.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron categorías.
      </Alert>
    )
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <InputGroup>
          <InputGroup.Text>
            <LuSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Buscar por nombre, slug o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredCategorias.length} de {categorias.length} categorías
          </small>
        </div>
      </div>

      {/* Grid de Categorías */}
      {filteredCategorias.length === 0 ? (
        <Alert variant="info">No se encontraron categorías que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredCategorias.map((categoria) => {
            const categoryId = getCategoryId(categoria)
            const nombre = getCategoryName(categoria)
            const slug = getCategorySlug(categoria)
            const imageUrl = getImageUrl(categoria)
            const attrs = categoria.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : categoria
            const productos = data.productos?.data || data.products?.data || []
            const productosCount = Array.isArray(productos) ? productos.length : 0

            return (
              <Col key={categoryId || categoria.id}>
                <Card className="h-100">
                  <CardBody className="pb-0">
                    <div 
                      className="p-3 mb-3" 
                      style={{ 
                        height: '200px', 
                        position: 'relative',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: '#f8f9fa' 
                      }}
                    >
                      {imageUrl ? (
                        <Image 
                          src={imageUrl} 
                          alt={nombre} 
                          fill
                          unoptimized
                          style={{
                            objectFit: 'contain',
                            padding: '12px',
                          }}
                          sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="text-muted d-flex flex-column align-items-center justify-content-center">
                          <small>Sin imagen</small>
                        </div>
                      )}
                    </div>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onCategorySelect && categoryId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onCategorySelect(categoryId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/products/categorias/${categoryId}`} className="link-reset">
                          {nombre}
                        </Link>
                      )}
                    </CardTitle>
                    {slug && (
                      <p className="text-muted mb-2 fs-xxs">
                        <code>{slug}</code>
                      </p>
                    )}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-soft-info">{productosCount} productos</span>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}

export default CategoriesGrid

