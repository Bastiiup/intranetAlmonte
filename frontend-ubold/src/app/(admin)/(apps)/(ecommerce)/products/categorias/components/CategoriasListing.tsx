'use client'

import { useState, useMemo } from 'react'
import { Alert, Card, CardHeader, Row, Col } from 'react-bootstrap'
import { TbPlus } from 'react-icons/tb'
import Link from 'next/link'
import { Button } from 'react-bootstrap'

interface CategoriasListingProps {
  categorias?: any[]
  error?: string | null
}

const CategoriasListing = ({ categorias, error }: CategoriasListingProps = {}) => {
  const hasData = categorias && categorias.length > 0

  return (
    <Row>
      <Col xs={12}>
        <Card>
          <CardHeader className="d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">Categorías</h4>
            <Link href="/products/categorias/agregar" passHref>
              <Button variant="danger">
                <TbPlus className="fs-sm me-2" /> Agregar Categoría
              </Button>
            </Link>
          </CardHeader>

          {error && (
            <div className="p-4">
              <Alert variant="danger">
                <strong>Error al cargar categorías desde Strapi:</strong> {error}
                <br />
                <small>Verifica que:</small>
                <ul className="mb-0 mt-2">
                  <li>STRAPI_API_TOKEN esté configurado en Railway</li>
                  <li>El servidor de Strapi esté disponible</li>
                  <li>Las variables de entorno estén correctas</li>
                </ul>
              </Alert>
            </div>
          )}

          {!error && !hasData && (
            <div className="p-4 text-center">
              <p className="text-muted">No hay categorías disponibles.</p>
            </div>
          )}

          {!error && hasData && (
            <div className="p-4">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((categoria: any) => {
                      const id = categoria.id || categoria.documentId || categoria.id
                      const nombre = categoria.nombre || categoria.nombre_categoria || categoria.name || 'Sin nombre'
                      const descripcion = categoria.descripcion || categoria.description || ''
                      
                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>{nombre}</td>
                          <td>{descripcion}</td>
                          <td>
                            <Link href={`/products/categorias/${id}`}>
                              <Button variant="outline-primary" size="sm">
                                Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default CategoriasListing

