'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap'

import FileUploader from '@/components/FileUploader'
import { FileType } from '@/types'

interface ProductImageProps {
  onImageChange?: (file: File | null) => void
}

const ProductImage = ({ onImageChange }: ProductImageProps) => {
  const [files, setFiles] = useState<FileType[]>([])

  useEffect(() => {
    // Notificar al padre cuando cambia el archivo
    if (files.length > 0 && files[0] instanceof File) {
      onImageChange?.(files[0] as File)
    } else {
      onImageChange?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]) // Remover onImageChange de las dependencias para evitar loops infinitos

  return (
    <Card>
      <CardHeader className="d-block p-3">
        <h4 className="card-title mb-1">Portada del Libro</h4>
        <p className="text-muted mb-0">Sube la imagen de portada del libro. Formatos aceptados: PNG, JPG, JPEG, GIF, WEBP.</p>
      </CardHeader>
      <CardBody>
        <Row>
          <Col xs={12}>
            <FileUploader
              files={files}
              setFiles={(newFiles) => setFiles(newFiles as FileType[])}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
              }}
              maxSize={1024 * 1024 * 10}
              maxFileCount={1}
              multiple={false}
              className="mb-3"
            />
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default ProductImage
