'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Organize from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/Organize'
import Pricing from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/Pricing'
import ProductImage from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/ProductImage'
import ProductInformation from '@/app/(admin)/(apps)/(ecommerce)/add-product/components/ProductInformation'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Alert, Button, Col, Container, Row } from 'react-bootstrap'
import { LuClipboardX, LuPlus, LuSave } from 'react-icons/lu'
import { FileType } from '@/types'

const Page = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    nombre_libro: '',
    isbn_libro: '',
    descripcion: '',
    portada_libro: null as File | null,
  })

  const handleSubmit = async (publish: boolean = false) => {
    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(false)

      // Validar campos requeridos
      if (!formData.nombre_libro.trim()) {
        setError('El nombre del producto es requerido')
        setIsSubmitting(false)
        return
      }

      // Subir imagen primero si hay una
      let portadaLibroId: number | null = null
      if (formData.portada_libro) {
        console.log('[Add Product] Subiendo imagen...')
        const uploadFormData = new FormData()
        uploadFormData.append('file', formData.portada_libro)
        
        const uploadResponse = await fetch('/api/tienda/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success && uploadResult.id) {
          portadaLibroId = uploadResult.id
          console.log('[Add Product] Imagen subida con ID:', portadaLibroId)
        } else {
          console.warn('[Add Product] No se pudo subir la imagen:', uploadResult.error)
          // Continuar sin imagen si falla la subida
        }
      }

      // Preparar datos para crear producto
      const productData: any = {
        nombre_libro: formData.nombre_libro.trim(),
        descripcion: formData.descripcion || null,
      }

      if (formData.isbn_libro.trim()) {
        productData.isbn_libro = formData.isbn_libro.trim()
      }

      if (portadaLibroId) {
        productData.portada_libro = portadaLibroId
      }

      console.log('[Add Product] Creando producto con datos:', productData)

      // Crear producto
      const response = await fetch('/api/tienda/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear producto')
      }

      console.log('[Add Product] ✅ Producto creado:', result.data)
      setSuccess(true)

      // Redirigir después de 1 segundo
      setTimeout(() => {
        router.push('/products')
      }, 1000)

    } catch (err: any) {
      console.error('[Add Product] ❌ Error:', err)
      setError(err.message || 'Error al crear producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container fluid>
      <PageBreadcrumb title="Add Product" subtitle="Ecommerce" />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <strong>¡Éxito!</strong> Producto creado correctamente. Redirigiendo...
        </Alert>
      )}

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xxl={8}>
              <ProductInformation 
                nombre_libro={formData.nombre_libro}
                isbn_libro={formData.isbn_libro}
                descripcion={formData.descripcion}
                onNombreChange={(value) => setFormData({ ...formData, nombre_libro: value })}
                onIsbnChange={(value) => setFormData({ ...formData, isbn_libro: value })}
                onDescripcionChange={(value) => setFormData({ ...formData, descripcion: value })}
              />

              <ProductImage 
                onImageChange={(file) => setFormData({ ...formData, portada_libro: file })}
              />
            </Col>

            <Col xxl={4}>
              <Pricing />

              <Organize />
            </Col>
          </Row>

          <div className="mt-2 mb-4 d-flex gap-2 justify-content-center">
            <Button 
              variant="link" 
              className="text-danger fw-semibold"
              onClick={() => router.push('/products')}
              disabled={isSubmitting}
            >
              <LuClipboardX className="fs-sm me-2" /> Discard
            </Button>
            <Button 
              variant="soft-secondary" 
              className="btn-soft-purple"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              <LuSave className="fs-sm me-2" /> Save as Draft
            </Button>
            <Button 
              variant="success"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <LuPlus className="fs-sm me-2" /> Publish
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default Page
