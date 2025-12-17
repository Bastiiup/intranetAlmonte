'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Button, Card, CardBody, Col, Form } from 'react-bootstrap'
import { TbPencil, TbCheck, TbX } from 'react-icons/tb'

import { STRAPI_API_URL } from '@/lib/strapi/config'
import EditableField from './EditableField'

interface ProductDisplayProps {
  producto: any
}

const ProductDisplay = ({ producto }: ProductDisplayProps) => {
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  // Obtener URL de imagen (misma lógica que Products Grid)
  const getImageUrl = (): string | null => {
    const attrs = producto.attributes || {}
    const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (producto as any)
    
    let portada = data.portada_libro || data.PORTADA_LIBRO || data.portadaLibro
    if (portada?.data) {
      portada = portada.data
    }
    
    if (!portada || portada === null) {
      return null
    }

    const url = portada.attributes?.url || portada.attributes?.URL || portada.url || portada.URL
    if (!url) {
      return null
    }

    if (url.startsWith('http')) {
      return url
    }

    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const currentImageUrl = getImageUrl()

  const handleSaveImage = async () => {
    // TODO: Implementar guardado de imagen en Strapi
    console.log('Guardar imagen:', imageUrl)
    setIsEditingImage(false)
  }

  return (
    <Col xl={4}>
      <Card className="card-top-sticky border-0">
        <CardBody className="p-0">
          <div className="position-relative">
            <div
              className="bg-light bg-opacity-25 border border-light border-dashed rounded-3"
              style={{
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {isEditingImage ? (
                <div className="p-3 w-100">
                  <Form.Control
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL de la imagen"
                    className="mb-2"
                  />
                  <div className="d-flex gap-2">
                    <Button variant="success" size="sm" onClick={handleSaveImage}>
                      <TbCheck className="me-1" /> Guardar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setIsEditingImage(false)}>
                      <TbX className="me-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {currentImageUrl ? (
                    <Image
                      src={currentImageUrl}
                      alt="Product"
                      fill
                      style={{ objectFit: 'contain', padding: '20px' }}
                      unoptimized
                    />
                  ) : (
                    <div className="text-muted">Sin imagen</div>
                  )}
                  <Button
                    variant="light"
                    size="sm"
                    className="position-absolute top-0 end-0 m-2"
                    onClick={() => setIsEditingImage(true)}
                    title="Editar imagen"
                  >
                    <TbPencil className="fs-sm" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

export default ProductDisplay
