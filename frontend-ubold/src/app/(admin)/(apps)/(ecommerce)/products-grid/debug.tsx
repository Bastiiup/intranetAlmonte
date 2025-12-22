'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, Alert } from 'react-bootstrap'
import Image from 'next/image'
import { STRAPI_API_URL } from '@/lib/strapi/config'

export default function ProductsGridDebug() {
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProductos() {
      try {
        const response = await fetch('/api/tienda/productos')
        const data = await response.json()
        
        if (data.success && data.data) {
          const productosArray = Array.isArray(data.data) ? data.data : [data.data]
          setProductos(productosArray)
          console.log('[DEBUG] Productos recibidos:', productosArray)
          console.log('[DEBUG] Primer producto completo:', JSON.stringify(productosArray[0], null, 2))
        } else {
          setError(data.error || 'Error al obtener productos')
        }
      } catch (err: any) {
        setError(err.message || 'Error al conectar')
        console.error('[DEBUG] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProductos()
  }, [])

  if (loading) return <Alert>Cargando...</Alert>
  if (error) return <Alert variant="danger">Error: {error}</Alert>
  if (productos.length === 0) return <Alert variant="info">No hay productos</Alert>

  const primerProducto = productos[0]
  const attrs = primerProducto.attributes || {}
  const data = (attrs && Object.keys(attrs).length > 0) ? attrs : (primerProducto as any)

  // Intentar todas las variaciones de portada_libro
  const portadaVariations = {
    'portada_libro (minúsculas)': data.portada_libro,
    'PORTADA_LIBRO (mayúsculas)': data.PORTADA_LIBRO,
    'portadaLibro (camelCase)': data.portadaLibro,
  }

  // Intentar obtener la URL de imagen
  const getImageUrl = () => {
    const portada = data.PORTADA_LIBRO?.data || data.portada_libro?.data || data.portadaLibro?.data
    if (!portada) return null

    const url = portada.attributes?.url || portada.attributes?.URL
    if (!url) return null

    if (url.startsWith('http')) {
      return url
    }

    const baseUrl = STRAPI_API_URL.replace(/\/$/, '')
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
  }

  const imageUrl = getImageUrl()
  const nombre = data.NOMBRE_LIBRO || data.nombre_libro || data.nombreLibro || 'Sin nombre'

  return (
    <div className="p-4">
      <h2>Debug Products Grid - Estructura de Datos</h2>
      
      <Card className="mb-4">
        <CardBody>
          <h4>Primer Producto - Estructura Completa</h4>
          <pre style={{ fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
            {JSON.stringify(primerProducto, null, 2)}
          </pre>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <h4>Análisis de Campos</h4>
          <ul>
            <li><strong>ID:</strong> {primerProducto.id}</li>
            <li><strong>Tiene attributes:</strong> {attrs ? 'Sí' : 'No'}</li>
            <li><strong>Keys en producto:</strong> {Object.keys(primerProducto).join(', ')}</li>
            <li><strong>Keys en attributes:</strong> {attrs ? Object.keys(attrs).join(', ') : 'N/A'}</li>
            <li><strong>Keys en data:</strong> {Object.keys(data).join(', ')}</li>
            <li><strong>Nombre encontrado:</strong> {nombre}</li>
          </ul>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <h4>Variaciones de portada_libro</h4>
          <pre style={{ fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(portadaVariations, null, 2)}
          </pre>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <h4>URL de Imagen</h4>
          <p><strong>URL construida:</strong> {imageUrl || 'NO ENCONTRADA'}</p>
          <p><strong>STRAPI_API_URL:</strong> {STRAPI_API_URL}</p>
          {imageUrl && (
            <div className="mt-3">
              <h5>Intento de mostrar imagen:</h5>
              <div style={{ position: 'relative', width: '200px', height: '200px', border: '1px solid #ccc' }}>
                <Image
                  src={imageUrl}
                  alt={nombre}
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                  onError={(e) => {
                    console.error('[DEBUG] Error al cargar imagen:', imageUrl, e)
                    alert(`Error al cargar imagen: ${imageUrl}`)
                  }}
                  onLoad={() => {
                    console.log('[DEBUG] Imagen cargada exitosamente:', imageUrl)
                  }}
                />
              </div>
              <p className="mt-2">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                  Abrir imagen en nueva pestaña
                </a>
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h4>Todos los Productos - Análisis de Imágenes</h4>
          <p className="text-muted mb-3">
            Mostrando {productos.length} productos. Buscando productos que tengan imagen asignada...
          </p>
          {productos.map((p, idx) => {
            const pAttrs = p.attributes || {}
            const pData = (pAttrs && Object.keys(pAttrs).length > 0) ? pAttrs : (p as any)
            // Los datos pueden venir directamente (sin attributes) o en attributes
            const portadaDirecta = pData.portada_libro || pData.PORTADA_LIBRO
            const pPortada = portadaDirecta?.data || portadaDirecta
            const pNombre = pData.NOMBRE_LIBRO || pData.nombre_libro || pData.nombre || 'Sin nombre'
            const tieneImagen = pPortada !== null && pPortada !== undefined
            
            return (
              <div key={p.id || idx} className={`mb-3 p-3 border rounded ${tieneImagen ? 'bg-success-subtle' : 'bg-warning-subtle'}`}>
                <h5>Producto {idx + 1} (ID: {p.id || p.documentId || 'N/A'})</h5>
                <p><strong>Nombre:</strong> {pNombre}</p>
                <p><strong>Tiene portada:</strong> {tieneImagen ? '✅ Sí' : '❌ No'}</p>
                {tieneImagen ? (
                  <>
                    <p><strong>Estructura portada:</strong></p>
                    <pre style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
                      {JSON.stringify(pPortada, null, 2)}
                    </pre>
                    {pPortada?.attributes?.url && (
                      <p><strong>URL:</strong> {pPortada.attributes.url}</p>
                    )}
                  </>
                ) : (
                  <p className="text-warning">
                    ⚠️ Este producto no tiene imagen asignada en Strapi. 
                    Necesitas asignar una imagen desde el admin de Strapi.
                  </p>
                )}
              </div>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}

