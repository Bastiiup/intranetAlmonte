'use client'

import { useState, useMemo } from 'react'
import { Row, Col, Card, CardBody, CardTitle, Alert, InputGroup, Form } from 'react-bootstrap'
import Link from 'next/link'
import { LuSearch } from 'react-icons/lu'

interface SellosGridProps {
  sellos?: any[]
  error?: string | null
  onSelloSelect?: (selloId: string) => void
}

const getField = (obj: any, ...fieldNames: string[]): any => {
  for (const fieldName of fieldNames) {
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName]
    }
  }
  return undefined
}

const SellosGrid = ({ sellos = [], error, onSelloSelect }: SellosGridProps) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSellos = useMemo(() => {
    if (!sellos || sellos.length === 0) return []
    
    if (!searchTerm) return sellos
    
    const term = searchTerm.toLowerCase()
    return sellos.filter((sello: any) => {
      const attrs = sello.attributes || {}
      const data = (attrs && Object.keys(attrs).length > 0) ? attrs : sello
      const nombre = getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || ''
      const acronimo = getField(data, 'acronimo', 'acronimo', 'ACRONIMO') || ''
      
      return nombre.toLowerCase().includes(term) || acronimo.toLowerCase().includes(term)
    })
  }, [sellos, searchTerm])

  const getSelloName = (sello: any): string => {
    const attrs = sello.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : sello
    return getField(data, 'nombre_sello', 'nombreSello', 'nombre', 'NOMBRE_SELLO', 'NAME') || 'Sin nombre'
  }

  const getSelloId = (sello: any): string => {
    return sello.id?.toString() || sello.documentId?.toString() || ''
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
      </Alert>
    )
  }

  if (!sellos || sellos.length === 0) {
    return (
      <Alert variant="info">
        No se encontraron sellos.
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
            placeholder="Buscar por nombre o acrónimo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        <div className="mt-2">
          <small className="text-muted">
            Mostrando {filteredSellos.length} de {sellos.length} sellos
          </small>
        </div>
      </div>

      {/* Grid de Sellos */}
      {filteredSellos.length === 0 ? (
        <Alert variant="info">No se encontraron sellos que coincidan con la búsqueda.</Alert>
      ) : (
        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-sm-2 row-col-1 g-3">
          {filteredSellos.map((sello) => {
            const selloId = getSelloId(sello)
            const nombre = getSelloName(sello)
            const attrs = sello.attributes || {}
            const data = (attrs && Object.keys(attrs).length > 0) ? attrs : sello
            const libros = data.libros?.data || data.libros || []
            const colecciones = data.colecciones?.data || data.colecciones || []
            const librosCount = Array.isArray(libros) ? libros.length : 0
            const coleccionesCount = Array.isArray(colecciones) ? colecciones.length : 0
            const productosCount = librosCount + coleccionesCount

            return (
              <Col key={selloId || sello.id}>
                <Card className="h-100">
                  <CardBody>
                    <CardTitle className="fs-sm lh-base mb-2">
                      {onSelloSelect && selloId ? (
                        <a 
                          href="#" 
                          className="link-reset" 
                          onClick={(e) => {
                            e.preventDefault()
                            onSelloSelect(selloId)
                          }}
                        >
                          {nombre}
                        </a>
                      ) : (
                        <Link href={`/atributos/sello/${selloId}`} className="link-reset">
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

export default SellosGrid

