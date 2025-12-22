'use client'
import QuillClient from '@/components/client-wrapper/QuillClient'
import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Col, FormControl, FormGroup, FormLabel, Row } from 'react-bootstrap'

const modules = {
  toolbar: [['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block', { list: 'ordered' }, 'link', 'image']],
}

interface ProductInformationProps {
  nombre_libro?: string
  subtitulo_libro?: string
  isbn_libro?: string
  descripcion?: string
  onNombreChange?: (value: string) => void
  onSubtituloChange?: (value: string) => void
  onIsbnChange?: (value: string) => void
  onDescripcionChange?: (value: string) => void
}

const ProductInformation = ({
  nombre_libro = '',
  subtitulo_libro = '',
  isbn_libro = '',
  descripcion = '',
  onNombreChange,
  onSubtituloChange,
  onIsbnChange,
  onDescripcionChange,
}: ProductInformationProps) => {
  const [value, setValue] = useState(descripcion || '')
  
  useEffect(() => {
    if (descripcion !== value) {
      setValue(descripcion)
    }
  }, [descripcion])
  
  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    onDescripcionChange?.(newValue)
  }

  return (
    <Card>
      <CardHeader className="d-block p-3">
        <h4 className="card-title mb-1">Product Information</h4>
        <p className="text-muted mb-0">To add a new product, please provide the necessary details in the fields below.</p>
      </CardHeader>
      <CardBody>
        <Row>
          <Col xs={12}>
            <FormGroup className="mb-3">
              <FormLabel htmlFor="productName">
                Nombre del Libro <span className="text-danger">*</span>
              </FormLabel>
              <FormControl 
                type="text" 
                id="productName" 
                placeholder="Ingresa el nombre del libro" 
                value={nombre_libro}
                onChange={(e) => onNombreChange?.(e.target.value)}
                required 
              />
            </FormGroup>
          </Col>
          <Col xs={12}>
            <FormGroup className="mb-3">
              <FormLabel htmlFor="subtitulo">
                Subtítulo <span className="text-muted">(Opcional)</span>
              </FormLabel>
              <FormControl 
                type="text" 
                id="subtitulo" 
                placeholder="Ingresa el subtítulo del libro" 
                value={subtitulo_libro}
                onChange={(e) => onSubtituloChange?.(e.target.value)}
              />
            </FormGroup>
          </Col>
          <Col lg={6}>
            <FormGroup className="mb-3">
              <FormLabel htmlFor="skuId">
                ISBN/SKU <span className="text-muted">(Opcional - se genera automático si está vacío)</span>
              </FormLabel>
              <FormControl 
                type="text" 
                id="skuId" 
                placeholder="ISBN-123456 (o déjalo vacío para generar automático)" 
                value={isbn_libro}
                onChange={(e) => onIsbnChange?.(e.target.value)}
              />
              <small className="text-muted">
                Si dejas este campo vacío, se generará un ISBN único automáticamente.
              </small>
            </FormGroup>
          </Col>
          <Col xs={12}>
            <FormGroup>
              <FormLabel>
                Descripción <span className="text-muted">(Opcional)</span>
              </FormLabel>
              <div id="snow-editor">
                <QuillClient theme="snow" modules={modules} value={value} onChange={handleValueChange} />
              </div>
            </FormGroup>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default ProductInformation
