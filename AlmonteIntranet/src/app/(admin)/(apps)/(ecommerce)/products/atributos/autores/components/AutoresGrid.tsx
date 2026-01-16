'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Image from 'next/image'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'
import { STRAPI_API_URL } from '@/lib/strapi/config'

interface AutoresGridProps {
  autores?: any[]
  error?: string | null
  onAutorSelect?: (autorId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const AutoresGrid = ({ autores = [], error, onAutorSelect }: AutoresGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAutores = useMemo(() => {
    if (!autores || autores.length === 0) return []
    
    if (!searchTerm) return autores
    
    const term = searchTerm.toLowerCase()
    return autores.filter((autor: any) => {
      const attrs = autor.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : autor
      const nombre = getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR', 'nombre', 'name') || ''
      const tipoAutor = getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || ''
      
      return nombre.toLowerCase().includes(term) || tipoAutor.toLowerCase().includes(term)
    })
  }, [autores, searchTerm])

  const getFotoUrl = (autor: any): string | null => {
    const attrs = autor.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : autor
    let foto = data.foto || data.FOTO || data.photo || data.PHOTO
    
    if (foto?.data) {
      foto = Array.isArray(foto.data) ? foto.data[0] : foto.data
    }
    
    if (!foto) return null
    
    const url = foto.attributes?.url || foto.attributes?.URL || foto.url || foto.URL
    if (!url) return null
    
    if (url.startsWith('http')) return url
    
    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const getAutorName = (autor: any): string => {
    const attrs = autor.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : autor
    return getField(data, 'nombre_completo_autor', 'nombreCompletoAutor', 'NOMBRE_COMPLETO_AUTOR', 'nombre', 'name') || 'Sin nombre'
  }

  const getAutorId = (autor: any): string => {
    return autor.id?.toString() || autor.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!autores || autores.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron autores.
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
            placeholder="Buscar por nombre o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredAutores.length} de {autores.length} autores
          </small>
        </div>
      </div>

      {/* Grid de Autores */}
      {filteredAutores.length === 0 ? (
        <Alert variant="info">No se encontraron autores que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredAutores.map((autor) => {
            const autorId = getAutorId(autor)
            const nombre = getAutorName(autor)
            const fotoUrl = getFotoUrl(autor)
            const attrs = autor.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : autor
            const libros = data.libros?.data || data.books || []
            const librosCount = Array.isArray(libros) ? libros.length : 0
            const tipoAutor = getField(data, 'tipo_autor', 'tipoAutor', 'TIPO_AUTOR') || 'Persona'

            return (
              <Col key={autorId || autor.id}>
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
                      {fotoUrl ? (
                        <Image 
                          src={fotoUrl} 
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
                          <div className="avatar-lg bg-light rounded-circle d-flex align-items-center justify-content-center">
                            <span className="fs-4">{nombre.charAt(0).toUpperCase()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onAutorSelect && autorId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onAutorSelect(autorId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/products/atributos/autores/${autorId}`} className="link-reset">
                          {nombre}
                        </Link>
                      )}
                    </CardTitle>
                    <p className="text-muted mb-2 fs-xxs">
                      <span className="badge badge-soft-secondary">{tipoAutor}</span>
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-soft-info">{librosCount} libros</span>
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

export default AutoresGrid

