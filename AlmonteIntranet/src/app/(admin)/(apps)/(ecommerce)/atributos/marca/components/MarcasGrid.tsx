'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Image from 'next/image'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface MarcasGridProps {
  marcas?: any[]
  error?: string | null
  onMarcaSelect?: (marcaId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const MarcasGrid = ({ marcas = [], error, onMarcaSelect }: MarcasGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMarcas = useMemo(() => {
    if (!marcas || marcas.length === 0) return []
    
    if (!searchTerm) return marcas
    
    const term = searchTerm.toLowerCase()
    return marcas.filter((marca: any) => {
      const attrs = marca.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : marca
      const nombre = getField(data, 'name', 'nombre', 'nombre_marca', 'nombreMarca', 'NOMBRE_MARCA', 'NAME') || ''
      const descripcion = getField(data, 'descripcion', 'description', 'DESCRIPCION', 'DESCRIPTION') || ''
      
      return nombre.toLowerCase().includes(term) || descripcion.toLowerCase().includes(term)
    })
  }, [marcas, searchTerm])

  const getImageUrl = (marca: any): string | null => {
    const attrs = marca.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : marca
    let imagen = data.imagen?.data || data.imagen
    
    if (!imagen) return null
    
    const url = imagen.attributes?.url || imagen.url
    if (!url) return null
    
    if (url.startsWith('http')) return url
    
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const getMarcaName = (marca: any): string => {
    const attrs = marca.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : marca
    return getField(data, 'name', 'nombre', 'nombre_marca', 'nombreMarca', 'NOMBRE_MARCA', 'NAME') || 'Sin nombre'
  }

  const getMarcaId = (marca: any): string => {
    return marca.id?.toString() || marca.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!marcas || marcas.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron marcas.
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
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredMarcas.length} de {marcas.length} marcas
          </small>
        </div>
      </div>

      {/* Grid de Marcas */}
      {filteredMarcas.length === 0 ? (
        <Alert variant="info">No se encontraron marcas que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredMarcas.map((marca) => {
            const marcaId = getMarcaId(marca)
            const nombre = getMarcaName(marca)
            const imageUrl = getImageUrl(marca)
            const attrs = marca.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : marca
            const productos = data.productos?.data || data.products?.data || []
            const productosCount = Array.isArray(productos) ? productos.length : 0

            return (
              <Col key={marcaId || marca.id}>
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
                      {onMarcaSelect && marcaId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onMarcaSelect(marcaId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/atributos/marca/${marcaId}`} className="link-reset">
                          {nombre}
                        </Link>
                      )}
                    </CardTitle>
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

export default MarcasGrid

