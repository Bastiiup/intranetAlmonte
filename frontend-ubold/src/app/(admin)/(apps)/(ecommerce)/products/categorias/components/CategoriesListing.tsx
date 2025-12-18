'use client'

import { useState } from 'react'
import { Button, Card, CardHeader, CardFooter, Badge } from 'react-bootstrap'
import { LuPlus, LuSearch, LuEdit, LuTrash2, LuEye } from 'react-icons/lu'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Categoria {
  id: number
  nombre?: string
  name?: string
  slug?: string
  descripcion?: string
  description?: string
  activo?: boolean
  isActive?: boolean
  imagen?: any
  image?: any
  productos?: any[]
  products?: any[]
  createdAt?: string
  updatedAt?: string
}

interface CategoriesListingProps {
  categorias: Categoria[]
  error: string | null
}

const CategoriesListing = ({ categorias, error }: CategoriesListingProps) => {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Función helper para obtener el nombre
  const getNombre = (cat: Categoria) => cat.nombre || cat.name || 'Sin nombre'
  
  // Función helper para obtener la descripción
  const getDescripcion = (cat: Categoria) => cat.descripcion || cat.description || ''
  
  // Función helper para obtener el estado
  const getEstado = (cat: Categoria) => {
    if (cat.activo !== undefined) return cat.activo
    if (cat.isActive !== undefined) return cat.isActive
    return true // Por defecto activo
  }
  
  // Función helper para obtener la imagen
  const getImagen = (cat: Categoria) => {
    // Intentar diferentes estructuras de datos de Strapi
    if (cat.imagen?.data?.attributes?.url) {
      return cat.imagen.data.attributes.url
    }
    if (cat.image?.data?.attributes?.url) {
      return cat.image.data.attributes.url
    }
    if (cat.imagen?.attributes?.url) {
      return cat.imagen.attributes.url
    }
    if (cat.image?.attributes?.url) {
      return cat.image.attributes.url
    }
    if (cat.imagen?.url) {
      return cat.imagen.url
    }
    if (cat.image?.url) {
      return cat.image.url
    }
    return null
  }
  
  // Función helper para construir la URL completa de la imagen
  const getImagenUrl = (cat: Categoria) => {
    const imagenPath = getImagen(cat)
    if (!imagenPath) return null
    
    // Si ya es una URL completa, retornarla
    if (imagenPath.startsWith('http')) {
      return imagenPath
    }
    
    // Construir URL completa con la base de Strapi
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi.moraleja.cl'
    return `${strapiUrl}${imagenPath.startsWith('/') ? '' : '/'}${imagenPath}`
  }
  
  // Función helper para contar productos
  const getProductosCount = (cat: Categoria) => {
    if (cat.productos) return Array.isArray(cat.productos) ? cat.productos.length : 0
    if (cat.products) return Array.isArray(cat.products) ? cat.products.length : 0
    return 0
  }

  // Filtrar categorías
  const filteredCategorias = categorias.filter((cat) => {
    const nombre = getNombre(cat).toLowerCase()
    const matchesSearch = nombre.includes(searchTerm.toLowerCase()) || 
                         getDescripcion(cat).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && getEstado(cat)) ||
                         (filterStatus === 'inactive' && !getEstado(cat))
    
    return matchesSearch && matchesStatus
  })

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return
    }

    try {
      const response = await fetch(`/api/tienda/categorias/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Error al eliminar la categoría')
      }
    } catch (error) {
      console.error('Error al eliminar categoría:', error)
      alert('Error al eliminar la categoría')
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="alert alert-danger mb-0">
            <strong>Error:</strong> {error}
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-light justify-content-between">
        <div className="d-flex gap-2">
          <div className="app-search">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{ width: 'auto' }}
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="primary"
            onClick={() => router.push('/products/categorias/agregar')}
          >
            <LuPlus className="fs-sm me-2" /> Agregar Categoría
          </Button>
        </div>
      </CardHeader>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '50px' }}>Imagen</th>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Descripción</th>
              <th>Productos</th>
              <th>Estado</th>
              <th style={{ width: '120px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategorias.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  <p className="text-muted mb-0">
                    {categorias.length === 0
                      ? 'No hay categorías disponibles'
                      : 'No se encontraron categorías con los filtros aplicados'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredCategorias.map((categoria) => {
                const imagenUrl = getImagenUrl(categoria)
                const nombre = getNombre(categoria)
                const descripcion = getDescripcion(categoria)
                const estado = getEstado(categoria)
                const productosCount = getProductosCount(categoria)

                return (
                  <tr key={categoria.id}>
                    <td>
                      {imagenUrl ? (
                        <div className="avatar-md">
                          <Image
                            src={imagenUrl}
                            alt={nombre}
                            width={40}
                            height={40}
                            className="img-fluid rounded"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="avatar-md bg-light d-flex align-items-center justify-content-center">
                          <span className="text-muted small">Sin imagen</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <h6 className="mb-0">{nombre}</h6>
                    </td>
                    <td>
                      <code className="text-muted">{categoria.slug || 'N/A'}</code>
                    </td>
                    <td>
                      <p className="text-muted mb-0 small">
                        {descripcion || 'Sin descripción'}
                      </p>
                    </td>
                    <td>
                      <Badge bg="info">{productosCount}</Badge>
                    </td>
                    <td>
                      <Badge bg={estado ? 'success' : 'secondary'}>
                        {estado ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="btn-icon rounded-circle"
                          title="Ver detalles"
                        >
                          <LuEye className="fs-lg" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="btn-icon rounded-circle"
                          title="Editar"
                          onClick={() => router.push(`/products/categorias/${categoria.id}/editar`)}
                        >
                          <LuEdit className="fs-lg" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="btn-icon rounded-circle text-danger"
                          title="Eliminar"
                          onClick={() => handleDelete(categoria.id)}
                        >
                          <LuTrash2 className="fs-lg" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredCategorias.length > 0 && (
        <CardFooter className="border-0">
          <div className="d-flex justify-content-between align-items-center">
            <p className="text-muted mb-0">
              Mostrando {filteredCategorias.length} de {categorias.length} categorías
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default CategoriesListing

